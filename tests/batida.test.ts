import { describe, expect, it } from 'vitest';
import { makeCard, type Rank, type Suit } from '../src/engine/cards';
import { selectBlind, newRun } from '../src/engine/run';
import { scoreHand } from '../src/engine/scoring';
import { createHand, playCard } from '../src/engine/truco';
import { CARD_THEMES } from '../src/data/cardThemes';
import { DECK_BY_ID } from '../src/data/decks';

type F = [Rank, Suit];
const card = ([r, s]: F) => makeCard(r, s);

describe('Baralho Batida', () => {
  it('ao pontuar, Fichas e Mult viram a média dos dois', () => {
    const run = newRun({ seed: 'BATIDA', deckId: 'batida', stake: 1 });
    selectBlind(run);
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
    const s = scoreHand(run, run.blind!, hand);
    expect(s.chips).toBeCloseTo(s.mult, 6);
    expect(s.total).toBeCloseTo(Math.floor(s.chips * s.mult), 6);
    expect(s.total).toBe(441); // (40 + 2) / 2 = 21 de cada → 21 × 21
  });

  it('dobra as metas, como o original', () => {
    expect(DECK_BY_ID.batida.targetFactor).toBe(2);
  });

  it('temas visuais: o padrão existe e os ids são únicos', () => {
    const ids = CARD_THEMES.map((t) => t.id);
    expect(ids).toContain('classico');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
