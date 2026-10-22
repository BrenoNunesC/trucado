import { describe, expect, it } from 'vitest';
import { decide, PERSONALITIES } from '../src/ai/opponent';
import { equity } from '../src/ai/sim';
import { blindTarget } from '../src/data/balance';
import { JOKERS } from '../src/data/jokers';
import { bluff, canBluff } from '../src/engine/blind';
import { makeCard } from '../src/engine/cards';
import { dealFree, freeAiStep, freeBet, freeNext, freeOnze, freePlay, freeRespond, newFreeMatch } from '../src/engine/free';
import { addConsumable, applyConsumable } from '../src/engine/inventory';
import { createRng } from '../src/engine/rng';
import { gainTag, newRun, selectBlind } from '../src/engine/run';
import { buyItem, buyPack, generateShop, pickFromPack, reroll, rerollCost } from '../src/engine/shop';
import { actor, createHand } from '../src/engine/truco';

describe('Modo livre', () => {
  it('uma partida inteira termina com alguém em 12+', () => {
    const m = newFreeMatch('LIVRE', 'equilibrado', true, true);
    const rng = createRng(3);
    for (let guard = 0; guard < 3000 && m.stage !== 'over'; guard++) {
      if (m.stage === 'onze') freeOnze(m, true);
      else if (m.stage === 'handOver') freeNext(m);
      else if (actor(m.hand) === 'ai') freeAiStep(m);
      else {
        const a = decide(m.hand, 'player', PERSONALITIES.calculista, rng).action;
        if (a.type === 'play') freePlay(m, a.cardId);
        else if (a.type === 'bet') freeBet(m);
        else freeRespond(m, a.response);
      }
    }
    expect(m.stage).toBe('over');
    expect(Math.max(m.score.player, m.score.ai)).toBeGreaterThanOrEqual(12);
  });

  it('Mão de Onze: correr dá 1 ponto ao adversário', () => {
    const m = newFreeMatch('ONZE', 'equilibrado', true, false);
    m.score.player = 11;
    dealFree(m);
    expect(m.stage).toBe('onze');
    expect(m.hand.options.noBets).toBe(true);
    freeOnze(m, false);
    expect(m.score.ai).toBe(1);
  });
});

describe('IA não trapaceia', () => {
  it('a equidade não muda se trocarmos as cartas escondidas do jogador', () => {
    const mk = (p: [string, string][]) =>
      createHand({
        player: p.map(([r, s]) => makeCard(r as never, s as never)),
        ai: [makeCard('3', 'ouros'), makeCard('4', 'ouros'), makeCard('5', 'ouros')],
        vira: makeCard('Q', 'copas'),
        mao: 'ai',
      });
    const a = mk([['J', 'paus'], ['J', 'copas'], ['3', 'paus']]);
    const b = mk([['4', 'paus'], ['5', 'copas'], ['6', 'paus']]);
    expect(equity(a, 'ai', createRng(7), 200)).toBeCloseTo(equity(b, 'ai', createRng(7), 200), 10);
  });

  it('com Zap, Copas e 3 a IA se vê favorita', () => {
    const strong = createHand({
      player: [makeCard('4', 'ouros'), makeCard('5', 'ouros'), makeCard('6', 'ouros')],
      ai: [makeCard('J', 'paus'), makeCard('J', 'copas'), makeCard('3', 'paus')],
      vira: makeCard('Q', 'copas'),
      mao: 'ai',
    });
    const d = decide(strong, 'ai', PERSONALITIES.calculista, createRng(1));
    expect(d.equity).toBeGreaterThan(0.85);
  });
});

