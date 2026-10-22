// Modo online: a partida entre dois humanos, a visão de cada um e o servidor de verdade com dois
// clientes jogando pela rede.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startServer } from '../server/server';
import { applyDuel, DUEL_TARGET, newDuel, viewFor, type DuelView } from '../src/engine/duel';
import { dActor } from '../src/engine/duplas';
import { actor, responder } from '../src/engine/truco';
import { PROTOCOL_VERSION, type ClientMsg, type ServerMsg } from '../src/net/protocol';

const RULES = { maoDeOnze: true, maoDeFerro: true };

describe('Partida entre dois humanos', () => {
  it('cada um vê as próprias cartas e só o verso das do adversário', () => {
    const m = newDuel('VISAO', RULES);
    const host = viewFor(m, 'player');
    const guest = viewFor(m, 'ai');
    expect(host.hand.hands.player.map((c) => c.id)).toEqual(m.hand.hands.player.map((c) => c.id));
    // a visão de quem entrou é espelhada: as cartas dele aparecem como 'player'
    expect(guest.hand.hands.player.map((c) => c.id)).toEqual(m.hand.hands.ai.map((c) => c.id));
    for (const v of [host, guest]) {
      expect(v.hand.hands.ai).toHaveLength(3);
      expect(v.hand.hands.ai.every((c) => c.id.startsWith('x-'))).toBe(true);
      expect(v.hand.houseDeck).toEqual([]);
      expect(v.hand.dealt.ai).toEqual([]);
    }
    // nenhuma carta real do adversário aparece em lugar nenhum da visão
    const hidden = JSON.stringify(guest);
    for (const c of m.hand.hands.player) expect(hidden).not.toContain(c.id);
  });

  it('a vez e as falas do log ficam do ponto de vista de cada um', () => {
    const m = newDuel('VEZ', RULES);
    const first = actor(m.hand)!;
    expect(actor(viewFor(m, first).hand)).toBe('player');
    expect(actor(viewFor(m, first === 'player' ? 'ai' : 'player').hand)).toBe('ai');
    applyDuel(m, first, { t: 'bet' });
    const other = first === 'player' ? 'ai' : 'player';
    expect(viewFor(m, first).hand.log.at(-1)!.text).toBe('Você pede TRUCO!');
    expect(viewFor(m, other).hand.log.at(-1)!.text).toBe('Adversário pede TRUCO!');
    expect(responder(viewFor(m, other).hand)).toBe('player');
  });

  it('jogada fora da vez ou com carta que não é sua é recusada sem mudar nada', () => {
    const m = newDuel('INVALIDA', RULES);
    const first = actor(m.hand)!;
    const second = first === 'player' ? 'ai' : 'player';
    const before = JSON.stringify(m.hand);
    expect(applyDuel(m, second, { t: 'play', cardId: m.hand.hands[second][0].id })).toBe(false);
    expect(applyDuel(m, first, { t: 'play', cardId: m.hand.hands[second][0].id })).toBe(false);
    expect(applyDuel(m, first, { t: 'respond', r: 'accept' })).toBe(false);
    expect(JSON.stringify(m.hand)).toBe(before);
    expect(applyDuel(m, first, { t: 'play', cardId: m.hand.hands[first][0].id })).toBe(true);
  });

  it('a carta jogada virada pelo adversário não aparece na visão do outro', () => {
    const m = newDuel('VIRADA', RULES);
    // joga a 1ª rodada aberta e, na 2ª, quem for o primeiro joga virado
    for (let i = 0; i < 2; i++) {
      const s = actor(m.hand)!;
      applyDuel(m, s, { t: 'play', cardId: m.hand.hands[s][0].id });
    }
    if (m.hand.phase === 'done') return;
    const s = actor(m.hand)!;
    const card = m.hand.hands[s][0];
    expect(applyDuel(m, s, { t: 'play', cardId: card.id, hidden: true })).toBe(true);
    const otherView = JSON.stringify(viewFor(m, s === 'player' ? 'ai' : 'player'));
    expect(otherView).not.toContain(card.id);
  });
});

