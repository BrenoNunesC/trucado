// Números de balanceamento num lugar só. Ajuste aqui e rode `npm run simulate`.

/**
 * Meta do Blind:
 *   meta(ante, tipo) = arredonda( BASE × CRESCIMENTO^(ante−1) × MULT_BLIND[tipo] × fatorStake )
 * Depois do Ante 8 (modo infinito) o crescimento acelera: × ENDLESS_GROWTH^(ante−8).
 * Arredondamento: para o múltiplo de 10 mais próximo (100 acima de 2000).
 */
export const TARGET_BASE = 22;
export const TARGET_GROWTH = 1.85;
export const ENDLESS_GROWTH = 2.6;
export const BLIND_TARGET_MULT = { pequeno: 1, grande: 1.5, chefe: 2 } as const;

export function blindTarget(ante: number, kind: keyof typeof BLIND_TARGET_MULT, stakeFactor = 1): number {
  const a = Math.max(1, ante);
  let base = TARGET_BASE * Math.pow(TARGET_GROWTH, Math.min(a, 8) - 1);
  if (a > 8) base *= Math.pow(ENDLESS_GROWTH, a - 8);
  const raw = base * BLIND_TARGET_MULT[kind] * stakeFactor;
  const step = raw >= 2000 ? 100 : 10;
  return Math.max(step, Math.round(raw / step) * step);
}

/** Blind padrão. */
export const DEFAULT_HANDS = 4;
export const DEFAULT_BLUFFS = 3;
export const BLUFF_MAX_CARDS = 2;

/** Multiplicador base da aposta: sem aposta, Truco, Seis, Nove, Doze. */
export const BET_MULT = [1, 2, 3, 4, 6] as const;

/** Dinheiro perdido ao perder uma mão com aposta aceita, por nível. */
export const BET_LOSS = [0, 1, 2, 3, 4] as const;

/** Economia. */
export const BLIND_REWARD = { pequeno: 3, grande: 4, chefe: 5 } as const;
export const MONEY_PER_UNUSED_HAND = 1;
export const INTEREST_STEP = 5;
export const INTEREST_CAP = 5;
export const START_MONEY = 4;

/** Loja. */
export const REROLL_BASE = 5;
export const REROLL_STEP = 1;
export const SHOP_ITEM_SLOTS = 2;
export const SHOP_PACK_SLOTS = 2;
export const DESTROY_BASE = 3;
export const MIN_DECK_SIZE = 12;

export const JOKER_PRICE = { comum: 4, incomum: 6, raro: 8, lendario: 20 } as const;
export const CONSUMABLE_PRICE = { tarot: 3, giria: 3, mandinga: 4 } as const;
export const CARD_PRICE = 2;
export const VOUCHER_PRICE = 10;
export const EDITION_PRICE = { folheada: 2, holografica: 3, fosforescente: 5, marcada: 1 } as const;

/** Pesos do que aparece nos slots de item da loja. */
export const SHOP_WEIGHTS = { joker: 70, tarot: 12, giria: 12, card: 6 } as const;
export const RARITY_WEIGHTS = { comum: 70, incomum: 25, raro: 5, lendario: 0 } as const;
/** Chance de um Coringa da loja vir com edição. */
export const JOKER_EDITION_CHANCE = { folheada: 0.03, holografica: 0.02, fosforescente: 0.006 } as const;

/** Edições e selos. */
export const EDITION_CHIPS = 20; // Folheada
export const EDITION_MULT = 4; // Holográfica
export const EDITION_XMULT = 1.5; // Fosforescente
export const GOLD_SEAL_MONEY = 2;

/** Slots iniciais. */
export const JOKER_SLOTS = 5;
export const CONSUMABLE_SLOTS = 2;

/** Antes até a vitória. */
export const FINAL_ANTE = 8;
