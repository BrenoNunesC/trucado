// Mesa do Blind na campanha em dupla: você e o parceiro contra o adversário do Blind e um
// comparsa. O resto é a campanha de sempre: barra de Coringas e consumíveis, blefe, Mão de Onze,
// animação de pontuação e pagamento.

import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { speechFor, type SpeechEvent } from '../../data/speech';
import { bluffMaxCards, nextHand } from '../../engine/blind';
import { isZap } from '../../engine/cards';
import {
  coopActor,
  coopAiStep,
  coopBet,
  coopBluff,
  coopCanBet,
  coopCanBluff,
  coopCanPlayHidden,
  coopFinish,
  coopOnze,
  coopPlay,
  coopRespond,
} from '../../engine/coop';
import { dCanRaise, formatDuplasLog, teamOf, type SeatNo } from '../../engine/duplas';
import { collectCashout, endRun } from '../../engine/run';
import type { HandSummary, RunState } from '../../engine/state';
import { BET_NAMES, type BetResponse } from '../../engine/truco';
import { DuplasTable } from '../components/DuplasTable';
import { InventoryBar } from '../components/Items';
import { HandLog } from '../components/Sidebar';
import { burst, shake } from '../fx';
import { startScoreAnim } from '../scoreRunner';
import { act, delay, toast, update, useApp, type Speech } from '../store';
import { fmtNum } from '../text';
import { afterScore, CashoutPanel, getModalOpen, SummaryLine } from './BlindView';

/** Rodadas já resolvidas na mão em dupla. */
const resolvedCount = (run: RunState) => run.blind?.coop?.dhand.rounds.filter((r) => r.outcome !== undefined).length ?? 0;

/** Som e brilho da rodada que acabou de fechar (o zap faz festa). */
function roundFx(run: RunState, before: number) {
  const h = run.blind?.coop?.dhand;
  if (!h) return;
  const done = h.rounds.filter((r) => r.outcome !== undefined);
  if (done.length <= before) return;
  const r = done[done.length - 1];
  const win = r.best !== undefined ? r.cards[r.best] : null;
  if (r.outcome !== 'tie' && win && !r.hidden[r.best!] && isZap(win, r.manilha)) {
    sfx('zap');
    shake(3);
  } else if (r.outcome === 0) sfx('roundWin');
  else if (r.outcome === 1) sfx('roundLose');
  else sfx('tie');
}

