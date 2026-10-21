import { describe, expect, it } from 'vitest';
import { autoRun } from '../src/ai/autoplayer';
import { JOKERS } from '../src/data/jokers';
import { finishHand } from '../src/engine/blind';
import { makeCard, type Rank, type Suit } from '../src/engine/cards';
import { detectCategory } from '../src/engine/handFacts';
import { addJoker, applyConsumable, addConsumable } from '../src/engine/inventory';
import { collectCashout, newRun, selectBlind, skipBlind } from '../src/engine/run';
import { scoreHand } from '../src/engine/scoring';
import type { RunState } from '../src/engine/state';
import { bet, createHand, playCard, respond, type HandOptions, type TrucoHand } from '../src/engine/truco';

type F = [Rank, Suit];
const card = ([r, s]: F) => makeCard(r, s);

function setup(jokers: string[] = []): RunState {
  const run = newRun({ seed: 'TESTE', deckId: 'classico', stake: 1 });
  for (const id of jokers) addJoker(run, id);
  selectBlind(run);
  return run;
}

function put(run: RunState, player: F[], ai: F[], vira: F, options: HandOptions = {}, mao: 'player' | 'ai' = 'player'): TrucoHand {
  const hand = createHand({ player: player.map(card), ai: ai.map(card), vira: card(vira), mao, options });
  run.blind!.hand = hand;
  run.blind!.stage = 'playing';
  return hand;
}

/** Joga as cartas na ordem dada (índices na mão restante), respeitando a vez. */
function play(hand: TrucoHand, rounds: [number, number][]) {
  for (const [pi, ai] of rounds) {
    if (hand.phase === 'done') return;
    const order = hand.turn === 'player' ? (['player', 'ai'] as const) : (['ai', 'player'] as const);
    for (const side of order) playCard(hand, side, hand.hands[side][side === 'player' ? pi : ai].id);
  }
}

// vira Q → manilha J
const WIN_FECHOU: [F[], F[], F] = [
  [['3', 'ouros'], ['2', 'ouros'], ['4', 'ouros']],
  [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']],
  ['Q', 'copas'],
];

describe('Fichas × Mult', () => {
  it('Fechou sem aposta: (15 + 13 + 12) × 2 = 80', () => {
    const run = setup();
    const hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    const s = scoreHand(run, run.blind!, hand);
    expect(s.category).toBe('fechou');
    expect(s.chips).toBe(40);
    expect(s.mult).toBe(2);
    expect(s.total).toBe(80);
  });

  it('Truco aceito dobra o mult base; Seis triplica', () => {
    const run = setup();
    let hand = put(run, ...WIN_FECHOU);
    bet(hand, 'player');
    respond(hand, 'ai', 'accept');
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).total).toBe(160);

    hand = put(run, ...WIN_FECHOU);
    bet(hand, 'player');
    respond(hand, 'ai', 'raise');
    respond(hand, 'player', 'accept');
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).total).toBe(240);
  });

  it('manilha pontua 20 + bônus do naipe (Zap = 28)', () => {
    const run = setup();
    const hand = put(run, [['J', 'paus'], ['3', 'ouros'], ['4', 'ouros']], [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']], ['Q', 'copas']);
    play(hand, [[0, 0], [0, 0]]);
    const s = scoreHand(run, run.blind!, hand);
    expect(s.category).toBe('zap');
    // Zap nível 1: 30 fichas, 3 mult; cartas: 28 + 13
    expect(s.chips).toBe(30 + 28 + 13);
    expect(s.total).toBe((30 + 28 + 13) * 3);
  });

  it('nível da Jogada (Gíria) aumenta fichas e mult', () => {
    const run = setup();
    addConsumable(run, 'giria', 'giria_fechou');
    const uid = run.consumables.at(-1)!.uid;
    expect(applyConsumable(run, uid).ok).toBe(true);
    expect(run.levels.fechou).toBe(2);
    const hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    const s = scoreHand(run, run.blind!, hand);
    expect(s.chips).toBe(30 + 25);
    expect(s.mult).toBe(3);
  });
});

