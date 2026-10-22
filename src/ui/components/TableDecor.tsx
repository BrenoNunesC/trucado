// O cenário da mesa e o que está em cima dela. Só decoração (aria-hidden, sem clique).
//  - itaipava: a mesa de plástico vermelha de cerveja, com os frisos moldados que saem do furo do
//    guarda-sol, a estampa da marca nos cantos, a 600 suada com o copo americano, a porção de
//    amendoim e as tampinhas;
//  - sinuca (Blind chefe): o pano verde da mesa de sinuca, caçapas, taco, giz e bolas;
//  - quintal (Ante 8): a mesa do churrasco com toalha xadrez, espetinhos, farofa e vinagrete.
//
// Os nomes de marca ficam todos em BRAND: são marcas registradas, então para distribuir o jogo
// basta trocar por nomes inventados aqui.

import type { TableTheme } from '../persist';
import { useApp, type AppState } from '../store';

const BRAND = {
  /** Estampa da mesa. */
  table: 'ITAIPAVA',
  tableSlogan: 'A cerveja',
  /** Rótulo da garrafa. */
  beer: 'ANTARCTICA',
};

/** Cenário da mesa agora: o escolhido nas configurações, ou o automático pela run. */
export function useTableTheme(): TableTheme {
  return tableThemeFor(useApp());
}

export function tableThemeFor(s: AppState): TableTheme {
  const pick = s.settings.tableTheme;
  if (pick && pick !== 'auto') return pick;
  const run = s.screen === 'game' ? s.run : null;
  if (!run) return 'itaipava';
  if (run.ante >= 8) return 'quintal';
  const info = run.blind?.info ?? run.blinds[run.blindIndex];
  return info?.kind === 'chefe' ? 'sinuca' : 'itaipava';
}

export function TableDecor({ theme = 'itaipava' }: { theme?: TableTheme }) {
  if (theme === 'sinuca') return <SinucaDecor />;
  if (theme === 'quintal') return <QuintalDecor />;
  return (
    <div className="table-decor" aria-hidden>
      {/* frisos moldados no plástico, saindo do furo do guarda-sol para os cantos */}
      <svg className="decor-ridges" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[
          [0, 0],
          [100, 0],
          [0, 100],
          [100, 100],
        ].map(([x, y], i) => (
          <g key={i}>
            <path d={`M50 50 L${x} ${y}`} stroke="#000" strokeOpacity="0.16" strokeWidth="0.9" vectorEffect="non-scaling-stroke" transform="translate(0.15 0.3)" />
            <path d={`M50 50 L${x} ${y}`} stroke="#fff" strokeOpacity="0.14" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {/* estrela moldada em volta do centro */}
        <path d="M50 36 L56 44 L66 50 L56 56 L50 64 L44 56 L34 50 L44 44Z" fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {/* riscos de uso */}
        <path d="M14 70 l9 -2 M70 18 l7 3 M82 74 l-6 4 M30 22 l5 -3" stroke="#fff" strokeOpacity="0.16" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* furo do guarda-sol */}
      <div className="decor-hole" />

      {/* estampa da marca: uma do lado do jogador e outra de cabeça para baixo, do lado do adversário */}
      <BrandPrint className="decor-print decor-print-a" />
      <BrandPrint className="decor-print decor-print-b" />

      {/* a 600 + copo americano, canto de cima à direita */}
      <BeerProp className="decor-beer" />

      {/* porção de amendoim no pratinho, canto de baixo à esquerda */}
      <svg className="decor-snack" viewBox="0 0 80 50" width="80" height="50">
        <ellipse cx="40" cy="28" rx="38" ry="18" fill="#000" opacity="0.3" />
        <ellipse cx="40" cy="25" rx="36" ry="17" fill="#ece2cc" />
        <ellipse cx="40" cy="25" rx="27" ry="12" fill="#d8ccb0" />
        {[
          [30, 22],
          [36, 27],
          [43, 21],
          [48, 27],
          [39, 18],
          [33, 30],
          [52, 22],
          [26, 26],
          [45, 31],
        ].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="3.4" ry="2.4" fill={i % 3 ? '#a8641e' : '#c8843a'} transform={`rotate(${i * 37} ${x} ${y})`} />
        ))}
      </svg>
      {/* tampinhas esquecidas: uma da garrafa azul, outra dourada */}
      <svg className="decor-caps" viewBox="0 0 50 30" width="50" height="30">
        <circle cx="12" cy="16" r="8" fill="#1f5fb8" stroke="#123a70" strokeWidth="2" strokeDasharray="2 1.4" />
        <circle cx="12" cy="16" r="4" fill="#c8202b" />
        <circle cx="34" cy="12" r="8" fill="#d8b048" stroke="#8a6a1a" strokeWidth="2" strokeDasharray="2 1.4" />
      </svg>
    </div>
  );
}

