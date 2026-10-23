import { describe, expect, it } from 'vitest';
import { makeCard, type Rank, type Suit } from '../src/engine/cards';
import { addJoker } from '../src/engine/inventory';
import { selectBlind, newRun } from '../src/engine/run';
import { scoreHand } from '../src/engine/scoring';
import type { RunState } from '../src/engine/state';
import { createHand, playCard, type TrucoHand } from '../src/engine/truco';

type F = [Rank, Suit];
const card = ([r, s]: F) => makeCard(r, s);

function setup(jokers: string[]): RunState {
  const run = newRun({ seed: 'BALATRO', deckId: 'classico', stake: 1 });
  for (const id of jokers) addJoker(run, id);
  selectBlind(run);
  return run;
}

function fechou(run: RunState): TrucoHand {
  const hand = createHand({
    player: [card(['3', 'ouros']), card(['2', 'ouros']), card(['4', 'ouros'])],
    ai: [card(['5', 'ouros']), card(['6', 'ouros']), card(['7', 'ouros'])],
    vira: card(['Q', 'copas']),
    mao: 'player',
  });
  run.blind!.hand = hand;
  run.blind!.stage = 'playing';
  for (let r = 0; r < 2; r++) {
    playCard(hand, 'player', hand.hands.player[0].id);
    playCard(hand, 'ai', hand.hands.ai[0].id);
  }
  return hand;
}

describe('Coringas inspirados no Balatro', () => {
  it('Mesa Mística: +15 Mult quando não sobra blefe no Blind', () => {
    const run = setup(['mesaMistica']);
    run.blind!.bluffsLeft = 0;
    const hand = fechou(run);
    const s = scoreHand(run, run.blind!, hand);
    expect(s.steps.some((st) => st.label === 'Mesa Mística' && st.mult === 15)).toBe(true);
  });

  it('Gabarito: ×1.25 por vaga livre (5 vagas, 1 Coringa = ×1.25⁴)', () => {
    const run = setup(['gabarito']);
    const hand = fechou(run);
    const s = scoreHand(run, run.blind!, hand);
    const step = s.steps.find((st) => st.label === 'Gabarito');
    expect(step?.xmult).toBeCloseTo(Math.pow(1.25, 4), 6);
  });
});
