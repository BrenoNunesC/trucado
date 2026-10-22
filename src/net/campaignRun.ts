// Campanha em dupla online, do lado do jogo: a run local acompanhando o que o servidor decide.
// Sem tela nem rede aqui (a tela e os testes usam as mesmas funções).
//
// O servidor manda a sequência de Blinds, a mesa e o placar da dupla; o jogo sincroniza Ante e
// Blinds (a meta sai do seu baralho e da sua stake), compra as suas cartas, pontua a sua mão pela
// projeção de coop.ts e obedece ao placar da dupla (venceu, perdeu, próxima mão).

import { BOSS_BY_ID } from '../data/bosses';
import { canBluff, bluff, computeCashout, finishHand } from '../engine/blind';
import type { CampView, TableRules } from '../engine/campaign';
import { tableRulesOf } from '../engine/campaign';
import type { Card } from '../engine/cards';
import { projectHand } from '../engine/coop';
import { hasVoucher } from '../engine/inventory';
import { newRun, selectBlind, skipBlind, targetFor } from '../engine/run';
import type { CoopSeat, HandSummary, RunState } from '../engine/state';

/** Cria a run local quando a campanha começa. Cada um com o próprio baralho. */
export function createCampaignRun(view: CampView, code: string, deckId: string, you: CoopSeat): RunState {
  const run = newRun({ seed: `${view.seed}${view.seat}`.slice(0, 16), deckId, stake: view.stake, options: view.options });
  run.coop = {
    partner: { name: view.partner.name, avatar: view.partner.avatar, personality: 'equilibrado' },
    you,
    online: { code, seat: view.seat },
  };
  syncBlinds(run, view);
  return run;
}

/** Ante e Blinds iguais aos do servidor; a meta de cada Blind é calculada pela sua run. */
export function syncBlinds(run: RunState, view: CampView): void {
  run.ante = view.ante;
  run.blindIndex = view.blindIndex;
  run.blinds = view.blinds.map((b) => ({
    ...b,
    target: targetFor(run, b.kind, b.bossId ? (BOSS_BY_ID[b.bossId]?.targetMult ?? 1) : 1),
    reward: 0,
  }));
}

/** O que a tela precisa fazer depois de aplicar o estado novo. */
export interface CampEffects {
  /** Mandar as cartas da mão que acabou de ser comprada. */
  sendCards?: boolean;
  /** Pulou o Blind: a Tag que ganhou. */
  skipped?: string;
  /** Hora de pontuar a mão que acabou na mesa. */
  score?: boolean;
  /** O placar da dupla decidiu: venceu ou perdeu o Blind. */
  blindWon?: boolean;
  blindLost?: boolean;
}

/**
 * Aplica o estado do servidor à run local. Não pontua (isso é `scoreOnline`, que a tela chama
 * para poder animar) e não manda nada (a tela manda o que `CampEffects` pedir).
 */
export function applyCampaign(run: RunState, view: CampView): CampEffects {
  const fx: CampEffects = {};
  const t = view.table;

  if (view.phase === 'select') {
    // os dois saíram da loja: vem o próximo Blind
    if (run.phase === 'shop') {
      run.shop = null;
      run.pack = null;
      run.phase = 'select';
    }
    if (run.phase === 'select') {
      // o anfitrião pulou: cada um ganha a própria Tag
      while (run.blindIndex < view.blindIndex && view.blinds[run.blindIndex]?.status === 'skipped' && run.blinds[run.blindIndex]?.status !== 'skipped') {
        fx.skipped = skipBlind(run);
      }
      syncBlinds(run, view);
    }
    return fx;
  }

  if (view.phase === 'blind' && run.phase === 'select' && t) {
    syncBlinds(run, view);
    selectBlind(run);
    fx.sendCards = true;
    return fx;
  }

  const b = run.blind;
  if (!b || !t) {
    if (view.phase === 'over' && run.phase !== 'over') fx.blindLost = true;
    return fx;
  }
  b.handsLeft = Math.max(0, t.handsLeft);
  if (t.stage === 'scoring' && !t.sentScore && run.coop!.online!.scored !== handKey(view)) fx.score = true;
  if (t.stage === 'won' && b.stage !== 'won') {
    b.stage = 'won';
    b.cashout = computeCashout(run);
    fx.blindWon = true;
  } else if ((t.stage === 'lost' || view.phase === 'over') && b.stage !== 'lost') {
    b.stage = 'lost';
    fx.blindLost = true;
  } else if (t.stage === 'handOver' && (b.stage === 'won' || b.stage === 'lost' || b.stage === 'handOver')) {
    // a dupla ainda não chegou na meta: segue o jogo (mesmo que a sua parte já tenha passado)
    b.stage = 'handOver';
  }
  return fx;
}

/** As cartas, a meta e as regras que vão para o servidor quando a mão é comprada. */
export function cardsMessage(run: RunState): { handNo: number; cards: Card[]; target: number; rules: TableRules; peek: boolean } {
  const b = run.blind!;
  const cards = b.hand!.hands.player;
  return {
    handNo: b.handsPlayed,
    cards,
    target: b.info.target,
    rules: tableRulesOf(b.rules),
    peek: hasVoucher(run, 'olhoVivo') || cards.some((c) => c.edition === 'marcada'),
  };
}

/** Blefe online: troca as cartas no seu monte; o servidor recebe a mão nova. */
export function bluffOnline(run: RunState, view: CampView, cardIds: string[]): Card[] | null {
  const t = view.table;
  if (!t || t.stage !== 'playing' || t.hand.rounds.length !== 1 || t.hand.rounds[0].cards[0] || !canBluff(run)) return null;
  bluff(run, cardIds);
  return run.blind!.hand!.hands.player;
}

/**
 * Pontua a mão que acabou na mesa, pela sua run: a mão vista do seu lado passa pela pontuação de
 * sempre. As cartas voltam ao seu descarte como as do seu baralho (o servidor manda cópias; a
 * vira, que é da casa, não entra).
 */
/** Identifica uma mão da campanha (para pontuar cada uma só uma vez). */
export const handKey = (view: CampView) => `${view.ante}-${view.blindIndex}-${view.table?.handNo ?? 0}`;

export function scoreOnline(run: RunState, view: CampView): HandSummary {
  const b = run.blind!;
  const t = view.table!;
  run.coop!.online!.scored = handKey(view);
  b.hand = projectHand(t.hand, 0, t.seats.map((s) => s.name));
  const summary = finishHand(run);
  const deck = new Map(run.deck.map((c) => [c.id, c]));
  b.discard = b.discard.flatMap((c) => (deck.has(c.id) ? [deck.get(c.id)!] : []));
  b.handsLeft = Math.max(0, t.handsLeft);
  // quem decide se o Blind acabou é o placar da dupla, no servidor
  b.stage = 'handOver';
  b.cashout = undefined;
  return summary;
}
