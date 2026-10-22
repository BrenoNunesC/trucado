import { sfx } from '../../audio/sfx';
import { CONSUMABLE_BY_ID } from '../../data/consumables';
import { PACK_BY_ID } from '../../data/packs';
import { VOUCHER_BY_ID } from '../../data/vouchers';
import { pickFromPack, skipPack, buyItem, buyPack, buyVoucher, reroll, rerollCost } from '../../engine/shop';
import { leaveShop, openQueuedPack } from '../../engine/run';
import { campShopDone } from '../campaignOnline';
import { CardView } from '../components/CardView';
import { ConsumableFace, ConsumableTip, InventoryBar, JokerFace, JokerTip } from '../components/Items';
import { Tip } from '../components/Tip';
import { act, toast, update, useApp } from '../store';
import { Rich } from '../text';

function feedback(r: { ok: boolean; message: string }, okSound: 'buy' | 'pack' = 'buy') {
  sfx(r.ok ? okSound : 'error');
  if (!r.ok) toast(r.message, 'bad');
}

export function Shop() {
  const s = useApp();
  const run = s.run!;
  const shop = run.shop!;
  const rc = rerollCost(run);
  const online = !!run.coop?.online;
  const camp = s.online?.camp;

  return (
    <div className="shop">
      <InventoryBar />
      <div className="shop-body">
        <div className="shop-actions">
          {online ? (
            // online: o próximo Blind começa quando os dois saírem da loja
            <button className="btn primary big" disabled={camp?.shopDone.you} onClick={() => (sfx('click'), campShopDone())}>
              {camp?.shopDone.you ? `Esperando ${camp.partner.name} sair da loja…` : camp?.shopDone.partner ? `Próximo Blind ▶ (${camp.partner.name} já está pronto)` : 'Próximo Blind ▶'}
            </button>
          ) : (
            <button
              className="btn primary big"
              onClick={() => {
                sfx('click');
                act((r) => leaveShop(r));
              }}
            >
              Próximo Blind ▶
            </button>
          )}
          <button className="btn reroll" disabled={run.money < rc} onClick={() => feedback(act((r) => reroll(r)))}>
            🎲 Rolar ${rc}
            {shop.freeRerolls > 0 && <small> ({shop.freeRerolls} grátis)</small>}
          </button>
          <Tip content="Afinar o baralho: escolha uma carta para destruir. Baralhos menores trazem suas melhores cartas mais vezes.">
            <button
              className="btn"
              disabled={run.money < shop.destroyCost}
              onClick={() => update((st) => (st.modal = { type: 'deck', mode: 'destroy' }))}
            >
              🔥 Destruir carta ${shop.destroyCost}
            </button>
          </Tip>
        </div>

        <section className="shop-section">
          <h3>Balcão</h3>
          <div className="shop-items">
            {shop.items.map((it, i) => (
              <div className={`shop-item ${it.sold ? 'sold' : ''}`} key={i}>
                {it.kind === 'joker' && (
                  <Tip content={<JokerTip id={it.id} edition={it.edition} price={it.price} />}>
                    <JokerFace id={it.id} edition={it.edition} />
                  </Tip>
                )}
                {it.kind === 'consumable' && (
                  <Tip content={<ConsumableTip def={CONSUMABLE_BY_ID[it.id]} price={it.price} />}>
                    <ConsumableFace id={it.id} />
                  </Tip>
                )}
                {it.kind === 'card' && <CardView card={it.card} tip />}
                <div className="price-tag">${it.price}</div>
                {!it.sold ? (
                  <button className="btn buy" disabled={run.money < it.price} onClick={() => feedback(act((r) => buyItem(r, i)))}>
                    Comprar
                  </button>
                ) : (
                  <span className="sold-stamp">VENDIDO</span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="shop-section">
          <h3>Pacotes</h3>
          <div className="shop-items">
            {shop.packs.map((p, i) => {
              const def = PACK_BY_ID[p.id];
              return (
                <div className={`shop-item pack ${p.sold ? 'sold' : ''}`} key={i}>
                  <Tip content={def.description}>
                    <div className={`pack-face pack-${def.content}`}>
                      <span className="pack-icon">{def.icon}</span>
                      <span className="pack-name">{def.name}</span>
                    </div>
                  </Tip>
                  <div className="price-tag">${p.price}</div>
                  {!p.sold ? (
                    <button className="btn buy" disabled={run.money < p.price} onClick={() => feedback(act((r) => buyPack(r, i)), 'pack')}>
                      Abrir
                    </button>
                  ) : (
                    <span className="sold-stamp">ABERTO</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="shop-section">
          <h3>Voucher</h3>
          {shop.voucher ? (
            <div className={`shop-item voucher ${shop.voucher.sold ? 'sold' : ''}`}>
              <Tip content={<Rich text={VOUCHER_BY_ID[shop.voucher.id].description} />}>
                <div className="voucher-face">
                  <span className="pack-icon">{VOUCHER_BY_ID[shop.voucher.id].icon}</span>
                  <span className="pack-name">{VOUCHER_BY_ID[shop.voucher.id].name}</span>
                  <small>{VOUCHER_BY_ID[shop.voucher.id].description}</small>
                </div>
              </Tip>
              <div className="price-tag">${shop.voucher.price}</div>
              {!shop.voucher.sold ? (
                <button
                  className="btn buy"
                  disabled={run.money < shop.voucher.price}
                  onClick={() => {
                    const r = act((rn) => buyVoucher(rn));
                    feedback(r);
                    if (r.ok) toast(r.message, 'good');
                  }}
                >
                  Resgatar
                </button>
              ) : (
                <span className="sold-stamp">ATIVO</span>
              )}
            </div>
          ) : (
            <p className="muted">Todos os vouchers resgatados!</p>
          )}
        </section>
      </div>
    </div>
  );
}

export function PackOverlay() {
  const s = useApp();
  const run = s.run!;
  const pack = run.pack!;
  const def = PACK_BY_ID[pack.packId];
  const close = () => {
    act((r) => {
      skipPack(r);
      openQueuedPack(r);
    });
  };
  return (
    <div className="pack-overlay" role="dialog" aria-label={def.name}>
      <h2>
        {def.icon} {def.name}
      </h2>
      <p>
        Escolha {pack.picksLeft} {pack.fromTag && <small>(presente da Tag)</small>}
      </p>
      <div className="pack-options">
        {pack.options.map((o, i) => {
          const pick = () => {
            const r = act((rn) => {
              const res = pickFromPack(rn, i);
              if (res.ok && !rn.pack) openQueuedPack(rn);
              return res;
            });
            sfx(r.ok ? 'buy' : 'error');
            toast(r.message, r.ok ? 'good' : 'bad');
          };
          return (
            <div className="pack-option flip-in" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              {o.kind === 'joker' && (
                <Tip content={<JokerTip id={o.id} edition={o.edition} />}>
                  <JokerFace id={o.id} edition={o.edition} onClick={pick} />
                </Tip>
              )}
              {o.kind === 'consumable' && (
                <Tip content={<ConsumableTip def={CONSUMABLE_BY_ID[o.id]} />}>
                  <ConsumableFace id={o.id} onClick={pick} />
                </Tip>
              )}
              {o.kind === 'card' && <CardView card={o.card} tip onClick={pick} />}
              <button className="btn small" onClick={pick}>
                Escolher
              </button>
            </div>
          );
        })}
      </div>
      <button className="btn" onClick={close}>
        Pular
      </button>
    </div>
  );
}
