// Campanha em dupla: a run de sempre (baralho, Coringas, Tarôs, dinheiro, loja, Antes, Blinds e
// chefes), mas cada mão do Blind é jogada em duplas: você e um parceiro contra o adversário do
// Blind e um comparsa dele. As suas três cartas saem do seu baralho, como na campanha solo; as
// dos outros três saem da casa.
//
// Quando a mão acaba, ela é "projetada" para o seu ponto de vista (em cada rodada, a sua carta
// contra a melhor carta adversária, com o resultado da dupla) e essa projeção passa pela
// pontuação de sempre (finishHand). Assim todos os Coringas, edições, selos, níveis de jogada,
// chefes e vouchers funcionam sem nenhuma regra nova.

import { decideDHand } from '../ai/duplas';
import { PERSONALITIES, type PersonalityId } from '../ai/opponent';
import { BOSS_BY_ID } from '../data/bosses';
import { OPPONENT_BY_ID, OPPONENTS } from '../data/opponents';
import type { SpeechEvent } from '../data/speech';
import { bluff, canBluff, draw, finishHand, personalityFor, registerCoopDealer } from './blind';
import { isZap, standardDeck, strength, type Card } from './cards';
import {
  createDHand,
  dActor,
  dBet,
  dCanBet,
  dCanPlayHidden,
  dFold,
  dPlay,
  dRespond,
  formatDuplasLog,
  teamOf,
  type DuplasAction,
  type DHand,
  type DHandOptions,
  type SeatNo,
  type Team,
} from './duplas';
import { hasVoucher } from './inventory';
import { fork, int, pick, shuffle } from './rng';
import type { CoopSeat, HandSummary, RunState } from './state';
import { createHand, type BetResponse, type HandOptions, type Round, type Side, type TrucoHand } from './truco';

/**
 * Escolhe o parceiro e marca a run como campanha em dupla. Chame logo depois de newRun.
 * `youAvatar` é a sua roupa na mesa (o personagem do modo online).
 */
export function makeCoop(run: RunState, partnerId: string, youAvatar = 'bene'): void {
  const p = OPPONENT_BY_ID[partnerId] ?? OPPONENTS[0];
  run.coop = {
    partner: { name: p.name, avatar: p.id, personality: p.personality },
    you: { name: 'Você', avatar: OPPONENT_BY_ID[youAvatar] ? youAvatar : 'bene', personality: 'equilibrado' },
  };
}

/** Os quatro lugares do Blind atual: você, o adversário do Blind, o parceiro e um comparsa. */
function seatsFor(run: RunState): CoopSeat[] {
  const you = run.coop!.you ?? { name: 'Você', avatar: 'bene', personality: 'equilibrado' };
  const info = run.blind!.info;
  const boss = info.bossId ? BOSS_BY_ID[info.bossId] : null;
  const main: CoopSeat = boss
    ? { name: boss.name, avatar: boss.id, personality: info.personality }
    : (() => {
        const o = OPPONENT_BY_ID[info.opponentId ?? ''] ?? OPPONENTS[0];
        return { name: o.name, avatar: o.id, personality: info.personality };
      })();
  const partner = run.coop!.partner;
  // o comparsa é sorteado no começo do Blind e fica até o fim
  const taken = new Set([main.avatar, partner.avatar, you.avatar]);
  const side = pick(run.rng, OPPONENTS.filter((o) => !taken.has(o.id)));
  return [you, main, partner, { name: side.name, avatar: side.id, personality: side.personality }];
}

/**
 * Campanha online: só compra as suas três cartas do seu monte. Quem monta a mesa (casa, vira,
 * adversários) é o servidor, quando as cartas dos dois chegarem; até lá, `hand` guarda as suas.
 */
function onlineDeal(run: RunState): TrucoHand {
  const blind = run.blind!;
  blind.handsLeft -= 1;
  blind.handsPlayed += 1;
  blind.handFlags = { playerBetsAccepted: 0, bluffedThisHand: false };
  const mine = draw(run, blind, 3);
  blind.hand = createHand({ player: mine, ai: [], vira: mine[0], mao: 'player' });
  blind.coop = undefined;
  blind.revealed = undefined;
  blind.stage = 'playing';
  return blind.hand;
}

