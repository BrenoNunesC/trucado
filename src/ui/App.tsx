import { useEffect } from 'react';
import { sfx } from '../audio/sfx';
import { BOSS_BY_ID } from '../data/bosses';
import { Sidebar } from './components/Sidebar';
import { hideTip, TipLayer } from './components/Tip';
import { BlindSelect } from './screens/BlindSelect';
import { BlindView } from './screens/BlindView';
import { FreeMode } from './screens/FreeMode';
import { Collection, NewRunScreen, SettingsScreen, Title } from './screens/Menus';
import { Modals } from './screens/Modals';
import { RunEnd } from './screens/RunEnd';
import { PackOverlay, Shop } from './screens/Shop';
import { Tutorial } from './screens/Tutorial';
import { setSettings, update, useApp } from './store';

function GameScreen() {
  const s = useApp();
  const run = s.run;
  if (!run) return <Title />;
  if (run.phase === 'over' || run.phase === 'victory') return <RunEnd />;
  return (
    <div className="game-layout">
      <Sidebar />
      <main className="game-main">
        {run.phase === 'select' && <BlindSelect />}
        {run.phase === 'blind' && run.blind && <BlindView />}
        {run.phase === 'shop' && run.shop && <Shop />}
      </main>
      {run.pack && <PackOverlay />}
    </div>
  );
}

export function App() {
  const s = useApp();

  // atalhos globais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        update((x) => (x.modal = x.modal ? null : x.screen === 'game' ? { type: 'menu' } : null));
      } else if (k === 'h' && !s.modal) update((x) => (x.modal = { type: 'how' }));
      else if (k === 'd' && !s.modal && s.screen === 'game' && s.run) update((x) => (x.modal = { type: 'deck', mode: 'view' }));
      else if (k === 'm') setSettings({ muted: !s.settings.muted });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.modal, s.screen, s.run, s.settings.muted]);

  useEffect(() => {
    hideTip();
  }, [s.screen, s.run?.phase, s.modal]);

  // cor da espiral do fundo, como no Balatro: muda com o Blind em jogo (ou a loja)
  const run = s.screen === 'game' ? s.run : null;
  const info = run && (run.blind?.info ?? (run.phase === 'select' ? run.blinds[run.blindIndex] : null));
  const tone = run?.phase === 'shop' ? 'loja' : info?.kind ?? '';
  const bossColor = info?.bossId ? BOSS_BY_ID[info.bossId]?.color : undefined;
  const cls = ['app', tone && `tone-${tone}`, s.settings.crt ? 'crt-on' : '', s.settings.reducedMotion ? 'reduced' : ''].join(' ');
  return (
    <div className={cls} style={bossColor ? { ['--boss-tone' as string]: bossColor } : undefined}>
      <div className="swirl-bg" aria-hidden />
      <div id="shake-root" className="shake-root">
        {s.screen === 'title' && <Title />}
        {s.screen === 'newRun' && <NewRunScreen />}
        {s.screen === 'game' && <GameScreen />}
        {s.screen === 'free' && <FreeMode />}
        {s.screen === 'tutorial' && <Tutorial />}
        {s.screen === 'collection' && <Collection />}
        {s.screen === 'settings' && <SettingsScreen />}
      </div>
      <Modals />
      <div className="toasts" aria-live="polite">
        {s.toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
      <button
        className="mute-btn"
        onClick={() => {
          setSettings({ muted: !s.settings.muted });
          sfx('click');
        }}
        aria-label={s.settings.muted ? 'Ligar som' : 'Desligar som'}
        title="Som (M)"
      >
        {s.settings.muted ? '🔇' : '🔊'}
      </button>
      <div id="fx-layer" className="fx-layer" aria-hidden />
      <TipLayer />
      {s.settings.crt && <div className="crt-overlay" aria-hidden />}
    </div>
  );
}
