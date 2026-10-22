// Pacotes (boosters): abrir e escolher.

export type PackContent = 'card' | 'joker' | 'tarot' | 'giria' | 'mandinga';

export interface PackDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  content: PackContent;
  size: number;
  picks: number;
  price: number;
  weight: number;
}

export const PACKS: PackDef[] = [
  { id: 'cartas', name: 'Pacote de Cartas', description: 'Escolha 1 de 3 cartas para o baralho.', icon: '🂡', content: 'card', size: 3, picks: 1, price: 4, weight: 4 },
  { id: 'cartasMega', name: 'Pacote Mega de Cartas', description: 'Escolha 2 de 5 cartas para o baralho.', icon: '🂡', content: 'card', size: 5, picks: 2, price: 6, weight: 1 },
  { id: 'coringas', name: 'Pacote de Coringas', description: 'Escolha 1 de 2 Coringas.', icon: '🃏', content: 'joker', size: 2, picks: 1, price: 5, weight: 3 },
  { id: 'coringasMega', name: 'Pacote Mega de Coringas', description: 'Escolha 1 de 4 Coringas.', icon: '🃏', content: 'joker', size: 4, picks: 1, price: 7, weight: 1 },
  { id: 'taro', name: 'Pacote de Tarô', description: 'Escolha 1 de 3 Tarôs de Boteco.', icon: '🔮', content: 'tarot', size: 3, picks: 1, price: 4, weight: 4 },
  { id: 'taroMega', name: 'Pacote Mega de Tarô', description: 'Escolha 2 de 5 Tarôs de Boteco.', icon: '🔮', content: 'tarot', size: 5, picks: 2, price: 6, weight: 1 },
  { id: 'girias', name: 'Pacote de Gírias', description: 'Escolha 1 de 3 Gírias.', icon: '💬', content: 'giria', size: 3, picks: 1, price: 4, weight: 4 },
  { id: 'giriasMega', name: 'Pacote Mega de Gírias', description: 'Escolha 2 de 5 Gírias.', icon: '💬', content: 'giria', size: 5, picks: 2, price: 6, weight: 1 },
  { id: 'mandingas', name: 'Pacote de Mandingas', description: 'Escolha 1 de 2 Mandingas.', icon: '🕯️', content: 'mandinga', size: 2, picks: 1, price: 5, weight: 1 },
  { id: 'mandingasMega', name: 'Pacote Mega de Mandingas', description: 'Escolha 1 de 4 Mandingas.', icon: '🕯️', content: 'mandinga', size: 4, picks: 1, price: 8, weight: 0.5 },
];

export const PACK_BY_ID = Object.fromEntries(PACKS.map((p) => [p.id, p])) as Record<string, PackDef>;
