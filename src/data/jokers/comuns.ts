import { defineJokers, type JokerDef } from '../../engine/jokerApi';
import { repeatedCards } from '../../engine/handFacts';
import type { Suit } from '../../engine/cards';

function suitJoker(id: string, name: string, icon: string, color: string, suit: Suit, suitName: string): JokerDef {
  return {
    id,
    name,
    rarity: 'comum',
    icon,
    color,
    description: () => `+3 Mult para cada rodada vencida com carta de ${suitName}.`,
    scoreCard: (ctx, _self, round) => {
      if (round.card.suit === suit) ctx.mult(3);
    },
  };
}

export default defineJokers([
  {
    id: 'pinguco',
    name: 'Pinguço',
    rarity: 'comum',
    icon: '🥴',
    color: '#f2b233',
    description: () => '+4 Mult.',
    score: (ctx) => ctx.mult(4),
  },
  {
    id: 'paoDeQueijo',
    name: 'Pão de Queijo',
    rarity: 'comum',
    icon: '🧀',
    color: '#f5d76e',
    description: () => '+25 Fichas.',
    score: (ctx) => ctx.chips(25),
  },
  {
    id: 'boitata',
    name: 'Boitatá',
    rarity: 'comum',
    icon: '🐍',
    color: '#ff6a2b',
    description: () => '+8 Fichas para cada manilha jogada na mão (por qualquer jogador).',
    score: (ctx) => {
      if (ctx.manilhasPlayed > 0) ctx.chips(8 * ctx.manilhasPlayed);
    },
  },
  {
    id: 'compadre',
    name: 'Compadre',
    rarity: 'comum',
    icon: '🤝',
    color: '#c98b4a',
    description: () => '+15 Fichas por carta repetida (mesmo valor) na mão recebida.',
    score: (ctx) => {
      const n = repeatedCards(ctx.hand.dealt.player);
      if (n > 0) ctx.chips(15 * n);
    },
  },
  {
    id: 'tioDoPave',
    name: 'Tio do Pavê',
    rarity: 'comum',
    icon: '🍰',
    color: '#f7c6d9',
    description: () => 'Ganha $2 a cada canga (empate de rodada), mesmo perdendo a mão.',
    handEnd: (ctx) => {
      if (ctx.ties > 0) ctx.money(2 * ctx.ties, 'É pavê ou pra comer?');
    },
  },
  suitJoker('ourives', 'Ourives', '💎', '#ff9d3a', 'ouros', 'Ouros'),
  suitJoker('coveiro', 'Coveiro', '⚰️', '#8aa0b8', 'espadas', 'Espadas'),
  suitJoker('namorador', 'Namorador', '💘', '#ff4d6d', 'copas', 'Copas'),
  suitJoker('lenhador', 'Lenhador', '🪓', '#6fcf6f', 'paus', 'Paus'),
  {
    id: 'peDePano',
    name: 'Pé de Pano',
    rarity: 'comum',
    icon: '🐎',
    color: '#d9a066',
    description: () => '+12 Mult se a jogada for Pé de Mesa (vencer na 3ª rodada).',
    score: (ctx) => {
      if (ctx.category === 'peDeMesa') ctx.mult(12);
    },
  },
  {
    id: 'garrafa',
    name: 'Garrafa de Pinga',
    rarity: 'comum',
    icon: '🍶',
    color: '#bfe3ff',
    description: () => '+3 Mult por blefe ainda disponível no Blind.',
    score: (ctx) => {
      if (ctx.blind.bluffsLeft > 0) ctx.mult(3 * ctx.blind.bluffsLeft);
    },
  },
  {
    id: 'tamborete',
    name: 'Tamborete',
    rarity: 'comum',
    icon: '🪑',
    color: '#a0703a',
    description: () => '+15 Fichas por mão restante no Blind.',
    score: (ctx) => {
      if (ctx.blind.handsLeft > 0) ctx.chips(15 * ctx.blind.handsLeft);
    },
  },
  {
    id: 'canetaBic',
    name: 'Caneta Bic',
    rarity: 'comum',
    icon: '🖊️',
    color: '#4d8dff',
    description: () => '+6 Mult se a mão foi apostada (Truco ou mais).',
    score: (ctx) => {
      if (ctx.betLevel > 0) ctx.mult(6);
    },
  },
  {
    id: 'pastel',
    name: 'Pastel de Feira',
    rarity: 'comum',
    icon: '🥟',
    color: '#f0c070',
    description: () => '+2 Mult por rodada vencida na mão.',
    score: (ctx) => {
      if (ctx.roundsWon.length > 0) ctx.mult(2 * ctx.roundsWon.length);
    },
  },
]);
