import { defineJokers } from '../../engine/jokerApi';

export default defineJokers([
  {
    id: 'reiMomo',
    name: 'Rei Momo',
    rarity: 'lendario',
    icon: '👑',
    color: '#ffcc33',
    description: () => '×2 Mult, mais ×1 por nível de aposta da mão (Doze = ×6).',
    score: (ctx) => ctx.xmult(2 + ctx.betLevel),
  },
  {
    id: 'tiradentes',
    name: 'Tiradentes',
    rarity: 'lendario',
    icon: '🗡️',
    color: '#d9d9d9',
    initialState: () => ({ x: 1.5 }),
    description: (s) => `×Mult que cresce ×1 a cada Chefe vencido. (Atual: ×${s.state.x ?? 1.5})`,
    score: (ctx, self) => ctx.xmult(self.state.x),
    bossDefeated: (_ctx, self) => {
      self.state.x += 1;
    },
  },
  {
    id: 'zeDoCaixao',
    name: 'Zé do Caixão',
    rarity: 'lendario',
    icon: '💀',
    color: '#b0b0ff',
    description: () => 'Toda carta vencedora pontua mais 2 vezes.',
    retrigger: () => 2,
  },
]);
