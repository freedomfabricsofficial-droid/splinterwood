import type { GameState } from '../../types';
import { ITEMS } from '../../data/items';
import { fullItemName } from '../../data/modifiers';
import { getItemIcon, GenericIcon } from '../../data/icons';
import { instanceStats, isInstanceEquipped } from '../../systems/playerStats';
import { listTemperable, temperItem } from '../../systems/enchanting';
import { temperCost, ENCHANT_PER_LEVEL } from '../../data/enchanting';
import { playSfx } from '../../systems/audio';

export function EnchantingTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const unlocked = !!state.questFlags.visited_floor3;
  if (!unlocked) {
    return (
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', padding: 12 }}>
        No loom of light to work at yet. Climb to the Cloud Islands and find Laileb.
      </p>
    );
  }

  const items = listTemperable(state);

  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Old steel, new spite. Bring me a thing you love and the bits you tore off something else. — Laileb
      </p>

      {items.length === 0 ? (
        <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', padding: 12 }}>
          Nothing here to enchant. Equip or lock a piece of gear, then bring it back to be tempered.
        </p>
      ) : (
        <>
          {items.map((inst) => {
            const def = ITEMS[inst.id];
            if (!def) return null;
            const level = inst.enchantLevel ?? 0;
            const cost = temperCost(level);
            const owned = state.inv[cost.reagentId] ?? 0;
            const affordable = owned >= cost.qty;
            const equipped = isInstanceEquipped(state, inst.instId);
            const reagentName = ITEMS[cost.reagentId]?.name ?? cost.reagentId;
            const bonusPct = Math.round(ENCHANT_PER_LEVEL * level * 100);
            const nextPct = Math.round(ENCHANT_PER_LEVEL * (level + 1) * 100);

            const baseName = fullItemName(def.name, inst.tier, inst.modifier);
            const icon = getItemIcon(inst.id, 56) ?? <GenericIcon size={56} />;
            const stats = instanceStats(inst);

            return (
              <div key={inst.instId} className="action-card" data-task-id={inst.instId}>
                <div className="card-icon">{icon}</div>
                <div className="card-body">
                  <h4>
                    {baseName}
                    {level > 0 && <span className="lv-tag">Tempered +{level}</span>}
                    {equipped && <span className="helper-tag">· equipped</span>}
                  </h4>
                  <div className="flavor">
                    {level > 0
                      ? `Currently +${bonusPct}% to attack, defense, and health.`
                      : 'Not yet tempered.'}
                  </div>
                  <div className="reqs">
                    Next: +{nextPct}% &middot; costs {cost.qty} {reagentName} <span style={{ opacity: 0.7 }}>(have {owned})</span>
                  </div>
                  <div className="equipment-instance-stats-line" style={{ marginTop: 4 }}>
                    {Object.entries(stats).map(([k, v]) => (
                      <span key={k} className={`equip-stat ${(v as number) >= 0 ? 'pos' : 'neg'}`}>
                        {k} {(v as number) >= 0 ? '+' : ''}{typeof v === 'number' && v % 1 !== 0 ? (v as number).toFixed(1) : v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-actions">
                  <button
                    disabled={!affordable}
                    onClick={() => {
                      if (temperItem(state, inst.instId)) {
                        playSfx('craft');
                        onAction();
                      }
                    }}
                  >
                    Temper
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
