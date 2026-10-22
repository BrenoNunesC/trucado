// Conteúdo da segunda leva: Coringas, Tarôs, Mandingas, Tags, vouchers, chefes e fregueses.

import { describe, expect, it } from 'vitest';
import { BOSSES } from '../src/data/bosses';
import { CONSUMABLE_BY_ID, CONSUMABLES } from '../src/data/consumables';
import { OPPONENTS } from '../src/data/opponents';
import { PACKS } from '../src/data/packs';
import { TAGS } from '../src/data/tags';
import { VOUCHERS } from '../src/data/vouchers';
import { buildRules, computeCashout, finishHand } from '../src/engine/blind';
import { makeCard, type Rank, type Suit } from '../src/engine/cards';
import { addConsumable, addJoker, applyConsumable } from '../src/engine/inventory';
import { gainTag, newRun, selectBlind } from '../src/engine/run';
import { scoreHand } from '../src/engine/scoring';
import { generateShop, rerollCost } from '../src/engine/shop';
import type { RunState } from '../src/engine/state';
import { createHand, playCard, type HandOptions, type TrucoHand } from '../src/engine/truco';
import { ART } from '../src/ui/components/Portrait';

type F = [Rank, Suit];
const card = ([r, s]: F) => makeCard(r, s);

function setup(jokers: string[] = []): RunState {
  const run = newRun({ seed: 'CONTEUDO', deckId: 'classico', stake: 1 });
  for (const id of jokers) addJoker(run, id);
  selectBlind(run);
  return run;
}

function put(run: RunState, player: F[], ai: F[], vira: F, options: HandOptions = {}): TrucoHand {
  const hand = createHand({ player: player.map(card), ai: ai.map(card), vira: card(vira), mao: 'player', options });
  run.blind!.hand = hand;
  run.blind!.stage = 'playing';
  return hand;
}

function play(hand: TrucoHand, rounds: [number, number][]) {
  for (const [pi, ai] of rounds) {
    if (hand.phase === 'done') return;
    const order = hand.turn === 'player' ? (['player', 'ai'] as const) : (['ai', 'player'] as const);
    for (const side of order) playCard(hand, side, hand.hands[side][side === 'player' ? pi : ai].id);
  }
}

