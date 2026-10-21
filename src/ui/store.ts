// Store externo simples: o motor muta o estado; a UI re-renderiza por versão.

import { useSyncExternalStore } from 'react';
import { configureAudio } from '../audio/sfx';
import type { FreeMatch } from '../engine/free';
import type { HandSummary, RunState } from '../engine/state';
import { configureFx } from './fx';
import { loadProfile, loadRun, loadSettings, saveProfile, saveRun, saveSettings, type Profile, type Settings } from './persist';

export type Screen = 'title' | 'newRun' | 'game' | 'free' | 'tutorial' | 'collection' | 'settings';

export type Modal =
  | { type: 'how' }
  | { type: 'deck'; mode: 'view' }
  | { type: 'deck'; mode: 'consumable'; uid: string }
  | { type: 'deck'; mode: 'destroy' }
  | { type: 'menu' }
  | null;

export interface Speech {
  text: string;
  key: number;
}

export interface ScoreAnim {
  summary: HandSummary;
  /** Pontuação do Blind antes desta mão. */
  before: number;
  step: number;
  chips: number;
  mult: number;
  phase: 'steps' | 'total' | 'count';
  /** Pontuação exibida no painel (sobe na fase 'count'). */
  shown: number;
}

export interface AppState {
  screen: Screen;
  /** Para onde voltar ao sair das configurações. */
  returnTo: Screen;
  run: RunState | null;
  free: FreeMatch | null;
  settings: Settings;
  profile: Profile;
  modal: Modal;
  speech: Speech | null;
  anim: ScoreAnim | null;
  toasts: { id: number; text: string; kind: 'info' | 'good' | 'bad' }[];
  /** Carta(s) selecionada(s) na mão (para blefe). */
  selected: string[];
  /** Coringa selecionado (vender/mover). */
  selectedJoker: string | null;
  /** Consumível selecionado. */
  selectedConsumable: string | null;
}

const state: AppState = {
  screen: 'title',
  returnTo: 'title',
  run: loadRun(),
  free: null,
  settings: loadSettings(),
  profile: loadProfile(),
  modal: null,
  speech: null,
  anim: null,
  toasts: [],
  selected: [],
  selectedJoker: null,
  selectedConsumable: null,
};

configureAudio(state.settings.volume, state.settings.muted);
configureFx(state.settings.screenShake, state.settings.reducedMotion);

let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version++;
  for (const l of listeners) l();
}

export function goSettings(): void {
  update((s) => {
    s.returnTo = s.screen;
    s.modal = null;
    s.screen = 'settings';
  });
}

export function getState(): AppState {
  return state;
}

export function useApp(): AppState {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return state;
}

export function update(fn: (s: AppState) => void): void {
  fn(state);
  emit();
}

/** Ação sobre a run: muta, salva e notifica. */
export function act<T>(fn: (run: RunState) => T): T {
  const run = state.run;
  if (!run) throw new Error('Sem run ativa');
  const result = fn(run);
  persistRun();
  emit();
  return result;
}

export function actFree<T>(fn: (m: FreeMatch) => T): T {
  const m = state.free!;
  const r = fn(m);
  emit();
  return r;
}

export function persistRun(): void {
  const run = state.run;
  if (!run) return;
  // descobre Coringas para a coleção
  let changed = false;
  for (const id of run.seenJokers) {
    if (!state.profile.discoveredJokers.includes(id)) {
      state.profile.discoveredJokers.push(id);
      changed = true;
    }
  }
  if (changed) saveProfile(state.profile);
  saveRun(run.phase === 'over' ? null : run);
}

export function setSettings(patch: Partial<Settings>): void {
  Object.assign(state.settings, patch);
  saveSettings(state.settings);
  configureAudio(state.settings.volume, state.settings.muted);
  configureFx(state.settings.screenShake, state.settings.reducedMotion);
  emit();
}

export function updateProfile(fn: (p: Profile) => void): void {
  fn(state.profile);
  saveProfile(state.profile);
  emit();
}

let toastId = 0;
export function toast(text: string, kind: 'info' | 'good' | 'bad' = 'info'): void {
  const id = ++toastId;
  state.toasts.push({ id, text, kind });
  if (state.toasts.length > 4) state.toasts.shift();
  emit();
  setTimeout(() => {
    const i = state.toasts.findIndex((t) => t.id === id);
    if (i >= 0) {
      state.toasts.splice(i, 1);
      emit();
    }
  }, 2600);
}

let speechKey = 0;
export function say(text: string): void {
  state.speech = { text, key: ++speechKey };
  const key = speechKey;
  emit();
  setTimeout(() => {
    if (state.speech?.key === key) {
      state.speech = null;
      emit();
    }
  }, 2400);
}

/** Atraso base das animações, ajustado pela velocidade. */
export function delay(ms: number): number {
  const s = state.settings.speed;
  return s === 1 ? ms : s === 2 ? ms * 0.55 : ms * 0.3;
}

// gancho de depuração só no modo dev (testes manuais/automatizados no navegador)
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__trucado = { getState, act, update };
