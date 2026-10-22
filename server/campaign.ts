// Campanha em dupla no servidor: a parte compartilhada (sequência de Blinds, a mesa de quatro e o
// placar da dupla). Cada jogo cuida da própria run; veja src/engine/campaign.ts.

import { decideDHand } from '../src/ai/duplas';
import { PERSONALITIES, type Personality } from '../src/ai/opponent';
import { FINAL_ANTE } from '../src/data/balance';
import { BOSS_BY_ID } from '../src/data/bosses';
import { OPPONENT_BY_ID, OPPONENTS } from '../src/data/opponents';
import { mergeTableRules, scheduleAnte, type CampBlind, type CampSeat, type CampView, type TableRules } from '../src/engine/campaign';
import { RANKS, standardDeck, SUITS, type Card } from '../src/engine/cards';
import {
  createDHand,
  dActor,
  dBet,
  dCanBet,
  dCanPlay,
  dCanPlayHidden,
  dCanRaise,
  dFold,
  dPlay,
  dRespond,
  partnerOf,
  SEATS,
  teamOf,
  viewDHand,
  type DHand,
  type DHandOptions,
  type DuplasAction,
  type SeatNo,
} from '../src/engine/duplas';
import { createRng, fork, int, pick, shuffle, type Rng } from '../src/engine/rng';
import type { CoopSeat } from '../src/engine/state';

export interface CampPlayer {
  target: number;
  score: number;
  rules: TableRules | null;
  cards: Card[] | null;
  peek: boolean;
  /** Última mão que este jogador pontuou. */
  scored: number;
  shopDone: boolean;
}

export interface CampBlindState {
  seats: CoopSeat[];
  handNo: number;
  handsTotal: number;
  handsLeft: number;
  dhand: DHand | null;
  stage: 'dealing' | 'playing' | 'onze' | 'scoring' | 'handOver' | 'won' | 'lost';
  onzeDecider: SeatNo | null;
  hideVira: boolean;
  aiAlwaysRuns: boolean;
  /** Carta adversária mostrada a cada jogador (Olho Vivo / carta Marcada). */
  revealed: Partial<Record<number, string>>;
}

export interface CampState {
  rng: Rng;
  seed: string;
  stake: number;
  options: { maoDeOnze: boolean; maoDeFerro: boolean };
  phase: CampView['phase'];
  ante: number;
  blindIndex: number;
  blinds: CampBlind[];
  bossesSeen: string[];
  players: Partial<Record<number, CampPlayer>>;
  blind: CampBlindState | null;
  /** Blinds vencidos pela dupla (para o ranking). */
  blindsWon: number;
}

/** Quem está em cada lugar humano: o servidor passa o que sabe da sala. */
export interface HumanSeat {
  seat: SeatNo;
  name: string;
  avatar: string;
  online: boolean;
}

const newPlayer = (): CampPlayer => ({ target: 0, score: 0, rules: null, cards: null, peek: false, scored: 0, shopDone: false });

export function newCamp(seed: string, stake: number, options: CampState['options'], humans: HumanSeat[]): CampState {
  const rng = createRng(seed);
  const c: CampState = {
    rng,
    seed,
    stake: Math.max(1, Math.min(8, stake | 0)),
    options,
    phase: 'select',
    ante: 1,
    blindIndex: 0,
    blinds: [],
    bossesSeen: [],
    players: {},
    blind: null,
    blindsWon: 0,
  };
  for (const h of humans) c.players[h.seat] = newPlayer();
  c.blinds = scheduleAnte(rng, 1, c.bossesSeen);
  return c;
}

const isHuman = (humans: HumanSeat[], s: SeatNo) => humans.some((h) => h.seat === s);

// ---------------------------------------------------------------- escolha do Blind

