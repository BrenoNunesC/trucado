// Partida online 1 contra 1 até 12: as regras do Modo livre, mas com dois humanos. Roda no
// servidor (que é quem manda: cada ação é validada aqui) e cada jogador recebe só a sua visão
// da mesa (viewFor), já do ponto de vista dele e sem as cartas do adversário.
//
// O motor fala em 'player' e 'ai'; aqui eles são os dois lugares da mesa: 'player' é quem criou
// a sala e 'ai' é quem entrou. A visão de quem entrou é espelhada para que, na tela de cada um,
// "player" seja sempre ele mesmo.

import { standardDeck, type Card } from './cards';
import { createRng, shuffle, type Rng } from './rng';
import { actor, bet, canBet, canPlay, canPlayHidden, canRaise, createHand, fold, isHidden, other, playCard, respond, responder, type BetResponse, type HandOptions, type Side, type TrucoHand } from './truco';

export const DUEL_TARGET = 12;

export interface DuelRules {
  maoDeOnze: boolean;
  maoDeFerro: boolean;
}

export interface DuelMatch {
  rng: Rng;
  rules: DuelRules;
  score: Record<Side, number>;
  hand: TrucoHand;
  mao: Side;
  handNo: number;
  /** 'onze' = quem está com 11 decide se joga a Mão de Onze. */
  stage: 'playing' | 'onze' | 'handOver' | 'over';
  winner: Side | null;
  /** Lado que está na Mão de Onze nesta mão (é ele quem decide). */
  onzeSide: Side | null;
  lastPoints: { side: Side | null; points: number } | null;
  /** Vitória por desistência ou abandono. */
  forfeit: Side | null;
}

export type DuelAction =
  | { t: 'play'; cardId: string; hidden?: boolean }
  | { t: 'bet' }
  | { t: 'respond'; r: BetResponse }
  | { t: 'onze'; play: boolean };

export function newDuel(seed: string, rules: DuelRules): DuelMatch {
  const m = {
    rng: createRng(seed),
    rules,
    score: { player: 0, ai: 0 },
    mao: 'ai' as Side,
    handNo: 0,
    stage: 'playing',
    winner: null,
    onzeSide: null,
    lastPoints: null,
    forfeit: null,
  } as Omit<DuelMatch, 'hand'> as DuelMatch;
  dealDuel(m);
  return m;
}

export function dealDuel(m: DuelMatch): void {
  m.handNo += 1;
  m.mao = other(m.mao);
  const deck = shuffle(m.rng, standardDeck('d'));
  const vira = deck.pop()!;
  const player = [deck.pop()!, deck.pop()!, deck.pop()!];
  const ai = [deck.pop()!, deck.pop()!, deck.pop()!];
  const options: HandOptions = {};
  m.onzeSide = null;
  m.stage = 'playing';
  const p11 = m.score.player === DUEL_TARGET - 1;
  const a11 = m.score.ai === DUEL_TARGET - 1;
  if (p11 && a11 && m.rules.maoDeFerro) {
    options.noBets = true;
    options.blindPlay = true;
  } else if ((p11 || a11) && m.rules.maoDeOnze && !(p11 && a11)) {
    options.noBets = true;
    options.startLevel = 1;
    m.onzeSide = p11 ? 'player' : 'ai';
  }
  m.hand = createHand({ player, ai, vira, mao: m.mao, houseDeck: deck, options });
  if (options.blindPlay) m.hand.log.push({ kind: 'info', text: 'MÃO DE FERRO: 11 a 11, cartas às cegas!' });
  if (m.onzeSide) {
    m.stage = 'onze';
    m.hand.log.push({ kind: 'info', text: `MÃO DE ONZE: ${m.onzeSide === 'player' ? 'Você' : 'Adversário'} decide se joga valendo 3.` });
  }
}

/**
 * Na Mão de Ferro o jogador só recebe o verso das próprias cartas; ao jogar ele manda o id do
 * verso, e aqui ele vira a carta real.
 */
function realCardId(m: DuelMatch, side: Side, id: string): string {
  return m.hand.hands[side].find((c) => c.id === id || blank(c.id).id === id)?.id ?? id;
}

/** O que este lado pode fazer agora (para validar a ação e para a UI). */
export function canAct(m: DuelMatch, side: Side, a: DuelAction): boolean {
  const h = m.hand;
  if (a.t === 'play') a = { ...a, cardId: realCardId(m, side, a.cardId) };
  if (m.stage === 'onze') return a.t === 'onze' && m.onzeSide === side;
  if (m.stage !== 'playing' || h.phase === 'done') return false;
  switch (a.t) {
    case 'play':
      return h.phase === 'play' && actor(h) === side && canPlay(h, side) && h.hands[side].some((c) => c.id === a.cardId) && (!a.hidden || canPlayHidden(h, side));
    case 'bet':
      return h.phase === 'play' && actor(h) === side && canBet(h, side);
    case 'respond':
      return h.phase === 'respond' && responder(h) === side && (a.r !== 'raise' || canRaise(h, side));
    default:
      return false;
  }
}

/** Aplica a ação se for válida. Devolve false (sem mudar nada) se não for. */
export function applyDuel(m: DuelMatch, side: Side, a: DuelAction): boolean {
  if (!canAct(m, side, a)) return false;
  const h = m.hand;
  switch (a.t) {
    case 'play':
      playCard(h, side, realCardId(m, side, a.cardId), !!a.hidden);
      break;
    case 'bet':
      bet(h, side);
      break;
    case 'respond':
      respond(h, side, a.r);
      break;
    case 'onze':
      m.stage = 'playing';
      if (!a.play) {
        h.level = 0;
        fold(h, side);
      } else h.log.push({ kind: 'info', text: `${side === 'player' ? 'Você' : 'Adversário'} vai jogar a Mão de Onze valendo 3!` });
      break;
  }
  if (h.phase === 'done') finishDuel(m);
  return true;
}

