// Painel lateral estilo Balatro: Blind, pontuação, Fichas × Mult, mãos, blefes, dinheiro.

import { BOSS_BY_ID } from '../../data/bosses';
import { CATEGORY_BY_ID } from '../../data/categories';
import { FINAL_ANTE } from '../../data/balance';
import { opponentFor } from '../../data/opponents';
import { bluffMaxCards } from '../../engine/blind';
import { update, useApp } from '../store';
import { fmtMult, fmtNum } from '../text';
import { Tip } from './Tip';

export function Sidebar() {
  const s = useApp();
  const run = s.run!;
  const blind = run.blind;
  const info = blind?.info ?? run.blinds[run.blindIndex];
  const boss = info?.bossId ? BOSS_BY_ID[info.bossId] : null;
  const anim = s.anim;
  const score = anim ? anim.shown : blind?.score ?? 0;
  const target = info?.target ?? 0;
  const pct = target ? Math.min(100, (score / target) * 100) : 0;

  // sem animação, mostra a última mão pontuada do Blind
  const last = blind?.lastSummary?.score ?? null;
  const shown = anim ? anim.summary.score! : last;
  const cat = shown ? CATEGORY_BY_ID[shown.category] : null;
  const chips = anim ? anim.chips : last?.chips ?? 0;
  const mult = anim ? anim.mult : last?.mult ?? 0;
  const total = anim ? (anim.phase !== 'steps' ? Math.floor(anim.chips * anim.mult) : null) : last?.total ?? null;

  return (
    <aside className="sidebar">
      {info && run.phase === 'blind' && (
        <div className={`blind-panel kind-${info.kind}`} style={boss ? { ['--boss' as string]: boss.color } : undefined}>
          <div className="blind-name">
            {boss && <span className="boss-icon">{boss.icon}</span>}
            {boss ? boss.name : info.name}
          </div>
          {boss && <div className="boss-rule">{boss.description}</div>}
          {!boss && <div className="blind-meta">vs. {opponentFor(info.opponentId, info.personality).name}</div>}
          <div className="blind-target">
            <span>Meta</span>
            <b>{fmtNum(target)}</b>
          </div>
        </div>
      )}
      {run.phase === 'shop' && (
        <div className="blind-panel kind-shop">
          <div className="blind-name">🍺 Balcão do Seu Zé</div>
          <div className="boss-rule">Compre, venda e prepare-se.</div>
        </div>
      )}

      {run.phase === 'blind' && (
        <div className="round-score">
          <div className="label">Pontuação</div>
          <div className={`value ${anim?.phase === 'count' ? 'counting' : ''}`}>{fmtNum(score)}</div>
          <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {run.phase === 'blind' && (
        <div className={`hand-score ${anim ? 'active' : ''}`}>
          <div className="hand-cat">
            {cat ? (
              <>
                <b>{cat.name}</b> <small>nv. {shown!.level}</small>
              </>
            ) : (
              <span className="muted">—</span>
            )}
          </div>
          <div className="chips-mult">
            <div className="chips-box" id="chips-box">
              {fmtNum(chips)}
            </div>
            <span className="times">×</span>
            <div className="mult-box" id="mult-box">
              {fmtMult(mult)}
            </div>
          </div>
          {total !== null && <div className="hand-total pop-in">= {fmtNum(total)}</div>}
        </div>
      )}

      <div className="counters">
        {blind && (
          <>
            <Tip content="Mãos que ainda dá para jogar neste Blind (contando a atual).">
              <div className="counter hands">
                <span>Mãos</span>
                <b>{blind.handsLeft + (blind.stage === 'playing' || blind.stage === 'onze' ? 1 : 0)}</b>
              </div>
            </Tip>
            <Tip content={`Blefes: antes de jogar sua 1ª carta, troque até ${bluffMaxCards(run)} cartas por novas do monte.`}>
              <div className="counter bluffs">
                <span>Blefes</span>
                <b>{blind.bluffsLeft}</b>
              </div>
            </Tip>
          </>
        )}
        <Tip content="Juros: $1 a cada $5 guardados ao vencer um Blind (máx. $5).">
          <div className="counter money">
            <span>Dinheiro</span>
            <b>${run.money}</b>
          </div>
        </Tip>
        <div className="counter ante">
          <span>Ante</span>
          <b>
            {run.ante}
            <small>/{FINAL_ANTE}</small>
          </b>
        </div>
      </div>

      <div className="side-buttons">
        <button className="btn small" onClick={() => update((st) => (st.modal = { type: 'how' }))} title="Como funciona a pontuação (H)">
          ? Pontuação
        </button>
        <button className="btn small" onClick={() => update((st) => (st.modal = { type: 'deck', mode: 'view' }))} title="Ver baralho (D)">
          🂠 Baralho {run.deck.length}
        </button>
        <button className="btn small" onClick={() => update((st) => (st.modal = { type: 'menu' }))} title="Menu (Esc)">
          ☰ Menu
        </button>
      </div>
      <div className="seed-line" title="Seed da run">
        Seed <code>{run.seed}</code>
      </div>
    </aside>
  );
}

export function HandLog({ log }: { log: { kind: string; text: string }[] }) {
  return (
    <div className="hand-log" aria-label="Log da mão" aria-live="polite">
      <div className="row-label">Log da mão</div>
      <ol>
        {log.map((l, i) => (
          <li key={i} className={`log-${l.kind}`}>
            {l.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