/** O anfitrião joga (skip = false) ou pula o Blind da vez. */
export function campSelect(c: CampState, humans: HumanSeat[], skip: boolean): boolean {
  if (c.phase !== 'select') return false;
  const info = c.blinds[c.blindIndex];
  if (skip) {
    if (info.kind === 'chefe' || !info.tagId) return false;
    info.status = 'skipped';
    c.blindIndex += 1;
    return true;
  }
  info.status = 'current';
  c.phase = 'blind';
  const boss = info.bossId ? BOSS_BY_ID[info.bossId] : null;
  const main: CoopSeat = boss
    ? { name: boss.name, avatar: boss.id, personality: info.personality }
    : { name: OPPONENT_BY_ID[info.opponentId!]?.name ?? 'Adversário', avatar: info.opponentId ?? 'bene', personality: info.personality };
  const taken = new Set([main.avatar, ...humans.map((h) => h.avatar)]);
  const pool = OPPONENTS.filter((o) => !taken.has(o.id));
  const side = pick(c.rng, pool);
  taken.add(side.id);
  const seatOf = (s: SeatNo): CoopSeat => {
    const h = humans.find((x) => x.seat === s);
    if (h) return { name: h.name, avatar: h.avatar, personality: 'equilibrado' };
    // parceiro da IA quando o outro humano não está
    const p = pick(c.rng, OPPONENTS.filter((o) => !taken.has(o.id)));
    return { name: p.name, avatar: p.id, personality: p.personality };
  };
  c.blind = {
    seats: [seatOf(0), main, seatOf(2), { name: side.name, avatar: side.id, personality: side.personality }],
    handNo: 0,
    handsTotal: 0,
    handsLeft: 0,
    dhand: null,
    stage: 'dealing',
    onzeDecider: null,
    hideVira: false,
    aiAlwaysRuns: false,
    revealed: {},
  };
  for (const h of humans) {
    const p = (c.players[h.seat] ??= newPlayer());
    Object.assign(p, { target: 0, score: 0, rules: null, cards: null, peek: false, scored: 0, shopDone: false });
  }
  return true;
}

// ---------------------------------------------------------------- cartas e mão

function validCards(cards: unknown): cards is Card[] {
  return (
    Array.isArray(cards) &&
    cards.length === 3 &&
    cards.every(
      (x) =>
        x &&
        typeof x === 'object' &&
        typeof x.id === 'string' &&
        x.id.length <= 40 &&
        (RANKS as readonly string[]).includes(x.rank) &&
        (SUITS as readonly string[]).includes(x.suit),
    )
  );
}

const cleanCard = (x: Card): Card => ({ id: x.id, rank: x.rank, suit: x.suit, edition: x.edition, seal: x.seal });

/** As regras vêm do jogo de cada um: só aceita o formato esperado, dentro dos limites. */
function cleanRules(r: Partial<TableRules> | undefined): TableRules {
  const n = (v: unknown, lo: number, hi: number, d: number) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.round(Number(v)))) : d);
  return {
    hands: n(r?.hands, 1, 12, 4),
    noBets: !!r?.noBets,
    rotatingVira: !!r?.rotatingVira,
    hideVira: !!r?.hideVira,
    aiAlwaysRuns: !!r?.aiAlwaysRuns,
    tieLoses: !!r?.tieLoses,
    startLevel: n(r?.startLevel, 0, 3, 0),
    maxLevel: n(r?.maxLevel, 1, 4, 4),
    aiAlwaysMao: !!r?.aiAlwaysMao,
  };
}

/** Um jogador mandou as cartas da próxima mão. Quando todos mandarem, a mão é distribuída. */
export function campCards(c: CampState, humans: HumanSeat[], seat: SeatNo, handNo: number, cards: unknown, target: number, rules: TableRules, peek: boolean): boolean {
  const b = c.blind;
  const p = c.players[seat];
  if (!b || !p || c.phase !== 'blind' || (b.stage !== 'dealing' && b.stage !== 'handOver')) return false;
  if (handNo !== b.handNo + 1 || !validCards(cards)) return false;
  p.cards = cards.map(cleanCard);
  p.target = Math.max(0, Number(target) || 0);
  p.rules = cleanRules(rules);
  p.peek = !!peek;
  campTryDeal(c, humans);
  return true;
}

