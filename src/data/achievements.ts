// Conquistas: marcos da campanha, do truco e do online. Cada uma olha o perfil e (se tiver) a run
// em andamento. Não liberam nada: é só pelo orgulho.

import type { RunState } from '../engine/state';
import type { Profile } from '../ui/persist';
import { JOKERS } from './jokers';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  /** Escondida até sair (aparece como "???" na coleção). */
  secret?: boolean;
  check: (p: Profile, run: RunState | null) => boolean;
}

const LEGENDARY = new Set(JOKERS.filter((j) => j.rarity === 'lendario').map((j) => j.id));

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'primeiro-blind', name: 'Primeira rodada paga', desc: 'Vença um Blind.', check: (_, r) => (r?.stats.blindsDefeated ?? 0) >= 1 },
  { id: 'primeiro-chefe', name: 'Caiu o chefe', desc: 'Derrote um Blind chefe.', check: (_, r) => (r?.stats.bossesDefeated ?? 0) >= 1 },
  { id: 'ante-4', name: 'Meio do caminho', desc: 'Chegue ao Ante 4.', check: (p, r) => p.bestAnte >= 3 || (r?.ante ?? 0) >= 4 },
  { id: 'ante-8', name: 'Churrasco no quintal', desc: 'Chegue ao Ante 8.', check: (p, r) => p.bestAnte >= 7 || (r?.ante ?? 0) >= 8 },
  { id: 'campeao', name: 'Rei do boteco', desc: 'Vença uma run.', check: (p) => p.runsWon >= 1 },
  { id: 'tricampeao', name: 'Tricampeão', desc: 'Vença três runs.', check: (p) => p.runsWon >= 3 },
  { id: 'sem-fim', name: 'Saideira infinita', desc: 'Continue jogando depois de vencer (modo sem fim).', check: (_, r) => !!r?.endless && r.ante > 8 },
  { id: 'fechou', name: 'Fechou!', desc: 'Feche uma mão (vença as duas primeiras rodadas).', check: (_, r) => (r?.stats.fechou ?? 0) >= 1 },
  { id: 'truqueiro', name: 'Truqueiro', desc: 'Ganhe 10 apostas numa mesma run.', check: (_, r) => (r?.stats.betsWon ?? 0) >= 10 },
  { id: 'mao-boa', name: 'Mão boa', desc: 'Faça 500 pontos numa mão.', check: (p, r) => Math.max(p.bestHand, r?.stats.bestHand ?? 0) >= 500 },
  { id: 'mao-absurda', name: 'Mão absurda', desc: 'Faça 5.000 pontos numa mão.', check: (p, r) => Math.max(p.bestHand, r?.stats.bestHand ?? 0) >= 5000 },
  { id: 'cofrinho', name: 'Cofrinho cheio', desc: 'Tenha $50 ao mesmo tempo.', check: (_, r) => (r?.money ?? 0) >= 50 },
  { id: 'cinco-coringas', name: 'Mão cheia', desc: 'Tenha 5 Coringas ao mesmo tempo.', check: (_, r) => (r?.jokers.length ?? 0) >= 5 },
  { id: 'lendario', name: 'Lenda do bar', desc: 'Tenha um Coringa lendário.', check: (_, r) => !!r?.jokers.some((j) => LEGENDARY.has(j.id)) },
  { id: 'colecionador', name: 'Colecionador', desc: 'Descubra 40 Coringas.', check: (p) => p.discoveredJokers.length >= 40 },
  { id: 'faxina', name: 'Faxina no baralho', desc: 'Destrua 10 cartas numa run.', check: (_, r) => (r?.stats.cardsDestroyed ?? 0) >= 10 },
  { id: 'baralhos', name: 'Baralho novo', desc: 'Vença uma run com um baralho que não seja o Clássico.', check: (p) => Object.entries(p.stakesWon).some(([id, s]) => id !== 'vermelho' && s > 0) },
  { id: 'livre', name: 'Truco de verdade', desc: 'Vença 5 partidas no modo livre.', check: (p) => p.freeWins >= 5 },
  { id: 'duplas', name: 'Parceria', desc: 'Vença uma partida em duplas.', check: (p) => (p.duplasWins ?? 0) >= 1 },
  { id: 'online', name: 'Fama na rua', desc: 'Vença uma partida online.', check: (p) => (p.onlineWins ?? 0) >= 1 },
  { id: 'online-10', name: 'Dono da mesa', desc: 'Vença 10 partidas online.', check: (p) => (p.onlineWins ?? 0) >= 10 },
  { id: 'campanha-dupla', name: 'Dupla imbatível', desc: 'Vença uma run da campanha em dupla.', secret: true, check: (_, r) => !!r?.coop && r.phase === 'victory' },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Conquistas que saíram agora (ainda não estavam no perfil). */
export function newAchievements(p: Profile, run: RunState | null): AchievementDef[] {
  const have = new Set(p.achievements ?? []);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(p, run));
}
