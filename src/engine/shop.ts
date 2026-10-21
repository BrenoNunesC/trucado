// Loja entre Blinds e abertura de pacotes.

import {
  CARD_PRICE,
  CONSUMABLE_PRICE,
  DESTROY_BASE,
  EDITION_PRICE,
  JOKER_EDITION_CHANCE,
  REROLL_BASE,
  REROLL_STEP,
  SHOP_ITEM_SLOTS,
  SHOP_PACK_SLOTS,
  SHOP_WEIGHTS,
  VOUCHER_PRICE,
} from '../data/balance';
import { CONSUMABLE_BY_ID } from '../data/consumables';
import { PACK_BY_ID, PACKS } from '../data/packs';
import { VOUCHER_BY_ID, VOUCHERS } from '../data/vouchers';
import { makeCard, RANKS, SUITS, type Card, type Edition, type Seal } from './cards';
import {
  addCardsToDeck,
  addConsumable,
  addJoker,
  canDestroyCard,
  destroyCards,
  hasVoucher,
  jokerBaseCost,
  jokerDef,
  randomConsumableId,
  randomJokerId,
} from './inventory';
import { chance, next, pick, weighted } from './rng';
import type { JokerEdition, PackOption, Rarity, RunState, ShopItem, ShopState } from './state';

export function price(run: RunState, base: number): number {
  let p = base;
  if (hasVoucher(run, 'liquidacao')) p = Math.floor(p * 0.75);
  if (run.stake >= 7) p += 1;
  return Math.max(0, p);
}

function rollJokerEdition(run: RunState): JokerEdition | undefined {
  const r = next(run.rng);
  const c = JOKER_EDITION_CHANCE;
  if (r < c.fosforescente) return 'fosforescente';
  if (r < c.fosforescente + c.holografica) return 'holografica';
  if (r < c.fosforescente + c.holografica + c.folheada) return 'folheada';
  return undefined;
}

const JOKER_EDITION_EXTRA: Record<JokerEdition, number> = { folheada: 2, holografica: 3, fosforescente: 5 };

export function randomPlayingCard(run: RunState, enhancedChance = 0.3): Card {
  const card = makeCard(pick(run.rng, RANKS), pick(run.rng, SUITS), 'p');
  if (chance(run.rng, enhancedChance)) {
    card.edition = weighted(run.rng, ['folheada', 'holografica', 'fosforescente', 'marcada'] as Edition[], (e) =>
      e === 'fosforescente' ? 1 : e === 'marcada' ? 3 : 4,
    );
  }
  if (chance(run.rng, enhancedChance / 2)) card.seal = pick(run.rng, ['dourado', 'roxo', 'vermelho', 'azul'] as Seal[]);
  return card;
}

export function cardPrice(run: RunState, card: Card): number {
  return price(run, CARD_PRICE + (card.edition ? EDITION_PRICE[card.edition] : 0) + (card.seal ? 2 : 0));
}

function shopItem(run: RunState, exclude: string[]): ShopItem {
  const kind = weighted(run.rng, Object.keys(SHOP_WEIGHTS) as (keyof typeof SHOP_WEIGHTS)[], (k) => SHOP_WEIGHTS[k]);
  if (kind === 'joker') {
    const id = randomJokerId(run, undefined, exclude);
    const edition = rollJokerEdition(run);
    const base = jokerBaseCost(jokerDef(id)) + (edition ? JOKER_EDITION_EXTRA[edition] : 0);
    return { kind: 'joker', id, edition, price: price(run, base) };
  }
  if (kind === 'card') {
    const card = randomPlayingCard(run);
    return { kind: 'card', card, price: cardPrice(run, card) };
  }
  const id = randomConsumableId(run, kind);
  return { kind: 'consumable', id, price: price(run, CONSUMABLE_PRICE[kind]) };
}

function shopItems(run: RunState): ShopItem[] {
  const n = SHOP_ITEM_SLOTS + (hasVoucher(run, 'vitrine') ? 1 : 0);
  const items: ShopItem[] = [];
  for (let i = 0; i < n; i++) {
    const exclude = items.flatMap((it) => (it.kind === 'joker' ? [it.id] : []));
    items.push(shopItem(run, exclude));
  }
  return items;
}

function availableVouchers(run: RunState) {
  return VOUCHERS.filter((v) => !run.vouchers.includes(v.id) && (!v.requires || run.vouchers.includes(v.requires)));
}

export function rerollCost(run: RunState): number {
  const shop = run.shop!;
  if (shop.freeRerolls > 0) return 0;
  let discount = hasVoucher(run, 'garcomAmigo') ? 2 : 0;
  for (const j of run.jokers) discount += jokerDef(j).passive?.rerollDiscount ?? 0;
  return Math.max(0, shop.rerollCost - discount);
}

export function generateShop(run: RunState): ShopState {
  const packs = [0, 1].slice(0, SHOP_PACK_SLOTS).map(() => {
    const def = weighted(run.rng, PACKS, (p) => p.weight);
    return { id: def.id, price: price(run, def.price) };
  });
  const vouchers = availableVouchers(run);
  const shop: ShopState = {
    items: shopItems(run),
    packs,
    voucher: vouchers.length ? { id: pick(run.rng, vouchers).id, price: price(run, VOUCHER_PRICE) } : null,
    rerollCost: REROLL_BASE,
    freeRerolls: 0,
    destroyCost: destroyCostFor(run),
  };

  // tags que agem na loja
  const remaining: string[] = [];
  for (const t of run.tags) {
    if (t === 'incomum' || t === 'raro') {
      const rarity: Rarity = t === 'incomum' ? 'incomum' : 'raro';
      shop.items.push({ kind: 'joker', id: randomJokerId(run, rarity), price: 0 });
    } else if (t === 'cupom') {
      for (const it of shop.items) it.price = 0;
      for (const p of shop.packs) p.price = 0;
    } else if (t === 'rolagem') {
      shop.freeRerolls += 3;
    } else remaining.push(t);
  }
  run.tags = remaining;
  run.shop = shop;
  return shop;
}

