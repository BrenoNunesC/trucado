// Truco em duplas: rodadas de quatro cartas, apostas por dupla, Mão de Onze, a visão de cada
// lugar e partidas inteiras só com a IA.

import { describe, expect, it } from 'vitest';
import { decideDuplas } from '../src/ai/duplas';
import { makeCard, type Rank, type Suit } from '../src/engine/cards';
import {
  applyDuplas,
  createDHand,
  dActor,
  dBet,
  dPlay,
  dRespond,
  duplasViewFor,
  DUPLAS_TARGET,
  newDuplas,
  nextDuplasHand,
  type SeatNo,
} from '../src/engine/duplas';
import { createRng, fork } from '../src/engine/rng';

const c = (r: Rank, s: Suit) => makeCard(r, s);
const NAMES = ['Ana', 'Beto', 'Cida', 'Dito'];

/** Mão com vira K (manilha A) e cartas escolhidas para cada lugar. */
function hand(cards: [Rank, Suit][][], mao: SeatNo = 0) {
  return createDHand(
    cards.map((x) => x.map(([r, s]) => c(r, s))),
    c('K', 'ouros'),
    mao,
  );
}

describe('Rodadas com quatro cartas', () => {
  it('vence a dupla da carta mais forte; quem fez a rodada abre a próxima', () => {
    const h = hand([
      [['4', 'ouros'], ['5', 'ouros'], ['6', 'ouros']],
      [['3', 'copas'], ['5', 'copas'], ['6', 'copas']],
      [['7', 'ouros'], ['5', 'espadas'], ['6', 'espadas']],
      [['Q', 'paus'], ['5', 'paus'], ['6', 'paus']],
    ]);
    for (const s of [0, 1, 2, 3] as SeatNo[]) dPlay(h, s, h.hands[s][0].id);
    expect(h.rounds[0].outcome).toBe(1);
    expect(h.rounds[0].best).toBe(1);
    expect(h.turn).toBe(1);
  });

  it('empate entre as duas duplas é canga; empate dentro da mesma dupla não', () => {
    const h = hand([
      [['3', 'ouros'], ['4', 'ouros'], ['6', 'ouros']],
      [['3', 'copas'], ['4', 'copas'], ['6', 'copas']],
      [['4', 'espadas'], ['3', 'espadas'], ['6', 'espadas']],
      [['5', 'paus'], ['3', 'paus'], ['6', 'paus']],
    ]);
    for (const s of [0, 1, 2, 3] as SeatNo[]) dPlay(h, s, h.hands[s][0].id);
    expect(h.rounds[0].outcome).toBe('tie');

    const h2 = hand([
      [['3', 'ouros'], ['4', 'ouros'], ['6', 'ouros']],
      [['2', 'copas'], ['4', 'copas'], ['6', 'copas']],
      [['3', 'espadas'], ['4', 'espadas'], ['6', 'espadas']],
      [['5', 'paus'], ['4', 'paus'], ['6', 'paus']],
    ]);
    for (const s of [0, 1, 2, 3] as SeatNo[]) dPlay(h2, s, h2.hands[s][0].id);
    expect(h2.rounds[0].outcome).toBe(0);
  });

  it('manilha (A, com vira K) vence o 3; entre manilhas, o naipe decide', () => {
    const h = hand([
      [['A', 'ouros'], ['4', 'ouros'], ['6', 'ouros']],
      [['3', 'copas'], ['4', 'copas'], ['6', 'copas']],
      [['5', 'espadas'], ['4', 'espadas'], ['6', 'espadas']],
      [['A', 'paus'], ['4', 'paus'], ['6', 'paus']],
    ]);
    for (const s of [0, 1, 2, 3] as SeatNo[]) dPlay(h, s, h.hands[s][0].id);
    expect(h.rounds[0].outcome).toBe(1);
    expect(h.rounds[0].best).toBe(3);
  });
});

