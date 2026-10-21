// Gerador mulberry32 com estado serializável. Toda aleatoriedade do jogo passa por aqui.

export interface Rng {
  s: number;
}

const SEED_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function hashSeed(seed: string): number {
  // FNV-1a 32 bits
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: string | number): Rng {
  return { s: typeof seed === 'number' ? seed >>> 0 : hashSeed(seed.toUpperCase()) };
}

/** Número em [0, 1). Avança o estado. */
export function next(rng: Rng): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function int(rng: Rng, maxExclusive: number): number {
  return Math.floor(next(rng) * maxExclusive);
}

export function chance(rng: Rng, p: number): boolean {
  return next(rng) < p;
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick em lista vazia');
  return arr[int(rng, arr.length)];
}

export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = int(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Escolha ponderada: pesos não precisam somar 1. */
export function weighted<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T {
  const total = items.reduce((a, t) => a + weight(t), 0);
  let r = next(rng) * total;
  for (const t of items) {
    r -= weight(t);
    if (r < 0) return t;
  }
  return items[items.length - 1];
}

/** Deriva um RNG independente (ex.: para a IA) sem consumir muito do principal. */
export function fork(rng: Rng): Rng {
  return { s: (int(rng, 0xffffffff) ^ 0x9e3779b9) >>> 0 };
}

export function randomSeedString(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += SEED_ALPHABET[Math.floor(rand() * SEED_ALPHABET.length)];
  return s;
}