/** Distribui uma mão em duplas (registrado em blind.ts como o dealHand da campanha em dupla). */
export function coopDeal(run: RunState): TrucoHand {
  if (run.coop?.online) return onlineDeal(run);
  const blind = run.blind!;
  const r = blind.rules;
  const seats = blind.coop?.seats ?? seatsFor(run);
  blind.handsLeft -= 1;
  blind.handsPlayed += 1;
  blind.handFlags = { playerBetsAccepted: 0, bluffedThisHand: false };

  // as suas cartas e a(s) vira(s) saem do seu baralho, como na campanha solo
  const mine = draw(run, blind, 3);
  const viraCards = draw(run, blind, r.rotatingVira ? 3 : 1);
  const house = shuffle(run.rng, standardDeck('h'));
  // a casa não repete carta que já está na mesa
  for (const c of [...mine, ...viraCards]) {
    const i = house.findIndex((x) => x.rank === c.rank && x.suit === c.suit);
    if (i >= 0) house.splice(i, 1);
  }
  const vira = viraCards.pop() ?? house.pop()!;
  const hands: Card[][] = [mine, [house.pop()!, house.pop()!, house.pop()!], [house.pop()!, house.pop()!, house.pop()!], [house.pop()!, house.pop()!, house.pop()!]];

  // quem é mão gira em volta da mesa; com O Cabo Joel e afins, é sempre a outra dupla
  const n = blind.handsPlayed - 1;
  const mao = (r.aiAlwaysMao ? (n % 2 === 0 ? 1 : 3) : n % 4) as SeatNo;
  const options: DHandOptions = {
    noBets: r.noBets,
    rotatingVira: r.rotatingVira,
    tieWinner: r.tieLoses ? 1 : undefined,
    startLevel: r.startLevel || undefined,
    maxLevel: r.maxLevel < 4 ? r.maxLevel : undefined,
    availableRanks: [...new Set(run.deck.map((c) => c.rank))],
    // você responde às apostas pela sua dupla (o parceiro não corre com o seu dinheiro)
    voice: [0, null],
  };
  let stage: 'playing' | 'onze' = 'playing';
  if (blind.handsLeft === 0 && run.options.maoDeFerro && blind.score < blind.info.target / 2) {
    options.noBets = true;
    options.blindPlay = true;
    options.startLevel = 2;
  } else if (blind.handsLeft === 0 && run.options.maoDeOnze) {
    options.noBets = true;
    options.startLevel = Math.max(1, options.startLevel ?? 0);
    stage = 'onze';
  }
  const dhand = createDHand(hands, vira, mao, options, r.rotatingVira ? viraCards : []);
  if (options.blindPlay) dhand.log.push({ kind: 'info', text: 'MÃO DE FERRO: cartas às cegas, valendo Seis!' });
  if (stage === 'onze') dhand.log.push({ kind: 'info', text: 'MÃO DE ONZE: veja as cartas do parceiro e jogue valendo Truco, ou desista.' });
  blind.coop = { dhand, seats };
  blind.stage = stage;

  // a mão "sombra" de dois lados: é nela que o blefe troca as suas cartas e é ela que vira a
  // projeção pontuada no fim
  const shadow: HandOptions = { noBets: options.noBets, blindPlay: options.blindPlay, startLevel: options.startLevel };
  blind.hand = createHand({ player: mine, ai: hands[1], vira, mao: teamOf(mao) === 0 ? 'player' : 'ai', options: shadow });

  // Olho Vivo / carta Marcada: uma carta de um dos adversários fica à mostra
  blind.revealed = undefined;
  if (hasVoucher(run, 'olhoVivo') || mine.some((c) => c.edition === 'marcada')) {
    const opp = [...hands[1], ...hands[3]];
    blind.revealed = opp[int(run.rng, opp.length)].id;
  }
  return blind.hand;
}

registerCoopDealer(coopDeal);

// ---------------------------------------------------------------- consultas

export const coopHand = (run: RunState): DHand => run.blind!.coop!.dhand;