describe('Loja e economia', () => {
  it('rolar fica mais caro a cada uso', () => {
    const run = newRun({ seed: 'LOJA', deckId: 'classico', stake: 1 });
    run.money = 100;
    generateShop(run);
    const c1 = rerollCost(run);
    reroll(run);
    expect(rerollCost(run)).toBe(c1 + 1);
    expect(run.money).toBe(100 - c1);
  });

  it('comprar Coringa desconta o preço e ocupa slot; sem dinheiro falha', () => {
    const run = newRun({ seed: 'LOJA2', deckId: 'classico', stake: 1 });
    generateShop(run);
    run.shop!.items[0] = { kind: 'joker', id: 'pinguco', price: 4 };
    run.money = 3;
    expect(buyItem(run, 0).ok).toBe(false);
    run.money = 10;
    expect(buyItem(run, 0).ok).toBe(true);
    expect(run.money).toBe(6);
    expect(run.jokers[0].id).toBe('pinguco');
  });

  it('pacote abre opções e a escolha vai para o inventário', () => {
    const run = newRun({ seed: 'PACK', deckId: 'classico', stake: 1 });
    run.money = 50;
    generateShop(run);
    run.shop!.packs[0] = { id: 'coringas', price: 5 };
    expect(buyPack(run, 0).ok).toBe(true);
    expect(run.pack?.options).toHaveLength(2);
    expect(pickFromPack(run, 0).ok).toBe(true);
    expect(run.pack).toBeNull();
    expect(run.jokers).toHaveLength(1);
  });

  it('Tags de loja: Camelô dá Coringa Incomum grátis', () => {
    const run = newRun({ seed: 'TAG', deckId: 'classico', stake: 1 });
    gainTag(run, 'incomum');
    generateShop(run);
    const free = run.shop!.items.find((i) => i.price === 0 && i.kind === 'joker');
    expect(free).toBeTruthy();
  });

  it('Tarô O Garçom muda o naipe das cartas escolhidas', () => {
    const run = newRun({ seed: 'TARO', deckId: 'classico', stake: 1 });
    addConsumable(run, 'tarot', 'garcom');
    const targets = run.deck.filter((c) => c.suit === 'copas').slice(0, 3).map((c) => c.id);
    expect(applyConsumable(run, run.consumables[0].uid, targets).ok).toBe(true);
    for (const id of targets) expect(run.deck.find((c) => c.id === id)!.suit).toBe('paus');
  });

  it('blefe troca cartas e gasta 1 blefe', () => {
    const run = newRun({ seed: 'BLEFE', deckId: 'classico', stake: 1 });
    selectBlind(run);
    const b = run.blind!;
    const hand = b.hand!;
    if (hand.turn === 'ai') return; // na 1ª mão o jogador é o mão
    expect(canBluff(run)).toBe(true);
    const out = hand.hands.player.slice(0, 2).map((c) => c.id);
    bluff(run, out);
    expect(b.bluffsLeft).toBe(b.rules.bluffs - 1);
    expect(hand.hands.player.some((c) => out.includes(c.id))).toBe(false);
    expect(hand.hands.player).toHaveLength(3);
  });

  it('metas crescem a cada Ante e Chefe > Grande > Pequeno', () => {
    for (let a = 1; a < 8; a++) expect(blindTarget(a + 1, 'pequeno')).toBeGreaterThan(blindTarget(a, 'pequeno'));
    expect(blindTarget(3, 'chefe')).toBeGreaterThan(blindTarget(3, 'grande'));
    expect(blindTarget(3, 'grande')).toBeGreaterThan(blindTarget(3, 'pequeno'));
  });

  it('há Coringas de todas as raridades', () => {
    for (const r of ['comum', 'incomum', 'raro', 'lendario']) expect(JOKERS.some((j) => j.rarity === r)).toBe(true);
  });
});

