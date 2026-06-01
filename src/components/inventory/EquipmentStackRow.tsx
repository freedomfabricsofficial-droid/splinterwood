// EquipmentStackRow — one expandable group in the equipment satchel,
// containing both tier-stack rows AND tracked-instance rows for one
// base item id.
//
// Layout when expanded:
//   ├── Tier sub-rows (Unreasonable / Suspicious / Adequate / Forgettable /
//   │   Regrettable) with counts pulled from state.equipStacks[baseId][tier].
//   │   Each tier sub-row is itself expandable into modifier rows.
//   ├── Tracked-instance rows (equipped, locked, or otherwise individualized)
//   │   from state.equipInstances[baseId]
//
// Sort: tier desc (unreasonable → regrettable). Within a tier the stack
// row appears before the instances at that tier. The filter prop, when
// non-empty, hides modifier rows that don't match — and therefore hides
// tier rows when all modifiers within fail to match.
import React, { useState } from 'react';
import type { GameState, QualityTier, ItemInstance, StatKey } from '../../types';
import { ITEMS } from '../../data/items';
import { getItemIcon, GenericIcon } from '../../data/icons';
import { EquipmentInstanceRow } from './EquipmentInstanceRow';
import { EquipmentTierStackRow } from './EquipmentTierStackRow';
import { instanceStats } from '../../systems/playerStats';

const TIER_ORDER: QualityTier[] = ['unreasonable', 'suspicious', 'adequate', 'forgettable', 'regrettable'];
const TIER_RANK: Record<QualityTier, number> = {
  unreasonable: 5, suspicious: 4, adequate: 3, forgettable: 2, regrettable: 1,
};

function instMatchesFilter(inst: ItemInstance, selected: Set<StatKey>): boolean {
  if (selected.size === 0) return true;
  const stats = instanceStats(inst);
  for (const s of selected) {
    if (!stats[s] || stats[s] === 0) return false;
  }
  return true;
}

export function EquipmentStackRow({ state, baseId, onAction, filter }: {
  state: GameState; baseId: string; onAction: () => void; filter: Set<StatKey>;
}) {
  const [expanded, setExpanded] = useState(false);
  const def = ITEMS[baseId];
  const instances = state.equipInstances?.[baseId] ?? [];
  const stacks = state.equipStacks?.[baseId] ?? {};

  const instCount = instances.length;
  const stackCount = TIER_ORDER.reduce((acc, t) => acc + (stacks[t]?.count ?? 0), 0);
  const total = instCount + stackCount;
  if (!def || total === 0) return null;

  // If a filter is active and NOTHING inside this base item matches, hide
  // the whole row to keep the list tidy.
  if (filter.size > 0) {
    let anyMatch = false;
    for (const t of TIER_ORDER) {
      const stack = stacks[t];
      if (stack && stack.count > 0) {
        for (const [modKey, count] of Object.entries(stack.mods)) {
          if ((count ?? 0) <= 0) continue;
          const tmpInst: ItemInstance = {
            id: baseId, tier: t, modifier: modKey === '' ? null : modKey, instId: '_f',
          };
          const stats = instanceStats(tmpInst);
          let ok = true;
          for (const s of filter) {
            if (!stats[s] || stats[s] === 0) { ok = false; break; }
          }
          if (ok) { anyMatch = true; break; }
        }
        if (anyMatch) break;
      }
    }
    if (!anyMatch) {
      // Check instances too
      for (const inst of instances) {
        if (instMatchesFilter(inst, filter)) { anyMatch = true; break; }
      }
    }
    if (!anyMatch) return null;
  }

  const sortedInsts: ItemInstance[] = [...instances].sort(
    (a, b) => (TIER_RANK[b.tier] - TIER_RANK[a.tier])
  );

  return (
    <>
      <div className="inv-item equipment-stack-row" onClick={() => setExpanded(!expanded)}>
        <div className="inv-icon">{getItemIcon(baseId, 32) ?? <GenericIcon size={32} />}</div>
        <div className="inv-meta">
          <span className="inv-name">{def.name}</span>
          <span className="inv-count">×{total.toLocaleString()}</span>
        </div>
        <span className="equipment-expand-chev">{expanded ? '▾' : '▸'}</span>
      </div>
      {expanded && (
        <div className="equipment-instance-list">
          {TIER_ORDER.map((tier) => {
            const tierInstances = sortedInsts.filter(i => i.tier === tier && instMatchesFilter(i, filter));
            return (
              <React.Fragment key={tier}>
                <EquipmentTierStackRow
                  state={state}
                  baseId={baseId}
                  tier={tier}
                  onAction={onAction}
                  filter={filter}
                />
                {tierInstances.map((inst) => (
                  <EquipmentInstanceRow key={inst.instId} state={state} inst={inst} onAction={onAction} />
                ))}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </>
  );
}
