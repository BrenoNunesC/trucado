import { describe, expect, it } from 'vitest';
import { makeCard, type Rank, type Suit } from '../src/engine/cards';
import { addJoker } from '../src/engine/inventory';
import { finishHand } from '../src/engine/blind';
import { selectBlind, newRun } from '../src/engine/run';
import { scoreHand } from '../src/engine/scoring';
import type { RunState } from '../src/engine/state';
import { createHand, playCard, type TrucoHand } from '../src/engine/truco';
import { fmtNum } from '../src/ui/text';

type F = [Rank, Suit];
const card = ([r, s]: F) => makeCard(r, s);

function setup(jokers: string[] = []): RunState {
  const run = newRun({ seed: 'FICHAS', deckId: 'vermelho', stake: 1 });
  for (const id of jokers) addJoker(run, id);
  selectBlind(run);
  return run;
}

function put(run: RunState, player: F[], ai: F[], vira: F): TrucoHand {
  const hand = createHand({ player: player.map(card), ai: ai.map(card), vira: card(vira), mao: 'player' });
  run.blind!.hand = hand;
  run.blind!.stage = 'playing';
  return hand;
}

/** Cartas de vitória do jogador: Q (vence o 4), 3 e 4 (vira Q, manilha J). */
const PLAYER_Q_WINS: F[] = [['Q', 'ouros'], ['3', 'ouros'], ['4', 'ouros']];
const AI_LOSES: F[] = [['4', 'copas'], ['5', 'copas'], ['6', 'copas']];
const VIRA: F = ['Q', 'copas'];

/** Chips a mais que o Coringa dá na mesma mão (com e sem ele). */
function chipsGained(jokerId: string, player: F[], ai: F[], prepare?: (run: RunState, hand: TrucoHand) => void): number {
  const base = setup();
  const hb = put(base, player, ai, VIRA);
  prepare?.(base, hb);
  playCard(hb, 'player', hb.hands.player[0].id);
  playCard(hb, 'ai', hb.hands.ai[0].id);
  const without = scoreHand(base, base.blind!, hb).chips;

  const run = setup([jokerId]);
  const hand = put(run, player, ai, VIRA);
  prepare?.(run, hand);
  playCard(hand, 'player', hand.hands.player[0].id);
  playCard(hand, 'ai', hand.hands.ai[0].id);
  return scoreHand(run, run.blind!, hand).chips - without;
}

describe('Coringas de Fichas novos', () => {
  it('Figurão: +30 Fichas por rodada vencida com figura', () => {
    expect(chipsGained('figurao', PLAYER_Q_WINS, AI_LOSES)).toBe(30);
  });

  it('Figurão não pontua sem figura vencedora', () => {
    const player: F[] = [['4', 'ouros'], ['3', 'ouros'], ['2', 'ouros']];
    expect(chipsGained('figurao', player, AI_LOSES)).toBe(0);
  });

  it('Sabichão: +40 Fichas por rodada vencida com Ás', () => {
    const player: F[] = [['A', 'ouros'], ['3', 'ouros'], ['2', 'ouros']];
    expect(chipsGained('sabichao', player, AI_LOSES)).toBe(40);
  });

  it('Pedra Bruta: +25 Fichas se a carta vencedora tem Edição ou Selo', () => {
    const selo = (_run: RunState, hand: TrucoHand) => {
      hand.hands.player[0].seal = 'azul';
    };
    expect(chipsGained('pedraBruta', PLAYER_Q_WINS, AI_LOSES, selo)).toBe(25);
    expect(chipsGained('pedraBruta', PLAYER_Q_WINS, AI_LOSES)).toBe(0);
  });

  it('Cofrinho: +1 Fichas para cada $2', () => {
    expect(chipsGained('cofrinho', PLAYER_Q_WINS, AI_LOSES, (run) => (run.money = 10))).toBe(5);
  });

  it('Chaveiro: ganha +5 Fichas permanentes a cada mão vencida', () => {
    const run = setup(['chaveiro']);
    const hand = put(run, PLAYER_Q_WINS, AI_LOSES, VIRA);
    for (let r = 0; r < 2; r++) {
      playCard(hand, 'player', hand.hands.player[0].id);
      playCard(hand, 'ai', hand.hands.ai[0].id);
    }
    finishHand(run);
    expect(run.jokers[0].state.chips).toBe(5);
  });
});

describe('Formatação de pontuação', () => {
  it('mostra os dígitos completos acima de 1 bilhão', () => {
    expect(fmtNum(1_234_567_890)).toBe('1.234.567.890');
    expect(fmtNum(9_876_543_210_123)).toBe('9.876.543.210.123');
  });

  it('usa notação só depois da faixa de precisão do número', () => {
    expect(fmtNum(2e15)).toBe('2,00e15');
  });
});
