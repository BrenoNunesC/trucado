// Tipos do estado serializável da run. Tudo aqui vai para o localStorage.

import type { PersonalityId } from '../ai/opponent';
import type { Card, Edition } from './cards';
import type { DHand } from './duplas';
import type { Rng } from './rng';
import type { Side, TrucoHand } from './truco';

export type Rarity = 'comum' | 'incomum' | 'raro' | 'lendario';
export type JokerEdition = Exclude<Edition, 'marcada'>;

export type CategoryId =
  | 'naRaca'
  | 'arregou'
  | 'fechou'
  | 'peDeMesa'
  | 'virada'
  | 'cangaVencida'
  | 'zap'
  | 'casalManilhas'
  | 'trinca'
  | 'casalMaior'
  | 'tresManilhas';

export interface JokerInstance {
  uid: string;
  id: string;
  edition?: JokerEdition;
  /** Contadores próprios do Coringa (escalonáveis etc.). */
  state: Record<string, number>;
  /** Preço pago (base do valor de venda). */
  cost: number;
}

export type ConsumableKind = 'tarot' | 'giria' | 'mandinga';
export interface ConsumableInstance {
  uid: string;
  id: string;
}

export type BlindKind = 'pequeno' | 'grande' | 'chefe';

export interface BlindInfo {
  kind: BlindKind;
  ante: number;
  name: string;
  target: number;
  reward: number;
  personality: PersonalityId;
  /** Personagem do Pequeno/Grande (data/opponents.ts). */
  opponentId?: string;
  bossId?: string;
  /** Tag oferecida por pular (só Pequeno e Grande). */
  tagId?: string;
  status: 'upcoming' | 'current' | 'skipped' | 'defeated';
}

/** Regras efetivas do Blind atual (chefe + stake + vouchers + Coringas). */
export interface BlindRules {
  hands: number;
  bluffs: number;
  noBets: boolean;
  rotatingVira: boolean;
  hideVira: boolean;
  aiAlwaysRuns: boolean;
  tieLoses: boolean;
  /** Naipe que não pontua fichas. */
  debuffSuit?: Card['suit'];
  /** Dinheiro perdido por carta jogada pelo jogador. */
  moneyPerCard: number;
  /** uid do Coringa desativado (O Delegado). */
  disabledJoker?: string;
  /** A primeira mão vencida não pontua (A Sogra). */
  firstWinVoid: boolean;
  /** Toda mão começa neste nível de aposta (O Valentão). */
  startLevel: number;
  /** Nível máximo de aposta (4 = Doze, sem limite). */
  maxLevel: number;
  /** Manilhas não pontuam fichas. */
  noManilhaChips: boolean;
  /** Dinheiro cobrado por blefe. */
  bluffCost: number;
  /** O adversário é sempre o mão (abre a 1ª rodada). */
  aiAlwaysMao: boolean;
  /** Fichas e Mult da Jogada pela metade. */
  halfBase: boolean;
}

export type BlindStage = 'playing' | 'onze' | 'handOver' | 'won' | 'lost';

export interface ScoreStep {
  source: 'base' | 'bet' | 'card' | 'edition' | 'seal' | 'joker' | 'boss' | 'info';
  label: string;
  /** id da carta ou uid do Coringa que disparou. */
  ref?: string;
  chips?: number;
  mult?: number;
  xmult?: number;
  money?: number;
  /** Totais depois deste passo (para animar). */
  totalChips: number;
  totalMult: number;
}

export interface ScoreResult {
  category: CategoryId;
  level: number;
  betLevel: number;
  steps: ScoreStep[];
  chips: number;
  mult: number;
  total: number;
  money: number;
  voided?: string;
}

export interface HandSummary {
  winner: Side | null;
  reason: 'rounds' | 'run' | 'null';
  ranAway?: Side;
  score: ScoreResult | null;
  moneyLost: number;
  moneyGained: number;
  messages: string[];
}

