// Máquina de estados de uma mão de Truco Paulista (1 contra 1).
// Pura: não conhece UI, IA nem pontuação Balatro.

import {
  cardLabel,
  compareCards,
  isManilha,
  manilhaFromVira,
  RANK_NAME,
  SUIT_NAME,
  type Card,
  type Rank,
} from './cards';

export type Side = 'player' | 'ai';
export type RoundOutcome = Side | 'tie';
export type BetResponse = 'accept' | 'run' | 'raise';

export const other = (s: Side): Side => (s === 'player' ? 'ai' : 'player');

/** Valor em pontos por nível: 0 = sem aposta, 1 = Truco, 2 = Seis, 3 = Nove, 4 = Doze. */
export const BET_VALUES = [1, 3, 6, 9, 12] as const;
export const BET_NAMES = ['Sem aposta', 'Truco', 'Seis', 'Nove', 'Doze'] as const;
export const MAX_LEVEL = 4;

export interface Round {
  leader: Side;
  manilha: Rank;
  vira: Card;
  cards: Partial<Record<Side, Card>>;
  /** Cartas jogadas viradas (encobertas): não valem nada e o outro lado não vê. */
  hidden?: Partial<Record<Side, boolean>>;
  outcome?: RoundOutcome;
}

export interface HandOptions {
  /** Nenhum lado pode apostar (Caladão, Mão de Onze, Mão de Ferro). */
  noBets?: boolean;
  /** Nível de aposta inicial já aceito (Mão de Onze vale Truco). */
  startLevel?: number;
  /** Cartas jogadas às cegas (Mão de Ferro): só para a UI e a IA. */
  blindPlay?: boolean;
  /** A vira (e a manilha) muda a cada rodada (O Sorrateiro). */
  rotatingVira?: boolean;
  /** Se definido, cangas contam como vitória deste lado (O Pé-Frio). */
  tieWinner?: Side;
  /** Nível máximo de aposta (ex.: só até Truco). */
  maxLevel?: number;
}

export interface BetEvent {
  by: Side;
  level: number;
  response?: BetResponse;
}

export type LogKind = 'info' | 'round' | 'bet' | 'result';
export interface LogEntry {
  kind: LogKind;
  text: string;
}

export interface HandResult {
  winner: Side | null;
  points: number;
  reason: 'rounds' | 'run' | 'null';
  /** Quem correu, se alguém correu. */
  ranAway?: Side;
}

export interface TrucoHand {
  vira: Card;
  manilha: Rank;
  /** Restante do baralho da casa (para vira rotativa). */
  houseDeck: Card[];
  hands: Record<Side, Card[]>;
  /** As 3 cartas que cada lado tinha ao começar a jogar. */
  dealt: Record<Side, Card[]>;
  rounds: Round[];
  mao: Side;
  turn: Side;
  level: number;
  pending: { by: Side; level: number } | null;
  lastRaiser: Side | null;
  bets: BetEvent[];
  phase: 'play' | 'respond' | 'done';
  result: HandResult | null;
  log: LogEntry[];
  options: HandOptions;
}

export interface NewHandParams {
  player: Card[];
  ai: Card[];
  vira: Card;
  mao: Side;
  houseDeck?: Card[];
  options?: HandOptions;
}

export function createHand(p: NewHandParams): TrucoHand {
  const manilha = manilhaFromVira(p.vira.rank);
  const options = p.options ?? {};
  const level = options.startLevel ?? 0;
  const hand: TrucoHand = {
    vira: p.vira,
    manilha,
    houseDeck: p.houseDeck ?? [],
    hands: { player: [...p.player], ai: [...p.ai] },
    dealt: { player: [...p.player], ai: [...p.ai] },
    rounds: [{ leader: p.mao, manilha, vira: p.vira, cards: {} }],
    mao: p.mao,
    turn: p.mao,
    level,
    pending: null,
    lastRaiser: null,
    bets: [],
    phase: 'play',
    result: null,
    log: [],
    options,
  };
  log(hand, 'info', `Vira: ${cardLabel(p.vira)} → manilha é ${RANK_NAME[manilha]}.`);
  return hand;
}

