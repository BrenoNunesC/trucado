import { useState, type ReactNode } from 'react';
import { sfx } from '../../audio/sfx';
import { BET_MULT } from '../../data/balance';
import { CATEGORIES, categoryValues } from '../../data/categories';
import { CONSUMABLE_BY_ID, CONSUMABLES, KIND_NAME } from '../../data/consumables';
import { JOKER_BY_ID, JOKERS, RARITY_NAME } from '../../data/jokers';
import { computeCashout } from '../../engine/blind';
import { compareCards, RANKS, SUITS, SUIT_NAME, SUIT_SYMBOL, type Card } from '../../engine/cards';
import { addConsumable, addJoker, applyConsumable } from '../../engine/inventory';
import type { JokerEdition } from '../../engine/state';
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
  if (m.type === 'admin') return <AdminModal />;
  return null;
}

/**
 * Painel do administrador: dinheiro, qualquer Coringa ou consumível, mais mãos e vencer o Blind
 * na hora. Só aparece com o modo administrador ligado (Configurações).
 */
function AdminModal() {
  const s = useApp();
  const run = s.run;
  const [jokerId, setJokerId] = useState(JOKERS[0]?.id ?? '');
  const [edition, setEdition] = useState<'' | JokerEdition>('');
  const [consId, setConsId] = useState(CONSUMABLES[0]?.id ?? '');
  const blind = run?.blind;
  const online = !!run?.coop?.online;
  const canWin = !!blind && !online && (blind.stage === 'playing' || blind.stage === 'onze' || blind.stage === 'handOver');
  const done = (msg: string) => {
    sfx('coin');
    toast(msg, 'good');
  };
  return (
    <ModalFrame title="Painel do administrador" onClose={close} wide>
      {!run ? (
        <p className="muted">Comece ou continue uma run para usar o painel. Tudo já está desbloqueado no seu perfil.</p>
      ) : (
        <div className="admin-panel">
          <section>
            <h3>Dinheiro</h3>
            {[10, 50, 100].map((n) => (
              <button key={n} className="btn" onClick={() => (act((r) => (r.money += n)), done(`+$${n}`))}>
                +${n}
              </button>
            ))}
          </section>
          <section>
            <h3>Coringa</h3>
            <select value={jokerId} onChange={(e) => setJokerId(e.target.value)} aria-label="Coringa">
              {[...JOKERS]
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({RARITY_NAME[j.rarity]})
                  </option>
                ))}
            </select>
            <select value={edition} onChange={(e) => setEdition(e.target.value as '' | JokerEdition)} aria-label="Edição">
              <option value="">Sem edição</option>
              <option value="folheada">Folheada</option>
              <option value="holografica">Holográfica</option>
              <option value="fosforescente">Fosforescente</option>
            </select>
            <button
              className="btn primary"
              onClick={() => {
                // o painel abre espaço se os slots estiverem cheios
                act((r) => {
                  if (r.jokers.length >= r.jokerSlots) r.jokerSlots += 1;
                  addJoker(r, jokerId, edition || undefined, 0);
                });
                done(`${JOKER_BY_ID[jokerId].name} adicionado`);
              }}
            >
              Adicionar
            </button>
          </section>
          <section>
            <h3>Consumível</h3>
            <select value={consId} onChange={(e) => setConsId(e.target.value)} aria-label="Consumível">
              {CONSUMABLES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({KIND_NAME[c.kind]})
                </option>
              ))}
            </select>
            <button
              className="btn primary"
              onClick={() => {
                act((r) => {
                  if (r.consumables.length >= r.consumableSlots) r.consumableSlots += 1;
                  addConsumable(r, CONSUMABLE_BY_ID[consId].kind, consId);
                });
                done(`${CONSUMABLE_BY_ID[consId].name} adicionado`);
              }}
            >
              Adicionar
            </button>
          </section>
          <section>
            <h3>Run</h3>
            <button className="btn" onClick={() => (act((r) => (r.jokerSlots += 1)), done('+1 slot de Coringa'))}>
              +1 slot de Coringa
            </button>
            <button className="btn" onClick={() => (act((r) => (r.consumableSlots += 1)), done('+1 slot de consumível'))}>
              +1 slot de consumível
            </button>
            {blind && (
              <button className="btn" onClick={() => (act((r) => (r.blind!.handsLeft += 1)), done('+1 mão neste Blind'))}>
                +1 mão neste Blind
              </button>
            )}
            {blind && (
              <button className="btn" onClick={() => (act((r) => (r.blind!.bluffsLeft += 1)), done('+1 blefe neste Blind'))}>
                +1 blefe
              </button>
            )}
            <button
              className="btn danger"
              disabled={!canWin}
              title={online ? 'Na campanha online quem decide o Blind é o placar da dupla.' : undefined}
              onClick={() => {
                act((r) => {
                  const b = r.blind!;
                  b.score = Math.max(b.score, b.info.target);
                  b.stage = 'won';
                  b.cashout = computeCashout(r);
                });
                close();
                done('Blind vencido');
              }}
            >
              Vencer este Blind
            </button>
          </section>
        </div>
      )}
    </ModalFrame>
  );
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
  const s = useApp();
  return (
    <ModalFrame title="Menu" onClose={close}>
      <div className="menu-list">
        <button className="btn" onClick={close}>
          Voltar ao jogo
        </button>
        {s.profile.admin && (
          <button className="btn primary" onClick={() => update((x) => (x.modal = { type: 'admin' }))}>
            Painel do administrador
          </button>
        )}
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
