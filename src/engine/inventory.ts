// Coringas, consumíveis e cartas do baralho: criar, vender, usar.

import { JOKER_PRICE, MIN_DECK_SIZE, RARITY_WEIGHTS } from '../data/balance';
import { CONSUMABLE_BY_ID, consumablesOfKind, type UseCtx } from '../data/consumables';
import { JOKER_BY_ID, JOKERS, jokersOfRarity } from '../data/jokers';
import { cloneCard, type Card } from './cards';
import type { JokerDef } from './jokerApi';
import { pick, weighted } from './rng';
import type { ConsumableKind, JokerEdition, JokerInstance, Rarity, RunState } from './state';

export function newUid(run: RunState, prefix: string): string {
  run.uidCounter += 1;
  return `${prefix}${run.uidCounter}`;
}

export function jokerDef(j: JokerInstance | string): JokerDef {
  const id = typeof j === 'string' ? j : j.id;
  const d = JOKER_BY_ID[id];
  if (!d) throw new Error(`Coringa desconhecido: ${id}`);
  return d;
}

export interface ResolvedJoker {
  /** Coringa que aparece na mesa (o Boto, quando copia). */
  owner: JokerInstance;
  /** Instância cujo estado é lido: a da direita, quando o Boto copia. */
  self: JokerInstance;
  /** Definição que executa os efeitos. */
  def: JokerDef;
}

/**
 * Resolve o Boto: ele vira uma cópia total do Coringa à direita (todos os efeitos e passivos),
 * usando o estado dessa instância. Não copia outro Boto, para não ficar em loop.
 */
export function resolvedJokers(list: JokerInstance[]): ResolvedJoker[] {
  const out: ResolvedJoker[] = [];
  list.forEach((owner, i) => {
    const def = jokerDef(owner);
    if (!def.passive?.copyRight) {
      out.push({ owner, self: owner, def });
      return;
    }
    const right = list[i + 1];
    if (!right || jokerDef(right).passive?.copyRight) return;
    out.push({ owner, self: right, def: jokerDef(right) });
  });
  return out;
}

export function jokerBaseCost(def: JokerDef): number {
  return def.cost ?? JOKER_PRICE[def.rarity];
}

export function sellValue(j: JokerInstance): number {
  return Math.max(1, Math.floor(j.cost / 2));
}

export function hasJoker(run: RunState, id: string): boolean {
  return run.jokers.some((j) => j.id === id);
}

export function hasVoucher(run: RunState, id: string): boolean {
  return run.vouchers.includes(id);
}

/** Sorteia um Coringa evitando repetir os que o jogador já tem. */
export function randomJokerId(run: RunState, rarity?: Rarity, exclude: string[] = []): string {
  const owned = new Set([...run.jokers.map((j) => j.id), ...exclude]);
  const r: Rarity =
    rarity ?? weighted(run.rng, ['comum', 'incomum', 'raro'] as Rarity[], (x) => RARITY_WEIGHTS[x]);
  // Coringas trancados da run (condições ainda não cumpridas) não entram em lugar nenhum
  const locked = new Set(run.lockedJokers ?? []);
  const open = (j: JokerDef) => !locked.has(j.id);
  let pool = jokersOfRarity(r).filter((j) => !owned.has(j.id) && open(j));
  if (pool.length === 0) pool = jokersOfRarity(r).filter(open);
  if (pool.length === 0) pool = JOKERS.filter(open);
  if (pool.length === 0) pool = JOKERS;
  return pick(run.rng, pool).id;
}

export function makeJoker(run: RunState, id: string, edition?: JokerEdition, cost?: number): JokerInstance {
  const def = jokerDef(id);
  if (!run.seenJokers.includes(id)) run.seenJokers.push(id);
  return {
    uid: newUid(run, 'j'),
    id,
    edition,
    state: def.initialState?.() ?? {},
    cost: cost ?? jokerBaseCost(def),
  };
}

