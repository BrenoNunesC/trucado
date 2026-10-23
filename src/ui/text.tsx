// Realça números em descrições: Fichas em azul, Mult em vermelho, dinheiro em dourado.

import type { ReactNode } from 'react';

const PATTERN = /([+−-]?\d+(?:[.,]\d+)? Fichas|[+−-]\d+(?:[.,]\d+)? Mult|×\d+(?:[.,]\d+)? Mult|×\d+(?:[.,]\d+)?|\$\d+)/g;

export function Rich({ text }: { text: string }): ReactNode {
  const parts = text.split(PATTERN);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p;
        const cls = p.includes('Fichas') ? 'hl-chips' : p.startsWith('×') ? 'hl-xmult' : p.includes('Mult') ? 'hl-mult' : 'hl-money';
        return (
          <span key={i} className={cls}>
            {p}
          </span>
        );
      })}
    </>
  );
}

/** Números inteiros completos (com separador de milhar) até a faixa em que o double perde precisão. */
const EXACT_LIMIT = 1e15;

export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (Math.abs(n) >= EXACT_LIMIT) return n.toExponential(2).replace('.', ',').replace('e+', 'e');
  return Math.floor(n).toLocaleString('pt-BR');
}

export function fmtMult(n: number): string {
  if (Number.isInteger(n)) return fmtNum(n);
  return n >= 100 ? fmtNum(Math.round(n)) : n.toFixed(1).replace('.', ',');
}
