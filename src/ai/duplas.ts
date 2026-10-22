// IA do truco em duplas. Só usa o que um jogador de verdade sabe: as próprias cartas, as que já
// estão na mesa e a vira (as do parceiro só na Mão de Onze, que a regra deixa ver). Joga em
// dupla: se o parceiro já está levando a rodada, descarta a menor; se o adversário está na
// frente, tenta passar com a carta mais barata que resolve.

import { PERSONALITIES, type Personality, type PersonalityId } from './opponent';
import { strength, type Card, type Rank } from '../engine/cards';
import { dActor, dCanBet, dCanRaise, currentDRound, partnerOf, teamOf, type DHand, type DuplasAction, type DuplasMatch, type SeatNo } from '../engine/duplas';
import { int, type Rng } from '../engine/rng';

/** Valor de 0 a ~1,2 de uma carta para a mão (manilha vale mais que tudo). */
function value(c: Card, manilha: Rank): number {
  const s = strength(c, manilha);
  return s >= 100 ? 1 + (s - 100) * 0.06 : (s / 9) * 0.72;
}

/** Quanto a mão de `cards` promete, contando as rodadas que a dupla já fez ou perdeu. */
function handScore(h: DHand, s: SeatNo, cards: Card[]): number {
  const mine = teamOf(s);
  let score = cards.reduce((a, c) => a + value(c, h.manilha), 0);
  for (const r of h.rounds) {
    if (r.outcome === undefined || r.outcome === 'tie') continue;
    score += r.outcome === mine ? 0.55 : -0.55;
  }
  return score;
}

const rand = (rng: Rng, spread: number) => (int(rng, 1000) / 1000 - 0.5) * 2 * spread;

export function decideDuplas(m: DuplasMatch, s: SeatNo, rng: Rng, personality: PersonalityId = 'equilibrado'): DuplasAction | null {
  const p = PERSONALITIES[personality];
  if (m.stage === 'onze') return m.onzeDecider === s ? decideOnze(m.hand, s, rng, p) : null;
  if (m.stage !== 'playing') return null;
  return decideDHand(m.hand, s, rng, p);
}

/** Mão de Onze: decide olhando as próprias cartas e as do parceiro (a regra deixa ver). */
export function decideOnze(h: DHand, s: SeatNo, rng: Rng, p: Personality): DuplasAction {
  const both = [...h.hands[s], ...h.hands[partnerOf(s)]];
  const avg = both.reduce((a, c) => a + value(c, h.manilha), 0) / Math.max(1, both.length);
  return { t: 'onze', play: avg + rand(rng, 0.08) > 0.42 + p.caution * 0.08 - p.aggression * 0.08 };
}

export interface DecideOpts {
  /** Sempre corre de aposta (chefe O Corredor). */
  alwaysRun?: boolean;
}

/** A jogada de `s` numa mão em duplas, com uma personalidade já ajustada (stake, chefe). */
export function decideDHand(h: DHand, s: SeatNo, rng: Rng, p: Personality, opts: DecideOpts = {}): DuplasAction | null {
  if (dActor(h) !== s) return null;
  const mine = h.hands[s];
  const score = handScore(h, s, mine) + rand(rng, 0.25);

  // responder a uma aposta
  if (h.phase === 'respond') {
    if (opts.alwaysRun) return { t: 'respond', r: 'run' };
    const need = 0.85 + h.pending!.level * 0.12 + p.caution * 0.25 - p.aggression * 0.2;
    if (dCanRaise(h, s) && score > need + 0.9) return { t: 'respond', r: 'raise' };
    // o blefe também existe: às vezes aceita no peito
    if (score > need || int(rng, 100) < p.bluff * 8) return { t: 'respond', r: 'accept' };
    return { t: 'respond', r: 'run' };
  }

  // pedir truco antes de jogar
  if (dCanBet(h, s)) {
    const want = 1.55 + h.level * 0.3 + p.caution * 0.3 - p.aggression * 0.35;
    if (score > want || int(rng, 100) < p.bluff * 4) return { t: 'bet' };
  }

  // jogar a carta
  const r = currentDRound(h);
  const sorted = [...mine].sort((a, b) => strength(a, h.manilha) - strength(b, h.manilha));
  const lowest = sorted[0];
  let bestSeat: SeatNo | null = null;
  for (const seat of r.order) {
    if (r.hidden[seat]) continue;
    if (bestSeat === null || strength(r.cards[seat]!, h.manilha) > strength(r.cards[bestSeat]!, h.manilha)) bestSeat = seat;
  }

  if (bestSeat === null) {
    // abrindo a rodada: na 1ª guarda a mais forte; depois, vai com tudo
    const pick = h.rounds.length === 1 && sorted.length === 3 ? sorted[1] : sorted[sorted.length - 1];
    return { t: 'play', cardId: pick.id };
  }
  const bestCard = r.cards[bestSeat]!;
  if (teamOf(bestSeat) === teamOf(s)) {
    // o parceiro está levando: se ainda falta adversário jogar e a carta dele é fraca, reforça
    const oppsLeft = 4 - r.order.length > 1;
    if (oppsLeft && strength(bestCard, h.manilha) < 7) {
      const better = sorted.find((c) => strength(c, h.manilha) > strength(bestCard, h.manilha) && strength(c, h.manilha) >= 7);
      if (better) return { t: 'play', cardId: better.id };
    }
    return { t: 'play', cardId: lowest.id };
  }
  const beat = sorted.find((c) => strength(c, h.manilha) > strength(bestCard, h.manilha));
  return { t: 'play', cardId: (beat ?? lowest).id };
}
