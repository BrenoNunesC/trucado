// Consumíveis: Tarô de Boteco (mexe nas cartas), Gírias (sobem Jogadas) e Mandingas (raros e arriscados).

import { EDITION_NAME, makeCard, RANKS, SEAL_NAME, SUITS, type Card, type Edition, type Seal, type Suit } from '../engine/cards';
import { int, pick, type Rng } from '../engine/rng';
import type { CategoryId, ConsumableKind, JokerEdition, Rarity, RunState } from '../engine/state';
import { MIN_DECK_SIZE } from './balance';
import { CATEGORIES } from './categories';

export interface UseCtx {
  run: RunState;
  /** Cartas do baralho escolhidas pelo jogador. */
  targets: Card[];
  rng: Rng;
  addJoker(opts: { rarity?: Rarity; id?: string; edition?: JokerEdition }): boolean;
  addConsumable(kind: ConsumableKind, id?: string): boolean;
  destroyCards(cards: Card[]): void;
  addCards(cards: Card[]): void;
  copyCard(card: Card): Card;
  message(text: string): void;
}

export interface ConsumableDef {
  id: string;
  kind: ConsumableKind;
  name: string;
  description: string;
  icon: string;
  /** Quantas cartas do baralho precisam ser escolhidas. */
  targets?: { min: number; max: number };
  /** Retorna o motivo se não puder usar agora. */
  blocked?: (run: RunState, targets: Card[]) => string | null;
  use: (ctx: UseCtx) => void;
  /** Para Gírias: a jogada que sobe. */
  category?: CategoryId;
}

function suitTarot(id: string, name: string, icon: string, suit: Suit, suitName: string): ConsumableDef {
  return {
    id,
    kind: 'tarot',
    name,
    icon,
    description: `Até 3 cartas escolhidas viram de ${suitName}.`,
    targets: { min: 1, max: 3 },
    use: (ctx) => {
      for (const c of ctx.targets) c.suit = suit;
      ctx.message(`${ctx.targets.length} carta(s) agora são de ${suitName}.`);
    },
  };
}

function editionTarot(id: string, name: string, icon: string, edition: Edition, max: number, effect: string): ConsumableDef {
  return {
    id,
    kind: 'tarot',
    name,
    icon,
    description: `Aplica a edição ${EDITION_NAME[edition]} (${effect}) em até ${max} carta(s).`,
    targets: { min: 1, max },
    use: (ctx) => {
      for (const c of ctx.targets) c.edition = edition;
      ctx.message(`Carta(s) ${EDITION_NAME[edition]}!`);
    },
  };
}

function sealMandinga(id: string, name: string, icon: string, seal: Seal, effect: string): ConsumableDef {
  return {
    id,
    kind: 'mandinga',
    name,
    icon,
    description: `Aplica o ${SEAL_NAME[seal]} (${effect}) em 1 carta.`,
    targets: { min: 1, max: 1 },
    use: (ctx) => {
      ctx.targets[0].seal = seal;
      ctx.message(`${SEAL_NAME[seal]} aplicado.`);
    },
  };
}

const deckTooSmall = (run: RunState, n: number) =>
  run.deck.length - n < MIN_DECK_SIZE ? `O baralho não pode ficar com menos de ${MIN_DECK_SIZE} cartas.` : null;

