// Mensagens entre o jogo e o servidor online (JSON pelo WebSocket). Compartilhado pelos dois
// lados para que um não mande o que o outro não entende.

import type { CampView, TableRules } from '../engine/campaign';
import type { Card } from '../engine/cards';
import type { DuelAction, DuelRules, DuelView } from '../engine/duel';
import type { DuplasAction, DuplasView } from '../engine/duplas';
import type { JokerEdition } from '../engine/state';
import type { Side } from '../engine/truco';

export const PROTOCOL_VERSION = 4;

/**
 * Tipos de sala: 1 contra 1; duplas 2 contra 2 (a IA completa os lugares vazios); dupla contra a
 * máquina (dois humanos na mesma dupla contra duas IAs, até 12); e a campanha em dupla (Blinds,
 * Coringas e loja, cada um com a própria run).
 */
export type RoomMode = 'duel' | 'duplas' | 'coop' | 'campaign';

export interface PlayerInfo {
  name: string;
  /** id do personagem (data/opponents.ts): roupa e mãos do jogador na mesa dos outros. */
  avatar: string;
  /** Identidade fixa do jogador neste aparelho (para o ranking e o perfil online). */
  id?: string;
}

/** Coringa dado ao parceiro na loja da campanha em dupla. */
export interface GiftJoker {
  id: string;
  edition?: JokerEdition;
  state: Record<string, number>;
  cost: number;
}

/** Uma linha do ranking online. */
export interface RankRow {
  pos: number;
  name: string;
  points: number;
  wins: number;
  losses: number;
  campBlinds: number;
  campBestAnte: number;
  campVictories: number;
}

/** Frases prontas (o servidor só repassa o número, então ninguém manda texto livre). */
export const EMOTES = ['Truco, ladrão!', 'Desce essa carta!', 'Tá com medo?', 'Boa jogada!', 'Eita!', 'Agora vai!', 'Sorte de principiante…', 'Bora mais uma?'];

export type ClientMsg =
  | { t: 'create'; v: number; player: PlayerInfo; rules: DuelRules; mode?: RoomMode }
  | { t: 'join'; v: number; code: string; player: PlayerInfo }
  | { t: 'resume'; v: number; code: string; token: string }
  | { t: 'act'; a: DuelAction | DuplasAction }
  /** Duplas: trocar de lugar na sala de espera. */
  | { t: 'seat'; seat: number }
  /** Duplas: o anfitrião começa a partida (a IA completa os lugares vazios). Na campanha, com a stake. */
  | { t: 'start'; stake?: number }
  /** Campanha: o anfitrião joga ou pula o Blind da vez. */
  | { t: 'cselect'; skip: boolean }
  /**
   * Campanha: as suas três cartas desta mão (do seu baralho), a sua meta e as regras do Blind na
   * sua run; `peek` = você tem Olho Vivo ou carta Marcada (mostra uma carta adversária).
   */
  | { t: 'ccards'; handNo: number; cards: Card[]; target: number; rules: TableRules; peek: boolean }
  /** Campanha: blefou e trocou as cartas (antes de jogar a primeira). */
  | { t: 'cbluff'; cards: Card[] }
  /** Campanha: a sua pontuação no Blind depois de pontuar a mão `handNo`. */
  | { t: 'cscore'; handNo: number; score: number }
  /** Campanha: saiu da loja (o próximo Blind começa quando os dois saírem). */
  | { t: 'cshopdone' }
  | { t: 'emote'; id: number }
  /** Chat livre da sala (jogadores e espectadores). */
  | { t: 'chat'; text: string }
  /** Assistir uma sala pelo código, sem jogar. */
  | { t: 'watch'; v: number; code: string; name: string }
  /** Campanha: dá um Coringa para o parceiro (na loja). */
  | { t: 'cgift'; joker: GiftJoker }
  | { t: 'rematch' }
  | { t: 'leave' };

export interface Seat {
  info: PlayerInfo;
  online: boolean;
  /** Saiu da sala de vez. */
  gone?: boolean;
  /** Lugar ocupado pela IA. */
  bot?: boolean;
}

export type ServerMsg =
  /** Você está na sala: guarde o token para voltar se a conexão cair. */
  | { t: 'room'; code: string; token: string; seat: Side | number; mode: RoomMode }
  /** 1 contra 1: sala esperando o segundo jogador. */
  | { t: 'lobby'; code: string; you: Seat; opp: Seat | null; rules: DuelRules }
  | { t: 'state'; code: string; view: DuelView; you: Seat; opp: Seat; rematch: { you: boolean; opp: boolean }; spectator?: boolean }
  /**
   * Duplas: sala de espera. `seats` vem girado como a mesa (0 = você, 2 = parceiro); null =
   * lugar vazio (vira IA ao começar). `locked` = lugares da máquina no modo dupla contra a máquina.
   */
  | { t: 'dlobby'; code: string; mode: RoomMode; seats: (Seat | null)[]; host: boolean; locked: boolean[]; rules: DuelRules }
  | { t: 'dstate'; code: string; mode: RoomMode; view: DuplasView; seats: Seat[]; rematch: { you: boolean; waiting: number }; spectator?: boolean }
  /** Campanha em dupla: o estado compartilhado, visto deste jogador (ou de quem assiste). */
  | { t: 'cstate'; code: string; view: CampView; spectator?: boolean }
  /** Você está assistindo esta sala (os estados chegam com `spectator`). */
  | { t: 'watching'; code: string; mode: RoomMode; players: string[] }
  | { t: 'chat'; from: string; text: string; mine: boolean; spectator: boolean }
  /** Campanha: um Coringa que o parceiro te deu (ou o seu, devolvido se não deu para entregar). */
  | { t: 'cgift'; from: string; joker: GiftJoker; returned?: boolean }
  /** Frase rápida. `seat` é o lugar de quem mandou, girado como a mesa de quem recebe (duplas). */
  | { t: 'emote'; from: 'you' | 'opp'; id: number; seat?: number }
  | { t: 'error'; msg: string; fatal?: boolean };
