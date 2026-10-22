// Campanha em dupla online, do lado da tela: liga a run local aos estados que chegam do servidor.
// A lógica fica em net/campaignRun.ts; aqui entram a rede, os sons e a animação da pontuação.

import { sfx } from '../audio/sfx';
import { nextHand } from '../engine/blind';
import type { CampView } from '../engine/campaign';
import type { HandSummary } from '../engine/state';
import { applyCampaign, bluffOnline, cardsMessage, createCampaignRun, scoreOnline, type CampEffects } from '../net/campaignRun';
import { onlineSend, setCampaignHandler } from '../net/client';
import { loadOnlineRun } from './persist';
import { startScoreAnim } from './scoreRunner';
import { afterScore } from './screens/BlindView';
import { act, getState, toast, update } from './store';

function handle(code: string, view: CampView): void {
  const s = getState();
  let run = s.run?.coop?.online?.code === code ? s.run : loadOnlineRun(code);
  if (!run) {
    const you = { name: s.settings.onlineName.trim() || 'Você', avatar: s.settings.onlineAvatar, personality: 'equilibrado' as const };
    run = createCampaignRun(view, code, s.online?.campDeck ?? 'classico', you);
  }
  if (s.run !== run) {
    const r = run;
    update((x) => {
      x.run = r;
      x.screen = 'game';
      x.selected = [];
    });
  }
  if (run.phase === 'over' || run.phase === 'victory') return;

  const before = run.blind?.score ?? 0;
  let fx: CampEffects = {};
  act((r) => (fx = applyCampaign(r, view)));
  if (fx.skipped) {
    sfx('pack');
    toast(`Pulamos o Blind! Você ganhou: ${fx.skipped}`, 'good');
  }
  if (fx.sendCards) {
    sfx('deal');
    onlineSend({ t: 'ccards', ...cardsMessage(run) });
  }
  if (fx.score) score(view, before);
  if (fx.blindWon || fx.blindLost) afterScore();
}

/** Pontua a mão que acabou pela sua run, avisa o servidor e anima. */
function score(view: CampView, before: number): void {
  let summary: HandSummary | null = null;
  act((r) => (summary = scoreOnline(r, view)));
  const run = getState().run!;
  onlineSend({ t: 'cscore', handNo: view.table!.handNo, score: run.blind!.score });
  const sm = summary as HandSummary | null;
  if (!sm) return;
  for (const m of sm.messages) toast(m, m.includes('−') ? 'bad' : 'info');
  if (sm.winner === 'player' && sm.score) startScoreAnim(sm, before);
  else if (sm.winner === 'ai') sfx('roundLose');
  else if (sm.winner === null) toast('Mão nula: tudo empatado.', 'info');
}

setCampaignHandler(handle);

// ---------------------------------------------------------------- ações da tela

/** O anfitrião joga ou pula o Blind da vez. */
export const campChoose = (skip: boolean) => onlineSend({ t: 'cselect', skip });

/** Próxima mão: compra as suas cartas e manda para a mesa. */
export function campNextHand(): void {
  act((r) => nextHand(r));
  sfx('deal');
  onlineSend({ t: 'ccards', ...cardsMessage(getState().run!) });
}

/** Blefe: troca as cartas no seu monte e manda a mão nova. */
export function campBluff(cardIds: string[]): boolean {
  const view = getState().online?.camp;
  if (!view) return false;
  let cards = null as ReturnType<typeof bluffOnline>;
  act((r) => (cards = bluffOnline(r, view, cardIds)));
  if (!cards) return false;
  onlineSend({ t: 'cbluff', cards });
  return true;
}

/** Saiu da loja: o próximo Blind começa quando os dois saírem. */
export const campShopDone = () => onlineSend({ t: 'cshopdone' });