/** Distribui a próxima mão se todos os humanos já mandaram as cartas (também quando alguém sai). */
export function campTryDeal(c: CampState, humans: HumanSeat[]): void {
  const b = c.blind;
  if (!b || (b.stage !== 'dealing' && b.stage !== 'handOver') || humans.length === 0) return;
  if (humans.every((h) => c.players[h.seat]?.cards)) deal(c, humans);
}

function deal(c: CampState, humans: HumanSeat[]) {
  const b = c.blind!;
  const rules = mergeTableRules(humans.map((h) => c.players[h.seat]!.rules!));
  b.handNo += 1;
  if (b.handNo === 1) b.handsTotal = rules.hands;
  b.handsLeft = b.handsTotal - b.handNo;
  b.hideVira = rules.hideVira;
  b.aiAlwaysRuns = rules.aiAlwaysRuns;

  const house = shuffle(c.rng, standardDeck('h'));
  const used = humans.flatMap((h) => c.players[h.seat]!.cards!);
  for (const u of used) {
    const i = house.findIndex((x) => x.rank === u.rank && x.suit === u.suit);
    if (i >= 0) house.splice(i, 1);
  }
  const hands = SEATS.map((s) => (isHuman(humans, s) ? c.players[s]!.cards! : [house.pop()!, house.pop()!, house.pop()!]));
  const vira = house.pop()!;
  const viraDeck = rules.rotatingVira ? [house.pop()!, house.pop()!] : [];
  const n = b.handNo - 1;
  const mao = (rules.aiAlwaysMao ? (n % 2 === 0 ? 1 : 3) : n % 4) as SeatNo;
  const options: DHandOptions = {
    noBets: rules.noBets,
    rotatingVira: rules.rotatingVira,
    tieWinner: rules.tieLoses ? 1 : undefined,
    startLevel: rules.startLevel || undefined,
    maxLevel: rules.maxLevel < 4 ? rules.maxLevel : undefined,
    // com um humano só, é ele quem responde pela dupla (o parceiro da IA não corre com o dinheiro dele)
    voice: humans.length === 1 ? [humans[0].seat, null] : undefined,
  };
  const total = humans.reduce((a, h) => a + c.players[h.seat]!.score, 0);
  const target = humans.reduce((a, h) => a + c.players[h.seat]!.target, 0);
  let onze = false;
  if (b.handsLeft === 0 && c.options.maoDeFerro && total < target / 2) {
    options.noBets = true;
    options.blindPlay = true;
    options.startLevel = 2;
  } else if (b.handsLeft === 0 && c.options.maoDeOnze) {
    options.noBets = true;
    options.startLevel = Math.max(1, options.startLevel ?? 0);
    onze = true;
  }
  b.dhand = createDHand(hands, vira, mao, options, viraDeck);
  if (options.blindPlay) b.dhand.log.push({ kind: 'info', text: 'MÃO DE FERRO: cartas às cegas, valendo Seis!' });
  if (onze) b.dhand.log.push({ kind: 'info', text: 'MÃO DE ONZE: a dupla vê as cartas uma da outra e decide se joga valendo Truco.' });
  b.stage = onze ? 'onze' : 'playing';
  b.onzeDecider = onze ? humans[0].seat : null;
  b.revealed = {};
  for (const h of humans) {
    const p = c.players[h.seat]!;
    p.cards = null;
    if (p.peek) {
      const opp = [...hands[1], ...hands[3]];
      b.revealed[h.seat] = opp[int(c.rng, opp.length)].id;
    }
  }
}

/** Blefe: troca as cartas de quem ainda não jogou nenhuma nesta mão. */
export function campBluff(c: CampState, seat: SeatNo, cards: unknown): boolean {
  const h = c.blind?.dhand;
  if (!h || c.blind!.stage !== 'playing' || h.phase === 'done') return false;
  if (h.rounds.length !== 1 || h.rounds[0].cards[seat] || !validCards(cards)) return false;
  h.hands[seat] = cards.map(cleanCard);
  h.dealt[seat] = [...h.hands[seat]];
  return true;
}

