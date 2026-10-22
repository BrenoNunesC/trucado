// Truco em duplas (2 contra 2) até 12. Quatro lugares em volta da mesa: 0 e 2 são uma dupla,
// 1 e 3 a outra; a vez anda 0 → 1 → 2 → 3 (anti-horário, como no truco). Cada rodada tem quatro
// cartas e vence a dupla da carta mais forte; se a mais forte das duas duplas empata, é canga.
// O truco é pedido por quem está na vez e respondido pelo adversário seguinte (que fala pela
// dupla dele); aumentar passa a resposta para a outra dupla.
//
// Roda tanto no jogo (duplas contra a máquina) quanto no servidor (online). O log guarda
// marcadores ({s0}…{s3} para lugares, {t0}/{t1} para duplas) que cada visão troca pelos nomes.

import { cardLabel, compareCards, manilhaFromVira, RANK_NAME, standardDeck, type Card, type Rank } from './cards';
import { createRng, shuffle, type Rng } from './rng';
import { BET_NAMES, betValue, handWinner, MAX_LEVEL, type BetResponse, type LogEntry, type RoundOutcome } from './truco';

export type SeatNo = 0 | 1 | 2 | 3;
export type Team = 0 | 1;

export const DUPLAS_TARGET = 12;
export const SEATS: SeatNo[] = [0, 1, 2, 3];

export const teamOf = (s: SeatNo): Team => (s % 2) as Team;
export const nextSeat = (s: SeatNo): SeatNo => ((s + 1) % 4) as SeatNo;
export const partnerOf = (s: SeatNo): SeatNo => ((s + 2) % 4) as SeatNo;
export const otherTeam = (t: Team): Team => (1 - t) as Team;

export interface DRound {
  leader: SeatNo;
  /** Vira e manilha desta rodada (mudam a cada rodada com a vira rotativa). */
  vira: Card;
  manilha: Rank;
  cards: (Card | null)[];
  hidden: boolean[];
  /** Ordem em que as cartas foram jogadas. */
  order: SeatNo[];
  outcome?: Team | 'tie';
  /** Quem jogou a carta que levou a rodada (ou a mais forte, na canga). */
  best?: SeatNo;
}

export interface DHandOptions {
  noBets?: boolean;
  startLevel?: number;
  /** Mão de Ferro: todos jogam às cegas. */
  blindPlay?: boolean;
  /** Nível máximo de aposta (chefes que limitam o truco). */
  maxLevel?: number;
  /** A canga conta para esta dupla (chefe O Pé-Frio). */
  tieWinner?: Team;
  /** A vira muda a cada rodada, tirada de `houseDeck` (chefes da vira rotativa). */
  rotatingVira?: boolean;
  /** Valores que existem no baralho: a manilha pula os que faltam. */
  availableRanks?: Rank[];
  /**
   * Quem responde às apostas por cada dupla (índice = dupla). Sem isso, responde o adversário
   * seguinte a quem apostou. Na campanha em dupla, você responde pela sua dupla.
   */
  voice?: (SeatNo | null)[];
}

/** Aposta feita na mão (alguns Coringas olham quem apostou e se foi aceita). */
export interface DBet {
  by: SeatNo;
  level: number;
  response?: BetResponse;
}

export interface DHand {
  vira: Card;
  manilha: Rank;
  hands: Card[][];
  /** As cartas com que cada lugar começou a mão. */
  dealt: Card[][];
  /** Próximas viras, para a vira rotativa. */
  houseDeck: Card[];
  bets: DBet[];
  rounds: DRound[];
  mao: SeatNo;
  turn: SeatNo;
  level: number;
  pending: { by: SeatNo; level: number } | null;
  lastRaiserTeam: Team | null;
  phase: 'play' | 'respond' | 'done';
  result: { winner: Team | null; points: number; reason: 'rounds' | 'run' | 'null'; ranAway?: Team } | null;
  log: LogEntry[];
  options: DHandOptions;
}

