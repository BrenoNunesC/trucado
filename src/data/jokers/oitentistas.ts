// Coringas da coleção "Anos 80": fliperama, fita cassete e TV de tubo.

import { defineJokers } from '../../engine/jokerApi';

export default defineJokers([
  // ---------------------------------------------------------------- comuns
  {
    id: 'fitaK7',
    name: 'Fita K7',
    rarity: 'comum',
    icon: '📼',
    color: '#3de0ff',
    description: () => '+6 Mult se você venceu a 1ª rodada.',
    score: (ctx) => {
      if (ctx.hand.rounds[0]?.outcome === 'player') ctx.mult(6);
    },
  },
  {
    id: 'walkman',
    name: 'Walkman',
    rarity: 'comum',
    icon: '🎧',
    color: '#ffb547',
    description: () => '+40 Fichas se a mão não teve nenhuma aposta.',
    score: (ctx) => {
      if (ctx.betLevel === 0) ctx.chips(40);
    },
  },
  {
    id: 'fliperama',
    name: 'Fliperama',
    rarity: 'comum',
    icon: '🕹️',
    color: '#ff3d7f',
    description: () => '+2 Mult para cada mão que ainda resta no Blind.',
    score: (ctx) => {
      if (ctx.blind.handsLeft > 0) ctx.mult(2 * ctx.blind.handsLeft);
    },
  },
  {
    id: 'chicleteBola',
    name: 'Chiclete de Bola',
    rarity: 'comum',
    icon: '🫧',
    color: '#ff9ad5',
    description: () => '+30 Fichas se você blefou nesta mão.',
    score: (ctx) => {
      if (ctx.blind.handFlags.bluffedThisHand) ctx.chips(30);
    },
  },
  {
    id: 'orelhao',
    name: 'Orelhão',
    rarity: 'comum',
    icon: '☎️',
    color: '#ffd34d',
    description: () => 'Ganha $1 toda mão vencida com Na Raça (a jogada mais simples).',
    handEnd: (ctx) => {
      if (ctx.won && ctx.category === 'naRaca') ctx.money(1, 'Orelhão');
    },
  },
  {
    id: 'cuboMagico',
    name: 'Cubo Mágico',
    rarity: 'comum',
    icon: '🧊',
    color: '#7dff6a',
    description: () => '+4 Mult se as 3 cartas recebidas forem de naipes diferentes.',
    score: (ctx) => {
      const suits = new Set(ctx.hand.dealt.player.map((c) => c.suit));
      if (ctx.hand.dealt.player.length === 3 && suits.size === 3) ctx.mult(4);
    },
  },
  // ---------------------------------------------------------------- incomuns
  {
    id: 'videocassete',
    name: 'Videocassete',
    rarity: 'incomum',
    icon: '📺',
    color: '#b47aff',
    description: () => 'A carta vencedora da última rodada pontua mais 1 vez.',
    retrigger: (ctx, _self, round) => (round === ctx.roundsWon[ctx.roundsWon.length - 1] ? 1 : 0),
  },
  {
    id: 'patins',
    name: 'Patins',
    rarity: 'incomum',
    icon: '🛼',
    color: '#5affc8',
    initialState: () => ({ mult: 0 }),
    description: (s) => `Ganha +1 Mult a cada mão vencida seguida; zera ao perder. (Atual: +${s.state.mult ?? 0})`,
    score: (ctx, self) => {
      if (self.state.mult > 0) ctx.mult(self.state.mult);
    },
    handEnd: (ctx, self) => {
      if (ctx.won) self.state.mult += 1;
      else if (ctx.hand.result?.winner === 'ai') self.state.mult = 0;
    },
  },
  {
    id: 'teleCatch',
    name: 'Telecatch',
    rarity: 'incomum',
    icon: '🤼',
    color: '#ff5b5b',
    description: () => '×1.5 Mult se o adversário aceitou uma aposta sua nesta mão.',
    score: (ctx) => {
      if (ctx.playerBetsAccepted > 0) ctx.xmult(1.5);
    },
  },
  // ---------------------------------------------------------------- raros
  {
    id: 'discoVoador',
    name: 'Disco Voador',
    rarity: 'raro',
    icon: '🛸',
    color: '#9ad7ff',
    description: () => '×2 Mult se você venceu a mão com Fechou ou melhor (sem perder rodada).',
    score: (ctx) => {
      const lost = ctx.hand.rounds.some((r) => r.outcome === 'ai');
      if (!lost && ctx.roundsWon.length >= 2) ctx.xmult(2);
    },
  },
  // ---------------------------------------------------------------- lendário
  {
    id: 'reiDoFliper',
    name: 'Rei do Fliper',
    rarity: 'lendario',
    icon: '🏆',
    color: '#ffd34d',
    description: () => '×3 Mult. Toda carta vencedora de manilha pontua mais 1 vez.',
    retrigger: (ctx, _self, round) => (ctx.isManilha(round.card) ? 1 : 0),
    score: (ctx) => ctx.xmult(3),
  },
]);
