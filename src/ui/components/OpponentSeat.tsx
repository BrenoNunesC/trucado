// O adversário sentado do outro lado da mesa, visto de cima: só tronco, braços e mãos (a cabeça
// fica fora da mesa). Segura as cartas em leque e reage ao jogo: lança a carta na rodada, bate na
// mesa quando pede truco, dá uma batidinha quando aceita, larga as cartas quando corre e tamborila
// os dedos enquanto pensa. Roupa, pele e adereços vêm de ART (Portrait.tsx), pelo mesmo id; o
// porte e os detalhes próprios de cada um (relógio, aliança, tatuagem...) vêm daqui.
//
// O corpo é uma silhueta só: tronco e mangas ficam na mesma camada de tecido e a luz é calculada
// sobre o conjunto (relevo a partir da silhueta borrada), então não aparecem emendas entre ombro,
// braço e tronco. Os braços são contornos orgânicos (deltoide, bíceps, cotovelo, antebraço
// afinando até o pulso) e as mãos têm dorso, nós dos dedos e falanges dobradas sobre as cartas.
//
// Três camadas do mesmo tamanho: SVG de trás (corpo), as cartas em HTML (o verso da carta usa
// 3D, que não desenha dentro de SVG) e SVG da frente (as mãos agarrando o leque).

import type { ReactNode } from 'react';
import type { Card, Rank } from '../../engine/cards';
import { CardView } from './CardView';
import { ART } from './Portrait';

export type Gesture = 'throw' | 'slam' | 'tap' | 'fold' | 'cheer' | null;

export interface OpponentSeatProps {
  id: string;
  cards: Card[];
  revealedId?: string;
  /** Mostra todas as cartas abertas (o parceiro na Mão de Onze). */
  reveal?: boolean;
  manilha: Rank | null;
  gesture: Gesture;
  /** Muda a cada gesto, para reiniciar a animação. */
  gestureKey: number;
  thinking?: boolean;
}

type Pt = [number, number];
type Detail = 'watch' | 'goldWatch' | 'ring' | 'band' | 'tattoo' | 'pen' | 'grease' | 'flour' | 'tape' | 'rosary' | 'bracelet' | 'rolledSleeves' | 'hairyArms';

/** Porte de cada um: largura do tronco e grossura dos braços. */
const BUILD: Record<string, number> = {
  tonhao: 1.18, valentao: 1.22, marcao: 1.1, zeca: 1.1, maxCromado: 1.16, padeiro: 1.14, coronelBoss: 1.08, delegado: 1.1,
  maoDeFerro: 1.12, bene: 1.06, cobradorBoss: 1.1, imperador: 1.04, djVinil: 1.04,
  betinho: 0.86, deivid: 0.9, juninho: 0.9, vanessa: 0.88, ciganinha: 0.86, rainhaNeon: 0.88, katia: 0.9, rosana: 0.92,
  cris: 0.92, lu: 0.94, telma: 0.9, paty: 0.92, corredor: 0.88, sorrateiro: 0.88, ninaK7: 0.9, arlindo: 0.94, drPixel: 0.94,
};

/** O que torna cada um reconhecível sem o rosto. */
const DETAILS: Record<string, Detail[]> = {
  tonhao: ['watch', 'band', 'hairyArms', 'rolledSleeves'],
  rosana: ['bracelet', 'ring'],
  juninho: ['watch'],
  neide: ['band', 'rosary'],
  marcao: ['goldWatch', 'ring'],
  cris: ['bracelet'],
  arlindo: ['pen', 'band', 'watch'],
  katia: ['pen', 'watch'],
  bene: ['band', 'hairyArms'],
  lu: ['bracelet'],
  gringo: ['goldWatch', 'ring', 'hairyArms'],
  paty: ['rosary', 'bracelet'],
  zeca: ['grease', 'watch', 'rolledSleeves'],
  telma: ['pen', 'ring'],
  cida: ['tape', 'band'],
  jorge: ['tattoo', 'hairyArms'],
  vanessa: ['bracelet', 'ring'],
  deivid: ['watch'],
  osvaldo: ['pen', 'band', 'watch'],
  betinho: [],
  tiao: ['band', 'watch'],
  maoDeFerro: ['watch', 'tattoo'],
  caladao: ['rosary'],
  sorrateiro: ['bracelet', 'ring'],
  corredor: ['watch'],
  benzedeira: ['rosary', 'bracelet'],
  coronelBoss: ['goldWatch', 'ring'],
  agiota: ['goldWatch', 'ring', 'pen'],
  cego: ['band'],
  peFrio: ['watch'],
  delegado: ['watch', 'hairyArms'],
  sogra: ['band', 'bracelet'],
  valentao: ['goldWatch', 'tattoo', 'ring'],
  ladyLaser: ['goldWatch', 'ring', 'bracelet'],
  ninaK7: ['rosary', 'band'],
  maxCromado: ['tattoo', 'hairyArms', 'rolledSleeves'],
  drPixel: ['pen', 'watch'],
  djVinil: ['goldWatch', 'ring'],
  rambinho: ['watch', 'tattoo'],
  capitaoFax: ['tattoo', 'band'],
  babyBoom: ['bracelet', 'ring', 'band'],
  comadre: ['rosary', 'band'],
  padeiro: ['flour', 'rolledSleeves'],
  juizBoss: ['pen', 'band', 'watch'],
  ciganinha: ['bracelet', 'ring'],
  prefeito: ['goldWatch', 'band', 'pen'],
  imperador: ['goldWatch', 'ring', 'bracelet'],
  rainhaNeon: ['bracelet', 'ring'],
  baraoVectra: ['goldWatch', 'ring'],
  cobradorBoss: ['pen', 'goldWatch'],
};

const FEMININE_HAIR = new Set(['perm', 'bun', 'long', 'bob', 'ponytail', 'asa']);

/** Estampa do tecido de cada um. */
const PATTERN: Record<string, 'plaid' | 'floral' | 'polka' | 'pinstripe'> = {
  maxCromado: 'plaid',
  cego: 'plaid',
  tonhao: 'plaid',
  rosana: 'floral',
  neide: 'floral',
  cida: 'floral',
  babyBoom: 'floral',
  sogra: 'floral',
  telma: 'polka',
  vanessa: 'polka',
  agiota: 'pinstripe',
  coronelBoss: 'pinstripe',
  prefeito: 'pinstripe',
};

/** Nome bordado no peito ou estampa da camiseta. */
const CHEST_TEXT: Record<string, string> = {
  zeca: 'ZECA',
  osvaldo: 'OSVALDO',
  juninho: 'GÁS',
  gringo: 'TÁXI',
  peFrio: 'SORVETES',
  corredor: '42',
  marcao: '10',
  lu: '7',
  betinho: '2',
  djVinil: '9',
};

/** Mangas compridas cobrem o antebraço; nas curtas o antebraço aparece. */
const LONG_SLEEVES = new Set(['suit', 'shoulder', 'uniform', 'robe', 'tracksuit', 'jacket']);

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return '#' + ((1 << 24) | (ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1);
}

const f = (n: number) => Math.round(n * 10) / 10;