describe('Detecção de Jogadas', () => {
  const cases: { name: string; p: F[]; a: F[]; vira: F; plays: [number, number][]; expected: string; mao?: 'player' | 'ai' }[] = [
    { name: 'Pé de Mesa', p: [['3', 'ouros'], ['4', 'ouros'], ['2', 'ouros']], a: [['5', 'ouros'], ['A', 'ouros'], ['6', 'ouros']], vira: ['Q', 'copas'], plays: [[0, 0], [0, 0], [0, 0]], expected: 'peDeMesa' },
    { name: 'Virada', p: [['4', 'ouros'], ['3', 'ouros'], ['2', 'ouros']], a: [['A', 'ouros'], ['5', 'ouros'], ['6', 'ouros']], vira: ['Q', 'copas'], plays: [[0, 0], [0, 0], [0, 0]], expected: 'virada' },
    { name: 'Canga Vencida', p: [['K', 'ouros'], ['3', 'ouros'], ['4', 'ouros']], a: [['K', 'paus'], ['5', 'ouros'], ['6', 'ouros']], vira: ['Q', 'copas'], plays: [[0, 0], [0, 0]], expected: 'cangaVencida' },
    { name: 'Casal de Manilhas', p: [['J', 'ouros'], ['J', 'espadas'], ['4', 'ouros']], a: [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']], vira: ['Q', 'copas'], plays: [[0, 0], [0, 0]], expected: 'casalManilhas' },
    { name: 'Casal Maior', p: [['J', 'paus'], ['J', 'copas'], ['4', 'ouros']], a: [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']], vira: ['Q', 'copas'], plays: [[0, 0], [0, 0]], expected: 'casalMaior' },
    { name: 'Trinca', p: [['3', 'ouros'], ['3', 'copas'], ['3', 'paus']], a: [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']], vira: ['Q', 'copas'], plays: [[0, 0], [0, 0]], expected: 'trinca' },
    { name: 'Três Manilhas', p: [['J', 'ouros'], ['J', 'copas'], ['J', 'espadas']], a: [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']], vira: ['Q', 'copas'], plays: [[0, 0], [0, 0]], expected: 'tresManilhas' },
  ];
  it.each(cases)('$name', ({ p, a, vira, plays, expected }) => {
    const run = setup();
    const hand = put(run, p, a, vira);
    play(hand, plays);
    expect(hand.result?.winner).toBe('player');
    expect(detectCategory(hand)).toBe(expected);
  });

  it('Arregou quando o adversário corre', () => {
    const run = setup();
    const hand = put(run, ...WIN_FECHOU);
    bet(hand, 'player');
    respond(hand, 'ai', 'run');
    const s = scoreHand(run, run.blind!, hand);
    expect(s.category).toBe('arregou');
    expect(s.total).toBe(10 * 2); // sem rodadas, aposta não aceita → ×1
  });
});

describe('Coringas', () => {
  it('existem pelo menos 40, com ids únicos e descrição', () => {
    expect(JOKERS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(JOKERS.map((j) => j.id)).size).toBe(JOKERS.length);
    for (const j of JOKERS) expect(j.description({ uid: 'x', id: j.id, state: j.initialState?.() ?? {}, cost: 1 }).length).toBeGreaterThan(3);
  });

  it('ordem importa: +Mult antes de ×Mult rende mais', () => {
    const a = setup(['pinguco', 'mula']);
    let hand = put(a, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(a, a.blind!, hand).total).toBe(40 * (2 + 4) * 3);

    const b = setup(['mula', 'pinguco']);
    hand = put(b, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(b, b.blind!, hand).total).toBe(40 * (2 * 3 + 4));
  });

  it('Boto Cor-de-Rosa copia o Coringa à direita', () => {
    const run = setup(['boto', 'paoDeQueijo']);
    const hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).chips).toBe(40 + 25 + 25);
  });

  it('naipe: Ourives dá +3 Mult por rodada vencida com Ouros', () => {
    const run = setup(['ourives']);
    const hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).mult).toBe(2 + 3 + 3);
  });

  it('Saci escala a cada Fechou', () => {
    const run = setup(['saci']);
    for (let i = 1; i <= 2; i++) {
      const hand = put(run, ...WIN_FECHOU);
      play(hand, [[0, 0], [0, 0]]);
      expect(scoreHand(run, run.blind!, hand).mult).toBe(2 + 2 * i);
    }
  });

  it('Mestre-Sala repete a carta da 1ª rodada; Zé do Caixão repete todas 2×', () => {
    let run = setup(['mestreSala']);
    let hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).chips).toBe(15 + 13 * 2 + 12);

    run = setup(['zeDoCaixao']);
    hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).chips).toBe(15 + 13 * 3 + 12 * 3);
  });

  it('Coronel do Truco: ×2 só com Seis ou mais', () => {
    const run = setup(['coronel']);
    let hand = put(run, ...WIN_FECHOU);
    bet(hand, 'player');
    respond(hand, 'ai', 'accept');
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).mult).toBe(4);
    hand = put(run, ...WIN_FECHOU);
    bet(hand, 'player');
    respond(hand, 'ai', 'raise');
    respond(hand, 'player', 'accept');
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).mult).toBe(2 * 3 * 2);
  });

  it('Tio do Pavê paga $2 por canga mesmo perdendo', () => {
    const run = setup(['tioDoPave']);
    const hand = put(run, [['K', 'ouros'], ['4', 'ouros'], ['5', 'ouros']], [['K', 'paus'], ['3', 'ouros'], ['2', 'ouros']], ['Q', 'copas']);
    play(hand, [[0, 0], [0, 0]]);
    expect(hand.result?.winner).toBe('ai');
    const before = run.money;
    finishHand(run);
    expect(run.money).toBe(before + 2);
  });

  it('Bolinho de Chuva perde fichas e some', () => {
    const run = setup(['bolinho']);
    run.jokers[0].state.chips = 5;
    const hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    finishHand(run);
    expect(run.jokers).toHaveLength(0);
  });
});

