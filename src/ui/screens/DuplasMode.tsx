// Duplas contra a máquina: você e um parceiro da IA contra uma dupla da IA, até 12.

import { useEffect, useState } from 'react';
import { decideDuplas } from '../../ai/duplas';
import { sfx } from '../../audio/sfx';
import { OPPONENTS, type OpponentDef } from '../../data/opponents';
import { speechFor, type SpeechEvent } from '../../data/speech';
import { applyDuplas, dActor, duplasViewFor, newDuplas, nextDuplasHand, type DuplasAction, type DuplasMatch, type SeatNo } from '../../engine/duplas';
import { createRng, fork, int, randomSeedString } from '../../engine/rng';
import { Portrait } from '../components/Portrait';
import { delay, update, useApp, type Speech } from '../store';
import { DuplasGame } from './DuplasGame';

/** Partida em andamento: a do motor e quem senta em cada lugar (0 é você). */
export interface LocalDuplas {
  match: DuplasMatch;
  seats: OpponentDef[];
}

export function DuplasMode() {
  const s = useApp();
  return s.duplas ? <LocalGame /> : <Setup />;
}

function Setup() {
  const s = useApp();
  const [partner, setPartner] = useState<string>('bene');
  const start = () => {
    sfx('deal');
    const rng = createRng(randomSeedString());
    const others = OPPONENTS.filter((o) => o.id !== partner);
    const pick = () => others.splice(int(rng, others.length), 1)[0];
    const p = OPPONENTS.find((o) => o.id === partner)!;
    const me: OpponentDef = { id: s.settings.onlineAvatar, name: 'Você', bio: '', personality: 'equilibrado', color: '#fff' };
    update((x) => {
      x.duplas = {
        match: newDuplas(randomSeedString(), { maoDeOnze: x.settings.freeOnze, maoDeFerro: x.settings.freeFerro }),
        seats: [me, pick(), p, pick()],
      };
    });
  };
  return (
    <div className="free-setup">
      <h2 className="screen-title">Duplas contra a máquina</h2>
      <p>Truco em duplas até 12: você e um parceiro contra uma dupla de fregueses. Escolha quem senta com você (a outra dupla é sorteada):</p>
      <div className="online-avatars duplas-partners">
        {OPPONENTS.map((o) => (
          <button key={o.id} className={`online-avatar ${partner === o.id ? 'selected' : ''}`} aria-pressed={partner === o.id} title={o.name} onClick={() => (sfx('click'), setPartner(o.id))}>
            <Portrait id={o.id} size={52} title={o.name} />
          </button>
        ))}
      </div>
      <p className="muted">
        Parceiro: <b>{OPPONENTS.find((o) => o.id === partner)?.name}</b> · Mão de Onze: {s.settings.freeOnze ? 'ligada' : 'desligada'} · Mão de Ferro:{' '}
        {s.settings.freeFerro ? 'ligada' : 'desligada'}
      </p>
      <div className="online-actions-row">
        <button className="btn primary big" onClick={start}>
          Sentar à mesa
        </button>
        <button className="btn" onClick={() => update((x) => (x.screen = 'title'))}>
          Voltar
        </button>
      </div>
    </div>
  );
}

const BET_SPEECH: SpeechEvent[] = ['truco', 'truco', 'seis', 'nove', 'doze'];

function LocalGame() {
  const s = useApp();
  const d = s.duplas!;
  const m = d.match;
  const [speech, setSpeech] = useState<(Speech & { seat: SeatNo }) | null>(null);
  const names = d.seats.map((x) => x.name);
  const view = duplasViewFor(m, 0, names);
  const bot = m.stage === 'onze' ? (m.onzeDecider !== 0 ? m.onzeDecider : null) : m.stage === 'playing' ? dActor(m.hand) : null;

  const talk = (seat: SeatNo, ev: SpeechEvent) => {
    const key = Date.now();
    setSpeech({ text: speechFor(ev, Math.random()), key, seat });
    window.setTimeout(() => setSpeech((cur) => (cur?.key === key ? null : cur)), 2200);
  };

  // a vez de alguém da máquina (inclusive o seu parceiro)
  useEffect(() => {
    if (bot === null || bot === 0) return;
    const t = window.setTimeout(
      () => {
        const a = decideDuplas(m, bot, fork(m.rng), d.seats[bot].personality);
        if (!a) return;
        update(() => applyDuplas(m, bot, a));
        if (a.t === 'bet') talk(bot, BET_SPEECH[Math.min(4, m.hand.pending?.level ?? 1)]);
        else if (a.t === 'respond') talk(bot, a.r === 'accept' ? 'accept' : a.r === 'run' ? 'run' : BET_SPEECH[Math.min(4, m.hand.pending?.level ?? 1)]);
      },
      delay(m.hand.phase === 'respond' ? 950 : 750),
    );
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot, m.hand.log.length, m.hand.rounds.length, m.hand.rounds[m.hand.rounds.length - 1].order.length, m.stage, m.handNo]);

  // a próxima mão vem sozinha depois de um tempo para ver o resultado
  useEffect(() => {
    if (m.stage !== 'handOver') return;
    const t = window.setTimeout(() => update(() => nextDuplasHand(m)), delay(2600));
    return () => window.clearTimeout(t);
  }, [m.stage, m.handNo, m]);

  const act = (a: DuplasAction) => update(() => applyDuplas(m, 0, a));
  const leave = () => update((x) => ((x.duplas = null), (x.screen = 'title')));

  return (
    <DuplasGame
      view={view}
      names={names}
      avatars={d.seats.map((x) => x.id)}
      speech={speech}
      onAct={act}
      topRight={
        <button className="btn small" onClick={leave}>
          Sair
        </button>
      }
      handOverControls={
        <button className="btn primary" onClick={() => update(() => nextDuplasHand(m))}>
          Próxima mão
        </button>
      }
      overControls={
        <>
          <button className="btn primary" onClick={() => update((x) => (x.duplas = null))}>
            Nova partida
          </button>
          <button className="btn" onClick={leave}>
            Menu
          </button>
        </>
      }
    />
  );
}
