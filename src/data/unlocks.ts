// Coringas trancados: entram no jogo (lojas, pacotes, Coleção) só quando a condição é cumprida,
// como no Balatro. As condições olham o perfil (progresso entre runs) ou as estatísticas da run
// em andamento. Coringas que não aparecem aqui estão sempre liberados.

import type { RunStats } from '../engine/state';

/** O que a condição olha: o perfil, com o progresso de fichas e o que já foi destravado. */
export interface UnlockProgress {
  stakesWon: Record<string, number>;
  unlockedJokers?: string[];
  admin?: boolean;
}

export interface JokerUnlock {
  /** Texto mostrado na Coleção, em cima do Coringa trancado. */
  text: string;
  check: (p: UnlockProgress, st: RunStats) => boolean;
}

export const JOKER_UNLOCKS: Record<string, JokerUnlock> = {
  ovoDePascoa: {
    text: 'Venda 3 Coringas numa mesma run.',
    check: (_p, st) => st.jokersSold >= 3,
  },
  supernova: {
    text: 'Jogue 10 mãos numa mesma run.',
    check: (_p, st) => st.handsPlayed >= 10,
  },
  tioMichel: {
    text: 'Derrote 3 Blinds chefe numa mesma run.',
    check: (_p, st) => st.bossesDefeated >= 3,
  },
  fiado: {
    text: 'Ganhe $100 numa mesma run.',
    check: (_p, st) => st.moneyEarned >= 100,
  },
  mesaMistica: {
    text: 'Ganhe 10 apostas numa mesma run.',
    check: (_p, st) => st.betsWon >= 10,
  },
  gabarito: {
    text: 'Destrua 10 cartas numa mesma run.',
    check: (_p, st) => st.cardsDestroyed >= 10,
  },
  naipeDaVez: {
    text: 'Vença 20 mãos numa mesma run.',
    check: (_p, st) => st.handsWon >= 20,
  },
  fotografo: {
    text: 'Faça uma mão de 1.000 pontos.',
    check: (_p, st) => st.bestHand >= 1000,
  },
  padreCicero: {
    text: 'Vença uma run na Ficha Verde ou acima.',
    check: (p) => Object.values(p.stakesWon).some((s) => s >= 3),
  },
};

/** Trancado = tem condição, ainda não foi destravado e o modo administrador não está ligado. */
export function isJokerLocked(id: string, p: UnlockProgress): boolean {
  return !!JOKER_UNLOCKS[id] && !p.admin && !(p.unlockedJokers ?? []).includes(id);
}

/** Ids trancados agora: é o que a próxima run deve deixar de fora. */
export function lockedJokerIds(p: UnlockProgress): string[] {
  return Object.keys(JOKER_UNLOCKS).filter((id) => isJokerLocked(id, p));
}

/** Condições cumpridas agora que ainda não tinham destravado o Coringa. */
export function newJokerUnlocks(p: UnlockProgress, st: RunStats): string[] {
  return Object.keys(JOKER_UNLOCKS).filter((id) => !(p.unlockedJokers ?? []).includes(id) && JOKER_UNLOCKS[id].check(p, st));
}
