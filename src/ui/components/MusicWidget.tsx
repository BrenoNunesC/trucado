// Tocador da trilha do boteco, no canto de baixo à esquerda: música tocando, anterior, tocar ou
// pausar, próxima e aleatório, e um campo para colar link do YouTube. Sem faixas, vira um convite
// para colocar as suas.

import { useEffect, useRef, useState } from 'react';
import { hasMusicFolder, next, openMusicFolder, playFiles, playSrc, prev, refreshMusic, resolveYouTube, setShuffle, setYouTubeErrorHandler, togglePlay, useMusic } from '../../audio/music';
import { getState, setSettings, toast, useApp } from '../store';

setYouTubeErrorHandler(() => toast('Não deu para abrir o YouTube: sem internet ou o site está bloqueado nesta rede.', 'bad'));

/** Adiciona um link do YouTube à trilha e já toca. Devolve se deu certo. */
export async function addYouTubeLink(text: string): Promise<boolean> {
  const link = await resolveYouTube(text);
  if (!link) {
    toast('Esse link não parece ser de um vídeo do YouTube.', 'bad');
    return false;
  }
  const links = getState().settings.musicLinks ?? [];
  if (!links.some((l) => l.id === link.id)) setSettings({ musicLinks: [...links, link] });
  if (!getState().settings.musicOn) setSettings({ musicOn: true });
  playSrc(`yt:${link.id}`);
  toast(`Na trilha: ${link.title}`, 'good');
  return true;
}

export function YouTubeField() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!url.trim() || busy) return;
    setBusy(true);
    if (await addYouTubeLink(url)) setUrl('');
    setBusy(false);
  };
  return (
    <form
      className="yt-field"
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
    >
      <input
        value={url}
        placeholder="Colar link do YouTube"
        aria-label="Link do YouTube"
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <button className="btn small primary" disabled={busy || !url.trim()}>
        {busy ? '…' : '+'}
      </button>
    </form>
  );
}

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
                <b>
                  {t.youtube && (
                    <span className="yt-badge" aria-label="YouTube">
                      ▶
                    </span>
                  )}
                  {t.title}
                </b>
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
                  ? 'Cole um link do YouTube abaixo ou coloque seus MP3 (ex.: "Thiaguinho - Buquê de Flores.mp3") na pasta Músicas\\Trucado.'
                  : 'Cole um link do YouTube abaixo ou escolha arquivos de música do seu computador.'}
              </p>
              <button className="btn small" onClick={choose}>
                {hasMusicFolder() ? 'Abrir pasta das músicas' : 'Escolher músicas'}
              </button>
            </div>
          )}
          <YouTubeField />
        </div>
      )}
    </div>
  );
}
