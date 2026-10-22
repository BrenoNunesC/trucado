// Servidor online do Trucado. Salas com código de 4 letras, de quatro tipos:
//  - 1 contra 1 (src/engine/duel.ts): começa quando o segundo entra;
//  - duplas 2 contra 2 (src/engine/duplas.ts): o anfitrião começa e a IA completa os vazios;
//  - dupla contra a máquina: dois humanos na mesma dupla contra duas IAs, até 12;
//  - campanha em dupla (campaign.ts): Blinds, Coringas e loja, cada um com a própria run.
// É o servidor quem roda a partida e valida cada jogada; cada jogador recebe só a própria visão
// da mesa, então ninguém vê as cartas dos outros inspecionando o tráfego.
//
// Se a conexão de alguém cai, o lugar fica guardado por `reconnectMs` e o jogo volta sozinho com o
// token da sala. Passado esse tempo, no 1 contra 1 o outro vence por abandono; nas duplas a IA
// assume o lugar e a partida segue para os outros.

import { randomBytes, randomInt } from 'node:crypto';
import { createServer as createHttpServer, type Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { decideDuplas } from '../src/ai/duplas';
import type { PersonalityId } from '../src/ai/opponent';
import { OPPONENT_BY_ID, OPPONENTS } from '../src/data/opponents';
import { applyDuel, forfeitDuel, newDuel, nextDuelHand, viewFor, type DuelAction, type DuelMatch, type DuelRules } from '../src/engine/duel';
import { applyDuplas, dActor, duplasViewFor, newDuplas, nextDuplasHand, SEATS, type DuplasAction, type DuplasMatch, type SeatNo } from '../src/engine/duplas';
import { fork } from '../src/engine/rng';
import { other, type Side } from '../src/engine/truco';
import { EMOTES, PROTOCOL_VERSION, type ClientMsg, type PlayerInfo, type RoomMode, type Seat, type ServerMsg } from '../src/net/protocol';
import {
  advanceIfReady,
  campAct,
  campBluff,
  campBotSeat,
  campBotStep,
  campCards,
  campScore,
  campSelect,
  campShopDone,
  campTryDeal,
  campView,
  newCamp,
  settle,
  type CampState,
  type HumanSeat,
} from './campaign';

export interface ServerOptions {
  port: number;
  /** Pausa entre uma mão e a próxima (para dar tempo de ver o resultado). */
  handDelayMs?: number;
  /** Tempo que a IA leva para jogar. */
  botDelayMs?: number;
  /** Quanto tempo um lugar fica guardado depois que a conexão cai. */
  reconnectMs?: number;
  log?: (msg: string) => void;
  /** Mensagens por segundo aceitas de cada conexão (o resto é descartado). */
  maxMsgsPerSec?: number;
}

interface SeatState {
  info: PlayerInfo;
  token: string;
  ws: WebSocket | null;
  leftTimer: ReturnType<typeof setTimeout> | null;
  wantsRematch: boolean;
  /** Saiu da sala de vez (não volta mais). */
  gone?: boolean;
  /** Lugar da IA (duplas). */
  bot?: { personality: PersonalityId };
}

interface DuelRoom {
  mode: 'duel';
  code: string;
  rules: DuelRules;
  seats: Partial<Record<Side, SeatState>>;
  match: DuelMatch | null;
  nextTimer: ReturnType<typeof setTimeout> | null;
}

interface DuplasRoom {
  mode: 'duplas' | 'coop';
  code: string;
  rules: DuelRules;
  seats: (SeatState | null)[];
  hostToken: string;
  match: DuplasMatch | null;
  nextTimer: ReturnType<typeof setTimeout> | null;
  botTimer: ReturnType<typeof setTimeout> | null;
}

/** Campanha em dupla: humanos nos lugares 0 e 2; a dupla adversária (1 e 3) é sempre a IA. */
interface CampRoom {
  mode: 'campaign';
  code: string;
  rules: DuelRules;
  seats: (SeatState | null)[];
  hostToken: string;
  camp: CampState | null;
  nextTimer: ReturnType<typeof setTimeout> | null;
  botTimer: ReturnType<typeof setTimeout> | null;
}

type Room = DuelRoom | DuplasRoom | CampRoom;
type Where = { room: DuelRoom; side: Side } | { room: DuplasRoom; side: SeatNo } | { room: CampRoom; side: SeatNo };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_ROOMS = 1000;
const PERSONALITY_IDS: PersonalityId[] = ['agressivo', 'medroso', 'blefador', 'calculista', 'equilibrado'];
/** No modo dupla contra a máquina, os lugares 1 e 3 são sempre da IA. */
const COOP_LOCKED = [false, true, false, true];

export function startServer(opts: ServerOptions): Promise<{ http: Server; close: () => Promise<void>; rooms: Map<string, Room> }> {
  const handDelay = opts.handDelayMs ?? 3500;
  const botDelay = opts.botDelayMs ?? 900;
  const reconnectMs = opts.reconnectMs ?? 90_000;
  const maxPerSec = opts.maxMsgsPerSec ?? 20;
  const log = opts.log ?? (() => {});
  const rooms = new Map<string, Room>();
  const where = new WeakMap<WebSocket, Where>();

  // a página de saúde (as hospedagens checam se o serviço responde)
  const http = createHttpServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Trucado online: ${rooms.size} sala(s)\n`);
  });
  const wss = new WebSocketServer({ server: http, maxPayload: 4096 });

  const send = (ws: WebSocket | null, msg: ServerMsg) => {
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };
  const seatPublic = (s: SeatState): Seat => ({ info: s.info, online: !!s.ws || !!s.bot, gone: !!s.gone, bot: !!s.bot });
  const newToken = () => randomBytes(16).toString('hex');

  function newCode(): string {
    for (;;) {
      const c = Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
      if (!rooms.has(c)) return c;
    }
  }

  function cleanInfo(p: PlayerInfo | undefined): PlayerInfo {
    // tira caracteres de controle e sinais de tag; o nome só aparece como texto, mas sem lixo
    const name = [...String(p?.name ?? '')]
      .filter((ch) => ch.charCodeAt(0) >= 32 && ch !== '<' && ch !== '>')
      .join('')
      .trim()
      .slice(0, 18);
    const avatar = p && OPPONENT_BY_ID[p.avatar] ? p.avatar : OPPONENTS[randomInt(OPPONENTS.length)].id;
    return { name: name || 'Jogador', avatar };
  }

  function closeRoom(room: Room) {
    if (room.nextTimer) clearTimeout(room.nextTimer);
    if (room.mode !== 'duel' && room.botTimer) clearTimeout(room.botTimer);
    for (const s of Object.values(room.seats)) if (s?.leftTimer) clearTimeout(s.leftTimer);
    rooms.delete(room.code);
    log(`sala ${room.code}: fechada`);
  }

  // ---------------------------------------------------------------- 1 contra 1

  function broadcastDuel(room: DuelRoom) {
    for (const side of ['player', 'ai'] as Side[]) {
      const me = room.seats[side];
      if (!me?.ws) continue;
      const opp = room.seats[other(side)];
      if (!room.match || !opp) {
        send(me.ws, { t: 'lobby', code: room.code, you: seatPublic(me), opp: opp ? seatPublic(opp) : null, rules: room.rules });
        continue;
      }
      send(me.ws, {
        t: 'state',
        code: room.code,
        view: viewFor(room.match, side),
        you: seatPublic(me),
        opp: seatPublic(opp),
        rematch: { you: me.wantsRematch, opp: opp.wantsRematch },
      });
    }
  }

  function seatDuel(room: DuelRoom, side: Side, ws: WebSocket, info: PlayerInfo) {
    const s: SeatState = { info, token: newToken(), ws, leftTimer: null, wantsRematch: false };
    room.seats[side] = s;
    where.set(ws, { room, side });
    send(ws, { t: 'room', code: room.code, token: s.token, seat: side, mode: 'duel' });
  }

  function startDuel(room: DuelRoom) {
    room.match = newDuel(randomBytes(6).toString('hex'), room.rules);
    for (const s of Object.values(room.seats)) if (s) s.wantsRematch = false;
    log(`sala ${room.code}: partida 1x1 começou`);
  }

  function afterDuel(room: DuelRoom) {
    if (room.match?.stage === 'handOver' && !room.nextTimer) {
      room.nextTimer = setTimeout(() => {
        room.nextTimer = null;
        if (room.match?.stage === 'handOver') {
          nextDuelHand(room.match);
          broadcastDuel(room);
        }
      }, handDelay);
    }
    broadcastDuel(room);
  }

  /** Saiu de vez: na espera o lugar some; com partida, quem saiu perde por abandono. */
  function leaveDuel(room: DuelRoom, side: Side) {
    const s = room.seats[side];
    if (!s) return;
    if (s.leftTimer) clearTimeout(s.leftTimer);
    if (room.match) {
      if (room.match.stage !== 'over') forfeitDuel(room.match, side);
      s.ws = null;
      s.gone = true;
      s.wantsRematch = false;
    } else delete room.seats[side];
    if (!(['player', 'ai'] as Side[]).some((sd) => room.seats[sd]?.ws)) closeRoom(room);
    else broadcastDuel(room);
  }

  // ---------------------------------------------------------------- duplas

  /** Lugares girados para quem vê de `seat` (0 = ele, 2 = parceiro). */
  const rotate = <T>(arr: T[], seat: SeatNo): T[] => [0, 1, 2, 3].map((r) => arr[(r + seat) % 4]);
  const names = (room: DuplasRoom) => room.seats.map((s, i) => s?.info.name ?? `IA ${i + 1}`);

  function broadcastDuplas(room: DuplasRoom) {
    const locked = room.mode === 'coop' ? COOP_LOCKED : [false, false, false, false];
    for (const seat of SEATS) {
      const me = room.seats[seat];
      if (!me?.ws) continue;
      if (!room.match) {
        send(me.ws, {
          t: 'dlobby',
          code: room.code,
          mode: room.mode,
          seats: rotate(room.seats.map((s) => (s ? seatPublic(s) : null)), seat),
          host: me.token === room.hostToken,
          locked: rotate(locked, seat),
          rules: room.rules,
        });
        continue;
      }
      const humans = room.seats.filter((s) => s && !s.bot && s.ws);
      send(me.ws, {
        t: 'dstate',
        code: room.code,
        mode: room.mode,
        view: duplasViewFor(room.match, seat, names(room)),
        seats: rotate(room.seats.map((s) => seatPublic(s!)), seat),
        rematch: { you: me.wantsRematch, waiting: humans.filter((s) => !s!.wantsRematch).length },
      });
    }
  }

  function makeBot(room: DuplasRoom, seat: SeatNo): SeatState {
    const used = new Set(room.seats.map((s) => s?.info.avatar));
    const pool = OPPONENTS.filter((o) => !used.has(o.id));
    const o = pool[randomInt(pool.length)] ?? OPPONENTS[seat];
    return {
      info: { name: o.name, avatar: o.id },
      token: '',
      ws: null,
      leftTimer: null,
      wantsRematch: true,
      bot: { personality: o.personality ?? PERSONALITY_IDS[randomInt(PERSONALITY_IDS.length)] },
    };
  }

  function seatDuplas(room: DuplasRoom, seat: SeatNo, ws: WebSocket, info: PlayerInfo, token = newToken()) {
    const s: SeatState = { info, token, ws, leftTimer: null, wantsRematch: false };
    room.seats[seat] = s;
    where.set(ws, { room, side: seat });
    send(ws, { t: 'room', code: room.code, token: s.token, seat, mode: room.mode });
  }

  /** Primeiro lugar livre para quem entra (no modo contra a máquina, só os da dupla humana). */
  function freeSeat(room: DuplasRoom): SeatNo | null {
    const order: SeatNo[] = room.mode === 'coop' ? [2, 0] : [2, 1, 3, 0];
    return order.find((s) => !room.seats[s]) ?? null;
  }

  function startDuplas(room: DuplasRoom) {
    for (const seat of SEATS) if (!room.seats[seat]) room.seats[seat] = makeBot(room, seat);
    room.match = newDuplas(randomBytes(6).toString('hex'), room.rules);
    for (const s of room.seats) if (s && !s.bot) s.wantsRematch = false;
    log(`sala ${room.code}: partida de duplas (${room.mode}) começou`);
  }

  /** Depois de cada mudança: agenda a jogada da IA e a próxima mão. */
  function afterDuplas(room: DuplasRoom) {
    const m = room.match;
    if (m) {
      if (m.stage === 'handOver' && !room.nextTimer) {
        room.nextTimer = setTimeout(() => {
          room.nextTimer = null;
          if (room.match?.stage === 'handOver') {
            nextDuplasHand(room.match);
            afterDuplas(room);
          }
        }, handDelay);
      }
      const who = m.stage === 'onze' ? m.onzeDecider : m.stage === 'playing' ? dActor(m.hand) : null;
      if (who !== null && room.seats[who]?.bot && !room.botTimer) {
        room.botTimer = setTimeout(() => {
          room.botTimer = null;
          const mm = room.match;
          const seatNow = mm && (mm.stage === 'onze' ? mm.onzeDecider : mm.stage === 'playing' ? dActor(mm.hand) : null);
          const bot = seatNow !== null && seatNow !== undefined ? room.seats[seatNow]?.bot : undefined;
          if (!mm || seatNow === null || seatNow === undefined || !bot) return;
          const a = decideDuplas(mm, seatNow, fork(mm.rng), bot.personality);
          if (a) applyDuplas(mm, seatNow, a);
          afterDuplas(room);
        }, botDelay);
      }
    }
    broadcastDuplas(room);
  }

  /** Saiu de vez: na espera o lugar fica livre; com partida, a IA assume o lugar. */
  function leaveDuplas(room: DuplasRoom, seat: SeatNo) {
    const s = room.seats[seat];
    if (!s || s.bot) return;
    if (s.leftTimer) clearTimeout(s.leftTimer);
    if (room.match) {
      const bot = makeBot(room, seat);
      // a IA assume com o nome de quem saiu, para a mesa não ficar confusa
      room.seats[seat] = { ...bot, info: { name: `${s.info.name} (IA)`, avatar: s.info.avatar } };
    } else room.seats[seat] = null;
    // se o anfitrião saiu da sala de espera, outro humano vira anfitrião
    if (s.token === room.hostToken) {
      const next = room.seats.find((x) => x && !x.bot && x.ws);
      if (next) room.hostToken = next.token;
    }
    if (!room.seats.some((x) => x && !x.bot && x.ws)) closeRoom(room);
    else afterDuplas(room);
  }

  // ---------------------------------------------------------------- campanha em dupla

  /** Os humanos ainda na sala (conectados ou dentro do tempo de voltar). */
  function campHumans(room: CampRoom): HumanSeat[] {
    return ([0, 2] as SeatNo[])
      .filter((s) => room.seats[s] && !room.seats[s]!.gone)
      .map((s) => ({ seat: s, name: room.seats[s]!.info.name, avatar: room.seats[s]!.info.avatar, online: !!room.seats[s]!.ws }));
  }

  function broadcastCamp(room: CampRoom) {
    const humans = campHumans(room);
    for (const seat of [0, 2] as SeatNo[]) {
      const me = room.seats[seat];
      if (!me?.ws) continue;
      if (!room.camp) {
        send(me.ws, {
          t: 'dlobby',
          code: room.code,
          mode: 'campaign',
          seats: rotate(room.seats.map((s) => (s ? seatPublic(s) : null)), seat),
          host: me.token === room.hostToken,
          locked: rotate(COOP_LOCKED, seat),
          rules: room.rules,
        });
        continue;
      }
      send(me.ws, { t: 'cstate', code: room.code, view: campView(room.camp, seat, humans, me.token === room.hostToken) });
    }
  }

  /** Depois de cada mudança: agenda a jogada da IA e manda o estado novo. */
  function afterCamp(room: CampRoom) {
    const c = room.camp;
    if (c && campBotSeat(c, campHumans(room)) !== null && !room.botTimer) {
      room.botTimer = setTimeout(() => {
        room.botTimer = null;
        if (room.camp && campBotStep(room.camp, campHumans(room))) afterCamp(room);
      }, botDelay);
    }
    broadcastCamp(room);
  }

  /** Saiu de vez: na espera o lugar fica livre; com a campanha andando, a IA vira o parceiro. */
  function leaveCamp(room: CampRoom, seat: SeatNo) {
    const s = room.seats[seat];
    if (!s) return;
    if (s.leftTimer) clearTimeout(s.leftTimer);
    room.seats[seat] = null;
    if (s.token === room.hostToken) {
      const next = room.seats.find((x) => x && x.ws);
      if (next) room.hostToken = next.token;
    }
    if (!room.seats.some((x) => x?.ws)) return closeRoom(room);
    if (room.camp) {
      // quem ficou não espera mais pelo que saiu
      const humans = campHumans(room);
      delete room.camp.players[seat];
      settle(room.camp, humans);
      advanceIfReady(room.camp, humans);
      campTryDeal(room.camp, humans);
    }
    afterCamp(room);
  }

  // ---------------------------------------------------------------- mensagens

  function versionOk(ws: WebSocket, v: number): boolean {
    if (v === PROTOCOL_VERSION) return true;
    send(ws, { t: 'error', msg: 'Versão do jogo diferente da do servidor. Atualize o Trucado.', fatal: true });
    return false;
  }

  /** Mensagens dentro de uma sala de campanha. */
  function onCampMessage(ws: WebSocket, room: CampRoom, seat: SeatNo, msg: ClientMsg) {
    const c = room.camp;
    const humans = campHumans(room);
    const host = room.seats[seat]?.token === room.hostToken;
    const bad = () => send(ws, { t: 'error', msg: 'Jogada inválida agora.' });
    switch (msg.t) {
      case 'start': {
        if (!host || c) return;
        room.camp = newCamp(randomBytes(6).toString('hex').toUpperCase(), Number(msg.stake) || 1, room.rules, humans);
        log(`sala ${room.code}: campanha começou`);
        return afterCamp(room);
      }
      case 'cselect':
        if (!c || !host || !campSelect(c, humans, !!msg.skip)) return bad();
        return afterCamp(room);
      case 'ccards':
        if (!c || !campCards(c, humans, seat, msg.handNo, msg.cards, msg.target, msg.rules, msg.peek)) return bad();
        return afterCamp(room);
      case 'cbluff':
        if (!c || !campBluff(c, seat, msg.cards)) return bad();
        return afterCamp(room);
      case 'cscore':
        if (!c || !campScore(c, humans, seat, msg.handNo, msg.score)) return bad();
        return afterCamp(room);
      case 'cshopdone':
        if (!c || !campShopDone(c, humans, seat)) return;
        return afterCamp(room);
      case 'act': {
        const a = msg.a;
        if (!c || !a || typeof a !== 'object' || !['play', 'bet', 'respond', 'onze'].includes(a.t)) return;
        if (!campAct(c, seat, a as DuplasAction)) return bad();
        return afterCamp(room);
      }
      case 'emote': {
        if (!Number.isInteger(msg.id) || msg.id < 0 || msg.id >= EMOTES.length) return;
        for (const to of [0, 2] as SeatNo[]) {
          const s = room.seats[to];
          if (s?.ws) send(s.ws, { t: 'emote', from: to === seat ? 'you' : 'opp', id: msg.id, seat: (seat - to + 4) % 4 });
        }
        return;
      }
      case 'leave':
        where.delete(ws);
        return leaveCamp(room, seat);
    }
  }

  function onMessage(ws: WebSocket, msg: ClientMsg) {
    const found = where.get(ws);
    if (found?.room.mode === 'campaign') {
      if (msg.t === 'create' || msg.t === 'join' || msg.t === 'resume') return;
      return onCampMessage(ws, found.room, found.side as SeatNo, msg);
    }
    // daqui para baixo, só salas de 1 contra 1 e de duplas
    const at = found as Exclude<Where, { room: CampRoom }> | undefined;
    switch (msg.t) {
      case 'create': {
        if (at || !versionOk(ws, msg.v)) return;
        if (rooms.size >= MAX_ROOMS) return send(ws, { t: 'error', msg: 'Servidor lotado. Tente de novo daqui a pouco.', fatal: true });
        const rules: DuelRules = { maoDeOnze: msg.rules?.maoDeOnze !== false, maoDeFerro: msg.rules?.maoDeFerro !== false };
        const mode: RoomMode = msg.mode === 'duplas' || msg.mode === 'coop' || msg.mode === 'campaign' ? msg.mode : 'duel';
        if (mode === 'campaign') {
          const room: CampRoom = { mode, code: newCode(), rules, seats: [null, null, null, null], hostToken: newToken(), camp: null, nextTimer: null, botTimer: null };
          rooms.set(room.code, room);
          const s: SeatState = { info: cleanInfo(msg.player), token: room.hostToken, ws, leftTimer: null, wantsRematch: false };
          room.seats[0] = s;
          where.set(ws, { room, side: 0 });
          send(ws, { t: 'room', code: room.code, token: s.token, seat: 0, mode });
          log(`sala ${room.code}: criada (campanha)`);
          return broadcastCamp(room);
        }
        if (mode === 'duel') {
          const room: DuelRoom = { mode, code: newCode(), rules, seats: {}, match: null, nextTimer: null };
          rooms.set(room.code, room);
          seatDuel(room, 'player', ws, cleanInfo(msg.player));
          log(`sala ${room.code}: criada (1x1)`);
          return broadcastDuel(room);
        }
        const room: DuplasRoom = { mode, code: newCode(), rules, seats: [null, null, null, null], hostToken: '', match: null, nextTimer: null, botTimer: null };
        rooms.set(room.code, room);
        const token = newToken();
        room.hostToken = token;
        seatDuplas(room, 0, ws, cleanInfo(msg.player), token);
        log(`sala ${room.code}: criada (${mode})`);
        return broadcastDuplas(room);
      }
      case 'join': {
        if (at || !versionOk(ws, msg.v)) return;
        const room = rooms.get(String(msg.code ?? '').toUpperCase().trim());
        if (!room) return send(ws, { t: 'error', msg: 'Sala não encontrada. Confira o código.', fatal: true });
        if (room.mode === 'campaign') {
          if (room.camp) return send(ws, { t: 'error', msg: 'A campanha dessa sala já começou.', fatal: true });
          const seat = ([2, 0] as SeatNo[]).find((s) => !room.seats[s]);
          if (seat === undefined) return send(ws, { t: 'error', msg: 'Essa sala já está cheia.', fatal: true });
          const s: SeatState = { info: cleanInfo(msg.player), token: newToken(), ws, leftTimer: null, wantsRematch: false };
          room.seats[seat] = s;
          where.set(ws, { room, side: seat });
          send(ws, { t: 'room', code: room.code, token: s.token, seat, mode: 'campaign' });
          return broadcastCamp(room);
        }
        if (room.mode === 'duel') {
          if (room.seats.ai) return send(ws, { t: 'error', msg: 'Essa sala já está cheia.', fatal: true });
          seatDuel(room, 'ai', ws, cleanInfo(msg.player));
          startDuel(room);
          return broadcastDuel(room);
        }
        if (room.match) return send(ws, { t: 'error', msg: 'A partida dessa sala já começou.', fatal: true });
        const seat = freeSeat(room);
        if (seat === null) return send(ws, { t: 'error', msg: 'Essa sala já está cheia.', fatal: true });
        seatDuplas(room, seat, ws, cleanInfo(msg.player));
        return broadcastDuplas(room);
      }
      case 'resume': {
        if (at) return;
        const room = rooms.get(String(msg.code ?? '').toUpperCase());
        if (!room || !msg.token) return send(ws, { t: 'error', msg: 'A sala não existe mais.', fatal: true });
        if (room.mode === 'duel') {
          const side = (['player', 'ai'] as Side[]).find((sd) => room.seats[sd]?.token === msg.token && !room.seats[sd]?.gone);
          if (!side) return send(ws, { t: 'error', msg: 'A sala não existe mais.', fatal: true });
          const s = room.seats[side]!;
          if (s.ws && s.ws !== ws) s.ws.close(4000, 'Entrou de outro lugar');
          if (s.leftTimer) clearTimeout(s.leftTimer);
          s.leftTimer = null;
          s.ws = ws;
          where.set(ws, { room, side });
          send(ws, { t: 'room', code: room.code, token: s.token, seat: side, mode: 'duel' });
          return broadcastDuel(room);
        }
        const seat = SEATS.find((sd) => room.seats[sd]?.token === msg.token && !room.seats[sd]?.bot);
        if (seat === undefined) return send(ws, { t: 'error', msg: 'Você ficou fora tempo demais e a IA assumiu o seu lugar.', fatal: true });
        const s = room.seats[seat]!;
        if (s.ws && s.ws !== ws) s.ws.close(4000, 'Entrou de outro lugar');
        if (s.leftTimer) clearTimeout(s.leftTimer);
        s.leftTimer = null;
        s.ws = ws;
        where.set(ws, { room, side: seat } as Where);
        send(ws, { t: 'room', code: room.code, token: s.token, seat, mode: room.mode });
        return room.mode === 'campaign' ? afterCamp(room) : afterDuplas(room);
      }
      case 'act': {
        if (!at?.room.match) return;
        const a = msg.a;
        if (!a || typeof a !== 'object' || !['play', 'bet', 'respond', 'onze'].includes(a.t)) return;
        if (at.room.mode === 'duel') {
          if (!applyDuel(at.room.match, at.side as Side, a as DuelAction)) return send(ws, { t: 'error', msg: 'Jogada inválida agora.' });
          return afterDuel(at.room);
        }
        const room = at.room as DuplasRoom;
        if (!applyDuplas(room.match!, at.side as SeatNo, a as DuplasAction)) return send(ws, { t: 'error', msg: 'Jogada inválida agora.' });
        return afterDuplas(room);
      }
      case 'seat': {
        if (!at || at.room.mode === 'duel' || at.room.match) return;
        const room = at.room;
        const to = msg.seat;
        if (!Number.isInteger(to) || to < 0 || to > 3) return;
        // o pedido vem girado como a mesa de quem pediu
        const target = ((to + (at.side as SeatNo)) % 4) as SeatNo;
        if (room.seats[target] || (room.mode === 'coop' && COOP_LOCKED[target])) return;
        const s = room.seats[at.side as SeatNo]!;
        room.seats[at.side as SeatNo] = null;
        room.seats[target] = s;
        where.set(ws, { room, side: target });
        send(ws, { t: 'room', code: room.code, token: s.token, seat: target, mode: room.mode });
        return broadcastDuplas(room);
      }
      case 'start': {
        if (!at || at.room.mode === 'duel' || at.room.match) return;
        const room = at.room;
        if (room.seats[at.side as SeatNo]?.token !== room.hostToken) return;
        startDuplas(room);
        return afterDuplas(room);
      }
      case 'emote': {
        if (!at || !Number.isInteger(msg.id) || msg.id < 0 || msg.id >= EMOTES.length) return;
        if (at.room.mode === 'duel') {
          const opp = at.room.seats[other(at.side as Side)];
          send(ws, { t: 'emote', from: 'you', id: msg.id });
          return send(opp?.ws ?? null, { t: 'emote', from: 'opp', id: msg.id });
        }
        const from = at.side as SeatNo;
        for (const seat of SEATS) {
          const s = at.room.seats[seat];
          if (s?.ws) send(s.ws, { t: 'emote', from: seat === from ? 'you' : 'opp', id: msg.id, seat: (from - seat + 4) % 4 });
        }
        return;
      }
      case 'rematch': {
        if (!at || at.room.match?.stage !== 'over') return;
        if (at.room.mode === 'duel') {
          const room = at.room;
          if (!room.seats.player?.ws || !room.seats.ai?.ws) return;
          room.seats[at.side as Side]!.wantsRematch = true;
          if (room.seats.player.wantsRematch && room.seats.ai.wantsRematch) startDuel(room);
          return broadcastDuel(room);
        }
        const room = at.room;
        room.seats[at.side as SeatNo]!.wantsRematch = true;
        // começa quando todos os humanos conectados aceitarem; a IA sempre aceita
        if (room.seats.every((s) => !s || s.bot || !s.ws || s.wantsRematch)) startDuplas(room);
        return afterDuplas(room);
      }
      case 'leave': {
        if (!at) return;
        where.delete(ws);
        if (at.room.mode === 'duel') return leaveDuel(at.room, at.side as Side);
        return leaveDuplas(at.room, at.side as SeatNo);
      }
    }
  }

  wss.on('connection', (ws) => {
    let alive = true;
    let burst = 0;
    const burstTimer = setInterval(() => (burst = 0), 1000);
    ws.on('pong', () => (alive = true));
    const ping = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping();
    }, 25_000);

    ws.on('message', (data) => {
      // limite simples contra spam: no máximo 20 mensagens por segundo
      if (++burst > maxPerSec) return;
      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg && typeof msg === 'object') onMessage(ws, msg);
    });

    ws.on('close', () => {
      clearInterval(ping);
      clearInterval(burstTimer);
      const at = where.get(ws);
      if (!at) return;
      const room = at.room;
      const s = room.mode === 'duel' ? room.seats[at.side as Side] : room.seats[at.side as SeatNo];
      if (!s || s.ws !== ws) return;
      s.ws = null;
      if (room.mode === 'duel') broadcastDuel(room);
      else if (room.mode === 'campaign') afterCamp(room);
      else broadcastDuplas(room);
      // guarda o lugar por um tempo; se não voltar, sai de vez (ou a sala fecha)
      s.leftTimer = setTimeout(() => {
        if (s.ws || !rooms.has(room.code)) return;
        if (room.mode === 'duel') {
          if (room.seats[at.side as Side] !== s) return;
          if (!room.match) closeRoom(room);
          else leaveDuel(room, at.side as Side);
        } else {
          const seat = room.seats.indexOf(s);
          if (seat < 0) return;
          if (room.mode === 'campaign') leaveCamp(room, seat as SeatNo);
          else leaveDuplas(room, seat as SeatNo);
        }
      }, reconnectMs);
    });
  });

  return new Promise((resolve) => {
    http.listen(opts.port, () => {
      log(`Trucado online ouvindo na porta ${opts.port}`);
      resolve({
        http,
        rooms,
        close: () =>
          new Promise<void>((done) => {
            for (const room of [...rooms.values()]) closeRoom(room);
            for (const c of wss.clients) c.terminate();
            wss.close(() => http.close(() => done()));
          }),
      });
    });
  });
}