/** Jogada de um humano na mesa. */
export function campAct(c: CampState, seat: SeatNo, a: DuplasAction): boolean {
  const b = c.blind;
  const h = b?.dhand;
  if (!b || !h) return false;
  if (b.stage === 'onze') {
    if (a.t !== 'onze' || b.onzeDecider !== seat) return false;
    b.stage = 'playing';
    if (!a.play) {
      h.level = 0;
      dFold(h, teamOf(seat));
    }
    return afterAct(c);
  }
  if (b.stage !== 'playing' || h.phase === 'done') return false;
  if (a.t === 'play') {
    const id = h.hands[seat].find((x) => x.id === a.cardId || `x-${hash(x.id)}` === a.cardId)?.id;
    if (!id || !dCanPlay(h, seat) || (a.hidden && !dCanPlayHidden(h, seat))) return false;
    dPlay(h, seat, id, !!a.hidden);
  } else if (a.t === 'bet') {
    if (!dCanBet(h, seat)) return false;
    dBet(h, seat);
  } else if (a.t === 'respond') {
    if (h.phase !== 'respond' || dActor(h) !== seat || (a.r === 'raise' && !dCanRaise(h, seat))) return false;
    dRespond(h, seat, a.r);
  } else return false;
  return afterAct(c);
}

/** O mesmo verso que viewDHand usa (o jogo manda esse id na Mão de Ferro). */
function hash(id: string): string {
  let x = 0;
  for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return x.toString(36);
}

function afterAct(c: CampState): boolean {
  const b = c.blind!;
  if (b.dhand!.phase === 'done') b.stage = 'scoring';
  return true;
}

/** Lugar da IA que deve agir agora (adversários sempre; o parceiro se não houver humano lá). */
export function campBotSeat(c: CampState, humans: HumanSeat[]): SeatNo | null {
  const b = c.blind;
  if (!b?.dhand || b.stage !== 'playing') return null;
  const s = dActor(b.dhand);
  return s !== null && !isHuman(humans, s) ? s : null;
}

/** Uma jogada da IA. */
export function campBotStep(c: CampState, humans: HumanSeat[]): boolean {
  const s = campBotSeat(c, humans);
  if (s === null) return false;
  const b = c.blind!;
  const h = b.dhand!;
  const opponent = teamOf(s) === 1;
  let p: Personality = { ...PERSONALITIES[b.seats[s].personality] };
  if (opponent && c.stake >= 4) p = { ...p, aggression: Math.min(1, p.aggression + 0.15), caution: Math.max(0, p.caution - 0.1) };
  const a = decideDHand(h, s, fork(c.rng), p, { alwaysRun: opponent && b.aiAlwaysRuns });
  if (!a || a.t === 'onze') return false;
  if (a.t === 'play') dPlay(h, s, a.cardId, !!a.hidden);
  else if (a.t === 'bet') dBet(h, s);
  else dRespond(h, s, a.r);
  return afterAct(c);
}

// ---------------------------------------------------------------- pontuação e fim do Blind

/** Um jogador pontuou a mão na própria run. Quando todos pontuarem, o placar da dupla decide. */
export function campScore(c: CampState, humans: HumanSeat[], seat: SeatNo, handNo: number, score: number): boolean {
  const b = c.blind;
  const p = c.players[seat];
  if (!b || !p || b.stage !== 'scoring' || handNo !== b.handNo || p.scored === handNo) return false;
  p.score = Math.max(0, Number(score) || 0);
  p.scored = handNo;
  settle(c, humans);
  return true;
}

