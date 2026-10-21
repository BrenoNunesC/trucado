// Vouchers: melhorias permanentes compradas na loja (1 por loja).

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
];

export const VOUCHER_BY_ID = Object.fromEntries(VOUCHERS.map((v) => [v.id, v])) as Record<string, VoucherDef>;
