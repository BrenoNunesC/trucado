import { describe, expect, it } from 'vitest';
import {
  cardChips,
  compareCards,
  makeCard,
  manilhaFromVira,
  RANKS,
  standardDeck,
  strength,
  type Rank,
  type Suit,
} from '../src/engine/cards';
import { createRng, int, next, shuffle } from '../src/engine/rng';
import {
  bet,
  canBet,
  canPlayHidden,
  canRaise,
  createHand,
  handWinner,
  knownCards,
  playCard,
  respond,
  type RoundOutcome,
  type TrucoHand,
} from '../src/engine/truco';

const c = (rank: Rank, suit: Suit) => makeCard(rank, suit);

function hand(player: [Rank, Suit][], ai: [Rank, Suit][], vira: [Rank, Suit], mao: 'player' | 'ai' = 'player') {
  return createHand({
    player: player.map(([r, s]) => c(r, s)),
    ai: ai.map(([r, s]) => c(r, s)),
    vira: c(...vira),
    mao,
  });
}

/** Joga a i-ésima carta restante de cada lado, respeitando a vez. */
function playRound(h: TrucoHand, pi = 0, ai = 0) {
  const first = h.turn;
  const pick = (side: 'player' | 'ai', i: number) => h.hands[side][i].id;
  if (first === 'player') {
    playCard(h, 'player', pick('player', pi));
    playCard(h, 'ai', pick('ai', ai));
  } else {
    playCard(h, 'ai', pick('ai', ai));
    playCard(h, 'player', pick('player', pi));
  }
}