export function addJoker(run: RunState, id: string, edition?: JokerEdition, cost?: number): boolean {
  if (run.jokers.length >= run.jokerSlots) return false;
  run.jokers.push(makeJoker(run, id, edition, cost));
  return true;
}

export function sellJoker(run: RunState, uid: string): number {
  const i = run.jokers.findIndex((j) => j.uid === uid);
  if (i < 0) return 0;
  const [j] = run.jokers.splice(i, 1);
  const v = sellValue(j);
  run.money += v;
  run.stats.jokersSold += 1;
  return v;
}

export function moveJoker(run: RunState, uid: string, toIndex: number): void {
  const i = run.jokers.findIndex((j) => j.uid === uid);
  if (i < 0) return;
  const [j] = run.jokers.splice(i, 1);
  run.jokers.splice(Math.max(0, Math.min(run.jokers.length, toIndex)), 0, j);
}

export function randomConsumableId(run: RunState, kind: ConsumableKind): string {
  return weighted(run.rng, consumablesOfKind(kind), (c) => c.weight ?? 1).id;
}

export function addConsumable(run: RunState, kind: ConsumableKind, id?: string): boolean {
  if (run.consumables.length >= run.consumableSlots) return false;
  run.consumables.push({ uid: newUid(run, 'k'), id: id ?? randomConsumableId(run, kind) });
  return true;
}

export function sellConsumable(run: RunState, uid: string): number {
  const i = run.consumables.findIndex((c) => c.uid === uid);
  if (i < 0) return 0;
  run.consumables.splice(i, 1);
  run.money += 1;
  return 1;
}

export function destroyCards(run: RunState, cards: Card[]): void {
  const ids = new Set(cards.map((c) => c.id));
  run.deck = run.deck.filter((c) => !ids.has(c.id));
  run.stats.cardsDestroyed += ids.size;
  if (run.blind) {
    run.blind.drawPile = run.blind.drawPile.filter((c) => !ids.has(c.id));
    run.blind.discard = run.blind.discard.filter((c) => !ids.has(c.id));
  }
}

export function addCardsToDeck(run: RunState, cards: Card[]): void {
  run.deck.push(...cards);
  // durante um Blind, cartas novas vão para o descarte e entram no próximo reembaralhamento
  if (run.blind) run.blind.discard.push(...cards);
}

export function canDestroyCard(run: RunState, n = 1): boolean {
  return run.deck.length - n >= MIN_DECK_SIZE;
}

export interface UseResult {
  ok: boolean;
  message: string;
}

/** Usa um consumível. `targetIds` são ids de cartas do baralho. */
export function applyConsumable(run: RunState, uid: string, targetIds: string[] = []): UseResult {
  const idx = run.consumables.findIndex((c) => c.uid === uid);
  if (idx < 0) return { ok: false, message: 'Consumível não encontrado.' };
  const def = CONSUMABLE_BY_ID[run.consumables[idx].id];
  const targets = targetIds.map((id) => run.deck.find((c) => c.id === id)).filter((c): c is Card => !!c);
  if (def.targets && (targets.length < def.targets.min || targets.length > def.targets.max)) {
    const { min, max } = def.targets;
    return { ok: false, message: min === max ? `Escolha ${min} carta(s).` : `Escolha de ${min} a ${max} cartas.` };
  }
  const reason = def.blocked?.(run, targets);
  if (reason) return { ok: false, message: reason };

  // libera o slot antes de usar (O Sacristão pode criar consumíveis)
  run.consumables.splice(idx, 1);
  let message = '';
  const ctx: UseCtx = {
    run,
    targets,
    rng: run.rng,
    addJoker: ({ rarity, id, edition }) => addJoker(run, id ?? randomJokerId(run, rarity), edition),
    addConsumable: (kind, id) => addConsumable(run, kind, id),
    destroyCards: (cards) => destroyCards(run, cards),
    addCards: (cards) => addCardsToDeck(run, cards),
    copyCard: (card) => cloneCard(card, 'p'),
    message: (t) => {
      message = t;
    },
  };
  def.use(ctx);
  return { ok: true, message: message || `${def.name} usado.` };
}