// ---------------------------------------------------------------- servidor + dois clientes

interface Client {
  ws: WebSocket;
  msgs: ServerMsg[];
  view: () => DuelView | null;
  send: (m: ClientMsg) => void;
  waitFor: (pred: (m: ServerMsg) => boolean, ms?: number) => Promise<ServerMsg>;
}

function connect(port: number): Promise<Client> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const msgs: ServerMsg[] = [];
    const waiters: { pred: (m: ServerMsg) => boolean; res: (m: ServerMsg) => void }[] = [];
    ws.on('message', (d) => {
      const m = JSON.parse(String(d)) as ServerMsg;
      msgs.push(m);
      for (const w of [...waiters]) {
        if (!w.pred(m)) continue;
        waiters.splice(waiters.indexOf(w), 1);
        w.res(m);
      }
    });
    const client: Client = {
      ws,
      msgs,
      view: () => {
        for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].t === 'state') return (msgs[i] as Extract<ServerMsg, { t: 'state' }>).view;
        return null;
      },
      send: (m) => ws.send(JSON.stringify(m)),
      waitFor: (pred, ms = 3000) =>
        new Promise((res, rej) => {
          const found = msgs.find(pred);
          if (found) return res(found);
          const t = setTimeout(() => rej(new Error('tempo esgotado esperando mensagem')), ms);
          waiters.push({ pred, res: (m) => (clearTimeout(t), res(m)) });
        }),
    };
    ws.on('open', () => resolve(client));
  });
}

/** Uma jogada simples com o que a visão mostra: aceita tudo, joga a primeira carta. */
function autoMove(c: Client): boolean {
  const v = c.view();
  if (!v || v.stage === 'over') return false;
  if (v.onzeYou) return (c.send({ t: 'act', a: { t: 'onze', play: true } }), true);
  if (v.stage !== 'playing') return false;
  const h = v.hand;
  if (h.phase === 'respond' && responder(h) === 'player') return (c.send({ t: 'act', a: { t: 'respond', r: 'accept' } }), true);
  if (h.phase === 'play' && actor(h) === 'player') return (c.send({ t: 'act', a: { t: 'play', cardId: h.hands.player[0].id } }), true);
  return false;
}