const S = (s: SeatNo) => `{s${s}}`;
const T = (t: Team) => `{t${t}}`;

function log(h: DHand, kind: LogEntry['kind'], text: string) {
  h.log.push({ kind, text });
}

export function createDHand(hands: Card[][], vira: Card, mao: SeatNo, options: DHandOptions = {}, houseDeck: Card[] = []): DHand {
  const manilha = manilhaFromVira(vira.rank, options.availableRanks);
  const h: DHand = {
    vira,
    manilha,
    hands: hands.map((x) => [...x]),
    dealt: hands.map((x) => [...x]),
    houseDeck: [...houseDeck],
    bets: [],
    rounds: [newRound(mao, vira, manilha)],
    mao,
    turn: mao,
    level: options.startLevel ?? 0,
    pending: null,
    lastRaiserTeam: null,
    phase: 'play',
    result: null,
    log: [],
    options,
  };
  log(h, 'info', `Vira: ${cardLabel(vira)} → manilha é ${RANK_NAME[manilha]}. ${S(mao)} começa.`);
  return h;
}

function newRound(leader: SeatNo, vira: Card, manilha: Rank): DRound {
  return { leader, vira, manilha, cards: [null, null, null, null], hidden: [false, false, false, false], order: [] };
}

const maxLevel = (h: DHand) => Math.min(MAX_LEVEL, h.options.maxLevel ?? MAX_LEVEL);

export const currentDRound = (h: DHand) => h.rounds[h.rounds.length - 1];

/** Quem deve agir agora: na resposta, o adversário seguinte a quem apostou. */
export function dActor(h: DHand): SeatNo | null {
  if (h.phase === 'done') return null;
  if (h.phase === 'respond') {
    const by = h.pending!.by;
    return h.options.voice?.[otherTeam(teamOf(by))] ?? nextSeat(by);
  }
  return h.turn;
}

export const dCanPlay = (h: DHand, s: SeatNo) => h.phase === 'play' && h.turn === s;
export const dCanPlayHidden = (h: DHand, s: SeatNo) => dCanPlay(h, s) && h.rounds.length > 1 && !h.options.blindPlay;
export const dCanBet = (h: DHand, s: SeatNo) =>
  dCanPlay(h, s) && !h.options.noBets && h.level < maxLevel(h) && h.lastRaiserTeam !== teamOf(s);
export const dCanRaise = (h: DHand, s: SeatNo) => h.phase === 'respond' && dActor(h) === s && h.pending!.level < maxLevel(h);

export function dPlay(h: DHand, s: SeatNo, cardId: string, hidden = false): void {
  if (!dCanPlay(h, s)) throw new Error('Fora da vez');
  if (hidden && !dCanPlayHidden(h, s)) throw new Error('Carta virada só a partir da 2ª rodada');
  const i = h.hands[s].findIndex((c) => c.id === cardId);
  if (i < 0) throw new Error('Carta não está na mão');
  const [card] = h.hands[s].splice(i, 1);
  const r = currentDRound(h);
  r.cards[s] = card;
  r.hidden[s] = hidden;
  r.order.push(s);
  if (hidden) log(h, 'info', `${S(s)} joga uma carta virada.`);
  if (r.order.length === 4) resolveRound(h);
  else h.turn = nextSeat(s);
}

