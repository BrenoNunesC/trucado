// Coringas de Fichas com mecânicas próprias (inspiradas no Balatro): cada um pontua de um jeito
// diferente, seja por figura, por dinheiro, por cartas especiais, por ás ou por crescimento.

import { defineJokers } from '../../engine/jokerApi';

export default defineJokers([
  {
    id: 'figurao',
    name: 'Figurão',
    rarity: 'incomum',
    icon: '🎩',
    color: '#c9a227',
    description: () => '+30 Fichas para cada rodada vencida com figura (Q, J ou K).',
    scoreCard: (ctx, _self, round) => {
      if (['Q', 'J', 'K'].includes(round.card.rank)) ctx.chips(30, 'Figurão');
    },
  },
  {
    id: 'cofrinho',
    name: 'Cofrinho',
    rarity: 'comum',
    icon: '🐷',
    color: '#f2a7b5',
    description: () => '+1 Fichas para cada $2 que você tem.',
    score: (ctx) => {
      const n = Math.floor(ctx.run.money / 2);
      if (n > 0) ctx.chips(n, 'Cofrinho');
    },
  },
  {
    id: 'chaveiro',
    name: 'Chaveiro',
    rarity: 'raro',
    icon: '🔑',
    color: '#9fd3e6',
    initialState: () => ({ chips: 0 }),
    description: (s) => `+${s.state.chips ?? 0} Fichas. Ganha +5 Fichas a cada mão vencida, para sempre nesta run.`,
    score: (ctx, self) => {
      if (self.state.chips > 0) ctx.chips(self.state.chips, 'Chaveiro');
    },
    handEnd: (ctx, self) => {
      if (ctx.won) self.state.chips += 5;
    },
  },
  {
    id: 'pedraBruta',
    name: 'Pedra Bruta',
    rarity: 'comum',
    icon: '🪨',
    color: '#8c8f99',
    description: () => '+25 Fichas para cada rodada vencida com carta que tem Edição ou Selo.',
    scoreCard: (ctx, _self, round) => {
      if (round.card.edition || round.card.seal) ctx.chips(25, 'Pedra Bruta');
    },
  },
  {
    id: 'sabichao',
    name: 'Sabichão',
    rarity: 'incomum',
    icon: '🧠',
    color: '#7fb3ff',
    description: () => '+40 Fichas para cada rodada vencida com Ás.',
    scoreCard: (ctx, _self, round) => {
      if (round.card.rank === 'A') ctx.chips(40, 'Sabichão');
    },
  },
]);