/** Mesa de sinuca: caçapas nos cantos e no meio dos lados, o taco encostado, o giz e as bolas. */
function SinucaDecor() {
  const pockets = [
    [0, 0],
    [50, 0],
    [100, 0],
    [0, 100],
    [50, 100],
    [100, 100],
  ];
  const balls: [number, number, string, boolean][] = [
    [26, 22, '#f4c020', false],
    [40, 30, '#1f4fb8', false],
    [30, 36, '#c8202b', true],
    [48, 20, '#141414', false],
    [16, 34, '#e86a10', true],
  ];
  return (
    <div className="table-decor decor-sinuca" aria-hidden>
      {pockets.map(([x, y], i) => (
        <div key={i} className="decor-pocket" style={{ left: `${x}%`, top: `${y}%` }} />
      ))}
      {/* marcas de mira (diamantes) na tabela */}
      <svg className="decor-diamonds" viewBox="0 0 100 100" preserveAspectRatio="none">
        {[12.5, 25, 37.5, 62.5, 75, 87.5].map((x) => (
          <g key={x}>
            <circle cx={x} cy="1.2" r="0.5" fill="#f4ecd0" />
            <circle cx={x} cy="98.8" r="0.5" fill="#f4ecd0" />
          </g>
        ))}
      </svg>
      {/* taco atravessado no canto de baixo à direita */}
      <svg className="decor-cue" viewBox="0 0 300 20" width="300" height="20">
        <defs>
          <linearGradient id="cue-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2a1206" />
            <stop offset="0.35" stopColor="#5e3414" />
            <stop offset="0.4" stopColor="#e8cf98" />
            <stop offset="0.97" stopColor="#f0dcb0" />
            <stop offset="0.97" stopColor="#f6f6f6" />
            <stop offset="1" stopColor="#3a6ac0" />
          </linearGradient>
        </defs>
        <path d="M2 4 L298 8.5 L298 11.5 L2 16 Z" fill="url(#cue-wood)" />
        <path d="M2 6 L298 9.4" stroke="#fff" strokeOpacity="0.3" strokeWidth="1" />
        <rect x="60" y="4.5" width="34" height="11" fill="#141414" opacity="0.55" />
      </svg>
      {/* giz azul */}
      <svg className="decor-chalk" viewBox="0 0 30 30" width="30" height="30">
        <path d="M6 10 L20 6 L26 12 L12 16Z" fill="#6aa6ff" />
        <path d="M6 10 L12 16 L12 26 L6 20Z" fill="#2c64c0" />
        <path d="M12 16 L26 12 L26 22 L12 26Z" fill="#4a86e0" />
        <ellipse cx="16" cy="11" rx="4" ry="2" fill="#123a80" />
      </svg>
      {/* bolas paradas no canto de cima à esquerda */}
      <svg className="decor-balls" viewBox="0 0 70 50" width="140" height="100">
        <defs>
          {balls.map(([x, y], i) => (
            <clipPath key={i} id={`ball-${i}`}>
              <circle cx={x} cy={y} r="6" />
            </clipPath>
          ))}
        </defs>
        {balls.map(([x, y, c, stripe], i) => (
          <g key={i}>
            <ellipse cx={x + 1} cy={y + 2.5} rx="6" ry="3" fill="#000" opacity="0.35" />
            <circle cx={x} cy={y} r="6" fill={stripe ? '#f6f2e6' : c} />
            {stripe && <rect x={x - 6} y={y - 2.6} width="12" height="5.2" fill={c} clipPath={`url(#ball-${i})`} />}
            <circle cx={x} cy={y} r="2.2" fill="#f6f2e6" />
            <circle cx={x - 2} cy={y - 2.4} r="1.4" fill="#fff" opacity="0.8" />
          </g>
        ))}
        <circle cx="58" cy="40" r="6" fill="#f8f6ee" />
        <circle cx="56" cy="37.6" r="1.4" fill="#fff" />
      </svg>
      <BeerProp className="decor-beer" />
    </div>
  );
}