/** Quem deve agir agora (0 = você), ou null. Na Mão de Onze é você quem decide. */
export function coopActor(run: RunState): SeatNo | null {
  const b = run.blind!;
  if (b.stage === 'onze') return 0;
  if (b.stage !== 'playing') return null;
  return dActor(coopHand(run));
}

export function coopCanBet(run: RunState): boolean {
  const b = run.blind;
  return !!b?.coop && b.stage === 'playing' && dCanBet(b.coop.dhand, 0);
}

export function coopCanPlayHidden(run: RunState): boolean {
  const b = run.blind;
  return !!b?.coop && b.stage === 'playing' && dCanPlayHidden(b.coop.dhand, 0);
}

/** Blefe: troca cartas antes de você jogar a primeira carta da mão. */
export function coopCanBluff(run: RunState): boolean {
  const b = run.blind;
  if (!b?.coop || b.coop.dhand.phase === 'done') return false;
  const h = b.coop.dhand;
  return h.rounds.length === 1 && !h.rounds[0].cards[0] && canBluff(run);
}

// ---------------------------------------------------------------- suas ações

export function coopBluff(run: RunState, cardIds: string[]): Card[] {
  if (!coopCanBluff(run)) throw new Error('Não dá para blefar agora');
  const fresh = bluff(run, cardIds);
  const h = coopHand(run);
  h.hands[0] = [...run.blind!.hand!.hands.player];
  h.dealt[0] = [...h.hands[0]];
  return fresh;
}

export function coopPlay(run: RunState, cardId: string, hidden = false): void {
  const b = run.blind!;
  dPlay(b.coop!.dhand, 0, cardId, hidden);
  if (b.rules.moneyPerCard > 0) run.money = Math.max(0, run.money - b.rules.moneyPerCard);
}

export function coopBet(run: RunState): void {
  dBet(coopHand(run), 0);
  run.stats.betsCalled += 1;
}

export function coopRespond(run: RunState, r: BetResponse): void {
  dRespond(coopHand(run), 0, r);
  if (r === 'raise') run.stats.betsCalled += 1;
}

/** Mão de Onze: jogar valendo Truco, ou desistir (a mão acaba e é contada). */
export function coopOnze(run: RunState, play: boolean): HandSummary | null {
  const b = run.blind!;
  if (b.stage !== 'onze') return null;
  b.stage = 'playing';
  if (play) return null;
  dFold(coopHand(run), 0);
  return coopFinish(run);
}

// ---------------------------------------------------------------- IA (parceiro e adversários)

export interface CoopAiStep {
  seat: SeatNo;
  action: DuplasAction;
  speech?: SpeechEvent;
}

/** Uma jogada de quem não é você. Devolve null se for a sua vez. */
export function coopAiStep(run: RunState): CoopAiStep | null {
  const b = run.blind!;
  if (b.stage !== 'playing' || !b.coop) return null;
  const h = b.coop.dhand;
  const seat = dActor(h);
  if (seat === null || seat === 0) return null;
  const opponent = teamOf(seat) === 1;
  const p = opponent ? personalityFor(run, b.info) : PERSONALITIES[b.coop.seats[seat].personality as PersonalityId];
  const action = decideDHand(h, seat, fork(run.rng), p, { alwaysRun: opponent && b.rules.aiAlwaysRuns });
  if (!action || action.t === 'onze') return null;
  let speech: SpeechEvent | undefined;
  if (action.t === 'play') {
    const card = h.hands[seat].find((c) => c.id === action.cardId)!;
    const before = h.rounds.filter((r) => r.outcome !== undefined).length;
    const manilha = h.rounds[h.rounds.length - 1].manilha;
    dPlay(h, seat, action.cardId, !!action.hidden);
    const resolved = h.rounds.filter((r) => r.outcome !== undefined);
    if (isZap(card, manilha)) speech = 'zap';
    else if (opponent && resolved.length > before && h.phase !== 'done') {
      const o = resolved[resolved.length - 1].outcome;
      speech = o === 1 ? 'winRound' : o === 'tie' ? 'tie' : 'loseRound';
    }
  } else if (action.t === 'bet') {
    dBet(h, seat);
    speech = (['truco', 'truco', 'seis', 'nove', 'doze'] as const)[h.pending!.level];
  } else {
    const level = h.pending!.level;
    dRespond(h, seat, action.r);
    if (opponent && action.r !== 'run') b.handFlags.playerBetsAccepted += 1;
    speech = action.r === 'run' ? 'run' : action.r === 'accept' ? 'accept' : (['truco', 'truco', 'seis', 'nove', 'doze'] as const)[Math.min(4, level + 1)];
  }
  return { seat, action, speech };
}

