// Store externo simples: o motor muta o estado; a UI re-renderiza por versão.

import { useSyncExternalStore } from 'react';
import { configureAudio } from '../audio/sfx';
import { configureMusic } from '../audio/music';
import type { CampView } from '../engine/campaign';
import type { DuelRules, DuelView } from '../engine/duel';
import type { DuplasView, SeatNo } from '../engine/duplas';
import type { FreeMatch } from '../engine/free';
import type { Side } from '../engine/truco';
import type { RoomMode, Seat } from '../net/protocol';
import type { LocalDuplas } from './screens/DuplasMode';
import type { HandSummary, RunState } from '../engine/state';
import { DECKS, STAKES } from '../data/decks';
import { JOKERS } from '../data/jokers';
import { newAchievements } from '../data/achievements';
import { newJokerUnlocks } from '../data/unlocks';
import { configureFx } from './fx';
import { loadProfile, loadRun, loadSettings, saveOnlineRun, saveProfile, saveRun, saveSettings, type Profile, type Settings } from './persist';

export type Screen = 'title' | 'newRun' | 'game' | 'free' | 'duplas' | 'online' | 'tutorial' | 'collection' | 'settings';

/** Sala online (net/client.ts mantém isto em dia com o servidor). */
export interface OnlineState {
  status: 'connecting' | 'lobby' | 'playing' | 'reconnecting' | 'closed';
  mode?: RoomMode;
  code?: string;
  seat?: Side | number;
  you?: Seat;
  opp?: Seat | null;
  view?: DuelView;
  rematch?: { you: boolean; opp: boolean };
  rules?: DuelRules;
  error?: string;
  /** Duplas: lugares girados como a mesa (0 = você, 2 = parceiro); null = vazio. */
  seats?: (Seat | null)[];
  host?: boolean;
  locked?: boolean[];
  dview?: DuplasView;
  drematch?: { you: boolean; waiting: number };
  /** Frase rápida de alguém da mesa (duplas). */
  dspeech?: { text: string; key: number; seat: SeatNo } | null;
  /** Campanha em dupla: o estado compartilhado e o baralho escolhido para a sua run. */
  camp?: CampView;
  campDeck?: string;
  /** Só assistindo a sala (sem jogar). `players` = quem está jogando. */
  spectator?: boolean;
  players?: string[];
  /** Chat da sala (as últimas mensagens). */
  chat?: ChatLine[];
}

export interface ChatLine {
  key: number;
  from: string;
  text: string;
  mine: boolean;
  spectator: boolean;
}

export type Modal =
  | { type: 'how' }
  | { type: 'deck'; mode: 'view' }
  | { type: 'deck'; mode: 'consumable'; uid: string }
  | { type: 'deck'; mode: 'destroy' }
  | { type: 'menu' }
  | { type: 'admin' }
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
  online: OnlineState | null;
  /** Duplas contra a máquina em andamento. */
  duplas: LocalDuplas | null;
  /** A tela de nova run está no modo campanha em dupla. */
  newRunCoop: boolean;
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
  online: null,
  duplas: null,
  newRunCoop: false,
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
configureMusic(state.settings.musicVolume, state.settings.musicOn && !state.settings.muted, state.settings.musicLinks);
// administrador: o que entrou no jogo desde a última vez também já vem liberado
if (state.profile.admin) queueMicrotask(unlockEverything);
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

/** Marca as conquistas que saíram agora e avisa com um toast. Devolve se mudou o perfil. */
function checkAchievements(): boolean {
  const fresh = newAchievements(state.profile, state.run);
  if (!fresh.length) return false;
  state.profile.achievements = [...(state.profile.achievements ?? []), ...fresh.map((a) => a.id)];
  for (const a of fresh) toast(`🏆 Conquista: ${a.name}`, 'good');
  return true;
}

/** Destrava os Coringas trancados cujas condições acabaram de ser cumpridas. */
function checkJokerUnlocks(): boolean {
  const st = state.run?.stats;
  if (!st) return false;
  const fresh = newJokerUnlocks(state.profile, st);
  if (!fresh.length) return false;
  state.profile.unlockedJokers = [...(state.profile.unlockedJokers ?? []), ...fresh];
  for (const id of fresh) toast(`🃏 Coringa desbloqueado: ${JOKERS.find((j) => j.id === id)?.name ?? id}`, 'good');
  return true;
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
  if (checkAchievements()) changed = true;
  if (checkJokerUnlocks()) changed = true;
  if (changed) saveProfile(state.profile);
  // a run da campanha online não pode tomar o lugar da sua run solo salva
  if (run.coop?.online) saveOnlineRun(run.phase === 'over' ? null : run);
  else saveRun(run.phase === 'over' ? null : run);
}

export function setSettings(patch: Partial<Settings>): void {
  Object.assign(state.settings, patch);
  saveSettings(state.settings);
  configureAudio(state.settings.volume, state.settings.muted);
  configureMusic(state.settings.musicVolume, state.settings.musicOn && !state.settings.muted, state.settings.musicLinks);
  configureFx(state.settings.screenShake, state.settings.reducedMotion);
  emit();
}

/**
 * Modo administrador: todos os baralhos com todas as stakes vencidas (tudo liberado), todos os
 * Coringas na Coleção e o tutorial dado como feito. Chamado ao ligar e a cada abertura do jogo,
 * para o que for lançado depois já vir liberado também.
 */
export function unlockEverything(): void {
  const p = state.profile;
  // guarda o progresso real antes de liberar tudo; ao desligar, volta para ele
  if (!p.admin) {
    p.adminBackup = {
      stakesWon: { ...p.stakesWon },
      discoveredJokers: [...p.discoveredJokers],
      tutorialDone: p.tutorialDone,
      unlockedJokers: [...(p.unlockedJokers ?? [])],
    };
  }
  p.admin = true;
  p.tutorialDone = true;
  for (const d of DECKS) p.stakesWon[d.id] = Math.max(p.stakesWon[d.id] ?? 0, STAKES.length);
  for (const j of JOKERS) if (!p.discoveredJokers.includes(j.id)) p.discoveredJokers.push(j.id);
  saveProfile(p);
  emit();
}

export function setAdmin(on: boolean): void {
  if (on) return unlockEverything();
  // desligar volta ao progresso que o jogador tinha antes de ligar
  const p = state.profile;
  const b = p.adminBackup;
  if (b) {
    p.stakesWon = b.stakesWon;
    p.discoveredJokers = b.discoveredJokers;
    p.tutorialDone = b.tutorialDone;
    p.unlockedJokers = b.unlockedJokers;
  }
  delete p.adminBackup;
  p.admin = false;
  saveProfile(state.profile);
  emit();
}

export function updateProfile(fn: (p: Profile) => void): void {
  fn(state.profile);
  checkAchievements();
  checkJokerUnlocks();
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
