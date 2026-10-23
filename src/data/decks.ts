// Decks iniciais e Stakes (dificuldades).

import { makeCard, RANKS, standardDeck, SUITS, type Card, type Edition, type Seal } from '../engine/cards';
import { int, type Rng } from '../engine/rng';
import type { ConsumableKind, RunState } from '../engine/state';

export interface DeckDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Precisa vencer uma run com este deck antes. */
  unlockedBy?: string;
  build: (rng: Rng) => Card[];
  setup?: (run: RunState) => void;
  /** Multiplicador das metas. */
  targetFactor?: number;
  startJokers?: string[];
  startConsumables?: ConsumableKind[];
  noInterest?: boolean;
  handsDelta?: number;
}

/** Sorteia `n` cartas ainda sem edição nem selo e aplica o que foi pedido. */
function decorar(deck: Card[], rng: Rng, n: number, extra: { edition?: Edition; seal?: Seal }): Card[] {
  for (let i = 0; i < n; i++) {
    const livres = deck.filter((c) => !c.edition && !c.seal);
    Object.assign(livres[int(rng, livres.length)], extra);
  }
  return deck;
}

export const DECKS: DeckDef[] = [
  {
    id: 'classico',
    name: 'Baralho Clássico',
    description: 'As 40 cartas de sempre. Sem surpresas.',
    icon: '🂠',
    color: '#c0392b',
    build: () => standardDeck('p'),
  },
  {
    id: 'sujo',
    name: 'Baralho Sujo',
    description: '6 cartas aleatórias já vêm Marcadas (você espia o adversário). Metas 10% maiores.',
    icon: '🩸',
    color: '#7b3f00',
    unlockedBy: 'classico',
    targetFactor: 1.1,
    build: (rng) => {
      const deck = standardDeck('p');
      for (let i = 0; i < 6; i++) {
        const unmarked = deck.filter((c) => !c.edition);
        unmarked[int(rng, unmarked.length)].edition = 'marcada';
      }
      return deck;
    },
  },
  {
    id: 'bar',
    name: 'Baralho de Bar',
    description: 'Começa com +$6, +1 slot de consumível e 2 Gírias. Sem juros.',
    icon: '🍻',
    color: '#d4a017',
    unlockedBy: 'classico',
    build: () => standardDeck('p'),
    noInterest: true,
    startConsumables: ['giria', 'giria'],
    setup: (run) => {
      run.money += 6;
      run.consumableSlots += 1;
    },
  },
  {
    id: 'compadre',
    name: 'Baralho do Compadre',
    description: 'Sem os 4 e os 5, mas com cópias extras de Ás e 2 (40 cartas). Começa com o Compadre.',
    icon: '🤝',
    color: '#2e7d32',
    unlockedBy: 'classico',
    startJokers: ['compadre'],
    build: () => {
      const deck = standardDeck('p').filter((c) => c.rank !== '4' && c.rank !== '5');
      const extras = ['A', '2'] as const;
      for (const suit of SUITS) for (const r of extras) deck.push(makeCard(r, suit, 'p'));
      return deck;
    },
  },
  {
    id: 'rezado',
    name: 'Baralho Rezado',
    description: '+1 slot de Coringa, mas −1 mão em todo Blind.',
    icon: '📿',
    color: '#5e35b1',
    unlockedBy: 'classico',
    handsDelta: -1,
    build: () => standardDeck('p'),
    setup: (run) => {
      run.jokerSlots += 1;
    },
  },
  {
    id: 'bicho',
    name: 'Baralho do Bicho',
    description: 'Valores e naipes sorteados: caos total. Começa com $10.',
    icon: '🦓',
    color: '#00897b',
    unlockedBy: 'sujo',
    build: (rng) =>
      Array.from({ length: 40 }, () => makeCard(RANKS[int(rng, RANKS.length)], SUITS[int(rng, SUITS.length)], 'p')),
    setup: (run) => {
      run.money += 6;
    },
  },
  {
    id: 'paus',
    name: 'Baralho de Paus',
    description: 'As 40 cartas são de Paus: toda manilha é Zap. Começa com o Lenhador (+3 Mult por rodada vencida com Paus).',
    icon: '🌳',
    color: '#2e7d32',
    unlockedBy: 'compadre',
    startJokers: ['lenhador'],
    build: () => standardDeck('p').map((c) => ({ ...c, suit: 'paus' as const })),
  },
  {
    id: 'fiado',
    name: 'Baralho do Fiado',
    description: 'Começa com Pinguço e Pão de Queijo, mas com $0 e metas 10% maiores.',
    icon: '📒',
    color: '#8d6e63',
    unlockedBy: 'bar',
    targetFactor: 1.1,
    startJokers: ['pinguco', 'paoDeQueijo'],
    build: () => standardDeck('p'),
    setup: (run) => {
      run.money = 0;
    },
  },
  {
    id: 'enxuto',
    name: 'Baralho Enxuto',
    description: 'Só 24 cartas (Q J K A 2 3). Começa com a Mão-de-Vaca (×2 Mult com 24 cartas ou menos), mas as metas são o dobro.',
    icon: '🥫',
    color: '#546e7a',
    unlockedBy: 'rezado',
    targetFactor: 2,
    startJokers: ['maoDeVaca'],
    build: () => standardDeck('p').filter((c) => !['4', '5', '6', '7'].includes(c.rank)),
  },
  {
    id: 'dourado',
    name: 'Baralho Dourado',
    description: '6 cartas aleatórias já vêm com Selo Dourado. Metas 10% maiores.',
    icon: '🥇',
    color: '#c9a227',
    unlockedBy: 'bar',
    targetFactor: 1.1,
    build: (rng) => decorar(standardDeck('p'), rng, 6, { seal: 'dourado' }),
  },
  {
    id: 'neon',
    name: 'Baralho de Neon',
    description: '8 cartas aleatórias já vêm Holográficas (+Mult), mas você joga com −1 mão em todo Blind.',
    icon: '🌈',
    color: '#e91e8c',
    unlockedBy: 'sujo',
    handsDelta: -1,
    build: (rng) => decorar(standardDeck('p'), rng, 8, { edition: 'holografica' }),
  },
  {
    id: 'cheio',
    name: 'Baralho Cheio',
    description: '48 cartas: cópias extras de Q, J, K e A. Começa com o Cafezinho, mas as metas são 20% maiores.',
    icon: '🃏',
    color: '#3949ab',
    unlockedBy: 'classico',
    targetFactor: 1.2,
    startJokers: ['cafezinho'],
    build: () => {
      const deck = standardDeck('p');
      for (const suit of SUITS) for (const r of ['Q', 'J', 'K', 'A'] as const) deck.push(makeCard(r, suit, 'p'));
      return deck;
    },
  },
  {
    id: 'fosforo',
    name: 'Baralho Fosforescente',
    description: '5 cartas aleatórias já vêm Fosforescentes (×Mult). As metas são 30% maiores.',
    icon: '💡',
    color: '#7cb342',
    unlockedBy: 'rezado',
    targetFactor: 1.3,
    build: (rng) => decorar(standardDeck('p'), rng, 5, { edition: 'fosforescente' }),
  },
  {
    id: 'padre',
    name: 'Baralho do Padre',
    description: '4 cartas aleatórias com Selo Roxo, 2 Tarôs e a Rezadeira (+40 Fichas por canga). Sem juros.',
    icon: '⛪',
    color: '#6a1b9a',
    unlockedBy: 'compadre',
    noInterest: true,
    startJokers: ['rezadeira'],
    startConsumables: ['tarot', 'tarot'],
    build: (rng) => decorar(standardDeck('p'), rng, 4, { seal: 'roxo' }),
  },
  {
    id: 'folheado',
    name: 'Baralho Folheado',
    description: '10 cartas aleatórias já vêm Folheadas (+Fichas) e você começa com o Carteiro, mas só com $2.',
    icon: '🪙',
    color: '#90a4ae',
    unlockedBy: 'fiado',
    startJokers: ['carteiro'],
    build: (rng) => decorar(standardDeck('p'), rng, 10, { edition: 'folheada' }),
    setup: (run) => {
      run.money = Math.min(run.money, 2);
    },
  },
];

