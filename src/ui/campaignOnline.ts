// Campanha em dupla online, do lado da tela: liga a run local aos estados que chegam do servidor.
// A lógica fica em net/campaignRun.ts; aqui entram a rede, os sons e a animação da pontuação.

import { sfx } from '../audio/sfx';
import { nextHand } from '../engine/blind';
import type { CampView } from '../engine/campaign';
import type { HandSummary } from '../engine/state';
import { applyCampaign, bluffOnline, cardsMessage, createCampaignRun, scoreOnline, type CampEffects } from '../net/campaignRun';
import { JOKER_BY_ID } from '../data/jokers';
import { lockedJokerIds } from '../data/unlocks';
import { newUid } from '../engine/inventory';
import { onlineGift, onlineSend, setCampaignHandler, setGiftHandler } from '../net/client';
import { loadOnlineRun } from './persist';
import { startScoreAnim } from './scoreRunner';
import { afterScore } from './screens/BlindView';
import { act, getState, toast, update } from './store';

function handle(code: string, view: CampView): void {
  const s = getState();
  let run = s.run?.coop?.online?.code === code ? s.run : loadOnlineRun(code);
  if (!run) {
    const you = { name: s.settings.onlineName.trim() || 'Você', avatar: s.settings.onlineAvatar, personality: 'equilibrado' as const };
    run = createCampaignRun(view, code, s.online?.campDeck ?? 'classico', you, lockedJokerIds(s.profile));
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

/**
 * Coringa que o parceiro te deu na loja. Sem espaço, ele volta para quem deu; se for um seu que
 * voltou, abre um espaço a mais (Coringa nenhum some no caminho).
 */
setGiftHandler((from, joker, returned) => {
  const run = getState().run;
  if (!run?.coop?.online || !JOKER_BY_ID[joker.id]) return;
  const name = JOKER_BY_ID[joker.id].name;
  const fits = run.jokers.length < run.jokerSlots;
  if (!fits && !returned) {
    onlineGift(joker);
    toast(`${from} te deu ${name}, mas você não tem espaço: devolvido.`, 'bad');
    return;
  }
  act((r) => {
    if (r.jokers.length >= r.jokerSlots) r.jokerSlots += 1;
    r.jokers.push({ uid: newUid(r, 'j'), id: joker.id, edition: joker.edition, state: { ...joker.state }, cost: joker.cost });
    if (!r.seenJokers.includes(joker.id)) r.seenJokers.push(joker.id);
  });
  sfx('buy');
  toast(returned ? `${name} voltou para você.` : `${from} te deu ${name}!`, 'good');
});

/** Dá um Coringa seu para o parceiro (na loja). Ele sai da sua run na hora. */
export function campGiveJoker(uid: string): void {
  const run = getState().run;
  const j = run?.jokers.find((x) => x.uid === uid);
  if (!run?.coop?.online || run.phase !== 'shop' || !j) return;
  act((r) => (r.jokers = r.jokers.filter((x) => x.uid !== uid)));
  onlineGift({ id: j.id, edition: j.edition, state: { ...j.state }, cost: j.cost });
  sfx('coin');
  toast(`${JOKER_BY_ID[j.id].name} foi para o seu parceiro.`, 'info');
}

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
