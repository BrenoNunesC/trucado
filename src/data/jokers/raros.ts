import { defineJokers } from '../../engine/jokerApi';

export default defineJokers([
  {
    id: 'zapDourado',
    name: 'Zap Dourado',
    rarity: 'raro',
    icon: '✨',
    color: '#ffd700',
    description: () => '×1.5 Mult para cada rodada vencida com manilha.',
    scoreCard: (ctx, _self, round) => {
      if (round.card.rank === round.manilha) ctx.xmult(1.5);
    },
  },
  {
    id: 'coronel',
    name: 'Coronel do Truco',
    rarity: 'raro',
    icon: '🎖️',
    color: '#c0a060',
    description: () => '×2 Mult se a mão valer Seis ou mais.',
    score: (ctx) => {
      if (ctx.betLevel >= 2) ctx.xmult(2);
    },
  },
  {
    id: 'mapinguari',
    name: 'Mapinguari',
    rarity: 'raro',
    icon: '👹',
    color: '#a05a2c',
    initialState: () => ({ x: 1 }),
    description: (s) => `Ganha ×0.25 Mult a cada canga na run. (Atual: ×${(s.state.x ?? 1).toFixed(2)})`,
    beforeScore: (ctx, self) => {
      // cangas desta mão já contam
      if (ctx.ties > 0) {
        self.state.x += 0.25 * ctx.ties;
        self.state.counted = 1;
      }
    },
    score: (ctx, self) => {
      if (self.state.x > 1) ctx.xmult(self.state.x);
    },
    handEnd: (ctx, self) => {
      if (!self.state.counted && ctx.ties > 0) self.state.x += 0.25 * ctx.ties;
      self.state.counted = 0;
    },
  },
  {
    id: 'boto',
    name: 'Boto Cor-de-Rosa',
    rarity: 'raro',
    icon: '🐬',
    color: '#ff9ecf',
    description: () => 'Copia o efeito de pontuação do Coringa à sua direita.',
    passive: { copyRight: true },
  },
  {
    id: 'bicheiro',
    name: 'Bicheiro',
    rarity: 'raro',
    icon: '🦁',
    color: '#e8b04a',
    description: () => '+1 Mult para cada $3 que você tem.',
    score: (ctx) => {
      const n = Math.floor(ctx.run.money / 3);
      if (n > 0) ctx.mult(n);
    },
  },
  {
    id: 'lampiao',
    name: 'Lampião',
    rarity: 'raro',
    icon: '🤠',
    color: '#c28a3a',
    description: () => '×2.5 Mult se a jogada for Zap, Casal de Manilhas, Casal Maior ou Três Manilhas.',
    score: (ctx) => {
      if (['zap', 'casalManilhas', 'casalMaior', 'tresManilhas'].includes(ctx.category)) ctx.xmult(2.5);
    },
  },
  {
    id: 'negrinho',
    name: 'Negrinho do Pastoreio',
    rarity: 'raro',
    icon: '🕯️',
    color: '#ffe9a8',
    description: () => 'No início de cada Blind, cria uma Gíria aleatória (se houver espaço).',
    blindStart: (ctx) => {
      ctx.addConsumable('giria');
    },
  },
]);
