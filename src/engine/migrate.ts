// Runs salvas com Coringas que saíram do jogo: cada um é trocado pelo correlato, mantendo o
// estado (fichas, Mult e ×) e a edição. Coringas sem correlato são retirados.

import { JOKER_BY_ID } from '../data/jokers';
import type { PackOption, RunState, ShopItem } from './state';

export const REMOVED_JOKER_REPLACEMENTS: Record<string, string> = {
  caderneta: 'coxinha', // +$3 ao vencer Blind
  bolinho: 'torresmo', // Fichas que caem 5 por mão
  oculosNeon: 'passista', // +10 Mult por rodada com manilha
  pochete: 'bicheiro', // +1 Mult a cada $3
  globoEspelhado: 'mapinguari', // ×0.25 por canga
};

function replacementFor(id: string): string | null {
  if (JOKER_BY_ID[id]) return id;
  const alt = REMOVED_JOKER_REPLACEMENTS[id];
  return alt && JOKER_BY_ID[alt] ? alt : null;
}

/** Atualiza, no lugar, os Coringas de uma run salva. Devolve a própria run. */
export function migrateRemovedJokers(run: RunState): RunState {
  run.jokers = run.jokers.flatMap((j) => {
    const id = replacementFor(j.id);
    if (!id) return [];
    j.id = id;
    return [j];
  });
  if (run.shop) {
    run.shop.items = run.shop.items.flatMap((it): ShopItem[] => {
      if (it.kind !== 'joker') return [it];
      const id = replacementFor(it.id);
      return id ? [{ ...it, id }] : [];
    });
  }
  if (run.pack) {
    run.pack.options = run.pack.options.flatMap((opt): PackOption[] => {
      if (opt.kind !== 'joker') return [opt];
      const id = replacementFor(opt.id);
      return id ? [{ ...opt, id }] : [];
    });
  }
  return run;
}
