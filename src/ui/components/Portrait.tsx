// Retratos SVG anos 80 dos adversários: interior de boteco (garrafas, azulejo, neon) e um
// personagem montado por partes (cabelo, olhos, boca, roupa, acessórios).
// Cada id de data/opponents.ts e data/bosses.ts tem a sua composição em ART.

import { useId, type ReactNode } from 'react';

type Hair =
  | 'flat'
  | 'mullet'
  | 'afro'
  | 'mohawk'
  | 'bob'
  | 'bun'
  | 'bald'
  | 'spiky'
  | 'long'
  | 'perm'
  | 'side'
  | 'asa'
  | 'ponytail'
  | 'slick';
type Eyes = 'normal' | 'shades' | 'visor' | 'glasses' | 'closed' | 'wink' | 'angry' | 'worried';
type Mouth = 'smile' | 'grin' | 'flat' | 'smirk' | 'o' | 'frown' | 'teeth';
type Outfit = 'jacket' | 'suit' | 'tee' | 'shoulder' | 'tank' | 'uniform' | 'robe' | 'tracksuit' | 'jersey' | 'apron';
type Extra =
  | 'mustache'
  | 'bigMustache'
  | 'beard'
  | 'stubble'
  | 'headband'
  | 'bandana'
  | 'earring'
  | 'hoops'
  | 'hat'
  | 'tophat'
  | 'cap'
  | 'headphones'
  | 'cigar'
  | 'crown'
  | 'tiara'
  | 'scar'
  | 'freckles'
  | 'blush'
  | 'gum'
  | 'medal'
  | 'scarf'
  | 'beret'
  | 'pearls'
  | 'monocle'
  | 'pencil'
  | 'wrinkles'
  | 'lipstick'
  | 'chain'
  | 'badge'
  | 'pacifier'
  | 'cross'
  | 'strawHat'
  | 'toothpick';

export interface Art {
  /** Cores da luz ambiente (o segundo tom tinge a parede). */
  sky: [string, string];
  /** Cor do letreiro de neon (sun) e do reflexo dele na borda do balcão (grid). */
  sun: string;
  grid: string;
  skin: string;
  hair: string;
  hairStyle: Hair;
  eyes: Eyes;
  mouth: Mouth;
  outfit: string;
  outfitStyle: Outfit;
  accent: string;
  extras?: Extra[];
}

const SKIN = ['#f6d5b8', '#ebb98f', '#c98d5e', '#9a6340', '#6b4128'];

const NIGHT: [string, string] = ['#1a0638', '#ff3d7f'];
const DUSK: [string, string] = ['#0b0b3b', '#ff8c3a'];
const MINT: [string, string] = ['#04132b', '#3de0ff'];
const GRAPE: [string, string] = ['#12002a', '#b47aff'];
const ACID: [string, string] = ['#04140b', '#7dff6a'];
const GOLD: [string, string] = ['#1a0b00', '#ffd34d'];
const BLOOD: [string, string] = ['#1a0004', '#ff3b3b'];
const STEEL: [string, string] = ['#060a14', '#8aa0c8'];