/** Churrasco no quintal: toalha xadrez, tábua com espetinhos, farofa, vinagrete e a cerveja. */
function QuintalDecor() {
  return (
    <div className="table-decor decor-quintal" aria-hidden>
      {/* tábua com espetinhos */}
      <svg className="decor-skewers" viewBox="0 0 130 70" width="130" height="70">
        <ellipse cx="66" cy="38" rx="62" ry="28" fill="#000" opacity="0.28" />
        <rect x="6" y="10" width="118" height="50" rx="10" fill="#b07a3a" />
        <rect x="6" y="10" width="118" height="50" rx="10" fill="none" stroke="#7a4c1c" strokeWidth="2" />
        <path d="M16 20 H112 M18 36 H110 M16 50 H112" stroke="#8a5a26" strokeOpacity="0.4" strokeWidth="1" />
        {[22, 35, 48].map((y, i) => (
          <g key={y} transform={`rotate(${(i - 1) * 3} 65 ${y})`}>
            <path d={`M10 ${y} H122`} stroke="#d8c8a0" strokeWidth="2" strokeLinecap="round" />
            {[30, 46, 62, 78, 94].map((x, j) => (
              <rect
                key={x}
                x={x - 6}
                y={y - 6}
                width="12"
                height="12"
                rx="3.5"
                fill={j % 2 ? (i === 1 ? '#c87a30' : '#7a2e14') : '#5a2008'}
                stroke="#2a0e04"
                strokeOpacity="0.5"
              />
            ))}
            {[30, 62, 94].map((x) => (
              <path key={x} d={`M${x - 4} ${y - 2} l3 3 M${x} ${y - 3} l3 3`} stroke="#1a0802" strokeWidth="1.4" opacity="0.6" />
            ))}
          </g>
        ))}
      </svg>
      {/* farofa */}
      <svg className="decor-farofa" viewBox="0 0 80 50" width="80" height="50">
        <ellipse cx="40" cy="30" rx="38" ry="17" fill="#000" opacity="0.28" />
        <ellipse cx="40" cy="26" rx="36" ry="16" fill="#f2f2ee" />
        <ellipse cx="40" cy="26" rx="28" ry="11" fill="#e0b860" />
        {Array.from({ length: 22 }, (_, i) => (
          <circle key={i} cx={18 + ((i * 37) % 44)} cy={19 + ((i * 13) % 14)} r={0.8 + (i % 3) * 0.4} fill={i % 4 ? '#c8962e' : '#8a3a1a'} />
        ))}
      </svg>
      {/* vinagrete */}
      <svg className="decor-vinagrete" viewBox="0 0 70 44" width="70" height="44">
        <ellipse cx="35" cy="26" rx="33" ry="15" fill="#000" opacity="0.28" />
        <ellipse cx="35" cy="22" rx="31" ry="14" fill="#e8f0f4" opacity="0.85" />
        <ellipse cx="35" cy="22" rx="24" ry="10" fill="#f4e8c8" />
        {Array.from({ length: 26 }, (_, i) => (
          <rect key={i} x={15 + ((i * 29) % 40)} y={15 + ((i * 11) % 13)} width="3" height="3" rx="0.6" fill={['#d82a1a', '#3aa040', '#f4f0d8', '#d82a1a'][i % 4]} />
        ))}
      </svg>
      <BeerProp className="decor-beer" />
    </div>
  );
}

