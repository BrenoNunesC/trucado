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
  /** Ao pontuar, Fichas e Mult viram a média dos dois. */
  balancaFichas?: boolean;
  /** Blefes a mais (ou a menos) em todo Blind. */
  bluffsDelta?: number;
  /** Fim do Blind: $2 por mão não usada e $1 por blefe que sobrou (no lugar do pagamento padrão). */
  pagaSobras?: boolean;
  /** Mandingas podem aparecer na loja. */
  mandingasNaLoja?: boolean;
  /** Depois de cada Chefe vencido, ganha a Tag do Dobro. */
  dobroAposChefe?: boolean;
}

/** Baralhos, inspirados nos do Balatro e adaptados ao Truco. */
export const DECKS: DeckDef[] = [
  {
    id: 'vermelho',
    name: 'Baralho da Canga',
    description: '+1 blefe em todo Blind.',
    icon: '🔴',
    color: '#c0392b',
    bluffsDelta: 1,
    build: () => standardDeck('p'),
  },
  {
    id: 'azul',
    name: 'Baralho do Pagode',
    description: '+1 mão em todo Blind.',
    icon: '🔵',
    color: '#1e88e5',
    unlockedBy: 'vermelho',
    handsDelta: 1,
    build: () => standardDeck('p'),
  },
  {
    id: 'amarelo',
    name: 'Baralho da Féria',
    description: 'Começa com $10 a mais.',
    icon: '💰',
    color: '#fdd835',
    unlockedBy: 'vermelho',
    build: () => standardDeck('p'),
    setup: (run) => {
      run.money += 10;
    },
  },
  {
    id: 'verde',
    name: 'Baralho da Gorjeta',
    description: 'No fim de cada Blind: $2 por mão não usada e $1 por blefe que sobrou. Sem juros.',
    icon: '💵',
    color: '#43a047',
    unlockedBy: 'azul',
    noInterest: true,
    pagaSobras: true,
    build: () => standardDeck('p'),
  },
  {
    id: 'preto',
    name: 'Baralho do Bicheiro',
    description: '+1 slot de Coringa, mas −1 mão em todo Blind.',
    icon: '🎰',
    color: '#212121',
    unlockedBy: 'amarelo',
    handsDelta: -1,
    build: () => standardDeck('p'),
    setup: (run) => {
      run.jokerSlots += 1;
    },
  },
  {
    id: 'magico',
    name: 'Baralho da Cartomante',
    description: 'Começa com 2 Tarôs de Boteco e o vale Vitrine (+1 item na loja).',
    icon: '🔮',
    color: '#8e24aa',
    unlockedBy: 'verde',
    build: () => standardDeck('p'),
    startConsumables: ['tarot', 'tarot'],
    setup: (run) => {
      run.vouchers.push('vitrine');
    },
  },
  {
    id: 'nebulosa',
    name: 'Baralho da Neblina',
    description: 'Começa com o vale Mesa Maior (+1 slot de Coringa), mas −1 slot de consumível.',
    icon: '🌫️',
    color: '#5c6bc0',
    unlockedBy: 'preto',
    build: () => standardDeck('p'),
    setup: (run) => {
      run.vouchers.push('mesaMaior');
      run.jokerSlots += 1;
      run.consumableSlots = Math.max(1, run.consumableSlots - 1);
    },
  },
  {
    id: 'fantasma',
    name: 'Baralho Assombrado',
    description: 'Mandingas podem aparecer na loja. Começa com 1 Mandinga.',
    icon: '👻',
    color: '#90a4ae',
    unlockedBy: 'magico',
    mandingasNaLoja: true,
    build: () => standardDeck('p'),
    startConsumables: ['mandinga'],
  },
  {
    id: 'abandonado',
    name: 'Baralho Sem Figuras',
    description: 'Sem Q, J e K. As 40 cartas são completadas com números repetidos.',
    icon: '🚷',
    color: '#546e7a',
    unlockedBy: 'nebulosa',
    build: () => {
      const numeros = standardDeck('p').filter((c) => !['Q', 'J', 'K'].includes(c.rank));
      const deck = [...numeros];
      for (let i = 0; deck.length < 40; i++) deck.push(makeCard(numeros[i % numeros.length].rank, numeros[i % numeros.length].suit, 'p'));
      return deck;
    },
  },
  {
    id: 'xadrez',
    name: 'Baralho Xadrez',
    description: 'Só Espadas e Copas, com cada carta em dobro.',
    icon: '♟️',
    color: '#37474f',
    unlockedBy: 'abandonado',
    build: () => {
      const deck: Card[] = [];
      for (const suit of ['espadas', 'copas'] as const) for (const r of RANKS) for (let k = 0; k < 2; k++) deck.push(makeCard(r, suit, 'p'));
      return deck;
    },
  },
  {
    id: 'zodiaco',
    name: 'Baralho do Horóscopo',
    description: 'Começa com os vales Liquidação, Vitrine e Prateleira de Pacotes.',
    icon: '♈',
    color: '#6d4c41',
    unlockedBy: 'xadrez',
    build: () => standardDeck('p'),
    setup: (run) => {
      run.vouchers.push('liquidacao', 'vitrine', 'prateleira');
    },
  },
  {
    id: 'pintado',
    name: 'Baralho Pintado',
    description: '+1 slot de consumível, mas −1 slot de Coringa.',
    icon: '🎨',
    color: '#d81b60',
    unlockedBy: 'zodiaco',
    build: () => standardDeck('p'),
    setup: (run) => {
      run.consumableSlots += 1;
      run.jokerSlots = Math.max(1, run.jokerSlots - 1);
    },
  },
  {
    id: 'anaglifo',
    name: 'Baralho 3D',
    description: 'Depois de cada Chefe vencido, ganha a Tag do Dobro.',
    icon: '🕶️',
    color: '#00acc1',
    unlockedBy: 'pintado',
    dobroAposChefe: true,
    build: () => standardDeck('p'),
  },
  {
    id: 'batida',
    name: 'Baralho Batida',
    description: 'Ao pontuar, Fichas e Mult viram a média dos dois. Metas dobradas.',
    icon: '🍹',
    color: '#7fd1ae',
    unlockedBy: 'anaglifo',
    targetFactor: 2,
    balancaFichas: true,
    build: () => standardDeck('p'),
  },
  {
    id: 'maluco',
    name: 'Baralho Maluco',
    description: 'Valores e naipes de todas as cartas são sorteados ao acaso.',
    icon: '🌀',
    color: '#ff7043',
    unlockedBy: 'batida',
    build: (rng) =>
      Array.from({ length: 40 }, () => makeCard(RANKS[int(rng, RANKS.length)], SUITS[int(rng, SUITS.length)], 'p')),
  },
];

export const DECK_BY_ID = Object.fromEntries(DECKS.map((d) => [d.id, d])) as Record<string, DeckDef>;
export const DECK_DEFAULT = 'vermelho';

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