describe('Adversários e chefes', () => {
  it('Pequeno e Grande têm personagens diferentes; Ante 8 traz um chefe final', async () => {
    const { BOSS_BY_ID } = await import('../src/data/bosses');
    const { generateAnte } = await import('../src/engine/run');
    const run = newRun({ seed: 'ELENCO', deckId: 'classico', stake: 1 });
    const [p, g, c] = run.blinds;
    expect(p.opponentId).toBeTruthy();
    expect(p.opponentId).not.toBe(g.opponentId);
    expect(BOSS_BY_ID[c.bossId!].finale).toBeFalsy();
    run.ante = 8;
    generateAnte(run);
    expect(BOSS_BY_ID[run.blinds[2].bossId!].finale).toBe(true);
  });

  it('limite de aposta: com maxLevel 1 ninguém aumenta além do Truco', async () => {
    const { bet, canRaise } = await import('../src/engine/truco');
    const c = (r: '4' | '5' | '6' | '7', s: 'ouros' | 'copas') => makeCard(r, s, `${r}${s}`);
    const hand = createHand({
      player: [c('4', 'ouros'), c('5', 'ouros'), c('6', 'ouros')],
      ai: [c('4', 'copas'), c('5', 'copas'), c('6', 'copas')],
      vira: c('7', 'ouros'),
      mao: 'player',
      options: { maxLevel: 1 },
    });
    bet(hand, 'player');
    expect(canRaise(hand, 'ai')).toBe(false);
  });
});

describe('A vira sai do baralho do jogador', () => {
  const novaRun = (deckRank: '5' | '4') => {
    const run = newRun({ seed: 'VIRA', deckId: 'classico', stake: 1 });
    run.deck = Array.from({ length: 14 }, () => makeCard(deckRank, 'ouros'));
    selectBlind(run);
    return run;
  };

  it('a vira e a mão vêm do monte do jogador', () => {
    const run = novaRun('5');
    const hand = run.blind!.hand!;
    expect(hand.vira.rank).toBe('5');
    // só existem 5 no baralho: o 6 e os seguintes são pulados até voltar ao próprio 5
    expect(hand.manilha).toBe('5');
    expect(run.deck.some((c) => c.id === hand.vira.id)).toBe(true);
    expect(run.blind!.drawPile.length).toBe(14 - 4); // 3 da mão + 1 da vira
    // a casa não segura uma carta igual à vira
    expect(hand.hands.ai.some((c) => c.rank === '5' && c.suit === 'ouros')).toBe(false);
  });

  it('a vira volta ao descarte no fim da mão', async () => {
    const { fold } = await import('../src/engine/truco');
    const { finishHand } = await import('../src/engine/blind');
    const run = novaRun('5');
    const blind = run.blind!;
    const vira = blind.hand!.vira;
    fold(blind.hand!, 'player');
    finishHand(run);
    expect(blind.discard.some((c) => c.id === vira.id)).toBe(true);
    expect(blind.discard.length).toBe(4);
  });

  it('com vira rotativa, as próximas viradas também saem do monte e voltam', async () => {
    const { fold } = await import('../src/engine/truco');
    const { dealHand, finishHand } = await import('../src/engine/blind');
    const run = novaRun('4');
    const blind = run.blind!;
    blind.rules.rotatingVira = true;
    const hand = dealHand(run);
    expect(hand.houseDeck.length).toBe(2);
    expect(hand.houseDeck.every((c) => run.deck.some((d) => d.id === c.id))).toBe(true);
    const guardadas = hand.houseDeck.map((c) => c.id);
    fold(hand, 'player');
    finishHand(run);
    for (const id of guardadas) expect(blind.discard.some((c) => c.id === id)).toBe(true);
  });
});

