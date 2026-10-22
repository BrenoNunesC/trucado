// Run: criação, Antes, pular Blinds com Tags, pagamento e avanço.

import { blindTarget, CONSUMABLE_SLOTS, FINAL_ANTE, JOKER_SLOTS, START_MONEY } from '../data/balance';
import { BOSSES } from '../data/bosses';
import { initialLevels } from '../data/categories';
import { DECK_BY_ID, stakeTargetFactor } from '../data/decks';
import { OPPONENTS, type OpponentDef } from '../data/opponents';
import { TAG_BY_ID, TAGS } from '../data/tags';
import { startBlind } from './blind';
import { addConsumable, addJoker, jokerDef } from './inventory';
import { createRng, pick } from './rng';
import { activeJokers } from './scoring';
import { generateShop, openPack } from './shop';
import type { BlindInfo, BlindKind, RunOptions, RunState } from './state';

export interface NewRunParams {
  seed: string;
  deckId: string;
  stake: number;
  options?: Partial<RunOptions>;
}

export function newRun(p: NewRunParams): RunState {
  const seed = p.seed.toUpperCase();
  const deck = DECK_BY_ID[p.deckId] ?? DECK_BY_ID.classico;
  const rng = createRng(seed);
  const run: RunState = {
    version: 1,
    seed,
    rng,
    deckId: deck.id,
    stake: Math.max(1, Math.min(8, p.stake)),
    options: { maoDeOnze: false, maoDeFerro: false, ...p.options },
    ante: 1,
    blindIndex: 0,
    blinds: [],
    money: START_MONEY,
    deck: deck.build(rng),
    jokers: [],
    jokerSlots: JOKER_SLOTS,
    consumables: [],
    consumableSlots: CONSUMABLE_SLOTS,
    levels: initialLevels(),
    vouchers: [],
    tags: [],
    phase: 'select',
    blind: null,
    shop: null,
    pack: null,
    stats: {
      handsPlayed: 0,
      handsWon: 0,
      bestHand: 0,
      betsCalled: 0,
      betsWon: 0,
      moneyEarned: 0,
      jokersSold: 0,
      blindsDefeated: 0,
      bossesDefeated: 0,
      ties: 0,
      fechou: 0,
      cardsDestroyed: 0,
      rerolls: 0,
    },
    endless: false,
    seenJokers: [],
    uidCounter: 0,
    bossesSeen: [],
    toasts: [],
  };
  deck.setup?.(run);
  for (const id of deck.startJokers ?? []) addJoker(run, id);
  for (const kind of deck.startConsumables ?? []) addConsumable(run, kind);
  generateAnte(run);
  return run;
}


export function targetFor(run: RunState, kind: BlindKind, bossMult = 1): number {
  const factor = stakeTargetFactor(run.stake) * (DECK_BY_ID[run.deckId]?.targetFactor ?? 1) * bossMult;
  return blindTarget(run.ante, kind, factor);
}

export function generateAnte(run: RunState): void {
  const ante = run.ante;
  // Ante 8 (e a cada 8 no infinito): só chefes finais
  const finale = ante % FINAL_ANTE === 0;
  const eligible = BOSSES.filter((b) => b.minAnte <= ante && !!b.finale === finale);
  let pool = eligible.filter((b) => !run.bossesSeen.includes(b.id));
  if (pool.length === 0) {
    run.bossesSeen = run.bossesSeen.filter((id) => !eligible.some((b) => b.id === id));
    pool = eligible;
  }
  const boss = pick(run.rng, pool);
  run.bossesSeen.push(boss.id);
  const tagPool = TAGS.filter((t) => t.minAnte <= ante);
  const small = pick(run.rng, OPPONENTS);
  const big = pick(run.rng, OPPONENTS.filter((o) => o.id !== small.id));
  const mk = (kind: BlindKind, opp: OpponentDef): BlindInfo => ({
    kind,
    ante,
    name: kind === 'pequeno' ? 'Blind Pequeno' : 'Blind Grande',
    target: targetFor(run, kind),
    reward: 0,
    personality: opp.personality,
    opponentId: opp.id,
    tagId: pick(run.rng, tagPool).id,
    status: 'upcoming',
  });
  run.blinds = [
    mk('pequeno', small),
    mk('grande', big),
    {
      kind: 'chefe',
      ante,
      name: boss.name,
      target: targetFor(run, 'chefe', boss.targetMult ?? 1),
      reward: 0,
      personality: boss.personality,
      bossId: boss.id,
      status: 'upcoming',
    },
  ];
  run.blindIndex = 0;
}