/** Estampa da mesa: o "100" em moedas douradas, o slogan e o nome da marca. */
function BrandPrint({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 150 70" width="150" height="70">
      <g opacity="0.92">
        {/* "100" em moedas */}
        {[
          ['1', 26],
          ['0', 50],
          ['0', 76],
        ].map(([d, x], i) => (
          <g key={i} transform={`translate(${x} 22)`}>
            {d === '1' ? (
              <g>
                <rect x="-5" y="-15" width="10" height="30" rx="2" fill="#e8c860" stroke="#a8862a" strokeWidth="1" />
                <path d="M-3 -12 V12" stroke="#fff4c0" strokeWidth="1.4" opacity="0.7" />
              </g>
            ) : (
              <g>
                <circle r="13" fill="#e8c860" stroke="#a8862a" strokeWidth="1" />
                <circle r="9.5" fill="none" stroke="#c8a040" strokeWidth="1.2" />
                <path d="M-7 -5 a9 9 0 0 1 9 -4" stroke="#fff4c0" strokeWidth="1.6" fill="none" opacity="0.8" />
              </g>
            )}
          </g>
        ))}
        <text x="104" y="20" fontSize="10" fontStyle="italic" fontWeight="700" fill="#fff" fontFamily="Georgia, serif">
          {BRAND.tableSlogan}
        </text>
        <text x="75" y="64" textAnchor="middle" fontSize="19" fontWeight="700" letterSpacing="2.5" fill="#fff" fontFamily="Georgia, 'Times New Roman', serif">
          {BRAND.table}
        </text>
      </g>
    </svg>
  );
}

