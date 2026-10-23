// Segunda leva de Coringas: petiscos e bebidas de balcão, torcida, jogadas especiais,
// economia e as lendas do sertão. Só usam os ganchos que o motor já oferece.

import { defineJokers } from '../../engine/jokerApi';

export default defineJokers([
  // ---------------------------------------------------------------- comuns
  {
    id: 'cafezinho',
    name: 'Cafezinho',
    rarity: 'comum',
    icon: '☕',
    color: '#8a5a2e',
    description: () => '+2 Mult para cada Coringa seu (máx. +10).',
    score: (ctx) => ctx.mult(Math.min(10, 2 * ctx.run.jokers.length)),
  },
  {
    id: 'farofa',
    name: 'Farofa',
    rarity: 'comum',
    icon: '🥣',
    color: '#d8b060',
    description: () => '+5 Fichas para cada carta do baralho acima de 40 (máx. +50).',
    score: (ctx) => {
      const extra = ctx.run.deck.length - 40;
      if (extra > 0) ctx.chips(Math.min(50, 5 * extra));
    },
  },
  {
    id: 'quentinha',
    name: 'Quentinha',
    rarity: 'comum',
    icon: '🍱',
    color: '#c8642a',
    description: () => '+40 Fichas na primeira mão de cada Blind.',
    score: (ctx) => {
      if (ctx.blind.handsPlayed === 1) ctx.chips(40);
    },
  },
  {
    id: 'guarana',
    name: 'Guaraná',
    rarity: 'comum',
    icon: '🥤',
    color: '#c8302a',
    description: () => '+5 Mult se você venceu exatamente 2 rodadas.',
    score: (ctx) => {
      if (ctx.roundsWon.length === 2) ctx.mult(5);
    },
  },
  {
    id: 'pipoca',
    name: 'Pipoca',
    rarity: 'comum',
    icon: '🍿',
    color: '#f3e6a0',
    description: () => '+4 Mult para cada rodada vencida com um 4, 5, 6 ou 7.',
    scoreCard: (ctx, _self, round) => {
      if (['4', '5', '6', '7'].includes(round.card.rank)) ctx.mult(4);
    },
  },
  {
    id: 'brigadeiro',
    name: 'Brigadeiro',
    rarity: 'comum',
    icon: '🍫',
    color: '#5a3010',
    description: () => 'Ganha $1 a cada mão vencida.',
    handEnd: (ctx) => {
      if (ctx.won) ctx.money(1, 'Brigadeiro');
    },
  },
  {
    id: 'chinelada',
    name: 'Chinelada',
    rarity: 'comum',
    icon: '🩴',
    color: '#3d8bff',
    description: () => '+7 Mult se o adversário pediu aposta e você venceu mesmo assim.',
    score: (ctx) => {
      if (ctx.hand.bets.some((b) => b.by === 'ai')) ctx.mult(7);
    },
  },
  {
    id: 'isqueiro',
    name: 'Isqueiro',
    rarity: 'comum',
    icon: '🔥',
    color: '#ff8c3a',
    description: () => '+6 Mult para cada rodada que você perdeu nesta mão (a virada compensa).',
    score: (ctx) => {
      const lost = ctx.hand.rounds.filter((r) => r.outcome === 'ai').length;
      if (lost > 0) ctx.mult(6 * lost);
    },
  },
  // ---------------------------------------------------------------- incomuns
  {
    id: 'churrasqueira',
    name: 'Churrasqueira',
    rarity: 'incomum',
    icon: '🍖',
    color: '#c8452a',
    description: () => 'Ganha $6 ao vencer um Chefe.',
    bossDefeated: (ctx) => ctx.money(6, 'Churrasqueira'),
  },
  {
    id: 'arbitro',
    name: 'Apito do Árbitro',
    rarity: 'incomum',
    icon: '🧑‍⚖️',
    color: '#222222',
    description: () => 'Para cada canga na mão: +20 Fichas e +3 Mult.',
    score: (ctx) => {
      if (ctx.ties > 0) {
        ctx.chips(20 * ctx.ties);
        ctx.mult(3 * ctx.ties);
      }
    },
  },
  {
    id: 'torcida',
    name: 'Torcida Organizada',
    rarity: 'incomum',
    icon: '📣',
    color: '#4bc292',
    initialState: () => ({ m: 0 }),
    description: (s) => `Ganha +2 Mult a cada mão vencida; zera no começo de cada Blind. (Atual: +${s.state.m ?? 0})`,
    blindStart: (_ctx, self) => {
      self.state.m = 0;
    },
    score: (ctx, self) => {
      if (self.state.m > 0) ctx.mult(self.state.m);
    },
    handEnd: (ctx, self) => {
      if (ctx.won) self.state.m += 2;
    },
  },
  {
    id: 'mestreDaVirada',
    name: 'Mestre da Virada',
    rarity: 'incomum',
    icon: '🔄',
    color: '#8a71e1',
    description: () => '+15 Mult quando a Jogada é Virada.',
    score: (ctx) => {
      if (ctx.category === 'virada') ctx.mult(15);
    },
  },
  {
    id: 'reiDoPeDeMesa',
    name: 'Rei do Pé de Mesa',
    rarity: 'incomum',
    icon: '🍽️',
    color: '#a8641e',
    description: () => '×2 Mult quando a Jogada é Pé de Mesa.',
    score: (ctx) => {
      if (ctx.category === 'peDeMesa') ctx.xmult(2);
    },
  },
  {
    id: 'arregao',
    name: 'Arregão',
    rarity: 'incomum',
    icon: '🐔',
    color: '#f3b958',
    description: () => 'Quando o adversário corre da sua aposta: +20 Mult e +$4.',
    score: (ctx) => {
      if (ctx.category === 'arregou') {
        ctx.mult(20);
        ctx.money(4, 'Arregão +$4');
      }
    },
  },
  {
    id: 'fechador',
    name: 'Fechador',
    rarity: 'incomum',
    icon: '🔒',
    color: '#56676a',
    description: () => '+12 Mult quando a Jogada é Fechou.',
    score: (ctx) => {
      if (ctx.category === 'fechou') ctx.mult(12);
    },
  },
  {
    id: 'carteiro',
    name: 'Carteiro',
    rarity: 'incomum',
    icon: '✉️',
    color: '#ffd34d',
    description: () => '+50 Fichas na última mão do Blind.',
    score: (ctx) => {
      if (ctx.blind.handsLeft === 0) ctx.chips(50);
    },
  },
  {
    id: 'passista',
    name: 'Passista',
    rarity: 'incomum',
    icon: '💃',
    color: '#ff5fa8',
    description: () => '+10 Mult para cada rodada vencida com manilha.',
    scoreCard: (ctx, _self, round) => {
      if (round.card.rank === round.manilha) ctx.mult(10);
    },
  },
  // ---------------------------------------------------------------- raros
  {
    id: 'gerente',
    name: 'Gerente do Bar',
    rarity: 'raro',
    icon: '👔',
    color: '#3d6fb8',
    description: () => '+4 Mult para cada Coringa à direita dele.',
    score: (ctx, self) => {
      const right = ctx.run.jokers.length - ctx.run.jokers.indexOf(self) - 1;
      if (right > 0) ctx.mult(4 * right);
    },
  },
  {
    id: 'maoDeVaca',
    name: 'Mão-de-Vaca',
    rarity: 'raro',
    icon: '🐄',
    color: '#e8e2c8',
    description: () => '×2 Mult se o seu baralho tem 24 cartas ou menos; senão ×1.2.',
    score: (ctx) => ctx.xmult(ctx.run.deck.length <= 24 ? 2 : 1.2),
  },
  {
    id: 'ganancioso',
    name: 'Ganancioso',
    rarity: 'raro',
    icon: '🤑',
    color: '#4bc292',
    description: () => '+×0.25 Mult para cada $10 que você tem (máx. ×3).',
    score: (ctx) => {
      const n = Math.min(8, Math.floor(ctx.run.money / 10));
      if (n > 0) ctx.xmult(1 + 0.25 * n);
    },
  },
  {
    id: 'donoDoSebo',
    name: 'Dono do Sebo',
    rarity: 'raro',
    icon: '📚',
    color: '#a8844a',
    description: () => '+×0.25 Mult para cada Coringa que você já vendeu na run (máx. ×3).',
    score: (ctx) => {
      const n = Math.min(8, ctx.run.stats.jokersSold);
      if (n > 0) ctx.xmult(1 + 0.25 * n);
    },
  },
  // ---------------------------------------------------------------- lendários
  {
    id: 'padreCicero',
    name: 'Padre Cícero',
    rarity: 'lendario',
    icon: '⛪',
    color: '#f3efe6',
    description: () => '×1.5 Mult para cada rodada vencida.',
    scoreCard: (ctx) => ctx.xmult(1.5),
  },
  {
    id: 'mariaBonita',
    name: 'Maria Bonita',
    rarity: 'lendario',
    icon: '🌹',
    color: '#e8457a',
    description: () => '×2 Mult. ×3 se o Lampião também estiver entre os seus Coringas.',
    score: (ctx) => ctx.xmult(ctx.run.jokers.some((j) => j.id === 'lampiao') ? 3 : 2),
  },
]);
