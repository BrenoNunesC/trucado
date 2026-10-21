// Coringas e consumíveis: visual, tooltip e barra de inventário.

import { sfx } from '../../audio/sfx';
import { CONSUMABLE_BY_ID, KIND_NAME, type ConsumableDef } from '../../data/consumables';
import { JOKER_BY_ID, RARITY_NAME } from '../../data/jokers';
import { EDITION_NAME } from '../../engine/cards';
import { moveJoker, sellConsumable, sellJoker, sellValue, applyConsumable } from '../../engine/inventory';
import type { JokerEdition, JokerInstance } from '../../engine/state';
import { act, getState, toast, update, useApp } from '../store';
import { Rich } from '../text';
import { Tip } from './Tip';

const JOKER_EDITION_DESC: Record<JokerEdition, string> = {
  folheada: '+20 Fichas',
  holografica: '+4 Mult',
  fosforescente: '×1.5 Mult',
};

export function JokerTip({ id, inst, edition, price }: { id: string; inst?: JokerInstance; edition?: JokerEdition; price?: number }) {
  const def = JOKER_BY_ID[id];
  const ed = inst?.edition ?? edition;
  const fake: JokerInstance = inst ?? { uid: '', id, state: def.initialState?.() ?? {}, cost: 0 };
  return (
    <div className="tip-joker">
      <strong>{def.name}</strong>
      <span className={`rarity rarity-${def.rarity}`}>{RARITY_NAME[def.rarity]}</span>
      <p>
        <Rich text={def.description(fake)} />
      </p>
      {ed && (
        <p>
          <span className="tip-tag">{EDITION_NAME[ed]}</span> <Rich text={JOKER_EDITION_DESC[ed]} />
        </p>
      )}
      {inst && <small>Venda: ${sellValue(inst)}</small>}
      {price !== undefined && <small>Preço: ${price}</small>}
    </div>
  );
}

export function JokerFace({
  id,
  edition,
  disabled,
  selected,
  onClick,
  dataRef,
  small,
}: {
  id: string;
  edition?: JokerEdition;
  disabled?: boolean;
  selected?: boolean;
  onClick?: () => void;
  dataRef?: string;
  small?: boolean;
}) {
  const def = JOKER_BY_ID[id];
  return (
    <button
      type="button"
      className={`joker rarity-${def.rarity} ${edition ? `ed-${edition}` : ''} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''} ${small ? 'small' : ''}`}
      style={{ ['--jc' as string]: def.color ?? '#ffcc00' }}
      onClick={onClick}
      data-ref={dataRef}
      aria-label={`Coringa ${def.name}`}
    >
      <span className="joker-icon">{def.icon}</span>
      <span className="joker-name">{def.name}</span>
      {disabled && <span className="joker-jail">🔒</span>}
      <span className="sheen" />
    </button>
  );
}

export function ConsumableTip({ def, price }: { def: ConsumableDef; price?: number }) {
  return (
    <div className="tip-joker">
      <strong>{def.name}</strong>
      <span className={`kind kind-${def.kind}`}>{KIND_NAME[def.kind]}</span>
      <p>
        <Rich text={def.description} />
      </p>
      {price !== undefined && <small>Preço: ${price}</small>}
    </div>
  );
}

export function ConsumableFace({ id, selected, onClick, dataRef }: { id: string; selected?: boolean; onClick?: () => void; dataRef?: string }) {
  const def = CONSUMABLE_BY_ID[id];
  return (
    <button
      type="button"
      className={`consumable kind-${def.kind} ${selected ? 'selected' : ''}`}
      onClick={onClick}
      data-ref={dataRef}
      aria-label={`${KIND_NAME[def.kind]}: ${def.name}`}
    >
      <span className="cons-icon">{def.icon}</span>
      <span className="cons-name">{def.name}</span>
    </button>
  );
}

