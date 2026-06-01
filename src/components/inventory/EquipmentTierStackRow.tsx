// EquipmentTierStackRow — one tier sub-row inside a base item group.
// Expandable: clicking opens a list of modifier sub-rows for that tier.
//
// Layout:
//   Regrettable  ×31,022                 [+]
//     ├── plain     ×28,500   [Equip one] [Sell all]
//     ├── Sharp     ×1,200    [Equip one] [Sell all]
//     └── Cursed    ×800      [Equip one] [Sell all]
//
// When a stat filter is active, only modifier rows whose specific
// (tier+modifier) roll satisfies the filter render. If none of the
// modifiers match, the whole tier row hides.
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, QualityTier, StatKey, ItemInstance } from '../../types';
import { ITEMS } from '../../data/items';
import { MODIFIERS } from '../../data/modifiers';
import {
  pullFromStack, equipInstance, sellFromStack, getStackUnitSellPrice,
  instanceStats,
} from '../../systems/playerStats';
import { EquipmentInstanceTooltip } from './EquipmentInstanceTooltip';
import { bAdd } from '../../util/bignum';

const TIER_LABEL: Record<QualityTier, string> = {
  unreasonable: 'Unreasonable',
  suspicious: 'Suspicious',
  adequate: 'Adequate',
  forgettable: 'Forgettable',
  regrettable: 'Regrettable',
};

// Check a specific (baseId, tier, modifier) combo against a filter set.
function rollMatchesFilter(
  baseId: string, tier: QualityTier, modifierKey: string, selected: Set<StatKey>
): boolean {
  if (selected.size === 0) return true;
  const modifier = modifierKey === '' ? null : modifierKey;
  const tmpInst: ItemInstance = { id: baseId, tier, modifier, instId: '_filt' };
  const stats = instanceStats(tmpInst);
  for (const s of selected) {
    if (!stats[s] || stats[s] === 0) return false;
  }
  return true;
}

function modifierDisplayName(modifierKey: string): string {
  if (modifierKey === '') return 'plain';
  const mod = MODIFIERS.find(m => m.id === modifierKey);
  return mod?.name || modifierKey;
}

export function EquipmentTierStackRow({ state, baseId, tier, onAction, filter }: {
  state: GameState; baseId: string; tier: QualityTier; onAction: () => void;
  filter: Set<StatKey>;
}) {
  const [expanded, setExpanded] = useState(false);
  const stack = state.equipStacks?.[baseId]?.[tier];
  if (!stack || stack.count <= 0) return null;
  const def = ITEMS[baseId];
  if (!def) return null;

  // Find modifier entries that match the filter (or all of them if no filter)
  const modEntries = Object.entries(stack.mods)
    .filter(([_, c]) => (c ?? 0) > 0)
    .filter(([k]) => rollMatchesFilter(baseId, tier, k, filter));

  if (modEntries.length === 0) return null;

  // Total count visible after filtering
  const visibleCount = modEntries.reduce((acc, [, c]) => acc + (c ?? 0), 0);

  const unitPrice = getStackUnitSellPrice(baseId, tier);

  // Sort modifier rows: 'plain' first, then alphabetical
  modEntries.sort((a, b) => {
    if (a[0] === '') return -1;
    if (b[0] === '') return 1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <>
      <div
        className={`equipment-instance-row tier-${tier} stack-row`}
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="equipment-instance-name">
          {TIER_LABEL[tier]} <span className="inv-count">×{visibleCount.toLocaleString()}</span>
        </div>
        <div className="equipment-instance-stats-line">
          <span className="equip-stat">{unitPrice} coin each</span>
        </div>
        <div className="equipment-instance-actions">
          <span className="equipment-expand-chev">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>
      {expanded && (
        <div className="equipment-modifier-list">
          {modEntries.map(([modKey, count]) => (
            <ModifierRow
              key={modKey || '_plain'}
              state={state}
              baseId={baseId}
              tier={tier}
              modifierKey={modKey}
              count={count ?? 0}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ModifierRow({ state, baseId, tier, modifierKey, count, onAction }: {
  state: GameState;
  baseId: string;
  tier: QualityTier;
  modifierKey: string;
  count: number;
  onAction: () => void;
}) {
  const def = ITEMS[baseId];
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  if (!def) return null;
  const label = modifierDisplayName(modifierKey);
  const unitPrice = getStackUnitSellPrice(baseId, tier);

  // Synthesize a representative instance for tooltip rendering — every item
  // of this (tier, modifier) pair has identical stats, so a single sample
  // is sufficient.
  const sampleInst: ItemInstance = {
    id: baseId,
    tier,
    modifier: modifierKey === '' ? null : modifierKey,
    instId: '_sample',
  };

  function show() {
    const el = rowRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left - 12, y: rect.top });
  }
  function hide() { setCoords(null); }

  return (
    <div
      ref={rowRef}
      className={`equipment-instance-row tier-${tier} modifier-row has-tooltip`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div className="equipment-instance-name">
        <span style={{ marginLeft: 16 }}>{label}</span>
        <span className="inv-count">×{count.toLocaleString()}</span>
      </div>
      <div className="equipment-instance-stats-line"></div>
      <div className="equipment-instance-actions">
        <button
          onClick={() => {
            const inst = pullFromStack(state, baseId, tier, modifierKey === '' ? null : modifierKey);
            if (inst) {
              equipInstance(state, inst.instId);
              onAction();
            }
          }}
        >Equip one</button>
        <button
          className="mini"
          onClick={() => {
            const stack = state.equipStacks?.[baseId]?.[tier];
            if (!stack) return;
            const avail = stack.mods[modifierKey] ?? 0;
            if (avail <= 0) return;
            if (!window.confirm(`Sell all ${avail} ${label} ${def.name} (${TIER_LABEL[tier]}) for ${(unitPrice * avail).toLocaleString()} coin?`)) return;
            stack.mods[modifierKey] = 0;
            delete stack.mods[modifierKey];
            stack.count -= avail;
            if (stack.count <= 0) delete state.equipStacks![baseId][tier];
            state.coin = bAdd(state.coin, unitPrice * avail);
            onAction();
          }}
        >Sell all</button>
      </div>
      {coords && createPortal(
        <EquipmentInstanceTooltip inst={sampleInst} equipped={false} x={coords.x} y={coords.y} />,
        document.body
      )}
    </div>
  );
}
