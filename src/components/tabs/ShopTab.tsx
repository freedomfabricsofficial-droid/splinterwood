// ShopTab — Maggie's general store.
//
// Lists every entry in SHOP_ITEMS; each shows stock and cost. Daily-stock
// items show remaining/max; unlimited items just show the cost.
// Tab is read-only beyond the Buy button.
import type { GameState } from '../../types';
import { SHOP_ITEMS } from '../../data/shop';
import { ITEMS } from '../../data/items';
import { getItemIcon, GenericIcon } from '../../data/icons';
import { buyFromShop, getShopStock } from '../../systems/engine';
import { bGte } from '../../util/bignum';

export function ShopTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Maggie's selection is limited but earnest. Daily stock resets every 24 hours.
      </p>
      {SHOP_ITEMS.map((item) => {
        const def = ITEMS[item.id];
        const stock = getShopStock(state, item.id);
        const canBuy = bGte(state.coin, item.cost) && stock > 0;
        return (
          <div key={item.id} className="action-card">
            <div className="card-icon">{getItemIcon(item.id, 56) ?? <GenericIcon size={56} />}</div>
            <div className="card-body">
              <h4>{def.name}</h4>
              <div className="flavor">{def.flavor ?? ''}</div>
              <div className="reqs">
                {item.cost} coin
                {item.stockType === 'daily' && ` · stock: ${stock}/${item.dailyStock}`}
              </div>
              {def.consume?.description && (
                <div className="reqs" style={{ color: 'var(--green)' }}>{def.consume.description}</div>
              )}
            </div>
            <div className="card-actions">
              <button
                className="no-click-sfx"
                disabled={!canBuy}
                onClick={() => { buyFromShop(state, item.id); onAction(); }}
              >Buy</button>
            </div>
          </div>
        );
      })}
    </>
  );
}