/** Curva suave (Catmull-Rom convertida em Bézier) passando pelos pontos. */
function smooth(pts: Pt[], move = true): string {
  let d = move ? `M${f(pts[0][0])} ${f(pts[0][1])}` : `L${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/**
 * Contorno de um braço do ombro ao pulso. `w` são as meias-larguras em: ombro, bíceps, cotovelo,
 * barriga do antebraço e pulso. `upTo` corta o contorno (0..1 do braço inteiro) para desenhar só
 * a manga.
 */
function limb(sh: Pt, el: Pt, wr: Pt, w: number[], upTo = 1, hem?: number): string {
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const dirA: Pt = [el[0] - sh[0], el[1] - sh[1]];
  const dirB: Pt = [wr[0] - el[0], wr[1] - el[1]];
  const norm = (d: Pt): Pt => {
    const l = Math.hypot(d[0], d[1]);
    return [-d[1] / l, d[0] / l];
  };
  const nA = norm(dirA);
  const nB = norm(dirB);
  const nE = norm([dirA[0] + dirB[0], dirA[1] + dirB[1]]);
  // amostras: [posição ao longo do braço (0..1), ponto, normal, meia-largura]
  const samples: [number, Pt, Pt, number][] = [
    [0, sh, nA, w[0]],
    [0.18, lerp(sh, el, 0.38), nA, w[1]],
    [0.42, el, nE, w[2]],
    [0.58, lerp(el, wr, 0.28), nB, w[3]],
    [1, wr, nB, w[4]],
  ];
  // corta no ponto pedido (manga), interpolando a última amostra
  let pts = samples;
  if (upTo < 1) {
    const i = samples.findIndex((s) => s[0] >= upTo);
    const a = samples[i - 1];
    const b = samples[i];
    const t = (upTo - a[0]) / (b[0] - a[0]);
    const p = lerp(a[1], b[1], t);
    const n: Pt = [a[2][0] + (b[2][0] - a[2][0]) * t, a[2][1] + (b[2][1] - a[2][1]) * t];
    pts = [...samples.slice(0, i), [upTo, p, n, (a[3] + (b[3] - a[3]) * t) * (hem ?? 1)]];
  }
  const left = pts.map(([, p, n, wd]) => [p[0] + n[0] * wd, p[1] + n[1] * wd] as Pt);
  const right = pts.map(([, p, n, wd]) => [p[0] - n[0] * wd, p[1] - n[1] * wd] as Pt).reverse();
  const end = pts[pts.length - 1];
  const r = end[3];
  // ponta: arredondada no pulso; na manga, a barra faz uma curva abraçando o braço
  const dir = end[0] < 0.42 ? dirA : dirB;
  const dl = Math.hypot(dir[0], dir[1]);
  const ctrl: Pt = [end[1][0] + (dir[0] / dl) * r * 0.7, end[1][1] + (dir[1] / dl) * r * 0.7];
  const capSweep =
    upTo < 1 ? `Q${f(ctrl[0])} ${f(ctrl[1])} ${f(right[0][0])} ${f(right[0][1])}` : `A${f(r)} ${f(r)} 0 0 1 ${f(right[0][0])} ${f(right[0][1])}`;
  return `${smooth(left)} ${capSweep} ${smooth(right, false).replace(/^L[^C]*/, '')} Z`;
}

/** Dedo afinando da base para a ponta (raios diferentes nas duas pontas). */
function taper(a: Pt, b: Pt, r1: number, r2: number): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  const ux = -dy / l;
  const uy = dx / l;
  return `M${f(a[0] + ux * r1)} ${f(a[1] + uy * r1)} L${f(b[0] + ux * r2)} ${f(b[1] + uy * r2)} A${f(r2)} ${f(r2)} 0 0 0 ${f(b[0] - ux * r2)} ${f(b[1] - uy * r2)} L${f(a[0] - ux * r1)} ${f(a[1] - uy * r1)} A${f(r1)} ${f(r1)} 0 0 0 ${f(a[0] + ux * r1)} ${f(a[1] + uy * r1)}Z`;
}

interface HandLook {
  skin: string;
  nails?: string;
  old?: boolean;
  hairy?: boolean;
  details: Detail[];
}

/**
 * Dedos da mão esquerda (do nosso ponto de vista), do mindinho (por fora) ao indicador (perto do
 * centro): nó, junta do meio e ponta. Os dedos sobem pelo verso das cartas, levemente abertos.
 */
const FINGERS: { k: Pt; pip: Pt; tip: Pt; r1: number; r2: number }[] = [
  { k: [-15, 0], pip: [-18, -11], tip: [-19.5, -20], r1: 3.9, r2: 3.1 },
  { k: [-5.4, -2], pip: [-6.4, -15], tip: [-6.6, -26], r1: 4.5, r2: 3.6 },
  { k: [4.4, -2.2], pip: [5.4, -16], tip: [6.4, -28], r1: 4.7, r2: 3.8 },
  { k: [14, -0.6], pip: [16.6, -13.6], tip: [18.6, -24.6], r1: 4.5, r2: 3.6 },
];

/**
 * Mão segurando o leque, vista do nosso lado da mesa: o polegar fica do lado das faces e daqui
 * se vê o dorso (com tendões e nós) e os quatro dedos subindo pelo verso das cartas. Cada dedo
 * afina até a ponta, tem as dobras das juntas, faz sombra no vizinho e termina numa unha com
 * cutícula e brilho.
 */
function Hand({ x, y, flip, look, ringFinger }: { x: number; y: number; flip?: boolean; look: HandLook; ringFinger?: boolean }) {
  const { skin, nails, old, hairy, details } = look;
  const dark = shade(skin, -0.32);
  const deep = shade(skin, -0.5);
  const light = shade(skin, 0.3);
  const s = flip ? -1 : 1;
  const ring = details.includes('ring');
  const band = details.includes('band');
  return (
    <g transform={`translate(${x} ${y}) scale(${s} 1)`}>
      {/* dorso: dos nós ao pulso, um pouco mais largo nos nós */}
      <path d="M-20 -1 C-21 -5 -12 -7 -2 -7 C8 -7 19 -6 20 -1 C21 6 18 14 12 20 C8 25 -4 26 -11 22 C-17 18 -20 9 -20 -1Z" fill={skin} />
      {/* lado do mindinho na sombra, luz no lado do indicador */}
      <path d="M-20 -1 C-20 9 -17 18 -11 22 C-14 14 -15 6 -15 -2Z" fill={dark} opacity="0.5" />
      <path d="M17 -2 C19 4 17 12 12 18 C14 10 14 4 13 -2Z" fill={light} opacity="0.35" />
      {/* tendões claros indo de cada nó para o pulso, vãos escuros entre os ossos */}
      <g fill="none" strokeLinecap="round">
        {FINGERS.map((fg, i) => (
          <path key={`t${i}`} d={`M${fg.k[0] * 0.95} ${fg.k[1] + 3} C${fg.k[0] * 0.7} 8 ${fg.k[0] * 0.4} 14 ${fg.k[0] * 0.25} 21`} stroke={light} strokeWidth="1.3" opacity="0.42" />
        ))}
        {[-10, 0, 9].map((xx) => (
          <path key={`v${xx}`} d={`M${xx} 1 C${xx * 0.8} 8 ${xx * 0.55} 14 ${xx * 0.4} 19`} stroke={dark} strokeWidth="0.9" opacity="0.3" />
        ))}
      </g>
      {old && (
        <g fill="none" stroke={shade(skin, -0.2)} strokeWidth="1.2" opacity="0.7" strokeLinecap="round">
          <path d="M-12 18 C-8 12 -10 8 -6 3 M4 20 C6 14 2 10 6 4" />
          <circle cx="-6" cy="12" r="1.6" fill={shade(skin, -0.16)} stroke="none" />
          <circle cx="8" cy="9" r="1.1" fill={shade(skin, -0.16)} stroke="none" />
        </g>
      )}
      {hairy && (
        <g stroke={deep} strokeWidth="0.5" opacity="0.5" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M${-14 + ((i * 7) % 28)} ${4 + ((i * 11) % 16)} l1.4 -1.6`} />
          ))}
        </g>
      )}
      {details.includes('grease') && <path d="M-14 6 C-8 0 0 8 6 2 C4 12 -8 16 -14 6Z M8 -4 C12 -6 16 -2 18 -4 C16 0 11 1 8 -4Z" fill="#1a1612" opacity="0.45" />}
      {details.includes('flour') && <path d="M-16 2 C-6 -4 8 -2 14 8 C4 6 -6 12 -16 2Z" fill="#fff" opacity="0.55" />}

      {/* dedos, do mindinho ao indicador; cada um faz sombra no vizinho de dentro */}
      {FINGERS.map((fg, i) => {
        const { k, pip, tip, r1, r2 } = fg;
        const dip: Pt = [pip[0] + (tip[0] - pip[0]) * 0.55, pip[1] + (tip[1] - pip[1]) * 0.55];
        const across = (p: Pt, r: number, bend: number) => `M${f(p[0] - r + 0.8)} ${f(p[1] + bend)} Q${f(p[0])} ${f(p[1] - bend)} ${f(p[0] + r - 0.8)} ${f(p[1] + bend)}`;
        const nailA: Pt = [tip[0] + (pip[0] - tip[0]) * 0.36, tip[1] + (pip[1] - tip[1]) * 0.36];
        const nailB: Pt = [tip[0] + (pip[0] - tip[0]) * 0.06, tip[1] + (pip[1] - tip[1]) * 0.06];
        return (
          <g key={i} className="seat-finger">
            <path d={taper([k[0] + 1.6, k[1] + 1], [tip[0] + 1.6, tip[1] + 1], r1, r2)} fill={deep} opacity="0.32" />
            <path d={taper(k, pip, r1, r1 * 0.94)} fill={skin} />
            <path d={taper(pip, tip, r1 * 0.9, r2)} fill={shade(skin, 0.03)} />
            {/* nó e o brilho que corre pelo dedo */}
            <ellipse cx={k[0] - 0.8} cy={k[1] - 1.6} rx={r1 * 0.7} ry="2.6" fill={light} opacity="0.55" />
            <path d={`M${f(k[0] - r1 * 0.4)} ${f(k[1] - 3)} L${f(tip[0] - r2 * 0.4)} ${f(tip[1] + 4)}`} stroke={light} strokeWidth="1" opacity="0.35" strokeLinecap="round" />
            {/* dobras das juntas */}
            <path d={across(pip, r1, 1.2)} stroke={dark} strokeWidth="0.75" fill="none" opacity="0.8" />
            <path d={across([pip[0], pip[1] + 1.8], r1 * 0.8, 0.9)} stroke={dark} strokeWidth="0.55" fill="none" opacity="0.6" />
            <path d={across(dip, r2 + 0.4, 0.8)} stroke={dark} strokeWidth="0.55" fill="none" opacity="0.55" />
            {/* unha com cutícula e brilho */}
            <path d={taper(nailA, nailB, r2 * 0.72, r2 * 0.7)} fill={nails ?? shade(skin, 0.4)} />
            <path d={taper(nailA, nailB, r2 * 0.72, r2 * 0.7)} fill="none" stroke={nails ? shade(nails, -0.35) : dark} strokeWidth="0.5" opacity="0.75" />
            {!nails && <ellipse cx={nailA[0]} cy={nailA[1] - 0.6} rx={r2 * 0.4} ry="0.9" fill="#fff" opacity="0.45" />}
            <path d={`M${f(nailA[0] - r2 * 0.3)} ${f(nailA[1] - 1)} L${f(nailB[0] - r2 * 0.3)} ${f(nailB[1] + 0.6)}`} stroke="#fff" strokeWidth="0.6" opacity="0.65" strokeLinecap="round" />
            {/* aliança/anel no anelar da mão esquerda; anel de pedra no mindinho da direita */}
            {ringFinger && i === 1 && (band || ring) && (
              <g>
                <path d={taper([k[0] - 0.4, k[1] - 4.4], [k[0] - 0.6, k[1] - 6.8], r1 + 0.7, r1 + 0.7)} fill="#e0b440" />
                <path d={`M${k[0] - r1} ${k[1] - 5} L${k[0] - r1 + 0.3} ${k[1] - 6.6}`} stroke="#fff6c8" strokeWidth="0.8" />
              </g>
            )}
            {!ringFinger && i === 0 && ring && (
              <g>
                <path d={taper([k[0] - 0.6, k[1] - 3.6], [k[0] - 1, k[1] - 6], r1 + 0.7, r1 + 0.7)} fill="#e0b440" />
                <circle cx={k[0] - 0.8} cy={k[1] - 4.8} r="2.2" fill="#b0182a" stroke="#7a5a10" strokeWidth="0.5" />
                <circle cx={k[0] - 1.4} cy={k[1] - 5.4} r="0.6" fill="#fff" />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function OpponentSeat({ id, cards, revealedId, reveal, manilha, gesture, gestureKey, thinking }: OpponentSeatProps) {
  const a = ART[id] ?? ART.bene;
  const ex = (a.extras ?? []) as string[];
  const has = (e: string) => ex.includes(e);
  const details = DETAILS[id] ?? [];
  const det = (d: Detail) => details.includes(d);
  const skin = a.skin;
  const o = a.outfit;
  const acc = a.accent;
  const style = a.outfitStyle;
  // o porte varia, mas sem exagero: o mapa diz a tendência e aqui ela é amaciada
  const build = 1 + ((BUILD[id] ?? 1) - 1) * 0.55;
  const feminine = FEMININE_HAIR.has(a.hairStyle) || has('lipstick');
  const long = LONG_SLEEVES.has(style) && !det('rolledSleeves');
  const nails = has('lipstick') ? '#c8203a' : undefined;
  const look: HandLook = { skin, nails, old: has('wrinkles'), hairy: details.includes('hairyArms'), details };
  const folded = gesture === 'fold';
  const anim = `${gesture ? `gesture-${gesture}` : ''} ${thinking ? 'thinking' : ''}`;
  const uid = `${id}-${gestureKey}`;

  // leque de cartas preso entre as mãos
  const n = cards.length;
  const fan = cards.map((c, i) => ({ c, rot: n === 1 ? 0 : (i - (n - 1) / 2) * 14 }));

  // ------------------------------------------------------------ geometria do corpo
  const bx = (x: number) => 200 + (x - 200) * build;
  const torso = smooth([
    [bx(58), -2],
    [bx(62), 16],
    [bx(76), 40],
    [bx(104), 62],
    [bx(148), 74],
    [200, 77],
    [bx(252), 74],
    [bx(296), 62],
    [bx(324), 40],
    [bx(338), 16],
    [bx(342), -2],
  ]) + ' Z';
  const arm = (side: 1 | -1) => {
    const x = (v: number) => 200 + side * (v - 200);
    return {
      // o ombro fica atrás da borda da mesa: a manga continua o contorno do tronco, sem degrau
      sh: [x(bx(94)), 2] as Pt,
      el: [x(bx(72)), 108] as Pt,
      wr: [x(166), 150] as Pt,
    };
  };
  const L = arm(1);
  const R = arm(-1);
  const t = build;
  const widths = [17 * t, 14.5 * t, 10 * t, 11.5 * t, 8 * t].map((w) => (feminine ? w * 0.88 : w));
  // manga: comprida até o pulso; curta até o meio do braço; regata não tem
  const sleeveTo = long ? 1 : style === 'tank' ? 0 : det('rolledSleeves') ? 0.5 : 0.3;
  const sleeveHem = long ? 1 : 1.04;
  const skinArm = (p: typeof L) => limb(p.sh, p.el, p.wr, widths);
  const sleeve = (p: typeof L) => (sleeveTo > 0 ? limb(p.sh, p.el, p.wr, widths.map((w) => w * 1.08), sleeveTo, sleeveHem) : '');
  const pattern = PATTERN[id];
  const clothFill = pattern ? `url(#pat-${uid})` : o;
  const torsoFill = style === 'tank' ? skin : o;

  // ------------------------------------------------------------ peito e roupa
  let chest: ReactNode;
  const stitch = { stroke: shade(o, 0.35), strokeWidth: 0.9, strokeDasharray: '2.5 2', fill: 'none', opacity: 0.7 };
  switch (style) {
    case 'suit':
      chest = (
        <g>
          {/* camisa, gravata e lapelas */}
          <path d="M172 -2 L200 62 L228 -2Z" fill="#f2f0ea" />
          <path d="M184 -2 L192 12 L200 4 L208 12 L216 -2Z" fill="#fff" stroke="#c8c4b8" strokeWidth="0.8" />
          <path d="M196 4 H204 L207 18 L209 52 L200 64 L191 52 L193 18Z" fill={acc} />
          <path d="M196 4 H204 L203 12 H197Z" fill={shade(acc, -0.25)} />
          <path d="M150 -2 C160 20 176 44 200 70 L190 72 C170 50 154 26 144 -2Z" fill={shade(o, -0.12)} />
          <path d="M250 -2 C240 20 224 44 200 70 L210 72 C230 50 246 26 256 -2Z" fill={shade(o, -0.12)} />
          <path d="M150 -2 C160 20 176 44 200 70 M250 -2 C240 20 224 44 200 70" stroke={shade(o, -0.4)} strokeWidth="1.2" fill="none" />
          {/* lenço no bolso e botões */}
          <path d="M252 40 L276 36 L277 42 L253 46Z" fill={shade(o, -0.2)} />
          <path d="M256 40 L262 30 L268 39 L272 32 L274 38" fill="#f2f0ea" />
          {[74, 80].map((y) => (
            <circle key={y} cx="200" cy={y} r="2" fill={shade(o, -0.4)} />
          ))}
        </g>
      );
      break;
    case 'tee':
    case 'jersey':
      chest = (
        <g>
          {style === 'jersey' && (
            <g clipPath={`url(#torso-${uid})`}>
              {[-3, -2, -1, 1, 2, 3].map((k) => (
                <rect key={k} x={200 + k * 34 * build - 8} y="-4" width="16" height="92" fill={acc} />
              ))}
              {/* escudo do time */}
              <path d="M240 30 L252 28 L254 40 C252 46 246 48 246 48 C246 48 240 46 238 40Z" fill="#fff" stroke={shade(acc, -0.3)} strokeWidth="0.8" />
            </g>
          )}
          {/* gola careca com ribana */}
          <path d="M168 -2 C176 22 224 22 232 -2" stroke={style === 'jersey' ? '#fff' : shade(o, -0.22)} strokeWidth="6" fill="none" />
          <path d="M168 -2 C176 22 224 22 232 -2" {...stitch} />
          {style === 'tee' && <path d="M120 40 C150 48 170 46 186 52" stroke={shade(o, -0.25)} strokeWidth="1.4" fill="none" opacity="0.5" />}
        </g>
      );
      break;
    case 'tank':
      chest = (
        <g>
          <path d={`M${bx(118)} 84 C${bx(122)} 50 ${bx(128)} 20 ${bx(134)} -2 L${bx(162)} -2 C180 40 220 40 ${bx(238)} -2 L${bx(266)} -2 C${bx(272)} 20 ${bx(278)} 50 ${bx(282)} 84Z`} fill={o} />
          <path d={`M${bx(162)} -2 C180 40 220 40 ${bx(238)} -2`} {...stitch} stroke={shade(o, -0.3)} />
          {/* peitoral, barriga e pelos do peito por baixo da regata */}
          <g fill="none" strokeLinecap="round">
            <path d={`M${bx(128)} 30 C${bx(140)} 44 ${bx(152)} 50 ${bx(166)} 50`} stroke={shade(skin, -0.3)} strokeWidth="1.8" opacity="0.55" />
            <path d={`M${bx(272)} 30 C${bx(260)} 44 ${bx(248)} 50 ${bx(234)} 50`} stroke={shade(skin, -0.3)} strokeWidth="1.8" opacity="0.55" />
            <path
              d={`M${bx(126)} 74 C${bx(124)} 62 ${bx(126)} 50 ${bx(130)} 40 M${bx(274)} 74 C${bx(276)} 62 ${bx(274)} 50 ${bx(270)} 40`}
              stroke={shade(skin, 0.25)}
              strokeWidth="2.4"
              opacity="0.4"
            />
          </g>
          {det('hairyArms') && (
            <g stroke={shade(skin, -0.55)} strokeWidth="0.7" opacity="0.5" strokeLinecap="round">
              {Array.from({ length: 18 }, (_, i) => (
                <path key={i} d={`M${180 + ((i * 29) % 40)} ${2 + ((i * 17) % 14)} l${i % 2 ? 2 : -2} 1.6`} />
              ))}
            </g>
          )}
          {/* clavículas */}
          <path d={`M${bx(140)} 8 C160 16 176 14 190 12 M${bx(260)} 8 C240 16 224 14 210 12`} stroke={shade(skin, -0.25)} strokeWidth="1.4" fill="none" opacity="0.6" />
        </g>
      );
      break;
    case 'uniform':
      chest = (
        <g>
          {/* gola de camisa social com pontas e carcela com botões */}
          <path d="M176 -2 L184 22 L198 8Z" fill={shade(o, 0.1)} stroke={shade(o, -0.35)} strokeWidth="0.9" />
          <path d="M224 -2 L216 22 L202 8Z" fill={shade(o, 0.1)} stroke={shade(o, -0.35)} strokeWidth="0.9" />
          <path d="M200 8 V84" stroke={shade(o, -0.3)} strokeWidth="1.2" />
          <path d="M204 10 V84" {...stitch} />
          {[24, 42, 60, 74].map((y) => (
            <g key={y}>
              <circle cx="200" cy={y} r="2.8" fill={acc} stroke={shade(acc, -0.4)} strokeWidth="0.5" />
              {[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([dx, dy], i) => (
                <circle key={i} cx={200 + dx} cy={y + dy} r="0.4" fill={shade(acc, -0.55)} />
              ))}
              <path d={`M199.2 ${y - 0.8} L200.8 ${y + 0.8} M200.8 ${y - 0.8} L199.2 ${y + 0.8}`} stroke="#f3efe6" strokeWidth="0.35" />
            </g>
          ))}
          {/* dragonas e bolsos com lapela */}
          <path d={`M${bx(74)} 12 L${bx(124)} 6 M${bx(326)} 12 L${bx(276)} 6`} stroke={acc} strokeWidth="5" strokeLinecap="round" />
          {[148, 228].map((x) => (
            <g key={x}>
              <rect x={x} y="30" width="26" height="22" rx="2" fill={shade(o, -0.06)} />
              <path d={`M${x} 30 H${x + 26} V36 L${x + 13} 39 L${x} 36Z`} fill={shade(o, -0.15)} />
              <rect x={x} y="30" width="26" height="22" rx="2" {...stitch} />
              <circle cx={x + 13} cy="36" r="1.4" fill={acc} />
            </g>
          ))}
        </g>
      );
      break;
    case 'robe':
      chest = (
        <g>
          <path d="M162 -2 C172 40 190 62 200 70 C210 62 228 40 238 -2Z" fill={shade(o, -0.28)} />
          <path d="M162 -2 C172 40 190 62 200 70 C210 62 228 40 238 -2" stroke={acc} strokeWidth="4" fill="none" />
          <path d="M162 -2 C172 40 190 62 200 70 C210 62 228 40 238 -2" {...stitch} stroke={shade(acc, 0.4)} />
          <path d="M130 30 C140 50 150 64 168 76 M270 30 C260 50 250 64 232 76" stroke={shade(o, -0.3)} strokeWidth="1.4" fill="none" opacity="0.5" />
        </g>
      );
      break;
    case 'tracksuit':
      chest = (
        <g>
          {/* zíper com puxador e gola alta */}
          <path d="M200 6 V84" stroke={shade(o, -0.45)} strokeWidth="2.4" />
          <path d="M200 6 V84" stroke="#ccc" strokeWidth="1" strokeDasharray="1 1.4" />
          <path d="M180 -2 C184 10 196 14 200 14 C204 14 216 10 220 -2" fill={shade(o, 0.12)} stroke={shade(o, -0.3)} strokeWidth="0.9" />
          <rect x="197.5" y="22" width="5" height="10" rx="1.5" fill="#d8d8d8" stroke="#888" strokeWidth="0.5" />
          <path d={`M${bx(72)} 14 L${bx(150)} 76 M${bx(328)} 14 L${bx(250)} 76`} stroke="#fff" strokeWidth="3" opacity="0.85" />
        </g>
      );
      break;
    case 'apron':
      chest = (
        <g>
          <path d="M168 -2 C176 18 224 18 232 -2" stroke={shade(o, -0.28)} strokeWidth="4" fill="none" />
          {/* avental com alças, bolso e manchas de trabalho */}
          <path d={`M${bx(140)} 84 C${bx(142)} 50 ${bx(146)} 30 ${bx(150)} 18 C176 26 224 26 ${bx(250)} 18 C${bx(254)} 30 ${bx(258)} 50 ${bx(260)} 84Z`} fill={acc} />
          <path d={`M${bx(150)} 18 L${bx(166)} -2 M${bx(250)} 18 L${bx(234)} -2`} stroke={shade(acc, -0.15)} strokeWidth="5" />
          <path d={`M${bx(150)} 20 C176 28 224 28 ${bx(250)} 20`} {...stitch} stroke={shade(acc, -0.3)} />
          <rect x="182" y="50" width="36" height="22" rx="2" fill={shade(acc, -0.06)} />
          <rect x="182" y="50" width="36" height="22" rx="2" {...stitch} stroke={shade(acc, -0.3)} />
          {id === 'tonhao' && <path d="M164 34 C172 40 184 36 190 44 C180 46 168 44 164 34Z M226 60 C232 62 236 58 240 64 C234 66 228 66 226 60Z" fill="#9a2a1a" opacity="0.55" />}
          {(id === 'padeiro' || det('flour')) && <path d="M170 40 C186 30 210 34 226 44 C210 48 186 50 170 40Z" fill="#fff" opacity="0.5" />}
        </g>
      );
      break;
    case 'shoulder':
      chest = (
        <g>
          <path d="M170 -2 L200 34 L230 -2Z" fill={skin} />
          <path d="M184 6 C192 16 208 16 216 6" stroke={shade(skin, -0.25)} strokeWidth="1.2" fill="none" opacity="0.6" />
          {/* ombreiras */}
          <path d={`M${bx(64)} 4 C${bx(84)} 28 ${bx(112)} 28 ${bx(138)} 14 M${bx(336)} 4 C${bx(316)} 28 ${bx(288)} 28 ${bx(262)} 14`} stroke={acc} strokeWidth="4" fill="none" />
          <path d="M170 -2 L200 34 L230 -2" stroke={shade(o, -0.35)} strokeWidth="1.2" fill="none" />
        </g>
      );
      break;
    default:
      // jaqueta aberta sobre camiseta escura, com zíper e bolsos
      chest = (
        <g>
          <path d="M158 -2 C168 30 180 60 186 84 L214 84 C220 60 232 30 242 -2Z" fill="#23232e" />
          <path d="M176 -2 C184 14 216 14 224 -2" stroke="#3a3a48" strokeWidth="3" fill="none" />
          <path d="M158 -2 C168 30 180 60 186 84 M242 -2 C232 30 220 60 214 84" stroke={shade(o, -0.4)} strokeWidth="2" fill="none" />
          <path d="M160 -2 C170 30 182 60 188 84" stroke="#b8b8c0" strokeWidth="1" strokeDasharray="1 1.2" fill="none" />
          <path d="M150 -2 L170 22 L162 -2Z M250 -2 L230 22 L238 -2Z" fill={acc} />
          <path d={`M${bx(120)} 56 L${bx(150)} 50 M${bx(280)} 56 L${bx(250)} 50`} stroke={shade(o, -0.4)} strokeWidth="1.6" />
        </g>
      );
  }

  // ------------------------------------------------------------ dobras do tecido
  const folds = (
    <g fill="none" strokeLinecap="round" opacity="0.5">
      <path d={`M${bx(92)} 40 C${bx(110)} 50 ${bx(126)} 56 ${bx(146)} 60 M${bx(308)} 40 C${bx(290)} 50 ${bx(274)} 56 ${bx(254)} 60`} stroke={shade(torsoFill, -0.35)} strokeWidth="1.6" />
      <path d={`M${bx(94)} 42 C${bx(112)} 52 ${bx(128)} 58 ${bx(146)} 62`} stroke={shade(torsoFill, 0.3)} strokeWidth="1" />
      <path d={`M${bx(130)} 72 C150 70 170 74 186 78 M${bx(270)} 72 C250 70 230 74 214 78`} stroke={shade(torsoFill, -0.3)} strokeWidth="1.4" />
      {feminine && style !== 'tank' && (
        <path d="M150 52 C162 66 186 70 196 64 M250 52 C238 66 214 70 204 64" stroke={shade(torsoFill, -0.3)} strokeWidth="1.6" />
      )}
    </g>
  );

  // dobras na dobra do cotovelo da manga comprida
  const elbowFolds = (p: typeof L, side: 1 | -1) =>
    long ? (
      <g fill="none" stroke={shade(o, -0.4)} strokeWidth="1.3" opacity="0.55" strokeLinecap="round">
        <path d={`M${p.el[0] + side * 8} ${p.el[1] - 6} q${side * 6} 4 ${side * 12} 2`} />
        <path d={`M${p.el[0] + side * 9} ${p.el[1] + 2} q${side * 6} 3 ${side * 11} 0`} />
        <path d={`M${p.el[0] + side * 4} ${p.el[1] - 14} q${side * 5} 4 ${side * 10} 3`} />
      </g>
    ) : null;

  // relógio e pulseira no pulso, alinhados com o antebraço
  const wristWear = (p: typeof L, which: 'watch' | 'bracelet') => {
    const ang = (Math.atan2(p.wr[1] - p.el[1], p.wr[0] - p.el[0]) * 180) / Math.PI;
    const back = 0.16;
    const cx = p.wr[0] - (p.wr[0] - p.el[0]) * back;
    const cy = p.wr[1] - (p.wr[1] - p.el[1]) * back;
    const w = widths[4] * 1.15;
    if (which === 'bracelet')
      return (
        <g transform={`translate(${cx} ${cy}) rotate(${ang})`}>
          {[-2, 2].map((dx) => (
            <rect key={dx} x={dx - 1.2} y={-w} width="2.4" height={w * 2} rx="1.2" fill="#e8c040" stroke="#8a6a1a" strokeWidth="0.5" />
          ))}
        </g>
      );
    const gold = det('goldWatch');
    return (
      <g transform={`translate(${cx} ${cy}) rotate(${ang})`}>
        <rect x="-3.4" y={-w} width="6.8" height={w * 2} rx="1.5" fill={gold ? '#d8a830' : '#3a2a1e'} />
        <rect x="-3.4" y={-w} width="6.8" height={w * 2} rx="1.5" fill="none" stroke={gold ? '#8a6a1a' : '#1a120a'} strokeWidth="0.6" strokeDasharray={gold ? '1.4 0.8' : undefined} />
        <circle cx="0" cy={-w * 0.25} r="5.4" fill={gold ? '#e8c040' : '#c8c8d0'} stroke={gold ? '#8a6a1a' : '#5a5a68'} strokeWidth="0.8" />
        <circle cx="0" cy={-w * 0.25} r="4" fill="#f4f0e4" />
        <path d={`M0 ${-w * 0.25} L0 ${-w * 0.25 - 2.8} M0 ${-w * 0.25} L2 ${-w * 0.25 + 0.6}`} stroke="#1a1a1a" strokeWidth="0.6" />
      </g>
    );
  };

  // tatuagem de âncora no antebraço
  const tattoo = (p: typeof L) => {
    const cx = (p.el[0] + p.wr[0]) / 2;
    const cy = (p.el[1] + p.wr[1]) / 2;
    return (
      <g transform={`translate(${cx} ${cy - 2}) scale(0.9)`} stroke="#2a3a6a" strokeWidth="1.3" fill="none" opacity="0.7" strokeLinecap="round">
        <path d="M0 -8 V8 M-5 -4 H5 M-7 3 C-6 9 6 9 7 3" />
        <circle cx="0" cy="-10" r="2" />
      </g>
    );
  };

  // pelos do braço: tracinhos curtos ao longo do antebraço
  const hair = (p: typeof L) => (
    <g stroke={shade(skin, -0.5)} strokeWidth="0.6" opacity="0.45" strokeLinecap="round">
      {Array.from({ length: 14 }, (_, i) => {
        const tt = 0.15 + (i / 14) * 0.7;
        const x = p.el[0] + (p.wr[0] - p.el[0]) * tt + ((i * 37) % 9) - 4;
        const y = p.el[1] + (p.wr[1] - p.el[1]) * tt + ((i * 53) % 9) - 4;
        return <path key={i} d={`M${x} ${y} l2.4 -1.2`} />;
      })}
    </g>
  );

  const pivot = (p: typeof L) => ({ transformOrigin: `${p.sh[0]}px ${p.sh[1]}px` });

  const armSkin = (p: typeof L, side: 1 | -1) => (
    <g className={`seat-arm-${side === 1 ? 'left' : 'right'} ${folded ? 'open' : ''}`} style={pivot(p)}>
      <path d={skinArm(p)} fill={skin} />
      {!long && det('hairyArms') && hair(p)}
      {!long && det('tattoo') && side === -1 && tattoo(p)}
      {!long && (
        // músculo do antebraço e o osso do pulso
        <g fill="none" strokeLinecap="round">
          <path d={`M${p.el[0] - side * 4} ${p.el[1] + 6} C${(p.el[0] + p.wr[0]) / 2} ${(p.el[1] + p.wr[1]) / 2 - 8} ${p.wr[0] - side * 14} ${p.wr[1] - 10} ${p.wr[0] - side * 4} ${p.wr[1] - 6}`} stroke={shade(skin, 0.3)} strokeWidth="2.4" opacity="0.45" />
          <path d={`M${p.el[0] + side * 6} ${p.el[1] + 10} C${(p.el[0] + p.wr[0]) / 2 + side * 4} ${(p.el[1] + p.wr[1]) / 2 + 8} ${p.wr[0] - side * 10} ${p.wr[1] + 6} ${p.wr[0]} ${p.wr[1] + 8}`} stroke={shade(skin, -0.3)} strokeWidth="2" opacity="0.4" />
        </g>
      )}
    </g>
  );

  const armCloth = (p: typeof L, side: 1 | -1) =>
    sleeveTo > 0 ? (
      <g className={`seat-arm-${side === 1 ? 'left' : 'right'} ${folded ? 'open' : ''}`} style={pivot(p)}>
        <path d={sleeve(p)} fill={clothFill} />
        {style === 'tracksuit' && (
          <path d={limb(p.sh, p.el, p.wr, widths.map(() => 2), 0.96)} fill="#fff" transform={`translate(${side * 10} 0)`} opacity="0.85" />
        )}
        {elbowFolds(p, side)}
        {/* barra da manga curta / punho da comprida */}
        {!long && <path d={limb(p.sh, p.el, p.wr, widths.map((w) => w * 1.1), sleeveTo, sleeveHem)} fill="none" stroke={shade(o, -0.3)} strokeWidth="1.2" strokeDasharray="2.5 2" opacity="0.6" />}
        {long && style === 'suit' && <circle cx={p.wr[0] - (p.wr[0] - p.el[0]) * 0.06} cy={p.wr[1] - (p.wr[1] - p.el[1]) * 0.06} r={widths[4] * 1.1} fill="#f2f0ea" />}
        {style === 'jersey' && <path d={limb(p.sh, p.el, p.wr, widths.map((w) => w * 1.1), sleeveTo, sleeveHem)} fill="none" stroke="#fff" strokeWidth="2.4" opacity="0.8" />}
        {det('rolledSleeves') && (
          <path d={limb(p.sh, p.el, p.wr, widths.map((w) => w * 1.16), sleeveTo, 1.15)} fill="none" stroke={shade(o, -0.25)} strokeWidth="4" opacity="0.6" />
        )}
      </g>
    ) : null;

  const wristItems = (p: typeof L, side: 1 | -1) => (
    <g className={`seat-arm-${side === 1 ? 'left' : 'right'} ${folded ? 'open' : ''}`} style={pivot(p)}>
      {side === 1 && (det('watch') || det('goldWatch')) && wristWear(p, 'watch')}
      {side === -1 && det('bracelet') && wristWear(p, 'bracelet')}
    </g>
  );

  // base do pescoço, cortada pela borda da mesa
  const neckline = style === 'tank' || style === 'shoulder' ? null : <path d="M174 -2 C178 14 222 14 226 -2Z" fill={skin} />;

  return (
    <div className="opp-seat" aria-hidden>
      <svg viewBox="0 0 400 170" className="opp-seat-svg">
        <defs>
          {pattern === 'plaid' && (
            <pattern id={`pat-${uid}`} width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
              <rect width="18" height="18" fill={o} />
              <rect y="6" width="18" height="6" fill={shade(o, -0.4)} opacity="0.55" />
              <rect x="6" width="6" height="18" fill={shade(o, -0.4)} opacity="0.45" />
              <path d="M0 2.5 H18 M2.5 0 V18" stroke={acc === o ? '#f3efe6' : shade(acc, 0.3)} strokeWidth="0.8" opacity="0.6" />
              <path d="M0 15 H18 M15 0 V18" stroke="#1a1a1a" strokeWidth="0.6" opacity="0.4" />
            </pattern>
          )}
          {pattern === 'floral' && (
            <pattern id={`pat-${uid}`} width="22" height="20" patternUnits="userSpaceOnUse">
              <rect width="22" height="20" fill={o} />
              {[
                [5, 5, acc],
                [16, 14, '#f3efe6'],
              ].map(([cx, cy, c], i) => (
                <g key={i} transform={`translate(${cx} ${cy})`}>
                  {[0, 72, 144, 216, 288].map((r) => (
                    <ellipse key={r} cx="0" cy="-2.2" rx="1.4" ry="2.2" fill={c as string} opacity="0.85" transform={`rotate(${r})`} />
                  ))}
                  <circle r="1.1" fill="#e8c040" />
                </g>
              ))}
              <path d="M9 9 q2 2 4 1 M2 15 q1.5 -2 3.5 -1.6" stroke="#3e6a2a" strokeWidth="0.7" fill="none" opacity="0.7" />
            </pattern>
          )}
          {pattern === 'polka' && (
            <pattern id={`pat-${uid}`} width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="12" height="12" fill={o} />
              <circle cx="3" cy="3" r="1.8" fill="#fff" opacity="0.85" />
              <circle cx="9" cy="9" r="1.8" fill="#fff" opacity="0.85" />
            </pattern>
          )}
          {pattern === 'pinstripe' && (
            <pattern id={`pat-${uid}`} width="7" height="10" patternUnits="userSpaceOnUse">
              <rect width="7" height="10" fill={o} />
              <path d="M3.5 0 V10" stroke={shade(o, o === '#1b1b26' ? 0.35 : -0.25)} strokeWidth="0.6" opacity="0.8" />
            </pattern>
          )}
          <clipPath id={`torso-${uid}`}>
            <path d={torso} />
          </clipPath>
          {/* volume: relevo a partir da silhueta borrada, luz de cima à esquerda, brilho suave e
              um contorno escuro fino em volta do conjunto (sem emendas entre as partes) */}
          {(['cloth', 'skin'] as const).map((k) => (
            <filter key={k} id={`${k}-${uid}`} x="-10%" y="-25%" width="120%" height="160%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceAlpha" stdDeviation={k === 'cloth' ? 4 : 3} result="bump" />
              <feDiffuseLighting in="bump" surfaceScale={k === 'cloth' ? 2.6 : 2.4} diffuseConstant="1.12" lightingColor="#fff" result="diff">
                <feDistantLight azimuth="235" elevation="52" />
              </feDiffuseLighting>
              <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1" result="lit" />
              <feSpecularLighting in="bump" surfaceScale={k === 'cloth' ? 2.6 : 2.4} specularConstant={k === 'cloth' ? 0.1 : 0.22} specularExponent={k === 'cloth' ? 6 : 22} lightingColor="#fff4e0" result="spec">
                <feDistantLight azimuth="235" elevation="45" />
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
              <feComposite in="lit" in2="specIn" operator="arithmetic" k2="1" k3="1" result="glow" />
              {/* trama do tecido / poros da pele: ruído fino somado de leve */}
              <feTurbulence type="fractalNoise" baseFrequency={k === 'cloth' ? '1.4 0.9' : '2.2'} numOctaves="2" seed="5" result="noise" />
              <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="grain" />
              <feComposite in="glow" in2="grain" operator="arithmetic" k2="1" k3={k === 'cloth' ? 0.14 : 0.06} k4={k === 'cloth' ? -0.07 : -0.03} result="grained" />
              <feComposite in="grained" in2="SourceAlpha" operator="in" result="shine" />
              <feMorphology in="SourceAlpha" operator="dilate" radius="0.8" result="grow" />
              <feFlood floodColor="#1a0e06" floodOpacity="0.55" />
              <feComposite in2="grow" operator="in" result="edge" />
              <feMerge>
                <feMergeNode in="edge" />
                <feMergeNode in="shine" />
              </feMerge>
            </filter>
          ))}
          <filter id={`shadow-${uid}`} x="-10%" y="-20%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* sombra do corpo na madeira */}
        <g filter={`url(#shadow-${uid})`} opacity="0.55" transform="translate(4 9)">
          <path d={torso} fill="#000" />
          <path d={skinArm(L)} fill="#000" />
          <path d={skinArm(R)} fill="#000" />
        </g>

        <g className={`seat-root ${anim}`}>
          {/* pele dos braços e do pescoço (por baixo das mangas) */}
          <g filter={`url(#skin-${uid})`}>
            {neckline}
            {armSkin(L, 1)}
            {armSkin(R, -1)}
          </g>

          {/* tecido: tronco e mangas numa camada só */}
          <g filter={`url(#cloth-${uid})`}>
            <g className="seat-torso">
              <path d={torso} fill={style === 'tank' ? skin : clothFill} />
              {chest}
              {folds}
              {style !== 'suit' && style !== 'tank' && style !== 'robe' && (
                <path d={`M174 4 L${bx(70)} 12 M226 4 L${bx(330)} 12`} {...stitch} stroke={shade(o, -0.35)} />
              )}
              {/* rugas que irradiam das axilas, de quem está debruçado na mesa */}
              {style !== 'tank' && (
                <g fill="none" stroke={shade(o, -0.4)} strokeWidth="1.2" strokeLinecap="round" opacity="0.4">
                  {[0, 1, 2].map((i) => (
                    <g key={i}>
                      <path d={`M${bx(84)} ${30 + i * 8} q${10 + i * 4} ${4 + i} ${22 + i * 6} ${2 + i * 3}`} />
                      <path d={`M${bx(316)} ${30 + i * 8} q${-10 - i * 4} ${4 + i} ${-22 - i * 6} ${2 + i * 3}`} />
                    </g>
                  ))}
                </g>
              )}
              {CHEST_TEXT[id] && (
                <g transform={`translate(${bx(150)} 34) rotate(-3)`}>
                  {/^\d+$/.test(CHEST_TEXT[id]) ? (
                    <text x="0" y="8" fontSize="14" fontWeight="800" fill="#fff" stroke={shade(o, -0.4)} strokeWidth="0.6" fontFamily="'Yanone Kaffeesatz', sans-serif" textAnchor="middle">
                      {CHEST_TEXT[id]}
                    </text>
                  ) : (
                    <g>
                      <rect x="-20" y="-4" width="40" height="13" rx="3" fill={style === 'uniform' ? '#f3efe6' : shade(o, -0.15)} stroke={shade(o, -0.4)} strokeWidth="0.6" />
                      <rect x="-18.5" y="-2.5" width="37" height="10" rx="2" fill="none" stroke={style === 'uniform' ? acc : '#fff'} strokeWidth="0.6" strokeDasharray="1.4 1" />
                      <text x="0" y="5.4" fontSize="7.4" fontWeight="700" fill={style === 'uniform' ? shade(o, -0.4) : '#fff'} fontFamily="'Yanone Kaffeesatz', sans-serif" textAnchor="middle" letterSpacing="0.3">
                        {CHEST_TEXT[id]}
                      </text>
                    </g>
                  )}
                </g>
              )}
              {neckline && style !== 'suit' && style !== 'uniform' && <path d="M174 -2 C178 14 222 14 226 -2Z" fill={skin} />}
              {has('scarf') && <path d="M156 -2 C170 30 230 30 244 -2 L240 12 C228 40 172 40 160 12Z" fill={acc} />}
              {det('tape') && (
                <g>
                  <path d="M168 -2 C170 30 172 60 176 84" stroke="#f0d040" strokeWidth="5" fill="none" />
                  <path d="M232 -2 C230 30 228 60 224 84" stroke="#f0d040" strokeWidth="5" fill="none" />
                  {Array.from({ length: 16 }, (_, i) => (
                    <path key={i} d={`M${167 + i * 0.5} ${4 + i * 5} h3`} stroke="#3a2a0a" strokeWidth="0.6" />
                  ))}
                </g>
              )}
              {has('chain') && <path d="M166 2 C176 40 224 40 234 2" stroke="#e8c040" strokeWidth="2.6" strokeDasharray="2.6 1.6" fill="none" />}
              {has('pearls') &&
                [0, 1, 2].map((v) =>
                  Array.from({ length: 11 + v * 2 }, (_, i) => {
                    const tt = i / (10 + v * 2);
                    return (
                      <g key={`${v}-${i}`}>
                        <circle cx={164 - v * 5 + tt * (72 + v * 10)} cy={6 + v * 7 + Math.sin(tt * Math.PI) * (18 + v * 5)} r={2.8 - v * 0.2} fill="#ecedf2" />
                        <circle cx={163.2 - v * 5 + tt * (72 + v * 10)} cy={5 + v * 7 + Math.sin(tt * Math.PI) * (18 + v * 5)} r="0.9" fill="#fff" />
                      </g>
                    );
                  }),
                )}
              {(has('cross') || det('rosary')) && (
                <g>
                  {det('rosary') && <path d="M176 2 C182 40 218 40 224 2" stroke="#6a3a1a" strokeWidth="2.2" strokeDasharray="0.1 3.6" strokeLinecap="round" fill="none" />}
                  <path d="M200 34 V52 M193 40 H207" stroke={det('rosary') ? '#6a3a1a' : '#e8c040'} strokeWidth="3.4" strokeLinecap="round" />
                </g>
              )}
              {has('medal') && (
                <g>
                  <path d="M120 14 L126 34 L132 14Z" fill={acc} />
                  <circle cx="126" cy="38" r="6" fill="#e8c040" stroke="#a8862a" />
                  <circle cx="126" cy="38" r="3.5" fill="none" stroke="#a8862a" strokeWidth="0.6" />
                </g>
              )}
              {has('badge') && <path d="M268 26 L272 33 L280 33 L274 38 L276 46 L268 41 L260 46 L262 38 L256 33 L264 33Z" fill="#e8c040" stroke="#8a6a1a" strokeWidth="0.6" />}
              {det('pen') && (
                <g>
                  <rect x="152" y="22" width="3.4" height="20" rx="1.2" fill="#1f3a8a" />
                  <rect x="151.6" y="20" width="4.2" height="5" rx="1" fill="#c8c8d0" />
                  <rect x="157" y="24" width="3.2" height="17" rx="1.2" fill="#c8202b" />
                </g>
              )}
            </g>
            {armCloth(L, 1)}
            {armCloth(R, -1)}
          </g>

          {wristItems(L, 1)}
          {wristItems(R, -1)}
        </g>
      </svg>

      <div key={`c${gestureKey}`} className={`seat-cards ${anim} ${folded ? 'folded' : ''}`}>
        {fan.map(({ c, rot }) => {
          const peek = reveal || c.id === revealedId;
          return (
            <div key={c.id} className="seat-card" style={{ transform: `rotate(${rot}deg)` }}>
              <CardView card={peek ? c : null} back={!peek} peek={peek} manilha={manilha} small tip={peek} className="deal-in" />
            </div>
          );
        })}
      </div>

      <svg viewBox="0 0 400 170" className="opp-seat-svg opp-seat-front">
        <defs>
          <filter id={`hand-${uid}`} x="-20%" y="-30%" width="140%" height="160%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="bump" />
            <feDiffuseLighting in="bump" surfaceScale="2.2" diffuseConstant="1.12" lightingColor="#fff" result="diff">
              <feDistantLight azimuth="235" elevation="55" />
            </feDiffuseLighting>
            <feComposite in="SourceGraphic" in2="diff" operator="arithmetic" k1="1" result="lit" />
            <feSpecularLighting in="bump" surfaceScale="2.2" specularConstant="0.22" specularExponent="22" lightingColor="#fff4e0" result="spec">
              <feDistantLight azimuth="235" elevation="45" />
            </feSpecularLighting>
            <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
            <feComposite in="lit" in2="specIn" operator="arithmetic" k2="1" k3="1" result="shine" />
            <feMorphology in="SourceAlpha" operator="dilate" radius="0.6" result="grow" />
            <feFlood floodColor="#1a0e06" floodOpacity="0.5" />
            <feComposite in2="grow" operator="in" result="edge" />
            <feDropShadow dx="1.5" dy="3" stdDeviation="2" floodOpacity="0.35" in="SourceAlpha" result="drop" />
            <feMerge>
              <feMergeNode in="drop" />
              <feMergeNode in="edge" />
              <feMergeNode in="shine" />
            </feMerge>
          </filter>
        </defs>
        <g key={`f${gestureKey}`} className={`seat-root ${anim}`}>
          <g className={`seat-arm-left ${folded ? 'open' : ''}`} style={pivot(L)} filter={`url(#hand-${uid})`}>
            <Hand x={176} y={128} look={look} ringFinger />
          </g>
          <g className={`seat-arm-right ${folded ? 'open' : ''}`} style={pivot(R)}>
            <g className="seat-hand-right" filter={`url(#hand-${uid})`}>
              <Hand x={224} y={128} flip look={look} />
            </g>
          </g>
          {gesture === 'slam' && (
            <g className="seat-impact">
              <ellipse cx="200" cy="158" rx="60" ry="10" fill="none" stroke="#fff" strokeWidth="3" />
              <path d="M120 150 L104 142 M280 150 L296 142 M140 162 L124 168 M260 162 L276 168" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
