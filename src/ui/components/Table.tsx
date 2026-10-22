// Mesa de truco: adversário, vira, rodadas e a mão do jogador.

import { manilhaFromVira, RANK_NAME, SUIT_NAME, type Card } from '../../engine/cards';
import { BET_NAMES, betValue, isHidden, responder, type TrucoHand } from '../../engine/truco';
import type { Speech } from '../store';
import { CardView } from './CardView';
import { Portrait } from './Portrait';
import { TableDecor } from './TableDecor';
import { Tip } from './Tip';

export interface TableProps {
  hand: TrucoHand;
  opponentName: string;
  /** id do personagem/chefe para o retrato. */
  portraitId: string;
  isBoss?: boolean;
  opponentTag?: string;
  hideVira?: boolean;
  revealedAi?: string;
  selected: string[];
  canPlay: boolean;
  speech: Speech | null;
  thinking?: boolean;
  onCardClick?: (card: Card) => void;
  onCardPlay?: (card: Card) => void;
}

const sideLabel = { player: 'Você', ai: 'Adv.' } as const;

export function Table(p: TableProps) {
  const h = p.hand;
  const blindPlay = !!h.options.blindPlay;
  const visibleManilha = p.hideVira ? null : h.manilha;
  const pending = h.pending;
  const playerMustRespond = pending && responder(h) === 'player';

  return (
    <div className={`table ${pending ? 'bet-pending' : ''}`}>
      <TableDecor />
      <div className="opp-zone">
        <div className="opp-avatar" aria-label={`Adversário: ${p.opponentName}`}>
          <Portrait id={p.portraitId} boss={p.isBoss} size={84} className="opp-portrait" title={p.opponentName} />
          <span className="opp-name">{p.opponentName}</span>
          {p.opponentTag && <span className="opp-tag">{p.opponentTag}</span>}
          {p.speech && (
            <span className="speech" key={p.speech.key} role="status">
              {p.speech.text}
            </span>
          )}
          {p.thinking && !p.speech && <span className="speech thinking">…</span>}
        </div>
        <div className="opp-hand">
          {h.hands.ai.map((c) => {
            const peek = c.id === p.revealedAi;
            return (
              <CardView
                key={c.id}
                card={peek ? c : null}
                back={!peek}
                peek={peek}
                manilha={visibleManilha}
                small
                tip={peek}
                className="deal-in"
              />
            );
          })}
        </div>
      </div>

      <div className="mid-zone">
        <div className="vira-slot">
          <div className="slot-label">Vira</div>
          {p.hideVira ? (
            <Tip content="A vira está escondida! Você não sabe qual é a manilha.">
              <CardView back small className="vira hidden-vira" label="Vira escondida" />
            </Tip>
          ) : (
            <Tip
              content={`Vira ${h.vira.rank}: a manilha é ${RANK_NAME[h.manilha]} ${
                h.manilha === manilhaFromVira(h.vira.rank) ? '(a carta seguinte)' : '(a carta seguinte que existe no seu baralho)'
              }. Manilhas vencem tudo: Paus (Zap) > Copas > Espadas > Ouros.`}
            >
              <CardView card={h.vira} small className="vira flip-in" />
            </Tip>
          )}
          <div className="manilha-label">
            Manilha: <b>{p.hideVira ? '?' : h.manilha}</b>
          </div>
        </div>

        <div className="rounds">
          {[0, 1, 2].map((i) => {
            const r = h.rounds[i];
            const o = r?.outcome;
            const rv = p.hideVira ? null : r?.manilha;
            return (
              <div className={`round ${o ? `round-${o}` : ''} ${r && !o ? 'round-current' : ''}`} key={i}>
                <div className="round-title">{i + 1}ª</div>
                <div className="round-slot">
                  {r?.cards.ai &&
                    (isHidden(r, 'ai') ? (
                      <CardView back small className="play-in-top" label="Carta virada do adversário" />
                    ) : (
                      <CardView
                        card={r.cards.ai}
                        manilha={rv}
                        small
                        tip
                        className="play-in-top"
                        outcome={o ? (o === 'ai' ? 'win' : o === 'tie' ? 'tie' : 'lose') : undefined}
                      />
                    ))}
                </div>
                <div className="round-slot">
                  {r?.cards.player &&
                    (isHidden(r, 'player') ? (
                      <Tip content={`Você jogou virada: ${RANK_NAME[r.cards.player.rank]} de ${SUIT_NAME[r.cards.player.suit]}. Carta virada não vale nada.`}>
                        <span className="hidden-played">
                          <CardView back small className="play-in-bottom" label="Sua carta virada" />
                          <span className="hidden-tag">virada</span>
                        </span>
                      </Tip>
                    ) : (
                      <CardView
                        card={r.cards.player}
                        manilha={rv}
                        small
                        tip
                        className="play-in-bottom"
                        outcome={o ? (o === 'player' ? 'win' : o === 'tie' ? 'tie' : 'lose') : undefined}
                      />
                    ))}
                </div>
                <div className="round-result">{o ? (o === 'tie' ? 'Canga' : sideLabel[o]) : ''}</div>
              </div>
            );
          })}
        </div>

        <div className="bet-zone">
          <Tip content="Valor da mão. Sem aposta vale 1; Truco 3, Seis 6, Nove 9, Doze 12.">
            <div className={`bet-level level-${h.level}`}>
              <span>{BET_NAMES[h.level]}</span>
              <b>{betValue(h.level)}</b>
            </div>
          </Tip>
          {pending && (
            <div className={`bet-call ${playerMustRespond ? 'to-you' : ''}`} role="alert">
              {pending.by === 'ai' ? 'Adversário' : 'Você'}: {BET_NAMES[pending.level].toUpperCase()}!
            </div>
          )}
        </div>
      </div>

      <div className={`player-zone ${p.canPlay ? 'your-turn' : ''}`}>
        <div className="player-hand">
          {h.hands.player.map((c, i) => (
            <CardView
              key={c.id}
              card={blindPlay ? null : c}
              back={blindPlay}
              manilha={visibleManilha}
              selected={p.selected.includes(c.id)}
              tip={!blindPlay}
              disabled={h.phase === 'done'}
              className="deal-in hand-card"
              style={{ ['--i' as string]: i }}
              onClick={p.onCardClick ? () => p.onCardClick!(c) : undefined}
              onDoubleClick={p.onCardPlay && p.canPlay ? () => p.onCardPlay!(c) : undefined}
              label={blindPlay ? `Carta ${i + 1} (às cegas)` : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