/** Fecha a mão quando todos os humanos já pontuaram (também chamado quando alguém sai). */
export function settle(c: CampState, humans: HumanSeat[]): void {
  const b = c.blind;
  if (!b || b.stage !== 'scoring' || !humans.every((h) => c.players[h.seat]?.scored === b.handNo)) return;
  const total = humans.reduce((a, h) => a + c.players[h.seat]!.score, 0);
  const target = humans.reduce((a, h) => a + c.players[h.seat]!.target, 0);
  const info = c.blinds[c.blindIndex];
  if (total >= target) {
    b.stage = 'won';
    c.blindsWon += 1;
    info.status = 'defeated';
    c.phase = info.kind === 'chefe' && c.ante === FINAL_ANTE ? 'victory' : 'shop';
    for (const h of humans) c.players[h.seat]!.shopDone = false;
  } else if (b.handsLeft <= 0) {
    b.stage = 'lost';
    c.phase = 'over';
  } else b.stage = 'handOver';
}

/** Um jogador saiu da loja. Quando todos saírem, vem o próximo Blind (e o próximo Ante). */
export function campShopDone(c: CampState, humans: HumanSeat[], seat: SeatNo): boolean {
  const p = c.players[seat];
  if (c.phase !== 'shop' || !p) return false;
  p.shopDone = true;
  advanceIfReady(c, humans);
  return true;
}

export function advanceIfReady(c: CampState, humans: HumanSeat[]): void {
  if (c.phase !== 'shop' || !humans.every((h) => c.players[h.seat]?.shopDone)) return;
  c.blind = null;
  c.blindIndex += 1;
  if (c.blindIndex > 2) {
    c.ante += 1;
    c.blinds = scheduleAnte(c.rng, c.ante, c.bossesSeen);
    c.blindIndex = 0;
  }
  c.phase = 'select';
}

// ---------------------------------------------------------------- visão de cada jogador

export function campView(c: CampState, seat: SeatNo, humans: HumanSeat[], host: boolean, spectator = false): CampView {
  const b = c.blind;
  const partner = partnerOf(seat);
  const ph = humans.find((h) => h.seat === partner);
  const p = c.players[seat] ?? newPlayer();
  const pp = c.players[partner];
  let table: CampView['table'] = null;
  if (b) {
    const rel = (r: number) => ((r + seat) % 4) as SeatNo;
    const seats: CampSeat[] = [0, 1, 2, 3].map((r) => {
      const s = rel(r);
      const human = humans.find((h) => h.seat === s);
      return { name: b.seats[s].name, avatar: b.seats[s].avatar, bot: !human, online: human ? human.online : true };
    });
    let hand = b.dhand;
    if (hand) {
      const names = b.seats.map((x) => x.name);
      const view = viewDHand(hand, seat, names, b.stage === 'onze', spectator);
      // a carta adversária revelada a este jogador aparece de face
      const rid = spectator ? undefined : b.revealed[seat];
      if (rid) view.hands = view.hands.map((cards, r) => cards.map((x, i) => (hand!.hands[rel(r)][i]?.id === rid ? hand!.hands[rel(r)][i] : x)));
      hand = view;
    }
    table = {
      hand: hand ?? (null as unknown as DHand),
      seats,
      stage: b.stage,
      handNo: b.handNo,
      handsLeft: b.handsLeft,
      onzeYou: !spectator && b.stage === 'onze' && b.onzeDecider === seat,
      hideVira: b.hideVira,
      revealedId: b.revealed[seat],
      sentCards: !!p.cards,
      sentScore: p.scored === b.handNo,
    };
  }
  const humanTargets = humans.reduce((a, h) => a + (c.players[h.seat]?.target ?? 0), 0);
  return {
    seat,
    host,
    seed: c.seed,
    stake: c.stake,
    options: c.options,
    phase: c.phase,
    ante: c.ante,
    blindIndex: c.blindIndex,
    blinds: c.blinds,
    table,
    score: { mine: p.score, partner: pp && ph ? pp.score : 0, target: humanTargets },
    partner: ph
      ? { name: ph.name, avatar: ph.avatar, bot: false, online: ph.online }
      : { name: b?.seats[partner].name ?? 'Parceiro (IA)', avatar: b?.seats[partner].avatar ?? 'bene', bot: true, online: true },
    shopDone: { you: p.shopDone, partner: !ph || !!pp?.shopDone },
  };
}
