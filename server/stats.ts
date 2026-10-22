// Ranking e perfil online: o resultado de cada partida e de cada Blind da campanha, por jogador.
// O jogador é identificado pelo id fixo que o jogo gera no aparelho (Settings.playerId); o nome
// é o último usado. Fica num arquivo JSON (TRUCADO_STATS), gravado com folga para não escrever
// a cada jogada. Em hospedagem grátis o disco pode ser apagado ao reiniciar: aí o ranking zera.

import { readFileSync, writeFileSync } from 'node:fs';
import type { RankRow } from '../src/net/protocol';

export interface PlayerStats {
  id: string;
  name: string;
  duelWins: number;
  duelLosses: number;
  duplasWins: number;
  duplasLosses: number;
  campBlinds: number;
  campBestAnte: number;
  campVictories: number;
  updated: number;
}

const blankStats = (id: string, name: string): PlayerStats => ({
  id,
  name,
  duelWins: 0,
  duelLosses: 0,
  duplasWins: 0,
  duplasLosses: 0,
  campBlinds: 0,
  campBestAnte: 0,
  campVictories: 0,
  updated: Date.now(),
});

/** Pontos do ranking: vitórias valem mais que Blinds; vencer a campanha vale muito. */
export const points = (s: PlayerStats) =>
  (s.duelWins + s.duplasWins) * 3 + s.campBlinds + s.campBestAnte * 5 + s.campVictories * 30;

export class StatsStore {
  private players = new Map<string, PlayerStats>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** `file` = onde gravar (null = só na memória, como nos testes). */
  constructor(private file: string | null) {
    if (!file) return;
    try {
      const data = JSON.parse(readFileSync(file, 'utf8')) as PlayerStats[];
      for (const p of data) this.players.set(p.id, { ...blankStats(p.id, p.name), ...p });
    } catch {
      // primeira vez (ou arquivo apagado): ranking vazio
    }
  }

  /** Atualiza as estatísticas de um jogador (ignora quem não tem id). */
  record(id: string | undefined, name: string, fn: (s: PlayerStats) => void): void {
    if (!id) return;
    const s = this.players.get(id) ?? blankStats(id, name);
    s.name = name;
    fn(s);
    s.updated = Date.now();
    this.players.set(id, s);
    this.saveSoon();
  }

  get(id: string): PlayerStats | undefined {
    return this.players.get(id);
  }

  /** O ranking: os `n` primeiros e a linha de quem pediu (mesmo fora do topo). */
  ranking(n: number, id?: string): { top: RankRow[]; you: RankRow | null } {
    const sorted = [...this.players.values()].sort((a, b) => points(b) - points(a) || b.updated - a.updated);
    const row = (s: PlayerStats, i: number): RankRow => ({
      pos: i + 1,
      name: s.name,
      points: points(s),
      wins: s.duelWins + s.duplasWins,
      losses: s.duelLosses + s.duplasLosses,
      campBlinds: s.campBlinds,
      campBestAnte: s.campBestAnte,
      campVictories: s.campVictories,
    });
    const i = id ? sorted.findIndex((s) => s.id === id) : -1;
    return { top: sorted.slice(0, n).map(row), you: i >= 0 ? row(sorted[i], i) : null };
  }

  private saveSoon(): void {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        writeFileSync(this.file!, JSON.stringify([...this.players.values()]));
      } catch {
        // disco somente leitura: o ranking fica só na memória
      }
    }, 2000);
  }

  flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.file) {
      try {
        writeFileSync(this.file, JSON.stringify([...this.players.values()]));
      } catch {
        // idem
      }
    }
  }
}
