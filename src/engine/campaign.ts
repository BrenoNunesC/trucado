// Campanha em dupla online: o que o servidor e o jogo compartilham.
//
// O servidor cuida do que é dos dois: a sequência de Antes e Blinds (os mesmos chefes e
// adversários para a dupla), a mesa de quatro (cartas da casa, vira, a dupla adversária da IA,
// validação das jogadas) e o placar da dupla (a soma das pontuações contra a soma das metas).
// Cada jogo cuida da própria run: baralho, Coringas, Tarôs, dinheiro, loja e a pontuação da
// própria mão, pela projeção de coop.ts. Os dois estão do mesmo lado contra a máquina, então
// confiar a pontuação a cada jogo não abre trapaça contra ninguém.

import { FINAL_ANTE } from '../data/balance';
import { BOSSES } from '../data/bosses';
import { OPPONENTS } from '../data/opponents';
import { TAGS } from '../data/tags';
import type { DHand, SeatNo } from './duplas';
import { pick, type Rng } from './rng';
import type { BlindInfo, BlindRules } from './state';

/** Um Blind da sequência, sem a meta (cada run calcula a sua, pelo próprio baralho e stake). */
export type CampBlind = Omit<BlindInfo, 'target' | 'reward'>;

/** As três escolhas de um Ante, sorteadas pelo servidor (mesma lógica de run.generateAnte). */
export function scheduleAnte(rng: Rng, ante: number, bossesSeen: string[]): CampBlind[] {
  const finale = ante % FINAL_ANTE === 0;
  const eligible = BOSSES.filter((b) => b.minAnte <= ante && !!b.finale === finale);
  let pool = eligible.filter((b) => !bossesSeen.includes(b.id));
  if (pool.length === 0) {
    // já viu todos: a lista recomeça (só para os chefes deste tipo)
    const keep = bossesSeen.filter((id) => !eligible.some((b) => b.id === id));
    bossesSeen.splice(0, bossesSeen.length, ...keep);
    pool = eligible;
  }
  const boss = pick(rng, pool);
  bossesSeen.push(boss.id);
  const tagPool = TAGS.filter((t) => t.minAnte <= ante);
  const small = pick(rng, OPPONENTS);
  const big = pick(rng, OPPONENTS.filter((o) => o.id !== small.id));
  return [
    { kind: 'pequeno', ante, name: 'Blind Pequeno', personality: small.personality, opponentId: small.id, tagId: pick(rng, tagPool).id, status: 'upcoming' },
    { kind: 'grande', ante, name: 'Blind Grande', personality: big.personality, opponentId: big.id, tagId: pick(rng, tagPool).id, status: 'upcoming' },
    { kind: 'chefe', ante, name: boss.name, personality: boss.personality, bossId: boss.id, status: 'upcoming' },
  ];
}

/** O que cada jogo manda de regras do Blind (as do chefe são iguais; vouchers e Coringas mudam). */
export type TableRules = Pick<
  BlindRules,
  'hands' | 'noBets' | 'rotatingVira' | 'hideVira' | 'aiAlwaysRuns' | 'tieLoses' | 'startLevel' | 'maxLevel' | 'aiAlwaysMao'
>;

export function tableRulesOf(r: BlindRules): TableRules {
  return {
    hands: r.hands,
    noBets: r.noBets,
    rotatingVira: r.rotatingVira,
    hideVira: r.hideVira,
    aiAlwaysRuns: r.aiAlwaysRuns,
    tieLoses: r.tieLoses,
    startLevel: r.startLevel,
    maxLevel: r.maxLevel,
    aiAlwaysMao: r.aiAlwaysMao,
  };
}

/**
 * As regras da mesa juntando as dos dois: o número de mãos é o maior (um voucher de um vale para
 * a dupla) e a vira some se o Coringa de qualquer um esconder; o resto é do chefe, igual para os dois.
 */
export function mergeTableRules(list: TableRules[]): TableRules {
  const [first, ...rest] = list;
  const out = { ...first };
  for (const r of rest) {
    out.hands = Math.max(out.hands, r.hands);
    out.hideVira = out.hideVira || r.hideVira;
  }
  return out;
}

/** Quem senta em cada lugar, como cada jogo vê (girado: 0 = ele, 2 = parceiro). */
export interface CampSeat {
  name: string;
  avatar: string;
  bot: boolean;
  online: boolean;
}

/** A mesa do Blind atual, vista de um lugar. */
export interface CampTable {
  hand: DHand;
  seats: CampSeat[];
  stage: 'dealing' | 'playing' | 'onze' | 'scoring' | 'handOver' | 'won' | 'lost';
  /** Número da mão no Blind (1, 2, ...): o jogo só pontua cada mão uma vez. */
  handNo: number;
  handsLeft: number;
  onzeYou: boolean;
  hideVira: boolean;
  /** Carta adversária mostrada a este jogador (Olho Vivo, carta Marcada). */
  revealedId?: string;
  /** Já mandou as cartas desta mão / já pontuou esta mão. */
  sentCards: boolean;
  sentScore: boolean;
}

export interface CampView {
  /** Lugar real deste jogador (0 = anfitrião, 2 = convidado). */
  seat: SeatNo;
  host: boolean;
  seed: string;
  stake: number;
  options: { maoDeOnze: boolean; maoDeFerro: boolean };
  phase: 'select' | 'blind' | 'shop' | 'over' | 'victory';
  ante: number;
  blindIndex: number;
  blinds: CampBlind[];
  table: CampTable | null;
  /** Placar da dupla no Blind: o seu, o do parceiro e as metas. */
  score: { mine: number; partner: number; target: number };
  partner: { name: string; avatar: string; bot: boolean; online: boolean };
  /** O parceiro já saiu da loja / você já saiu. */
  shopDone: { you: boolean; partner: boolean };
}