export const ART: Record<string, Art> = {
  // ---------------------------------------------------------------- Pequeno / Grande
  tonhao: { sky: BLOOD, sun: '#ffd34d', grid: '#c8453a', skin: SKIN[2], hair: '#1b1010', hairStyle: 'flat', eyes: 'angry', mouth: 'smirk', outfit: '#f3f0e4', outfitStyle: 'apron', accent: '#c8453a', extras: ['bigMustache', 'toothpick'] },
  rosana: { sky: NIGHT, sun: '#ff9ad5', grid: '#e86a9a', skin: SKIN[1], hair: '#c8641e', hairStyle: 'perm', eyes: 'normal', mouth: 'grin', outfit: '#e86a9a', outfitStyle: 'tee', accent: '#ffffff', extras: ['hoops', 'lipstick'] },
  juninho: { sky: MINT, sun: '#ff8c3a', grid: '#4a9ad8', skin: SKIN[2], hair: '#3a1a0a', hairStyle: 'flat', eyes: 'worried', mouth: 'o', outfit: '#4a9ad8', outfitStyle: 'uniform', accent: '#ffd34d', extras: ['cap', 'freckles'] },
  neide: { sky: DUSK, sun: '#ffd34d', grid: '#ff8c3a', skin: SKIN[1], hair: '#c9c9d6', hairStyle: 'bun', eyes: 'glasses', mouth: 'smile', outfit: '#7a3d8f', outfitStyle: 'robe', accent: '#ffb547', extras: ['pearls', 'wrinkles', 'blush'] },
  marcao: { sky: GOLD, sun: '#ffd34d', grid: '#2e8a4a', skin: SKIN[3], hair: '#1a0a0a', hairStyle: 'flat', eyes: 'wink', mouth: 'grin', outfit: '#ffd34d', outfitStyle: 'jersey', accent: '#2e8a4a', extras: ['stubble', 'chain'] },
  cris: { sky: ACID, sun: '#ffd34d', grid: '#5ab84a', skin: SKIN[3], hair: '#2a1408', hairStyle: 'ponytail', eyes: 'normal', mouth: 'grin', outfit: '#5ab84a', outfitStyle: 'apron', accent: '#f3f0e4', extras: ['hoops', 'blush'] },
  arlindo: { sky: STEEL, sun: '#9ad7ff', grid: '#5ad1ff', skin: SKIN[0], hair: '#8a8a8a', hairStyle: 'bald', eyes: 'glasses', mouth: 'flat', outfit: '#5a4a3a', outfitStyle: 'suit', accent: '#9ad7ff', extras: ['mustache', 'pencil'] },
  katia: { sky: MINT, sun: '#5affc8', grid: '#3ab89a', skin: SKIN[4], hair: '#140c08', hairStyle: 'bob', eyes: 'glasses', mouth: 'flat', outfit: '#2a3a4a', outfitStyle: 'suit', accent: '#3ab89a', extras: ['earring'] },
  bene: { sky: GOLD, sun: '#ff8c3a', grid: '#ffd34d', skin: SKIN[3], hair: '#f0f0f0', hairStyle: 'flat', eyes: 'closed', mouth: 'smile', outfit: '#f3ead2', outfitStyle: 'tank', accent: '#ffd34d', extras: ['bigMustache', 'wrinkles'] },
  lu: { sky: DUSK, sun: '#ffd34d', grid: '#e07a3a', skin: SKIN[2], hair: '#3a1a0a', hairStyle: 'asa', eyes: 'normal', mouth: 'grin', outfit: '#f3f0e4', outfitStyle: 'jersey', accent: '#1b1b26', extras: ['blush'] },
  gringo: { sky: GOLD, sun: '#ffd34d', grid: '#d8a030', skin: SKIN[1], hair: '#3a2410', hairStyle: 'slick', eyes: 'shades', mouth: 'smirk', outfit: '#d8a030', outfitStyle: 'tee', accent: '#1b1b26', extras: ['mustache', 'toothpick'] },
  paty: { sky: GRAPE, sun: '#b84ab8', grid: '#b84ab8', skin: SKIN[3], hair: '#e0e0e0', hairStyle: 'long', eyes: 'closed', mouth: 'smile', outfit: '#f3f0e4', outfitStyle: 'robe', accent: '#b84ab8', extras: ['scarf', 'pearls', 'cross'] },
  zeca: { sky: GOLD, sun: '#ff5b5b', grid: '#c9a227', skin: SKIN[3], hair: '#2a1a0a', hairStyle: 'flat', eyes: 'normal', mouth: 'grin', outfit: '#3a5a8a', outfitStyle: 'uniform', accent: '#c9a227', extras: ['cap', 'stubble'] },
  telma: { sky: STEEL, sun: '#6fb2ff', grid: '#6fb2ff', skin: SKIN[2], hair: '#3a1a0a', hairStyle: 'perm', eyes: 'glasses', mouth: 'flat', outfit: '#6fb2ff', outfitStyle: 'shoulder', accent: '#ffffff', extras: ['headphones', 'pearls'] },
  betinho: { sky: ACID, sun: '#ffd34d', grid: '#8ad84a', skin: SKIN[0], hair: '#e8a040', hairStyle: 'spiky', eyes: 'worried', mouth: 'o', outfit: '#2e8a4a', outfitStyle: 'jersey', accent: '#ffd34d', extras: ['freckles', 'blush'] },

  tiao: { sky: GOLD, sun: '#ffb547', grid: '#ff8c3a', skin: SKIN[2], hair: '#e8e8e8', hairStyle: 'bald', eyes: 'glasses', mouth: 'smile', outfit: '#7d4e26', outfitStyle: 'jacket', accent: '#ffb547', extras: ['bigMustache', 'beret', 'wrinkles'] },

  // ---------------------------------------------------------------- chefes
  maoDeFerro: { sky: STEEL, sun: '#c0c8d8', grid: '#9aa4b1', skin: SKIN[1], hair: '#2a2a2a', hairStyle: 'flat', eyes: 'angry', mouth: 'frown', outfit: '#4a5a3a', outfitStyle: 'uniform', accent: '#ffd34d', extras: ['beret', 'medal', 'scar'] },
  caladao: { sky: DUSK, sun: '#ffd34d', grid: '#7d7d7d', skin: SKIN[2], hair: '#3a2a1a', hairStyle: 'bald', eyes: 'closed', mouth: 'flat', outfit: '#5a3a1a', outfitStyle: 'robe', accent: '#c9a227', extras: ['beard', 'cross'] },
  sorrateiro: { sky: GRAPE, sun: '#ff8c3a', grid: '#ff8c3a', skin: SKIN[2], hair: '#1a0a2a', hairStyle: 'long', eyes: 'wink', mouth: 'smirk', outfit: '#6a1a8a', outfitStyle: 'robe', accent: '#ffd34d', extras: ['scarf', 'hoops', 'lipstick'] },
  corredor: { sky: MINT, sun: '#ffb547', grid: '#5ad1ff', skin: SKIN[3], hair: '#1a0a0a', hairStyle: 'afro', eyes: 'worried', mouth: 'o', outfit: '#5ad1ff', outfitStyle: 'tracksuit', accent: '#ffffff', extras: ['headband'] },
  benzedeira: { sky: ACID, sun: '#ff5c7a', grid: '#6fe36f', skin: SKIN[3], hair: '#e0e0e0', hairStyle: 'bun', eyes: 'closed', mouth: 'smile', outfit: '#f3ead2', outfitStyle: 'robe', accent: '#ff5c7a', extras: ['scarf', 'wrinkles', 'cross'] },
  coronelBoss: { sky: GOLD, sun: '#ff8c3a', grid: '#c9a227', skin: SKIN[0], hair: '#d8d8d8', hairStyle: 'flat', eyes: 'angry', mouth: 'flat', outfit: '#f3ead2', outfitStyle: 'suit', accent: '#c9a227', extras: ['hat', 'bigMustache', 'cigar'] },
  agiota: { sky: ACID, sun: '#4caf50', grid: '#4caf50', skin: SKIN[1], hair: '#101010', hairStyle: 'slick', eyes: 'glasses', mouth: 'smirk', outfit: '#1b1b26', outfitStyle: 'suit', accent: '#4caf50', extras: ['mustache', 'chain'] },
  cego: { sky: GOLD, sun: '#ff8c3a', grid: '#5b6a80', skin: SKIN[4], hair: '#101010', hairStyle: 'flat', eyes: 'shades', mouth: 'smile', outfit: '#7a3a1a', outfitStyle: 'jacket', accent: '#e0c078', extras: ['beard', 'strawHat'] },
  peFrio: { sky: MINT, sun: '#ffffff', grid: '#9ad7ff', skin: SKIN[0], hair: '#9a6a3a', hairStyle: 'flat', eyes: 'worried', mouth: 'frown', outfit: '#f3f0e4', outfitStyle: 'apron', accent: '#ff9ad5', extras: ['cap', 'blush'] },
  delegado: { sky: NIGHT, sun: '#3a6ea5', grid: '#3a6ea5', skin: SKIN[2], hair: '#1a1a1a', hairStyle: 'flat', eyes: 'shades', mouth: 'frown', outfit: '#1f3a6a', outfitStyle: 'uniform', accent: '#ffd34d', extras: ['cap', 'mustache', 'badge'] },
  sogra: { sky: GRAPE, sun: '#ffd34d', grid: '#b46ad1', skin: SKIN[1], hair: '#b46ad1', hairStyle: 'perm', eyes: 'angry', mouth: 'frown', outfit: '#b46ad1', outfitStyle: 'robe', accent: '#ffd34d', extras: ['pearls', 'wrinkles', 'lipstick'] },
  valentao: { sky: BLOOD, sun: '#ffd34d', grid: '#e84a3a', skin: SKIN[3], hair: '#1a0a0a', hairStyle: 'bald', eyes: 'shades', mouth: 'flat', outfit: '#1b1b26', outfitStyle: 'suit', accent: '#e84a3a', extras: ['chain', 'stubble'] },
  ladyLaser: { sky: NIGHT, sun: '#ffd34d', grid: '#ff3df2', skin: SKIN[1], hair: '#f0e0c0', hairStyle: 'perm', eyes: 'glasses', mouth: 'smirk', outfit: '#7a1a4a', outfitStyle: 'shoulder', accent: '#ffd34d', extras: ['pearls', 'hoops', 'lipstick'] },
  ninaK7: { sky: STEEL, sun: '#9aa4b1', grid: '#5b6a80', skin: SKIN[3], hair: '#1a1a1a', hairStyle: 'bun', eyes: 'closed', mouth: 'flat', outfit: '#1b1b26', outfitStyle: 'robe', accent: '#9aa4b1', extras: ['cross', 'wrinkles'] },
  maxCromado: { sky: ACID, sun: '#ff8c3a', grid: '#6a8a3a', skin: SKIN[2], hair: '#5a3a1a', hairStyle: 'flat', eyes: 'angry', mouth: 'flat', outfit: '#8a2a1a', outfitStyle: 'jacket', accent: '#1b1b26', extras: ['beard', 'strawHat'] },
  drPixel: { sky: MINT, sun: '#7dff6a', grid: '#7dff6a', skin: SKIN[0], hair: '#a8a8a8', hairStyle: 'side', eyes: 'glasses', mouth: 'smile', outfit: '#f3f3f3', outfitStyle: 'suit', accent: '#3a6ea5', extras: ['mustache', 'pencil'] },
  djVinil: { sky: DUSK, sun: '#ffd34d', grid: '#2e8a4a', skin: SKIN[4], hair: '#140c08', hairStyle: 'afro', eyes: 'closed', mouth: 'grin', outfit: '#f3f0e4', outfitStyle: 'jersey', accent: '#2e8a4a', extras: ['chain'] },
  rambinho: { sky: ACID, sun: '#ff5b5b', grid: '#8bbf3a', skin: SKIN[2], hair: '#1a0a0a', hairStyle: 'flat', eyes: 'angry', mouth: 'flat', outfit: '#4a5a2a', outfitStyle: 'uniform', accent: '#ffd34d', extras: ['beret', 'mustache'] },
  capitaoFax: { sky: STEEL, sun: '#e8e2c8', grid: '#e8e2c8', skin: SKIN[0], hair: '#f0f0f0', hairStyle: 'slick', eyes: 'glasses', mouth: 'flat', outfit: '#1f3a6a', outfitStyle: 'uniform', accent: '#e8e2c8', extras: ['cap', 'beard', 'medal'] },
  babyBoom: { sky: NIGHT, sun: '#ffc4e1', grid: '#ffc4e1', skin: SKIN[1], hair: '#f5f5f5', hairStyle: 'perm', eyes: 'glasses', mouth: 'smirk', outfit: '#ffc4e1', outfitStyle: 'robe', accent: '#b46ad1', extras: ['pearls', 'wrinkles', 'lipstick'] },
  imperador: { sky: GOLD, sun: '#ffd34d', grid: '#ff2bd6', skin: SKIN[1], hair: '#1a0a0a', hairStyle: 'slick', eyes: 'shades', mouth: 'smirk', outfit: '#1b1b26', outfitStyle: 'suit', accent: '#ffd34d', extras: ['chain', 'stubble'] },
  rainhaNeon: { sky: GOLD, sun: '#ffd34d', grid: '#2e8a4a', skin: SKIN[3], hair: '#1a0a0a', hairStyle: 'perm', eyes: 'normal', mouth: 'grin', outfit: '#2e8a4a', outfitStyle: 'shoulder', accent: '#ffd34d', extras: ['tiara', 'hoops', 'lipstick'] },
  baraoVectra: { sky: GOLD, sun: '#ff8c3a', grid: '#ffd34d', skin: SKIN[0], hair: '#e8e8e8', hairStyle: 'flat', eyes: 'normal', mouth: 'smirk', outfit: '#f3ead2', outfitStyle: 'suit', accent: '#6a3a1a', extras: ['hat', 'monocle', 'bigMustache', 'cigar'] },
};

