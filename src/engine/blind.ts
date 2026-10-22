// Um Blind: sequência de mãos de truco contra a IA, com meta de pontuação.

import { decide, PERSONALITIES, type AiDecision, type Personality } from '../ai/opponent';
import {
  BET_LOSS,
  BLIND_REWARD,
  BLUFF_MAX_CARDS,
  DEFAULT_BLUFFS,
  DEFAULT_HANDS,
  INTEREST_CAP,
  INTEREST_STEP,
  MONEY_PER_UNUSED_HAND,
} from '../data/balance';
import { BOSS_BY_ID } from '../data/bosses';
import { DECK_BY_ID } from '../data/decks';
import type { SpeechEvent } from '../data/speech';
import { isZap, standardDeck, type Card } from './cards';
import { detectCategory, ties } from './handFacts';
import { addConsumable, hasVoucher, jokerDef } from './inventory';
import type { BlindCtx, HandEndCtx } from './jokerApi';
import { fork, int, shuffle } from './rng';
import { activeJokers, scoreHand } from './scoring';
import type { BlindInfo, BlindRules, BlindState, CashoutLine, HandSummary, RunState } from './state';
import {
  actor,
  bet,
  canBet,
  canPlayHidden,
  createHand,
  fold,
  playCard,
  replaceDealt,
  respond,
  type BetResponse,
  type HandOptions,
  type TrucoHand,
} from './truco';

// ---------------------------------------------------------------- regras

export function buildRules(run: RunState, info: BlindInfo): BlindRules {
  const deck = DECK_BY_ID[run.deckId];
  const rules: BlindRules = {
    hands: DEFAULT_HANDS + (deck?.handsDelta ?? 0),
    bluffs: DEFAULT_BLUFFS,
    noBets: false,
    rotatingVira: false,
    hideVira: false,
    aiAlwaysRuns: false,
    tieLoses: false,
    moneyPerCard: 0,
    firstWinVoid: false,
    startLevel: 0,
    maxLevel: 4,
    noManilhaChips: false,
    bluffCost: 0,
    aiAlwaysMao: false,
    halfBase: false,
  };
  if (hasVoucher(run, 'folego')) rules.hands += 1;
  if (hasVoucher(run, 'setteVidas')) rules.hands += 1;
  if (hasVoucher(run, 'caraDePau')) rules.bluffs += 1;
  if (hasVoucher(run, 'caraDeMadeira')) rules.bluffs += 1;
  if (run.stake >= 5) rules.bluffs -= 1;
  if (run.stake >= 8) rules.hands -= 1;
  if (info.bossId) BOSS_BY_ID[info.bossId]?.apply(rules, run);
  if (run.jokers.some((j) => jokerDef(j).passive?.hidesVira)) rules.hideVira = true;
  rules.hands = Math.max(1, rules.hands);
  rules.bluffs = Math.max(0, rules.bluffs);
  return rules;
}

export function personalityFor(run: RunState, info: BlindInfo): Personality {
  const p = { ...PERSONALITIES[info.personality] };
  if (run.stake >= 4) {
    p.aggression = Math.min(1, p.aggression + 0.15);
    p.caution = Math.max(0, p.caution - 0.1);
  }
  return p;
}

function blindCtx(run: RunState, blind: BlindState, lines?: CashoutLine[]): BlindCtx {
  return {
    run,
    blind,
    money: (n, label) => {
      if (lines) lines.push({ label: label ?? 'Coringa', amount: n });
      else run.money += n;
    },
    addConsumable: (kind, id) => addConsumable(run, kind, id),
  };
}

// ---------------------------------------------------------------- início

