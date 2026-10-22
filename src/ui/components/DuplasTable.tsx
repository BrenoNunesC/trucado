// Mesa do truco em duplas, vista de quem está embaixo (lugar 0 da visão): o parceiro sentado em
// frente, os adversários nas laterais (o corpo deles sai da borda da mesa) e as cartas de cada
// rodada em cruz no meio, cada uma na frente de quem jogou. Cada um dos três tem as próprias
// animações (lançar a carta, bater na mesa no truco, largar as cartas ao correr).

import { useEffect, useRef, useState } from 'react';
import { RANK_NAME, type Card } from '../../engine/cards';
import { currentDRound, dActor, teamOf, type DHand, type SeatNo } from '../../engine/duplas';
import { BET_NAMES, betValue } from '../../engine/truco';
import type { Speech } from '../store';
import { burst } from '../fx';
import { CardView } from './CardView';
import { OpponentSeat, type Gesture } from './OpponentSeat';
import { TableDecor, useTableTheme } from './TableDecor';
import { Tip } from './Tip';

export interface DuplasTableProps {
  hand: DHand;
  /** Nomes e personagens nos lugares da visão: 0 = você, 1 = direita, 2 = parceiro, 3 = esquerda. */
  names: string[];
  avatars: string[];
  /** Quem está desconectado (online). */
  offline?: boolean[];
  /** Fala de cada lugar (balão). */
  speech?: (Speech & { seat: SeatNo }) | null;
  /** Mostra as cartas do parceiro (Mão de Onze). */
  revealPartner?: boolean;
  canPlay: boolean;
  /** Clique numa carta da sua mão: joga direto, ou só seleciona se houver `onCardSelect`. */
  onCardPlay?: (card: Card) => void;
  /** Campanha: o clique seleciona (para jogar ou blefar) e o duplo clique joga. */
  onCardSelect?: (card: Card) => void;
  selected?: string[];
  /** Carta de um adversário revelada (Olho Vivo, carta Marcada). */
  revealedId?: string;
  /** Vira escondida (chefe): ninguém sabe qual é a manilha. */
  hideVira?: boolean;
}

type SeatGesture = { gesture: Gesture; key: number };

/**
 * O que cada um dos outros três acabou de fazer, comparando a mão com o quadro anterior:
 * uma carta a menos = jogou; um pedido de aposta dele = bateu na mesa; a dupla correu = largou;
 * a dupla levou a mão = comemora.
 */
