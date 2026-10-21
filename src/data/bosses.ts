// Chefes: cada um muda uma regra do Blind. A arte fica em ui/components/Portrait.tsx (mesmo id).
// Os chefes `finale` só aparecem no Ante 8 (e a cada 8 Antes no modo infinito).

import type { PersonalityId } from '../ai/opponent';
import type { BlindRules, RunState } from '../engine/state';

export interface BossDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  personality: PersonalityId;
  minAnte: number;
  targetMult?: number;
  /** Chefe final de Ante 8. */
  finale?: boolean;
  apply: (rules: BlindRules, run: RunState) => void;
}

export const BOSSES: BossDef[] = [
  {
    id: 'maoDeFerro',
    name: 'Sargento Ferraz',
    description: 'Sem blefes neste Blind.',
    icon: '🎖️',
    color: '#9aa4b1',
    personality: 'calculista',
    minAnte: 1,
    apply: (r) => {
      r.bluffs = 0;
    },
  },
  {
    id: 'caladao',
    name: 'Frei Tadeu',
    description: 'Ninguém pode pedir truco.',
    icon: '📿',
    color: '#7d7d7d',
    personality: 'calculista',
    minAnte: 1,
    apply: (r) => {
      r.noBets = true;
    },
  },
  {
    id: 'sorrateiro',
    name: 'Madame Zuleika',
    description: 'A vira (e a manilha) muda a cada rodada.',
    icon: '🔮',
    color: '#ff8c3a',
    personality: 'blefador',
    minAnte: 1,
    apply: (r) => {
      r.rotatingVira = true;
    },
  },
  {
    id: 'corredor',
    name: 'Dênis Maratonista',
    description: 'Corre de qualquer truco, mas a meta é o dobro.',
    icon: '🏃',
    color: '#5ad1ff',
    personality: 'medroso',
    minAnte: 2,
    targetMult: 2,
    apply: (r) => {
      r.aiAlwaysRuns = true;
    },
  },
  {
    id: 'benzedeira',
    name: 'Vó Benedita',
    description: 'Cartas de Copas não pontuam fichas.',
    icon: '🌿',
    color: '#ff5c7a',
    personality: 'equilibrado',
    minAnte: 1,
    apply: (r) => {
      r.debuffSuit = 'copas';
    },
  },
  {
    id: 'coronelBoss',
    name: 'Coronel Teodoro',
    description: 'Só 3 mãos neste Blind.',
    icon: '🎩',
    color: '#c9a227',
    personality: 'agressivo',
    minAnte: 2,
    apply: (r) => {
      r.hands = Math.max(1, r.hands - 1);
    },
  },
  {
    id: 'agiota',
    name: 'Seu Mendonça Agiota',
    description: 'Você perde $1 para cada carta que jogar.',
    icon: '💼',
    color: '#4caf50',
    personality: 'calculista',
    minAnte: 2,
    apply: (r) => {
      r.moneyPerCard = 1;
    },
  },
  {
    id: 'cego',
    name: 'Waldemar Sanfoneiro',
    description: 'A vira fica escondida.',
    icon: '🎶',
    color: '#5b6a80',
    personality: 'equilibrado',
    minAnte: 1,
    apply: (r) => {
      r.hideVira = true;
    },
  },
  {
    id: 'peFrio',
    name: 'Gilberto da Sorveteria',
    description: 'Toda canga conta como rodada do adversário.',
    icon: '🍦',
    color: '#9ad7ff',
    personality: 'medroso',
    minAnte: 2,
    apply: (r) => {
      r.tieLoses = true;
    },
  },
  {
    id: 'delegado',
    name: 'Delegado Barros',
    description: 'Seu Coringa mais à esquerda fica preso (desativado).',
    icon: '👮',
    color: '#3a6ea5',
    personality: 'calculista',
    minAnte: 2,
    apply: (r, run) => {
      if (run.jokers[0]) r.disabledJoker = run.jokers[0].uid;
    },
  },
  {
    id: 'sogra',
    name: 'Dona Odete',
    description: 'A primeira mão que você vencer não pontua.',
    icon: '🧹',
    color: '#b46ad1',
    personality: 'agressivo',
    minAnte: 3,
    apply: (r) => {
      r.firstWinVoid = true;
    },
  },
  {
    id: 'valentao',
    name: 'Brutão Leão de Chácara',
    description: 'Toda mão já começa valendo Truco.',
    icon: '🚪',
    color: '#e84a3a',
    personality: 'agressivo',
    minAnte: 3,
    apply: (r) => {
      r.startLevel = 1;
    },
  },
  {
    id: 'ladyLaser',
    name: 'Dona Neusa Joalheira',
    description: 'Cartas de Ouros não pontuam fichas.',
    icon: '💍',
    color: '#ff3df2',
    personality: 'blefador',
    minAnte: 1,
    apply: (r) => {
      r.debuffSuit = 'ouros';
    },
  },
  {
    id: 'ninaK7',
    name: 'Socorro Coveira',
    description: 'Cartas de Espadas não pontuam fichas.',
    icon: '⚱️',
    color: '#3de0ff',
    personality: 'equilibrado',
    minAnte: 1,
    apply: (r) => {
      r.debuffSuit = 'espadas';
    },
  },
  {
    id: 'maxCromado',
    name: 'Severino Lenhador',
    description: 'Cartas de Paus não pontuam fichas.',
    icon: '🪓',
    color: '#c0c8d8',
    personality: 'agressivo',
    minAnte: 2,
    apply: (r) => {
      r.debuffSuit = 'paus';
    },
  },
  {
    id: 'drPixel',
    name: 'Doutor Ariovaldo',
    description: 'Cada blefe custa $2.',
    icon: '🩺',
    color: '#7dff6a',
    personality: 'calculista',
    minAnte: 1,
    apply: (r) => {
      r.bluffCost = 2;
    },
  },
  {
    id: 'djVinil',
    name: 'Toninho do Cavaco',
    description: 'Ninguém aposta além do Truco.',
    icon: '🪕',
    color: '#ffb547',
    personality: 'blefador',
    minAnte: 2,
    apply: (r) => {
      r.maxLevel = Math.max(1, Math.min(r.maxLevel, 1));
    },
  },
  {
    id: 'rambinho',
    name: 'Cabo Joel',
    description: 'O adversário abre todas as mãos.',
    icon: '🎯',
    color: '#8bbf3a',
    personality: 'agressivo',
    minAnte: 2,
    apply: (r) => {
      r.aiAlwaysMao = true;
    },
  },
  {
    id: 'capitaoFax',
    name: 'Capitão Aníbal',
    description: 'Manilhas não pontuam fichas.',
    icon: '⚓',
    color: '#e8e2c8',
    personality: 'calculista',
    minAnte: 3,
    apply: (r) => {
      r.noManilhaChips = true;
    },
  },
  {
    id: 'babyBoom',
    name: 'Dona Fifi',
    description: 'Fichas e Mult da Jogada valem metade.',
    icon: '🐩',
    color: '#ffc4e1',
    personality: 'medroso',
    minAnte: 4,
    targetMult: 0.8,
    apply: (r) => {
      r.halfBase = true;
    },
  },
  // ---------------------------------------------------------------- finais (Ante 8)
  {
    id: 'imperador',
    name: 'O Rei do Camarote',
    description: 'A vira muda a cada rodada e fica escondida.',
    icon: '🥂',
    color: '#ff2bd6',
    personality: 'calculista',
    minAnte: 8,
    finale: true,
    apply: (r) => {
      r.rotatingVira = true;
      r.hideVira = true;
    },
  },
  {
    id: 'rainhaNeon',
    name: 'Rainha da Bateria',
    description: 'Sem blefes, e toda canga conta como rodada do adversário.',
    icon: '🥁',
    color: '#3de0ff',
    personality: 'agressivo',
    minAnte: 8,
    finale: true,
    apply: (r) => {
      r.bluffs = 0;
      r.tieLoses = true;
    },
  },
  {
    id: 'baraoVectra',
    name: 'Barão do Café',
    description: 'Só 3 mãos, e seu Coringa mais à esquerda fica preso.',
    icon: '☕',
    color: '#ffd34d',
    personality: 'blefador',
    minAnte: 8,
    finale: true,
    apply: (r, run) => {
      r.hands = Math.max(1, r.hands - 1);
      if (run.jokers[0]) r.disabledJoker = run.jokers[0].uid;
    },
  },
];

export const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b])) as Record<string, BossDef>;