// vira Q → manilha J. O jogador vence a 1ª e a 2ª rodada (Fechou: 40 fichas × 2 de Mult).
const FECHOU: [F[], F[], F] = [
  [['3', 'ouros'], ['2', 'ouros'], ['4', 'ouros']],
  [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']],
  ['Q', 'copas'],
];

function ganhar(run: RunState, f: [F[], F[], F] = FECHOU) {
  const hand = put(run, ...f);
  play(hand, [[0, 0], [0, 0]]);
  return scoreHand(run, run.blind!, hand);
}

describe('Coringas da segunda leva', () => {
  it('Padre Cícero: ×1.5 por rodada vencida', () => {
    expect(ganhar(setup(['padreCicero'])).total).toBe(Math.floor(40 * 2 * 1.5 * 1.5));
  });

  it('Ganancioso: +×0.25 por $10 (máx. ×3)', () => {
    const run = setup(['ganancioso']);
    run.money = 40;
    expect(ganhar(run).total).toBe(40 * 2 * 2); // 1 + 0.25 × 4
    run.money = 500;
    expect(ganhar(run).total).toBe(40 * 2 * 3); // teto
  });

  it('Mão-de-Vaca: ×2 só com baralho enxuto', () => {
    const run = setup(['maoDeVaca']);
    expect(ganhar(run).total).toBe(Math.floor(40 * 2 * 1.2));
    run.deck = run.deck.slice(0, 24);
    expect(ganhar(run).total).toBe(40 * 2 * 2);
  });

  it('Gerente do Bar: +4 Mult por Coringa à direita', () => {
    const run = setup(['gerente', 'pinguco', 'paoDeQueijo']);
    // Gerente: +8 Mult; Pinguço: +4 Mult; Pão de Queijo: +25 Fichas
    expect(ganhar(run).total).toBe((40 + 25) * (2 + 8 + 4));
  });

  it('Pipoca só conta as rodadas vencidas com 4, 5, 6 ou 7', () => {
    expect(ganhar(setup(['pipoca'])).total).toBe(40 * 2); // vencem o 3 e o 2: nada
    const baixas: [F[], F[], F] = [
      [['5', 'ouros'], ['6', 'ouros'], ['3', 'ouros']],
      [['4', 'copas'], ['4', 'espadas'], ['4', 'paus']],
      ['Q', 'copas'],
    ];
    const run = setup(['pipoca']);
    const hand = put(run, ...baixas);
    play(hand, [[0, 0], [0, 0]]); // 5 > 4 e 6 > 4
    const s = scoreHand(run, run.blind!, hand);
    // Fechou: 15 + (5 + 6) fichas; mult 2 + 4 + 4
    expect(s.total).toBe((15 + 5 + 6) * (2 + 8));
  });

  it('Passista: +10 Mult por rodada vencida com manilha', () => {
    const run = setup(['passista']);
    const hand = put(run, [['J', 'ouros'], ['3', 'ouros'], ['4', 'ouros']], FECHOU[1], FECHOU[2]);
    play(hand, [[0, 0], [0, 0]]);
    const s = scoreHand(run, run.blind!, hand);
    expect(s.mult).toBe(2 + 10);
  });

  it('Torcida Organizada: +2 Mult por mão vencida', () => {
    const run = setup(['torcida']);
    play(put(run, ...FECHOU), [[0, 0], [0, 0]]);
    finishHand(run);
    expect(run.jokers[0].state.m).toBe(2);
    expect(ganhar(run).total).toBe(40 * (2 + 2));
  });

  it('Brigadeiro: +$1 por mão vencida', () => {
    const run = setup(['brigadeiro']);
    run.money = 10;
    play(put(run, ...FECHOU), [[0, 0], [0, 0]]);
    finishHand(run);
    expect(run.money).toBe(11);
  });

  it('Carteiro e Quentinha dependem do momento do Blind', () => {
    const run = setup(['quentinha', 'carteiro']);
    expect(run.blind!.handsPlayed).toBe(1);
    expect(ganhar(run).total).toBe((40 + 40) * 2); // 1ª mão: Quentinha
    run.blind!.handsPlayed = 3;
    run.blind!.handsLeft = 0;
    expect(ganhar(run).total).toBe((40 + 50) * 2); // última mão: Carteiro
  });
});

describe('Tarôs e Mandingas da segunda leva', () => {
  const nova = () => newRun({ seed: 'MAIS', deckId: 'classico', stake: 1 });
  const usar = (run: RunState, id: string, alvos: string[] = []) => {
    addConsumable(run, CONSUMABLE_BY_ID[id].kind, id);
    return applyConsumable(run, run.consumables.at(-1)!.uid, alvos);
  };

  it('O Pedreiro sobe 2 valores (o 3 é o teto)', () => {
    const run = nova();
    const c4 = run.deck.find((c) => c.rank === '4')!;
    const c2 = run.deck.find((c) => c.rank === '2')!;
    expect(usar(run, 'pedreiro', [c4.id]).ok).toBe(true);
    expect(c4.rank).toBe('6');
    usar(run, 'pedreiro', [c2.id]);
    expect(c2.rank).toBe('3');
  });

  it('A Lavadeira limpa edição e selo e paga $2 por carta', () => {
    const run = nova();
    run.money = 0;
    const [a, b] = run.deck;
    a.edition = 'folheada';
    b.seal = 'dourado';
    expect(usar(run, 'lavadeira', [a.id, b.id]).ok).toBe(true);
    expect(a.edition).toBeUndefined();
    expect(b.seal).toBeUndefined();
    expect(run.money).toBe(4);
  });

  it('A Cartomante cobra $5 e dá uma Mandinga', () => {
    const run = nova();
    run.money = 4;
    expect(usar(run, 'cartomante').ok).toBe(false);
    run.consumables = [];
    run.money = 9;
    expect(usar(run, 'cartomante').ok).toBe(true);
    expect(run.money).toBe(4);
    expect(run.consumables.some((c) => CONSUMABLE_BY_ID[c.id].kind === 'mandinga')).toBe(true);
  });

  it('A Parteira adiciona um Ás e um 2', () => {
    const run = nova();
    const antes = run.deck.length;
    usar(run, 'parteira');
    expect(run.deck.length).toBe(antes + 2);
  });

  it('A Faxineira destrói 1 carta e paga $3', () => {
    const run = nova();
    run.money = 0;
    const antes = run.deck.length;
    expect(usar(run, 'faxineira', [run.deck[0].id]).ok).toBe(true);
    expect(run.deck.length).toBe(antes - 1);
    expect(run.money).toBe(3);
  });

  it('Seu Exu transforma cartas em 3 de Paus e corta o dinheiro pela metade', () => {
    const run = nova();
    run.money = 11;
    const c = run.deck.find((x) => x.rank === '4')!;
    expect(usar(run, 'exu', [c.id]).ok).toBe(true);
    expect([c.rank, c.suit]).toEqual(['3', 'paus']);
    expect(run.money).toBe(5);
  });

  it('Atabaque copia e destrói o mesmo tanto (o baralho não muda de tamanho)', () => {
    const run = nova();
    const alvos = run.deck.slice(0, 2);
    const antes = run.deck.length;
    expect(usar(run, 'atabaque', alvos.map((c) => c.id)).ok).toBe(true);
    expect(run.deck.length).toBe(antes);
  });

  it('Boneco de Pano copia o Coringa da esquerda e sacrifica outro', () => {
    const run = nova();
    addJoker(run, 'pinguco');
    addJoker(run, 'paoDeQueijo');
    addJoker(run, 'coxinha');
    expect(usar(run, 'bonecoDePano').ok).toBe(true);
    expect(run.jokers.filter((j) => j.id === 'pinguco').length).toBe(2);
    expect(run.jokers.length).toBe(3); // +1 cópia, −1 sacrificado
  });

  it('Sal Grosso só funciona se alguma carta tiver edição ou selo', () => {
    const run = nova();
    expect(usar(run, 'salGrosso').ok).toBe(false);
    run.consumables = [];
    run.deck[0].edition = 'holografica';
    run.money = 0;
    expect(usar(run, 'salGrosso').ok).toBe(true);
    expect(run.deck.some((c) => c.edition)).toBe(false);
    expect(run.money).toBe(1);
  });

  it('Água Benta dá +1 mão nos dois próximos Blinds', () => {
    const run = nova();
    usar(run, 'aguaBenta');
    expect(run.tags.filter((t) => t === 'folego').length).toBe(2);
    selectBlind(run);
    expect(run.blind!.rules.hands).toBe(5); // 4 de base + 1 do fôlego
    expect(run.blind!.handsLeft).toBe(4); // 5 menos a mão já distribuída
  });

  it('Pomba-Gira e Fogueira criam Coringas e cobram o preço', () => {
    const run = nova();
    run.money = 10;
    expect(usar(run, 'pomba').ok).toBe(true);
    expect(run.money).toBe(6);
    expect(run.jokers[0].edition).toBe('holografica');
    const antes = run.deck.length;
    expect(usar(run, 'fogueira').ok).toBe(true);
    expect(run.deck.length).toBe(antes - 4);
    expect(run.jokers.length).toBe(2);
  });

  it('O Palpite nunca deixa o dinheiro negativo', () => {
    const run = nova();
    run.money = 1;
    for (let i = 0; i < 20; i++) {
      run.consumables = [];
      usar(run, 'palpite');
      expect(run.money).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Chefes, fregueses, Tags, vouchers e pacotes novos', () => {
  it('todo chefe e todo freguês têm retrato e nomes únicos', () => {
    for (const b of BOSSES) expect(ART[b.id], `retrato do chefe ${b.id}`).toBeTruthy();
    for (const o of OPPONENTS) expect(ART[o.id], `retrato de ${o.id}`).toBeTruthy();
    expect(new Set(BOSSES.map((b) => b.id)).size).toBe(BOSSES.length);
    expect(new Set(BOSSES.map((b) => b.name)).size).toBe(BOSSES.length);
    expect(new Set(OPPONENTS.map((o) => o.name)).size).toBe(OPPONENTS.length);
  });

  it('todo chefe aplica suas regras e deixa o Blind jogável', () => {
    for (const b of BOSSES) {
      const run = newRun({ seed: 'CHEFES', deckId: 'classico', stake: 1 });
      addJoker(run, 'pinguco');
      const r = buildRules(run, { ...run.blinds[2], bossId: b.id });
      expect(r.hands, b.id).toBeGreaterThanOrEqual(1);
      expect(r.bluffs, b.id).toBeGreaterThanOrEqual(0);
    }
  });

  it('todo Tarô, Mandinga, Tag, voucher e pacote tem nome, texto e ícone', () => {
    for (const x of [...CONSUMABLES, ...TAGS, ...VOUCHERS, ...PACKS]) {
      expect(x.name.length, x.id).toBeGreaterThan(1);
      expect(x.description.length, x.id).toBeGreaterThan(5);
      expect(x.icon.length, x.id).toBeGreaterThan(0);
    }
    for (const v of VOUCHERS) if (v.requires) expect(VOUCHERS.some((o) => o.id === v.requires), v.id).toBe(true);
    expect(new Set(CONSUMABLES.map((c) => c.id)).size).toBe(CONSUMABLES.length);
    expect(new Set(VOUCHERS.map((v) => v.id)).size).toBe(VOUCHERS.length);
    expect(new Set(TAGS.map((t) => t.id)).size).toBe(TAGS.length);
  });

  it('as Tags novas funcionam', () => {
    const run = newRun({ seed: 'TAGS', deckId: 'classico', stake: 1 });
    addJoker(run, 'pinguco');
    addJoker(run, 'paoDeQueijo');
    run.money = 0;
    gainTag(run, 'gorjetaTag');
    expect(run.money).toBe(4);
    gainTag(run, 'cartasTag');
    expect(run.pack?.packId).toBe('cartasMega');
    run.pack = null;
    gainTag(run, 'blefe');
    selectBlind(run);
    expect(run.blind!.bluffsLeft).toBe(4);
  });

  it('Tag do Brilho traz um Coringa com edição de graça; Tag do Fiado corta o preço', () => {
    const run = newRun({ seed: 'LOJA2', deckId: 'classico', stake: 1 });
    run.tags.push('desconto', 'brilho');
    const shop = generateShop(run);
    const brilho = shop.items[shop.items.length - 1];
    expect(brilho.kind === 'joker' && brilho.edition).toBeTruthy();
    expect(brilho.price).toBe(0);
    expect(run.tags.length).toBe(0);
  });

  it('Cobrador soma $2 ao prêmio e Amigo do Dono baixa a rolagem', () => {
    const run = newRun({ seed: 'COBR', deckId: 'classico', stake: 1 });
    selectBlind(run);
    const base = computeCashout(run).reduce((a, l) => a + l.amount, 0);
    run.vouchers.push('cobrador');
    expect(computeCashout(run).reduce((a, l) => a + l.amount, 0)).toBe(base + 2);

    run.blind = null;
    const shop = generateShop(run);
    run.vouchers.push('garcomAmigo');
    const com2 = rerollCost(run);
    run.vouchers.push('amigoDoDono');
    expect(rerollCost(run)).toBe(Math.max(0, shop.rerollCost - 4));
    expect(rerollCost(run)).toBeLessThanOrEqual(com2);
  });

  it('Baralho Novo e Bolso Sem Fundo agem na compra', () => {
    const run = newRun({ seed: 'COMPRA', deckId: 'classico', stake: 1 });
    const v = VOUCHERS.find((x) => x.id === 'baralhoNovo')!;
    const antes = run.deck.length;
    v.onBuy!(run);
    expect(run.deck.length).toBe(antes + 4);
    const slots = run.consumableSlots;
    VOUCHERS.find((x) => x.id === 'bolsoSemFundo')!.onBuy!(run);
    expect(run.consumableSlots).toBe(slots + 1);
  });

  it('os baralhos novos começam do jeito descrito', () => {
    const paus = newRun({ seed: 'D1', deckId: 'paus', stake: 1 });
    expect(paus.deck.length).toBe(40);
    expect(paus.deck.every((c) => c.suit === 'paus')).toBe(true);
    expect(paus.jokers.map((j) => j.id)).toEqual(['lenhador']);

    const fiado = newRun({ seed: 'D2', deckId: 'fiado', stake: 1 });
    expect(fiado.money).toBe(0);
    expect(fiado.jokers.length).toBe(2);

    const enxuto = newRun({ seed: 'D3', deckId: 'enxuto', stake: 1 });
    expect(enxuto.deck.length).toBe(24);
    expect(enxuto.deck.some((c) => ['4', '5', '6', '7'].includes(c.rank))).toBe(false);
    expect(enxuto.jokers.map((j) => j.id)).toEqual(['maoDeVaca']);
  });
});

describe('Retratos realistas', () => {
  it('todo personagem com arte tem prompt em scripts/retratos/personagens.json', async () => {
    const { personagens } = (await import('../scripts/retratos/personagens.json')).default as { personagens: { id: string }[] };
    const comPrompt = new Set(personagens.map((p) => p.id));
    expect(Object.keys(ART).filter((id) => !comPrompt.has(id))).toEqual([]);
  });
});
