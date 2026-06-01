// SatchelCategorized — the player's inventory view.
//
// Organizes inventory into sections by category (materials, consumables,
// loot, currency, quest, equipment). Each section is collapsible; collapse
// state persists across reloads via state.satchelCollapsed.
//
// Equipment gets a dedicated section (EquipmentSatchelSection) because it
// uses instances rather than count-stacked items.
//
// Adding a new category: ensure CATEGORY_ORDER and CATEGORY_LABELS in
// items.ts know about it. No changes needed here.
import React from 'react';
import type { GameState, ItemCategory } from '../../types';
import { ITEMS, CATEGORY_ORDER, CATEGORY_LABELS } from '../../data/items';
import { sellCategory } from '../../systems/engine';
import { fmt } from '../../systems/format';
import { InvItemRow } from './InvItemRow';
import { EquipmentSatchelSection } from './EquipmentSatchelSection';

export function SatchelCategorized({ state, onAction }: { state: GameState; onAction: () => void }) {
  const has = (cat: ItemCategory) =>
    Object.keys(state.inv).some(id => state.inv[id] > 0 && ITEMS[id]?.category === cat);

  const equipBaseIds = Object.keys(state.equipInstances ?? {}).filter(
    id => (state.equipInstances?.[id]?.length ?? 0) > 0
  );
  const anyInv = Object.values(state.inv).some(n => n > 0);
  const anyEquip = equipBaseIds.length > 0;
  if (!anyInv && !anyEquip) {
    return <div style={{ fontStyle: 'italic', color: 'var(--ink-soft)', fontSize: '0.9em' }}>Empty. Sad.</div>;
  }

  return (
    <>
      {anyEquip && <EquipmentSatchelSection state={state} onAction={onAction} />}
      {CATEGORY_ORDER.filter((c) => c !== 'equipment').filter(has).map((cat) => {
        const items = Object.keys(state.inv)
          .filter(id => state.inv[id] > 0 && ITEMS[id]?.category === cat)
          .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));
        const collapsed = !!state.satchelCollapsed[cat];
        const totalCount = items.reduce((acc, id) => acc + state.inv[id], 0);
        const totalValue = items.reduce((acc, id) => acc + state.inv[id] * ITEMS[id].sell, 0);
        const sellable = cat !== 'quest';

        return (
          <div className="satchel-section" key={cat}>
            <div
              className="satchel-section-header"
              onClick={() => {
                state.satchelCollapsed[cat] = !collapsed;
                onAction();
              }}
            >
              <span>{collapsed ? '▸' : '▾'} {CATEGORY_LABELS[cat]}</span>
              <span className="satchel-section-meta">{totalCount} · {fmt(totalValue)}c</span>
            </div>
            {!collapsed && (
              <>
                {items.map((id) => {
                  const def = ITEMS[id];
                  const equipped = state.equipped.weapon === id || state.equipped.shield === id;
                  const locked = !!state.satchelLocked[id];
                  const isConsumable = !!def.consume;
                  return (
                    <InvItemRow
                      key={id}
                      id={id}
                      state={state}
                      onAction={onAction}
                      cat={cat}
                      equipped={equipped}
                      locked={locked}
                      isConsumable={isConsumable}
                    />
                  );
                })}
                {sellable && items.length > 1 && (
                  <button
                    className="mini bulk-sell no-click-sfx"
                    onClick={() => {
                      if (window.confirm(`Sell all ${CATEGORY_LABELS[cat]} (excluding locked and equipped)?`)) {
                        sellCategory(state, cat);
                        onAction();
                      }
                    }}
                  >Sell all {CATEGORY_LABELS[cat].toLowerCase()}</button>
                )}
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