describe('RNG com seed', () => {
  it('é determinístico para a mesma seed', () => {
    const a = createRng('ZAPZAP42');
    const b = createRng('zapzap42');
    const xs = Array.from({ length: 5 }, () => next(a));
    const ys = Array.from({ length: 5 }, () => next(b));
    expect(xs).toEqual(ys);
  });
  it('seeds diferentes geram sequências diferentes', () => {
    expect(next(createRng('AAAA'))).not.toEqual(next(createRng('AAAB')));
  });
  it('int fica no intervalo e shuffle preserva elementos', () => {
    const r = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = int(r, 7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
    const arr = [1, 2, 3, 4, 5, 6];
    expect([...shuffle(r, [...arr])].sort()).toEqual(arr);
  });
});

describe('Ordem das cartas', () => {
  it('segue 4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3', () => {
    expect(RANKS).toEqual(['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3']);
    // manilha fora da comparação: usa a vira 3 (manilha 4) e compara de 5 em diante
    for (let i = 2; i < RANKS.length; i++) {
      expect(compareCards(c(RANKS[i], 'ouros'), c(RANKS[i - 1], 'paus'), '4')).toBeGreaterThan(0);
    }
  });
  it('baralho tem 40 cartas sem 8, 9 e 10', () => {
    const deck = standardDeck();
    expect(deck).toHaveLength(40);
    expect(deck.some((d) => ['8', '9', '10'].includes(d.rank as string))).toBe(false);
  });
  it('mesmo valor empata (canga) independente do naipe', () => {
    expect(compareCards(c('K', 'paus'), c('K', 'ouros'), '4')).toBe(0);
  });
});

describe('Vira e manilha', () => {
  it('manilha é o valor seguinte à vira', () => {
    expect(manilhaFromVira('7')).toBe('Q');
    expect(manilhaFromVira('Q')).toBe('J');
    expect(manilhaFromVira('A')).toBe('2');
    expect(manilhaFromVira('3')).toBe('4');
  });
  it('manilha vence o 3 e se desempata pelo naipe: Paus > Copas > Espadas > Ouros', () => {
    const m: Rank = '5';
    expect(compareCards(c('5', 'ouros'), c('3', 'paus'), m)).toBeGreaterThan(0);
    const order: Suit[] = ['ouros', 'espadas', 'copas', 'paus'];
    for (let i = 1; i < order.length; i++) {
      expect(strength(c('5', order[i]), m)).toBeGreaterThan(strength(c('5', order[i - 1]), m));
    }
  });
  it('fichas: 4=4 … 3=13 e manilha = 20 + bônus de naipe', () => {
    expect(cardChips(c('4', 'ouros'), 'K')).toBe(4);
    expect(cardChips(c('Q', 'ouros'), 'K')).toBe(8);
    expect(cardChips(c('3', 'ouros'), 'K')).toBe(13);
    expect(cardChips(c('K', 'ouros'), 'K')).toBe(20);
    expect(cardChips(c('K', 'espadas'), 'K')).toBe(22);
    expect(cardChips(c('K', 'copas'), 'K')).toBe(24);
    expect(cardChips(c('K', 'paus'), 'K')).toBe(28);
  });
});

describe('Vencedor da mão (tabela de cangas)', () => {
  const cases: [RoundOutcome[], ReturnType<typeof handWinner>][] = [
    [['player'], undefined],
    [['player', 'player'], 'player'],
    [['player', 'ai'], undefined],
    [['player', 'ai', 'ai'], 'ai'],
    [['player', 'ai', 'player'], 'player'],
    // empate na 1ª → quem vencer a 2ª
    [['tie', 'ai'], 'ai'],
    [['tie', 'player'], 'player'],
    // empate na 1ª e 2ª → decide a 3ª
    [['tie', 'tie'], undefined],
    [['tie', 'tie', 'ai'], 'ai'],
    // empate em todas → nula
    [['tie', 'tie', 'tie'], null],
    // empate na 2ª → vale a 1ª
    [['ai', 'tie'], 'ai'],
    [['player', 'tie'], 'player'],
    // empate na 3ª → vale a 1ª
    [['player', 'ai', 'tie'], 'player'],
    [['ai', 'player', 'tie'], 'ai'],
  ];
  it.each(cases)('%j → %s', (rounds, expected) => {
    expect(handWinner(rounds)).toBe(expected);
  });
});

describe('Resolução de rodadas na mão', () => {
  it('jogador vence em duas rodadas diretas', () => {
    const h = hand(
      [['3', 'ouros'], ['2', 'ouros'], ['4', 'ouros']],
      [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']],
      ['Q', 'copas'], // manilha J
    );
    playRound(h);
    expect(h.rounds[0].outcome).toBe('player');
    playRound(h);
    expect(h.phase).toBe('done');
    expect(h.result).toMatchObject({ winner: 'player', points: 1, reason: 'rounds' });
  });

  it('quem vence a rodada abre a próxima', () => {
    const h = hand(
      [['4', 'ouros'], ['3', 'ouros'], ['2', 'ouros']],
      [['A', 'ouros'], ['5', 'ouros'], ['6', 'ouros']],
      ['Q', 'copas'],
    );
    playRound(h); // 4 × A → ai vence
    expect(h.rounds[0].outcome).toBe('ai');
    expect(h.turn).toBe('ai');
  });

  it('após canga, quem abriu a rodada empatada abre a próxima', () => {
    const h = hand(
      [['K', 'ouros'], ['3', 'ouros'], ['4', 'ouros']],
      [['K', 'paus'], ['5', 'ouros'], ['6', 'ouros']],
      ['Q', 'copas'],
      'ai',
    );
    playRound(h);
    expect(h.rounds[0].outcome).toBe('tie');
    expect(h.turn).toBe('ai');
    playRound(h); // ai joga 5, player joga 3 → player vence e leva a mão
    expect(h.result?.winner).toBe('player');
  });

  it('mão nula quando tudo empata', () => {
    const h = hand(
      [['K', 'ouros'], ['A', 'ouros'], ['2', 'ouros']],
      [['K', 'paus'], ['A', 'paus'], ['2', 'paus']],
      ['4', 'copas'], // manilha 5
    );
    playRound(h);
    playRound(h);
    playRound(h);
    expect(h.result).toMatchObject({ winner: null, points: 0, reason: 'null' });
  });

  it('vira rotativa troca a manilha a cada rodada', () => {
    const h = createHand({
      player: [c('4', 'ouros'), c('5', 'ouros'), c('6', 'ouros')],
      ai: [c('7', 'ouros'), c('Q', 'ouros'), c('J', 'ouros')],
      vira: c('3', 'paus'),
      mao: 'player',
      houseDeck: [c('5', 'paus'), c('4', 'paus')],
      options: { rotatingVira: true },
    });
    expect(h.manilha).toBe('4');
    playRound(h); // 4♦ é manilha → player vence
    expect(h.rounds[0].outcome).toBe('player');
    expect(h.manilha).toBe('5'); // vira 4♣
  });

  it('tieWinner transforma canga em vitória do adversário', () => {
    const h = createHand({
      player: [c('K', 'ouros'), c('K', 'copas'), c('4', 'ouros')],
      ai: [c('K', 'paus'), c('K', 'espadas'), c('5', 'ouros')],
      vira: c('Q', 'copas'),
      mao: 'player',
      options: { tieWinner: 'ai' },
    });
    playRound(h);
    playRound(h);
    expect(h.result?.winner).toBe('ai');
  });
});

describe('Apostas', () => {
  const base = () =>
    hand(
      [['3', 'ouros'], ['2', 'ouros'], ['4', 'ouros']],
      [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']],
      ['Q', 'copas'],
    );

  it('truco aceito faz a mão valer 3', () => {
    const h = base();
    bet(h, 'player');
    expect(h.phase).toBe('respond');
    respond(h, 'ai', 'accept');
    playRound(h);
    playRound(h);
    expect(h.result?.points).toBe(3);
  });

  it('correr do truco dá 1 ponto ao apostador', () => {
    const h = base();
    bet(h, 'player');
    respond(h, 'ai', 'run');
    expect(h.result).toMatchObject({ winner: 'player', points: 1, reason: 'run', ranAway: 'ai' });
  });

  it('aumentar: truco → seis, correr do seis dá 3', () => {
    const h = base();
    bet(h, 'player');
    respond(h, 'ai', 'raise');
    expect(h.pending).toEqual({ by: 'ai', level: 2 });
    respond(h, 'player', 'run');
    expect(h.result).toMatchObject({ winner: 'ai', points: 3 });
  });

  it('escada completa até doze e não passa disso', () => {
    const h = base();
    bet(h, 'player'); // truco
    respond(h, 'ai', 'raise'); // seis
    respond(h, 'player', 'raise'); // nove
    respond(h, 'ai', 'raise'); // doze
    expect(canRaise(h, 'player')).toBe(false);
    respond(h, 'player', 'accept');
    expect(h.level).toBe(4);
    expect(canBet(h, 'player')).toBe(false);
    playRound(h);
    playRound(h);
    expect(h.result?.points).toBe(12);
  });

  it('quem fez a última aposta aceita não pode aumentar de novo', () => {
    const h = base();
    bet(h, 'player');
    respond(h, 'ai', 'accept');
    expect(canBet(h, 'player')).toBe(false);
    playCard(h, 'player', h.hands.player[2].id); // 4♦ perde
    expect(canBet(h, 'ai')).toBe(true);
  });

  it('não pode apostar fora da vez nem com noBets', () => {
    const h = base();
    expect(canBet(h, 'ai')).toBe(false);
    const quiet = createHand({
      player: [c('4', 'ouros')],
      ai: [c('5', 'ouros')],
      vira: c('Q', 'copas'),
      mao: 'player',
      options: { noBets: true },
    });
    expect(canBet(quiet, 'player')).toBe(false);
    expect(() => bet(quiet, 'player')).toThrow();
  });
});

describe('Carta virada (encoberta)', () => {
  // vira Q → manilha J
  const mk = () =>
    hand(
      [['3', 'ouros'], ['3', 'copas'], ['4', 'ouros']],
      [['5', 'ouros'], ['6', 'ouros'], ['7', 'ouros']],
      ['Q', 'copas'],
    );

  it('não pode ser jogada na 1ª rodada', () => {
    const h = mk();
    expect(canPlayHidden(h, 'player')).toBe(false);
    expect(() => playCard(h, 'player', h.hands.player[0].id, true)).toThrow();
  });

  it('não vale nada: perde até um 3 contra um 5', () => {
    const h = mk();
    playRound(h); // 3 × 5: jogador vence a 1ª
    expect(canPlayHidden(h, 'player')).toBe(true);
    playCard(h, 'player', h.hands.player[0].id, true); // 3 de copas virado
    playCard(h, 'ai', h.hands.ai[0].id); // 6
    expect(h.rounds[1].outcome).toBe('ai');
    expect(h.rounds[1].hidden?.player).toBe(true);
  });

  it('duas cartas viradas dão canga', () => {
    const h = mk();
    playRound(h);
    playCard(h, 'player', h.hands.player[0].id, true);
    // a IA não costuma virar, mas o motor aceita dos dois lados
    playCard(h, 'ai', h.hands.ai[0].id, true);
    expect(h.rounds[1].outcome).toBe('tie');
    // canga na 2ª depois de vencer a 1ª: mão do jogador
    expect(h.result?.winner).toBe('player');
  });

  it('o adversário não enxerga a carta virada', () => {
    const h = mk();
    playRound(h);
    const covered = h.hands.player[0];
    playCard(h, 'player', covered.id, true);
    expect(knownCards(h, 'ai').some((k) => k.id === covered.id)).toBe(false);
    expect(knownCards(h, 'player').some((k) => k.id === covered.id)).toBe(true);
  });
});
