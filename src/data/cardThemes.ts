// Temas visuais das cartas: só mudam o verso e a cor das faces. As regras são as mesmas.

export interface CardTheme {
  id: string;
  name: string;
  description: string;
}

export const CARD_THEMES: CardTheme[] = [
  { id: 'classico', name: 'Clássico', description: 'As cores de sempre.' },
  { id: 'festa', name: 'Festa Junina', description: 'Verso xadrez vermelho e branco, com borda dourada.' },
  { id: 'carnaval', name: 'Carnaval', description: 'Verso roxo com detalhes dourados, faces cor de confete.' },
  { id: 'bar', name: 'Noite de Bar', description: 'Verso azul-marinho com listras neon.' },
];

export const CARD_THEME_BY_ID = Object.fromEntries(CARD_THEMES.map((t) => [t.id, t])) as Record<string, CardTheme>;