/** Troca as cartas iniciais de um lado (blefe) antes de qualquer carta jogada. */
export function replaceDealt(hand: TrucoHand, side: Side, cards: Card[]): void {
  if (hand.phase === 'done' || hand.rounds.some((r) => r.cards[side])) {
    throw new Error('Não dá para trocar cartas depois de jogar');
  }
  hand.hands[side] = [...cards];
  hand.dealt[side] = [...cards];
}

export function currentRound(hand: TrucoHand): Round {
  return hand.rounds[hand.rounds.length - 1];
}

export function betValue(level: number): number {
  return BET_VALUES[Math.max(0, Math.min(MAX_LEVEL, level))];
}

function log(hand: TrucoHand, kind: LogKind, text: string): void {
  hand.log.push({ kind, text });
}

const sideName = (s: Side) => (s === 'player' ? 'Você' : 'Adversário');

// ---------------------------------------------------------------- consultas

export function canPlay(hand: TrucoHand, side: Side): boolean {
  return hand.phase === 'play' && hand.turn === side;
}

/** Carta virada: só a partir da 2ª rodada, e não na Mão de Ferro (lá tudo já é às cegas). */
export function canPlayHidden(hand: TrucoHand, side: Side): boolean {
  return canPlay(hand, side) && hand.rounds.length > 1 && !hand.options.blindPlay;
}

/** A carta que `side` jogou nesta rodada está virada? */
export function isHidden(round: Round, side: Side): boolean {
  return !!round.hidden?.[side];
}

export function canBet(hand: TrucoHand, side: Side): boolean {
  return (
    hand.phase === 'play' &&
    hand.turn === side &&
    !hand.options.noBets &&
    hand.level < maxLevel(hand) &&
    hand.lastRaiser !== side
  );
}

export function responder(hand: TrucoHand): Side | null {
  return hand.pending ? other(hand.pending.by) : null;
}

export function canRaise(hand: TrucoHand, side: Side): boolean {
  return hand.phase === 'respond' && responder(hand) === side && hand.pending!.level < maxLevel(hand);
}

function maxLevel(hand: TrucoHand): number {
  return Math.min(MAX_LEVEL, hand.options.maxLevel ?? MAX_LEVEL);
}

/** Quem está devendo uma ação agora. */
export function actor(hand: TrucoHand): Side | null {
  if (hand.phase === 'done') return null;
  if (hand.phase === 'respond') return responder(hand);
  return hand.turn;
}

// ---------------------------------------------------------------- regras de rodada/mão

/** Resolve uma rodada. tieWinner transforma canga em vitória de um lado. */
export function roundOutcome(
  a: Card,
  b: Card,
  manilha: Rank,
  tieWinner?: Side,
): RoundOutcome {
  // a = player, b = ai
  const c = compareCards(a, b, manilha);
  if (c > 0) return 'player';
  if (c < 0) return 'ai';
  return tieWinner ?? 'tie';
}

/**
 * Vencedor da mão dado o histórico de rodadas.
 * undefined = ainda indefinido; null = mão nula (tudo empatado).
 */
export function handWinner(outcomes: RoundOutcome[]): Side | null | undefined {
  const [a, b, c] = outcomes;
  if (a === undefined || b === undefined) return undefined;
  if (a === 'tie') {
    if (b !== 'tie') return b;
    if (c === undefined) return undefined;
    return c === 'tie' ? null : c;
  }
  if (b === 'tie') return a;
  if (a === b) return a;
  if (c === undefined) return undefined;
  return c === 'tie' ? a : c;
}

export function outcomes(hand: TrucoHand): RoundOutcome[] {
  return hand.rounds.filter((r) => r.outcome).map((r) => r.outcome!);
}

