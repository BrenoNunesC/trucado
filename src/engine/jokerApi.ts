// Contrato dos Coringas. Um Coringa = objeto de dados + funções de efeito.
// Para criar um novo, veja o README ("Como adicionar um Coringa").

import type { Card, Rank } from './cards';
import type { BlindState, CategoryId, ConsumableKind, JokerInstance, Rarity, RunState } from './state';
import type { TrucoHand } from './truco';

export interface WonRound {
  card: Card;
  manilha: Rank;
  index: number;
}

/** Contexto disponível durante a pontuação. Chame chips/mult/xmult/money para gerar passos. */
export interface ScoreCtx {
  run: RunState;
  blind: BlindState;
  hand: TrucoHand;
  category: CategoryId;
  /** Nível de aposta valendo na mão (0..4). */
  betLevel: number;
  roundsWon: WonRound[];
  /** Quantas cangas houve na mão. */
  ties: number;
  /** Quantas manilhas foram jogadas na mão (pelos dois lados). */
  manilhasPlayed: number;
  /** Apostas do jogador aceitas pelo adversário nesta mão. */
  playerBetsAccepted: number;
  isManilha(card: Card): boolean;
  chips(n: number, label?: string): void;
  mult(n: number, label?: string): void;
  xmult(n: number, label?: string): void;
  money(n: number, label?: string): void;
  /** Mensagem informativa (sem número). */
  info(label: string): void;
}

export interface HandEndCtx {
  addConsumable(kind: ConsumableKind, id?: string): boolean;
  run: RunState;
  blind: BlindState;
  hand: TrucoHand;
  won: boolean;
  category: CategoryId | null;
  ties: number;
  money(n: number, label?: string): void;
}

export interface BlindCtx {
  run: RunState;
  blind: BlindState;
  money(n: number, label?: string): void;
  /** Cria um consumível se houver espaço. Sem id, sorteia um do tipo. */
  addConsumable(kind: ConsumableKind, id?: string): boolean;
}

export interface JokerDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Emoji ou glifo usado no ícone. */
  icon: string;
  /** Cor de destaque do ícone (CSS). */
  color?: string;
  /** Texto com valores explícitos. Recebe a instância para mostrar contadores. */
  description: (self: JokerInstance) => string;
  /** Preço base; se omitido, vem da raridade (balance.ts). */
  cost?: number;
  initialState?: () => Record<string, number>;

  /** Antes das cartas pontuarem. Pode alterar self.state (escalonáveis). */
  beforeScore?: (ctx: ScoreCtx, self: JokerInstance) => void;
  /** Depois de cada carta vencedora pontuar. Não altere self.state aqui. */
  scoreCard?: (ctx: ScoreCtx, self: JokerInstance, round: WonRound) => void;
  /** Quantas vezes a mais a carta vencedora pontua. */
  retrigger?: (ctx: ScoreCtx, self: JokerInstance, round: WonRound) => number;
  /** Efeito principal, na ordem da esquerda para a direita. Não altere self.state aqui. */
  score?: (ctx: ScoreCtx, self: JokerInstance) => void;
  /** Fim de toda mão (vencida, perdida ou nula). Pode alterar self.state. */
  handEnd?: (ctx: HandEndCtx, self: JokerInstance) => void;
  /** Início do Blind, depois das regras do chefe. Pode alterar ctx.blind. */
  blindStart?: (ctx: BlindCtx, self: JokerInstance) => void;
  /** Fim do Blind vencido (pagamento). */
  blindEnd?: (ctx: BlindCtx, self: JokerInstance) => void;
  /** Quando a run sobe de Ante após vencer o Chefe. */
  bossDefeated?: (ctx: BlindCtx, self: JokerInstance) => void;

  /** Efeitos passivos lidos pelo motor. */
  passive?: {
    hidesVira?: boolean;
    rerollDiscount?: number;
    firstLossFree?: boolean;
    /** Copia o efeito de pontuação do Coringa à direita (Boto). */
    copyRight?: boolean;
    /** Coringas repetidos podem aparecer na loja e nos pacotes (Showman). */
    allowDuplicates?: boolean;
  };
}

export function defineJoker(def: JokerDef): JokerDef {
  return def;
}

export function defineJokers(defs: JokerDef[]): JokerDef[] {
  return defs;
}
