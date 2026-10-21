// Modo livre: truco clássico até 12 pontos contra a IA, com Mão de Onze e Mão de Ferro.

import { decide, PERSONALITIES, type AiDecision, type PersonalityId } from '../ai/opponent';
import { equity } from '../ai/sim';
import { standardDeck } from './cards';
import { createRng, fork, shuffle, type Rng } from './rng';
import { actor, bet, createHand, fold, other, playCard, respond, type BetResponse, type HandOptions, type Side, type TrucoHand } from './truco';

export const FREE_TARGET = 12;

export interface FreeMatch {
  rng: Rng;
  seed: string;
  personality: PersonalityId;
  /** Personagem escolhido (data/opponents.ts). */
  opponentId?: string;
  score: Record<Side, number>;
  hand: TrucoHand;
  mao: Side;
  handNo: number;
  maoDeOnze: boolean;
  maoDeFerro: boolean;
  /** 'onze' = jogador decide se joga a Mão de Onze. */
  stage: 'playing' | 'onze' | 'handOver' | 'over';
  winner: Side | null;
  /** Quem está na Mão de Onze nesta mão. */
  onzeSide: Side | null;
  lastPoints: { side: Side | null; points: number } | null;
}

export function newFreeMatch(seed: string, personality: PersonalityId, maoDeOnze: boolean, maoDeFerro: boolean): FreeMatch {
  const m = {
    rng: createRng(seed),
    seed,
    personality,
    score: { player: 0, ai: 0 },
    mao: 'ai' as Side,
    handNo: 0,
    maoDeOnze,
    maoDeFerro,
    stage: 'playing',
    winner: null,
    onzeSide: null,
    lastPoints: null,
  } as Omit<FreeMatch, 'hand'> as FreeMatch;
  dealFree(m);
  return m;
}

export function dealFree(m: FreeMatch): void {
  m.handNo += 1;
  m.mao = other(m.mao);
  const deck = shuffle(m.rng, standardDeck('f'));
  const vira = deck.pop()!;
  const player = [deck.pop()!, deck.pop()!, deck.pop()!];
  const ai = [deck.pop()!, deck.pop()!, deck.pop()!];
  const options: HandOptions = {};
  m.onzeSide = null;
  m.stage = 'playing';
  const p11 = m.score.player === FREE_TARGET - 1;
  const a11 = m.score.ai === FREE_TARGET - 1;
  if (p11 && a11 && m.maoDeFerro) {
    options.noBets = true;
    options.blindPlay = true;
  } else if ((p11 || a11) && m.maoDeOnze && !(p11 && a11)) {
    options.noBets = true;
    options.startLevel = 1;
    m.onzeSide = p11 ? 'player' : 'ai';
  }
  m.hand = createHand({ player, ai, vira, mao: m.mao, houseDeck: deck, options });
  if (options.blindPlay) m.hand.log.push({ kind: 'info', text: 'MÃO DE FERRO: 11 a 11, cartas às cegas!' });
  if (m.onzeSide === 'player') {
    m.stage = 'onze';
    m.hand.log.push({ kind: 'info', text: 'MÃO DE ONZE: veja suas cartas e decida se joga valendo 3.' });
  } else if (m.onzeSide === 'ai') {
    const eq = equity(m.hand, 'ai', fork(m.rng), 150);
    const p = PERSONALITIES[m.personality];
    if (eq < 0.42 + p.caution * 0.1 - p.aggression * 0.1) {
      m.hand.log.push({ kind: 'info', text: 'Adversário na Mão de Onze: desiste e te dá 1 ponto.' });
      m.hand.level = 0;
      fold(m.hand, 'ai');
      finishFree(m);
    } else {
      m.hand.log.push({ kind: 'info', text: 'Adversário na Mão de Onze: vai jogar valendo 3!' });
    }
  }
}

export function freeOnze(m: FreeMatch, play: boolean): void {
  if (m.stage !== 'onze') return;
  m.stage = 'playing';
  if (!play) {
    m.hand.level = 0;
    fold(m.hand, 'player');
    finishFree(m);
  }
}

export function freeAiStep(m: FreeMatch): AiDecision | null {
  if (m.stage !== 'playing' || actor(m.hand) !== 'ai') return null;
  const d = decide(m.hand, 'ai', PERSONALITIES[m.personality], fork(m.rng));
  const a = d.action;
  if (a.type === 'play') playCard(m.hand, 'ai', a.cardId);
  else if (a.type === 'bet') bet(m.hand, 'ai');
  else respond(m.hand, 'ai', a.response);
  if (m.hand.phase === 'done') finishFree(m);
  return d;
}

export function freePlay(m: FreeMatch, cardId: string, hidden = false): void {
  playCard(m.hand, 'player', cardId, hidden);
  if (m.hand.phase === 'done') finishFree(m);
}

export function freeBet(m: FreeMatch): void {
  bet(m.hand, 'player');
}

export function freeRespond(m: FreeMatch, r: BetResponse): void {
  respond(m.hand, 'player', r);
  if (m.hand.phase === 'done') finishFree(m);
}

export function finishFree(m: FreeMatch): void {
  const r = m.hand.result!;
  if (r.winner) m.score[r.winner] += r.points;
  m.lastPoints = { side: r.winner, points: r.points };
  if (m.score.player >= FREE_TARGET || m.score.ai >= FREE_TARGET) {
    m.winner = m.score.player >= FREE_TARGET ? 'player' : 'ai';
    m.stage = 'over';
  } else m.stage = 'handOver';
}

export function freeNext(m: FreeMatch): void {
  if (m.stage === 'handOver') dealFree(m);
}
