// Mesa durante um Blind: controla turnos da IA, ações do jogador, efeitos e pontuação.

import { useCallback, useEffect, useRef } from 'react';
import { sfx } from '../../audio/sfx';
import { BOSS_BY_ID } from '../../data/bosses';
import { speechFor, type SpeechEvent } from '../../data/speech';
import { opponentFor } from '../../data/opponents';
import {
  acceptOnze,
  aiStep,
  bluff,
  canBluff,
  declineOnze,
  finishHand,
  nextHand,
  playerBet,
  playerCanBet,
  playerCanPlayHidden,
  playerPlay,
  playerRespond,
} from '../../engine/blind';
import { isZap } from '../../engine/cards';
import { endRun, collectCashout } from '../../engine/run';
import type { RunState } from '../../engine/state';
import { actor, BET_NAMES, canRaise, responder, type BetResponse } from '../../engine/truco';
import { InventoryBar } from '../components/Items';
import { HandLog } from '../components/Sidebar';
import { Table } from '../components/Table';
import { burst, shake } from '../fx';
import { startScoreAnim } from '../scoreRunner';
import { act, delay, getState, say, toast, update, useApp } from '../store';
import { fmtNum } from '../text';


function talk(ev: SpeechEvent) {
  say(speechFor(ev, Math.random()));
}

/** Efeitos de rodada resolvida: compara quantas rodadas tinham resultado antes e depois. */
function roundFx(run: RunState, resolvedBefore: number) {
  const hand = run.blind?.hand;
  if (!hand) return;
  const resolved = hand.rounds.filter((r) => r.outcome);
  if (resolved.length <= resolvedBefore) return;
  const r = resolved[resolved.length - 1];
  const winCard = r.outcome === 'player' ? r.cards.player : r.outcome === 'ai' ? r.cards.ai : null;
  if (winCard && isZap(winCard, r.manilha)) {
    sfx('zap');
    shake(3);
    window.setTimeout(() => burst(document.querySelector(`[data-ref="${winCard.id}"]`), '#7dff6a', 30), 50);
  } else if (r.outcome === 'player') sfx('roundWin');
  else if (r.outcome === 'ai') sfx('roundLose');
  else sfx('tie');
}

function resolvedCount(run: RunState): number {
  return run.blind?.hand?.rounds.filter((r) => r.outcome).length ?? 0;
}

/** Fecha a mão se acabou: pontua e dispara a animação. */
function afterAction(before: number) {
  let summary = null as ReturnType<typeof finishHand> | null;
  act((run) => {
    const b = run.blind!;
    if (b.hand!.phase === 'done' && (b.stage === 'playing' || b.stage === 'onze')) summary = finishHand(run);
  });
  if (!summary) return;
  const s = summary as ReturnType<typeof finishHand>;
  for (const m of s.messages) toast(m, m.includes('−') ? 'bad' : 'info');
  if (s.winner === 'player') {
    window.setTimeout(() => talk('loseHand'), delay(300));
    if (s.score) startScoreAnim(s, before, afterScore);
    else afterScore();
  } else {
    if (s.winner === 'ai') {
      sfx('roundLose');
      window.setTimeout(() => talk(s.ranAway === 'player' ? 'playerRan' : 'winHand'), delay(200));
    } else toast('Mão nula: tudo empatado.', 'info');
    afterScore();
  }
}

/** Fanfarra de fim de Blind, depois da animação de pontos. */
function afterScore() {
  const b = getState().run?.blind;
  if (!b) return;
  if (b.stage === 'won') {
    sfx('blindWin');
    shake(2);
    burst({ x: window.innerWidth / 2, y: window.innerHeight / 3 }, '#ffd34d', 50);
  } else if (b.stage === 'lost') sfx('gameOver');
}

