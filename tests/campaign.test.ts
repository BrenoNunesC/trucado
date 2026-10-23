// Campanha em dupla online: o servidor de verdade e dois jogos simulados, cada um com a própria
// run, jogando Blinds juntos (escolha, cartas, mesa de quatro, pontuação, pagamento e loja).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startServer } from '../server/server';
import { nextHand } from '../src/engine/blind';
import { dActor } from '../src/engine/duplas';
import { collectCashout, endRun } from '../src/engine/run';
import type { RunState } from '../src/engine/state';
import { applyCampaign, cardsMessage, createCampaignRun, scoreOnline } from '../src/net/campaignRun';
import { PROTOCOL_VERSION, type ClientMsg, type ServerMsg } from '../src/net/protocol';

type CState = Extract<ServerMsg, { t: 'cstate' }>;

interface Player {
  ws: WebSocket;
  run: RunState | null;
  code: string;
  /** Erros do servidor e exceções do jogo simulado. */
  errors: string[];
  /** Linha do tempo (para entender um travamento). */
  timeline: string[];
  blindsWon: number;
  handsScored: number;
  last: CState | null;
  selected: string;
  /** Estado da mesa em que já agiu (para não repetir a jogada). */
  acted: string;
  /** Coringas recebidos do parceiro. */
  gifts: string[];
  send: (m: ClientMsg) => void;
}

