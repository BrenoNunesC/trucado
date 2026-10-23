import { describe, expect, it } from 'vitest';
import { addJoker, randomJokerId } from '../src/engine/inventory';
import { newRun } from '../src/engine/run';

describe('Showman', () => {
  it('sem o Showman, um Coringa que já está na mesa não se repete no sorteio', () => {
    const run = newRun({ seed: 'SHOW1', deckId: 'classico', stake: 1 });
    addJoker(run, 'pinguco');
    for (let i = 0; i < 300; i++) expect(randomJokerId(run, 'comum')).not.toBe('pinguco');
  });

  it('com o Showman, Coringas repetidos aparecem no sorteio', () => {
    const run = newRun({ seed: 'SHOW2', deckId: 'classico', stake: 1 });
    addJoker(run, 'showman');
    addJoker(run, 'pinguco');
    const ids = Array.from({ length: 300 }, () => randomJokerId(run, 'comum'));
    expect(ids).toContain('pinguco');
  });
});
