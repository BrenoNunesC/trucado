// Coringas do boteco: cerveja, petisco e a mobília do bar.

import { defineJokers } from '../../engine/jokerApi';

export default defineJokers([
  // ---------------------------------------------------------------- comuns
  {
    id: 'seiscentos',
    name: 'Garrafa de 600',
    rarity: 'comum',
    icon: '🍺',
    color: '#d8a030',
    initialState: () => ({ mult: 12 }),
    description: (s) => `+${s.state.mult ?? 12} Mult. Perde 1 a cada mão jogada; acaba quando secar.`,
    score: (ctx, self) => ctx.mult(self.state.mult),
    handEnd: (_ctx, self) => {
      self.state.mult -= 1;
      if (self.state.mult <= 0) self.state.destroyed = 1;
    },
  },
  {
    id: 'copoAmericano',
    name: 'Copo Americano',
    rarity: 'comum',
    icon: '🥛',
    color: '#f3e6c4',
    description: () => '+12 Fichas para cada rodada que você venceu.',
    score: (ctx) => {
      if (ctx.roundsWon.length > 0) ctx.chips(12 * ctx.roundsWon.length);
    },
  },
  {
    id: 'chopeColarinho',
    name: 'Chope com Colarinho',
    rarity: 'comum',
    icon: '🍻',
    color: '#ffd34d',
    description: () => '+4 Mult. Mais +4 se a mão valia Truco ou mais.',
    score: (ctx) => ctx.mult(ctx.betLevel > 0 ? 8 : 4),
  },
  {
    id: 'torresmo',
    name: 'Porção de Torresmo',
    rarity: 'comum',
    icon: '🥓',
    color: '#c8642a',
    initialState: () => ({ chips: 60 }),
    description: (s) => `+${s.state.chips ?? 60} Fichas. Perde 5 a cada mão jogada.`,
    score: (ctx, self) => ctx.chips(self.state.chips),
    handEnd: (_ctx, self) => {
      self.state.chips -= 5;
      if (self.state.chips <= 0) self.state.destroyed = 1;
    },
  },
  {
    id: 'amendoim',
    name: 'Amendoim Japonês',
    rarity: 'comum',
    icon: '🥜',
    color: '#b8844a',
    description: () => '+2 Mult para cada mão já jogada neste Blind.',
    score: (ctx) => ctx.mult(2 * ctx.blind.handsPlayed),
  },
  {
    id: 'coxinha',
    name: 'Coxinha',
    rarity: 'comum',
    icon: '🍗',
    color: '#e0a040',
    description: () => 'Ganha $3 no fim de cada Blind vencido.',
    blindEnd: (ctx) => ctx.money(3, 'Coxinha'),
  },
  {
    id: 'tampinhas',
    name: 'Coleção de Tampinhas',
    rarity: 'comum',
    icon: '🧢',
    color: '#c8202b',
    initialState: () => ({ mult: 0 }),
    description: (s) => `Ganha +1 Mult cada vez que você vence uma mão com aposta. (Atual: +${s.state.mult ?? 0})`,
    score: (ctx, self) => {
      if (self.state.mult > 0) ctx.mult(self.state.mult);
    },
    handEnd: (ctx, self) => {
      if (ctx.won && ctx.hand.level > 0) self.state.mult += 1;
    },
  },
  // ---------------------------------------------------------------- incomuns
  {
    id: 'caipirinha',
    name: 'Caipirinha',
    rarity: 'incomum',
    icon: '🍹',
    color: '#8ad84a',
    description: () => '×1.5 Mult se você não blefou nesta mão.',
    score: (ctx) => {
      if (!ctx.blind.handFlags.bluffedThisHand) ctx.xmult(1.5);
    },
  },
  {
    id: 'engradado',
    name: 'Engradado',
    rarity: 'incomum',
    icon: '📦',
    color: '#a8641e',
    initialState: () => ({ mult: 0 }),
    description: (s) => `Ganha +1 Mult a cada mão jogada na run, vencida ou não. (Atual: +${s.state.mult ?? 0})`,
    score: (ctx, self) => {
      if (self.state.mult > 0) ctx.mult(self.state.mult);
    },
    handEnd: (_ctx, self) => {
      self.state.mult += 1;
    },
  },
  {
    id: 'garcomDoBar',
    name: 'Garçom',
    rarity: 'incomum',
    icon: '🤵',
    color: '#f3f0e4',
    description: () => 'No fim de cada Blind vencido, traz uma Gíria (se houver espaço).',
    blindEnd: (ctx) => {
      ctx.addConsumable('giria');
    },
  },
  {
    id: 'sinuca',
    name: 'Mesa de Sinuca',
    rarity: 'incomum',
    icon: '🎱',
    color: '#2e8a4a',
    description: () => '+15 Mult se você venceu a 3ª rodada.',
    score: (ctx) => {
      if (ctx.hand.rounds[2]?.outcome === 'player') ctx.mult(15);
    },
  },
  {
    id: 'bolinhoBacalhau',
    name: 'Bolinho de Bacalhau',
    rarity: 'incomum',
    icon: '🐟',
    color: '#d8b070',
    description: () => 'Cartas de Ouros vencedoras pontuam mais 1 vez.',
    retrigger: (_ctx, _self, round) => (round.card.suit === 'ouros' ? 1 : 0),
  },
  // ---------------------------------------------------------------- raros
  {
    id: 'barrilChope',
    name: 'Barril de Chope',
    rarity: 'raro',
    icon: '🛢️',
    color: '#c9a227',
    initialState: () => ({ x: 1 }),
    description: (s) => `Ganha ×0.2 Mult a cada mão vencida. (Atual: ×${(s.state.x ?? 1).toFixed(1)})`,
    score: (ctx, self) => {
      if (self.state.x > 1) ctx.xmult(Math.round(self.state.x * 10) / 10);
    },
    handEnd: (ctx, self) => {
      if (ctx.won) self.state.x += 0.2;
    },
  },
  {
    id: 'saideira',
    name: 'A Saideira',
    rarity: 'raro',
    icon: '🥂',
    color: '#ff8c3a',
    description: () => '×3 Mult na última mão do Blind.',
    score: (ctx) => {
      if (ctx.blind.handsLeft === 0) ctx.xmult(3);
    },
  },
  // ---------------------------------------------------------------- lendário
  {
    id: 'seuZe',
    name: 'Seu Zé do Bar',
    rarity: 'lendario',
    icon: '🧔',
    color: '#ffd34d',
    description: () => '×2 Mult e +$2 a cada mão vencida. A casa agradece a preferência.',
    score: (ctx) => {
      ctx.xmult(2);
      ctx.money(2, 'Seu Zé +$2');
    },
  },
]);