// ---------------------------------------------------------------- ações

export function playCard(hand: TrucoHand, side: Side, cardId: string, hidden = false): void {
  if (!canPlay(hand, side)) throw new Error(`${side} não pode jogar agora`);
  if (hidden && !canPlayHidden(hand, side)) throw new Error('Carta virada só a partir da 2ª rodada');
  const idx = hand.hands[side].findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error('Carta não está na mão');
  const [card] = hand.hands[side].splice(idx, 1);
  const round = currentRound(hand);
  round.cards[side] = card;
  if (hidden) {
    round.hidden = { ...round.hidden, [side]: true };
    log(hand, 'info', `${sideName(side)} joga uma carta virada.`);
  }

  if (round.cards.player && round.cards.ai) {
    resolveRound(hand);
  } else {
    hand.turn = other(side);
  }
}

function describeWin(winner: Card, loser: Card, manilha: Rank): string {
  const wm = isManilha(winner, manilha);
  const lm = isManilha(loser, manilha);
  if (wm && lm) return `manilha de ${SUIT_NAME[winner.suit]} vence manilha de ${SUIT_NAME[loser.suit]}`;
  if (wm) return `${cardLabel(winner)} é manilha`;
  return `${RANK_NAME[winner.rank]} é mais forte que ${RANK_NAME[loser.rank]}`;
}

function resolveRound(hand: TrucoHand): void {
  const round = currentRound(hand);
  const p = round.cards.player!;
  const a = round.cards.ai!;
  const hp = isHidden(round, 'player');
  const ha = isHidden(round, 'ai');
  const n = hand.rounds.length;
  // carta virada não vale nada: perde para qualquer carta aberta; duas viradas = canga
  const outcome: RoundOutcome =
    hp || ha ? (hp && ha ? (hand.options.tieWinner ?? 'tie') : hp ? 'ai' : 'player') : roundOutcome(p, a, round.manilha, hand.options.tieWinner);
  round.outcome = outcome;
  const realTie = compareCards(p, a, round.manilha) === 0;
  if (hp || ha) {
    const label = (c: Card, h: boolean) => (h ? 'carta virada' : cardLabel(c));
    const how = outcome === 'tie' ? 'duas viradas, canga' : `${sideName(outcome)} vence, carta virada não vale nada`;
    log(hand, 'round', `Rodada ${n}: ${label(p, hp)} × ${label(a, ha)} — ${how}.`);
  } else if (outcome === 'tie') {
    log(hand, 'round', `Rodada ${n}: ${cardLabel(p)} × ${cardLabel(a)} — canga! Mesma força.`);
  } else if (realTie) {
    log(hand, 'round', `Rodada ${n}: ${cardLabel(p)} × ${cardLabel(a)} — canga, mas conta para ${sideName(outcome)}.`);
  } else {
    const [w, l] = outcome === 'player' ? [p, a] : [a, p];
    log(
      hand,
      'round',
      `Rodada ${n}: ${cardLabel(p)} × ${cardLabel(a)} — ${sideName(outcome)} vence (${describeWin(w, l, round.manilha)}).`,
    );
  }

  const winner = handWinner(outcomes(hand));
  if (winner !== undefined) {
    finish(hand, winner, winner === null ? 'null' : 'rounds');
    return;
  }

  const leader = outcome === 'tie' ? round.leader : outcome;
  let vira = round.vira;
  let manilha = round.manilha;
  if (hand.options.rotatingVira && hand.houseDeck.length > 0) {
    vira = hand.houseDeck.pop()!;
    manilha = manilhaFromVira(vira.rank);
    hand.vira = vira;
    hand.manilha = manilha;
    log(hand, 'info', `Nova vira: ${cardLabel(vira)} → manilha agora é ${RANK_NAME[manilha]}.`);
  }
  hand.rounds.push({ leader, manilha, vira, cards: {} });
  hand.turn = leader;
}

