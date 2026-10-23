// Tutorial interativo de 1 mão: manilha, canga, truco e Fichas × Mult.

import { useMemo, useReducer, useState, type ReactNode } from 'react';
import { sfx } from '../../audio/sfx';
import { makeCard } from '../../engine/cards';
import { newRun, selectBlind } from '../../engine/run';
import { scoreHand } from '../../engine/scoring';
import type { ScoreResult } from '../../engine/state';
import { bet, createHand, playCard, respond } from '../../engine/truco';
import { HandLog } from '../components/Sidebar';
import { Table } from '../components/Table';
import { burst, shake } from '../fx';
import { say, update, updateProfile, useApp } from '../store';
import { fmtMult, fmtNum } from '../text';

type Step = 'vira' | 'forca' | 'truco' | 'play1' | 'canga' | 'score';

function setup() {
  // run descartável: nunca vai para o store nem para o save
  const run = newRun({ seed: 'TUTORIAL', deckId: 'vermelho', stake: 1 });
  selectBlind(run);
  const zap = makeCard('Q', 'paus');
  const tres = makeCard('3', 'copas');
  const cinco = makeCard('5', 'espadas');
  const hand = createHand({
    player: [zap, tres, cinco],
    ai: [makeCard('3', 'espadas'), makeCard('K', 'paus'), makeCard('4', 'copas')],
    vira: makeCard('7', 'ouros'),
    mao: 'player',
  });
  run.blind!.hand = hand;
  return { run, hand, zap, tres };
}

export function Tutorial() {
  const s = useApp();
  const t = useMemo(setup, []);
  const [step, setStep] = useState<Step>('vira');
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const { hand, zap, tres, run } = t;

  const allowed = step === 'play1' ? tres.id : step === 'canga' ? zap.id : null;

  const onCard = (id: string) => {
    if (id !== allowed) {
      sfx('error');
      return;
    }
    sfx('card');
    playCard(hand, 'player', id);
    if (step === 'play1') {
      playCard(hand, 'ai', hand.hands.ai.find((c) => c.rank === '3')!.id);
      sfx('tie');
      say('Canga! Agora é que são elas.');
      setStep('canga');
    } else {
      playCard(hand, 'ai', hand.hands.ai.find((c) => c.rank === '4')!.id);
      sfx('zap');
      shake(3);
      burst(document.querySelector('.rounds'), '#7dff6a', 30);
      setScore(scoreHand(run, run.blind!, hand));
      setStep('score');
    }
    force();
  };

  const callTruco = () => {
    bet(hand, 'player');
    sfx('truco');
    shake(2);
    respond(hand, 'ai', 'accept');
    say('Desce! Tô dentro.');
    setStep('play1');
    force();
  };

  const finish = () => {
    updateProfile((p) => (p.tutorialDone = true));
    update((x) => (x.screen = 'title'));
  };

  const text: Record<Step, ReactNode> = {
    vira: (
      <>
        <b>A vira.</b> No começo de cada mão uma carta é virada: aqui, o <b>7♦</b>. A <b>manilha</b> é o valor seguinte na ordem — então as Damas
        (Q) viram manilhas e vencem qualquer outra carta.
      </>
    ),
    forca: (
      <>
        <b>Força das cartas:</b> 4 &lt; 5 &lt; 6 &lt; 7 &lt; Q &lt; J &lt; K &lt; A &lt; 2 &lt; 3. Entre manilhas, desempata o naipe: Paus &gt; Copas &gt;
        Espadas &gt; Ouros. Sua <b>Q♣ é o ZAP</b>, a carta mais forte do jogo!
      </>
    ),
    truco: (
      <>
        Com o Zap na mão, vale a pena <b>pedir TRUCO</b>: a mão passa a valer 3 e, na pontuação, o <span className="hl-mult">Mult</span> de partida é
        multiplicado por <b>×2</b>. Se o adversário aceitar e você perder, custa $1. Clique em <b>Truco!</b>
      </>
    ),
    play1: (
      <>
        Ele aceitou. A mão é melhor de 3 rodadas. Jogue o <b>3♥</b> primeiro: segure o Zap para depois.
      </>
    ),
    canga: (
      <>
        <b>Canga!</b> O adversário também tinha um 3: mesma força, ninguém leva a rodada. Empate na 1ª → <b>quem vencer a 2ª leva a mão</b>. Quem
        abriu a rodada empatada abre a próxima: sua vez. Jogue o <b>Zap</b>!
      </>
    ),
    score: (
      <>
        <b>Você venceu!</b> Agora a parte Balatro: a <b>Jogada</b> reconhecida (Zap) dá Fichas e Mult; o Truco dobra o Mult; cada carta vencedora soma
        Fichas; e no fim <span className="hl-chips">Fichas</span> × <span className="hl-mult">Mult</span> = pontos. Numa run, some pontos para bater a meta
        de cada Blind com poucas mãos — e compre Coringas para multiplicar tudo.
      </>
    ),
  };

  return (
    <div className="tutorial">
      <div className="coach pop-in" key={step} role="status">
        <div className="coach-avatar">🧔</div>
        <div className="coach-text">{text[step]}</div>
        <div className="coach-actions">
          {(step === 'vira' || step === 'forca') && (
            <button className="btn primary" autoFocus onClick={() => setStep(step === 'vira' ? 'forca' : 'truco')}>
              Entendi ▶
            </button>
          )}
          {step === 'truco' && (
            <button className="btn truco" autoFocus onClick={callTruco}>
              Truco!
            </button>
          )}
          {step === 'score' && (
            <button className="btn primary" autoFocus onClick={finish}>
              Concluir tutorial
            </button>
          )}
          <button className="btn small" onClick={finish}>
            Pular
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <Table
          hand={hand}
          opponentName="Seu Tião"
          portraitId="tiao"
          opponentTag="Professor"
          selected={allowed ? [allowed] : []}
          canPlay={!!allowed}
          speech={s.speech}
          onCardClick={(c) => onCard(c.id)}
        />
        <HandLog log={hand.log} />
      </div>
      {score && (
        <div className="tutorial-score pop-in">
          <ol>
            {score.steps.map((st, i) => (
              <li key={i}>
                <span>{st.label}</span>
                <span className="chips-box inline">{fmtNum(st.totalChips)}</span>×<span className="mult-box inline">{fmtMult(st.totalMult)}</span>
              </li>
            ))}
          </ol>
          <div className="hand-total">
            {fmtNum(score.chips)} × {fmtMult(score.mult)} = <b>{fmtNum(score.total)}</b>
          </div>
        </div>
      )}
    </div>
  );
}