/** Usa um consumível: abre o seletor de cartas se precisar de alvos. */
export function startUseConsumable(uid: string): void {
  const run = getState().run!;
  const c = run.consumables.find((x) => x.uid === uid);
  if (!c) return;
  const def = CONSUMABLE_BY_ID[c.id];
  if (def.targets) {
    update((s) => {
      s.modal = { type: 'deck', mode: 'consumable', uid };
      s.selectedConsumable = null;
    });
    return;
  }
  const r = act((run) => applyConsumable(run, uid));
  sfx(r.ok ? 'xmult' : 'error');
  toast(r.message, r.ok ? 'good' : 'bad');
  update((s) => (s.selectedConsumable = null));
}

export function InventoryBar({ busy }: { busy?: boolean }) {
  const s = useApp();
  const run = s.run!;
  const disabledUid = run.blind?.rules.disabledJoker;

  const selectJoker = (uid: string) => {
    sfx('click');
    update((st) => {
      st.selectedJoker = st.selectedJoker === uid ? null : uid;
      st.selectedConsumable = null;
    });
  };
  const selectCons = (uid: string) => {
    sfx('click');
    update((st) => {
      st.selectedConsumable = st.selectedConsumable === uid ? null : uid;
      st.selectedJoker = null;
    });
  };

  return (
    <div className="inventory">
      <div className="joker-row" aria-label="Coringas">
        <div className="row-label">
          Coringas {run.jokers.length}/{run.jokerSlots}
        </div>
        <div className="slots">
          {run.jokers.map((j, i) => {
            const sel = s.selectedJoker === j.uid;
            return (
              <div className="slot" key={j.uid}>
                <Tip content={<JokerTip id={j.id} inst={j} />}>
                  <JokerFace id={j.id} edition={j.edition} disabled={j.uid === disabledUid} selected={sel} onClick={() => selectJoker(j.uid)} dataRef={j.uid} />
                </Tip>
                {sel && !busy && (
                  <div className="item-actions">
                    <button className="btn tiny" disabled={i === 0} onClick={() => act((r) => moveJoker(r, j.uid, i - 1))} aria-label="Mover para a esquerda">
                      ◀
                    </button>
                    <button
                      className="btn tiny sell"
                      onClick={() => {
                        const v = act((r) => sellJoker(r, j.uid));
                        sfx('coin');
                        toast(`Vendido por $${v}`, 'good');
                        update((st) => (st.selectedJoker = null));
                      }}
                    >
                      Vender ${sellValue(j)}
                    </button>
                    <button className="btn tiny" disabled={i === run.jokers.length - 1} onClick={() => act((r) => moveJoker(r, j.uid, i + 1))} aria-label="Mover para a direita">
                      ▶
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, run.jokerSlots - run.jokers.length) }, (_, i) => (
            <div className="slot empty" key={`e${i}`} />
          ))}
        </div>
      </div>
      <div className="cons-row" aria-label="Consumíveis">
        <div className="row-label">
          Consumíveis {run.consumables.length}/{run.consumableSlots}
        </div>
        <div className="slots">
          {run.consumables.map((c) => {
            const def = CONSUMABLE_BY_ID[c.id];
            const sel = s.selectedConsumable === c.uid;
            return (
              <div className="slot" key={c.uid}>
                <Tip content={<ConsumableTip def={def} />}>
                  <ConsumableFace id={c.id} selected={sel} onClick={() => selectCons(c.uid)} dataRef={c.uid} />
                </Tip>
                {sel && !busy && (
                  <div className="item-actions">
                    <button className="btn tiny use" onClick={() => startUseConsumable(c.uid)}>
                      Usar
                    </button>
                    <button
                      className="btn tiny sell"
                      onClick={() => {
                        act((r) => sellConsumable(r, c.uid));
                        sfx('coin');
                        update((st) => (st.selectedConsumable = null));
                      }}
                    >
                      Vender $1
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, run.consumableSlots - run.consumables.length) }, (_, i) => (
            <div className="slot empty small" key={`c${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