export function finishDuel(m: DuelMatch): void {
  const r = m.hand.result!;
  if (r.winner) m.score[r.winner] += r.points;
  m.lastPoints = { side: r.winner, points: r.points };
  if (m.score.player >= DUEL_TARGET || m.score.ai >= DUEL_TARGET) {
    m.winner = m.score.player >= DUEL_TARGET ? 'player' : 'ai';
    m.stage = 'over';
  } else m.stage = 'handOver';
}

export function nextDuelHand(m: DuelMatch): void {
  if (m.stage === 'handOver') dealDuel(m);
}

/** Um lado desistiu ou abandonou: o outro vence. */
export function forfeitDuel(m: DuelMatch, loser: Side): void {
  if (m.stage === 'over') return;
  m.forfeit = loser;
  m.winner = other(loser);
  m.stage = 'over';
}

// ---------------------------------------------------------------- visão de cada jogador

export interface DuelView {
  score: Record<Side, number>;
  hand: TrucoHand;
  stage: DuelMatch['stage'];
  winner: Side | null;
  /** Este jogador é quem decide a Mão de Onze. */
  onzeYou: boolean;
  onzeOpp: boolean;
  lastPoints: DuelMatch['lastPoints'];
  handNo: number;
  forfeit: Side | null;
  rules: DuelRules;
}

const swap = <T>(r: Record<Side, T>): Record<Side, T> => ({ player: r.ai, ai: r.player });
const swapSide = (s: Side): Side => other(s);
const swapMaybe = <T extends string>(s: T): T => (s === 'player' ? 'ai' : s === 'ai' ? 'player' : s) as T;

/** Carta escondida: mantém só um id estável, sem valor nem naipe verdadeiros. */
function blank(id: string): Card {
  return { id: `x-${id.length}-${hashId(id)}`, rank: '4', suit: 'ouros' };
}
function hashId(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

/** Troca "Você" e "Adversário" no texto do log, para a visão de quem entrou na sala. */
function swapWords(text: string): string {
  return text.replace(/Você|Adversário/g, (w) => (w === 'Você' ? 'Adversário' : 'Você'));
}

/**
 * A mesa como `side` a vê: espelhada para que ele seja 'player', sem as cartas na mão do
 * adversário, sem as cartas que o adversário jogou virado e sem o resto do baralho.
 */
export function viewFor(m: DuelMatch, side: Side): DuelView {
  const h = m.hand;
  const mirror = side === 'ai';
  const sw = <T>(r: Record<Side, T>) => (mirror ? swap(r) : r);
  const sd = (s: Side) => (mirror ? swapSide(s) : s);
  const opp = other(side);
  const hand: TrucoHand = {
    ...h,
    houseDeck: [],
    // na Mão de Ferro nem as próprias cartas vão abertas (é às cegas de verdade)
    hands: sw({
      [side]: h.options.blindPlay && h.phase !== 'done' ? h.hands[side].map((c) => blank(c.id)) : h.hands[side],
      [opp]: h.hands[opp].map((c) => blank(c.id)),
    } as Record<Side, Card[]>),
    // as cartas iniciais do adversário só aparecem quando a mão acaba
    dealt: sw(h.phase === 'done' ? h.dealt : ({ ...h.dealt, [opp]: [] } as Record<Side, Card[]>)),
    rounds: h.rounds.map((r) => {
      const cards: Partial<Record<Side, Card>> = { ...r.cards };
      if (cards[opp] && isHidden(r, opp)) cards[opp] = blank(cards[opp]!.id);
      const out = {
        ...r,
        leader: sd(r.leader),
        cards: mirror ? { player: cards.ai, ai: cards.player } : cards,
        hidden: r.hidden && (mirror ? { player: r.hidden.ai, ai: r.hidden.player } : r.hidden),
        outcome: r.outcome && (mirror ? swapMaybe(r.outcome) : r.outcome),
      };
      if (!out.cards.player) delete out.cards.player;
      if (!out.cards.ai) delete out.cards.ai;
      return out;
    }),
    mao: sd(h.mao),
    turn: sd(h.turn),
    pending: h.pending && { ...h.pending, by: sd(h.pending.by) },
    lastRaiser: h.lastRaiser && sd(h.lastRaiser),
    bets: h.bets.map((b) => ({ ...b, by: sd(b.by) })),
    result: h.result && {
      ...h.result,
      winner: h.result.winner && sd(h.result.winner),
      ranAway: h.result.ranAway && sd(h.result.ranAway),
    },
    log: mirror ? h.log.map((e) => ({ ...e, text: swapWords(e.text) })) : h.log,
    options: { ...h.options, tieWinner: h.options.tieWinner && sd(h.options.tieWinner) },
  };
  return {
    score: sw(m.score),
    hand,
    stage: m.stage,
    winner: m.winner && sd(m.winner),
    onzeYou: m.stage === 'onze' && m.onzeSide === side,
    onzeOpp: m.stage === 'onze' && m.onzeSide === opp,
    lastPoints: m.lastPoints && { ...m.lastPoints, side: m.lastPoints.side && sd(m.lastPoints.side) },
    handNo: m.handNo,
    forfeit: m.forfeit && sd(m.forfeit),
    rules: m.rules,
  };
}