describe('Servidor online', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  const port = 18000 + Math.floor(Math.random() * 1000);
  beforeAll(async () => {
    server = await startServer({ port, handDelayMs: 5, reconnectMs: 200 });
  });
  afterAll(async () => {
    await server.close();
  });

  async function openRoom() {
    const a = await connect(port);
    const b = await connect(port);
    a.send({ t: 'create', v: PROTOCOL_VERSION, player: { name: 'Ana', avatar: 'rosana' }, rules: RULES });
    const room = (await a.waitFor((m) => m.t === 'room')) as Extract<ServerMsg, { t: 'room' }>;
    b.send({ t: 'join', v: PROTOCOL_VERSION, code: room.code.toLowerCase(), player: { name: 'Beto', avatar: 'zeca' } });
    await a.waitFor((m) => m.t === 'state');
    await b.waitFor((m) => m.t === 'state');
    return { a, b, room };
  }

  it('cria a sala, o segundo entra pelo código e os dois jogam uma partida inteira até 12', async () => {
    const { a, b } = await openRoom();
    const sa = a.msgs.find((m) => m.t === 'state') as Extract<ServerMsg, { t: 'state' }>;
    expect(sa.you.info.name).toBe('Ana');
    expect(sa.opp.info).toEqual({ name: 'Beto', avatar: 'zeca' });

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && a.view()?.stage !== 'over') {
      const moved = autoMove(a) || autoMove(b);
      const n = a.msgs.length + b.msgs.length;
      await new Promise((r) => setTimeout(r, moved ? 2 : 8));
      if (moved) await a.waitFor(() => a.msgs.length + b.msgs.length > n, 1000).catch(() => {});
    }
    // a mensagem final chega aos dois quase ao mesmo tempo: espera a do Beto também
    await b.waitFor((m) => m.t === 'state' && m.view.stage === 'over');
    const va = a.view()!;
    const vb = b.view()!;
    expect(va.stage).toBe('over');
    expect(Math.max(va.score.player, va.score.ai)).toBeGreaterThanOrEqual(DUEL_TARGET);
    // o placar de um é o espelho do placar do outro
    expect(vb.score).toEqual({ player: va.score.ai, ai: va.score.player });
    expect(vb.winner).toBe(va.winner === 'player' ? 'ai' : 'player');
    a.ws.close();
    b.ws.close();
  }, 30_000);

  it('recusa código errado e jogada fora da vez', async () => {
    const c = await connect(port);
    c.send({ t: 'join', v: PROTOCOL_VERSION, code: 'ZZZZ', player: { name: 'X', avatar: 'bene' } });
    const err = (await c.waitFor((m) => m.t === 'error')) as Extract<ServerMsg, { t: 'error' }>;
    expect(err.msg).toMatch(/não encontrada/);
    c.ws.close();

    const { a, b } = await openRoom();
    const v = a.view()!;
    const waiting = actor(v.hand) === 'player' ? b : a;
    const card = waiting.view()!.hand.hands.player[0].id;
    waiting.send({ t: 'act', a: { t: 'play', cardId: card } });
    const e2 = (await waiting.waitFor((m) => m.t === 'error' && m.msg.includes('inválida'))) as Extract<ServerMsg, { t: 'error' }>;
    expect(e2.fatal).toBeFalsy();
    a.ws.close();
    b.ws.close();
  });

  it('quem cai volta com o token; quem não volta perde por abandono', async () => {
    const { a, b, room } = await openRoom();
    b.ws.close();
    await a.waitFor((m) => m.t === 'state' && !m.opp.online);
    // volta a tempo
    const b2 = await connect(port);
    const tokenMsg = b.msgs.find((m) => m.t === 'room') as Extract<ServerMsg, { t: 'room' }>;
    b2.send({ t: 'resume', v: PROTOCOL_VERSION, code: room.code, token: tokenMsg.token });
    const st = (await b2.waitFor((m) => m.t === 'state')) as Extract<ServerMsg, { t: 'state' }>;
    expect(st.view.hand.hands.player).toHaveLength(3);
    // cai de novo e não volta: depois do tempo de espera, Ana vence por abandono
    b2.ws.close();
    const over = (await a.waitFor((m) => m.t === 'state' && m.view.stage === 'over', 2000)) as Extract<ServerMsg, { t: 'state' }>;
    expect(over.view.winner).toBe('player');
    expect(over.view.forfeit).toBe('ai');
    a.ws.close();
  });
});

// ---------------------------------------------------------------- duplas online

type DState = Extract<ServerMsg, { t: 'dstate' }>;
const lastD = (c: Client): DState | null => {
  for (let i = c.msgs.length - 1; i >= 0; i--) if (c.msgs[i].t === 'dstate') return c.msgs[i] as DState;
  return null;
};

/** Jogada simples pela visão de duplas: aceita tudo e joga a primeira carta. */
function autoDuplas(c: Client): boolean {
  const st = lastD(c);
  if (!st) return false;
  const v = st.view;
  if (v.onzeYou) return (c.send({ t: 'act', a: { t: 'onze', play: true } }), true);
  if (v.stage !== 'playing') return false;
  const who = dActor(v.hand);
  if (who !== 0) return false;
  if (v.hand.phase === 'respond') return (c.send({ t: 'act', a: { t: 'respond', r: 'accept' } }), true);
  return (c.send({ t: 'act', a: { t: 'play', cardId: v.hand.hands[0][0].id } }), true);
}

