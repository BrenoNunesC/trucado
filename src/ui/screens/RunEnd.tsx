import { useEffect } from 'react';
import { sfx } from '../../audio/sfx';
import { CATEGORY_BY_ID } from '../../data/categories';
import { DECK_BY_ID, STAKES } from '../../data/decks';
import { continueEndless } from '../../engine/run';
import { onlineLeave } from '../../net/client';
import { loadRun, saveOnlineRun, saveRun } from '../persist';
import { act, getState, update, updateProfile, useApp } from '../store';
import { fmtNum } from '../text';

/** Contabiliza o fim da run no perfil (recordes e desbloqueios) uma única vez. */
function record(won: boolean) {
  const run = getState().run!;
  if (run.recorded) return;
  run.recorded = true;
  updateProfile((p) => {
    p.runsPlayed += 1;
    if (won) {
      p.runsWon += 1;
      p.stakesWon[run.deckId] = Math.max(p.stakesWon[run.deckId] ?? 0, run.stake);
    }
    p.bestAnte = Math.max(p.bestAnte, won ? run.ante : run.ante - 1);
    p.bestHand = Math.max(p.bestHand, run.stats.bestHand);
  });
  // a campanha online tem a própria chave: não mexe na sua run solo salva
  if (run.coop?.online) saveOnlineRun(null);
  else saveRun(run.phase === 'over' ? null : run);
}

/** Sai da tela de fim de run; na campanha online, sai também da sala e devolve a run solo salva. */
function leave(screen: 'newRun' | 'title') {
  const online = !!getState().run?.coop?.online;
  if (online) onlineLeave();
  update((x) => {
    x.run = online ? loadRun() : null;
    x.screen = screen;
  });
}

export function RunEnd() {
  const s = useApp();
  const run = s.run!;
  const won = run.phase === 'victory';
  const st = run.stats;

  useEffect(() => {
    record(won);
    sfx(won ? 'victory' : 'gameOver');
  }, [won]);

  const rows: [string, string][] = [
    ['Ante alcançado', `${run.ante}${run.endless ? ' (infinito)' : ''}`],
    ['Blinds vencidos', `${st.blindsDefeated}`],
    ['Melhor mão', `${fmtNum(st.bestHand)}${st.bestHandCategory ? ` (${CATEGORY_BY_ID[st.bestHandCategory].name})` : ''}`],
    ['Mãos vencidas', `${st.handsWon}/${st.handsPlayed}`],
    ['Apostas pedidas', `${st.betsCalled} (${st.betsWon} levadas)`],
    ['Cangas', `${st.ties}`],
    ['Dinheiro ganho', `$${st.moneyEarned}`],
    ['Coringas vendidos', `${st.jokersSold}`],
    ['Cartas destruídas', `${st.cardsDestroyed}`],
    ['Deck / Stake', `${DECK_BY_ID[run.deckId].name} · ${STAKES[run.stake - 1].name}`],
  ];

  return (
    <div className="run-end pop-in">
      <h1 className={won ? 'neon-good' : 'neon-bad'}>{won ? 'VITÓRIA!' : 'FIM DE RUN'}</h1>
      <p className="subtitle">{won ? 'Você limpou a mesa do boteco inteiro!' : 'Hoje a sorte não sentou com você.'}</p>
      <dl className="stats">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="seed-line">
        Seed: <code>{run.seed}</code>{' '}
        <button className="btn tiny" onClick={() => void navigator.clipboard?.writeText(run.seed).catch(() => {})}>
          Copiar
        </button>
      </p>
      <div className="end-actions">
        {won && !run.coop?.online && (
          <button className="btn primary big" onClick={() => act((r) => continueEndless(r))}>
            Continuar no modo infinito
          </button>
        )}
        <button className="btn primary" onClick={() => leave('newRun')}>
          Nova run
        </button>
        <button className="btn" onClick={() => leave('title')}>
          Menu principal
        </button>
      </div>
    </div>
  );
}