export interface BlindState {
  info: BlindInfo;
  rules: BlindRules;
  score: number;
  handsLeft: number;
  bluffsLeft: number;
  handsPlayed: number;
  handsWon: number;
  handsLost: number;
  drawPile: Card[];
  discard: Card[];
  hand: TrucoHand | null;
  stage: BlindStage;
  /** id da carta do adversário revelada pela edição Marcada. */
  revealed?: string;
  /** Zé Pilintra: a primeira aposta perdida do Blind não custa dinheiro. */
  freeLossUsed: boolean;
  /** A Sogra já anulou uma mão? */
  firstWinVoided: boolean;
  lastSummary: HandSummary | null;
  /** Estatísticas da mão em andamento usadas por Coringas. */
  handFlags: { playerBetsAccepted: number; bluffedThisHand: boolean };
  ties: number;
  cashout?: CashoutLine[];
  /** Campanha em dupla: a mão de verdade, com os quatro lugares (você é o 0). */
  coop?: CoopBlind;
}

/** Quem senta em cada lugar da mesa em dupla. */
export interface CoopSeat {
  name: string;
  /** id do personagem (roupa e mãos na mesa). */
  avatar: string;
  personality: PersonalityId;
}

export interface CoopBlind {
  /** A mão em duplas. `hand` do Blind vira a projeção dela para você (para blefe e pontuação). */
  dhand: DHand;
  /** Lugares 0..3: você, adversário, parceiro, comparsa do adversário. */
  seats: CoopSeat[];
}

/** Campanha em dupla: o seu parceiro (da IA). */
export interface CoopInfo {
  partner: CoopSeat;
  /** Você na mesa (a roupa e as mãos que aparecem para os outros). */
  you?: CoopSeat;
  /** Campanha online: a sala e o seu lugar. A mesa e a sequência de Blinds são do servidor. */
  online?: { code: string; seat: number; /** Última mão pontuada (Ante-Blind-mão). */ scored?: string };
}

export interface CashoutLine {
  label: string;
  amount: number;
}

export type ShopItem =
  | { kind: 'joker'; id: string; edition?: JokerEdition; price: number; sold?: boolean }
  | { kind: 'consumable'; id: string; price: number; sold?: boolean }
  | { kind: 'card'; card: Card; price: number; sold?: boolean };

export interface ShopPack {
  id: string;
  price: number;
  sold?: boolean;
}

export interface ShopState {
  items: ShopItem[];
  packs: ShopPack[];
  voucher: { id: string; price: number; sold?: boolean } | null;
  rerollCost: number;
  freeRerolls: number;
  destroyCost: number;
}

export type PackOption =
  | { kind: 'joker'; id: string; edition?: JokerEdition }
  | { kind: 'consumable'; id: string }
  | { kind: 'card'; card: Card };

export interface PackState {
  packId: string;
  options: PackOption[];
  picksLeft: number;
  /** Pacote veio de uma Tag (grátis). */
  fromTag: boolean;
}

export interface RunStats {
  handsPlayed: number;
  handsWon: number;
  bestHand: number;
  bestHandCategory?: CategoryId;
  betsCalled: number;
  betsWon: number;
  moneyEarned: number;
  jokersSold: number;
  blindsDefeated: number;
  bossesDefeated: number;
  ties: number;
  fechou: number;
  cardsDestroyed: number;
  rerolls: number;
}

export interface RunOptions {
  maoDeOnze: boolean;
  maoDeFerro: boolean;
}

export interface RunState {
  version: 1;
  seed: string;
  rng: Rng;
  deckId: string;
  stake: number;
  options: RunOptions;
  ante: number;
  blindIndex: number;
  blinds: BlindInfo[];
  money: number;
  deck: Card[];
  jokers: JokerInstance[];
  jokerSlots: number;
  consumables: ConsumableInstance[];
  consumableSlots: number;
  levels: Record<CategoryId, number>;
  vouchers: string[];
  /** Tags aguardando efeito (ex.: próxima loja). */
  tags: string[];
  phase: 'select' | 'blind' | 'shop' | 'over' | 'victory';
  blind: BlindState | null;
  shop: ShopState | null;
  pack: PackState | null;
  stats: RunStats;
  endless: boolean;
  /** Ids de Coringas vistos nesta run (para a coleção). */
  seenJokers: string[];
  uidCounter: number;
  bossesSeen: string[];
  /** Fim de run já contabilizado no perfil. */
  recorded?: boolean;
  /** Campanha em dupla: os Blinds são jogados em duplas, você e o parceiro contra a máquina. */
  coop?: CoopInfo;
  /** Mensagens curtas para a UI (toasts). Esvaziadas pela UI. */
  toasts: string[];
}
