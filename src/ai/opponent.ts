// IA do adversário: heurísticas + Monte Carlo sobre o que ela já viu.
// Nunca olha hand.hands.player: só usa knownCards via sim.equity.

import { next, type Rng } from '../engine/rng';
import { canBet, canRaise, type BetResponse, type Side, type TrucoHand } from '../engine/truco';
import { equity } from './sim';

export type PersonalityId = 'agressivo' | 'medroso' | 'blefador' | 'calculista' | 'equilibrado';

export interface Personality {
  id: PersonalityId;
  name: string;
  description: string;
  /** 0..1: vontade de apostar e aumentar. */
  aggression: number;
  /** 0..1: chance de blefar com mão fraca. */
  bluff: number;
  /** 0..1: exigência para aceitar apostas. */
  caution: number;
}

export const PERSONALITIES: Record<PersonalityId, Personality> = {
  agressivo: { id: 'agressivo', name: 'Agressivo', description: 'Truca muito e raramente corre.', aggression: 0.85, bluff: 0.3, caution: 0.15 },
  medroso: { id: 'medroso', name: 'Medroso', description: 'Só truca com mão boa e corre fácil.', aggression: 0.15, bluff: 0.05, caution: 0.85 },
  blefador: { id: 'blefador', name: 'Blefador', description: 'Truca com qualquer coisa. Desconfie.', aggression: 0.6, bluff: 0.75, caution: 0.35 },
  calculista: { id: 'calculista', name: 'Calculista', description: 'Conta as cartas e joga na probabilidade.', aggression: 0.45, bluff: 0.12, caution: 0.5 },
  equilibrado: { id: 'equilibrado', name: 'Equilibrado', description: 'Joga o feijão com arroz.', aggression: 0.5, bluff: 0.2, caution: 0.5 },
};

export type AiAction =
  | { type: 'play'; cardId: string }
  | { type: 'bet' }
  | { type: 'respond'; response: BetResponse };

export interface AiOverrides {
  /** O Corredor: corre de qualquer aposta. */
  alwaysRun?: boolean;
}

export interface AiDecision {
  action: AiAction;
  /** Explicação curta para o log ("acha que tem 72% de chance"). */
  reason: string;
  equity: number;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Melhor carta para jogar agora e a equidade correspondente. */
export function bestPlay(hand: TrucoHand, side: Side, rng: Rng, samples = 80): { index: number; equity: number } {
  let best = { index: 0, equity: -1 };
  const n = hand.hands[side].length;
  for (let i = 0; i < n; i++) {
    const e = equity(hand, side, rng, samples, i);
    // desempate: prefere a carta mais fraca (guarda as fortes)
    if (e > best.equity + 0.015) best = { index: i, equity: e };
  }
  return best;
}

function handEquity(hand: TrucoHand, side: Side, rng: Rng): number {
  if (hand.turn === side && hand.phase !== 'done') {
    const round = hand.rounds[hand.rounds.length - 1];
    if (!round.cards[side]) return bestPlay(hand, side, rng, 60).equity;
  }
  return equity(hand, side, rng, 120);
}

/** Decide a ação da IA quando actor(hand) === side. */
export function decide(
  hand: TrucoHand,
  side: Side,
  p: Personality,
  rng: Rng,
  overrides: AiOverrides = {},
): AiDecision {
  if (hand.phase === 'respond') {
    const level = hand.pending!.level;
    if (overrides.alwaysRun) {
      return { action: { type: 'respond', response: 'run' }, reason: 'Corre de qualquer aposta.', equity: 0 };
    }
    let eq = handEquity(hand, side, rng);
    // aposta do oponente é informação: respeita um pouco (menos se o oponente blefa muito... não sabemos)
    const respect = 0.06 + p.caution * 0.06;
    const adj = eq - respect;
    const acceptAt = 0.36 + p.caution * 0.2 - p.aggression * 0.12 + level * 0.025;
    const raiseAt = 0.8 - p.aggression * 0.15;
    if (canRaise(hand, side) && (adj > raiseAt || (adj > acceptAt && next(rng) < p.bluff * 0.15))) {
      return { action: { type: 'respond', response: 'raise' }, reason: `Acha que tem ${pct(eq)} de chance: aumenta.`, equity: eq };
    }
    if (adj >= acceptAt || (next(rng) < p.aggression * 0.12)) {
      return { action: { type: 'respond', response: 'accept' }, reason: `Acha que tem ${pct(eq)} de chance: aceita.`, equity: eq };
    }
    eq = Math.max(0, eq);
    return { action: { type: 'respond', response: 'run' }, reason: `Só ${pct(eq)} de chance: corre.`, equity: eq };
  }

  // fase de jogo
  const play = bestPlay(hand, side, rng);
  if (canBet(hand, side)) {
    const eq = play.equity;
    const level = hand.level + 1;
    const betAt = 0.7 - p.aggression * 0.22 + p.caution * 0.08 + (level - 1) * 0.04;
    const bluffing = eq < 0.4 && next(rng) < p.bluff * 0.25;
    if (eq >= betAt || bluffing) {
      return {
        action: { type: 'bet' },
        reason: bluffing ? 'Blefando!' : `Confiante (${pct(eq)}): aposta.`,
        equity: eq,
      };
    }
  }
  const card = hand.hands[side][play.index];
  return { action: { type: 'play', cardId: card.id }, reason: `Joga a carta com ${pct(play.equity)} de chance.`, equity: play.equity };
}