// ---------------------------------------------------------------- fim da mão

/**
 * A mão em duplas vista como uma mão de dois lados, do ponto de vista de `seat`: em cada rodada,
 * a carta dele contra a melhor carta adversária, com o resultado da dupla. Ninguém joga essa mão;
 * ela só alimenta a pontuação (Coringas, categorias, cartas que voltam ao seu descarte).
 */
export function projectHand(h: DHand, seat: SeatNo, names: string[]): TrucoHand {
  const mine = teamOf(seat);
  const side = (t: Team): Side => (t === mine ? 'player' : 'ai');
  const opps = ([0, 1, 2, 3] as SeatNo[]).filter((s) => teamOf(s) !== mine);
  const rounds: Round[] = h.rounds.map((r) => {
    const cards: Round['cards'] = {};
    const hidden: Round['hidden'] = {};
    if (r.cards[seat]) {
      cards.player = r.cards[seat]!;
      if (r.hidden[seat]) hidden.player = true;
    }
    // a melhor carta adversária aberta (ou, se só houver viradas, uma delas)
    let best: SeatNo | null = null;
    for (const s of opps) {
      const c = r.cards[s];
      if (!c) continue;
      if (best === null || (r.hidden[best] && !r.hidden[s])) best = s;
      else if (!r.hidden[s] && !r.hidden[best] && strength(c, r.manilha) > strength(r.cards[best]!, r.manilha)) best = s;
    }
    if (best !== null) {
      cards.ai = r.cards[best]!;
      if (r.hidden[best]) hidden.ai = true;
    }
    return {
      leader: side(teamOf(r.leader)),
      manilha: r.manilha,
      vira: r.vira,
      cards,
      hidden,
      outcome: r.outcome === undefined ? undefined : r.outcome === 'tie' ? 'tie' : side(r.outcome),
    };
  });
  const res = h.result;
  return {
    vira: h.vira,
    manilha: h.manilha,
    houseDeck: [...h.houseDeck],
    hands: { player: [...h.hands[seat]], ai: opps.flatMap((s) => h.hands[s]) },
    dealt: { player: [...h.dealt[seat]], ai: [...h.dealt[opps[0]]] },
    rounds,
    mao: side(teamOf(h.mao)),
    turn: 'player',
    level: h.level,
    pending: null,
    lastRaiser: h.lastRaiserTeam === null ? null : side(h.lastRaiserTeam),
    bets: h.bets.map((b) => ({ by: side(teamOf(b.by)), level: b.level, response: b.response })),
    phase: 'done',
    result: res && {
      winner: res.winner === null ? null : side(res.winner),
      points: res.points,
      reason: res.reason,
      ranAway: res.ranAway === undefined ? undefined : side(res.ranAway),
    },
    log: h.log.map((e) => ({ ...e, text: formatDuplasLog(e.text, seat, names) })),
    options: {
      noBets: h.options.noBets,
      startLevel: h.options.startLevel,
      blindPlay: h.options.blindPlay,
      rotatingVira: h.options.rotatingVira,
      maxLevel: h.options.maxLevel,
      tieWinner: h.options.tieWinner === undefined ? undefined : side(h.options.tieWinner),
      availableRanks: h.options.availableRanks,
    },
  };
}

/** Fecha a mão em duplas: projeta para você e passa pela pontuação de sempre. */
export function coopFinish(run: RunState): HandSummary {
  const b = run.blind!;
  const h = b.coop!.dhand;
  if (h.phase !== 'done') throw new Error('A mão ainda não acabou');
  b.hand = projectHand(h, 0, b.coop!.seats.map((s) => s.name));
  return finishHand(run);
}
