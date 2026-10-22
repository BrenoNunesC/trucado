// Trilha do boteco: toca as músicas que você colocar na pasta Músicas\Trucado (no jogo instalado)
// ou que escolher na hora (no navegador). O jogo não traz música nenhuma: a trilha é a sua.
// Nome do arquivo no formato "Artista - Música.mp3" aparece bonitinho no tocador.

import { useSyncExternalStore } from 'react';

interface TrucadoBridge {
  listarMusicas(): Promise<{ pasta: string; faixas: string[] }>;
  abrirPastaMusicas(): Promise<string>;
}
declare global {
  interface Window {
    trucado?: TrucadoBridge;
  }
}

export interface Track {
  src: string;
  title: string;
  artist: string;
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
let version = 0;
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
      if (state.tracks.length > 1) next();
      else stop();
    });
  }
  return audio;
}

/** "Artista - Música.mp3" → artista e música. */
export function parseTitle(file: string): { title: string; artist: string } {
  const base = file.replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  const m = base.match(/^(.+?)\s+-\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: base.trim() };
}

function load(i: number) {
  const t = state.tracks[i];
  if (!t) return;
  state.index = i;
  const a = el();
  a.src = t.src;
  a.volume = state.volume;
  if (state.on) void a.play().then(() => ((state.playing = true), emit())).catch(() => ((state.playing = false), emit()));
  emit();
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
  state.playing = false;
  emit();
}

export function togglePlay(): void {
  if (!state.tracks.length) return;
  const a = el();
  if (state.playing) {
    a.pause();
    state.playing = false;
    emit();
  } else if (!a.src) load(state.index);
  else void a.play().then(() => ((state.playing = true), emit()));
}

export function setShuffle(v: boolean): void {
  state.shuffle = v;
  emit();
}

/** Volume (0..1) e liga/desliga, vindos das configurações. */
export function configureMusic(volume: number, on: boolean): void {
  state.volume = volume;
  if (audio) audio.volume = volume;
  const was = state.on;
  state.on = on;
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
  const playingSrc = state.tracks[state.index]?.src;
  state.tracks = faixas.map((f) => ({ src: `musica://faixas/${encodeURIComponent(f)}`, ...parseTitle(f) }));
  const keep = state.tracks.findIndex((t) => t.src === playingSrc);
  if (keep >= 0) state.index = keep;
  else if (state.tracks.length) {
    state.index = state.shuffle ? Math.floor(Math.random() * state.tracks.length) : 0;
    if (state.on) load(state.index);
  } else stop();
  emit();
}

/** Navegador: músicas escolhidas na hora (valem até fechar a página). */
export function playFiles(files: FileList | File[]): void {
  for (const t of state.tracks) if (t.src.startsWith('blob:')) URL.revokeObjectURL(t.src);
  state.tracks = [...files].filter((f) => f.type.startsWith('audio/') || /\.(mp3|ogg|m4a|wav|flac|opus|aac)$/i.test(f.name)).map((f) => ({ src: URL.createObjectURL(f), ...parseTitle(f.name) }));
  state.index = 0;
  if (state.tracks.length && state.on) load(state.shuffle ? Math.floor(Math.random() * state.tracks.length) : 0);
  emit();
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