describe('Duplas online', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  const port = 19000 + Math.floor(Math.random() * 1000);
  beforeAll(async () => {
    server = await startServer({ port, handDelayMs: 5, botDelayMs: 1, reconnectMs: 150 });
  });
  afterAll(async () => {
    await server.close();
  });

  async function playUntilOver(clients: Client[], ms = 25_000) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline && lastD(clients[0])?.view.stage !== 'over') {
      for (const c of clients) autoDuplas(c);
      await new Promise((r) => setTimeout(r, 6));
    }
  }

  it('2 contra 2 com dois humanos em duplas opostas e a IA completando: joga até 12', async () => {
    const a = await connect(port);
    const b = await connect(port);
    a.send({ t: 'create', v: PROTOCOL_VERSION, player: { name: 'Ana', avatar: 'rosana' }, rules: RULES, mode: 'duplas' });
    const room = (await a.waitFor((m) => m.t === 'room')) as Extract<ServerMsg, { t: 'room' }>;
    expect(room.mode).toBe('duplas');
    b.send({ t: 'join', v: PROTOCOL_VERSION, code: room.code, player: { name: 'Beto', avatar: 'zeca' } });
    // Beto entra no lugar do parceiro; troca para a dupla adversária (à direita de quem ele vê)
    await b.waitFor((m) => m.t === 'dlobby');
    b.send({ t: 'seat', seat: 1 });
    await a.waitFor((m) => m.t === 'dlobby' && m.seats[1]?.info.name === 'Beto' || (m.t === 'dlobby' && m.seats[3]?.info.name === 'Beto'));
    // só o anfitrião começa
    b.send({ t: 'start' });
    a.send({ t: 'start' });
    await a.waitFor((m) => m.t === 'dstate');
    await b.waitFor((m) => m.t === 'dstate');
    const sa = lastD(a)!;
    expect(sa.seats.filter((s) => s.bot)).toHaveLength(2);
    // cada um só vê as próprias cartas
    expect(sa.view.hand.hands[0].every((x) => !x.id.startsWith('x-'))).toBe(true);
    for (const r of [1, 2, 3]) expect(sa.view.hand.hands[r].every((x) => x.id.startsWith('x-'))).toBe(true);

    await playUntilOver([a, b]);
    const va = lastD(a)!.view;
    const vb = lastD(b)!.view;
    expect(va.stage).toBe('over');
    expect(Math.max(...va.score)).toBeGreaterThanOrEqual(12);
    // Ana e Beto estão em duplas opostas: o placar de um é o espelho do outro
    expect(vb.score).toEqual([va.score[1], va.score[0]]);
    a.ws.close();
    b.ws.close();
  }, 30_000);

  it('dupla contra a máquina: os dois humanos ficam na mesma dupla; quem cai e não volta vira IA', async () => {
    const a = await connect(port);
    const b = await connect(port);
    a.send({ t: 'create', v: PROTOCOL_VERSION, player: { name: 'Ana', avatar: 'rosana' }, rules: RULES, mode: 'coop' });
    const room = (await a.waitFor((m) => m.t === 'room')) as Extract<ServerMsg, { t: 'room' }>;
    b.send({ t: 'join', v: PROTOCOL_VERSION, code: room.code, player: { name: 'Beto', avatar: 'zeca' } });
    const lob = (await a.waitFor((m) => m.t === 'dlobby' && !!m.seats[2])) as Extract<ServerMsg, { t: 'dlobby' }>;
    expect(lob.seats[2]!.info.name).toBe('Beto');
    expect(lob.locked).toEqual([false, true, false, true]);
    // não dá para sentar no lugar da máquina
    b.send({ t: 'seat', seat: 1 });
    a.send({ t: 'start' });
    const st = (await a.waitFor((m) => m.t === 'dstate')) as DState;
    expect(st.seats[2].info.name).toBe('Beto');
    expect(st.seats[1].bot && st.seats[3].bot).toBe(true);

    // Beto cai e não volta: a IA assume o lugar dele e a partida segue até o fim
    b.ws.close();
    await a.waitFor((m) => m.t === 'dstate' && !!m.seats[2].bot, 3000);
    await playUntilOver([a]);
    expect(lastD(a)!.view.stage).toBe('over');
    expect(lastD(a)!.seats[2].info.name).toBe('Beto (IA)');
    a.ws.close();
  }, 30_000);
});
