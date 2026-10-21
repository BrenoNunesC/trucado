import { useState, type ReactNode } from 'react';
import { sfx } from '../../audio/sfx';
import { BET_MULT } from '../../data/balance';
import { CATEGORIES, categoryValues } from '../../data/categories';
import { CONSUMABLE_BY_ID } from '../../data/consumables';
import { compareCards, RANKS, SUITS, SUIT_NAME, SUIT_SYMBOL, type Card } from '../../engine/cards';
import { applyConsumable } from '../../engine/inventory';
import { destroyService } from '../../engine/shop';
import { BET_NAMES } from '../../engine/truco';
import { CardView } from '../components/CardView';
import { act, goSettings, toast, update, useApp, type Modal } from '../store';
import { Rich } from '../text';

export function ModalFrame({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn small" onClick={onClose} aria-label="Fechar" autoFocus>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

const close = () => update((s) => (s.modal = null));

export function Modals() {
  const s = useApp();
  const m = s.modal;
  if (!m) return null;
  if (m.type === 'how') return <HowModal />;
  if (m.type === 'deck') return <DeckModal modal={m} />;
  if (m.type === 'menu') return <MenuModal />;
  return null;
}

export function HowModal() {
  const s = useApp();
  const levels = s.run?.levels;
  return (
    <ModalFrame title="Como funciona a pontuação" onClose={close} wide>
      <div className="how">
        <p className="how-formula">
          <span className="chips-box inline">Fichas</span> × <span className="mult-box inline">Mult</span> = pontos da mão
        </p>
        <ol>
          <li>
            Ao <b>vencer a mão</b>, o jogo reconhece a sua <b>Jogada</b> (tabela abaixo). Ela dá as Fichas e o Mult de partida.
          </li>
          <li>
            A <b>aposta</b> multiplica o Mult de partida:{' '}
            {BET_NAMES.map((n, i) => (
              <span key={n} className="pill">
                {n} ×{BET_MULT[i]}
              </span>
            ))}
          </li>
          <li>
            Cada <b>rodada vencida</b> soma as Fichas da carta vencedora: 4=4, 5=5 … K=10, A=11, 2=12, 3=13. Manilha = 20 + naipe (Ouros 0,
            Espadas +2, Copas +4, Zap +8). Edições e selos da carta disparam junto.
          </li>
          <li>
            Os <b>Coringas</b> disparam da <b>esquerda para a direita</b>. Por isso a ordem importa: +Mult antes de ×Mult rende mais.
          </li>
          <li>
            Perder a mão não pontua. Se havia aposta aceita, você perde <span className="hl-money">$1</span> por nível (Truco $1 … Doze $4).
          </li>
        </ol>
        <h3>Jogadas</h3>
        <table className="cat-table">
          <thead>
            <tr>
              <th>Jogada</th>
              <th>Como</th>
              <th>Nível</th>
              <th>Fichas</th>
              <th>Mult</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => {
              const lv = levels?.[c.id] ?? 1;
              const v = categoryValues(c.id, lv);
              return (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                  </td>
                  <td>{c.description}</td>
                  <td>{lv}</td>
                  <td className="hl-chips">{v.chips}</td>
                  <td className="hl-mult">{v.mult}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3>Truco rapidinho</h3>
        <p>
          Força: 4 &lt; 5 &lt; 6 &lt; 7 &lt; Q &lt; J &lt; K &lt; A &lt; 2 &lt; 3. A carta seguinte à <b>vira</b> é a <b>manilha</b> e vence tudo: Paus (Zap) &gt; Copas
          &gt; Espadas &gt; Ouros. Melhor de 3 rodadas. Canga (empate) na 1ª: quem vencer a 2ª leva. Canga na 2ª ou 3ª: vale quem venceu a 1ª.
        </p>
        <p className="muted">
          Atalhos: <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd> jogar carta · <kbd>T</kbd> truco/aumentar · <kbd>A</kbd> aceitar · <kbd>C</kbd> correr · <kbd>B</kbd> blefar · <kbd>Enter</kbd> continuar
        </p>
      </div>
    </ModalFrame>
  );
}

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => SUITS.indexOf(b.suit) - SUITS.indexOf(a.suit) || compareCards(b, a, 'X' as Card['rank']));
}

function DeckModal({ modal }: { modal: Extract<Modal, { type: 'deck' }> }) {
  const s = useApp();
  const run = s.run!;
  const [sel, setSel] = useState<string[]>([]);
  const consumable = modal.mode === 'consumable' ? run.consumables.find((c) => c.uid === modal.uid) : null;
  const def = consumable ? CONSUMABLE_BY_ID[consumable.id] : null;
  const max = modal.mode === 'destroy' ? 1 : def?.targets?.max ?? 0;
  const min = modal.mode === 'destroy' ? 1 : def?.targets?.min ?? 0;
  const selecting = modal.mode !== 'view';
  const inPile = new Set(run.blind?.drawPile.map((c) => c.id) ?? []);
  const ordered = sortCards(run.deck);

  const toggle = (id: string) => {
    if (!selecting) return;
    sfx('click');
    setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : max === 1 ? [id] : x.length < max ? [...x, id] : x));
  };

  const confirm = () => {
    if (modal.mode === 'consumable') {
      const r = act((rn) => applyConsumable(rn, modal.uid, sel));
      sfx(r.ok ? 'xmult' : 'error');
      toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) close();
    } else if (modal.mode === 'destroy') {
      const r = act((rn) => destroyService(rn, sel[0]));
      sfx(r.ok ? 'run' : 'error');
      toast(r.message, r.ok ? 'good' : 'bad');
      if (r.ok) close();
    }
  };

  const title =
    modal.mode === 'view' ? `Seu baralho (${run.deck.length})` : modal.mode === 'destroy' ? 'Escolha uma carta para destruir' : `${def?.name}: escolha a(s) carta(s)`;

  // contagem por valor
  const counts = RANKS.map((r) => ({ r, n: run.deck.filter((c) => c.rank === r).length }));

  return (
    <ModalFrame title={title} onClose={close} wide>
      {def && (
        <p className="deck-help">
          <Rich text={def.description} />
        </p>
      )}
      {run.blind && modal.mode === 'view' && <p className="muted">Cartas apagadas já saíram do monte neste Blind.</p>}
      <div className="deck-grid">
        {SUITS.slice()
          .reverse()
          .map((suit) => (
            <div className="deck-row" key={suit}>
              <div className={`deck-suit suit-${suit}`}>
                {SUIT_SYMBOL[suit]} <small>{SUIT_NAME[suit]}</small>
              </div>
              <div className="deck-cards">
                {ordered
                  .filter((c) => c.suit === suit)
                  .map((c) => (
                    <CardView
                      key={c.id}
                      card={c}
                      tiny
                      tip
                      selected={sel.includes(c.id)}
                      dim={!!run.blind && modal.mode === 'view' && !inPile.has(c.id)}
                      onClick={selecting ? () => toggle(c.id) : undefined}
                    />
                  ))}
              </div>
            </div>
          ))}
      </div>
      <div className="deck-counts">
        {counts.map(({ r, n }) => (
          <span key={r}>
            {r}: <b>{n}</b>
          </span>
        ))}
      </div>
      {selecting && (
        <div className="modal-actions">
          <span>
            {sel.length}/{max} selecionada(s)
          </span>
          <button className="btn primary" disabled={sel.length < min} onClick={confirm}>
            {modal.mode === 'destroy' ? 'Destruir' : 'Usar'}
          </button>
        </div>
      )}
    </ModalFrame>
  );
}

function MenuModal() {
  return (
    <ModalFrame title="Menu" onClose={close}>
      <div className="menu-list">
        <button className="btn" onClick={close}>
          Voltar ao jogo
        </button>
        <button className="btn" onClick={() => update((s) => (s.modal = { type: 'how' }))}>
          Como funciona a pontuação
        </button>
        <button
          className="btn"
          onClick={goSettings}
        >
          Configurações
        </button>
        <button
          className="btn"
          onClick={() =>
            update((s) => {
              s.modal = null;
              s.screen = 'title';
            })
          }
        >
          Sair para o título (a run fica salva)
        </button>
      </div>
    </ModalFrame>
  );
}
