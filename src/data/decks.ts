// Decks iniciais e Stakes (dificuldades).

import { makeCard, RANKS, standardDeck, SUITS, type Card } from '../engine/cards';
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
  { level: 1, name: 'Ficha Branca', color: '#f0f0f0', description: 'Regras básicas.' },
  { level: 2, name: 'Ficha Vermelha', color: '#e53935', description: 'O Blind Pequeno não dá recompensa em dinheiro.' },
  { level: 3, name: 'Ficha Verde', color: '#43a047', description: 'As metas crescem mais rápido (+15%).' },
  { level: 4, name: 'Ficha Preta', color: '#212121', description: 'Adversários mais agressivos.' },
  { level: 5, name: 'Ficha Azul', color: '#1e88e5', description: '−1 blefe por Blind.' },
  { level: 6, name: 'Ficha Roxa', color: '#8e24aa', description: 'Metas ainda maiores (+15%).' },
  { level: 7, name: 'Ficha Laranja', color: '#fb8c00', description: 'Tudo na loja custa $1 a mais.' },
  { level: 8, name: 'Ficha Dourada', color: '#fdd835', description: '−1 mão por Blind.' },
];

export function stakeTargetFactor(stake: number): number {
  let f = 1;
  if (stake >= 3) f *= 1.15;
  if (stake >= 6) f *= 1.15;
  return f;
}