const TAROTS: ConsumableDef[] = [
  suitTarot('garcom', 'O Garçom', '🤵', 'paus', 'Paus'),
  suitTarot('namoradeira', 'A Namoradeira', '💋', 'copas', 'Copas'),
  suitTarot('valentao', 'O Valentão', '🥊', 'espadas', 'Espadas'),
  suitTarot('comerciante', 'O Comerciante', '🪙', 'ouros', 'Ouros'),
  {
    id: 'bebado',
    kind: 'tarot',
    name: 'O Bêbado',
    icon: '🥴',
    description: 'Sobe em 1 o valor de até 2 cartas (4→5 … 2→3; o 3 não sobe).',
    targets: { min: 1, max: 2 },
    use: (ctx) => {
      for (const c of ctx.targets) {
        const i = RANKS.indexOf(c.rank);
        if (i < RANKS.length - 1) c.rank = RANKS[i + 1];
      }
      ctx.message('As cartas subiram de valor. Hic!');
    },
  },
  {
    id: 'padre',
    kind: 'tarot',
    name: 'O Padre',
    icon: '⛪',
    description: 'Destrói até 2 cartas escolhidas do baralho.',
    targets: { min: 1, max: 2 },
    blocked: (run, t) => deckTooSmall(run, t.length),
    use: (ctx) => {
      ctx.destroyCards(ctx.targets);
      ctx.message('Que descansem em paz.');
    },
  },
  {
    id: 'cigana',
    kind: 'tarot',
    name: 'A Cigana',
    icon: '🧿',
    description: 'Cria uma cópia de 1 carta escolhida (com edição e selo).',
    targets: { min: 1, max: 1 },
    use: (ctx) => {
      ctx.addCards([ctx.copyCard(ctx.targets[0])]);
      ctx.message('A carta ganhou uma gêmea.');
    },
  },
  {
    id: 'juiz',
    kind: 'tarot',
    name: 'O Juiz',
    icon: '⚖️',
    description: 'Escolha 2 cartas: a primeira vira uma cópia da segunda.',
    targets: { min: 2, max: 2 },
    use: (ctx) => {
      const [a, b] = ctx.targets;
      a.rank = b.rank;
      a.suit = b.suit;
      a.edition = b.edition;
      a.seal = b.seal;
      ctx.message('Sentença dada.');
    },
  },
  editionTarot('joalheiro', 'O Joalheiro', '💍', 'folheada', 1, '+20 Fichas ao vencer rodada'),
  editionTarot('vidraceiro', 'O Vidraceiro', '🪟', 'holografica', 1, '+4 Mult ao vencer rodada'),
  editionTarot('fofoqueira', 'A Fofoqueira', '🗯️', 'marcada', 2, 'revela uma carta do adversário'),
  {
    id: 'ferreiro',
    kind: 'tarot',
    name: 'O Ferreiro',
    icon: '🔨',
    description: 'Transforma 1 carta escolhida num 3 (a carta comum mais forte), mantendo o naipe.',
    targets: { min: 1, max: 1 },
    use: (ctx) => {
      ctx.targets[0].rank = '3';
      ctx.message('Forjado na brasa: virou um 3!');
    },
  },
  {
    id: 'camelo',
    kind: 'tarot',
    name: 'O Camelô',
    icon: '🧳',
    description: 'Ganha $1 para cada Coringa que você tem (máx. $5).',
    use: (ctx) => {
      const n = Math.min(5, ctx.run.jokers.length);
      ctx.run.money += n;
      ctx.message(n > 0 ? `+$${n}. Olha o rapa!` : 'Nada para vender hoje.');
    },
  },
  {
    id: 'locutor',
    kind: 'tarot',
    name: 'O Locutor',
    icon: '📻',
    description: 'Muda o naipe de até 3 cartas para o naipe da primeira escolhida.',
    targets: { min: 2, max: 3 },
    use: (ctx) => {
      const suit = ctx.targets[0].suit;
      for (const c of ctx.targets) c.suit = suit;
      ctx.message('Alô, alô, ouvintes: naipes sintonizados!');
    },
  },
  {
    id: 'tesoureiro',
    kind: 'tarot',
    name: 'O Tesoureiro',
    icon: '🏦',
    description: 'Dobra seu dinheiro (máx. +$20).',
    use: (ctx) => {
      const gain = Math.min(20, Math.max(0, ctx.run.money));
      ctx.run.money += gain;
      ctx.message(`+$${gain}`);
    },
  },
  {
    id: 'sacristao',
    kind: 'tarot',
    name: 'O Sacristão',
    icon: '🔔',
    description: 'Cria até 2 Gírias aleatórias (se houver espaço).',
    use: (ctx) => {
      let n = 0;
      for (let i = 0; i < 2; i++) if (ctx.addConsumable('giria')) n++;
      ctx.message(n ? `${n} Gíria(s) criada(s).` : 'Sem espaço para Gírias.');
    },
  },
  {
    id: 'rodaDoBicho',
    kind: 'tarot',
    name: 'A Roda do Bicho',
    icon: '🎡',
    description: '1 chance em 4 de dar uma edição (Folheada, Holográfica ou Fosforescente) a um Coringa sem edição.',
    blocked: (run) => (run.jokers.some((j) => !j.edition) ? null : 'Nenhum Coringa sem edição.'),
    use: (ctx) => {
      const free = ctx.run.jokers.filter((j) => !j.edition);
      if (int(ctx.rng, 4) !== 0) {
        ctx.message('Deu zebra! Nada aconteceu.');
        return;
      }
      const j = pick(ctx.rng, free);
      j.edition = pick(ctx.rng, ['folheada', 'holografica', 'fosforescente'] as const);
      ctx.message(`Coringa agora é ${EDITION_NAME[j.edition]}!`);
    },
  },
  {
    id: 'pedreiro',
    kind: 'tarot',
    name: 'O Pedreiro',
    icon: '🧱',
    description: 'Sobe em 2 o valor de 1 carta escolhida (4→6, Q→K … o 3 é o teto).',
    targets: { min: 1, max: 1 },
    use: (ctx) => {
      const c = ctx.targets[0];
      c.rank = RANKS[Math.min(RANKS.length - 1, RANKS.indexOf(c.rank) + 2)];
      ctx.message('Mais dois andares na carta.');
    },
  },
  {
    id: 'lavadeira',
    kind: 'tarot',
    name: 'A Lavadeira',
    icon: '🧺',
    description: 'Tira a edição e o selo de até 3 cartas e paga $2 por carta que tinha algo.',
    targets: { min: 1, max: 3 },
    use: (ctx) => {
      let n = 0;
      for (const c of ctx.targets) {
        if (c.edition || c.seal) n += 1;
        delete c.edition;
        delete c.seal;
      }
      ctx.run.money += 2 * n;
      ctx.message(n ? `Roupa lavada: +$${2 * n}.` : 'Já estavam limpas.');
    },
  },
  {
    id: 'cartomante',
    kind: 'tarot',
    name: 'A Cartomante',
    icon: '🔮',
    description: 'Paga $5 e cria 1 Mandinga aleatória.',
    blocked: (run) => (run.money < 5 ? 'Precisa de $5.' : null),
    use: (ctx) => {
      ctx.run.money -= 5;
      ctx.message(ctx.addConsumable('mandinga') ? 'A cartomante tirou uma Mandinga da manga.' : 'Sem espaço para a Mandinga.');
    },
  },
  {
    id: 'feirante',
    kind: 'tarot',
    name: 'O Feirante',
    icon: '🍉',
    description: 'Cria 1 Coringa Comum (precisa de espaço).',
    blocked: (run) => (run.jokers.length >= run.jokerSlots ? 'Sem espaço para Coringas.' : null),
    use: (ctx) => {
      ctx.addJoker({ rarity: 'comum' });
      ctx.message('Olha a promoção!');
    },
  },
  {
    id: 'faxineira',
    kind: 'tarot',
    name: 'A Faxineira',
    icon: '🧹',
    description: 'Destrói 1 carta escolhida e ganha $3.',
    targets: { min: 1, max: 1 },
    blocked: (run) => deckTooSmall(run, 1),
    use: (ctx) => {
      ctx.destroyCards(ctx.targets);
      ctx.run.money += 3;
      ctx.message('Varreu pra debaixo do tapete: +$3.');
    },
  },
  {
    id: 'parteira',
    kind: 'tarot',
    name: 'A Parteira',
    icon: '👶',
    description: 'Adiciona 2 cartas ao baralho: um Ás e um 2, de naipes aleatórios.',
    use: (ctx) => {
      ctx.addCards([makeCard('A', pick(ctx.rng, SUITS), 'p'), makeCard('2', pick(ctx.rng, SUITS), 'p')]);
      ctx.message('Nasceram duas cartas!');
    },
  },
  {
    id: 'vidente',
    kind: 'tarot',
    name: 'A Vidente',
    icon: '🌙',
    description: 'Sobe 1 nível de uma Jogada aleatória.',
    use: (ctx) => {
      const cat = pick(ctx.rng, CATEGORIES);
      ctx.run.levels[cat.id] += 1;
      ctx.message(`${cat.name} subiu para o nível ${ctx.run.levels[cat.id]}.`);
    },
  },
  {
    id: 'pintor',
    kind: 'tarot',
    name: 'O Pintor',
    icon: '🎨',
    description: 'Dá uma edição aleatória (Folheada, Holográfica ou Fosforescente) a 1 carta, mas troca o naipe dela ao acaso.',
    targets: { min: 1, max: 1 },
    use: (ctx) => {
      const c = ctx.targets[0];
      c.edition = pick(ctx.rng, ['folheada', 'holografica', 'fosforescente'] as const);
      c.suit = pick(ctx.rng, SUITS);
      ctx.message(`Obra-prima: ${EDITION_NAME[c.edition]}.`);
    },
  },
  {
    id: 'palpite',
    kind: 'tarot',
    name: 'O Palpite',
    icon: '🎰',
    description: '50% de chance de ganhar $10; senão perde $4 (nunca fica negativo).',
    use: (ctx) => {
      if (int(ctx.rng, 2) === 0) {
        ctx.run.money += 10;
        ctx.message('Deu na cabeça! +$10.');
      } else {
        const loss = Math.min(4, ctx.run.money);
        ctx.run.money -= loss;
        ctx.message(`Deu zebra: -$${loss}.`);
      }
    },
  },
];