export function startBlind(run: RunState): BlindState {
  const info = run.blinds[run.blindIndex];
  info.status = 'current';
  const rules = buildRules(run, info);
  const blind: BlindState = {
    info,
    rules,
    score: 0,
    handsLeft: rules.hands,
    bluffsLeft: rules.bluffs,
    handsPlayed: 0,
    handsWon: 0,
    handsLost: 0,
    drawPile: shuffle(run.rng, [...run.deck]),
    discard: [],
    hand: null,
    stage: 'playing',
    freeLossUsed: false,
    firstWinVoided: false,
    lastSummary: null,
    handFlags: { playerBetsAccepted: 0, bluffedThisHand: false },
    ties: 0,
  };
  run.blind = blind;
  run.phase = 'blind';

  // Tag do Fôlego
  const t = run.tags.indexOf('folego');
  if (t >= 0) {
    run.tags.splice(t, 1);
    blind.handsLeft += 1;
    blind.rules.hands += 1;
  }

  // Tag da Cara de Pau
  const b = run.tags.indexOf('blefe');
  if (b >= 0) {
    run.tags.splice(b, 1);
    blind.bluffsLeft += 1;
    blind.rules.bluffs += 1;
  }

  for (const j of activeJokers(run, blind)) jokerDef(j).blindStart?.(blindCtx(run, blind), j);
  dealHand(run);
  return blind;
}

/** Compra `n` cartas do monte do Blind (embaralha o descarte quando o monte acaba). */
export function draw(run: RunState, blind: BlindState, n: number): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (blind.drawPile.length === 0) {
      if (blind.discard.length === 0) break;
      blind.drawPile = shuffle(run.rng, blind.discard);
      blind.discard = [];
    }
    out.push(blind.drawPile.pop()!);
  }
  return out;
}

function pickRevealed(run: RunState, blind: BlindState): void {
  const hand = blind.hand!;
  blind.revealed = undefined;
  if ((hasVoucher(run, 'olhoVivo') || hand.hands.player.some((c) => c.edition === 'marcada')) && hand.hands.ai.length > 0) {
    blind.revealed = hand.hands.ai[int(run.rng, hand.hands.ai.length)].id;
  }
}

/**
 * A campanha em dupla (engine/coop.ts) distribui de outro jeito: ela se registra aqui ao ser
 * carregada, para este arquivo não depender dela.
 */
let coopDealer: ((run: RunState) => TrucoHand) | null = null;
export function registerCoopDealer(fn: (run: RunState) => TrucoHand): void {
  coopDealer = fn;
}

export function dealHand(run: RunState): TrucoHand {
  if (run.coop) {
    if (!coopDealer) throw new Error('Campanha em dupla sem o módulo coop carregado');
    return coopDealer(run);
  }
  const blind = run.blind!;
  blind.handsLeft -= 1;
  blind.handsPlayed += 1;
  blind.handFlags = { playerBetsAccepted: 0, bluffedThisHand: false };
  const r = blind.rules;
  const player = draw(run, blind, 3);
  // a vira sai do baralho do jogador: o baralho que você monta também decide a manilha.
  // Com a vira rotativa (Madame Zuleika), as próximas duas viradas já saem junto, do mesmo monte.
  const viraCards = draw(run, blind, r.rotatingVira ? 3 : 1);
  const house = shuffle(run.rng, standardDeck('h'));
  for (const v of viraCards) {
    // a casa não segura uma carta igual à vira (a IA parte do baralho padrão menos a vira)
    const i = house.findIndex((c) => c.rank === v.rank && c.suit === v.suit);
    if (i >= 0) house.splice(i, 1);
  }
  const vira = viraCards.pop() ?? house.pop()!;
  const ai = [house.pop()!, house.pop()!, house.pop()!];
  // para a vira rotativa, houseDeck são as próximas viradas (sai do fim); senão, o resto da casa
  const houseDeck = r.rotatingVira ? viraCards : house;
  const mao = r.aiAlwaysMao || blind.handsPlayed % 2 === 0 ? 'ai' : 'player';
  const options: HandOptions = {
    noBets: r.noBets,
    rotatingVira: r.rotatingVira,
    tieWinner: r.tieLoses ? 'ai' : undefined,
    startLevel: r.startLevel || undefined,
    maxLevel: r.maxLevel < 4 ? r.maxLevel : undefined,
    // a manilha só pode ser um valor que existe no baralho do jogador
    availableRanks: [...new Set(run.deck.map((c) => c.rank))],
  };
  let stage: BlindState['stage'] = 'playing';
  const lastHand = blind.handsLeft === 0;
  if (lastHand && run.options.maoDeFerro && blind.score < blind.info.target / 2) {
    options.noBets = true;
    options.blindPlay = true;
    options.startLevel = 2;
  } else if (lastHand && run.options.maoDeOnze) {
    options.noBets = true;
    options.startLevel = Math.max(1, options.startLevel ?? 0);
    stage = 'onze';
  }
  const hand = createHand({ player, ai, vira, mao, houseDeck, options });
  if (options.blindPlay) hand.log.push({ kind: 'info', text: 'MÃO DE FERRO: cartas às cegas, valendo Seis!' });
  if (stage === 'onze') hand.log.push({ kind: 'info', text: 'MÃO DE ONZE: jogue valendo Truco ou desista.' });
  blind.hand = hand;
  blind.stage = stage;
  pickRevealed(run, blind);
  return hand;
}

