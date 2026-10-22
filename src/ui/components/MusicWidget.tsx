// Tocador da trilha do boteco, no canto de baixo à esquerda: música tocando, anterior, tocar ou
// pausar, próxima e aleatório. Sem faixas, vira um convite para colocar as suas.

import { useEffect, useRef, useState } from 'react';
import { hasMusicFolder, next, openMusicFolder, prev, refreshMusic, setShuffle, togglePlay, playFiles, useMusic } from '../../audio/music';
import { useApp } from '../store';

export function MusicWidget() {
  const m = useMusic();
  const s = useApp();
  const [open, setOpen] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  // jogo instalado: lê a pasta ao abrir e quando a janela volta ao foco (música nova colocada)
  useEffect(() => {
    void refreshMusic();
    const onFocus = () => void refreshMusic();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (!s.settings.musicOn) return null;
  const t = m.tracks[m.index];
  const choose = () => (hasMusicFolder() ? openMusicFolder() : pick.current?.click());

  return (
    <div className={`music-widget ${open ? 'open' : ''}`}>
      <input ref={pick} type="file" accept="audio/*" multiple hidden onChange={(e) => e.target.files && playFiles(e.target.files)} />
      <button className="music-toggle" onClick={() => setOpen((x) => !x)} title="Trilha do boteco" aria-expanded={open}>
        <span className={m.playing ? 'eq on' : 'eq'} aria-hidden>
          <i />
          <i />
          <i />
        </span>
      </button>
      {open && (
        <div className="music-body">
          {t ? (
            <>
              <div className="music-now" title={t.artist ? `${t.artist} - ${t.title}` : t.title}>
                <b>{t.title}</b>
                {t.artist && <small>{t.artist}</small>}
              </div>
              <div className="music-controls">
                <button className="btn small" onClick={prev} aria-label="Anterior">
                  ⏮
                </button>
                <button className="btn small primary" onClick={togglePlay} aria-label={m.playing ? 'Pausar' : 'Tocar'}>
                  {m.playing ? '⏸' : '▶'}
                </button>
                <button className="btn small" onClick={next} aria-label="Próxima">
                  ⏭
                </button>
                <button className={`btn small ${m.shuffle ? 'primary' : ''}`} onClick={() => setShuffle(!m.shuffle)} aria-pressed={m.shuffle} title="Aleatório">
                  🔀
                </button>
              </div>
              <small className="muted">
                {m.index + 1}/{m.tracks.length} ·{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), choose())}>
                  {hasMusicFolder() ? 'abrir pasta' : 'trocar músicas'}
                </a>
              </small>
            </>
          ) : (
            <div className="music-empty">
              <p>Sem trilha ainda.</p>
              <p className="muted">
                {hasMusicFolder()
                  ? 'Coloque seus MP3 (ex.: "Thiaguinho - Buquê de Flores.mp3") na pasta Músicas\\Trucado.'
                  : 'Escolha arquivos de música do seu computador para tocar durante o jogo.'}
              </p>
              <button className="btn small primary" onClick={choose}>
                {hasMusicFolder() ? 'Abrir pasta das músicas' : 'Escolher músicas'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