describe('Vouchers novos', () => {
  const nova = () => newRun({ seed: 'VOUCHER', deckId: 'classico', stake: 1 });

  it('Cortesia da Casa, Prateleira e Balcão Cheio mudam a loja', () => {
    const run = nova();
    run.vouchers.push('cortesia', 'prateleira', 'vitrine', 'balcaoCheio');
    const shop = generateShop(run);
    expect(shop.freeRerolls).toBeGreaterThanOrEqual(1);
    expect(shop.packs.length).toBe(3);
    expect(shop.items.length).toBe(2 + 1 + 1);
  });

  it('Fiado Eterno corta 40% no total (e substitui a Liquidação)', async () => {
    const { price } = await import('../src/engine/shop');
    const run = nova();
    expect(price(run, 10)).toBe(10);
    run.vouchers.push('liquidacao');
    expect(price(run, 10)).toBe(7);
    run.vouchers.push('fiadoEterno');
    expect(price(run, 10)).toBe(6);
  });

  it('vouchers de nível 2 só aparecem depois do nível 1', () => {
    const nivel2 = ['balcaoCheio', 'fiadoEterno', 'gorjetao', 'mesaRedonda', 'caraDeMadeira', 'setteVidas'];
    for (let i = 0; i < 40; i++) {
      const run = newRun({ seed: `LOJA${i}`, deckId: 'classico', stake: 1 });
      const id = generateShop(run).voucher?.id;
      expect(nivel2).not.toContain(id);
    }
  });

  it('Mão Cheia: o blefe troca até 3 cartas', () => {
    const run = nova();
    run.vouchers.push('maoCheia');
    selectBlind(run);
    const ids = run.blind!.hand!.hands.player.map((c) => c.id);
    expect(() => bluff(run, ids)).not.toThrow();
    expect(run.blind!.hand!.hands.player.length).toBe(3);

    const sem = nova();
    selectBlind(sem);
    expect(() => bluff(sem, sem.blind!.hand!.hands.player.map((c) => c.id))).toThrow();
  });

  it('Olho Vivo: uma carta do adversário fica sempre visível', () => {
    const run = nova();
    run.vouchers.push('olhoVivo');
    selectBlind(run);
    expect(run.blind!.revealed).toBeTruthy();
    expect(run.blind!.hand!.hands.ai.some((c) => c.id === run.blind!.revealed)).toBe(true);
  });
});

describe('A manilha pula valores que não existem no baralho', () => {
  it('manilhaFromVira sem lista segue a ordem normal; com lista, pula os ausentes', async () => {
    const { manilhaFromVira } = await import('../src/engine/cards');
    expect(manilhaFromVira('3')).toBe('4'); // dá a volta
    expect(manilhaFromVira('4', ['5', '6'])).toBe('5');
    expect(manilhaFromVira('4', ['7', 'K'])).toBe('7'); // 5 e 6 não existem
    expect(manilhaFromVira('7', ['4', 'K'])).toBe('K'); // Q e J não existem
    expect(manilhaFromVira('A', ['4', 'A'])).toBe('4'); // 2 e 3 não existem: dá a volta
    expect(manilhaFromVira('5', ['5'])).toBe('5'); // só existe ele mesmo
  });

  it('numa mão da campanha, a manilha é sempre um valor do baralho', () => {
    const run = newRun({ seed: 'PULA', deckId: 'classico', stake: 1 });
    run.deck = [
      ...Array.from({ length: 7 }, () => makeCard('5', 'ouros')),
      ...Array.from({ length: 7 }, () => makeCard('7', 'copas')),
    ];
    selectBlind(run);
    const hand = run.blind!.hand!;
    expect(hand.manilha).toBe(hand.vira.rank === '5' ? '7' : '5');
    expect(['5', '7']).toContain(hand.manilha);
    expect(hand.log[0].text).toContain('manilha é');
  });

  it('a mão avisa no log quando pulou valores', () => {
    const c = (r: '4' | '5' | '6' | '7', s: 'ouros' | 'copas') => makeCard(r, s);
    const hand = createHand({
      player: [c('4', 'ouros'), c('5', 'ouros'), c('6', 'ouros')],
      ai: [c('4', 'copas'), c('5', 'copas'), c('6', 'copas')],
      vira: c('4', 'copas'),
      mao: 'player',
      options: { availableRanks: ['6', '7'] },
    });
    expect(hand.manilha).toBe('6');
    expect(hand.log[0].text).toContain('pulados');
  });
});