// ---------------------------------------------------------------- ações do jogador

/** Quantas cartas um blefe pode trocar. */
export function bluffMaxCards(run: RunState): number {
  return BLUFF_MAX_CARDS + (hasVoucher(run, 'maoCheia') ? 1 : 0);
}

export function canBluff(run: RunState): boolean {
  const b = run.blind;
  if (!b || !b.hand || b.stage !== 'playing' || b.hand.phase === 'done') return false;
  if (b.bluffsLeft <= 0) return false;
  return !b.hand.rounds.some((r) => r.cards.player);
}

export function bluff(run: RunState, cardIds: string[]): Card[] {
  const blind = run.blind!;
  const hand = blind.hand!;
  if (!canBluff(run)) throw new Error('Não dá para blefar agora');
  const max = bluffMaxCards(run);
  if (cardIds.length < 1 || cardIds.length > max) throw new Error(`Troque de 1 a ${max} cartas`);
  const out = hand.hands.player.filter((c) => cardIds.includes(c.id));
  const keep = hand.hands.player.filter((c) => !cardIds.includes(c.id));
  const fresh = draw(run, blind, out.length);
  blind.discard.push(...out);
  for (const c of out) if (c.seal === 'roxo') addConsumable(run, 'tarot');
  replaceDealt(hand, 'player', [...keep, ...fresh]);
  blind.bluffsLeft -= 1;
  blind.handFlags.bluffedThisHand = true;
  if (blind.rules.bluffCost > 0) run.money = Math.max(0, run.money - blind.rules.bluffCost);
  hand.log.push({ kind: 'info', text: `Você blefou e trocou ${out.length} carta(s).` });
  pickRevealed(run, blind);
  return fresh;
}

/** Mão de Onze: aceitar jogar. */
export function acceptOnze(run: RunState): void {
  const blind = run.blind!;
  if (blind.stage !== 'onze') return;
  blind.stage = 'playing';
}

/** Mão de Onze: desistir (gasta a mão). */
export function declineOnze(run: RunState): HandSummary {
  const blind = run.blind!;
  fold(blind.hand!, 'player');
  blind.stage = 'playing';
  return finishHand(run);
}

export function playerPlay(run: RunState, cardId: string, hidden = false): void {
  const blind = run.blind!;
  playCard(blind.hand!, 'player', cardId, hidden);
  if (blind.rules.moneyPerCard > 0) run.money = Math.max(0, run.money - blind.rules.moneyPerCard);
}

export function playerCanPlayHidden(run: RunState): boolean {
  const b = run.blind;
  return !!b?.hand && b.stage === 'playing' && canPlayHidden(b.hand, 'player');
}

export function playerBet(run: RunState): void {
  const hand = run.blind!.hand!;
  bet(hand, 'player');
  run.stats.betsCalled += 1;
}

export function playerRespond(run: RunState, response: BetResponse): void {
  const hand = run.blind!.hand!;
  respond(hand, 'player', response);
  if (response === 'raise') run.stats.betsCalled += 1;
}

export function playerCanBet(run: RunState): boolean {
  const b = run.blind;
  return !!b?.hand && b.stage === 'playing' && canBet(b.hand, 'player');
}

