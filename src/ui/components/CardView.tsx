import { useRef, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import { EDITION_NAME, RANK_NAME, SEAL_NAME, SUIT_NAME, SUIT_SYMBOL, cardChips, type Card, type Rank } from '../../engine/cards';
import { Tip } from './Tip';

/** Valor que nunca casa com uma carta: 'sem manilha conhecida'. */
const NO_MANILHA = '' as Rank;

const EDITION_DESC: Record<string, string> = {
  folheada: '+20 Fichas quando vence uma rodada',
  holografica: '+4 Mult quando vence uma rodada',
  fosforescente: '×1.5 Mult quando vence uma rodada',
  marcada: 'Na sua mão, revela uma carta do adversário',
};

const SEAL_DESC: Record<string, string> = {
  dourado: '+$2 quando vence uma rodada',
  roxo: 'Cria um Tarô quando trocada num blefe',
  vermelho: 'Pontua duas vezes',
  azul: 'Cria a Gíria da jogada se estiver na mão vencedora',
};

export interface CardViewProps {
  card?: Card | null;
  /** Mostra o verso. */
  back?: boolean;
  manilha?: Rank | null;
  selected?: boolean;
  dim?: boolean;
  outcome?: 'win' | 'lose' | 'tie';
  small?: boolean;
  tiny?: boolean;
  /** Carta revelada pela edição Marcada. */
  peek?: boolean;
  disabled?: boolean;
  tip?: boolean;
  onClick?: (e: MouseEvent) => void;
  onDoubleClick?: () => void;
  className?: string;
  style?: CSSProperties;
  label?: string;
}

function tipFor(card: Card, manilha?: Rank | null) {
  const isM = manilha && card.rank === manilha;
  return (
    <div className="tip-card">
      <strong>
        {RANK_NAME[card.rank]} de {SUIT_NAME[card.suit]}
      </strong>
      {isM && <div className="tip-manilha">{card.suit === 'paus' ? 'ZAP! A carta mais forte.' : 'Manilha!'}</div>}
      <div className="hl-chips">+{cardChips(card, manilha ?? NO_MANILHA)} Fichas ao vencer rodada</div>
      {card.edition && (
        <div>
          <span className="tip-tag">{EDITION_NAME[card.edition]}</span> {EDITION_DESC[card.edition]}
        </div>
      )}
      {card.seal && (
        <div>
          <span className={`tip-tag seal-${card.seal}`}>{SEAL_NAME[card.seal]}</span> {SEAL_DESC[card.seal]}
        </div>
      )}
    </div>
  );
}

// Sem memo: o motor muta cartas no lugar (Tarôs mudam naipe/valor).
export function CardView(p: CardViewProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const c = p.card;
  const isBack = p.back || !c;
  const isManilha = !!c && !isBack && p.manilha === c.rank;
  const zap = isManilha && c!.suit === 'paus';
  const cls = [
    'card',
    isBack ? 'card-back' : `suit-${c!.suit}`,
    isManilha ? 'is-manilha' : '',
    zap ? 'is-zap' : '',
    !isBack && c!.edition ? `ed-${c!.edition}` : '',
    p.selected ? 'selected' : '',
    p.dim ? 'dim' : '',
    p.outcome ? `out-${p.outcome}` : '',
    p.small ? 'small' : '',
    p.tiny ? 'tiny' : '',
    p.peek ? 'peek' : '',
    p.onClick && !p.disabled ? 'clickable' : '',
    p.className ?? '',
  ].join(' ');

  const onMove = (e: PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${-y * 18}deg`);
    el.style.setProperty('--ry', `${x * 22}deg`);
    el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  const body = (
    <button
      ref={ref}
      type="button"
      className={cls}
      style={p.style}
      data-ref={c?.id}
      onClick={p.disabled ? undefined : p.onClick}
      onDoubleClick={p.disabled ? undefined : p.onDoubleClick}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      disabled={p.disabled && !p.tip}
      aria-label={p.label ?? (isBack ? 'Carta virada' : `${RANK_NAME[c!.rank]} de ${SUIT_NAME[c!.suit]}${isManilha ? ', manilha' : ''}`)}
      aria-pressed={p.selected}
    >
      <span className="card-inner">
        {isBack ? (
          <span className="back-pattern">
            <span>T</span>
          </span>
        ) : (
          <>
            <span className="corner tl">
              <b>{c!.rank}</b>
              <i>{SUIT_SYMBOL[c!.suit]}</i>
            </span>
            <span className="pip">{['Q', 'J', 'K'].includes(c!.rank) ? <span className="face">{c!.rank}</span> : SUIT_SYMBOL[c!.suit]}</span>
            <span className="corner br">
              <b>{c!.rank}</b>
              <i>{SUIT_SYMBOL[c!.suit]}</i>
            </span>
            {c!.seal && <span className={`seal seal-${c!.seal}`} />}
            {c!.edition === 'marcada' && <span className="mark">✕</span>}
            {isManilha && <span className="manilha-badge">{zap ? 'ZAP' : 'M'}</span>}
            <span className="sheen" />
          </>
        )}
      </span>
      {p.peek && <span className="peek-eye">👁</span>}
    </button>
  );
  if (p.tip && c && !isBack) return <Tip content={tipFor(c, p.manilha)}>{body}</Tip>;
  return body;
}
