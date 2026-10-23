import { describe, expect, it } from 'vitest';
import { JOKERS } from '../src/data/jokers';
import { JOKER_UNLOCKS, isJokerLocked, lockedJokerIds, newJokerUnlocks } from '../src/data/unlocks';
import { randomJokerId } from '../src/engine/inventory';
import { newRun } from '../src/engine/run';
import type { RunStats } from '../src/engine/state';

const perfilNovo = { stakesWon: {} };
const statsZerados = (over: Partial<RunStats> = {}): RunStats => ({
  handsPlayed: 0, handsWon: 0, bestHand: 0, betsCalled: 0, betsWon: 0, moneyEarned: 0, jokersSold: 0,
  blindsDefeated: 0, bossesDefeated: 0, ties: 0, fechou: 0, cardsDestroyed: 0, rerolls: 0, ...over,
});

describe('Coringas trancados', () => {
  it('toda condição aponta para um Coringa que existe', () => {
    for (const id of Object.keys(JOKER_UNLOCKS)) expect(JOKERS.some((j) => j.id === id)).toBe(true);
  });

  it('começa tudo trancado num perfil novo, e o administrador destranca tudo', () => {
    expect(lockedJokerIds(perfilNovo)).toEqual(Object.keys(JOKER_UNLOCKS));
    expect(lockedJokerIds({ ...perfilNovo, admin: true })).toEqual([]);
  });

  it('a condição de venda destrava o Ovo de Páscoa só depois de cumprida', () => {
    expect(newJokerUnlocks(perfilNovo, statsZerados({ jokersSold: 2 }))).not.toContain('ovoDePascoa');
    expect(newJokerUnlocks(perfilNovo, statsZerados({ jokersSold: 3 }))).toContain('ovoDePascoa');
    expect(isJokerLocked('ovoDePascoa', { ...perfilNovo, unlockedJokers: ['ovoDePascoa'] })).toBe(false);
  });

  it('a run nunca sorteia um Coringa trancado', () => {
    const run = newRun({ seed: 'TRANCADOS', deckId: 'vermelho', stake: 1, lockedJokers: Object.keys(JOKER_UNLOCKS) });
    for (let i = 0; i < 300; i++) {
      expect(JOKER_UNLOCKS[randomJokerId(run, 'comum')]).toBeUndefined();
      expect(JOKER_UNLOCKS[randomJokerId(run, 'lendario')]).toBeUndefined();
    }
  });
});