// ---------------------------------------------------------------- IA

export interface AiStep {
  decision: AiDecision;
  speech?: SpeechEvent;
}

/** Executa uma ação da IA se for a vez dela. */
export function aiStep(run: RunState): AiStep | null {
  const blind = run.blind!;
  const hand = blind.hand!;
  if (blind.stage !== 'playing' || actor(hand) !== 'ai') return null;
  const p = personalityFor(run, blind.info);
  const rng = fork(run.rng);
  const decision = decide(hand, 'ai', p, rng, { alwaysRun: blind.rules.aiAlwaysRuns });
  const a = decision.action;
  let speech: SpeechEvent | undefined;
  if (a.type === 'play') {
    const resolvedBefore = hand.rounds.filter((r) => r.outcome).length;
    const manilha = hand.rounds[hand.rounds.length - 1].manilha;
    const card = hand.hands.ai.find((c) => c.id === a.cardId)!;
    playCard(hand, 'ai', a.cardId);
    const resolved = hand.rounds.filter((r) => r.outcome);
    if (isZap(card, manilha)) speech = 'zap';
    else if (resolved.length > resolvedBefore && hand.phase !== 'done') {
      const o = resolved[resolved.length - 1].outcome;
      speech = o === 'ai' ? 'winRound' : o === 'tie' ? 'tie' : 'loseRound';
    }
  } else if (a.type === 'bet') {
    bet(hand, 'ai');
    speech = (['truco', 'truco', 'seis', 'nove', 'doze'] as const)[hand.pending!.level];
  } else {
    const level = hand.pending!.level;
    respond(hand, 'ai', a.response);
    if (a.response !== 'run') blind.handFlags.playerBetsAccepted += 1;
    if (a.response === 'run') speech = 'run';
    else if (a.response === 'accept') speech = 'accept';
    else speech = (['truco', 'truco', 'seis', 'nove', 'doze'] as const)[Math.min(4, level + 1)];
  }
  return { decision, speech };
}

// ---------------------------------------------------------------- fim da mão

