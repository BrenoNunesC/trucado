// Campanha em dupla: runs inteiras com o motor de verdade, a projeção da mão em duplas para a
// pontuação, Coringas e chefes funcionando na mesa de quatro.

import { describe, expect, it } from 'vitest';
import { nextHand } from '../src/engine/blind';
import { makeCard, type Rank, type Suit } from '../src/engine/cards';
import { coopActor, coopAiStep, coopCanBluff, coopBluff, coopFinish, coopHand, coopOnze, coopPlay, coopRespond, makeCoop, projectHand } from '../src/engine/coop';
import { createDHand, dPlay } from '../src/engine/duplas';
import { addJoker } from '../src/engine/inventory';
import { collectCashout, leaveShop, newRun, selectBlind } from '../src/engine/run';
import type { RunState } from '../src/engine/state';

const c = (r: Rank, s: Suit) => makeCard(r, s);
const NAMES = ['Você', 'Adv', 'Parceiro', 'Comparsa'];

/** Joga uma mão inteira: você aceita tudo e joga a primeira carta; a IA faz o resto. */
function playHand(run: RunState) {
  let guard = 0;
  while (run.blind!.coop!.dhand.phase !== 'done') {
    if (++guard > 200) throw new Error('mão não termina');
    const who = coopActor(run);
    if (who === 0) {
      if (run.blind!.stage === 'onze') {
        coopOnze(run, true);
        continue;
      }
      const h = coopHand(run);
      if (h.phase === 'respond') coopRespond(run, 'accept');
      else coopPlay(run, h.hands[0][0].id);
    } else if (!coopAiStep(run)) throw new Error('ninguém jogou');
  }
  return coopFinish(run);
}

/** Todas as cartas do seu baralho continuam no monte, no descarte ou na mão (nem somem nem entram de fora). */
function deckIntact(run: RunState) {
  const b = run.blind!;
  const ids = new Set(run.deck.map((x) => x.id));
  const held = [...b.drawPile, ...b.discard];
  expect(held.every((x) => ids.has(x.id))).toBe(true);
  expect(new Set(held.map((x) => x.id)).size).toBe(held.length);
}

describe('Campanha em dupla: runs inteiras', () => {
  it('10 runs jogam Blinds em dupla, pontuam, recebem pagamento e passam pela loja sem quebrar o baralho', () => {
    let blindsWon = 0;
    let scored = 0;
    for (let g = 0; g < 10; g++) {
      const run = newRun({ seed: `COOP${g}`, deckId: 'classico', stake: 1, options: { maoDeOnze: g % 2 === 0, maoDeFerro: g % 3 === 0 } });
      makeCoop(run, 'bene', 'rosana');
      for (let blindNo = 0; blindNo < 6 && run.phase === 'select'; blindNo++) {
        selectBlind(run);
        const b = run.blind!;
        expect(b.coop!.seats.map((s) => s.name)[0]).toBe('Você');
        expect(b.coop!.seats[2].avatar).toBe('bene');
        while (b.stage === 'playing' || b.stage === 'onze' || b.stage === 'handOver') {
          if (b.stage === 'handOver') nextHand(run);
          const sum = playHand(run);
          if (sum.score) scored++;
          deckIntact(run);
        }
        if (b.stage === 'won') {
          blindsWon++;
          collectCashout(run);
          if ((run.phase as string) !== 'shop') break;
          leaveShop(run);
        } else break;
      }
    }
    expect(scored).toBeGreaterThan(5);
    expect(blindsWon).toBeGreaterThan(0);
  });

  it('o blefe troca as suas cartas também na mesa em dupla', () => {
    const run = newRun({ seed: 'BLEFE', deckId: 'classico', stake: 1 });
    makeCoop(run, 'bene');
    selectBlind(run);
    // espera a sua vez sem você ter jogado
    while (coopActor(run) !== 0) coopAiStep(run);
    expect(coopCanBluff(run)).toBe(true);
    const old = coopHand(run).hands[0][0];
    coopBluff(run, [old.id]);
    const now = coopHand(run).hands[0];
    expect(now.some((x) => x.id === old.id)).toBe(false);
    expect(now).toHaveLength(3);
    expect(run.blind!.hand!.hands.player.map((x) => x.id)).toEqual(now.map((x) => x.id));
  });
});

describe('Projeção da mão em duplas', () => {
  it('rodada levada pelo parceiro conta como sua, com a sua carta contra a melhor adversária', () => {
    // vira K → manilha A
    const h = createDHand(
      [
        [c('4', 'ouros'), c('5', 'ouros'), c('6', 'ouros')],
        [c('7', 'copas'), c('5', 'copas'), c('6', 'copas')],
        [c('3', 'espadas'), c('3', 'paus'), c('6', 'espadas')],
        [c('Q', 'paus'), c('5', 'paus'), c('4', 'paus')],
      ],
      c('K', 'ouros'),
      0,
    );
    // cada um joga a primeira carta da mão, na ordem, até a mão acabar
    while (h.phase !== 'done') dPlay(h, h.turn, h.hands[h.turn][0].id);
    const p = projectHand(h, 0, NAMES);
    // 1ª rodada: o 3♠ do parceiro leva
    expect(h.rounds[0].outcome).toBe(0);
    expect(h.rounds[0].best).toBe(2);
    expect(p.rounds[0].outcome).toBe('player');
    // a sua carta (4♦) aparece como a sua, e a melhor do adversário (a Q♣ do comparsa, que vence o 7♥) como a dele
    expect(p.rounds[0].cards.player!.rank).toBe('4');
    expect(p.rounds[0].cards.ai!.rank).toBe('Q');
    expect(p.result!.winner).toBe('player');
    expect(p.log.some((e) => e.text.includes('Parceiro'))).toBe(true);
  });

  it('Coringa pontua quando a dupla fecha (Fechador: +12 Mult na Jogada Fechou)', () => {
    let fechou = 0;
    for (let g = 0; g < 40 && fechou === 0; g++) {
      const run = newRun({ seed: `FECHA${g}`, deckId: 'classico', stake: 1 });
      makeCoop(run, 'bene');
      addJoker(run, 'fechador');
      selectBlind(run);
      const sum = playHand(run);
      if (sum.score?.category === 'fechou') {
        expect(sum.score.steps.some((st) => st.source === 'joker' && st.mult === 12)).toBe(true);
        fechou++;
      }
    }
    expect(fechou).toBe(1);
  });
});

describe('Chefes na mesa de quatro', () => {
  it('O Pé-Frio: a canga conta para a dupla adversária', () => {
    const run = newRun({ seed: 'PEFRIO', deckId: 'classico', stake: 1 });
    makeCoop(run, 'bene');
    run.blindIndex = 2;
    run.blinds[2].bossId = 'peFrio';
    selectBlind(run);
    expect(coopHand(run).options.tieWinner).toBe(1);
  });

  it('você responde às apostas pela sua dupla, mesmo quando o adversário à sua frente pede', () => {
    const run = newRun({ seed: 'VOZ', deckId: 'classico', stake: 1 });
    makeCoop(run, 'bene');
    selectBlind(run);
    const h = coopHand(run);
    expect(h.options.voice).toEqual([0, null]);
  });
});