const FALLBACK: Art = ART.bene;

// ---------------------------------------------------------------- partes

/** Lado esquerdo + espelho (o personagem é simétrico na maioria das partes). */
function Sym({ d, fill, stroke, sw }: { d: string; fill?: string; stroke?: string; sw?: number }) {
  return (
    <>
      <path d={d} fill={fill ?? 'none'} stroke={stroke} strokeWidth={sw} />
      <path d={d} fill={fill ?? 'none'} stroke={stroke} strokeWidth={sw} transform="translate(100 0) scale(-1 1)" />
    </>
  );
}

function HairBack({ a }: { a: Art }) {
  const c = a.hair;
  switch (a.hairStyle) {
    case 'mullet':
      return <Sym d="M33 46 C30 62 31 76 25 86 L41 83 C37 72 36 60 36 50Z" fill={c} />;
    case 'afro':
      return <circle cx="50" cy="44" r="27" fill={c} />;
    case 'bob':
      return <path d="M29 50 C27 30 40 25 50 25 C60 25 73 30 71 50 L72 68 L62 68 L62 46 L38 46 L38 68 L28 68Z" fill={c} />;
    case 'long':
      return <Sym d="M32 44 C27 66 27 82 29 94 L45 90 L39 50Z" fill={c} />;
    case 'asa':
      return <Sym d="M33 44 C24 56 20 70 15 78 L33 74 C33 64 35 54 37 48Z" fill={c} />;
    case 'perm':
      return (
        <g fill={c}>
          {[
            [30, 50, 11],
            [70, 50, 11],
            [33, 34, 12],
            [67, 34, 12],
            [50, 25, 14],
            [27, 66, 9],
            [73, 66, 9],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case 'ponytail':
      return <path d="M64 36 C82 38 86 60 78 80 C76 64 72 52 62 44Z" fill={c} />;
    case 'bun':
      return <circle cx="50" cy="25" r="9" fill={c} />;
    default:
      return null;
  }
}

function HairFront({ a }: { a: Art }) {
  const c = a.hair;
  const cap = 'M32 50 C31 32 42 28 50 28 C58 28 69 32 68 50 C66 42 60 38 50 38 C40 38 34 42 32 50Z';
  switch (a.hairStyle) {
    case 'bald':
      return <ellipse cx="44" cy="37" rx="5" ry="2.4" fill="#fff" opacity="0.35" />;
    case 'mohawk':
      return <path d="M44 38 L45 14 L50 22 L52 10 L56 38Z" fill={c} />;
    case 'spiky':
      return <path d="M32 48 L28 33 L37 37 L36 22 L44 31 L50 17 L55 31 L63 22 L63 37 L72 33 L68 48 C64 40 58 38 50 38 C42 38 36 40 32 48Z" fill={c} />;
    case 'side':
      return <path d="M32 50 C29 30 44 22 57 25 C68 28 71 38 68 50 C64 40 56 35 44 40 C38 42 34 46 32 50Z" fill={c} />;
    case 'slick':
      return <path d="M32 48 C31 32 42 27 50 27 C60 27 69 32 68 48 C66 38 58 34 48 35 C40 36 35 40 32 48Z" fill={c} />;
    case 'afro':
      return <path d="M31 46 C31 30 42 26 50 26 C58 26 69 30 69 46 C64 38 58 36 50 36 C42 36 36 38 31 46Z" fill={c} />;
    case 'bob':
      return <path d="M33 47 C33 32 44 29 50 29 C56 29 67 32 67 47 L33 47Z" fill={c} />;
    case 'perm':
      return (
        <g fill={c}>
          <circle cx="39" cy="38" r="7" />
          <circle cx="50" cy="35" r="7" />
          <circle cx="61" cy="38" r="7" />
        </g>
      );
    case 'asa':
      return <path d="M32 50 C30 32 42 26 50 26 C58 26 70 32 68 50 C64 42 58 38 54 40 L50 34 L46 40 C42 38 36 42 32 50Z" fill={c} />;
    default:
      return <path d={cap} fill={c} />;
  }
}

function Eyes({ a }: { a: Art }) {
  const dark = '#1b1208';
  const brows = (tilt: number) => (
    <Sym d={`M38 ${45 - tilt} L47 ${45 + tilt}`} stroke={a.hairStyle === 'bald' ? '#5a4030' : a.hair} sw={2.2} />
  );
  const pupils = (
    <>
      <circle cx="43" cy="52" r="2.4" fill={dark} />
      <circle cx="57" cy="52" r="2.4" fill={dark} />
      <circle cx="43.8" cy="51.2" r="0.8" fill="#fff" />
      <circle cx="57.8" cy="51.2" r="0.8" fill="#fff" />
    </>
  );
  switch (a.eyes) {
    case 'shades':
      return (
        <g>
          <path d="M33 47 H67 V50 C67 56 63 58 59 58 C55 58 53 55 52 52 H48 C47 55 45 58 41 58 C37 58 33 56 33 50Z" fill="#0b0b14" />
          <path d="M36 50 L44 50 M56 50 L64 50" stroke={a.accent} strokeWidth="1.2" opacity="0.9" />
        </g>
      );
    case 'visor':
      return (
        <g>
          <rect x="32" y="46" width="36" height="9" rx="4.5" fill={a.accent} opacity="0.85" />
          <rect x="34" y="48" width="32" height="1.6" fill="#fff" opacity="0.7" />
        </g>
      );
    case 'glasses':
      return (
        <g>
          {brows(0)}
          {pupils}
          <circle cx="43" cy="52" r="5.5" fill="none" stroke={dark} strokeWidth="1.6" />
          <circle cx="57" cy="52" r="5.5" fill="none" stroke={dark} strokeWidth="1.6" />
          <path d="M48.5 52 H51.5" stroke={dark} strokeWidth="1.6" />
        </g>
      );
    case 'closed':
      return (
        <g>
          {brows(0)}
          <Sym d="M40 53 Q43 55 46 53" stroke={dark} sw={1.8} />
        </g>
      );
    case 'wink':
      return (
        <g>
          {brows(0)}
          <circle cx="43" cy="52" r="2.4" fill={dark} />
          <circle cx="43.8" cy="51.2" r="0.8" fill="#fff" />
          <path d="M54 52 Q57 50 60 52" stroke={dark} strokeWidth="1.8" fill="none" />
        </g>
      );
    case 'angry':
      return (
        <g>
          {brows(-2)}
          {pupils}
        </g>
      );
    case 'worried':
      return (
        <g>
          {brows(2)}
          {pupils}
        </g>
      );
    default:
      return (
        <g>
          {brows(0)}
          {pupils}
        </g>
      );
  }
}

function Mouth({ a }: { a: Art }) {
  const dark = '#3a1408';
  const lip = a.extras?.includes('lipstick') ? '#e8204a' : dark;
  switch (a.mouth) {
    case 'grin':
      return <path d="M43 61 Q50 70 57 61Z" fill="#fff" stroke={lip} strokeWidth="1.6" strokeLinejoin="round" />;
    case 'teeth':
      return (
        <g>
          <rect x="43" y="60" width="14" height="5" rx="2" fill="#fff" stroke={lip} strokeWidth="1.4" />
          <path d="M46.5 60 V65 M50 60 V65 M53.5 60 V65" stroke="#bbb" strokeWidth="0.6" />
        </g>
      );
    case 'flat':
      return <path d="M45 63 H55" stroke={lip} strokeWidth="1.8" strokeLinecap="round" />;
    case 'smirk':
      return <path d="M45 63 Q52 65 56 60" stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    case 'o':
      return <ellipse cx="50" cy="63" rx="2.6" ry="3.2" fill={dark} />;
    case 'frown':
      return <path d="M44 65 Q50 60 56 65" stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
    default:
      return <path d="M44 61 Q50 67 56 61" stroke={lip} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  }
}

function Body({ a }: { a: Art }) {
  const base = 'M10 100 C12 88 24 82 36 80 L64 80 C76 82 88 88 90 100Z';
  const o = a.outfit;
  const acc = a.accent;
  switch (a.outfitStyle) {
    case 'suit':
      return (
        <g>
          <path d={base} fill={o} />
          <path d="M41 80 L50 95 L59 80Z" fill="#f3f3f3" />
          <path d="M49 83 H51 L53.5 95 L50 100 L46.5 95Z" fill={acc} />
          <path d="M36 80 L46 100 M64 80 L54 100" stroke="#000" strokeOpacity="0.35" strokeWidth="1.5" />
        </g>
      );
    case 'tee':
      return (
        <g>
          <path d={base} fill={o} />
          <path d="M40 80 Q50 88 60 80" stroke={acc} strokeWidth="2.5" fill="none" />
          <path d="M16 93 H84" stroke={acc} strokeWidth="3" opacity="0.7" />
        </g>
      );
    case 'shoulder':
      return (
        <g>
          <path d="M3 100 C3 83 18 77 36 78 L64 78 C82 77 97 83 97 100Z" fill={o} />
          <path d="M6 88 L30 82 M94 88 L70 82" stroke={acc} strokeWidth="2.5" />
          <path d="M42 79 L50 90 L58 79" fill={a.skin} />
        </g>
      );
    case 'tank':
      return (
        <g>
          <path d={base} fill={a.skin} />
          <path d="M33 100 L35 82 L42 82 Q50 92 58 82 L65 82 L67 100Z" fill={o} />
          <path d="M33 92 H67" stroke={acc} strokeWidth="2" opacity="0.8" />
        </g>
      );
    case 'uniform':
      return (
        <g>
          <path d={base} fill={o} />
          <path d="M18 86 L34 82 M82 86 L66 82" stroke={acc} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M42 80 L50 88 L58 80" fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="1.5" />
          {[90, 95].map((y) => (
            <circle key={y} cx="50" cy={y} r="1.3" fill={acc} />
          ))}
        </g>
      );
    case 'robe':
      return (
        <g>
          <path d="M8 100 C10 86 24 80 38 79 L62 79 C76 80 90 86 92 100Z" fill={o} />
          <path d="M38 79 Q50 96 62 79" fill="none" stroke={acc} strokeWidth="2.5" />
        </g>
      );
    case 'tracksuit':
      return (
        <g>
          <path d={base} fill={o} />
          <path d="M24 84 L20 100 M76 84 L80 100" stroke="#fff" strokeWidth="2.5" />
          <path d="M28 84 L25 100 M72 84 L75 100" stroke={acc} strokeWidth="2.5" />
          <path d="M50 82 V100" stroke="#000" strokeOpacity="0.35" strokeWidth="1.5" />
          <path d="M42 79 L50 84 L58 79" fill="#fff" />
        </g>
      );
    case 'jersey':
      // camisa de time de várzea: listras verticais, gola e número
      return (
        <g>
          <path d={base} fill={o} />
          <path d="M26 83 V100 M38 80 V100 M62 80 V100 M74 83 V100" stroke={acc} strokeWidth="5" />
          <path d="M41 79 L50 87 L59 79" fill="none" stroke="#fff" strokeWidth="2.2" />
          <text x="50" y="98" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="sans-serif">
            10
          </text>
        </g>
      );
    case 'apron':
      // avental de açougue ou de feira por cima da camiseta
      return (
        <g>
          <path d={base} fill={o} />
          <path d="M34 100 L36 86 Q50 90 64 86 L66 100Z" fill={acc} />
          <path d="M36 86 L40 79 M64 86 L60 79" stroke={acc} strokeWidth="1.8" />
          <rect x="45" y="92" width="10" height="5" rx="1" fill="#000" opacity="0.15" />
        </g>
      );
    default:
      return (
        <g>
          <path d={base} fill={o} />
          <path d="M36 80 L50 100 L64 80" fill="#1b1b26" opacity="0.55" />
          <path d="M36 80 L44 88 L40 80Z M64 80 L56 88 L60 80Z" fill={acc} />
        </g>
      );
  }
}

function Extras({ a, front }: { a: Art; front: boolean }) {
  const ex = a.extras ?? [];
  const acc = a.accent;
  const out: ReactNode[] = [];
  const has = (e: Extra) => ex.includes(e);
  if (!front) {
    if (has('headphones')) out.push(<path key="hpb" d="M31 52 C29 24 71 24 69 52" stroke="#222" strokeWidth="3.5" fill="none" />);
    return <>{out}</>;
  }
  if (has('wrinkles')) out.push(<Sym key="wr" d="M36 57 Q38 59 37 61" stroke="#000" sw={0.7} />);
  if (has('freckles'))
    out.push(
      <g key="fr" fill="#a0522d" opacity="0.6">
        {[
          [39, 58],
          [42, 59],
          [40, 61],
          [58, 59],
          [61, 58],
          [60, 61],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="0.8" />
        ))}
      </g>,
    );
  if (has('blush')) out.push(<Sym key="bl" d="M36 59 a4 2.4 0 1 0 8 0 a4 2.4 0 1 0 -8 0" fill="#ff6b8a" />);
  if (has('stubble')) out.push(<path key="st" d="M36 60 C38 72 44 75 50 75 C56 75 62 72 64 60 C60 68 56 69 50 69 C44 69 40 68 36 60Z" fill="#000" opacity="0.18" />);
  if (has('beard')) out.push(<path key="be" d="M33 56 C34 72 42 78 50 78 C58 78 66 72 67 56 C64 66 58 67 50 66 C42 67 36 66 33 56Z" fill={a.hair} />);
  if (has('mustache')) out.push(<path key="mu" d="M43 59.5 Q47 57 50 59 Q53 57 57 59.5 Q54 61.5 50 60.5 Q46 61.5 43 59.5Z" fill={a.hair} />);
  if (has('bigMustache')) out.push(<path key="bm" d="M38 62 Q42 56 50 58.5 Q58 56 62 62 Q57 60.5 54 61 Q50 62 46 61 Q43 60.5 38 62Z" fill={a.hair} />);
  if (has('scar')) out.push(<path key="sc" d="M58 44 L62 58 M58.5 48 L61.5 47 M59.5 52 L62.5 51" stroke="#9a3a2a" strokeWidth="1" />);
  if (has('earring')) out.push(<circle key="er" cx="33" cy="60" r="1.8" fill="#ffd34d" />);
  if (has('hoops')) out.push(<Sym key="ho" d="M29.8 61 a3.2 3.2 0 1 0 6.4 0 a3.2 3.2 0 1 0 -6.4 0" stroke="#ffd34d" sw={1.4} />);
  if (has('gum')) out.push(<circle key="gu" cx="55" cy="64" r="5.5" fill="#ff8ad0" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" />);
  if (has('pacifier'))
    out.push(
      <g key="pa">
        <ellipse cx="50" cy="64" rx="7" ry="3.5" fill={acc} />
        <circle cx="50" cy="64" r="2" fill="#fff" />
      </g>,
    );
  if (has('toothpick')) out.push(<path key="tp" d="M54 63 L64 60" stroke="#e8d0a0" strokeWidth="1" strokeLinecap="round" />);
  if (has('strawHat'))
    out.push(
      <g key="sh">
        <ellipse cx="50" cy="35" rx="29" ry="5" fill="#e0c078" />
        <path d="M36 35 C36 22 41 17 50 17 C59 17 64 22 64 35Z" fill="#e0c078" />
        <path d="M24 35 H76 M38 26 H62 M37 30 H63" stroke="#a8884a" strokeWidth="0.6" />
        <rect x="36" y="30" width="28" height="3" fill={acc} />
      </g>,
    );
  if (has('cigar'))
    out.push(
      <g key="ci">
        <rect x="55" y="62" width="11" height="2.6" rx="1" fill="#6b3a1a" transform="rotate(10 55 62)" />
        <circle cx="66.5" cy="65" r="1.4" fill="#ff5b1a" />
      </g>,
    );
  if (has('pencil')) out.push(<rect key="pe" x="64" y="40" width="2.4" height="16" rx="0.8" fill="#ffd34d" transform="rotate(25 65 48)" />);
  if (has('monocle'))
    out.push(
      <g key="mo">
        <circle cx="57" cy="52" r="5.5" fill="#fff" fillOpacity="0.15" stroke="#ffd34d" strokeWidth="1.4" />
        <path d="M62 54 Q66 66 62 78" stroke="#ffd34d" strokeWidth="0.7" fill="none" />
      </g>,
    );
  if (has('headband'))
    out.push(
      <g key="hb">
        <rect x="31" y="38" width="38" height="5" fill={acc} />
        <rect x="31" y="39.5" width="38" height="1.2" fill="#fff" opacity="0.6" />
      </g>,
    );
  if (has('bandana'))
    out.push(
      <g key="bd" fill={acc}>
        <rect x="31" y="37" width="38" height="5" />
        <path d="M68 39 L80 34 L78 41Z M68 40 L81 44 L76 47Z" />
      </g>,
    );
  if (has('scarf')) out.push(<path key="sf" d="M29 56 C26 28 40 22 50 22 C60 22 74 28 71 56 C68 40 60 35 50 35 C40 35 32 40 29 56Z" fill={acc} />);
  if (has('headphones'))
    out.push(
      <g key="hp" fill="#222">
        <rect x="28" y="47" width="6" height="11" rx="2.5" />
        <rect x="66" y="47" width="6" height="11" rx="2.5" />
        <rect x="29" y="49" width="2" height="7" rx="1" fill={acc} />
        <rect x="69" y="49" width="2" height="7" rx="1" fill={acc} />
      </g>,
    );
  if (has('cap'))
    out.push(
      <g key="cp" fill={acc}>
        <path d="M32 42 C32 24 68 24 68 42Z" />
        <path d="M32 41 L68 41 L76 45 L30 45Z" opacity="0.85" />
      </g>,
    );
  if (has('beret')) out.push(<ellipse key="br" cx="46" cy="32" rx="20" ry="6" fill={acc} transform="rotate(-12 46 32)" />);
  if (has('hat'))
    out.push(
      <g key="ht">
        <ellipse cx="50" cy="34" rx="28" ry="4.5" fill="#f3ead2" />
        <path d="M37 34 C37 20 42 15 50 15 C58 15 63 20 63 34Z" fill="#f3ead2" />
        <rect x="37" y="29" width="26" height="3" fill={acc} />
      </g>,
    );
  if (has('tophat'))
    out.push(
      <g key="th">
        <ellipse cx="50" cy="33" rx="22" ry="3.5" fill="#111" />
        <rect x="38" y="8" width="24" height="25" fill="#111" />
        <rect x="38" y="27" width="24" height="3" fill={acc} />
      </g>,
    );
  if (has('crown')) out.push(<path key="cr" d="M35 34 L35 20 L42 27 L50 15 L58 27 L65 20 L65 34Z" fill="#ffd34d" stroke="#b8860b" strokeWidth="1" />);
  if (has('tiara'))
    out.push(
      <g key="ti">
        <path d="M37 34 L42 28 L46 32 L50 24 L54 32 L58 28 L63 34" fill="none" stroke="#e8f4ff" strokeWidth="1.8" />
        <circle cx="50" cy="25" r="1.8" fill={acc} />
      </g>,
    );
  if (has('chain')) out.push(<path key="ch" d="M38 80 Q50 92 62 80" stroke="#ffd34d" strokeWidth="1.8" strokeDasharray="1.6 1.2" fill="none" />);
  if (has('pearls'))
    out.push(
      <g key="pr" fill="#fff">
        {[38, 42, 46, 50, 54, 58, 62].map((x, i) => (
          <circle key={x} cx={x} cy={81 + Math.sin((i / 6) * Math.PI) * 5} r="1.4" />
        ))}
      </g>,
    );
  if (has('medal'))
    out.push(
      <g key="md">
        <path d="M28 84 L31 92 L34 84Z" fill={acc} />
        <circle cx="31" cy="94" r="3" fill="#ffd34d" />
      </g>,
    );
  if (has('badge')) out.push(<path key="bg" d="M66 86 L68 89 L72 89 L69 91.5 L70 95 L66 93 L62 95 L63 91.5 L60 89 L64 89Z" fill="#ffd34d" />);
  if (has('cross')) out.push(<path key="cx" d="M50 84 V96 M46 88 H54" stroke="#ffd34d" strokeWidth="2" />);
  return <>{out}</>;
}

// ---------------------------------------------------------------- componente

export interface PortraitProps {
  id: string;
  size?: number;
  /** Moldura dourada de chefe. */
  boss?: boolean;
  className?: string;
  title?: string;
}

/** Garrafas da prateleira do fundo: x, altura, cor. */
const BOTTLES: [number, number, string][] = [
  [5, 13, '#3f8a4a'],
  [11, 10, '#c87a28'],
  [17, 14, '#d8e0e8'],
  [23, 11, '#7a2a1a'],
  [77, 12, '#c87a28'],
  [83, 14, '#3f8a4a'],
  [89, 10, '#d8e0e8'],
  [95, 13, '#5a1a6a'],
];

/** Formato do letreiro de neon atrás do personagem (varia por id). */
function NeonSign({ id, color }: { id: string; color: string }) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const common = { fill: 'none', stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shapes = [
    <circle key="c" cx="50" cy="46" r="27" {...common} />,
    <rect key="r" x="22" y="22" width="56" height="44" rx="10" {...common} />,
    <path key="h" d="M50 72 C20 52 22 26 38 24 C45 23 49 28 50 32 C51 28 55 23 62 24 C78 26 80 52 50 72Z" {...common} />,
    <path key="s" d="M50 16 L58 38 L82 38 L63 52 L70 75 L50 61 L30 75 L37 52 L18 38 L42 38Z" {...common} />,
    <path key="d" d="M50 16 L80 46 L50 76 L20 46Z" {...common} />,
  ];
  const shape = shapes[h % shapes.length];
  return (
    <g opacity="0.45">
      <g strokeWidth="5" opacity="0.25" style={{ filter: 'blur(2.5px)' }}>
        {shape}
      </g>
      <g strokeWidth="1.6">{shape}</g>
    </g>
  );
}

export function Portrait({ id, size = 96, boss, className, title }: PortraitProps) {
  const uid = useId().replace(/:/g, '');
  const a = ART[id] ?? FALLBACK;
  const wall = `wall${uid}`;
  const lamp = `lamp${uid}`;
  const clip = `clip${uid}`;
  return (
    <svg
      className={`portrait ${boss ? 'portrait-boss' : ''} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      style={{ ['--pc' as string]: a.accent }}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={wall} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a160c" />
          <stop offset="1" stopColor="#6b2a18" />
        </linearGradient>
        <radialGradient id={lamp} cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#ffd890" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffd890" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clip}>
          <rect width="100" height="100" rx="6" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {/* parede do bar, tingida pela luz do neon */}
        <rect width="100" height="100" fill={`url(#${wall})`} />
        <rect width="100" height="100" fill={a.sky[1]} opacity="0.16" />
        {/* prateleira com garrafas */}
        {BOTTLES.map(([x, hgt, c]) => (
          <g key={x} opacity="0.85">
            <rect x={x - 2.5} y={30 - hgt} width="5" height={hgt} rx="1.5" fill={c} />
            <rect x={x - 1} y={30 - hgt - 4} width="2" height="5" fill={c} />
            <rect x={x - 1.6} y={30 - hgt + 3} width="1" height={hgt - 5} fill="#fff" opacity="0.3" />
          </g>
        ))}
        <rect x="0" y="30" width="100" height="3" fill="#8a5a2e" />
        <rect x="0" y="33" width="100" height="1.5" fill="#000" opacity="0.35" />
        {/* letreiro de neon */}
        <NeonSign id={id} color={a.sun} />
        {/* azulejo verde e branco */}
        <rect x="0" y="60" width="100" height="16" fill="#e9e4cf" />
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} x={i * 8} y={i % 2 ? 60 : 68} width="8" height="8" fill="#2e7a5a" />
        ))}
        <rect x="0" y="60" width="100" height="16" fill="#000" opacity="0.4" />
        <rect x="0" y="58.5" width="100" height="2" fill="#6b3f1c" />
        {/* luz da lâmpada */}
        <rect width="100" height="100" fill={`url(#${lamp})`} />

        {/* personagem */}
        <g className="portrait-figure">
          <Extras a={a} front={false} />
          <HairBack a={a} />
          <Body a={a} />
          <rect x="43" y="68" width="14" height="14" fill={a.skin} />
          <rect x="43" y="68" width="14" height="5" fill="#000" opacity="0.15" />
          <ellipse cx="33" cy="54" rx="3" ry="4.5" fill={a.skin} />
          <ellipse cx="67" cy="54" rx="3" ry="4.5" fill={a.skin} />
          <ellipse cx="50" cy="52" rx="17" ry="20" fill={a.skin} />
          <path d="M60 36 C68 44 68 62 58 70 C64 60 64 46 60 36Z" fill="#000" opacity="0.12" />
          <HairFront a={a} />
          <Eyes a={a} />
          <path d="M50 53 L47.5 59 L51 59.5" stroke="#000" strokeOpacity="0.3" strokeWidth="1.2" fill="none" strokeLinejoin="round" />
          <Mouth a={a} />
          <Extras a={a} front />
          {/* reflexo do neon no rosto */}
          <path d="M33 46 C33 64 40 72 50 72" stroke={a.sun} strokeWidth="0.9" fill="none" opacity="0.55" />
        </g>
        {/* balcão de madeira em primeiro plano, com a 600 e o copo americano */}
        <rect x="0" y="92" width="100" height="8" fill="#6e3a16" />
        <rect x="0" y="91" width="100" height="1.6" fill="#b8844a" />
        <rect x="0" y="91" width="100" height="0.8" fill={a.grid} opacity="0.6" />
        <path d="M8 92 V74 Q8 69 11 67 V60 H14 V67 Q17 69 17 74 V92Z" fill="#5a3a12" />
        <rect x="8.5" y="78" width="8" height="7" fill="#e8d8b0" />
        <rect x="10.5" y="58.5" width="4" height="2" fill="#c8a868" />
        <path d="M80 80 L90 80 L89 92 L81 92Z" fill="#ffc21a" opacity="0.9" />
        <path d="M80 80 L90 80 L89.6 83 L80.4 83Z" fill="#fff8e0" />
        <path d="M80 80 L90 80 L89 92 L81 92Z M82 83 L82.6 91" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.6" />
      </g>
    </svg>
  );
}