export function finishHand(run: RunState): HandSummary {
  const blind = run.blind!;
  const hand = blind.hand!;
  if (hand.phase !== 'done' || !hand.result) throw new Error('A mão ainda não acabou');
  const result = hand.result;
  const summary: HandSummary = {
    winner: result.winner,
    reason: result.reason,
    ranAway: result.ranAway,
    score: null,
    moneyLost: 0,
    moneyGained: 0,
    messages: [],
  };
  const nTies = ties(hand);
  blind.ties += nTies;
  run.stats.ties += nTies;
  run.stats.handsPlayed += 1;

  let category = null as ReturnType<typeof detectCategory> | null;
  if (result.winner === 'player') {
    blind.handsWon += 1;
    run.stats.handsWon += 1;
    category = detectCategory(hand);
    if (hand.rounds[0]?.outcome === 'player' && hand.rounds[1]?.outcome === 'player') run.stats.fechou += 1;
    if (hand.bets.some((b) => b.by === 'player')) run.stats.betsWon += 1;
    if (blind.rules.firstWinVoid && !blind.firstWinVoided) {
      blind.firstWinVoided = true;
      summary.messages.push(`${blind.info.name} não deixou essa mão pontuar!`);
    } else {
      const score = scoreHand(run, blind, hand);
      summary.score = score;
      summary.moneyGained += score.money;
      const tip = (hasVoucher(run, 'gorjeta') ? 1 : 0) + (hasVoucher(run, 'gorjetao') ? 1 : 0);
      if (tip > 0) {
        run.money += tip;
        summary.moneyGained += tip;
        summary.messages.push(`Gorjeta: +$${tip}`);
      }
      blind.score += score.total;
      if (score.total > run.stats.bestHand) {
        run.stats.bestHand = score.total;
        run.stats.bestHandCategory = score.category;
      }
    }
  } else if (result.winner === 'ai') {
    blind.handsLost += 1;
    if (hand.level > 0) {
      const free = !blind.freeLossUsed && run.jokers.some((j) => jokerDef(j).passive?.firstLossFree);
      if (free) {
        blind.freeLossUsed = true;
        summary.messages.push('Zé Pilintra cobriu a aposta perdida.');
      } else {
        const base = hasVoucher(run, 'seguroTruco') ? Math.floor(BET_LOSS[hand.level] / 2) : BET_LOSS[hand.level];
        const loss = Math.min(run.money, base);
        run.money -= loss;
        summary.moneyLost = loss;
        if (loss > 0) summary.messages.push(`Aposta perdida: −$${loss}.`);
      }
    }
  }

  // ganchos de fim de mão
  const ctx: HandEndCtx = {
    run,
    blind,
    hand,
    won: result.winner === 'player',
    category,
    ties: nTies,
    money: (n, label) => {
      run.money += n;
      summary.moneyGained += n;
      summary.messages.push(`${label ?? 'Coringa'}: +$${n}`);
    },
    addConsumable: (kind, id) => addConsumable(run, kind, id),
  };
  for (const j of activeJokers(run, blind)) jokerDef(j).handEnd?.(ctx, j);
  const gone = run.jokers.filter((j) => j.state.destroyed);
  for (const j of gone) summary.messages.push(`${jokerDef(j).name} acabou!`);
  run.jokers = run.jokers.filter((j) => !j.state.destroyed);

  // cartas voltam para o descarte
  const used: Card[] = [...hand.hands.player];
  for (const r of hand.rounds) if (r.cards.player) used.push(r.cards.player);
  // as viras também são cartas do baralho e voltam ao descarte (inclusive as que nem chegaram a virar)
  const viras = new Set<Card>(hand.rounds.map((r) => r.vira));
  if (hand.options.rotatingVira) for (const v of hand.houseDeck) viras.add(v);
  used.push(...viras);
  blind.discard.push(...used);

  blind.lastSummary = summary;
  if (blind.score >= blind.info.target) {
    blind.stage = 'won';
    blind.cashout = computeCashout(run);
  } else if (blind.handsLeft <= 0) {
    blind.stage = 'lost';
  } else {
    blind.stage = 'handOver';
  }
  return summary;
}

export function nextHand(run: RunState): TrucoHand {
  const blind = run.blind!;
  if (blind.stage !== 'handOver') throw new Error('Não há próxima mão');
  return dealHand(run);
}

// ---------------------------------------------------------------- pagamento

export function interest(run: RunState): number {
  if (DECK_BY_ID[run.deckId]?.noInterest) return 0;
  const cap = hasVoucher(run, 'poupanca') ? 10 : INTEREST_CAP;
  return Math.min(cap, Math.floor(Math.max(0, run.money) / INTEREST_STEP));
}

export function computeCashout(run: RunState): CashoutLine[] {
  const blind = run.blind!;
  const lines: CashoutLine[] = [];
  const kind = blind.info.kind;
  const reward = kind === 'pequeno' && run.stake >= 2 ? 0 : BLIND_REWARD[kind];
  lines.push({ label: `Vitória no ${blind.info.name}`, amount: reward });
  const perHand = MONEY_PER_UNUSED_HAND + (hasVoucher(run, 'caderninho') ? 1 : 0);
  if (blind.handsLeft > 0) lines.push({ label: `${blind.handsLeft} mão(s) não usada(s)`, amount: blind.handsLeft * perHand });
  if (hasVoucher(run, 'cobrador')) lines.push({ label: 'Cobrador', amount: 2 });
  const i = interest(run);
  if (i > 0) lines.push({ label: `Juros (1 a cada $${INTEREST_STEP})`, amount: i });
  for (const j of activeJokers(run, blind)) jokerDef(j).blindEnd?.(blindCtx(run, blind, lines), j);
  if (kind === 'chefe') {
    const inv = run.tags.filter((t) => t === 'investimento').length;
    if (inv > 0) lines.push({ label: 'Tag de Investimento', amount: 15 * inv });
  }
  return lines.filter((l) => l.amount !== 0 || l === lines[0]);
}
