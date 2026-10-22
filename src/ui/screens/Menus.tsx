// Título, nova run, configurações e coleção.

import { useState } from 'react';
import { ACHIEVEMENTS } from '../../data/achievements';
import { hasMusicFolder, openMusicFolder, playSrc, refreshMusic, useMusic } from '../../audio/music';
import { YouTubeField } from '../components/MusicWidget';
import { sfx } from '../../audio/sfx';
import { BOSSES } from '../../data/bosses';
import { DECKS, STAKES } from '../../data/decks';
import { JOKERS, RARITY_NAME } from '../../data/jokers';
import { makeCoop } from '../../engine/coop';
import { newRun } from '../../engine/run';
import { randomSeedString } from '../../engine/rng';
import { OPPONENTS } from '../../data/opponents';
import { JokerFace, JokerTip } from '../components/Items';
import { Portrait } from '../components/Portrait';
import { Tip } from '../components/Tip';
import { saveRun } from '../persist';
import { goSettings, setAdmin, setSettings, toast, update, useApp, type Screen } from '../store';
import { fmtNum } from '../text';

const go = (screen: Screen) =>
  update((s) => {
    sfx('click');
    s.screen = screen;
  });

export function Title() {
  const s = useApp();
  const p = s.profile;
  const canContinue = !!s.run && s.run.phase !== 'over';
  return (
    <div className="title-screen">
      <div className="logo" aria-label="Trucado">
        <span className="logo-suits">♣ ♥ ♠ ♦</span>
        <h1>
          {'TRUCADO'.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              {ch}
            </span>
          ))}
        </h1>
        <span className="logo-sub">roguelike de truco do boteco</span>
        <span className="logo-year">BAR DO ZÉ · DESDE 1985</span>
      </div>
      <nav className="title-menu">
        {canContinue && (
          <button className="btn primary big" onClick={() => go('game')}>
            Continuar run <small>(Ante {s.run!.ante})</small>
          </button>
        )}
        <button className={`btn ${canContinue ? '' : 'primary'} big`} onClick={() => update((x) => ((x.newRunCoop = false), (x.screen = 'newRun')))}>
          Nova run
        </button>
        <button className="btn" onClick={() => (sfx('click'), update((x) => ((x.newRunCoop = true), (x.screen = 'newRun'))))}>
          Campanha em dupla
        </button>
        <button className="btn" onClick={() => go('free')}>
          Modo livre (até 12)
        </button>
        <button className="btn" onClick={() => go('duplas')}>
          Duplas contra a máquina
        </button>
        <button className="btn" onClick={() => go('online')}>
          Jogar online
        </button>
        <button className={`btn ${p.tutorialDone ? '' : 'glow'}`} onClick={() => go('tutorial')}>
          Tutorial
        </button>
        <button className="btn" onClick={() => go('collection')}>
          Coleção
        </button>
        <button className="btn" onClick={goSettings}>
          Configurações
        </button>
        <button className="btn" onClick={() => update((x) => (x.modal = { type: 'how' }))}>
          Como funciona a pontuação
        </button>
      </nav>
      <div className="records">
        <span>Runs: {p.runsPlayed}</span>
        <span>Vitórias: {p.runsWon}</span>
        <span>Melhor Ante: {p.bestAnte}</span>
        <span>Melhor mão: {fmtNum(p.bestHand)}</span>
        <span>
          Coringas: {p.discoveredJokers.length}/{JOKERS.length}
        </span>
      </div>
    </div>
  );
}

