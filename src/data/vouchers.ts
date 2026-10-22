// Vouchers: melhorias permanentes compradas na loja (1 por loja).

import { makeCard, SUITS } from '../engine/cards';
import { next } from '../engine/rng';
import type { RunState } from '../engine/state';

export interface VoucherDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Exige este voucher antes (nível 2). */
  requires?: string;
  /** Efeito imediato na compra. Efeitos passivos são lidos via hasVoucher. */
  onBuy?: (run: RunState) => void;
}

export const VOUCHERS: VoucherDef[] = [
  { id: 'garcomAmigo', name: 'Garçom Amigo', description: 'Rolar a loja custa $2 a menos.', icon: '🤵' },
  { id: 'mesaMaior', name: 'Mesa Maior', description: '+1 slot de Coringa.', icon: '🪵', onBuy: (r) => void (r.jokerSlots += 1) },
  { id: 'bolsoFundo', name: 'Bolso Fundo', description: '+1 slot de consumível.', icon: '👖', onBuy: (r) => void (r.consumableSlots += 1) },
  { id: 'folego', name: 'Fôlego de Gato', description: '+1 mão em todo Blind.', icon: '🐈' },
  { id: 'caraDePau', name: 'Cara de Pau', description: '+1 blefe em todo Blind.', icon: '😐' },
  { id: 'poupanca', name: 'Poupança', description: 'Juros máximos sobem para $10.', icon: '🐷' },
  { id: 'liquidacao', name: 'Liquidação', description: 'Tudo na loja custa 25% a menos.', icon: '🏷️' },
  { id: 'vitrine', name: 'Vitrine', description: '+1 slot de item na loja.', icon: '🪟' },
  { id: 'caderninho', name: 'Caderninho', description: '+$1 extra por mão não usada ao vencer um Blind.', icon: '📓' },
  { id: 'mesaRedonda', name: 'Mesa Redonda', description: '+1 slot de Coringa.', icon: '⭕', requires: 'mesaMaior', onBuy: (r) => void (r.jokerSlots += 1) },
  { id: 'caraDeMadeira', name: 'Cara de Madeira', description: '+1 blefe em todo Blind.', icon: '🪵', requires: 'caraDePau' },
  { id: 'setteVidas', name: 'Sete Vidas', description: '+1 mão em todo Blind.', icon: '😺', requires: 'folego' },
  { id: 'cortesia', name: 'Cortesia da Casa', description: 'A 1ª rolagem de cada loja é grátis.', icon: '🎁' },
  { id: 'prateleira', name: 'Prateleira de Pacotes', description: '+1 pacote na loja.', icon: '🗄️' },
  { id: 'gorjeta', name: 'Gorjeta', description: 'Ganha $1 a cada mão vencida.', icon: '🪙' },
  { id: 'seguroTruco', name: 'Seguro de Truco', description: 'Perder uma mão com aposta aceita custa metade do dinheiro.', icon: '🛡️' },
  { id: 'olhoVivo', name: 'Olho Vivo', description: 'Uma carta do adversário fica sempre visível.', icon: '👁️' },
  { id: 'maoCheia', name: 'Mão Cheia', description: 'Cada blefe troca até 3 cartas (em vez de 2).', icon: '🖐️' },
  { id: 'balcaoCheio', name: 'Balcão Cheio', description: '+1 slot de item na loja.', icon: '🍽️', requires: 'vitrine' },
  { id: 'fiadoEterno', name: 'Fiado Eterno', description: 'Tudo na loja custa 40% a menos (no total).', icon: '📒', requires: 'liquidacao' },
  { id: 'gorjetao', name: 'Gorjetão', description: 'Ganha mais $1 a cada mão vencida (total $2).', icon: '💵', requires: 'gorjeta' },
  { id: 'cobrador', name: 'Cobrador', description: '+$2 de prêmio ao vencer cada Blind.', icon: '🧾' },
  {
    id: 'baralhoNovo',
    name: 'Baralho Novo',
    description: 'Na compra, adiciona 4 cartas ao baralho (Ás, 2 e 3 de naipes aleatórios).',
    icon: '🎴',
    onBuy: (r) => {
      const faces = ['A', '2', '3', '3'] as const;
      for (const rank of faces) r.deck.push(makeCard(rank, SUITS[Math.floor(next(r.rng) * SUITS.length)], 'p'));
    },
  },
  { id: 'bolsoSemFundo', name: 'Bolso Sem Fundo', description: '+1 slot de consumível.', icon: '🎒', requires: 'bolsoFundo', onBuy: (r) => void (r.consumableSlots += 1) },
  { id: 'amigoDoDono', name: 'Amigo do Dono', description: 'Rolar a loja custa mais $2 a menos (total $4).', icon: '🤝', requires: 'garcomAmigo' },
];

export const VOUCHER_BY_ID = Object.fromEntries(VOUCHERS.map((v) => [v.id, v])) as Record<string, VoucherDef>;