function destroyCostFor(run: RunState): number {
  return price(run, DESTROY_BASE + run.stats.cardsDestroyed);
}

export interface ShopResult {
  ok: boolean;
  message: string;
}

const fail = (message: string): ShopResult => ({ ok: false, message });

export function reroll(run: RunState): ShopResult {
  const shop = run.shop!;
  const cost = rerollCost(run);
  if (run.money < cost) return fail('Dinheiro insuficiente.');
  run.money -= cost;
  if (shop.freeRerolls > 0) shop.freeRerolls -= 1;
  else shop.rerollCost += REROLL_STEP;
  shop.items = shopItems(run);
  run.stats.rerolls += 1;
  return { ok: true, message: 'Loja renovada.' };
}

export function buyItem(run: RunState, index: number): ShopResult {
  const item = run.shop!.items[index];
  if (!item || item.sold) return fail('Item indisponível.');
  if (run.money < item.price) return fail('Dinheiro insuficiente.');
  if (item.kind === 'joker') {
    if (!addJoker(run, item.id, item.edition, Math.max(item.price, 1))) return fail('Sem espaço para Coringas.');
  } else if (item.kind === 'consumable') {
    if (!addConsumable(run, CONSUMABLE_BY_ID[item.id].kind, item.id)) return fail('Sem espaço para consumíveis.');
  } else {
    addCardsToDeck(run, [item.card]);
  }
  run.money -= item.price;
  item.sold = true;
  return { ok: true, message: 'Comprado!' };
}

export function buyVoucher(run: RunState): ShopResult {
  const v = run.shop!.voucher;
  if (!v || v.sold) return fail('Voucher indisponível.');
  if (run.money < v.price) return fail('Dinheiro insuficiente.');
  run.money -= v.price;
  v.sold = true;
  run.vouchers.push(v.id);
  VOUCHER_BY_ID[v.id].onBuy?.(run);
  return { ok: true, message: `${VOUCHER_BY_ID[v.id].name} ativado!` };
}

export function destroyService(run: RunState, cardId: string): ShopResult {
  const shop = run.shop!;
  const card = run.deck.find((c) => c.id === cardId);
  if (!card) return fail('Carta não encontrada.');
  if (!canDestroyCard(run)) return fail('O baralho já está no mínimo.');
  if (run.money < shop.destroyCost) return fail('Dinheiro insuficiente.');
  run.money -= shop.destroyCost;
  destroyCards(run, [card]);
  shop.destroyCost = destroyCostFor(run);
  return { ok: true, message: 'Carta destruída.' };
}

// ---------------------------------------------------------------- pacotes

export function buyPack(run: RunState, index: number): ShopResult {
  const p = run.shop!.packs[index];
  if (!p || p.sold) return fail('Pacote indisponível.');
  if (run.money < p.price) return fail('Dinheiro insuficiente.');
  run.money -= p.price;
  p.sold = true;
  openPack(run, p.id, false);
  return { ok: true, message: 'Pacote aberto!' };
}

export function openPack(run: RunState, packId: string, fromTag: boolean): void {
  const def = PACK_BY_ID[packId];
  const options: PackOption[] = [];
  const usedIds: string[] = [];
  for (let i = 0; i < def.size; i++) {
    if (def.content === 'card') options.push({ kind: 'card', card: randomPlayingCard(run, 0.45) });
    else if (def.content === 'joker') {
      const id = randomJokerId(run, undefined, usedIds);
      usedIds.push(id);
      options.push({ kind: 'joker', id, edition: rollJokerEdition(run) });
    } else {
      let id = randomConsumableId(run, def.content);
      for (let tries = 0; tries < 5 && usedIds.includes(id); tries++) id = randomConsumableId(run, def.content);
      usedIds.push(id);
      options.push({ kind: 'consumable', id });
    }
  }
  run.pack = { packId, options, picksLeft: def.picks, fromTag };
}

export function pickFromPack(run: RunState, index: number): ShopResult {
  const pack = run.pack;
  if (!pack) return fail('Nenhum pacote aberto.');
  const opt = pack.options[index];
  if (!opt) return fail('Opção inválida.');
  let message = 'Escolhido!';
  if (opt.kind === 'joker') {
    if (!addJoker(run, opt.id, opt.edition)) return fail('Sem espaço para Coringas. Venda um antes.');
  } else if (opt.kind === 'card') {
    addCardsToDeck(run, [opt.card]);
  } else {
    const def = CONSUMABLE_BY_ID[opt.id];
    if (def.kind === 'giria') {
      // Gírias de pacote são usadas na hora, como os planetas do Balatro
      def.use({
        run,
        targets: [],
        rng: run.rng,
        addJoker: () => false,
        addConsumable: () => false,
        destroyCards: () => {},
        addCards: () => {},
        copyCard: (c) => c,
        message: (t) => (message = t),
      });
    } else if (!addConsumable(run, def.kind, def.id)) {
      return fail('Sem espaço para consumíveis. Venda ou use um antes.');
    }
  }
  pack.options.splice(index, 1);
  pack.picksLeft -= 1;
  if (pack.picksLeft <= 0 || pack.options.length === 0) run.pack = null;
  return { ok: true, message };
}

export function skipPack(run: RunState): void {
  run.pack = null;
}
