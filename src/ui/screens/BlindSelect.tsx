import { sfx } from '../../audio/sfx';
import { BLIND_REWARD } from '../../data/balance';
import { BOSS_BY_ID } from '../../data/bosses';
import { opponentFor } from '../../data/opponents';
import { TAG_BY_ID } from '../../data/tags';
import { selectBlind, skipBlind } from '../../engine/run';
import { campChoose } from '../campaignOnline';
import { InventoryBar } from '../components/Items';
import { Portrait } from '../components/Portrait';
import { Tip } from '../components/Tip';
import { act, toast, useApp } from '../store';
import { fmtNum } from '../text';

export function BlindSelect() {
  const s = useApp();
  const run = s.run!;
  const online = !!run.coop?.online;
  const host = !!s.online?.camp?.host;
  return (
    <div className="blind-select">
      <InventoryBar />
      <h2 className="screen-title">Ante {run.ante}: escolha o próximo Blind</h2>
      <div className="blind-cards">
        {run.blinds.map((b, i) => {
          const boss = b.bossId ? BOSS_BY_ID[b.bossId] : null;
          const opp = opponentFor(b.opponentId, b.personality);
          const tag = b.tagId ? TAG_BY_ID[b.tagId] : null;
          const current = i === run.blindIndex;
          const reward = b.kind === 'pequeno' && run.stake >= 2 ? 0 : BLIND_REWARD[b.kind];
          return (
            <div
              key={i}
              className={`blind-card kind-${b.kind} status-${b.status} ${current ? 'current' : ''}`}
              style={boss ? { ['--boss' as string]: boss.color } : undefined}
            >
              <div className="bc-kind">{boss ? (boss.finale ? '★ Chefe final ★' : 'Chefe') : b.name}</div>
              <div className="bc-head">
                <Portrait id={boss ? boss.id : opp.id} boss={!!boss} size={88} title={boss ? boss.name : opp.name} />
                <div className="bc-who">
                  <span className="bc-name">
                    {boss && <span className="bc-icon">{boss.icon}</span>} {boss ? boss.name : opp.name}
                  </span>
                  {!boss && <small className="bc-bio">{opp.bio}</small>}
                </div>
              </div>
              {boss && <p className="bc-rule">{boss.description}</p>}
              <div className="bc-target">
                Meta <b>{fmtNum(b.target)}</b>
              </div>
              <div className="bc-reward">
                Prêmio <b className="hl-money">{'$'.repeat(Math.max(1, reward)) || '—'}</b> {reward === 0 && <small>(sem prêmio)</small>}
              </div>
              {b.status === 'skipped' && <div className="bc-stamp">PULADO</div>}
              {b.status === 'defeated' && <div className="bc-stamp good">VENCIDO</div>}
              {current && online && !host && (
                <div className="bc-actions">
                  <span className="hint muted online-spinner">Esperando {s.online?.camp?.partner.name ?? 'o anfitrião'} escolher…</span>
                </div>
              )}
              {current && (!online || host) && (
                <div className="bc-actions">
                  <button
                    className="btn primary big"
                    autoFocus
                    onClick={() => {
                      sfx('deal');
                      // online: quem decide é o anfitrião, e o servidor avisa os dois
                      if (online) campChoose(false);
                      else act((r) => selectBlind(r));
                    }}
                  >
                    Jogar
                  </button>
                  {tag && (
                    <Tip content={online ? `${tag.description} (cada um ganha a sua)` : tag.description}>
                      <button
                        className="btn skip"
                        onClick={() => {
                          if (online) return campChoose(true);
                          const msg = act((r) => skipBlind(r));
                          sfx('pack');
                          toast(`Pulou! Ganhou: ${msg}`, 'good');
                        }}
                      >
                        Pular → {tag.icon} {tag.name}
                      </button>
                    </Tip>
                  )}
                </div>
              )}
              {!current && tag && b.status === 'upcoming' && (
                <div className="bc-tag">
                  Pular dá: {tag.icon} {tag.name}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {run.tags.filter((t) => !t.startsWith('pack:')).length > 0 && (
        <div className="active-tags">
          Tags ativas:{' '}
          {run.tags
            .filter((t) => TAG_BY_ID[t])
            .map((t, i) => (
              <Tip key={i} content={TAG_BY_ID[t].description}>
                <span className="tag-chip">
                  {TAG_BY_ID[t].icon} {TAG_BY_ID[t].name}
                </span>
              </Tip>
            ))}
        </div>
      )}
    </div>
  );
}