export function CoopBlindView() {
  const s = useApp();
  const run = s.run!;
  const blind = run.blind!;
  const coop = blind.coop!;
  const h = coop.dhand;
  const busy = !!s.anim;
  const stage = blind.stage;
  const playing = stage === 'playing' && h.phase !== 'done' && !busy;
  const who = coopActor(run);
  const myTurn = playing && h.phase === 'play' && who === 0;
  const mustRespond = playing && h.phase === 'respond' && who === 0;
  const aiTurn = playing && who !== null && who !== 0;
  const names = coop.seats.map((x) => x.name);
  const [speech, setSpeech] = useState<(Speech & { seat: SeatNo }) | null>(null);
  const greeted = useRef(false);

  const talk = useCallback((seat: SeatNo, ev: SpeechEvent) => {
    const key = Date.now() + Math.random();
    setSpeech({ text: speechFor(ev, Math.random()), key, seat });
    window.setTimeout(() => setSpeech((cur) => (cur?.key === key ? null : cur)), 2400);
  }, []);

  // fala de abertura do adversário
  useEffect(() => {
    if (!greeted.current && blind.handsPlayed === 1) {
      greeted.current = true;
      talk(1, 'greet');
    }
  }, [blind.handsPlayed, talk]);

  /** Fecha a mão se ela acabou: pontua pela sua run e dispara a animação. */
  const afterAction = useCallback(
    (before: number) => {
      let summary: HandSummary | null = null;
      act((r) => {
        const b = r.blind!;
        if (b.coop!.dhand.phase === 'done' && (b.stage === 'playing' || b.stage === 'onze')) summary = coopFinish(r);
      });
      if (!summary) return;
      const sm = summary as HandSummary;
      for (const m of sm.messages) toast(m, m.includes('−') ? 'bad' : 'info');
      if (sm.winner === 'player') {
        window.setTimeout(() => talk(1, 'loseHand'), delay(300));
        if (sm.score) startScoreAnim(sm, before, afterScore);
        else afterScore();
      } else {
        if (sm.winner === 'ai') {
          sfx('roundLose');
          window.setTimeout(() => talk(1, sm.ranAway === 'player' ? 'playerRan' : 'winHand'), delay(200));
        } else toast('Mão nula: tudo empatado.', 'info');
        afterScore();
      }
    },
    [talk],
  );

  // a vez do parceiro ou dos adversários
  const cardsOnTable = h.rounds[h.rounds.length - 1].order.length;
  useEffect(() => {
    if (!aiTurn) return;
    const t = window.setTimeout(
      () => {
        const before = blind.score;
        const resolvedBefore = resolvedCount(run);
        const step = act((r) => coopAiStep(r));
        if (!step) return;
        const a = step.action;
        if (a.t === 'bet' || (a.t === 'respond' && a.r === 'raise')) {
          sfx('truco');
          if (teamOf(step.seat) === 1) {
            shake(2);
            burst(document.querySelector('.corner-bet'), '#ff3d7f', 24);
          }
        } else if (a.t === 'respond') sfx(a.r === 'accept' ? 'accept' : 'run');
        else sfx('card');
        if (step.speech) talk(step.seat, step.speech);
        roundFx(run, resolvedBefore);
        afterAction(before);
      },
      delay(h.phase === 'respond' ? 900 : 700),
    );
    return () => window.clearTimeout(t);
    // a vez pode passar de uma IA para outra (adversário → parceiro) sem nada novo no log:
    // por isso o efeito também olha quem age e quantas cartas já foram para a mesa
  }, [aiTurn, who, h.rounds.length, cardsOnTable, h.log.length, h.phase, blind.score, run, afterAction, talk]);

  const select = useCallback(
    (id: string) => {
      if (!myTurn) return;
      sfx('click');
      update((st) => {
        const sel = st.selected;
        if (sel.includes(id)) st.selected = sel.filter((x) => x !== id);
        else st.selected = [...sel, id].slice(-bluffMaxCards(run));
      });
    },
    [myTurn, run],
  );

  const play = useCallback(
    (id: string, hidden = false) => {
      if (!myTurn || (hidden && !coopCanPlayHidden(run))) return;
      const before = blind.score;
      const resolvedBefore = resolvedCount(run);
      act((r) => coopPlay(r, id, hidden));
      sfx('card');
      update((st) => (st.selected = []));
      roundFx(run, resolvedBefore);
      afterAction(before);
    },
    [myTurn, blind.score, run, afterAction],
  );

  const doBet = useCallback(() => {
    if (!myTurn || !coopCanBet(run)) return;
    act((r) => coopBet(r));
    sfx('truco');
    shake(2);
    burst(document.querySelector('.corner-bet'), '#3de0ff', 24);
    window.setTimeout(() => talk(0, 'playerTruco'), delay(250));
  }, [myTurn, run, talk]);

  const doRespond = useCallback(
    (r: BetResponse) => {
      if (!mustRespond || (r === 'raise' && !dCanRaise(h, 0))) return;
      const before = blind.score;
      act((rn) => coopRespond(rn, r));
      if (r === 'raise') {
        sfx('truco');
        shake(2);
      } else sfx(r === 'accept' ? 'accept' : 'run');
      afterAction(before);
    },
    [mustRespond, h, blind.score, afterAction],
  );

  const doBluff = useCallback(() => {
    if (!myTurn || !coopCanBluff(run) || s.selected.length === 0) return;
    act((r) => coopBluff(r, s.selected));
    sfx('deal');
    update((st) => (st.selected = []));
    toast('Blefe! Cartas trocadas.', 'info');
  }, [myTurn, run, s.selected]);

  const onze = useCallback(
    (playIt: boolean) => {
      if (stage !== 'onze' || busy) return;
      if (playIt) act((r) => coopOnze(r, true));
      else {
        act((r) => coopOnze(r, false));
        afterScore();
      }
    },
    [stage, busy],
  );

  const doNext = useCallback(() => {
    if (busy) return;
    if (stage === 'handOver') {
      act((r) => nextHand(r));
      sfx('deal');
    } else if (stage === 'won') {
      const total = act((r) => collectCashout(r));
      sfx('coin');
      toast(`+$${total}`, 'good');
    } else if (stage === 'lost') act((r) => endRun(r));
  }, [busy, stage]);

  // teclado (os mesmos atalhos da campanha solo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (getModalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3'].includes(k)) {
        const c = h.hands[0][Number(k) - 1];
        if (c) play(c.id);
      } else if (k === 't') {
        if (mustRespond) doRespond('raise');
        else doBet();
      } else if (k === 'a') doRespond('accept');
      else if (k === 'c') doRespond('run');
      else if (k === 'b') doBluff();
      else if (k === 'v' && myTurn && s.selected.length === 1) play(s.selected[0], true);
      else if (k === 'enter' || k === ' ') {
        if (stage === 'onze') onze(true);
        else if (myTurn && s.selected.length === 1) play(s.selected[0]);
        else doNext();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h, play, doBet, doRespond, doBluff, doNext, onze, mustRespond, myTurn, s.selected, stage]);

  const nextLevel = Math.min(4, (h.pending?.level ?? h.level) + 1);
  const log = h.log.map((e) => ({ ...e, text: formatDuplasLog(e.text, 0, names) }));
  const shownLog = blind.rules.hideVira ? log.map((l) => (/^(Nova )?vira/i.test(l.text) ? { ...l, text: 'Vira escondida: a manilha é segredo!' } : l)) : log;

  return (
    <div className="blind-view coop-blind">
      <InventoryBar busy={busy} />
      <div className="table-wrap">
        <DuplasTable
          hand={h}
          names={names}
          avatars={coop.seats.map((x) => x.avatar)}
          speech={speech}
          revealPartner={stage === 'onze'}
          revealedId={blind.revealed}
          hideVira={blind.rules.hideVira}
          canPlay={myTurn}
          selected={s.selected}
          onCardSelect={(c) => select(c.id)}
          onCardPlay={(c) => play(c.id)}
        />
        <HandLog log={shownLog} />
      </div>

      <div className="controls" role="toolbar" aria-label="Ações">
        {stage === 'onze' && !busy && (
          <>
            <span className="hint">Mão de Onze: você vê as cartas de {names[2]}. Jogar valendo Truco ou desistir?</span>
            <button className="btn primary" onClick={() => onze(true)}>
              Jogar <kbd>Enter</kbd>
            </button>
            <button className="btn danger" onClick={() => onze(false)}>
              Desistir
            </button>
          </>
        )}
        {mustRespond && (
          <>
            <span className="hint shout">
              {names[h.pending!.by]}: {BET_NAMES[h.pending!.level].toUpperCase()}! Você responde pela dupla.
            </span>
            <button className="btn primary" onClick={() => doRespond('accept')}>
              Aceitar <kbd>A</kbd>
            </button>
            <button className="btn danger" onClick={() => doRespond('run')}>
              Correr <kbd>C</kbd>
            </button>
            {dCanRaise(h, 0) && (
              <button className="btn truco" onClick={() => doRespond('raise')}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {myTurn && (
          <>
            <span className="hint">
              {s.selected.length === 0
                ? 'Sua vez: escolha uma carta (ou 1–3).'
                : s.selected.length === 1
                  ? 'Jogar ou blefar com a selecionada?'
                  : `Blefar: trocar as ${s.selected.length} selecionadas.`}
            </span>
            <button className="btn primary" disabled={s.selected.length !== 1} onClick={() => play(s.selected[0])}>
              Jogar <kbd>Enter</kbd>
            </button>
            {coopCanPlayHidden(run) && (
              <button className="btn" disabled={s.selected.length !== 1} onClick={() => play(s.selected[0], true)} title="Joga a carta de face para baixo: não vale nada, mas ninguém vê qual foi">
                Jogar virada <kbd>V</kbd>
              </button>
            )}
            {coopCanBet(run) && (
              <button className="btn truco" onClick={doBet}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
            {coopCanBluff(run) && (
              <button className="btn" disabled={s.selected.length === 0} onClick={doBluff} title={`Troca até ${bluffMaxCards(run)} cartas por novas do seu monte`}>
                Blefar ({blind.bluffsLeft}) <kbd>B</kbd>
              </button>
            )}
          </>
        )}
        {aiTurn && <span className="hint muted">Vez de {names[who!]}…</span>}
        {busy && <span className="hint muted">Contando os pontos…</span>}
        {!busy && stage === 'handOver' && blind.lastSummary && (
          <>
            <SummaryLine />
            <button className="btn primary" onClick={doNext}>
              Próxima mão <kbd>Enter</kbd>
            </button>
          </>
        )}
        {!busy && stage === 'lost' && (
          <>
            <span className="hint bad">Acabaram as mãos: faltaram {fmtNum(blind.info.target - blind.score)} pontos.</span>
            <button className="btn danger" onClick={doNext}>
              Ver resultado <kbd>Enter</kbd>
            </button>
          </>
        )}
      </div>

      {!busy && stage === 'won' && <CashoutPanel onCollect={doNext} />}
    </div>
  );
}