const GIRIAS: ConsumableDef[] = CATEGORIES.map((cat) => ({
  id: `giria_${cat.id}`,
  kind: 'giria' as const,
  name: cat.giria,
  icon: '💬',
  category: cat.id,
  description: `Sobe 1 nível da jogada ${cat.name} (+${cat.chipsPerLevel} Fichas, +${cat.multPerLevel} Mult).`,
  use: (ctx: UseCtx) => {
    ctx.run.levels[cat.id] += 1;
    ctx.message(`${cat.name} subiu para o nível ${ctx.run.levels[cat.id]}!`);
  },
}));

const MANDINGAS: ConsumableDef[] = [
  sealMandinga('patua', 'Patuá', '🧧', 'dourado', '+$2 quando a carta vence uma rodada'),
  sealMandinga('arruda', 'Galho de Arruda', '🌿', 'vermelho', 'a carta pontua duas vezes'),
  sealMandinga('figa', 'Figa', '🤞', 'azul', 'cria a Gíria da jogada se a carta estiver na mão vencedora'),
  sealMandinga('velaPreta', 'Vela Preta', '🕯️', 'roxo', 'cria um Tarô quando a carta é trocada num blefe'),
  {
    id: 'encruzilhada',
    kind: 'mandinga',
    name: 'Encruzilhada',
    icon: '✖️',
    description: 'Cria um Coringa Raro. Seu dinheiro vai a $0.',
    blocked: (run) => (run.jokers.length >= run.jokerSlots ? 'Sem espaço para Coringas.' : null),
    use: (ctx) => {
      ctx.addJoker({ rarity: 'raro' });
      ctx.run.money = 0;
      ctx.message('O trato foi feito.');
    },
  },
  {
    id: 'olhoGordo',
    kind: 'mandinga',
    name: 'Olho Gordo',
    icon: '👁️',
    description: 'Aplica Fosforescente (×1.5 Mult) em 1 carta escolhida e destrói 1 outra carta aleatória do baralho.',
    targets: { min: 1, max: 1 },
    blocked: (run) => deckTooSmall(run, 1),
    use: (ctx) => {
      const chosen = ctx.targets[0];
      chosen.edition = 'fosforescente';
      const others = ctx.run.deck.filter((c) => c.id !== chosen.id);
      const victim = pick(ctx.rng, others);
      ctx.destroyCards([victim]);
      ctx.message('Brilhou… mas alguém pagou o preço.');
    },
  },
  {
    id: 'simpatia',
    kind: 'mandinga',
    name: 'Simpatia',
    icon: '🍯',
    description: 'Um Coringa aleatório fica Fosforescente (×1.5 Mult). Todos os outros são destruídos.',
    blocked: (run) => (run.jokers.length === 0 ? 'Você não tem Coringas.' : null),
    use: (ctx) => {
      const j = pick(ctx.rng, ctx.run.jokers);
      j.edition = 'fosforescente';
      ctx.run.jokers = [j];
      ctx.message('Só sobrou um.');
    },
  },
  {
    id: 'pacto',
    kind: 'mandinga',
    name: 'Pacto',
    icon: '😈',
    description: 'Cria um Coringa Lendário.',
    blocked: (run) => (run.jokers.length >= run.jokerSlots ? 'Sem espaço para Coringas.' : null),
    use: (ctx) => {
      ctx.addJoker({ rarity: 'lendario' });
      ctx.message('Uma lenda senta à sua mesa.');
    },
  },
  {
    id: 'benzimento',
    kind: 'mandinga',
    name: 'Benzimento',
    icon: '✝️',
    description: 'Sobe 1 nível de todas as jogadas.',
    use: (ctx) => {
      for (const c of CATEGORIES) ctx.run.levels[c.id] += 1;
      ctx.message('Todas as jogadas subiram de nível!');
    },
  },
  {
    id: 'despacho',
    kind: 'mandinga',
    name: 'Despacho',
    icon: '🍗',
    description: 'Destrói 5 cartas aleatórias do baralho e ganha $20.',
    blocked: (run) => deckTooSmall(run, 5),
    use: (ctx) => {
      const pool = [...ctx.run.deck];
      const victims: Card[] = [];
      for (let i = 0; i < 5; i++) victims.push(pool.splice(int(ctx.rng, pool.length), 1)[0]);
      ctx.destroyCards(victims);
      ctx.run.money += 20;
      ctx.message('+$20. O santo aceitou.');
    },
  },
  {
    ...editionTarot('letreiro', 'Letreiro de Neon', '💡', 'fosforescente', 1, '×1.5 Mult ao vencer rodada'),
    kind: 'mandinga',
  },
  {
    id: 'salGrosso',
    kind: 'mandinga',
    name: 'Sal Grosso',
    icon: '🧂',
    description: 'Tira as edições e os selos de TODO o baralho e paga $1 por carta limpa (máx. $15).',
    blocked: (run) => (run.deck.some((c) => c.edition || c.seal) ? null : 'Nenhuma carta tem edição ou selo.'),
    use: (ctx) => {
      let n = 0;
      for (const c of ctx.run.deck) {
        if (c.edition || c.seal) n += 1;
        delete c.edition;
        delete c.seal;
      }
      const gain = Math.min(15, n);
      ctx.run.money += gain;
      ctx.message(`Baralho limpo: +$${gain}.`);
    },
  },
  {
    id: 'aguaBenta',
    kind: 'mandinga',
    name: 'Água Benta',
    icon: '💧',
    description: '+1 mão em cada um dos próximos 2 Blinds.',
    use: (ctx) => {
      ctx.run.tags.push('folego', 'folego');
      ctx.message('Abençoado por dois Blinds.');
    },
  },
  {
    id: 'bonecoDePano',
    kind: 'mandinga',
    name: 'Boneco de Pano',
    icon: '🪆',
    description: 'Copia o Coringa mais à esquerda (com edição) e destrói 1 outro Coringa aleatório.',
    blocked: (run) => (run.jokers.length === 0 ? 'Você não tem Coringas.' : run.jokers.length === 1 && run.jokerSlots < 2 ? 'Sem espaço.' : null),
    use: (ctx) => {
      const src = ctx.run.jokers[0];
      const others = ctx.run.jokers.slice(1);
      if (others.length > 0) {
        const victim = pick(ctx.rng, others);
        ctx.run.jokers = ctx.run.jokers.filter((j) => j !== victim);
      }
      ctx.message(ctx.addJoker({ id: src.id, edition: src.edition }) ? 'O boneco ganhou um irmão gêmeo.' : 'Sem espaço para a cópia.');
    },
  },
  {
    id: 'atabaque',
    kind: 'mandinga',
    name: 'Atabaque',
    icon: '🥁',
    description: 'Copia até 3 cartas escolhidas (com edição e selo) e destrói o mesmo tanto de outras cartas aleatórias.',
    targets: { min: 1, max: 3 },
    blocked: (run, t) => (run.deck.length - t.length < Math.max(t.length, MIN_DECK_SIZE) ? 'Baralho pequeno demais.' : null),
    use: (ctx) => {
      const ids = new Set(ctx.targets.map((c) => c.id));
      const pool = ctx.run.deck.filter((c) => !ids.has(c.id));
      const victims: Card[] = [];
      for (let i = 0; i < ctx.targets.length; i++) victims.push(pool.splice(int(ctx.rng, pool.length), 1)[0]);
      const copies = ctx.targets.map((c) => ctx.copyCard(c));
      ctx.destroyCards(victims);
      ctx.addCards(copies);
      ctx.message('O tambor chamou: cartas em dobro, e o preço foi pago.');
    },
  },
  {
    id: 'trevo',
    kind: 'mandinga',
    name: 'Trevo de Quatro Folhas',
    icon: '🍀',
    description: 'Ganha um valor sorteado entre $5 e $25.',
    use: (ctx) => {
      const gain = 5 + int(ctx.rng, 21);
      ctx.run.money += gain;
      ctx.message(`Sorte grande: +$${gain}.`);
    },
  },
  {
    id: 'fogueira',
    kind: 'mandinga',
    name: 'Fogueira de São João',
    icon: '🔥',
    description: 'Destrói 4 cartas aleatórias do baralho e cria um Coringa Incomum.',
    blocked: (run) => (run.jokers.length >= run.jokerSlots ? 'Sem espaço para Coringas.' : deckTooSmall(run, 4)),
    use: (ctx) => {
      const pool = [...ctx.run.deck];
      const victims: Card[] = [];
      for (let i = 0; i < 4; i++) victims.push(pool.splice(int(ctx.rng, pool.length), 1)[0]);
      ctx.destroyCards(victims);
      ctx.addJoker({ rarity: 'incomum' });
      ctx.message('Pula a fogueira: o fogo levou quatro e trouxe um.');
    },
  },
  {
    id: 'pomba',
    kind: 'mandinga',
    name: 'Pomba-Gira',
    icon: '💃',
    description: 'Paga $4 e cria um Coringa Comum Holográfico (+4 Mult).',
    blocked: (run) => (run.money < 4 ? 'Precisa de $4.' : run.jokers.length >= run.jokerSlots ? 'Sem espaço para Coringas.' : null),
    use: (ctx) => {
      ctx.run.money -= 4;
      ctx.addJoker({ rarity: 'comum', edition: 'holografica' });
      ctx.message('Salve! O Coringa chegou brilhando.');
    },
  },
  {
    id: 'exu',
    kind: 'mandinga',
    name: 'Seu Exu',
    icon: '🔱',
    description: 'Até 2 cartas escolhidas viram 3 de Paus. Seu dinheiro cai pela metade.',
    targets: { min: 1, max: 2 },
    use: (ctx) => {
      for (const c of ctx.targets) {
        c.rank = '3';
        c.suit = 'paus';
      }
      ctx.run.money = Math.floor(ctx.run.money / 2);
      ctx.message('Laroyê! O trato está feito.');
    },
  },
  {
    id: 'fitaGravada',
    kind: 'mandinga',
    name: 'Fita Gravada',
    icon: '📼',
    description: 'Cria 2 Tarôs de Boteco aleatórios (se houver espaço).',
    use: (ctx) => {
      let n = 0;
      for (let i = 0; i < 2; i++) if (ctx.addConsumable('tarot')) n += 1;
      ctx.message(n > 0 ? `Lado B: +${n} Tarô(s).` : 'Sem espaço para gravar.');
    },
  },
];

export const CONSUMABLES: ConsumableDef[] = [...TAROTS, ...GIRIAS, ...MANDINGAS];
export const CONSUMABLE_BY_ID = Object.fromEntries(CONSUMABLES.map((c) => [c.id, c])) as Record<string, ConsumableDef>;

export function consumablesOfKind(kind: ConsumableKind): ConsumableDef[] {
  return CONSUMABLES.filter((c) => c.kind === kind);
}

export const KIND_NAME: Record<ConsumableKind, string> = {
  tarot: 'Tarô de Boteco',
  giria: 'Gíria',
  mandinga: 'Mandinga',
};
