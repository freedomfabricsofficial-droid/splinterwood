// EquipmentSatchelSection — the Equipment category in the Satchel.
//
// New in v0.76: stat-filter chip row at the top. Click any stat chip to
// require that stat in the rolls displayed below. Multiple chips are AND.
// Filter passes down through EquipmentStackRow → EquipmentTierStackRow →
// ModifierRow so the matching is done at the most granular level.
//
// "Sell all unprotected gear" excludes equipped, locked, and "Unreasonable"
// (both instances and stacks).
import { useState } from 'react';
import type { GameState, ItemCategory, StatKey } from '../../types';
import { ITEMS } from '../../data/items';
import { sellAllUnprotectedEquipment } from '../../systems/playerStats';
import { showToast } from '../../systems/engine';
import { STAT_LABELS } from '../shared/statFormatting';
import { EquipmentStackRow } from './EquipmentStackRow';

// Stats commonly rolled on equipment
const FILTERABLE_STATS: StatKey[] = [
  'atk', 'def', 'hp', 'crit', 'crit_dmg', 'speed',
  'gather_speed', 'craft_speed', 'coin_find', 'drop_rate',
];

export function EquipmentSatchelSection({ state, onAction }: { state: GameState; onAction: () => void }) {
  const cat: ItemCategory = 'equipment';
  const collapsed = !!state.satchelCollapsed[cat];
  const [selectedStats, setSelectedStats] = useState<Set<StatKey>>(new Set());

  // All base ids that have any content (stacks or instances)
  const fromStacks = Object.keys(state.equipStacks ?? {})
    .filter(id => Object.values(state.equipStacks![id]).some(s => (s?.count ?? 0) > 0));
  const fromInsts = Object.keys(state.equipInstances ?? {})
    .filter(id => (state.equipInstances?.[id]?.length ?? 0) > 0);
  const allBaseIds = Array.from(new Set([...fromStacks, ...fromInsts]))
    .filter(id => ITEMS[id])
    .sort((a, b) => ITEMS[a].name.localeCompare(ITEMS[b].name));

  // Total counts for the header
  const stackTotal = Object.values(state.equipStacks ?? {})
    .reduce((acc, tierMap) => acc + Object.values(tierMap).reduce((a, s) => a + (s?.count ?? 0), 0), 0);
  const instTotal = Object.values(state.equipInstances ?? {})
    .reduce((acc, list) => acc + list.length, 0);
  const totalCount = stackTotal + instTotal;

  const toggleStat = (s: StatKey) => {
    const next = new Set(selectedStats);
    if (next.has(s)) next.delete(s); else next.add(s);
    setSelectedStats(next);
  };

  return (
    <div className="satchel-section">
      <div
        className="satchel-section-header"
        onClick={() => {
          state.satchelCollapsed[cat] = !collapsed;
          onAction();
        }}
      >
        <span>{collapsed ? '▸' : '▾'} Equipment</span>
        <span className="satchel-section-meta">{totalCount.toLocaleString()}</span>
      </div>
      {!collapsed && (
        <>
          <div className="equipment-filter-row">
            <span className="equipment-filter-label">Filter by stat:</span>
            {FILTERABLE_STATS.map((s) => {
              const active = selectedStats.has(s);
              return (
                <button
                  key={s}
                  className={`mini stat-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleStat(s)}
                >{STAT_LABELS[s] ?? s}</button>
              );
            })}
            {selectedStats.size > 0 && (
              <button
                className="mini stat-chip-clear"
                onClick={() => setSelectedStats(new Set())}
              >Clear</button>
            )}
          </div>
          {allBaseIds.map((baseId) => (
            <EquipmentStackRow
              key={baseId}
              state={state}
              baseId={baseId}
              onAction={onAction}
              filter={selectedStats}
            />
          ))}
          <button
            className="mini bulk-sell"
            onClick={() => {
              if (window.confirm("Sell all equipment below Unreasonable? Equipped and locked items are kept safe.")) {
                const result = sellAllUnprotectedEquipment(state);
                if (result.count > 0) showToast(`Sold ${result.count.toLocaleString()} pieces for ${result.total.toLocaleString()} coin.`);
                else showToast('Nothing to sell — everything is protected.');
                onAction();
              }
            }}
          >Sell all unprotected gear</button>
        </>
      )}
    </div>
  );
}
