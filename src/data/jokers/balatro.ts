// Coringas inspirados no Balatro, adaptados às regras do Truco. Cada um traz uma mecânica
// do jogo original (sumir, vender mais caro, crescer por jogada, vagas livres, dinheiro não gasto).

import { SUIT_NAME, SUITS } from '../../engine/cards';
import { defineJokers } from '../../engine/jokerApi';
import { next } from '../../engine/rng';

const FIGURA = ['Q', 'J', 'K'];

export default defineJokers([
  {
    id: 'showman',
    name: 'Showman',
    rarity: 'incomum',
    icon: '🎪',
    color: '#ff6fb1',
    description: () => 'Coringas repetidos podem aparecer na loja e nos pacotes.',
    passive: { allowDuplicates: true },
  },
  {
    id: 'tioMichel',
    name: 'Tio Michel',
    rarity: 'comum',
    icon: '🍌',
    color: '#ffe066',
    description: () => '+15 Mult. No fim de cada Blind, 1 chance em 6 de ele sumir.',
    score: (ctx) => ctx.mult(15),
    blindEnd: (ctx, self) => {
      if (next(ctx.run.rng) < 1 / 6) ctx.run.jokers = ctx.run.jokers.filter((j) => j !== self);
    },
  },
  {
    id: 'ovoDePascoa',
    name: 'Ovo de Páscoa',
    rarity: 'comum',
    icon: '🥚',
    color: '#fff3d6',
    description: () => 'Vale mais na venda: ganha $3 de valor a cada Blind vencido.',
    blindEnd: (_ctx, self) => {
      self.cost += 3;
    },
  },
  {
    id: 'supernova',
    name: 'Supernova',
    rarity: 'incomum',
    icon: '🌠',
    color: '#8fd0ff',
    initialState: () => ({}),
    description: () => '+1 Mult para cada vez que você já jogou esta Jogada na run.',
    score: (ctx, self) => {
      const n = self.state[ctx.category] ?? 0;
      if (n > 0) ctx.mult(n, 'Supernova');
    },
    handEnd: (ctx, self) => {
      if (ctx.category) self.state[ctx.category] = (self.state[ctx.category] ?? 0) + 1;
    },
  },
  {
    id: 'gabarito',
    name: 'Gabarito',
    rarity: 'incomum',
    icon: '📐',
    color: '#c0c8d8',
    description: () => '×1.25 Mult para cada vaga livre de Coringa.',
    score: (ctx) => {
      const vagas = ctx.run.jokerSlots - ctx.run.jokers.length;
      if (vagas > 0) ctx.xmult(Math.pow(1.25, vagas), 'Gabarito');
    },
  },
  {
    id: 'fiado',
    name: 'Fiado',
    rarity: 'comum',
    icon: '🧾',
    color: '#e8d8a8',
    description: () => 'Ganha $2 por blefe que sobrou no fim do Blind.',
    blindEnd: (ctx) => {
      const n = ctx.blind.bluffsLeft;
      if (n > 0) ctx.money(2 * n, 'Fiado');
    },
  },
  {
    id: 'mesaMistica',
    name: 'Mesa Mística',
    rarity: 'comum',
    icon: '🔮',
    color: '#b57cff',
    description: () => '+15 Mult se você não tem mais blefes no Blind.',
    score: (ctx) => {
      if (ctx.blind.bluffsLeft === 0) ctx.mult(15, 'Mesa Mística');
    },
  },
  {
    id: 'naipeDaVez',
    name: 'Naipe da Vez',
    rarity: 'raro',
    icon: '🎯',
    color: '#ff8fa3',
    initialState: () => ({ suit: 0 }),
    description: (s) =>
      `×1.5 Mult para cada rodada vencida com ${SUIT_NAME[SUITS[s.state.suit ?? 0]]}. O naipe muda a cada mão.`,
    scoreCard: (ctx, self, round) => {
      if (round.card.suit === SUITS[self.state.suit]) ctx.xmult(1.5, 'Naipe da Vez');
    },
    handEnd: (_ctx, self) => {
      self.state.suit = ((self.state.suit ?? 0) + 1) % SUITS.length;
    },
  },
  {
    id: 'fotografo',
    name: 'Fotógrafo',
    rarity: 'comum',
    icon: '📷',
    color: '#d9d9d9',
    description: () => '×2 Mult na primeira figura (Q, J ou K) vencedora da mão.',
    scoreCard: (ctx, _self, round) => {
      const primeira = ctx.roundsWon.find((r) => FIGURA.includes(r.card.rank));
      if (primeira === round) ctx.xmult(2, 'Fotógrafo');
    },
  },
]);
