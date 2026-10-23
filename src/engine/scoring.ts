// Pontuação estilo Balatro: Fichas × Mult, com passos sequenciais para animar.

import { BET_MULT, EDITION_CHIPS, EDITION_MULT, EDITION_XMULT, GOLD_SEAL_MONEY } from '../data/balance';
import { CATEGORY_BY_ID, categoryValues } from '../data/categories';
import { cardChips, cardLabel, SUIT_NAME } from './cards';
import { cardIsManilha, detectCategory, manilhasPlayed, ties } from './handFacts';
import { addConsumable, jokerDef, resolvedJokers } from './inventory';
import type { JokerDef, ScoreCtx, WonRound } from './jokerApi';
import type { BlindState, JokerInstance, RunState, ScoreResult, ScoreStep } from './state';
import { BET_NAMES, roundsWonBy, type TrucoHand } from './truco';

interface Actor {
  /** Instância cujo estado é lido. */
  self: JokerInstance;
  def: JokerDef;
  /** uid exibido como origem do efeito. */
  ref: string;
  name: string;
}

export function activeJokers(run: RunState, blind: BlindState | null): JokerInstance[] {
  return run.jokers.filter((j) => j.uid !== blind?.rules.disabledJoker);
}

/** Atores de pontuação, com o Boto resolvido (copia o vizinho da direita). */
function actors(run: RunState, blind: BlindState): Actor[] {
  return resolvedJokers(activeJokers(run, blind)).map((r) => ({
    self: r.self,
    def: r.def,
    ref: r.owner.uid,
    name: jokerDef(r.owner).name,
  }));
}

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/0$/, ''));

export function scoreHand(run: RunState, blind: BlindState, hand: TrucoHand): ScoreResult {
  const category = detectCategory(hand);
  const level = run.levels[category];
  const base = categoryValues(category, level);
  const betLevel = hand.level;
  const steps: ScoreStep[] = [];
  let chips = 0;
  let mult = 0;
  let money = 0;
  let ref: string | undefined;
  let source: ScoreStep['source'] = 'base';

  const push = (s: Omit<ScoreStep, 'totalChips' | 'totalMult' | 'source' | 'ref'> & { source?: ScoreStep['source'] }) => {
    steps.push({ source, ref, ...s, totalChips: chips, totalMult: mult });
  };

  const ctx: ScoreCtx = {
    run,
    blind,
    hand,
    category,
    betLevel,
    roundsWon: roundsWonBy(hand, 'player'),
    ties: ties(hand),
    manilhasPlayed: manilhasPlayed(hand),
    playerBetsAccepted: blind.handFlags.playerBetsAccepted,
    isManilha: (c) => cardIsManilha(hand, c),
    chips: (n, label) => {
      chips += n;
      push({ label: label ?? `+${fmt(n)} Fichas`, chips: n });
    },
    mult: (n, label) => {
      mult += n;
      push({ label: label ?? `+${fmt(n)} Mult`, mult: n });
    },
    xmult: (n, label) => {
      mult *= n;
      push({ label: label ?? `×${fmt(n)} Mult`, xmult: n });
    },
    money: (n, label) => {
      money += n;
      run.money += n;
      push({ label: label ?? `+$${n}`, money: n });
    },
    info: (label) => push({ label }),
  };

  // 1. Jogada + aposta
  chips = base.chips;
  mult = base.mult;
  push({ label: `${CATEGORY_BY_ID[category].name} (nível ${level})`, chips: base.chips, mult: base.mult });
  if (blind.rules.halfBase) {
    source = 'boss';
    chips = Math.max(1, Math.floor(chips / 2));
    mult = Math.max(1, Math.floor(mult / 2));
    push({ label: `${blind.info.name}: Jogada pela metade` });
    source = 'base';
  }
  if (betLevel > 0) {
    source = 'bet';
    ctx.xmult(BET_MULT[betLevel], `${BET_NAMES[betLevel]}! ×${BET_MULT[betLevel]}`);
  }

  const cast = actors(run, blind);
  for (const a of cast) a.def.beforeScore?.(ctx, a.self);

  // 2. Cartas vencedoras
  for (const round of ctx.roundsWon) scoreCard(ctx, cast, round, (s, r) => {
      source = s;
      ref = r;
    });

  // 3. Coringas, da esquerda para a direita
  for (const a of cast) {
    source = 'joker';
    ref = a.ref;
    a.def.score?.(ctx, a.self);
  }
  for (const j of activeJokers(run, blind)) {
    if (!j.edition) continue;
    source = 'edition';
    ref = j.uid;
    if (j.edition === 'folheada') ctx.chips(EDITION_CHIPS, `Folheada +${EDITION_CHIPS}`);
    if (j.edition === 'holografica') ctx.mult(EDITION_MULT, `Holográfica +${EDITION_MULT}`);
    if (j.edition === 'fosforescente') ctx.xmult(EDITION_XMULT, `Fosforescente ×${EDITION_XMULT}`);
  }

  // 4. Selo Azul: cria a Gíria da jogada
  source = 'seal';
  for (const c of hand.dealt.player) {
    if (c.seal !== 'azul') continue;
    ref = c.id;
    if (addConsumable(run, 'giria', `giria_${category}`)) push({ label: 'Selo Azul: +1 Gíria' });
  }

  return {
    category,
    level,
    betLevel,
    steps,
    chips,
    mult,
    total: Math.floor(chips * mult),
    money,
  };
}

function scoreCard(
  ctx: ScoreCtx,
  cast: Actor[],
  round: WonRound,
  setSource: (s: ScoreStep['source'], ref: string | undefined) => void,
): void {
  const card = round.card;
  let triggers = 1;
  if (card.seal === 'vermelho') triggers += 1;
  for (const a of cast) triggers += a.def.retrigger?.(ctx, a.self, round) ?? 0;

  for (let t = 0; t < triggers; t++) {
    setSource('card', card.id);
    if (ctx.blind.rules.debuffSuit === card.suit) {
      ctx.info(`${cardLabel(card)}: ${SUIT_NAME[card.suit]} bloqueada, não pontua`);
      return;
    }
    if (ctx.blind.rules.noManilhaChips && ctx.isManilha(card)) {
      ctx.info(`${cardLabel(card)}: manilha bloqueada, não pontua`);
      return;
    }
    const again = t > 0 ? ' (de novo!)' : '';
    ctx.chips(cardChips(card, round.manilha), `${cardLabel(card)} +${cardChips(card, round.manilha)}${again}`);
    if (card.edition) {
      setSource('edition', card.id);
      if (card.edition === 'folheada') ctx.chips(EDITION_CHIPS, `Folheada +${EDITION_CHIPS}`);
      if (card.edition === 'holografica') ctx.mult(EDITION_MULT, `Holográfica +${EDITION_MULT}`);
      if (card.edition === 'fosforescente') ctx.xmult(EDITION_XMULT, `Fosforescente ×${EDITION_XMULT}`);
    }
    if (card.seal === 'dourado') {
      setSource('seal', card.id);
      ctx.money(GOLD_SEAL_MONEY, `Selo Dourado +$${GOLD_SEAL_MONEY}`);
    }
    for (const a of cast) {
      if (!a.def.scoreCard) continue;
      setSource('joker', a.ref);
      a.def.scoreCard(ctx, a.self, round);
    }
  }
}
