// Modo livre: truco clássico até 12 contra a IA.

import { useEffect, useState } from 'react';
import { sfx } from '../../audio/sfx';
import { OPPONENTS, opponentFor } from '../../data/opponents';
import { speechFor } from '../../data/speech';
import { FREE_TARGET, freeAiStep, freeBet, freeNext, freeOnze, freePlay, freeRespond, newFreeMatch } from '../../engine/free';
import { randomSeedString } from '../../engine/rng';
import { actor, BET_NAMES, canBet, canPlayHidden, canRaise, responder, type BetResponse } from '../../engine/truco';
import { Portrait } from '../components/Portrait';
import { HandLog } from '../components/Sidebar';
import { Table } from '../components/Table';
import { shake } from '../fx';
import { actFree, delay, say, update, updateProfile, useApp } from '../store';


export function Tentos({ n }: { n: number }) {
  return (
    <span className="tentos" aria-label={`${n} pontos`}>
      {Array.from({ length: FREE_TARGET }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

export function FreeMode() {
  const s = useApp();
  const m = s.free;

  if (!m) {
    return (
      <div className="free-setup">
        <h2 className="screen-title">Modo livre</h2>
        <p>Truco Paulista clássico, primeiro a {FREE_TARGET} pontos. Escolha o adversário:</p>
        <div className="person-choices">
          {OPPONENTS.map((o) => (
            <button
              key={o.id}
              className="deck-choice opp-choice"
              onClick={() => {
                sfx('deal');
                update((x) => {
                  x.free = newFreeMatch(randomSeedString(), o.personality, x.settings.freeOnze, x.settings.freeFerro);
                  x.free.opponentId = o.id;
                });
              }}
            >
              <Portrait id={o.id} size={72} title={o.name} />
              <b>{o.name}</b>
              <small>{o.bio}</small>
            </button>
          ))}
        </div>
        <p className="muted">
          Mão de Onze: {s.settings.freeOnze ? 'ligada' : 'desligada'} · Mão de Ferro: {s.settings.freeFerro ? 'ligada' : 'desligada'} (mude nas
          configurações)
        </p>
        <button className="btn" onClick={() => update((x) => (x.screen = 'title'))}>
          Voltar
        </button>
      </div>
    );
  }

  return <FreeTable />;
}

function FreeTable() {
  const s = useApp();
  const [hiddenNext, setHiddenNext] = useState(false);
  const m = s.free!;
  const opp = opponentFor(m.opponentId, m.personality);
  const h = m.hand;
  const who = actor(h);
  const playing = m.stage === 'playing' && h.phase !== 'done';
  const playerTurn = playing && h.phase === 'play' && who === 'player';
  const mustRespond = playing && h.phase === 'respond' && responder(h) === 'player';
  const aiTurn = playing && who === 'ai';

  useEffect(() => {
    if (!aiTurn) return;
    const t = window.setTimeout(() => {
      const d = actFree((mm) => freeAiStep(mm));
      if (!d) return;
      const a = d.action;
      if (a.type === 'bet' || (a.type === 'respond' && a.response === 'raise')) {
        sfx('truco');
        shake(2);
        say(speechFor(['truco', 'truco', 'seis', 'nove', 'doze'][Math.min(4, (h.pending?.level ?? 1))] as 'truco', Math.random()));
      } else if (a.type === 'respond') {
        sfx(a.response === 'accept' ? 'accept' : 'run');
        say(speechFor(a.response === 'accept' ? 'accept' : 'run', Math.random()));
      } else sfx('card');
    }, delay(700));
    return () => window.clearTimeout(t);
  }, [aiTurn, h.log.length, h.phase, h.pending?.level]);

  useEffect(() => {
    if (m.stage === 'over') {
      sfx(m.winner === 'player' ? 'victory' : 'gameOver');
      updateProfile((p) => (m.winner === 'player' ? (p.freeWins += 1) : (p.freeLosses += 1)));
    }
  }, [m.stage, m.winner]);

  const hiddenOk = playerTurn && canPlayHidden(h, 'player');
  const play = (id: string) => {
    if (!playerTurn) return;
    const hidden = hiddenNext && hiddenOk;
    actFree((mm) => freePlay(mm, id, hidden));
    setHiddenNext(false);
    sfx('card');
  };
  const respond = (r: BetResponse) => {
    if (!mustRespond) return;
    actFree((mm) => freeRespond(mm, r));
    sfx(r === 'run' ? 'run' : r === 'accept' ? 'accept' : 'truco');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['1', '2', '3'].includes(k)) {
        const c = h.hands.player[Number(k) - 1];
        if (c) play(c.id);
      } else if (k === 'v') {
        if (hiddenOk) setHiddenNext((v) => !v);
      } else if (k === 't') {
        if (mustRespond) respond('raise');
        else if (playerTurn && canBet(h, 'player')) actFree((mm) => freeBet(mm));
      } else if (k === 'a') respond('accept');
      else if (k === 'c') respond('run');
      else if (k === 'enter' && m.stage === 'handOver') actFree((mm) => freeNext(mm));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const nextLevel = Math.min(4, (h.pending?.level ?? h.level) + 1);
  return (
    <div className="free-mode">
      <div className="scoreboard">
        <div>
          <span>Você</span> <b>{m.score.player}</b> <Tentos n={m.score.player} />
        </div>
        <div>
          <span>{opp.name}</span> <b>{m.score.ai}</b> <Tentos n={m.score.ai} />
        </div>
        <button className="btn small" onClick={() => update((x) => ((x.free = null), (x.screen = 'title')))}>
          Sair
        </button>
      </div>
      <div className="table-wrap">
        <Table
          hand={h}
          opponentName={opp.name}
          portraitId={opp.id}
          selected={[]}
          canPlay={playerTurn}
          speech={s.speech}
          thinking={aiTurn}
          onCardClick={(c) => play(c.id)}
        />
        <HandLog log={h.log} />
      </div>
      <div className="controls">
        {m.stage === 'onze' && (
          <>
            <span className="hint">Mão de Onze! Jogar valendo 3 ou correr (adversário ganha 1)?</span>
            <button className="btn primary" onClick={() => actFree((mm) => freeOnze(mm, true))}>
              Jogar
            </button>
            <button className="btn danger" onClick={() => actFree((mm) => freeOnze(mm, false))}>
              Correr
            </button>
          </>
        )}
        {playerTurn && (
          <>
            <span className="hint">
              {hiddenNext && hiddenOk ? 'Clique na carta que vai jogar virada.' : 'Sua vez: clique numa carta (ou 1–3).'}
            </span>
            {hiddenOk && (
              <button
                className={`btn ${hiddenNext ? 'primary' : ''}`}
                aria-pressed={hiddenNext}
                onClick={() => setHiddenNext((v) => !v)}
                title="A próxima carta sai de face para baixo: não vale nada, mas o adversário não vê qual foi"
              >
                {hiddenNext ? 'Virada: ligada' : 'Virar a próxima'} <kbd>V</kbd>
              </button>
            )}
            {canBet(h, 'player') && (
              <button
                className="btn truco"
                onClick={() => {
                  actFree((mm) => freeBet(mm));
                  sfx('truco');
                  shake(2);
                }}
              >
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {mustRespond && (
          <>
            <span className="hint shout">{BET_NAMES[h.pending!.level].toUpperCase()}!</span>
            <button className="btn primary" onClick={() => respond('accept')}>
              Aceitar <kbd>A</kbd>
            </button>
            <button className="btn danger" onClick={() => respond('run')}>
              Correr <kbd>C</kbd>
            </button>
            {canRaise(h, 'player') && (
              <button className="btn truco" onClick={() => respond('raise')}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {aiTurn && <span className="hint muted">Adversário pensando…</span>}
        {m.stage === 'handOver' && (
          <>
            <span className={`hint ${m.lastPoints?.side === 'player' ? 'good' : 'bad'}`}>
              {m.lastPoints?.side ? `${m.lastPoints.side === 'player' ? 'Você' : 'Adversário'} +${m.lastPoints.points}` : 'Mão nula'}
            </span>
            <button className="btn primary" onClick={() => actFree((mm) => freeNext(mm))} autoFocus>
              Próxima mão <kbd>Enter</kbd>
            </button>
          </>
        )}
        {m.stage === 'over' && (
          <>
            <span className={`hint ${m.winner === 'player' ? 'good' : 'bad'}`}>{m.winner === 'player' ? 'Você venceu a partida!' : 'O adversário venceu.'}</span>
            <button className="btn primary" onClick={() => update((x) => (x.free = null))}>
              Nova partida
            </button>
          </>
        )}
      </div>
    </div>
  );
}