function resolveRound(h: DHand) {
  const r = currentDRound(h);
  const n = h.rounds.length;
  // a mais forte entre as abertas; carta virada não vale nada
  let best: SeatNo[] = [];
  for (const s of r.order) {
    const c = r.cards[s]!;
    if (r.hidden[s]) continue;
    if (!best.length) best = [s];
    else {
      const cmp = compareCards(c, r.cards[best[0]]!, r.manilha);
      if (cmp > 0) best = [s];
      else if (cmp === 0) best.push(s);
    }
  }
  const teams = new Set(best.map(teamOf));
  const tie = best.length === 0 || teams.size > 1;
  r.outcome = tie ? (h.options.tieWinner ?? 'tie') : teamOf(best[0]);
  r.best = best[0] ?? r.leader;
  const played = r.order.map((s) => (r.hidden[s] ? `${S(s)} virada` : `${S(s)} ${cardLabel(r.cards[s]!)}`)).join(', ');
  log(h, 'round', `Rodada ${n}: ${played} — ${r.outcome === 'tie' ? 'canga!' : `${T(r.outcome)} leva (${S(r.best)})`}.`);

  const asSide: RoundOutcome[] = h.rounds.map((x) => (x.outcome === 'tie' ? 'tie' : x.outcome === 0 ? 'player' : 'ai'));
  const w = handWinner(asSide);
  if (w !== undefined) {
    finish(h, w === null ? null : w === 'player' ? 0 : 1, w === null ? 'null' : 'rounds');
    return;
  }
  // quem fez a rodada abre a próxima; na canga, quem jogou a mais forte primeiro
  const leader = r.best;
  let vira = r.vira;
  let manilha = r.manilha;
  if (h.options.rotatingVira && h.houseDeck.length > 0) {
    vira = h.houseDeck.pop()!;
    manilha = manilhaFromVira(vira.rank, h.options.availableRanks);
    h.vira = vira;
    h.manilha = manilha;
    log(h, 'info', `Nova vira: ${cardLabel(vira)} → manilha agora é ${RANK_NAME[manilha]}.`);
  }
  h.rounds.push(newRound(leader, vira, manilha));
  h.turn = leader;
}

function finish(h: DHand, winner: Team | null, reason: 'rounds' | 'run' | 'null', ranAway?: Team) {
  const points = winner === null ? 0 : betValue(h.level);
  h.result = { winner, points, reason, ranAway };
  h.phase = 'done';
  h.pending = null;
  if (winner === null) log(h, 'result', 'Tudo empatado: mão nula, ninguém pontua.');
  else if (reason === 'run') log(h, 'result', `${T(ranAway!)} correu. ${T(winner)} leva ${points} ponto(s).`);
  else log(h, 'result', `${T(winner)} vence a mão valendo ${points} ponto(s).`);
}

export function dBet(h: DHand, s: SeatNo): void {
  if (!dCanBet(h, s)) throw new Error('Não pode apostar agora');
  const level = h.level + 1;
  h.pending = { by: s, level };
  h.phase = 'respond';
  h.bets.push({ by: s, level });
  log(h, 'bet', `${S(s)} pede ${BET_NAMES[level].toUpperCase()}!`);
}

export function dRespond(h: DHand, s: SeatNo, r: BetResponse): void {
  if (h.phase !== 'respond' || dActor(h) !== s) throw new Error('Não é você quem responde');
  const p = h.pending!;
  const last = h.bets[h.bets.length - 1];
  if (last) last.response = r;
  if (r === 'run') {
    log(h, 'bet', `${S(s)} corre do ${BET_NAMES[p.level]}.`);
    finish(h, teamOf(p.by), 'run', teamOf(s));
    return;
  }
  if (r === 'accept') {
    h.level = p.level;
    h.lastRaiserTeam = teamOf(p.by);
    h.pending = null;
    h.phase = 'play';
    log(h, 'bet', `${S(s)} aceita. Mão valendo ${betValue(h.level)}.`);
    return;
  }
  if (p.level >= maxLevel(h)) throw new Error('Não dá para aumentar mais');
  h.level = p.level;
  h.lastRaiserTeam = teamOf(p.by);
  h.pending = { by: s, level: p.level + 1 };
  h.bets.push({ by: s, level: p.level + 1 });
  log(h, 'bet', `${S(s)} aumenta: ${BET_NAMES[p.level + 1].toUpperCase()}!`);
}

/** A dupla desiste da mão (correr da Mão de Onze): a outra leva o valor atual. */
export function dFold(h: DHand, t: Team): void {
  if (h.phase === 'done') return;
  h.pending = null;
  log(h, 'bet', `${T(t)} desiste da mão.`);
  finish(h, otherTeam(t), 'run', t);
}