function finish(hand: TrucoHand, winner: Side | null, reason: HandResult['reason'], ranAway?: Side): void {
  const points = winner ? betValue(hand.level) : 0;
  hand.result = { winner, points, reason, ranAway };
  hand.phase = 'done';
  hand.pending = null;
  if (winner === null) log(hand, 'result', 'Tudo empatado: mão nula, ninguém pontua.');
  else if (reason === 'run') log(hand, 'result', `${sideName(ranAway!)} correu. ${sideName(winner)} leva ${points} ponto(s).`);
  else log(hand, 'result', `${sideName(winner)} vence a mão valendo ${points} ponto(s).`);
}

/** Pede aposta (truco/seis/nove/doze) na própria vez. */
export function bet(hand: TrucoHand, side: Side): void {
  if (!canBet(hand, side)) throw new Error(`${side} não pode apostar agora`);
  const level = hand.level + 1;
  hand.pending = { by: side, level };
  hand.phase = 'respond';
  hand.bets.push({ by: side, level });
  log(hand, 'bet', `${sideName(side)} pede ${BET_NAMES[level].toUpperCase()}!`);
}

export function respond(hand: TrucoHand, side: Side, response: BetResponse): void {
  if (hand.phase !== 'respond' || responder(hand) !== side) throw new Error(`${side} não pode responder agora`);
  const pending = hand.pending!;
  const lastBet = hand.bets[hand.bets.length - 1];
  lastBet.response = response;

  if (response === 'run') {
    log(hand, 'bet', `${sideName(side)} corre do ${BET_NAMES[pending.level]}.`);
    finish(hand, pending.by, 'run', side);
    return;
  }
  if (response === 'accept') {
    hand.level = pending.level;
    hand.lastRaiser = pending.by;
    hand.pending = null;
    hand.phase = 'play';
    log(hand, 'bet', `${sideName(side)} aceita. Mão valendo ${betValue(hand.level)}.`);
    return;
  }
  // raise: aceita o atual e propõe o próximo
  if (pending.level >= maxLevel(hand)) throw new Error('Não dá para aumentar mais');
  hand.level = pending.level;
  hand.lastRaiser = pending.by;
  const level = pending.level + 1;
  hand.pending = { by: side, level };
  hand.bets.push({ by: side, level });
  log(hand, 'bet', `${sideName(side)} aumenta: ${BET_NAMES[level].toUpperCase()}!`);
}

/** Desistir da mão sem aposta pendente (ex.: correr da Mão de Onze). */
export function fold(hand: TrucoHand, side: Side): void {
  if (hand.phase === 'done') return;
  hand.pending = null;
  log(hand, 'bet', `${sideName(side)} desiste da mão.`);
  finish(hand, other(side), 'run', side);
}

// ---------------------------------------------------------------- utilidades

/** Todas as cartas visíveis para `side` (as próprias, a(s) vira(s) e as jogadas). */
export function knownCards(hand: TrucoHand, side: Side): Card[] {
  const seen: Card[] = [...hand.hands[side]];
  const viras = new Set<Card>();
  for (const r of hand.rounds) {
    viras.add(r.vira);
    // carta virada do outro lado continua desconhecida; a própria, cada um sabe qual é
    for (const s of ['player', 'ai'] as const) {
      const c = r.cards[s];
      if (c && (s === side || !isHidden(r, s))) seen.push(c);
    }
  }
  return [...seen, ...viras];
}

/** Rodadas vencidas por um lado, com a carta vencedora e a manilha da rodada. */
export function roundsWonBy(hand: TrucoHand, side: Side): { card: Card; manilha: Rank; index: number }[] {
  const out: { card: Card; manilha: Rank; index: number }[] = [];
  hand.rounds.forEach((r, index) => {
    if (r.outcome === side && r.cards[side]) out.push({ card: r.cards[side]!, manilha: r.manilha, index });
  });
  return out;
}
