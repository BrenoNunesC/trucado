// localStorage com try/catch: o jogo funciona mesmo sem armazenamento.

import type { RunState } from '../engine/state';

export type TableTheme = 'itaipava' | 'sinuca' | 'quintal';
export type TableThemeSetting = TableTheme | 'auto';

const KEY_RUN = 'trucado.run.v1';
const KEY_PROFILE = 'trucado.profile.v1';
const KEY_SETTINGS = 'trucado.settings.v1';

export interface Settings {
  volume: number;
  muted: boolean;
  crt: boolean;
  /** Cenário da mesa; "auto" troca sozinho (sinuca nos chefes, churrasco no Ante 8). */
  tableTheme: TableThemeSetting;
  /** 1 = normal, 2 = rápida, 3 = turbo */
  speed: 1 | 2 | 3;
  screenShake: boolean;
  reducedMotion: boolean;
  campaignOnze: boolean;
  campaignFerro: boolean;
  freeOnze: boolean;
  freeFerro: boolean;
  /** Endereço do servidor online (ws:// ou wss://). */
  serverUrl: string;
  /** Nome e personagem usados nas salas online. */
  onlineName: string;
  onlineAvatar: string;
  /** Identidade fixa neste aparelho (ranking e perfil online). Gerada na primeira vez. */
  playerId: string;
  /** Volume da música (separado dos efeitos). */
  musicVolume: number;
  musicOn: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.6,
  muted: false,
  crt: true,
  tableTheme: 'auto',
  speed: 1,
  screenShake: true,
  reducedMotion: false,
  campaignOnze: false,
  campaignFerro: false,
  freeOnze: true,
  freeFerro: true,
  // o build pode trazer o servidor oficial (VITE_TRUCADO_SERVER); sem ele, o servidor local
  serverUrl: import.meta.env.VITE_TRUCADO_SERVER ?? 'ws://localhost:8787',
  onlineName: '',
  onlineAvatar: 'bene',
  playerId: '',
  musicVolume: 0.5,
  musicOn: true,
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
  /** Modo administrador: tudo desbloqueado e o painel do administrador no Menu. */
  admin?: boolean;
  /** Conquistas já feitas (ids). */
  achievements?: string[];
  duplasWins?: number;
  onlineWins?: number;
  onlineLosses?: number;
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

export function loadSettings(): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY_SETTINGS) };
  if (!s.playerId) {
    s.playerId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    write(KEY_SETTINGS, s);
  }
  return s;
}
export const saveSettings = (s: Settings) => write(KEY_SETTINGS, s);
export const loadProfile = (): Profile => ({ ...DEFAULT_PROFILE, ...read<Partial<Profile>>(KEY_PROFILE) });
export const saveProfile = (p: Profile) => write(KEY_PROFILE, p);

export function loadRun(): RunState | null {
  const r = read<RunState>(KEY_RUN);
  return r && r.version === 1 && r.phase !== 'over' ? r : null;
}
export const saveRun = (r: RunState | null) => write(KEY_RUN, r);

/**
 * A run da campanha online fica numa chave própria (nunca por cima da run solo) e só serve para
 * voltar à mesma sala depois de recarregar a página.
 */
const KEY_ONLINE_RUN = 'trucado-online-run';
export function loadOnlineRun(code: string): RunState | null {
  const r = read<RunState>(KEY_ONLINE_RUN);
  return r && r.coop?.online?.code === code ? r : null;
}
export const saveOnlineRun = (r: RunState | null) => write(KEY_ONLINE_RUN, r);