/** Um jogo simulado: faz o que a tela faria com cada estado que chega do servidor. */
function player(port: number, name: string, deckId: string): Promise<Player> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    const p: Player = { ws, run: null, code: '', errors: [], timeline: [], blindsWon: 0, handsScored: 0, last: null, selected: '', acted: '', gifts: [], send: (m) => ws.send(JSON.stringify(m)) };

    const handle = (msg: ServerMsg) => {
      if (msg.t === 'room') p.code = msg.code;
      if (msg.t === 'cgift') p.gifts.push(`${msg.from}:${msg.joker.id}`);
      if (msg.t === 'error' && !msg.msg.includes('inválida')) p.errors.push(`erro: ${msg.msg}`);
      if (msg.t === 'error') {
        const h = p.last?.view.table?.hand;
        p.timeline.push(`RECUSA ${msg.msg} | fase ${h?.phase} vez ${h ? dActor(h) : '-'} ferro ${h?.options.blindPlay} mão ${JSON.stringify(h?.hands[0].map((x) => x.id))}`);
      }
      if (msg.t !== 'cstate') return;
      p.last = msg;
      const v = msg.view;
      if (!p.run) p.run = createCampaignRun(v, p.code, deckId, { name, avatar: 'bene', personality: 'equilibrado' });
      const run = p.run;
      if (run.phase === 'over' || run.phase === 'victory') return;
      const before = `${run.phase}/${run.blind?.stage ?? '-'}`;
      const fx = applyCampaign(run, v);
      const t = v.table;
      p.timeline.push(
        `${v.phase}:${t?.stage ?? '-'} h${t?.handNo ?? 0} ${t?.sentCards ? 'C' : ''}${t?.sentScore ? 'S' : ''} | local ${before} -> ${run.phase}/${run.blind?.stage ?? '-'} ${JSON.stringify(fx)}`,
      );
      if (fx.sendCards) p.send({ t: 'ccards', ...cardsMessage(run) });
      if (fx.blindLost) {
        endRun(run);
        return;
      }
      // o anfitrião sempre joga o Blind da vez
      const key = `${v.ante}-${v.blindIndex}`;
      if (v.host && v.phase === 'select' && run.phase === 'select' && p.selected !== key) {
        p.selected = key;
        p.send({ t: 'cselect', skip: false });
      }
      if (t && v.phase === 'blind') {
        // uma ação por estado da mesa, como a tela faz (o servidor limita mensagens por segundo)
        const stamp = `${v.blindIndex}-${t.handNo}-${t.stage}-${t.hand?.phase}-${t.hand?.log.length}-${t.hand?.hands[0].length}`;
        const act = (a: ClientMsg) => {
          if (p.acted === stamp) return;
          p.acted = stamp;
          p.send(a);
        };
        if (t.stage === 'onze' && t.onzeYou) act({ t: 'act', a: { t: 'onze', play: true } });
        if (t.stage === 'playing' && dActor(t.hand) === 0) {
          if (t.hand.phase === 'respond') act({ t: 'act', a: { t: 'respond', r: 'accept' } });
          else act({ t: 'act', a: { t: 'play', cardId: t.hand.hands[0][0].id } });
        }
        if (fx.score) {
          scoreOnline(run, v);
          p.handsScored++;
          p.send({ t: 'cscore', handNo: t.handNo, score: run.blind!.score });
        }
        // a dupla ainda não chegou na meta: próxima mão
        if (t.stage === 'handOver' && run.blind?.stage === 'handOver' && run.blind.handsPlayed === t.handNo) {
          nextHand(run);
          p.send({ t: 'ccards', ...cardsMessage(run) });
        }
      }
      if (fx.blindWon) {
        p.blindsWon++;
        collectCashout(run);
        // na primeira loja, a Ana dá um Coringa para o Beto
        if (run.phase === 'shop' && name === 'Ana' && p.blindsWon === 1) p.send({ t: 'cgift', joker: { id: 'cafezinho', state: {}, cost: 4 } });
        if (run.phase === 'shop') p.send({ t: 'cshopdone' });
      }
    };

    ws.on('message', (d) => {
      try {
        handle(JSON.parse(String(d)) as ServerMsg);
      } catch (e) {
        p.errors.push(`exceção: ${(e as Error).stack}`);
      }
    });
    ws.on('open', () => resolve(p));
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Campanha em dupla online', () => {
  let server: Awaited<ReturnType<typeof startServer>>;
  const port = 20000 + Math.floor(Math.random() * 1000);
  beforeAll(async () => {
    server = await startServer({ port, handDelayMs: 5, botDelayMs: 1, reconnectMs: 200, maxMsgsPerSec: 10_000 });
  });
  afterAll(async () => {
    await server.close();
  });

  it('dois jogadores, cada um com a própria run, vencem Blinds juntos e passam pela loja', async () => {
    const a = await player(port, 'Ana', 'vermelho');
    const b = await player(port, 'Beto', 'vermelho');
    a.send({ t: 'create', v: PROTOCOL_VERSION, player: { name: 'Ana', avatar: 'rosana' }, rules: { maoDeOnze: true, maoDeFerro: true }, mode: 'campaign' });
    await wait(50);
    b.send({ t: 'join', v: PROTOCOL_VERSION, code: a.code, player: { name: 'Beto', avatar: 'zeca' } });
    await wait(50);
    a.send({ t: 'start', stake: 1 });

    // joga até 3 Blinds vencidos (ou o fim da run)
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && a.blindsWon < 3 && a.run?.phase !== 'over') await wait(20);

    const debug = `\nA:\n${a.timeline.slice(-10).join('\n')}\nB:\n${b.timeline.slice(-10).join('\n')}`;
    expect([...a.errors, ...b.errors], debug).toEqual([]);
    expect(a.blindsWon >= 3 || a.run?.phase === 'over', `parou no meio${debug}`).toBe(true);
    expect(a.handsScored).toBeGreaterThan(0);
    expect(b.handsScored).toBe(a.handsScored);
    // os dois vencem juntos e ficam no mesmo Ante
    expect(b.blindsWon).toBe(a.blindsWon);
    if (a.blindsWon > 0) expect(b.gifts).toContain('Ana:cafezinho');
    expect(b.run!.ante).toBe(a.run!.ante);
    if (a.blindsWon > 0) expect(a.run!.stats.blindsDefeated).toBe(a.blindsWon);
    // nenhuma carta da casa entrou nos baralhos
    for (const p of [a, b]) {
      const bl = p.run!.blind;
      if (!bl) continue;
      const ids = new Set(p.run!.deck.map((x) => x.id));
      expect([...bl.drawPile, ...bl.discard].every((x) => ids.has(x.id))).toBe(true);
    }
    a.ws.close();
    b.ws.close();
  }, 30_000);

  it('sozinho na sala: a IA vira o parceiro e só a sua meta conta', async () => {
    const a = await player(port, 'Ana', 'vermelho');
    a.send({ t: 'create', v: PROTOCOL_VERSION, player: { name: 'Ana', avatar: 'rosana' }, rules: { maoDeOnze: false, maoDeFerro: false }, mode: 'campaign' });
    await wait(50);
    a.send({ t: 'start', stake: 1 });
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline && a.blindsWon < 1 && a.run?.phase !== 'over') await wait(20);
    const v = a.last!.view;
    expect(a.errors).toEqual([]);
    expect(v.partner.bot).toBe(true);
    expect(a.handsScored).toBeGreaterThan(0);
    a.ws.close();
  }, 20_000);
});