export function currentBlindInfo(run: RunState): BlindInfo {
  return run.blinds[run.blindIndex];
}

export function selectBlind(run: RunState): void {
  if (run.phase !== 'select') throw new Error('Não é hora de escolher Blind');
  startBlind(run);
}

/** Aplica uma Tag. Retorna uma descrição curta do que aconteceu. */
export function gainTag(run: RunState, tagId: string): string {
  const def = TAG_BY_ID[tagId];
  const dobro = run.tags.indexOf('dobro');
  let times = 1;
  if (dobro >= 0 && tagId !== 'dobro') {
    run.tags.splice(dobro, 1);
    times = 2;
  }
  for (let i = 0; i < times; i++) {
    switch (tagId) {
      case 'caixinha':
        run.money += 7;
        break;
      case 'girias':
        queuePack(run, 'giriasMega');
        break;
      case 'taro':
        queuePack(run, 'taroMega');
        break;
      case 'mandinga':
        queuePack(run, 'mandingas');
        break;
      case 'gorjetaTag':
        run.money += Math.min(12, 2 * run.jokers.length);
        break;
      case 'cartasTag':
        queuePack(run, 'cartasMega');
        break;
      case 'coringasTag':
        queuePack(run, 'coringasMega');
        break;
      default:
        run.tags.push(tagId);
    }
  }
  return times > 1 ? `${def.name} em dobro!` : def.name;
}

/** Pacotes de Tag: abre já, ou guarda se outro pacote estiver aberto. */
function queuePack(run: RunState, packId: string): void {
  if (run.pack) run.tags.push(`pack:${packId}`);
  else openPack(run, packId, true);
}

/** Abre o próximo pacote pendente de Tag, se houver. */
export function openQueuedPack(run: RunState): boolean {
  if (run.pack) return false;
  const i = run.tags.findIndex((t) => t.startsWith('pack:'));
  if (i < 0) return false;
  const [t] = run.tags.splice(i, 1);
  openPack(run, t.slice(5), true);
  return true;
}

export function skipBlind(run: RunState): string {
  const info = currentBlindInfo(run);
  if (run.phase !== 'select' || info.kind === 'chefe' || !info.tagId) throw new Error('Não dá para pular este Blind');
  info.status = 'skipped';
  run.blindIndex += 1;
  return gainTag(run, info.tagId);
}

/** Recebe o pagamento do Blind vencido e vai para a loja (ou vitória). */
export function collectCashout(run: RunState): number {
  const blind = run.blind!;
  if (blind.stage !== 'won') throw new Error('Blind não foi vencido');
  const total = (blind.cashout ?? []).reduce((a, l) => a + l.amount, 0);
  run.money += total;
  run.stats.moneyEarned += total;
  run.stats.blindsDefeated += 1;
  blind.info.status = 'defeated';
  const isBoss = blind.info.kind === 'chefe';
  if (isBoss) {
    run.stats.bossesDefeated += 1;
    run.tags = run.tags.filter((t) => t !== 'investimento');
    for (const j of activeJokers(run, blind)) {
      jokerDef(j).bossDefeated?.(
        { run, blind, money: (n) => void (run.money += n), addConsumable: (k, id) => addConsumable(run, k, id) },
        j,
      );
    }
  }
  run.blind = null;
  if (isBoss && run.ante === FINAL_ANTE && !run.endless) {
    run.phase = 'victory';
    return total;
  }
  run.phase = 'shop';
  generateShop(run);
  return total;
}

export function continueEndless(run: RunState): void {
  run.endless = true;
  run.phase = 'shop';
  generateShop(run);
}

export function leaveShop(run: RunState): void {
  if (run.phase !== 'shop') throw new Error('Não está na loja');
  run.shop = null;
  run.pack = null;
  run.blindIndex += 1;
  if (run.blindIndex > 2) {
    run.ante += 1;
    generateAnte(run);
  }
  run.phase = 'select';
}

/** Marca a run como perdida (chamado quando o Blind termina em derrota). */
export function endRun(run: RunState): void {
  run.phase = 'over';
}

export function isVictoryAnte(run: RunState): boolean {
  return run.ante >= FINAL_ANTE;
}
