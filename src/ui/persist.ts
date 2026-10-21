// localStorage com try/catch: o jogo funciona mesmo sem armazenamento.

import type { RunState } from '../engine/state';

const KEY_RUN = 'trucado.run.v1';
const KEY_PROFILE = 'trucado.profile.v1';
const KEY_SETTINGS = 'trucado.settings.v1';

export interface Settings {
  volume: number;
  muted: boolean;
  crt: boolean;
  /** 1 = normal, 2 = rápida, 3 = turbo */
  speed: 1 | 2 | 3;
  screenShake: boolean;
  reducedMotion: boolean;
  campaignOnze: boolean;
  campaignFerro: boolean;
  freeOnze: boolean;
  freeFerro: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6,
  muted: false,
  crt: true,
  speed: 1,
  screenShake: true,
  reducedMotion: false,
  campaignOnze: false,
  campaignFerro: false,
  freeOnze: true,
  freeFerro: true,
};

export interface Profile {
  runsPlayed: number;
  runsWon: number;
  bestAnte: number;
  bestHand: number;
  discoveredJokers: string[];
  /** Maior stake vencida por deck. */
  stakesWon: Record<string, number>;
  tutorialDone: boolean;
  freeWins: number;
  freeLosses: number;
}

export const DEFAULT_PROFILE: Profile = {
  runsPlayed: 0,
  runsWon: 0,
  bestAnte: 0,
  bestHand: 0,
  discoveredJokers: [],
  stakesWon: {},
  tutorialDone: false,
  freeWins: 0,
  freeLosses: 0,
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // armazenamento indisponível: segue sem salvar
  }
}

export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY_SETTINGS) });
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);
export const loadProfile = (): Profile => ({ ...DEFAULT_PROFILE, ...read<Partial<Profile>>(KEY_PROFILE) });
export const saveProfile = (p: Profile) => write(KEY_PROFILE, p);

export function loadRun(): RunState | null {
  const r = read<RunState>(KEY_RUN);
  return r && r.version === 1 && r.phase !== 'over' ? r : null;
}
export const saveRun = (r: RunState | null) => write(KEY_RUN, r);
