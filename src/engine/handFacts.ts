// Fatos sobre uma mão terminada, usados pelas Jogadas e pelos Coringas.

import { isZap, type Card, type Rank } from './cards';
import { isHidden, roundsWonBy, type TrucoHand } from './truco';
import type { CategoryId } from './state';
import { CATEGORIES } from '../data/categories';

/** Manilha que valia para a carta: a da rodada em que foi jogada, ou a atual. */
export function manilhaFor(hand: TrucoHand, card: Card): Rank {
  for (const r of hand.rounds) {
    if (r.cards.player?.id === card.id || r.cards.ai?.id === card.id) return r.manilha;
  }
  return hand.manilha;
}

export function cardIsManilha(hand: TrucoHand, card: Card): boolean {
  return card.rank === manilhaFor(hand, card);
}

export function ties(hand: TrucoHand): number {
  return hand.rounds.filter((r) => r.outcome === 'tie').length;
}

export function manilhasPlayed(hand: TrucoHand): number {
  let n = 0;
  for (const r of hand.rounds) {
    // carta virada não aparece na mesa, então não conta
    for (const s of ['player', 'ai'] as const) {
      const c = r.cards[s];
      if (c && !isHidden(r, s) && c.rank === r.manilha) n++;
    }
  }
  return n;
}

export function isFechou(hand: TrucoHand): boolean {
  return hand.rounds[0]?.outcome === 'player' && hand.rounds[1]?.outcome === 'player';
}

export function isVirada(hand: TrucoHand): boolean {
  return hand.result?.winner === 'player' && hand.rounds[0]?.outcome === 'ai';
}

export function isPeDeMesa(hand: TrucoHand): boolean {
  return hand.result?.winner === 'player' && hand.rounds.length === 3 && hand.rounds[2].outcome === 'player';
}

export function aiRan(hand: TrucoHand): boolean {
  return hand.result?.reason === 'run' && hand.result.ranAway === 'ai';
}

/** Jogada de maior prioridade para uma mão vencida pelo jogador. */
export function detectCategory(hand: TrucoHand): CategoryId {
  const dealt = hand.dealt.player;
  const manilhas = dealt.filter((c) => cardIsManilha(hand, c));
  const won = roundsWonBy(hand, 'player');
  const hasZap = manilhas.some((c) => c.suit === 'paus');
  const hasCopas = manilhas.some((c) => c.suit === 'copas');
  const rankCounts = new Map<string, number>();
  for (const c of dealt) rankCounts.set(c.rank, (rankCounts.get(c.rank) ?? 0) + 1);

  const checks: Record<CategoryId, () => boolean> = {
    tresManilhas: () => dealt.length >= 3 && manilhas.length >= 3,
    casalMaior: () => hasZap && hasCopas,
    trinca: () => [...rankCounts.values()].some((n) => n >= 3),
    casalManilhas: () => manilhas.length >= 2,
    zap: () => won.some((w) => isZap(w.card, w.manilha)),
    cangaVencida: () => hand.result?.reason === 'rounds' && ties(hand) > 0,
    virada: () => isVirada(hand),
    peDeMesa: () => isPeDeMesa(hand),
    fechou: () => isFechou(hand),
    arregou: () => aiRan(hand),
    naRaca: () => true,
  };
  for (const cat of CATEGORIES) if (checks[cat.id]()) return cat.id;
  return 'naRaca';
}

/** Quantas cartas da mão recebida repetem valor com outra (par = 2, trinca = 3). */
export function repeatedCards(cards: Card[]): number {
  const counts = new Map<string, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  let n = 0;
  for (const v of counts.values()) if (v >= 2) n += v;
  return n;
}
