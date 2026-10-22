// Coringas de Paus: o naipe do Zap, a carta mais forte do truco.

import { defineJokers } from '../../engine/jokerApi';

export default defineJokers([
  {
    id: 'pauBrasil',
    name: 'Pau-Brasil',
    rarity: 'raro',
    icon: '🌳',
    color: '#3f8a4a',
    description: () => '×1.4 Mult para cada rodada vencida com uma carta de Paus (o Zap conta).',
    scoreCard: (ctx, _self, round) => {
      if (round.card.suit === 'paus') ctx.xmult(1.4);
    },
  },
]);