// ---------------------------------------------------------------- partida até 12

export interface DuplasRules {
  maoDeOnze: boolean;
  maoDeFerro: boolean;
}

export interface DuplasMatch {
  rng: Rng;
  rules: DuplasRules;
  score: [number, number];
  hand: DHand;
  mao: SeatNo;
  handNo: number;
  stage: 'playing' | 'onze' | 'handOver' | 'over';
  winner: Team | null;
  /** Dupla na Mão de Onze (vê as cartas do parceiro e decide se joga). */
  onzeTeam: Team | null;
  /** Quem da dupla toma a decisão da Mão de Onze. */
  onzeDecider: SeatNo | null;
  lastPoints: { team: Team | null; points: number } | null;
  forfeit: Team | null;
}

export type DuplasAction =
  | { t: 'play'; cardId: string; hidden?: boolean }
  | { t: 'bet' }
  | { t: 'respond'; r: BetResponse }
  | { t: 'onze'; play: boolean };

export function newDuplas(seed: string, rules: DuplasRules): DuplasMatch {
  const m = {
    rng: createRng(seed),
    rules,
    score: [0, 0],
    mao: 3 as SeatNo,
    handNo: 0,
    stage: 'playing',
    winner: null,
    onzeTeam: null,
    onzeDecider: null,
    lastPoints: null,
    forfeit: null,
  } as Omit<DuplasMatch, 'hand'> as DuplasMatch;
  dealDuplas(m);
  return m;
}

export function dealDuplas(m: DuplasMatch): void {
  m.handNo += 1;
  m.mao = nextSeat(m.mao);
  const deck = shuffle(m.rng, standardDeck('q'));
  const vira = deck.pop()!;
  const hands = SEATS.map(() => [deck.pop()!, deck.pop()!, deck.pop()!]);
  const options: DHandOptions = {};
  m.onzeTeam = null;
  m.onzeDecider = null;
  m.stage = 'playing';
  const at11 = m.score.map((x) => x === DUPLAS_TARGET - 1);
  if (at11[0] && at11[1] && m.rules.maoDeFerro) {
    options.noBets = true;
    options.blindPlay = true;
  } else if ((at11[0] || at11[1]) && !(at11[0] && at11[1]) && m.rules.maoDeOnze) {
    options.noBets = true;
    options.startLevel = 1;
    m.onzeTeam = at11[0] ? 0 : 1;
    // decide quem da dupla joga primeiro nesta mão
    m.onzeDecider = teamOf(m.mao) === m.onzeTeam ? m.mao : nextSeat(m.mao);
  }
  m.hand = createDHand(hands, vira, m.mao, options);
  if (options.blindPlay) log(m.hand, 'info', 'MÃO DE FERRO: 11 a 11, todo mundo joga às cegas!');
  if (m.onzeTeam !== null) {
    m.stage = 'onze';
    log(m.hand, 'info', `MÃO DE ONZE: ${T(m.onzeTeam)} vê as cartas do parceiro e decide se joga valendo 3.`);
  }
}

/** Na Mão de Ferro o jogador só recebe o verso das próprias cartas; aqui o verso vira a carta. */
function realCardId(m: DuplasMatch, s: SeatNo, id: string): string {
  return m.hand.hands[s].find((c) => c.id === id || blank(c.id).id === id)?.id ?? id;
}

export function duplasCanAct(m: DuplasMatch, s: SeatNo, a: DuplasAction): boolean {
  const h = m.hand;
  if (a.t === 'play') a = { ...a, cardId: realCardId(m, s, a.cardId) };
  if (m.stage === 'onze') return a.t === 'onze' && m.onzeDecider === s;
  if (m.stage !== 'playing' || h.phase === 'done') return false;
  switch (a.t) {
    case 'play':
      return dCanPlay(h, s) && h.hands[s].some((c) => c.id === a.cardId) && (!a.hidden || dCanPlayHidden(h, s));
    case 'bet':
      return dCanBet(h, s);
    case 'respond':
      return h.phase === 'respond' && dActor(h) === s && (a.r !== 'raise' || dCanRaise(h, s));
    default:
      return false;
  }
}