export function NewRunScreen() {
  const s = useApp();
  const p = s.profile;
  const [deckId, setDeck] = useState('classico');
  const [stake, setStake] = useState(1);
  const [seed, setSeed] = useState(() => randomSeedString());
  const [partner, setPartner] = useState('bene');
  const coop = s.newRunCoop;
  const deckUnlocked = (unlockedBy?: string) => !unlockedBy || (p.stakesWon[unlockedBy] ?? 0) >= 1;
  const maxStake = Math.min(8, (p.stakesWon[deckId] ?? 0) + 1);

  const start = () => {
    const clean = seed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || randomSeedString();
    const run = newRun({
      seed: clean,
      deckId,
      stake: Math.min(stake, maxStake),
      options: { maoDeOnze: s.settings.campaignOnze, maoDeFerro: s.settings.campaignFerro },
    });
    if (coop) makeCoop(run, partner, s.settings.onlineAvatar);
    saveRun(run);
    sfx('deal');
    update((x) => {
      x.run = run;
      x.screen = 'game';
      x.selected = [];
    });
  };

  return (
    <div className="new-run">
      <h2 className="screen-title">{coop ? 'Campanha em dupla' : 'Nova run'}</h2>
      <div className="mode-toggle" role="radiogroup" aria-label="Modo">
        <button role="radio" aria-checked={!coop} className={`btn ${!coop ? 'primary' : ''}`} onClick={() => update((x) => (x.newRunCoop = false))}>
          Sozinho
        </button>
        <button role="radio" aria-checked={coop} className={`btn ${coop ? 'primary' : ''}`} onClick={() => update((x) => (x.newRunCoop = true))}>
          Em dupla
        </button>
      </div>
      {coop && (
        <>
          <p className="muted">
            Os Blinds são jogados em duplas: você e um parceiro contra o adversário do Blind e um comparsa dele. O baralho, os Coringas, os
            Tarôs, o dinheiro e a loja são os seus; quando a dupla leva a mão, a pontuação é sua.
          </p>
          <h3>Seu parceiro</h3>
          <div className="online-avatars duplas-partners">
            {OPPONENTS.map((o) => (
              <button
                key={o.id}
                className={`online-avatar ${partner === o.id ? 'selected' : ''}`}
                aria-pressed={partner === o.id}
                title={`${o.name}: ${o.bio}`}
                onClick={() => (sfx('click'), setPartner(o.id))}
              >
                <Portrait id={o.id} size={52} title={o.name} />
              </button>
            ))}
          </div>
          <p className="muted">
            Parceiro: <b>{OPPONENTS.find((o) => o.id === partner)?.name}</b>
          </p>
        </>
      )}
      <h3>Baralho</h3>
      <div className="deck-choices">
        {DECKS.map((d) => {
          const unlocked = deckUnlocked(d.unlockedBy);
          return (
            <button
              key={d.id}
              className={`deck-choice ${deckId === d.id ? 'selected' : ''} ${unlocked ? '' : 'locked'}`}
              style={{ ['--dc' as string]: d.color }}
              disabled={!unlocked}
              onClick={() => {
                sfx('click');
                setDeck(d.id);
                setStake(1);
              }}
            >
              <span className="dc-icon">{unlocked ? d.icon : '🔒'}</span>
              <b>{d.name}</b>
              <small>{unlocked ? d.description : `Vença uma run com o ${DECKS.find((x) => x.id === d.unlockedBy)?.name} para liberar.`}</small>
              {(p.stakesWon[d.id] ?? 0) > 0 && <span className="dc-won">✔ {STAKES[(p.stakesWon[d.id] ?? 1) - 1].name}</span>}
            </button>
          );
        })}
      </div>
      <h3>Stake</h3>
      <div className="stake-choices">
        {STAKES.map((st) => {
          const locked = st.level > maxStake;
          return (
            <Tip key={st.level} content={locked ? 'Vença a stake anterior com este baralho para liberar.' : `${st.description} (inclui as anteriores)`}>
              <button
                className={`stake-chip ${stake === st.level ? 'selected' : ''}`}
                style={{ ['--sc' as string]: st.color }}
                disabled={locked}
                onClick={() => setStake(st.level)}
                aria-label={st.name}
              >
                {locked ? '🔒' : st.level}
              </button>
            </Tip>
          );
        })}
        <span className="stake-name">{STAKES[stake - 1].name}</span>
      </div>
      <h3>Seed</h3>
      <div className="seed-input">
        <input
          value={seed}
          onChange={(e) => setSeed(e.target.value.toUpperCase())}
          maxLength={12}
          aria-label="Seed da run"
          spellCheck={false}
        />
        <button className="btn" onClick={() => setSeed(randomSeedString())}>
          🎲 Sortear
        </button>
      </div>
      <div className="end-actions">
        <button className="btn primary big" onClick={start}>
          Sentar à mesa ▶
        </button>
        <button className="btn" onClick={() => go('title')}>
          Voltar
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/** Trilha: liga/desliga, volume e onde ficam as músicas. */
function MusicSettings() {
  const st = useApp().settings;
  const m = useMusic();
  return (
    <section>
      <h3>Música</h3>
      <Toggle label="Tocar a trilha" hint="Toca as suas músicas durante o jogo (o tocador fica no canto de baixo à esquerda)." value={st.musicOn} onChange={(v) => setSettings({ musicOn: v })} />
      <label className="slider">
        Volume da música
        <input type="range" min={0} max={1} step={0.05} value={st.musicVolume} onChange={(e) => setSettings({ musicVolume: Number(e.target.value) })} />
        <span>{Math.round(st.musicVolume * 100)}%</span>
      </label>
      {hasMusicFolder() ? (
        <>
          <p className="muted">
            Coloque arquivos de música (MP3, OGG, M4A, FLAC…) na pasta abaixo. Nomeie como "Artista - Música.mp3" para o tocador mostrar certinho. {m.tracks.length} faixa(s) encontrada(s).
          </p>
          <p className="music-folder">
            <code>{m.folder ?? 'Músicas\\Trucado'}</code>
          </p>
          <div className="row">
            <button className="btn" onClick={openMusicFolder}>
              Abrir pasta das músicas
            </button>
            <button className="btn" onClick={() => void refreshMusic()}>
              Recarregar lista
            </button>
          </div>
        </>
      ) : (
        <p className="muted">No navegador, use o tocador (canto de baixo à esquerda) para escolher as músicas do seu computador.</p>
      )}
      <h4>Do YouTube</h4>
      <p className="muted">
        Cole o link de um vídeo (youtube.com, youtu.be ou YouTube Music). Toca só o áudio; precisa de internet.
      </p>
      <YouTubeField />
      {st.musicLinks.length > 0 && (
        <ul className="yt-list">
          {st.musicLinks.map((l) => (
            <li key={l.id}>
              <button className="link-btn" onClick={() => playSrc(`yt:${l.id}`)} title="Tocar agora">
                ▶ {l.title}
              </button>
              <button className="btn small danger" onClick={() => setSettings({ musicLinks: st.musicLinks.filter((x) => x.id !== l.id) })} aria-label={`Tirar ${l.title}`}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SettingsScreen() {
  const s = useApp();
  const st = s.settings;
  return (
    <div className="settings">
      <h2 className="screen-title">Configurações</h2>
      <section>
        <h3>Som</h3>
        <label className="slider">
          Volume
          <input type="range" min={0} max={1} step={0.05} value={st.volume} onChange={(e) => setSettings({ volume: Number(e.target.value) })} />
          <span>{Math.round(st.volume * 100)}%</span>
        </label>
        <Toggle label="Mudo" value={st.muted} onChange={(v) => setSettings({ muted: v })} />
      </section>
      <MusicSettings />
      <section>
        <h3>Vídeo e acessibilidade</h3>
        <div className="speed">
          Cenário da mesa:
          {(
            [
              ['auto', 'Automático'],
              ['itaipava', 'Mesa de bar'],
              ['sinuca', 'Sinuca'],
              ['quintal', 'Churrasco'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} className={`btn small ${st.tableTheme === v ? 'primary' : ''}`} title={v === 'auto' ? 'Mesa de bar; sinuca nos chefes; churrasco no Ante 8.' : undefined} onClick={() => setSettings({ tableTheme: v })}>
              {label}
            </button>
          ))}
        </div>
        <Toggle label="Efeito CRT (scanlines e vinheta)" value={st.crt} onChange={(v) => setSettings({ crt: v })} />
        <Toggle label="Tremor de tela" value={st.screenShake} onChange={(v) => setSettings({ screenShake: v })} />
        <Toggle label="Reduzir movimento" hint="Desliga partículas, inclinação e animações fortes." value={st.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} />
        <div className="speed">
          Velocidade das animações:
          {([1, 2, 3] as const).map((v) => (
            <button key={v} className={`btn small ${st.speed === v ? 'primary' : ''}`} onClick={() => setSettings({ speed: v })}>
              {v === 1 ? 'Normal' : v === 2 ? 'Rápida' : 'Turbo'}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Regras opcionais</h3>
        <p className="muted">Valem para novas runs / partidas.</p>
        <Toggle label="Mão de Onze na campanha" hint="A última mão do Blind vale Truco, sem apostas; dá para desistir." value={st.campaignOnze} onChange={(v) => setSettings({ campaignOnze: v })} />
        <Toggle label="Mão de Ferro na campanha" hint="Se faltar mais da metade da meta na última mão, ela é às cegas valendo Seis." value={st.campaignFerro} onChange={(v) => setSettings({ campaignFerro: v })} />
        <Toggle label="Mão de Onze no modo livre" value={st.freeOnze} onChange={(v) => setSettings({ freeOnze: v })} />
        <Toggle label="Mão de Ferro no modo livre" value={st.freeFerro} onChange={(v) => setSettings({ freeFerro: v })} />
      </section>
      <section>
        <h3>Online</h3>
        <label className="online-field">
          <span>Endereço do servidor</span>
          <input value={st.serverUrl} placeholder="wss://seu-servidor.onrender.com" onChange={(e) => setSettings({ serverUrl: e.target.value.trim() })} />
        </label>
        <p className="muted">As salas online valem as mesmas regras de Mão de Onze e de Ferro do modo livre (definidas por quem cria a sala).</p>
      </section>
      <section>
        <h3>Administrador</h3>
        <Toggle
          label="Modo administrador"
          hint="Libera todos os baralhos, stakes e Coringas e põe o Painel do administrador no Menu (Esc) durante a run: dinheiro, qualquer Coringa ou consumível, mais mãos e vencer o Blind."
          value={!!s.profile.admin}
          onChange={(v) => {
            setAdmin(v);
            toast(v ? 'Modo administrador ligado: tudo desbloqueado.' : 'Modo administrador desligado (o que foi liberado continua).', 'good');
          }}
        />
      </section>
      <button className="btn primary" onClick={() => update((x) => (x.screen = x.returnTo === 'settings' ? 'title' : x.returnTo))}>
        Voltar
      </button>
    </div>
  );
}

export function Collection() {
  const s = useApp();
  const found = new Set(s.profile.discoveredJokers);
  const done = new Set(s.profile.achievements ?? []);
  const rarities = ['comum', 'incomum', 'raro', 'lendario'] as const;
  return (
    <div className="collection">
      <h2 className="screen-title">
        Coleção — {found.size}/{JOKERS.length} Coringas
      </h2>
      {rarities.map((r) => (
        <section key={r}>
          <h3 className={`rarity-${r}`}>{RARITY_NAME[r]}</h3>
          <div className="collection-grid">
            {JOKERS.filter((j) => j.rarity === r).map((j) =>
              found.has(j.id) ? (
                <Tip key={j.id} content={<JokerTip id={j.id} />}>
                  <JokerFace id={j.id} />
                </Tip>
              ) : (
                <Tip key={j.id} content="Ainda não descoberto. Encontre na loja ou em pacotes.">
                  <div className="joker unknown" aria-label="Coringa não descoberto">
                    <span className="joker-icon">?</span>
                  </div>
                </Tip>
              ),
            )}
          </div>
        </section>
      ))}
      <section>
        <h3>
          Conquistas — {done.size}/{ACHIEVEMENTS.length}
        </h3>
        <div className="achievement-list">
          {ACHIEVEMENTS.map((a) => {
            const ok = done.has(a.id);
            return (
              <div key={a.id} className={`achievement ${ok ? 'done' : ''}`}>
                <span className="achievement-icon" aria-hidden>
                  {ok ? '🏆' : '🔒'}
                </span>
                <b>{ok || !a.secret ? a.name : '???'}</b>
                <small>{ok || !a.secret ? a.desc : 'Conquista secreta.'}</small>
              </div>
            );
          })}
        </div>
        {!!(s.profile.onlineWins || s.profile.onlineLosses || s.profile.duplasWins) && (
          <p className="muted">
            Online: {s.profile.onlineWins ?? 0} vitória(s), {s.profile.onlineLosses ?? 0} derrota(s) · Duplas: {s.profile.duplasWins ?? 0} vitória(s)
          </p>
        )}
      </section>
      <section>
        <h3>Chefes</h3>
        <div className="boss-list">
          {BOSSES.map((b) => (
            <div key={b.id} className={`boss-entry ${b.finale ? 'finale' : ''}`} style={{ ['--boss' as string]: b.color }}>
              <Portrait id={b.id} boss size={64} title={b.name} />
              <b>
                {b.icon} {b.name}
              </b>
              <small>
                {b.finale ? 'Chefe final · ' : `Ante ${b.minAnte}+ · `}
                {b.description}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3>Freguesia do bar</h3>
        <div className="boss-list">
          {OPPONENTS.map((o) => (
            <div key={o.id} className="boss-entry" style={{ ['--boss' as string]: o.color }}>
              <Portrait id={o.id} size={64} title={o.name} />
              <b>{o.name}</b>
              <small>{o.bio}</small>
            </div>
          ))}
        </div>
      </section>
      <button className="btn primary" onClick={() => go('title')}>
        Voltar
      </button>
    </div>
  );
}
