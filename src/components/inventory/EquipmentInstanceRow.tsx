// EquipmentInstanceRow — one row inside an expanded equipment stack.
//
// Each row shows full name (with tier/modifier), per-instance stat list,
// and equip/unequip/lock/sell actions. Hovering opens the rich
// EquipmentInstanceTooltip via portal.
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, EquipSlot, ItemInstance } from '../../types';
import { ITEMS } from '../../data/items';
import { fullItemName } from '../../data/modifiers';
import {
  instanceStats, isInstanceEquipped, equipInstance, unequipSlot,
  getInstanceSellPrice, sellInstance,
} from '../../systems/playerStats';
import { formatStat } from '../shared/statFormatting';
import { EquipmentInstanceTooltip } from './EquipmentInstanceTooltip';

export function EquipmentInstanceRow({ state, inst, onAction }: {
  state: GameState; inst: ItemInstance; onAction: () => void;
}) {
  const def = ITEMS[inst.id];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  function show() {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left - 12, y: rect.top });
  }
  function hide() { setCoords(null); }

  if (!def) return null;
  const equipped = isInstanceEquipped(state, inst.instId);
  const full = fullItemName(def.name, inst.tier, inst.modifier);
  const stats = instanceStats(inst);
  const locked = !!inst.locked;
  return (
    <div
      ref={rowRef}
      className={`equipment-instance-row tier-${inst.tier} ${equipped ? 'eq' : ''} has-tooltip`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="equipment-instance-name">
        {full} {locked && <span title="Locked">🔒</span>}
      </div>
      <div className="equipment-instance-stats-line">
        {Object.entries(stats).map(([k, v]) => (
          <span key={k} className={`equip-stat ${(v as number) >= 0 ? 'pos' : 'neg'}`}>
            {formatStat(k, v as number)}
          </span>
        ))}
      </div>
      <div className="equipment-instance-actions">
        {equipped ? (
          <button onClick={() => {
            const slot = def.equip?.slot as EquipSlot | undefined;
            if (slot) unequipSlot(state, slot);
            onAction();
          }}>Unequip</button>
        ) : (
          <button onClick={() => { equipInstance(state, inst.instId); onAction(); }}>Equip</button>
        )}
        <button
          className="mini"
          onClick={() => { inst.locked = !inst.locked; onAction(); }}
          title={locked ? 'Unlock' : 'Lock'}
        >{locked ? '🔓' : '🔒'}</button>
        {!equipped && !locked && (
          <button
            className="mini"
            onClick={() => {
              if (window.confirm(`Sell ${full} for ${getInstanceSellPrice(inst)} coin?`)) {
                sellInstance(state, inst);
                onAction();
              }
            }}
            title="Sell"
          >×</button>
        )}
      </div>
      {coords && createPortal(
        <EquipmentInstanceTooltip inst={inst} equipped={equipped} x={coords.x} y={coords.y} />,
        document.body
      )}
    </div>
  );
}