/** A 600 âmbar suada, com o rótulo azul e o brasão dos pinguins, e o copo americano. */
export function BeerProp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 80 140" width="80" height="140" aria-hidden>
      <defs>
        <linearGradient id="beer-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a2c08" />
          <stop offset="0.25" stopColor="#b8681a" />
          <stop offset="0.45" stopColor="#d88a2a" />
          <stop offset="0.75" stopColor="#8a4410" />
          <stop offset="1" stopColor="#4a2006" />
        </linearGradient>
        <linearGradient id="beer-label" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0e3a86" />
          <stop offset="0.35" stopColor="#2a6ad0" />
          <stop offset="0.6" stopColor="#1e58b8" />
          <stop offset="1" stopColor="#0a2a66" />
        </linearGradient>
        <clipPath id="beer-body">
          <path d="M12 134 V64 C12 52 18 46 21 40 V12 H31 V40 C34 46 40 52 40 64 V134Z" />
        </clipPath>
      </defs>
      <ellipse cx="40" cy="134" rx="38" ry="5" fill="#000" opacity="0.3" />

      {/* garrafa */}
      <path d="M12 134 V64 C12 52 18 46 21 40 V12 H31 V40 C34 46 40 52 40 64 V134Z" fill="url(#beer-glass)" />
      <g clipPath="url(#beer-body)">
        {/* "CERVEJA" em relevo no ombro */}
        <text x="26" y="58" textAnchor="middle" fontSize="4.4" fontWeight="700" fill="#f0a850" opacity="0.55" letterSpacing="0.6" fontFamily="sans-serif">
          CERVEJA
        </text>
        {/* rótulo azul */}
        <rect x="10" y="70" width="34" height="50" fill="url(#beer-label)" />
        <path d="M10 70 H44 M10 120 H44" stroke="#9cc4ff" strokeWidth="0.8" opacity="0.7" />
        <text x="26" y="79" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="#fff" letterSpacing="0.2" fontFamily="'Yanone Kaffeesatz', 'Arial Narrow', sans-serif">
          {BRAND.beer}
        </text>
        {/* brasão: espigas, anel dourado, círculo vermelho e os dois pinguins */}
        <g transform="translate(26 97)">
          <path d="M-13 6 C-14 -2 -12 -9 -7 -13 M13 6 C14 -2 12 -9 7 -13" stroke="#e8d070" strokeWidth="1" fill="none" opacity="0.8" />
          {[-10, -6, -2].map((y) => (
            <g key={y}>
              <ellipse cx={-12.4 - y * 0.12} cy={y} rx="1.4" ry="0.8" fill="#e8d070" opacity="0.8" transform={`rotate(-30 ${-12.4 - y * 0.12} ${y})`} />
              <ellipse cx={12.4 + y * 0.12} cy={y} rx="1.4" ry="0.8" fill="#e8d070" opacity="0.8" transform={`rotate(30 ${12.4 + y * 0.12} ${y})`} />
            </g>
          ))}
          <circle r="10" fill="#f4f0e4" />
          <path d="M-10 0 A10 10 0 0 0 10 0Z" fill="#f0c020" />
          <circle r="7.6" fill="#d81e28" />
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${side * 2.6} 0) scale(${-side} 1)`}>
              <path d="M0 -6 C3 -6 4 -3 3.6 0 C3.4 3 2.4 5.6 0 6 C-1.6 4 -1.8 -3 0 -6Z" fill="#141414" />
              <path d="M0.6 -3 C2.4 -2 2.8 1 2.2 3.6 C1.4 5 0.4 4.4 0.4 2.4Z" fill="#f4f4f4" />
              <path d="M0 -5.2 L-1.6 -4.6 L0 -4.2Z" fill="#f0a020" />
            </g>
          ))}
        </g>
        <text x="26" y="117" textAnchor="middle" fontSize="3.4" fill="#cfe0ff" fontFamily="sans-serif">
          600ml
        </text>
        {/* reflexo do vidro e gotas de suor da garrafa gelada */}
        <path d="M16 136 V66 C16 56 20 50 23 44" stroke="#fff" strokeWidth="2" fill="none" opacity="0.35" />
        {[
          [18, 52, 1],
          [34, 58, 1.2],
          [30, 66, 0.8],
          [15, 84, 1.1],
          [38, 90, 0.9],
          [20, 110, 1.2],
          [36, 112, 0.8],
          [27, 126, 1.1],
          [17, 128, 0.7],
          [24, 30, 0.8],
          [28, 22, 0.7],
        ].map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill="#fff" opacity="0.55" />
            <circle cx={x + r * 0.3} cy={y + r * 0.35} r={r * 0.6} fill="#000" opacity="0.18" />
          </g>
        ))}
      </g>
      {/* tampinha */}
      <rect x="20" y="6" width="12" height="8" rx="1.5" fill="#1f5fb8" />
      <path d="M20 8 H32 M20 10.5 H32" stroke="#0e3a86" strokeWidth="0.8" />

      {/* copo americano facetado com colarinho */}
      <path d="M46 92 H74 L71 132 H49Z" fill="#e8a830" opacity="0.92" />
      <path d="M46 92 H74 L73.4 100 H46.6Z" fill="#fff8e6" />
      <path d="M46 92 C52 88 68 88 74 92" fill="#fff8e6" />
      <path d="M50 100 L51.4 131 M55 100 L56 132 M60 100 L60 132 M65 100 L64.4 132 M70 100 L68.6 131" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.8" />
      <path d="M46 92 H74 L71 132 H49Z" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
      {[[52, 112], [58, 120], [66, 108], [62, 126]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.8" fill="#fff" opacity="0.7" />
      ))}
    </svg>
  );
}
