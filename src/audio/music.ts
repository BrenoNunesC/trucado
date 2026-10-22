// Trilha do boteco: toca as músicas que você colocar na pasta Músicas\Trucado (no jogo instalado)
// ou que escolher na hora (no navegador), e as do YouTube adicionadas por link. O jogo não traz
// música nenhuma: a trilha é a sua.
// Nome do arquivo no formato "Artista - Música.mp3" aparece bonitinho no tocador.
//
// As do YouTube tocam no player embutido (IFrame API), escondido: só o áudio importa. Nada é
// baixado; o vídeo vem em streaming, pedido na menor qualidade.

import { useSyncExternalStore } from 'react';
import type { MusicLink } from '../ui/persist';

interface TrucadoBridge {
  listarMusicas(): Promise<{ pasta: string; faixas: string[] }>;
  abrirPastaMusicas(): Promise<string>;
}

/** O pedaço da IFrame API do YouTube que o tocador usa. */
interface YTPlayer {
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(v: number): void;
  setPlaybackQuality?(q: string): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      width: number;
      height: number;
      playerVars?: Record<string, number | string>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void; onError?: () => void };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    trucado?: TrucadoBridge;
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface Track {
  src: string;
  title: string;
  artist: string;
  /** Vídeo do YouTube (senão é arquivo). */
  youtube?: string;
}

interface MusicState {
  tracks: Track[];
  index: number;
  playing: boolean;
  shuffle: boolean;
  /** Pasta das músicas (no jogo instalado) ou null (no navegador). */
  folder: string | null;
  volume: number;
  on: boolean;
}

const state: MusicState = { tracks: [], index: 0, playing: false, shuffle: true, folder: null, volume: 0.5, on: true };
/** Arquivos (pasta ou escolhidos) e links do YouTube; a lista tocada é a soma dos dois. */
let files: Track[] = [];
let links: Track[] = [];
let version = 0;
/** Já começou a tocar nesta sessão (para começar sozinho só na abertura). */
let started = false;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  for (const l of listeners) l();
};

let audio: HTMLAudioElement | null = null;
function el(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.addEventListener('ended', () => next());
    audio.addEventListener('error', () => {
      // arquivo com problema: pula para a próxima (se tiver outra)
      if (audio?.getAttribute('src') && state.tracks.length > 1) next();
      else stop();
    });
  }
  return audio;
}

// ---------------------------------------------------------------- YouTube

let ytHost: HTMLDivElement | null = null;
let ytPlayer: Promise<YTPlayer> | null = null;

/** O player do YouTube, criado na primeira música de lá (carrega a IFrame API uma vez só). */
function youtube(): Promise<YTPlayer> {
  if (ytPlayer) return ytPlayer;
  ytHost = document.createElement('div');
  ytHost.className = 'yt-host';
  const slot = document.createElement('div');
  ytHost.appendChild(slot);
  document.body.appendChild(ytHost);
  ytPlayer = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    // sem internet, ou o YouTube bloqueado na rede: desiste e deixa tentar de novo depois
    const fail = () => {
      script.remove();
      reject(new Error('youtube'));
    };
    script.onerror = fail;
    setTimeout(() => !window.YT?.Player && fail(), 15000);
    document.head.appendChild(script);
  }).then(
    (YT) =>
      new Promise<YTPlayer>((resolve) => {
        const p: YTPlayer = new YT.Player(slot, {
          width: 1,
          height: 1,
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: () => {
              p.setVolume(Math.round(state.volume * 100));
              resolve(p);
            },
            onStateChange: (e) => {
              if (!current()?.youtube) return;
              if (e.data === 0) next(); // acabou
              else if (e.data === 1) setPlaying(true);
              else if (e.data === 2) setPlaying(false);
            },
            onError: () => {
              // vídeo removido ou que não deixa tocar fora do YouTube
              if (state.tracks.length > 1) next();
              else stop();
            },
          },
        });
      }),
  );
  return ytPlayer;
}

/** Aviso quando o YouTube não abre (a UI mostra um toast). */
let onYouTubeError: (() => void) | null = null;
export const setYouTubeErrorHandler = (fn: () => void) => (onYouTubeError = fn);


/** Id do vídeo num link do YouTube (watch, youtu.be, shorts, embed, music) ou o próprio id. */
export function youtubeId(text: string): string | null {
  const t = text.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  try {
    const u = new URL(/^https?:/i.test(t) ? t : `https://${t}`);
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    let id: string | null = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Confere o link e busca o título do vídeo. Não salva: quem chama guarda nas configurações. */
export async function resolveYouTube(text: string): Promise<MusicLink | null> {
  const id = youtubeId(text);
  if (!id) return null;
  let title = 'Música do YouTube';
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (r.ok) title = ((await r.json()) as { title?: string }).title || title;
  } catch {
    // sem internet agora: fica o título genérico
  }
  return { id, title };
}

// ---------------------------------------------------------------- tocador

/** "Artista - Música.mp3" → artista e música. */
export function parseTitle(file: string, ext = true): { title: string; artist: string } {
  const base = (ext ? file.replace(/\.[^.]+$/, '') : file).replace(/_/g, ' ');
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: base.trim() };
}

const current = (): Track | undefined => state.tracks[state.index];
function setPlaying(v: boolean) {
  state.playing = v;
  emit();
}