export const DECK_BY_ID = Object.fromEntries(DECKS.map((d) => [d.id, d])) as Record<string, DeckDef>;

export interface StakeDef {
  level: number;
  name: string;
  color: string;
  description: string;
}

/** Cumulativas: a stake N inclui as regras de todas abaixo. */
export const STAKES: StakeDef[] = [
  { level: 1, name: 'Ficha Branca', color: '#f0f0f0', description: 'Regras básicas. Metas +40%.' },
  { level: 2, name: 'Ficha Vermelha', color: '#e53935', description: 'Metas +15%. O Blind Pequeno não dá recompensa em dinheiro.' },
  { level: 3, name: 'Ficha Verde', color: '#43a047', description: 'Metas +15%.' },
  { level: 4, name: 'Ficha Preta', color: '#212121', description: 'Metas +15%. Adversários mais agressivos.' },
  { level: 5, name: 'Ficha Azul', color: '#1e88e5', description: 'Metas +15%. −1 blefe por Blind.' },
  { level: 6, name: 'Ficha Roxa', color: '#8e24aa', description: 'Metas +15%.' },
  { level: 7, name: 'Ficha Laranja', color: '#fb8c00', description: 'Metas +15%. Tudo na loja custa $1 a mais.' },
  { level: 8, name: 'Ficha Dourada', color: '#fdd835', description: 'Metas +15%. −1 mão por Blind.' },
];

/** Meta da Ficha Branca (run padrão), sobre a base de balance.ts. */
const BRANCA_TARGET_FACTOR = 1.4;

/** Fichas acima da Branca somam +15% na meta, cumulativo. */
export function stakeTargetFactor(stake: number): number {
  if (stake <= 1) return BRANCA_TARGET_FACTOR;
  return Math.pow(1.15, stake - 1);
}
