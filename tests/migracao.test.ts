import { describe, expect, it } from 'vitest';
import { migrateRemovedJokers } from '../src/engine/migrate';
import { newRun } from '../src/engine/run';
import type { JokerInstance } from '../src/engine/state';

const inst = (id: string, state: Record<string, number> = {}): JokerInstance => ({ uid: `u-${id}`, id, state, cost: 4 });

describe('Runs salvas com Coringas removidos', () => {
  it('troca pelo correlato e mantém fichas, Mult e × do estado', () => {
    const run = newRun({ seed: 'MIGRA', deckId: 'vermelho', stake: 1 });
    run.jokers = [inst('bolinho', { chips: 35 }), inst('globoEspelhado', { x: 1.75 }), inst('caderneta'), inst('pochete')];
    migrateRemovedJokers(run);
    expect(run.jokers.map((j) => j.id)).toEqual(['torresmo', 'mapinguari', 'coxinha', 'bicheiro']);
    expect(run.jokers[0].state.chips).toBe(35);
    expect(run.jokers[1].state.x).toBe(1.75);
    expect(run.jokers[0].uid).toBe('u-bolinho');
  });

  it('retira Coringas que não existem e não tem correlato', () => {
    const run = newRun({ seed: 'MIGRA2', deckId: 'vermelho', stake: 1 });
    run.jokers = [inst('fantasma'), inst('passista')];
    migrateRemovedJokers(run);
    expect(run.jokers.map((j) => j.id)).toEqual(['passista']);
  });
});
