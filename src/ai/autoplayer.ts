// IA jogadora simples: joga runs inteiras sozinha (testes e `npm run simulate`).

import { CONSUMABLE_BY_ID } from '../data/consumables';
import { RARITY_WEIGHTS } from '../data/balance';
import {
  acceptOnze,
  aiStep,
  bluff,
  canBluff,
  finishHand,
  nextHand,
  playerBet,
  playerPlay,
  playerRespond,
} from '../engine/blind';
import { compareCards } from '../engine/cards';
import { jokerDef, applyConsumable } from '../engine/inventory';
import { fork, int } from '../engine/rng';
import { collectCashout, endRun, leaveShop, openQueuedPack, selectBlind } from '../engine/run';
import { buyItem, buyPack, pickFromPack, skipPack } from '../engine/shop';
import type { RunState } from '../engine/state';
import { actor } from '../engine/truco';
import { decide, PERSONALITIES } from './opponent';
import { equity } from './sim';

const PLAYER_STYLE = { ...PERSONALITIES.equilibrado, aggression: 0.6, bluff: 0.15 };

/** Joga a mão atual até o fim e fecha a pontuação. */
export function autoPlayHand(run: RunState): void {
  const blind = run.blind!;
  if (blind.stage === 'onze') acceptOnze(run);
  const hand = blind.hand!;

  // blefe: troca as 2 piores se a mão estiver fraca
  if (canBluff(run) && blind.bluffsLeft > 1) {
    const eq = equity(hand, 'player', fork(run.rng), 40);
    if (eq < 0.3) {
      const worst = [...hand.hands.player].sort((a, b) => compareCards(a, b, hand.manilha)).slice(0, 2);
      bluff(run, worst.map((c) => c.id));
    }
  }

  for (let guard = 0; guard < 40 && hand.phase !== 'done'; guard++) {
    const who = actor(hand);
    if (who === 'ai') {
      aiStep(run);
      continue;
    }
    const d = decide(hand, 'player', PLAYER_STYLE, fork(run.rng));
    const a = d.action;
    if (a.type === 'play') playerPlay(run, a.cardId);
    else if (a.type === 'bet') playerBet(run);
    else playerRespond(run, a.response);
  }
  finishHand(run);
}

function shopPhase(run: RunState): void {
  // usa o que der dos consumíveis
  for (const c of [...run.consumables]) {
    const def = CONSUMABLE_BY_ID[c.id];
    const targets: string[] = [];
    if (def.targets) {
      const pool = [...run.deck];
      for (let i = 0; i < def.targets.max && pool.length; i++) targets.push(pool.splice(int(run.rng, pool.length), 1)[0].id);
    }
    if (def.kind === 'mandinga' && ['simpatia', 'encruzilhada'].includes(def.id)) continue;
    applyConsumable(run, c.uid, targets);
  }

  const shop = run.shop!;
  // compra o Coringa mais raro que couber
  const order = shop.items
    .map((it, i) => ({ it, i }))
    .filter((x) => !x.it.sold && x.it.kind === 'joker')
    .sort((a, b) => {
      const ra = a.it.kind === 'joker' ? RARITY_WEIGHTS[jokerDef(a.it.id).rarity] : 0;
      const rb = b.it.kind === 'joker' ? RARITY_WEIGHTS[jokerDef(b.it.id).rarity] : 0;
      return ra - rb;
    });
  for (const { it, i } of order) {
    if (run.jokers.length < run.jokerSlots && run.money >= it.price) buyItem(run, i);
  }
  shop.items.forEach((it, i) => {
    if (!it.sold && it.kind === 'consumable' && run.money >= it.price + 6) buyItem(run, i);
  });
  shop.packs.forEach((p, i) => {
    if (!p.sold && run.money >= p.price + 8) {
      buyPack(run, i);
      resolvePack(run);
    }
  });
}

function resolvePack(run: RunState): void {
  for (let guard = 0; guard < 6 && run.pack; guard++) {
    const r = pickFromPack(run, 0);
    if (!r.ok) skipPack(run);
  }
}

export interface AutoRunResult {
  won: boolean;
  /** Ante em que a run terminou (8 = vitória). */
  ante: number;
  blindsDefeated: number;
  bestHand: number;
}

export function autoRun(run: RunState, maxSteps = 5000): AutoRunResult {
  for (let step = 0; step < maxSteps; step++) {
    if (run.pack) {
      resolvePack(run);
      continue;
    }
    if (openQueuedPack(run)) continue;
    switch (run.phase) {
      case 'select':
        selectBlind(run);
        break;
      case 'blind': {
        const b = run.blind!;
        if (b.stage === 'playing' || b.stage === 'onze') autoPlayHand(run);
        else if (b.stage === 'handOver') nextHand(run);
        else if (b.stage === 'won') collectCashout(run);
        else endRun(run);
        break;
      }
      case 'shop':
        shopPhase(run);
        leaveShop(run);
        break;
      case 'victory':
        return { won: true, ante: run.ante, blindsDefeated: run.stats.blindsDefeated, bestHand: run.stats.bestHand };
      case 'over':
        return { won: false, ante: run.ante, blindsDefeated: run.stats.blindsDefeated, bestHand: run.stats.bestHand };
    }
  }
  throw new Error('autoRun não terminou');
}