/** Aplica a ação se for válida (senão devolve false e não muda nada). */
export function applyDuplas(m: DuplasMatch, s: SeatNo, a: DuplasAction): boolean {
  if (!duplasCanAct(m, s, a)) return false;
  const h = m.hand;
  if (a.t === 'play') dPlay(h, s, realCardId(m, s, a.cardId), !!a.hidden);
  else if (a.t === 'bet') dBet(h, s);
  else if (a.t === 'respond') dRespond(h, s, a.r);
  else {
    m.stage = 'playing';
    if (a.play) log(h, 'info', `${T(teamOf(s))} vai jogar a Mão de Onze valendo 3!`);
    else {
      h.level = 0;
      dFold(h, teamOf(s));
    }
  }
  if (h.phase === 'done') finishDuplas(m);
  return true;
}

export function finishDuplas(m: DuplasMatch): void {
  const r = m.hand.result!;
  if (r.winner !== null) m.score[r.winner] += r.points;
  m.lastPoints = { team: r.winner, points: r.points };
  if (m.score[0] >= DUPLAS_TARGET || m.score[1] >= DUPLAS_TARGET) {
    m.winner = m.score[0] >= DUPLAS_TARGET ? 0 : 1;
    m.stage = 'over';
  } else m.stage = 'handOver';
}

export function nextDuplasHand(m: DuplasMatch): void {
  if (m.stage === 'handOver') dealDuplas(m);
}

export function forfeitDuplas(m: DuplasMatch, loser: Team): void {
  if (m.stage === 'over') return;
  m.forfeit = loser;
  m.winner = otherTeam(loser);
  m.stage = 'over';
}

// ---------------------------------------------------------------- visão de cada lugar

/**
 * A mesa vista de um lugar, girada para que ele seja o 0 (embaixo): 1 fica à direita, 2 (o
 * parceiro) em frente e 3 à esquerda; a dupla dele é sempre a 0. As cartas na mão dos outros
 * viram verso (o parceiro aparece na Mão de Onze, que a regra deixa ver), as viradas dos outros
 * também, e o log já vem com os nomes.
 */
export interface DuplasView {
  hand: DHand;
  score: [number, number];
  stage: DuplasMatch['stage'];
  winner: Team | null;
  /** Este jogador decide a Mão de Onze. */
  onzeYou: boolean;
  /** Alguém (da dupla dele ou da outra) está decidindo a Mão de Onze. */
  onzeWaiting: Team | null;
  lastPoints: DuplasMatch['lastPoints'];
  handNo: number;
  forfeit: Team | null;
  rules: DuplasRules;
  /** Lugar real deste jogador (0..3) na partida. */
  seat: SeatNo;
}

function blank(id: string): Card {
  let x = 0;
  for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return { id: `x-${x.toString(36)}`, rank: '4', suit: 'ouros' };
}

/**
 * Troca os marcadores do log pelos nomes, do ponto de vista de `seat`. Quem só assiste (`seat`
 * = -1) vê todos pelo nome e as duplas como "a dupla de Fulano e Beltrano".
 */
export function formatDuplasLog(text: string, seat: SeatNo | -1, names: string[]): string {
  const name = (d: number) => names[d] ?? `Jogador ${d + 1}`;
  return text
    .replace(/\{s(\d)\}/g, (_, d) => (Number(d) === seat ? 'Você' : name(Number(d))))
    .replace(/\{t(\d)\}/g, (_, d) => {
      const t = Number(d) as Team;
      if (seat === -1) return `A dupla de ${name(t)} e ${name(t + 2)}`;
      return t === teamOf(seat) ? 'Sua dupla' : 'A dupla adversária';
    });
}

/**
 * A mão vista de um lugar, girada para que ele seja o 0. Esconde as cartas na mão dos outros
 * (menos o parceiro quando `partnerVisible`), as viradas dos outros, as cartas iniciais dos
 * outros, as próximas viras e, na Mão de Ferro, até as próprias cartas.
 */