export function BlindView() {
  const s = useApp();
  const run = s.run!;
  const blind = run.blind!;
  const hand = blind.hand!;
  const busy = !!s.anim;
  const stage = blind.stage;
  const playing = stage === 'playing' && hand.phase !== 'done' && !busy;
  const who = actor(hand);
  const playerTurn = playing && hand.phase === 'play' && who === 'player';
  const mustRespond = playing && hand.phase === 'respond' && responder(hand) === 'player';
  const aiTurn = playing && who === 'ai';
  const boss = blind.info.bossId ? BOSS_BY_ID[blind.info.bossId] : null;
  const greeted = useRef(false);

  // fala de abertura
  useEffect(() => {
    if (!greeted.current && blind.handsPlayed === 1) {
      greeted.current = true;
      talk('greet');
    }
  }, [blind.handsPlayed]);

  // turno da IA
  useEffect(() => {
    if (!aiTurn) return;
    const t = window.setTimeout(
      () => {
        const before = blind.score;
        const resolvedBefore = resolvedCount(run);
        const step = act((r) => aiStep(r));
        if (!step) return;
        const a = step.decision.action;
        if (a.type === 'bet' || (a.type === 'respond' && a.response === 'raise')) {
          sfx('truco');
          shake(2);
          burst(document.querySelector('.bet-zone'), '#ff3d7f', 24);
        } else if (a.type === 'respond') sfx(a.response === 'accept' ? 'accept' : 'run');
        else sfx('card');
        if (step.speech) talk(step.speech);
        roundFx(run, resolvedBefore);
        afterAction(before);
      },
      delay(hand.phase === 'respond' ? 900 : 700),
    );
    return () => window.clearTimeout(t);
  }, [aiTurn, s.run?.blind?.hand?.log.length, hand.phase, blind.score, run]);

  const select = useCallback(
    (id: string) => {
      if (!playerTurn) return;
      sfx('click');
      update((st) => {
        const sel = st.selected;
        if (sel.includes(id)) st.selected = sel.filter((x) => x !== id);
        else st.selected = [...sel, id].slice(-2);
      });
    },
    [playerTurn],
  );

  const play = useCallback(
    (id: string, hidden = false) => {
      if (!playerTurn) return;
      if (hidden && !playerCanPlayHidden(run)) return;
      const before = blind.score;
      const resolvedBefore = resolvedCount(run);
      act((r) => playerPlay(r, id, hidden));
      sfx('card');
      update((st) => (st.selected = []));
      roundFx(run, resolvedBefore);
      afterAction(before);
    },
    [playerTurn, blind.score, run],
  );

  const doBet = useCallback(() => {
    if (playerTurn && playerCanBet(run)) {
      act((r) => playerBet(r));
      sfx('truco');
      shake(2);
      burst(document.querySelector('.bet-zone'), '#3de0ff', 24);
      window.setTimeout(() => talk('playerTruco'), delay(250));
    }
  }, [playerTurn, run]);

  const doRespond = useCallback(
    (r: BetResponse) => {
      if (!mustRespond) return;
      if (r === 'raise' && !canRaise(hand, 'player')) return;
      const before = blind.score;
      act((rn) => playerRespond(rn, r));
      if (r === 'raise') {
        sfx('truco');
        shake(2);
      } else sfx(r === 'accept' ? 'accept' : 'run');
      afterAction(before);
    },
    [mustRespond, hand, blind.score],
  );

  const doBluff = useCallback(() => {
    if (!playerTurn || !canBluff(run) || s.selected.length === 0) return;
    act((r) => bluff(r, s.selected));
    sfx('deal');
    update((st) => (st.selected = []));
    toast('Blefe! Cartas trocadas.', 'info');
  }, [playerTurn, run, s.selected]);

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

  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (getModalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3'].includes(k)) {
        const c = hand.hands.player[Number(k) - 1];
        if (c) play(c.id);
      } else if (k === 't') {
        if (mustRespond) doRespond('raise');
        else doBet();
      } else if (k === 'a') doRespond('accept');
      else if (k === 'c') doRespond('run');
      else if (k === 'b') doBluff();
      else if (k === 'v' && playerTurn && s.selected.length === 1) play(s.selected[0], true);
      else if (k === 'enter' || k === ' ') {
        if (stage === 'onze' && !busy) act((r) => acceptOnze(r));
        else if (playerTurn && s.selected.length === 1) play(s.selected[0]);
        else doNext();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hand, play, doBet, doRespond, doBluff, doNext, mustRespond, playerTurn, s.selected, stage, busy]);

  const summary = blind.lastSummary;
  const nextLevel = Math.min(4, (hand.pending?.level ?? hand.level) + 1);

  return (
    <div className="blind-view">
      <InventoryBar busy={busy} />
      <div className="table-wrap">
        <Table
          hand={hand}
          opponentName={boss ? boss.name : opponentFor(blind.info.opponentId, blind.info.personality).name}
          portraitId={boss ? boss.id : opponentFor(blind.info.opponentId, blind.info.personality).id}
          isBoss={!!boss}
          opponentTag={boss ? (boss.finale ? 'Chefe final' : 'Chefe') : blind.info.name}
          hideVira={blind.rules.hideVira}
          revealedAi={blind.revealed}
          selected={s.selected}
          canPlay={playerTurn}
          speech={s.speech}
          thinking={aiTurn}
          onCardClick={(c) => select(c.id)}
          onCardPlay={(c) => play(c.id)}
        />
        <HandLog log={blind.rules.hideVira ? hand.log.map((l) => (/^(Nova )?vira/i.test(l.text) ? { ...l, text: 'Vira escondida: a manilha é segredo!' } : l)) : hand.log} />
      </div>

      <div className="controls" role="toolbar" aria-label="Ações">
        {stage === 'onze' && !busy && (
          <>
            <span className="hint">Mão de Onze: jogar valendo Truco (×2) ou desistir?</span>
            <button className="btn primary" onClick={() => act((r) => acceptOnze(r))}>
              Jogar <kbd>Enter</kbd>
            </button>
            <button
              className="btn danger"
              onClick={() => {
                act((r) => declineOnze(r));
                afterScore();
              }}
            >
              Desistir
            </button>
          </>
        )}
        {mustRespond && (
          <>
            <span className="hint shout">{BET_NAMES[hand.pending!.level].toUpperCase()}! O que você faz?</span>
            <button className="btn primary" onClick={() => doRespond('accept')}>
              Aceitar <kbd>A</kbd>
            </button>
            <button className="btn danger" onClick={() => doRespond('run')}>
              Correr <kbd>C</kbd>
            </button>
            {canRaise(hand, 'player') && (
              <button className="btn truco" onClick={() => doRespond('raise')}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {playerTurn && (
          <>
            <span className="hint">
              {s.selected.length === 0 ? 'Sua vez: escolha uma carta (ou 1–3).' : s.selected.length === 1 ? 'Jogar ou blefar com a selecionada?' : 'Blefar: trocar as 2 selecionadas.'}
            </span>
            <button className="btn primary" disabled={s.selected.length !== 1} onClick={() => play(s.selected[0])}>
              Jogar <kbd>Enter</kbd>
            </button>
            {playerCanPlayHidden(run) && (
              <button
                className="btn"
                disabled={s.selected.length !== 1}
                onClick={() => play(s.selected[0], true)}
                title="Joga a carta de face para baixo: não vale nada, mas o adversário não vê qual foi"
              >
                Jogar virada <kbd>V</kbd>
              </button>
            )}
            {playerCanBet(run) && (
              <button className="btn truco" onClick={doBet}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
            {canBluff(run) && (
              <button className="btn" disabled={s.selected.length === 0} onClick={doBluff} title="Troca até 2 cartas por novas do monte">
                Blefar ({blind.bluffsLeft}) <kbd>B</kbd>
              </button>
            )}
          </>
        )}
        {aiTurn && <span className="hint muted">Adversário pensando…</span>}
        {busy && <span className="hint muted">Contando os pontos…</span>}
        {!busy && stage === 'handOver' && summary && (
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

function getModalOpen(): boolean {
  return !!document.querySelector('.modal-backdrop');
}

function SummaryLine() {
  const s = useApp();
  const sum = s.run!.blind!.lastSummary!;
  let text: string;
  if (sum.winner === 'player') text = sum.score ? `Você venceu a mão: +${fmtNum(sum.score.total)} pontos!` : 'Você venceu, mas a mão não pontuou.';
  else if (sum.winner === 'ai') text = sum.ranAway === 'player' ? 'Você correu.' : 'O adversário levou a mão.';
  else text = 'Mão nula.';
  return <span className={`hint ${sum.winner === 'player' ? 'good' : sum.winner === 'ai' ? 'bad' : ''}`}>{text}</span>;
}

function CashoutPanel({ onCollect }: { onCollect: () => void }) {
  const s = useApp();
  const blind = s.run!.blind!;
  const lines = blind.cashout ?? [];
  const total = lines.reduce((a, l) => a + l.amount, 0);
  return (
    <div className="cashout pop-in" role="dialog" aria-label="Blind vencido">
      <h2>Blind vencido!</h2>
      <div className="cashout-score">
        {fmtNum(blind.score)} / {fmtNum(blind.info.target)}
      </div>
      <ul>
        {lines.map((l, i) => (
          <li key={i} style={{ animationDelay: `${i * 0.15}s` }}>
            <span>{l.label}</span>
            <b className="hl-money">${l.amount}</b>
          </li>
        ))}
      </ul>
      <button className="btn primary big" onClick={onCollect} autoFocus>
        Receber ${total} <kbd>Enter</kbd>
      </button>
    </div>
  );
}
