// Registro automático: todo arquivo desta pasta que exporte por padrão um Coringa
// (ou uma lista deles) entra no jogo. Não é preciso editar este arquivo.

import type { JokerDef } from '../../engine/jokerApi';
import type { Rarity } from '../../engine/state';

const modules = import.meta.glob<{ default: JokerDef | JokerDef[] }>(['./*.ts', '!./index.ts'], { eager: true });

export const JOKERS: JokerDef[] = Object.keys(modules)
  .sort()
  .flatMap((path) => {
    const d = modules[path].default;
    return Array.isArray(d) ? d : [d];
  });

export const JOKER_BY_ID: Record<string, JokerDef> = {};
for (const j of JOKERS) {
  if (JOKER_BY_ID[j.id]) throw new Error(`Coringa duplicado: ${j.id}`);
  JOKER_BY_ID[j.id] = j;
}

export function jokersOfRarity(r: Rarity): JokerDef[] {
  return JOKERS.filter((j) => j.rarity === r);
}

export const RARITY_NAME: Record<Rarity, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  lendario: 'Lendário',
};
