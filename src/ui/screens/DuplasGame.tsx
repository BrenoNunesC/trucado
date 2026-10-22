// Tela da partida em duplas, igual para o modo contra a máquina e para o online: mesa, botões,
// atalhos, sons e placar. Quem usa só diz o que fazer com cada jogada (onAct).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sfx } from '../../audio/sfx';
import { dActor, dCanBet, dCanPlayHidden, dCanRaise, DUPLAS_TARGET, teamOf, type DuplasAction, type DuplasView, type SeatNo } from '../../engine/duplas';
import { BET_NAMES, type BetResponse } from '../../engine/truco';
import { DuplasTable } from '../components/DuplasTable';
import { HandLog } from '../components/Sidebar';
import type { Speech } from '../store';
import { shake } from '../fx';
import { Tentos } from './FreeMode';

export interface DuplasGameProps {
  view: DuplasView;
  /** Nomes, personagens e conexão nos lugares da visão (0 = você, 2 = parceiro). */
  names: string[];
  avatars: string[];
  offline?: boolean[];
  speech?: (Speech & { seat: SeatNo }) | null;
  onAct: (a: DuplasAction) => void;
  /** O que aparece entre as mãos e no fim da partida (próxima mão, revanche, sair…). */
  handOverControls?: ReactNode;
  overControls?: ReactNode;
  /** Barra de cima: botão de sair, código da sala… */
  topRight?: ReactNode;
  banner?: ReactNode;
  footer?: ReactNode;
}

