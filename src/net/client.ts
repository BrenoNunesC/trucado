// Conexão do jogo com o servidor online. Guarda o estado da sala no store (s.online) e, se a
// conexão cair no meio da partida, tenta voltar sozinha com o token da sala (que também fica
// na sessionStorage, para sobreviver a um recarregamento da página).

import type { CampView } from '../engine/campaign';
import type { DuelAction, DuelRules } from '../engine/duel';
import type { DuplasAction, SeatNo } from '../engine/duplas';
import { say, toast, update } from '../ui/store';
import { sfx } from '../audio/sfx';
import { EMOTES, PROTOCOL_VERSION, type ClientMsg, type GiftJoker, type PlayerInfo, type RoomMode, type ServerMsg } from './protocol';
import type { OnlineState } from '../ui/store';

const SESSION_KEY = 'trucado-online-session';
const MAX_RETRIES = 20;

interface Session {
  url: string;
  code: string;
  token: string;
}

let ws: WebSocket | null = null;
let session: Session | null = readSession();
let retries = 0;
let retryTimer: number | null = null;
/** A conexão foi fechada de propósito (sair da sala): não tenta voltar. */
let leaving = false;

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  session = s;
  try {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // sem sessionStorage: só não sobrevive a recarregar a página
  }
}

function setOnline(fn: (o: OnlineState) => void) {
  update((s) => {
    if (!s.online) s.online = { status: 'connecting' };
    fn(s.online);
  });
}

