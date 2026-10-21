import { defineJokers } from '../../engine/jokerApi';
import { aiRan, isFechou, isVirada } from '../../engine/handFacts';
import { chance } from '../../engine/rng';

export default defineJokers([
  {
    id: 'saci',
    name: 'Saci',
    rarity: 'incomum',
    icon: '🌪️',
    color: '#ff3b3b',
    initialState: () => ({ n: 0 }),
    description: (s) => `Ganha +2 Mult toda vez que você vence as 2 primeiras rodadas direto. (Atual: +${2 * (s.state.n ?? 0)} Mult)`,
    beforeScore: (ctx, self) => {
      if (isFechou(ctx.hand)) self.state.n += 1;
    },
    score: (ctx, self) => {
      if (self.state.n > 0) ctx.mult(2 * self.state.n);
    },
  },
  {
    id: 'zePilintra',
    name: 'Zé Pilintra',
    rarity: 'incomum',
    icon: '🎩',
    color: '#f4f4f4',
    description: () => 'A primeira aposta perdida em cada Blind não custa dinheiro.',
    passive: { firstLossFree: true },
  },
  {
    id: 'curupira',
    name: 'Curupira',
    rarity: 'incomum',
    icon: '👣',
    color: '#ff7b2e',
    description: () => '×1.5 Mult se a primeira carta que você jogou na mão venceu a rodada.',
    score: (ctx) => {
      if (ctx.hand.rounds[0]?.outcome === 'player') ctx.xmult(1.5);
    },
  },
  {
    id: 'truqueiro',
    name: 'Truqueiro',
    rarity: 'incomum',
    icon: '🃏',
    color: '#ffcc00',
    description: () => '+3 Mult para cada aposta sua que o adversário aceitou na mão.',
    score: (ctx) => {
      if (ctx.playerBetsAccepted > 0) ctx.mult(3 * ctx.playerBetsAccepted);
    },
  },
  {
    id: 'cachaceiro',
    name: 'Cachaceiro',
    rarity: 'incomum',
    icon: '🥃',
    color: '#d08a2c',
    description: () => '+25 Fichas por nível de aposta da mão (Truco 1 … Doze 4). −1 mão em todo Blind.',
    blindStart: (ctx) => {
      if (ctx.blind.handsLeft > 1) {
        ctx.blind.handsLeft -= 1;
        ctx.blind.rules.hands -= 1;
      }
    },
    score: (ctx) => {
      if (ctx.betLevel > 0) ctx.chips(25 * ctx.betLevel);
    },
  },
  {
    id: 'mula',
    name: 'Mula sem Cabeça',
    rarity: 'incomum',
    icon: '🔥',
    color: '#ff5a1f',
    description: () => 'A vira fica escondida para você. ×3 Mult ao vencer a mão.',
    passive: { hidesVira: true },
    score: (ctx) => ctx.xmult(3),
  },
  {
    id: 'donaBenta',
    name: 'Dona Benta',
    rarity: 'incomum',
    icon: '👵',
    color: '#ffd1a8',
    description: () => 'Ao vencer o Blind, ganha $2 por Coringa que você já vendeu na run (máx. $12).',
    blindEnd: (ctx) => {
      const v = Math.min(12, 2 * ctx.run.stats.jokersSold);
      if (v > 0) ctx.money(v, 'Dona Benta');
    },
  },
  {
    id: 'iara',
    name: 'Iara',
    rarity: 'incomum',
    icon: '🧜‍♀️',
    color: '#3fd0c9',
    description: () => '×2 Mult se você perdeu a 1ª rodada e virou a mão.',
    score: (ctx) => {
      if (isVirada(ctx.hand)) ctx.xmult(2);
    },
  },
  {
    id: 'lobisomem',
    name: 'Lobisomem',
    rarity: 'incomum',
    icon: '🐺',
    color: '#9a8cff',
    description: () => '+5 Mult por mão perdida neste Blind.',
    score: (ctx) => {
      if (ctx.blind.handsLost > 0) ctx.mult(5 * ctx.blind.handsLost);
    },
  },
  {
    id: 'cuca',
    name: 'Cuca',
    rarity: 'incomum',
    icon: '🐊',
    color: '#5fbf3f',
    description: () => '×2 Mult se o adversário correu da sua aposta.',
    score: (ctx) => {
      if (aiRan(ctx.hand)) ctx.xmult(2);
    },
  },
  {
    id: 'bilheteiro',
    name: 'Vendedor de Bilhete',
    rarity: 'incomum',
    icon: '🎟️',
    color: '#ffe066',
    description: () => '1 chance em 3 de ganhar $4 ao vencer uma mão.',
    score: (ctx) => {
      if (chance(ctx.run.rng, 1 / 3)) ctx.money(4, 'Deu no bicho!');
    },
  },
  {
    id: 'rezadeira',
    name: 'Rezadeira',
    rarity: 'incomum',
    icon: '🙏',
    color: '#c9b6ff',
    description: () => '+40 Fichas por canga na mão.',
    score: (ctx) => {
      if (ctx.ties > 0) ctx.chips(40 * ctx.ties);
    },
  },
  {
    id: 'mestreSala',
    name: 'Mestre-Sala',
    rarity: 'incomum',
    icon: '💃',
    color: '#ff7ad9',
    description: () => 'A carta que venceu a 1ª rodada pontua mais uma vez.',
    retrigger: (_ctx, _self, round) => (round.index === 0 ? 1 : 0),
  },
  {
    id: 'caixeiro',
    name: 'Caixeiro-Viajante',
    rarity: 'incomum',
    icon: '🧳',
    color: '#b07a4a',
    description: () => 'Rolar a loja custa $2 a menos.',
    passive: { rerollDiscount: 2 },
  },
]);