export function DuplasGame(p: DuplasGameProps) {
  const v = p.view;
  const h = v.hand;
  const [hiddenNext, setHiddenNext] = useState(false);
  const who = dActor(h);
  const playing = v.stage === 'playing' && h.phase !== 'done';
  const myTurn = playing && h.phase === 'play' && who === 0;
  const mustRespond = playing && h.phase === 'respond' && who === 0;
  const hiddenOk = myTurn && dCanPlayHidden(h, 0);
  const nextLevel = Math.min(4, (h.pending?.level ?? h.level) + 1);

  // sons a partir do que entrou de novo no log
  const seen = useRef({ hand: v.handNo, log: h.log.length, counts: h.hands.map((x) => x.length) });
  useEffect(() => {
    const prev = seen.current;
    const fresh = prev.hand === v.handNo ? h.log.slice(prev.log) : h.log;
    for (const e of fresh) {
      if (e.kind !== 'bet') continue;
      if (/pede|aumenta/.test(e.text)) {
        sfx('truco');
        if (h.pending && teamOf(h.pending.by) === 1) shake(2);
      } else if (/aceita/.test(e.text)) sfx('accept');
      else sfx('run');
    }
    if (prev.hand === v.handNo && [1, 2, 3].some((s) => h.hands[s].length < prev.counts[s])) sfx('card');
    seen.current = { hand: v.handNo, log: h.log.length, counts: h.hands.map((x) => x.length) };
  }, [v.handNo, h.log.length, h.log, h.hands, h.pending]);

  useEffect(() => {
    if (v.stage === 'over') sfx(v.winner === 0 ? 'victory' : 'gameOver');
  }, [v.stage, v.winner]);

  // uma ação por vez: até a mesa mudar (no online, até o servidor responder), cliques extras
  // (duplo clique, tecla repetida) são ignorados
  const stamp = `${v.handNo}-${v.stage}-${h.log.length}-${h.phase}-${h.hands[0].length}`;
  const sent = useRef<string | null>(null);
  const send = (a: DuplasAction) => {
    if (sent.current === stamp) return false;
    sent.current = stamp;
    p.onAct(a);
    return true;
  };
  const play = (id: string) => {
    if (!myTurn || !send({ t: 'play', cardId: id, hidden: hiddenNext && hiddenOk })) return;
    setHiddenNext(false);
    sfx('card');
  };
  const respond = (r: BetResponse) => {
    if (!mustRespond || (r === 'raise' && !dCanRaise(h, 0))) return;
    send({ t: 'respond', r });
  };
  const bet = () => {
    if (!myTurn || !dCanBet(h, 0) || !send({ t: 'bet' })) return;
    shake(2);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3'].includes(k)) {
        const c = h.hands[0][Number(k) - 1];
        if (c) play(c.id);
      } else if (k === 'v') {
        if (hiddenOk) setHiddenNext((x) => !x);
      } else if (k === 't') {
        if (mustRespond) respond('raise');
        else bet();
      } else if (k === 'a') respond('accept');
      else if (k === 'c') respond('run');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const waitingName = who !== null && who !== 0 ? p.names[who] : null;

  return (
    <div className="free-mode duplas-mode">
      <div className="scoreboard">
        <div>
          <span>
            {p.names[0]} e {p.names[2]}
          </span>{' '}
          <b>{v.score[0]}</b> <Tentos n={v.score[0]} />
        </div>
        <div>
          <span>
            {p.names[3]} e {p.names[1]}
          </span>{' '}
          <b>{v.score[1]}</b> <Tentos n={v.score[1]} />
        </div>
        {p.topRight}
      </div>
      {p.banner}
      <div className="table-wrap">
        <DuplasTable
          hand={h}
          names={p.names}
          avatars={p.avatars}
          offline={p.offline}
          speech={p.speech}
          revealPartner={v.onzeWaiting === 0}
          canPlay={myTurn}
          onCardPlay={(c) => play(c.id)}
        />
        <HandLog log={h.log} />
      </div>
      <div className="controls">
        {v.onzeYou && (
          <>
            <span className="hint">Mão de Onze! Você vê as cartas do parceiro. Jogar valendo 3 ou correr (a outra dupla ganha 1)?</span>
            <button className="btn primary" onClick={() => send({ t: 'onze', play: true })}>
              Jogar
            </button>
            <button className="btn danger" onClick={() => send({ t: 'onze', play: false })}>
              Correr
            </button>
          </>
        )}
        {v.stage === 'onze' && !v.onzeYou && (
          <span className="hint muted">{v.onzeWaiting === 0 ? 'Seu parceiro decide a Mão de Onze…' : 'A dupla adversária decide a Mão de Onze…'}</span>
        )}
        {myTurn && (
          <>
            <span className="hint">{hiddenNext && hiddenOk ? 'Clique na carta que vai jogar virada.' : 'Sua vez: clique numa carta (ou 1–3).'}</span>
            {hiddenOk && (
              <button className={`btn ${hiddenNext ? 'primary' : ''}`} aria-pressed={hiddenNext} onClick={() => setHiddenNext((x) => !x)}>
                {hiddenNext ? 'Virada: ligada' : 'Virar a próxima'} <kbd>V</kbd>
              </button>
            )}
            {dCanBet(h, 0) && (
              <button className="btn truco" onClick={bet}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {mustRespond && (
          <>
            <span className="hint shout">
              {p.names[h.pending!.by]}: {BET_NAMES[h.pending!.level].toUpperCase()}!
            </span>
            <button className="btn primary" onClick={() => respond('accept')}>
              Aceitar <kbd>A</kbd>
            </button>
            <button className="btn danger" onClick={() => respond('run')}>
              Correr <kbd>C</kbd>
            </button>
            {dCanRaise(h, 0) && (
              <button className="btn truco" onClick={() => respond('raise')}>
                {BET_NAMES[nextLevel]}! <kbd>T</kbd>
              </button>
            )}
          </>
        )}
        {playing && waitingName && <span className="hint muted">Vez de {waitingName}…</span>}
        {v.stage === 'handOver' && (
          <>
            <span className={`hint ${v.lastPoints?.team === 0 ? 'good' : 'bad'}`}>
              {v.lastPoints?.team === null || v.lastPoints === null ? 'Mão nula' : `${v.lastPoints.team === 0 ? 'Sua dupla' : 'A dupla adversária'} +${v.lastPoints.points}`}
            </span>
            {p.handOverControls}
          </>
        )}
        {v.stage === 'over' && (
          <>
            <span className={`hint ${v.winner === 0 ? 'good' : 'bad'}`}>
              {v.winner === 0
                ? v.forfeit === 1
                  ? 'A outra dupla abandonou: vocês venceram!'
                  : `Vocês venceram a partida! (${v.score[0]} a ${v.score[1]})`
                : `A dupla adversária venceu. (${v.score[1]} a ${v.score[0]})`}
            </span>
            {p.overControls}
          </>
        )}
      </div>
      {p.footer}
      <p className="muted duplas-target">Primeira dupla a {DUPLAS_TARGET} pontos vence.</p>
    </div>
  );
}
