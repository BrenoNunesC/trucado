import { describe, expect, it } from 'vitest';
import { computeCashout } from '../src/engine/blind';
import { newRun, selectBlind } from '../src/engine/run';

describe('Efeitos dos baralhos', () => {
  it('Baralho da Gorjeta paga $2 por mão e $1 por blefe que sobrou, sem juros', () => {
    const run = newRun({ seed: 'GORJETA', deckId: 'verde', stake: 1 });
    run.money = 50;
    selectBlind(run);
    run.blind!.handsLeft = 2;
    run.blind!.bluffsLeft = 1;
    run.blind!.stage = 'won';
    const total = computeCashout(run).reduce((a, l) => a + l.amount, 0);
    const premio = computeCashout(run)[0].amount;
    expect(total - premio).toBe(2 * 2 + 1);
  });

  it('Baralho da Féria começa com $10 a mais que o da Canga', () => {
    const a = newRun({ seed: 'FERIA', deckId: 'amarelo', stake: 1 });
    const b = newRun({ seed: 'FERIA', deckId: 'vermelho', stake: 1 });
    expect(a.money - b.money).toBe(10);
  });

  it('Baralho do Bicheiro: +1 slot de Coringa e −1 mão', () => {
    const run = newRun({ seed: 'BICHEIRO', deckId: 'preto', stake: 1 });
    const base = newRun({ seed: 'BICHEIRO', deckId: 'vermelho', stake: 1 });
    expect(run.jokerSlots).toBe(base.jokerSlots + 1);
  });
});
