// Cartas, força, vira e manilha.

export const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'] as const;
export type Rank = (typeof RANKS)[number];

/** Do mais fraco para o mais forte como manilha. */
export const SUITS = ['ouros', 'espadas', 'copas', 'paus'] as const;
export type Suit = (typeof SUITS)[number];

export type Edition = 'folheada' | 'holografica' | 'fosforescente' | 'marcada';
export type Seal = 'dourado' | 'roxo' | 'vermelho' | 'azul';

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
  edition?: Edition;
  seal?: Seal;
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  ouros: '♦',
  espadas: '♠',
  copas: '♥',
  paus: '♣',
};

export const SUIT_NAME: Record<Suit, string> = {
  ouros: 'Ouros',
  espadas: 'Espadas',
  copas: 'Copas',
  paus: 'Paus',
};

export const RANK_NAME: Record<Rank, string> = {
  '4': 'Quatro',
  '5': 'Cinco',
  '6': 'Seis',
  '7': 'Sete',
  Q: 'Dama',
  J: 'Valete',
  K: 'Rei',
  A: 'Ás',
  '2': 'Dois',
  '3': 'Três',
};

export const EDITION_NAME: Record<Edition, string> = {
  folheada: 'Folheada',
  holografica: 'Holográfica',
  fosforescente: 'Fosforescente',
  marcada: 'Marcada',
};

export const SEAL_NAME: Record<Seal, string> = {
  dourado: 'Selo Dourado',
  roxo: 'Selo Roxo',
  vermelho: 'Selo Vermelho',
  azul: 'Selo Azul',
};

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function suitIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

export function manilhaFromVira(vira: Rank): Rank {
  return RANKS[(rankIndex(vira) + 1) % RANKS.length];
}

export function isManilha(card: Pick<Card, 'rank'>, manilha: Rank): boolean {
  return card.rank === manilha;
}

export function isZap(card: Pick<Card, 'rank' | 'suit'>, manilha: Rank): boolean {
  return card.rank === manilha && card.suit === 'paus';
}

/** Força numérica: 0..9 para cartas comuns, 100..103 para manilhas. */
export function strength(card: Pick<Card, 'rank' | 'suit'>, manilha: Rank): number {
  if (card.rank === manilha) return 100 + suitIndex(card.suit);
  return rankIndex(card.rank);
}

/** >0 se a vence b, <0 se b vence a, 0 se empatam (canga). */
export function compareCards(
  a: Pick<Card, 'rank' | 'suit'>,
  b: Pick<Card, 'rank' | 'suit'>,
  manilha: Rank,
): number {
  return strength(a, manilha) - strength(b, manilha);
}

/** Fichas que a carta gera ao vencer uma rodada. */
export const MANILHA_SUIT_BONUS: Record<Suit, number> = { ouros: 0, espadas: 2, copas: 4, paus: 8 };

export function cardChips(card: Pick<Card, 'rank' | 'suit'>, manilha: Rank): number {
  if (card.rank === manilha) return 20 + MANILHA_SUIT_BONUS[card.suit];
  return rankIndex(card.rank) + 4;
}

// Ids só identificam cartas (React keys, seleção); nunca entram em decisões de jogo.
// O token de sessão evita colisão com ids de uma run salva e recarregada.
let idCounter = 0;
const SESSION = Math.floor(Math.random() * 36 ** 4).toString(36);
export function makeCard(rank: Rank, suit: Suit, prefix = 'c'): Card {
  idCounter++;
  return { id: `${prefix}${SESSION}${idCounter.toString(36)}`, rank, suit };
}

export function cloneCard(card: Card, prefix = 'c'): Card {
  return { ...makeCard(card.rank, card.suit, prefix), edition: card.edition, seal: card.seal };
}

export function standardDeck(prefix = 'c'): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(makeCard(rank, suit, prefix));
  return deck;
}

export function cardLabel(card: Pick<Card, 'rank' | 'suit'>): string {
  return `${card.rank}${SUIT_SYMBOL[card.suit]}`;
}

export function cardLongName(card: Pick<Card, 'rank' | 'suit'>): string {
  return `${RANK_NAME[card.rank]} de ${SUIT_NAME[card.suit]}`;
}

export function sameFace(a: Pick<Card, 'rank' | 'suit'>, b: Pick<Card, 'rank' | 'suit'>): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}