describe('Edições e selos', () => {
  it('Folheada +20 fichas, Holográfica +4 mult, Fosforescente ×1.5', () => {
    const run = setup();
    const hand = put(run, ...WIN_FECHOU);
    hand.hands.player[0].edition = 'folheada';
    hand.hands.player[1].edition = 'holografica';
    play(hand, [[0, 0], [0, 0]]);
    const s = scoreHand(run, run.blind!, hand);
    expect(s.chips).toBe(40 + 20);
    expect(s.mult).toBe(2 + 4);

    const h2 = put(run, ...WIN_FECHOU);
    h2.hands.player[0].edition = 'fosforescente';
    play(h2, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, h2).mult).toBe(3);
  });

  it('Selo Vermelho repete a carta; Selo Dourado dá $2', () => {
    const run = setup();
    const hand = put(run, ...WIN_FECHOU);
    hand.hands.player[0].seal = 'vermelho';
    hand.hands.player[1].seal = 'dourado';
    const before = run.money;
    play(hand, [[0, 0], [0, 0]]);
    const s = scoreHand(run, run.blind!, hand);
    expect(s.chips).toBe(15 + 13 * 2 + 12);
    expect(run.money).toBe(before + 2);
  });

  it('A Benzedeira: Copas não pontua', () => {
    const run = setup();
    run.blind!.rules.debuffSuit = 'copas';
    const hand = put(run, [['3', 'copas'], ['2', 'ouros'], ['4', 'ouros']], WIN_FECHOU[1], WIN_FECHOU[2]);
    play(hand, [[0, 0], [0, 0]]);
    expect(scoreHand(run, run.blind!, hand).chips).toBe(15 + 12);
  });
});

describe('Blind e economia', () => {
  it('perder com aposta aceita custa dinheiro; Zé Pilintra cobre a primeira', () => {
    const lose = (run: RunState) => {
      const hand = put(run, WIN_FECHOU[1], WIN_FECHOU[0], WIN_FECHOU[2]);
      bet(hand, 'player');
      respond(hand, 'ai', 'accept');
      play(hand, [[0, 0], [0, 0]]);
      return finishHand(run);
    };
    const run = setup();
    run.money = 10;
    expect(lose(run).moneyLost).toBe(1);
    expect(run.money).toBe(9);

    const ze = setup(['zePilintra']);
    ze.money = 10;
    lose(ze);
    expect(ze.money).toBe(10);
    lose(ze);
    expect(ze.money).toBe(9);
  });

  it('bater a meta vence o Blind e paga recompensa + mãos + juros', () => {
    const run = setup();
    run.money = 10;
    run.blind!.info.target = 50;
    const hand = put(run, ...WIN_FECHOU);
    play(hand, [[0, 0], [0, 0]]);
    finishHand(run);
    expect(run.blind!.stage).toBe('won');
    const lines = run.blind!.cashout!;
    expect(lines[0].amount).toBe(3);
    expect(lines.some((l) => l.label.includes('Juros') && l.amount === 2)).toBe(true);
    collectCashout(run);
    expect(run.phase).toBe('shop');
    expect(run.shop).not.toBeNull();
  });

  it('pular o Blind dá a Tag', () => {
    const run = newRun({ seed: 'PULO', deckId: 'classico', stake: 1 });
    run.blinds[0].tagId = 'caixinha';
    const m = run.money;
    skipBlind(run);
    expect(run.money).toBe(m + 7);
    expect(run.blindIndex).toBe(1);
  });
});

describe('Determinismo', () => {
  it('a mesma seed produz a mesma run', () => {
    const a = autoRun(newRun({ seed: 'MESMA', deckId: 'classico', stake: 1 }));
    const b = autoRun(newRun({ seed: 'MESMA', deckId: 'classico', stake: 1 }));
    expect(a).toEqual(b);
  });

  it('runs automáticas de todos os decks terminam sem erro', () => {
    for (const deckId of ['classico', 'sujo', 'bar', 'compadre', 'rezado', 'bicho']) {
      for (let i = 0; i < 5; i++) {
        const r = autoRun(newRun({ seed: `D${deckId}${i}`, deckId, stake: 1 + (i % 8) }));
        expect(r.ante).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