export function viewDHand(h: DHand, seat: SeatNo, names: string[], partnerVisible = false, spectator = false): DHand {
  const rel = (s: SeatNo): SeatNo => ((s - seat + 4) % 4) as SeatNo;
  const relTeam = (t: Team): Team => (teamOf(seat) === 0 ? t : otherTeam(t));
  const fromRel = (r: number): SeatNo => ((r + seat) % 4) as SeatNo;
  const done = h.phase === 'done';
  // quem assiste não tem mão nenhuma: vê como se não estivesse em lugar algum
  const own = (s: SeatNo) => !spectator && s === seat;
  return {
    ...h,
    hands: [0, 1, 2, 3].map((r) => {
      const s = fromRel(r);
      const cards = h.hands[s];
      if (own(s) && h.options.blindPlay && !done) return cards.map((c) => blank(c.id));
      if (own(s) || done || (!spectator && partnerVisible && s === partnerOf(seat))) return cards;
      return cards.map((c) => blank(c.id));
    }),
    dealt: [0, 1, 2, 3].map((r) => (own(fromRel(r)) || done ? h.dealt[fromRel(r)] : [])),
    houseDeck: [],
    bets: h.bets.map((b) => ({ ...b, by: rel(b.by) })),
    rounds: h.rounds.map((r) => ({
      leader: rel(r.leader),
      vira: r.vira,
      manilha: r.manilha,
      cards: [0, 1, 2, 3].map((x) => {
        const s = fromRel(x);
        const c = r.cards[s];
        return c && r.hidden[s] && !own(s) ? blank(c.id) : c;
      }),
      hidden: [0, 1, 2, 3].map((x) => r.hidden[fromRel(x)]),
      order: r.order.map(rel),
      outcome: r.outcome === undefined || r.outcome === 'tie' ? r.outcome : relTeam(r.outcome),
      best: r.best === undefined ? undefined : rel(r.best),
    })),
    mao: rel(h.mao),
    turn: rel(h.turn),
    pending: h.pending && { ...h.pending, by: rel(h.pending.by) },
    lastRaiserTeam: h.lastRaiserTeam === null ? null : relTeam(h.lastRaiserTeam),
    result: h.result && {
      ...h.result,
      winner: h.result.winner === null ? null : relTeam(h.result.winner),
      ranAway: h.result.ranAway === undefined ? undefined : relTeam(h.result.ranAway),
    },
    log: h.log.map((e) => ({ ...e, text: formatDuplasLog(e.text, spectator ? -1 : seat, names) })),
    options: { ...h.options, tieWinner: h.options.tieWinner === undefined ? undefined : relTeam(h.options.tieWinner) },
  };
}

export function duplasViewFor(m: DuplasMatch, seat: SeatNo, names: string[], spectator = false): DuplasView {
  const h = m.hand;
  const relTeam = (t: Team): Team => (teamOf(seat) === 0 ? t : otherTeam(t));
  const partnerVisible = m.onzeTeam !== null && m.onzeTeam === teamOf(seat) && h.phase !== 'done';
  const hand = viewDHand(h, seat, names, partnerVisible, spectator);
  const mine = teamOf(seat);
  return {
    hand,
    score: mine === 0 ? [m.score[0], m.score[1]] : [m.score[1], m.score[0]],
    stage: m.stage,
    winner: m.winner === null ? null : relTeam(m.winner),
    onzeYou: !spectator && m.stage === 'onze' && m.onzeDecider === seat,
    onzeWaiting: m.stage === 'onze' && m.onzeTeam !== null ? relTeam(m.onzeTeam) : null,
    lastPoints: m.lastPoints && { ...m.lastPoints, team: m.lastPoints.team === null ? null : relTeam(m.lastPoints.team) },
    handNo: m.handNo,
    forfeit: m.forfeit === null ? null : relTeam(m.forfeit),
    rules: m.rules,
    seat,
  };
}