function load(i: number) {
  const t = state.tracks[i];
  if (!t) return;
  state.index = i;
  if (state.on) started = true;
  if (t.youtube) {
    audio?.pause();
    const id = t.youtube;
    youtube().then(
      (p) => {
        if (current()?.youtube !== id) return; // trocou de música enquanto carregava
        p.setVolume(Math.round(state.volume * 100));
        p.setPlaybackQuality?.('small'); // só o áudio interessa
        if (state.on) p.loadVideoById(id);
        else p.cueVideoById(id);
      },
      () => {
        ytHost?.remove();
        ytHost = null;
        ytPlayer = null;
        setPlaying(false);
        onYouTubeError?.();
      },
    );
  } else {
    ytPause();
    const a = el();
    a.src = t.src;
    a.volume = state.volume;
    if (state.on) void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  emit();
}

function ytPause() {
  if (ytPlayer) void ytPlayer.then((p) => p.pauseVideo());
}

function pickNext(step: 1 | -1): number {
  const n = state.tracks.length;
  if (n <= 1) return 0;
  if (state.shuffle && step === 1) {
    let i = state.index;
    while (i === state.index) i = Math.floor(Math.random() * n);
    return i;
  }
  return (state.index + step + n) % n;
}

export function next(): void {
  if (state.tracks.length) load(pickNext(1));
}
export function prev(): void {
  if (state.tracks.length) load(pickNext(-1));
}

export function stop(): void {
  audio?.pause();
  ytPause();
  setPlaying(false);
}

export function togglePlay(): void {
  const t = current();
  if (!t) return;
  if (t.youtube) {
    if (!ytPlayer) return load(state.index);
    void ytPlayer.then((p) => (state.playing ? p.pauseVideo() : p.playVideo()));
    return;
  }
  const a = el();
  if (state.playing) {
    a.pause();
    setPlaying(false);
  } else if (!a.getAttribute('src') || a.src !== new URL(t.src, location.href).href) load(state.index);
  else void a.play().then(() => setPlaying(true));
}

/** Toca uma música da lista (ex.: o link que acabou de ser adicionado). */
export function playSrc(src: string): void {
  const i = state.tracks.findIndex((t) => t.src === src);
  if (i >= 0) load(i);
}

export function setShuffle(v: boolean): void {
  state.shuffle = v;
  emit();
}

/** Junta arquivos e links na lista tocada, mantendo a música atual no lugar. */
function rebuild(autoplay: boolean) {
  const was = current()?.src;
  state.tracks = [...files, ...links];
  const keep = state.tracks.findIndex((t) => t.src === was);
  if (keep >= 0) state.index = keep;
  else if (state.tracks.length) {
    state.index = state.shuffle ? Math.floor(Math.random() * state.tracks.length) : 0;
    if (autoplay && state.on) load(state.index);
    else if (was) stop(); // a música que tocava saiu da lista
  } else stop();
  emit();
}

/** Volume (0..1), liga/desliga e os links do YouTube, vindos das configurações. */
export function configureMusic(volume: number, on: boolean, ytLinks: MusicLink[] = []): void {
  state.volume = volume;
  if (audio) audio.volume = volume;
  if (ytPlayer) void ytPlayer.then((p) => p.setVolume(Math.round(volume * 100)));
  const was = state.on;
  state.on = on;
  const nextLinks = ytLinks.map((l) => ({ src: `yt:${l.id}`, youtube: l.id, ...parseTitle(l.title, false) }));
  const changed = nextLinks.map((l) => l.src + l.title).join() !== links.map((l) => l.src + l.title).join();
  links = nextLinks;
  if (changed) rebuild(false);
  if (!on) stop();
  else if (!was && state.tracks.length) load(state.index);
  emit();
}

/** Lê a pasta de músicas de novo (jogo instalado). Começa a tocar se estava parado. */
export async function refreshMusic(): Promise<void> {
  const bridge = window.trucado;
  if (!bridge) return;
  const { pasta, faixas } = await bridge.listarMusicas();
  state.folder = pasta;
  files = faixas.map((f) => ({ src: `musica://faixas/${encodeURIComponent(f)}`, ...parseTitle(f) }));
  rebuild(!state.playing);
  // abrindo o jogo: a trilha começa sozinha (também quando só tem músicas do YouTube)
  if (!started && !state.playing && state.on && state.tracks.length) load(state.index);
}

/** Navegador: músicas escolhidas na hora (valem até fechar a página). */
export function playFiles(list: FileList | File[]): void {
  for (const t of files) if (t.src.startsWith('blob:')) URL.revokeObjectURL(t.src);
  files = [...list]
    .filter((f) => f.type.startsWith('audio/') || /\.(mp3|ogg|m4a|wav|flac|opus|aac)$/i.test(f.name))
    .map((f) => ({ src: URL.createObjectURL(f), ...parseTitle(f.name) }));
  rebuild(false);
  if (files.length && state.on) playSrc(files[state.shuffle ? Math.floor(Math.random() * files.length) : 0].src);
}

export const openMusicFolder = () => void window.trucado?.abrirPastaMusicas();
export const hasMusicFolder = () => !!window.trucado;

export function useMusic(): MusicState {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return state;
}
