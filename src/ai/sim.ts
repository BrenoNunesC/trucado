// Simulação rápida do resto de uma mão, usada pela IA para estimar equidade.
// Trabalha só com faces (valor + naipe): nunca recebe as cartas reais do oponente.

import { compareCards, RANKS, SUITS, type Rank, type Suit } from '../engine/cards';
import { handWinner, knownCards, other, type RoundOutcome, type Side, type TrucoHand } from '../engine/truco';
import { int, type Rng } from '../engine/rng';

export interface Face {
  rank: Rank;
  suit: Suit;
}

export interface SimState {
  manilha: Rank;
  outcomes: RoundOutcome[];
  leader: Side;
  current: Partial<Record<Side, Face>>;
  /** Cartas da rodada atual jogadas viradas (não valem nada). */
  hidden?: Partial<Record<Side, boolean>>;
  cards: Record<Side, Face[]>;
  tieWinner?: Side;
}

const STANDARD_FACES: Face[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));

/** Faces que `me` ainda não viu, modelando o oponente com um baralho padrão. */
export function unknownPool(hand: TrucoHand, me: Side): Face[] {
  const pool = [...STANDARD_FACES];
  for (const k of knownCards(hand, me)) {
    const i = pool.findIndex((f) => f.rank === k.rank && f.suit === k.suit);
    if (i >= 0) pool.splice(i, 1);
  }
  return pool;
}

export function sample(rng: Rng, pool: Face[], n: number): Face[] {
  const copy = [...pool];
  const out: Face[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) out.push(copy.splice(int(rng, copy.length), 1)[0]);
  return out;
}

function outcomeOf(p: Face, a: Face, manilha: Rank, tieWinner?: Side): RoundOutcome {
  const c = compareCards(p, a, manilha);
  if (c > 0) return 'player';
  if (c < 0) return 'ai';
  return tieWinner ?? 'tie';
}

/** Canga nesta rodada garantiria a mão para `side`? */
function tieIsGood(outcomes: RoundOutcome[], side: Side): boolean {
  return handWinner([...outcomes, 'tie']) === side;
}

/** Política simples e razoável usada nos dois lados da simulação. */
export function policy(
  cards: Face[],
  opp: Face | undefined,
  outcomes: RoundOutcome[],
  side: Side,
  manilha: Rank,
): number {
  const sorted = cards.map((f, i) => ({ f, i })).sort((x, y) => compareCards(x.f, y.f, manilha));
  if (opp) {
    const beat = sorted.find((x) => compareCards(x.f, opp, manilha) > 0);
    if (beat) return beat.i;
    if (tieIsGood(outcomes, side)) {
      const tie = sorted.find((x) => compareCards(x.f, opp, manilha) === 0);
      if (tie) return tie.i;
    }
    return sorted[0].i;
  }
  // abrindo: na 1ª rodada com 3 cartas, abre com a do meio se a maior for muito forte
  if (outcomes.length === 0 && sorted.length === 3) {
    const top = sorted[2].f;
    if (compareCards(top, { rank: '3', suit: 'paus' }, manilha) > 0) return sorted[1].i;
  }
  return sorted[sorted.length - 1].i;
}

function weakest(cards: Face[], manilha: Rank): number {
  let best = 0;
  for (let i = 1; i < cards.length; i++) if (compareCards(cards[i], cards[best], manilha) < 0) best = i;
  return best;
}

/** Joga até o fim. Retorna 1 se `me` vence, 0 se perde, 0.5 se nula. */
export function rollout(s: SimState, me: Side): number {
  const cards = { player: [...s.cards.player], ai: [...s.cards.ai] };
  const outcomes = [...s.outcomes];
  let leader = s.leader;
  let current: Partial<Record<Side, Face>> = { ...s.current };
  let hidden: Partial<Record<Side, boolean>> = { ...s.hidden };
  for (let guard = 0; guard < 4; guard++) {
    const w = handWinner(outcomes);
    if (w !== undefined) return w === null ? 0.5 : w === me ? 1 : 0;
    for (const side of [leader, other(leader)]) {
      if (current[side]) continue;
      if (cards[side].length === 0) return 0.5;
      // carta virada do outro lado não ameaça nada: responde com a mais fraca
      const opp = hidden[other(side)] ? undefined : current[other(side)];
      const i = hidden[other(side)] ? weakest(cards[side], s.manilha) : policy(cards[side], opp, outcomes, side, s.manilha);
      current[side] = cards[side].splice(i, 1)[0];
    }
    const o =
      hidden.player || hidden.ai
        ? hidden.player && hidden.ai
          ? (s.tieWinner ?? 'tie')
          : hidden.player
            ? 'ai'
            : 'player'
        : outcomeOf(current.player!, current.ai!, s.manilha, s.tieWinner);
    outcomes.push(o);
    leader = o === 'tie' ? leader : o;
    current = {};
    hidden = {};
  }
  const w = handWinner(outcomes);
  return w === undefined || w === null ? 0.5 : w === me ? 1 : 0;
}

export function stateFromHand(hand: TrucoHand): Omit<SimState, 'cards'> {
  const round = hand.rounds[hand.rounds.length - 1];
  return {
    manilha: round.manilha,
    outcomes: hand.rounds.filter((r) => r.outcome).map((r) => r.outcome!),
    leader: round.leader,
    current: { ...round.cards },
    hidden: { ...round.hidden },
    tieWinner: hand.options.tieWinner,
  };
}

/**
 * Equidade de `me` na mão. Se `playCardIndex` for dado, assume que `me` joga essa
 * carta agora. Cartas do oponente são amostradas do que `me` não viu.
 */
export function equity(hand: TrucoHand, me: Side, rng: Rng, samples = 100, playCardIndex?: number): number {
  const opp = other(me);
  const pool = unknownPool(hand, me);
  const base = stateFromHand(hand);
  const mine: Face[] = hand.hands[me].map((c) => ({ rank: c.rank, suit: c.suit }));
  const current = { ...base.current };
  if (playCardIndex !== undefined) current[me] = mine.splice(playCardIndex, 1)[0];
  const oppCount = hand.hands[opp].length;
  let total = 0;
  for (let i = 0; i < samples; i++) {
    const theirs = sample(rng, pool, oppCount);
    const cards = me === 'player' ? { player: mine, ai: theirs } : { player: theirs, ai: mine };
    total += rollout({ ...base, current, cards }, me);
  }
  return total / samples;
}