function send(msg: ClientMsg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function open(url: string, first: ClientMsg) {
  if (retryTimer) window.clearTimeout(retryTimer);
  retryTimer = null;
  leaving = false;
  ws?.close();
  let socket: WebSocket;
  try {
    socket = new WebSocket(url);
  } catch {
    setOnline((o) => {
      o.status = 'closed';
      o.error = 'Endereço do servidor inválido. Confira nas configurações.';
    });
    return;
  }
  ws = socket;
  socket.onopen = () => {
    retries = 0;
    socket.send(JSON.stringify(first));
  };
  socket.onmessage = (ev) => {
    let msg: ServerMsg;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    handle(url, msg);
  };
  socket.onclose = () => {
    if (ws !== socket) return;
    ws = null;
    if (leaving) return;
    if (session && retries < MAX_RETRIES) {
      // caiu no meio da sala: tenta voltar com o token, esperando um pouco mais a cada vez
      setOnline((o) => (o.status = 'reconnecting'));
      const s = session;
      retryTimer = window.setTimeout(() => open(s.url, { t: 'resume', v: PROTOCOL_VERSION, code: s.code, token: s.token }), Math.min(1000 * 2 ** retries++, 5000));
      return;
    }
    setOnline((o) => {
      if (o.status === 'closed') return;
      o.status = 'closed';
      o.error = o.error ?? `Não foi possível falar com o servidor (${url}).`;
    });
    saveSession(null);
  };
}

function handle(url: string, msg: ServerMsg) {
  switch (msg.t) {
    case 'room':
      saveSession({ url, code: msg.code, token: msg.token });
      setOnline((o) => {
        o.code = msg.code;
        o.seat = msg.seat;
        o.mode = msg.mode;
        o.error = undefined;
      });
      break;
    case 'dlobby':
      setOnline((o) => {
        o.status = 'lobby';
        o.mode = msg.mode;
        o.code = msg.code;
        o.seats = msg.seats;
        o.host = msg.host;
        o.locked = msg.locked;
        o.rules = msg.rules;
        o.dview = undefined;
      });
      break;
    case 'cstate':
      setOnline((o) => {
        o.status = 'playing';
        o.mode = 'campaign';
        o.code = msg.code;
        o.camp = msg.view;
        o.spectator = !!msg.spectator;
      });
      // quem assiste não tem run: só olha a mesa
      if (!msg.spectator) campaignHandler?.(msg.code, msg.view);
      break;
    case 'watching':
      setOnline((o) => {
        o.status = 'lobby';
        o.spectator = true;
        o.mode = msg.mode;
        o.code = msg.code;
        o.players = msg.players;
      });
      break;
    case 'chat':
      setOnline((o) => {
        const line = { key: Date.now() + Math.random(), from: msg.from, text: msg.text, mine: msg.mine, spectator: msg.spectator };
        o.chat = [...(o.chat ?? []), line].slice(-100);
      });
      if (!msg.mine) sfx('click');
      break;
    case 'cgift':
      giftHandler?.(msg.from, msg.joker, !!msg.returned);
      break;
    case 'dstate':
      setOnline((o) => {
        o.status = 'playing';
        o.mode = msg.mode;
        o.code = msg.code;
        o.dview = msg.view;
        o.seats = msg.seats;
        o.drematch = msg.rematch;
        o.rules = msg.view.rules;
        o.spectator = !!msg.spectator;
      });
      break;
    case 'lobby':
      setOnline((o) => {
        o.status = 'lobby';
        o.code = msg.code;
        o.you = msg.you;
        o.opp = msg.opp;
        o.rules = msg.rules;
        o.view = undefined;
      });
      break;
    case 'state':
      setOnline((o) => {
        o.status = 'playing';
        o.code = msg.code;
        o.view = msg.view;
        o.you = msg.you;
        o.opp = msg.opp;
        o.rematch = msg.rematch;
        o.rules = msg.view.rules;
        o.spectator = !!msg.spectator;
      });
      break;
    case 'emote': {
      const text = EMOTES[msg.id];
      if (!text) return;
      if (msg.seat !== undefined) {
        // duplas: o balão aparece em cima de quem falou
        const key = Date.now() + Math.random();
        const seat = msg.seat as SeatNo;
        setOnline((o) => (o.dspeech = { text, key, seat }));
        window.setTimeout(() => setOnline((o) => void (o.dspeech?.key === key && (o.dspeech = null))), 2600);
      } else if (msg.from === 'opp') say(text);
      else toast(`Você: ${text}`);
      break;
    }
    case 'error':
      if (msg.fatal) {
        saveSession(null);
        leaving = true;
        ws?.close();
        setOnline((o) => {
          o.status = 'closed';
          o.error = msg.msg;
        });
      } else toast(msg.msg, 'bad');
      break;
  }
}

export function onlineCreate(url: string, player: PlayerInfo, rules: DuelRules, mode: RoomMode = 'duel'): void {
  saveSession(null);
  update((s) => (s.online = { status: 'connecting', mode }));
  open(url, { t: 'create', v: PROTOCOL_VERSION, player, rules, mode });
}

export function onlineJoin(url: string, code: string, player: PlayerInfo): void {
  saveSession(null);
  update((s) => (s.online = { status: 'connecting' }));
  open(url, { t: 'join', v: PROTOCOL_VERSION, code: code.trim().toUpperCase(), player });
}

/** Volta para a sala guardada na sessão (depois de recarregar a página). */
export function onlineResume(): boolean {
  if (!session || ws) return false;
  const s = session;
  update((st) => (st.online = { status: 'reconnecting' }));
  open(s.url, { t: 'resume', v: PROTOCOL_VERSION, code: s.code, token: s.token });
  return true;
}

export const onlineAct = (a: DuelAction | DuplasAction) => send({ t: 'act', a });
/** Qualquer mensagem (a campanha manda as dela por aqui). */
export const onlineSend = (msg: ClientMsg) => send(msg);
export const onlineChat = (text: string) => send({ t: 'chat', text });
export const onlineGift = (joker: GiftJoker) => send({ t: 'cgift', joker });

/** Assiste uma sala pelo código (sem jogar; dá para conversar no chat). */
export function onlineWatch(url: string, code: string, name: string): void {
  saveSession(null);
  update((s) => (s.online = { status: 'connecting', spectator: true }));
  open(url, { t: 'watch', v: PROTOCOL_VERSION, code: code.trim().toUpperCase(), name });
}

/** Quem recebe os Coringas dados pelo parceiro (ui/campaignOnline.ts). */
let giftHandler: ((from: string, joker: GiftJoker, returned: boolean) => void) | null = null;
export function setGiftHandler(fn: (from: string, joker: GiftJoker, returned: boolean) => void): void {
  giftHandler = fn;
}

/**
 * Quem cuida da campanha online (ui/campaignOnline.ts) se registra aqui, para este arquivo não
 * depender da tela.
 */
let campaignHandler: ((code: string, view: CampView) => void) | null = null;
export function setCampaignHandler(fn: (code: string, view: CampView) => void): void {
  campaignHandler = fn;
}
/** Duplas: senta em outro lugar (número girado como a mesa) ou começa a partida (anfitrião). */
export const onlineSeat = (seat: number) => send({ t: 'seat', seat });
export const onlineStart = () => send({ t: 'start' });
export const onlineEmote = (id: number) => send({ t: 'emote', id });
export const onlineRematch = () => send({ t: 'rematch' });

export function onlineLeave(): void {
  leaving = true;
  send({ t: 'leave' });
  ws?.close();
  ws = null;
  if (retryTimer) window.clearTimeout(retryTimer);
  saveSession(null);
  update((s) => (s.online = null));
}
