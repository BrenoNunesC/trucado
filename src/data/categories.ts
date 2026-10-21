// Jogadas reconhecidas ao vencer uma mão (equivalentes às mãos de pôquer do Balatro).
// A lista está em ordem de prioridade: vale a primeira que bater.

import type { CategoryId } from '../engine/state';

export interface CategoryDef {
  id: CategoryId;
  name: string;
  description: string;
  chips: number;
  mult: number;
  chipsPerLevel: number;
  multPerLevel: number;
  /** Nome da Gíria (planeta) que sobe esta jogada. */
  giria: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'tresManilhas', name: 'Três Manilhas', description: 'Receber três manilhas e vencer a mão.', chips: 100, mult: 8, chipsPerLevel: 35, multPerLevel: 3, giria: 'Trem Bala' },
  { id: 'casalMaior', name: 'Casal Maior', description: 'Ter Zap e manilha de Copas e vencer a mão.', chips: 60, mult: 5, chipsPerLevel: 30, multPerLevel: 3, giria: 'Casal Vinte' },
  { id: 'trinca', name: 'Trinca', description: 'Receber três cartas do mesmo valor e vencer a mão.', chips: 50, mult: 4, chipsPerLevel: 25, multPerLevel: 2, giria: 'Trincou' },
  { id: 'casalManilhas', name: 'Casal de Manilhas', description: 'Receber duas manilhas e vencer a mão.', chips: 40, mult: 4, chipsPerLevel: 25, multPerLevel: 2, giria: 'Dobradinha' },
  { id: 'zap', name: 'Zap', description: 'Vencer uma rodada com o Zap (manilha de Paus) e a mão.', chips: 30, mult: 3, chipsPerLevel: 20, multPerLevel: 2, giria: 'Zap Zap' },
  { id: 'cangaVencida', name: 'Canga Vencida', description: 'Vencer uma mão que teve canga (empate).', chips: 25, mult: 3, chipsPerLevel: 20, multPerLevel: 1, giria: 'Canga Braba' },
  { id: 'virada', name: 'Virada', description: 'Perder a 1ª rodada e virar a mão.', chips: 25, mult: 2, chipsPerLevel: 20, multPerLevel: 2, giria: 'Virou o Jogo' },
  { id: 'peDeMesa', name: 'Pé de Mesa', description: 'Vencer a mão na 3ª rodada.', chips: 20, mult: 2, chipsPerLevel: 15, multPerLevel: 1, giria: 'Mesa Posta' },
  { id: 'fechou', name: 'Fechou', description: 'Vencer a 1ª e a 2ª rodada direto.', chips: 15, mult: 2, chipsPerLevel: 15, multPerLevel: 1, giria: 'Fechou o Caixão' },
  { id: 'arregou', name: 'Arregou', description: 'O adversário correu da sua aposta.', chips: 10, mult: 2, chipsPerLevel: 10, multPerLevel: 1, giria: 'Arregão' },
  { id: 'naRaca', name: 'Na Raça', description: 'Vencer a mão de qualquer jeito.', chips: 10, mult: 1, chipsPerLevel: 10, multPerLevel: 1, giria: 'É Nóis' },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, CategoryDef>;

export function categoryValues(id: CategoryId, level: number): { chips: number; mult: number } {
  const c = CATEGORY_BY_ID[id];
  const l = Math.max(1, level) - 1;
  return { chips: c.chips + c.chipsPerLevel * l, mult: c.mult + c.multPerLevel * l };
}

export function initialLevels(): Record<CategoryId, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c.id, 1])) as Record<CategoryId, number>;
}