describe('Apostas em dupla', () => {
  it('quem responde é o adversário seguinte; aumentar devolve para a outra dupla', () => {
    const h = hand([
      [['4', 'ouros'], ['5', 'ouros'], ['6', 'ouros']],
      [['4', 'copas'], ['5', 'copas'], ['6', 'copas']],
      [['4', 'espadas'], ['5', 'espadas'], ['6', 'espadas']],
      [['4', 'paus'], ['5', 'paus'], ['6', 'paus']],
    ]);
    dBet(h, 0);
    expect(dActor(h)).toBe(1);
    dRespond(h, 1, 'raise');
    expect(h.level).toBe(1);
    expect(dActor(h)).toBe(2);
    dRespond(h, 2, 'accept');
    expect(h.level).toBe(2);
    expect(h.phase).toBe('play');
    expect(h.turn).toBe(0);
  });

  it('correr dá à outra dupla o valor já aceito', () => {
    const h = hand([
      [['4', 'ouros'], ['5', 'ouros'], ['6', 'ouros']],
      [['4', 'copas'], ['5', 'copas'], ['6', 'copas']],
      [['4', 'espadas'], ['5', 'espadas'], ['6', 'espadas']],
      [['4', 'paus'], ['5', 'paus'], ['6', 'paus']],
    ]);
    dBet(h, 0);
    dRespond(h, 1, 'accept');
    dPlay(h, 0, h.hands[0][0].id);
    dBet(h, 1);
    dRespond(h, 2, 'run');
    expect(h.result).toMatchObject({ winner: 1, points: 3, reason: 'run', ranAway: 0 });
  });
});

describe('Visão de cada lugar', () => {
  it('gira a mesa: cada um é o lugar 0, a dupla dele é a 0 e só as próprias cartas aparecem', () => {
    const m = newDuplas('VISAO', { maoDeOnze: true, maoDeFerro: true });
    const v = duplasViewFor(m, 1, NAMES);
    expect(v.hand.hands[0].map((x) => x.id)).toEqual(m.hand.hands[1].map((x) => x.id));
    for (const r of [1, 2, 3]) expect(v.hand.hands[r].every((x) => x.id.startsWith('x-'))).toBe(true);
    const json = JSON.stringify(v);
    for (const s of [0, 2, 3]) for (const card of m.hand.hands[s]) expect(json).not.toContain(card.id);
    expect(v.hand.log[0].text).not.toMatch(/\{s\d\}/);
  });

  it('Mão de Onze: a dupla com 11 vê as cartas do parceiro; a outra não', () => {
    const mm = newDuplas('ONZE', { maoDeOnze: true, maoDeFerro: true });
    // a dupla 0 chega a 11 e a próxima mão é a da Mão de Onze
    mm.score = [11, 3];
    mm.stage = 'handOver';
    nextDuplasHand(mm);
    expect(mm.stage).toBe('onze');
    const partnerView = duplasViewFor(mm, 0, NAMES);
    expect(partnerView.hand.hands[2].map((x) => x.id)).toEqual(mm.hand.hands[2].map((x) => x.id));
    const oppView = duplasViewFor(mm, 1, NAMES);
    expect(oppView.hand.hands[2].every((x) => x.id.startsWith('x-'))).toBe(true);
    // só o lugar que decide pode responder à Mão de Onze
    const decider = mm.onzeDecider!;
    const otherOne = ([0, 2] as SeatNo[]).find((s) => s !== decider)!;
    expect(applyDuplas(mm, otherOne, { t: 'onze', play: true })).toBe(false);
    expect(applyDuplas(mm, decider, { t: 'onze', play: true })).toBe(true);
    expect(mm.hand.level).toBe(1);
  });
});

describe('Partidas inteiras só com a IA', () => {
  it('300 partidas terminam em 12 com jogadas sempre válidas', () => {
    const rng = createRng('IA-DUPLAS');
    const wins = [0, 0];
    for (let g = 0; g < 300; g++) {
      const m = newDuplas(`P${g}`, { maoDeOnze: g % 2 === 0, maoDeFerro: g % 3 === 0 });
      let steps = 0;
      while (m.stage !== 'over') {
        if (m.stage === 'handOver') {
          // entre uma mão e outra ninguém joga
          expect(applyDuplas(m, 0, { t: 'bet' })).toBe(false);
          nextDuplasHand(m);
          continue;
        }
        const s = (m.stage === 'onze' ? m.onzeDecider : dActor(m.hand))!;
        const a = decideDuplas(m, s, fork(rng), (['agressivo', 'medroso', 'blefador', 'equilibrado'] as const)[s]);
        expect(a).not.toBeNull();
        expect(applyDuplas(m, s, a!)).toBe(true);
        if (++steps > 2000) throw new Error('partida não termina');
      }
      expect(Math.max(...m.score)).toBeGreaterThanOrEqual(DUPLAS_TARGET);
      wins[m.winner!] += 1;
    }
    expect(wins[0] + wins[1]).toBe(300);
  });
});