function useSeatGestures(h: DHand): Record<number, SeatGesture> {
  const [g, setG] = useState<Record<number, SeatGesture>>({ 1: { gesture: null, key: 0 }, 2: { gesture: null, key: 0 }, 3: { gesture: null, key: 0 } });
  const prev = useRef({ counts: h.hands.map((x) => x.length), bet: '', result: '' });
  useEffect(() => {
    const p = prev.current;
    const counts = h.hands.map((x) => x.length);
    const bet = h.pending ? `${h.pending.by}-${h.pending.level}` : '';
    const result = h.result ? `${h.result.winner}-${h.result.reason}` : '';
    const won = result && result !== p.result ? h.result!.winner : null;
    const next = { ...g };
    let changed = false;
    const set = (s: number, gesture: Gesture) => {
      next[s] = { gesture, key: (g[s]?.key ?? 0) + 1 };
      changed = true;
    };
    for (const s of [1, 2, 3]) {
      if (counts[s] > p.counts[s]) set(s, null); // mão nova
      else if (h.result?.reason === 'run' && h.result.ranAway === teamOf(s as SeatNo) && g[s]?.gesture !== 'fold') set(s, 'fold');
      else if (won !== null && teamOf(s as SeatNo) === won) set(s, 'cheer');
      else if (bet && bet !== p.bet && h.pending!.by === s) set(s, 'slam');
      else if (counts[s] < p.counts[s]) set(s, 'throw');
    }
    prev.current = { counts, bet, result };
    if (changed) setG(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, h.hands, h.pending, h.result]);
  return g;
}

/** Onde cada lugar senta e de que lado o corpo dele sai. */
const SEAT_CLASS = ['me', 'right', 'partner', 'left'] as const;
/** A carta jogada voa a partir de quem jogou. */
const PLAY_IN = ['play-in-bottom', 'play-in-right', 'play-in-top', 'play-in-left'] as const;
const CHEERS = ['Fechou!', 'É nóis!', 'Toma!', 'Aí sim, parceiro!', 'Que isso!'];

export function DuplasTable(p: DuplasTableProps) {
  const h = p.hand;
  const r = currentDRound(h);
  const gestures = useSeatGestures(h);
  const theme = useTableTheme();
  // o parceiro comemora a mão da dupla: grito e confete no meio da mesa
  const centerRef = useRef<HTMLDivElement>(null);
  const [cheer, setCheer] = useState<{ key: number; text: string } | null>(null);
  const partner = gestures[2];
  useEffect(() => {
    if (partner?.gesture !== 'cheer') return;
    setCheer({ key: partner.key, text: CHEERS[partner.key % CHEERS.length] });
    burst(centerRef.current, '#ffd34d', 26);
    const t = setTimeout(() => setCheer(null), 1800);
    return () => clearTimeout(t);
  }, [partner?.gesture, partner?.key]);
  const who = dActor(h);
  const blind = !!h.options.blindPlay;
  // no meio fica a rodada atual; enquanto ninguém jogou nela, a que acabou de fechar
  const center = r.order.length === 0 && h.rounds.length > 1 ? h.rounds[h.rounds.length - 2] : r;
  // com a vira escondida, ninguém vê qual carta é manilha
  const manilha = p.hideVira ? null : h.manilha;

  return (
    <div className={`table duplas-table theme-${theme} ${h.pending ? 'bet-pending' : ''}`}>
      <TableDecor theme={theme} />

      {([1, 2, 3] as SeatNo[]).map((s) => (
        <div key={s} className={`duplas-seat seat-${SEAT_CLASS[s]} ${who === s ? 'acting' : ''}`}>
          <div className="duplas-body">
            <OpponentSeat
              id={p.avatars[s]}
              cards={h.hands[s]}
              reveal={s === 2 && p.revealPartner}
              revealedId={p.revealedId}
              manilha={blind ? null : manilha}
              gesture={gestures[s]?.gesture ?? null}
              gestureKey={gestures[s]?.key ?? 0}
              thinking={who === s}
            />
          </div>
          <div className={`duplas-name team-${teamOf(s)}`}>
            <b>{p.names[s]}</b>
            <small>{s === 2 ? 'parceiro' : 'adversário'}</small>
            {p.offline?.[s] && <em className="online-off">desconectado</em>}
            {h.mao === s && <span className="duplas-mao">mão</span>}
          </div>
          {p.speech?.seat === s ? (
            <span className="speech duplas-speech" key={p.speech.key} role="status">
              {p.speech.text}
            </span>
          ) : (
            s === 2 &&
            cheer && (
              <span className="speech duplas-speech cheer" key={`cheer-${cheer.key}`} role="status">
                {cheer.text}
              </span>
            )
          )}
        </div>
      ))}

      <div className="duplas-center" ref={centerRef}>
        <div className="duplas-cross">
          {([2, 3, 1, 0] as SeatNo[]).map((s) => {
            const card = center.cards[s];
            const won = center.outcome !== undefined && center.best === s && center.outcome !== 'tie';
            return (
              <div key={s} className={`duplas-slot slot-${SEAT_CLASS[s]} ${who === s && h.phase === 'play' ? 'turn' : ''}`}>
                {card &&
                  (center.hidden[s] ? (
                    <CardView back small className={PLAY_IN[s]} label="Carta virada" />
                  ) : (
                    <CardView
                      card={card}
                      manilha={p.hideVira ? null : center.manilha}
                      small
                      tip
                      className={PLAY_IN[s]}
                      outcome={won ? 'win' : undefined}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="duplas-corner corner-vira vira-slot">
        <div className="slot-label">Vira</div>
        {p.hideVira ? (
          <Tip content="A vira está escondida! Ninguém sabe qual é a manilha.">
            <CardView back small className="vira hidden-vira" label="Vira escondida" />
          </Tip>
        ) : (
          <Tip content={`Vira ${h.vira.rank}: a manilha é ${RANK_NAME[h.manilha]}. Manilhas vencem tudo: Paus (Zap) > Copas > Espadas > Ouros.`}>
            <CardView card={h.vira} small className="vira flip-in" />
          </Tip>
        )}
        <div className="manilha-label">
          Manilha: <b>{p.hideVira ? '?' : h.manilha}</b>
        </div>
      </div>

      <div className="duplas-corner corner-bet">
        <div className={`bet-level level-${h.level}`}>
          <span>{BET_NAMES[h.level]}</span>
          <b>{betValue(h.level)}</b>
        </div>
        {h.pending && (
          <div className={`bet-call ${teamOf(h.pending.by) === 1 ? 'to-you' : ''}`} role="alert">
            {p.names[h.pending.by]}: {BET_NAMES[h.pending.level].toUpperCase()}!
          </div>
        )}
        <ol className="duplas-rounds" aria-label="Rodadas">
          {[0, 1, 2].map((i) => {
            const o = h.rounds[i]?.outcome;
            return (
              <li key={i} className={o === undefined ? '' : o === 'tie' ? 'tie' : o === 0 ? 'us' : 'them'}>
                {i + 1}ª {o === undefined ? '—' : o === 'tie' ? 'canga' : o === 0 ? 'nós' : 'eles'}
              </li>
            );
          })}
        </ol>
      </div>

      <div className={`player-zone duplas-me ${p.canPlay ? 'your-turn' : ''}`}>
        <div className="player-hand">
          {h.hands[0].map((c, i) => (
            <CardView
              key={c.id}
              card={blind ? null : c}
              back={blind}
              manilha={manilha}
              tip={!blind}
              selected={p.selected?.includes(c.id)}
              disabled={h.phase === 'done'}
              className="deal-in hand-card"
              style={{ ['--i' as string]: i }}
              onClick={
                p.onCardSelect ? () => p.onCardSelect!(c) : p.onCardPlay && p.canPlay ? () => p.onCardPlay!(c) : undefined
              }
              onDoubleClick={p.onCardSelect && p.onCardPlay && p.canPlay ? () => p.onCardPlay!(c) : undefined}
              label={blind ? `Carta ${i + 1} (às cegas)` : undefined}
            />
          ))}
        </div>
        {p.speech?.seat === 0 && (
          <span className="speech duplas-speech mine" key={p.speech.key} role="status">
            {p.speech.text}
          </span>
        )}
      </div>
    </div>
  );
}
