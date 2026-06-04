// HelpersTab — Town tab where the player hires helpers.
//
// Helpers are grouped by their required skill. Greystone-tied groups (Mining,
// Smithing) hide entirely until visited_greystone is set. Each group can be
// collapsed; the collapse state lives in state.satchelCollapsed keyed by
// 'helpers_<skill>' to share the same persistence as the satchel collapses.
//
// A "starving" hired craft helper (one missing materials) gets a visible
// warning so the player knows why their carving/smithing helper isn't
// progressing.
import type { GameState } from '../../types';
import { HELPERS } from '../../data/helpers';
import { hireHelper, getTaskDef } from '../../systems/engine';
import { fmt } from '../../systems/format';
import { bGte } from '../../util/bignum';

export function HelpersTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  type SkillGroupId = 'woodcutting' | 'carving' | 'mining' | 'smithing';
  const groups: { id: SkillGroupId; label: string; floorTag?: string }[] = [
    { id: 'woodcutting', label: 'Woodcutting' },
    { id: 'carving',     label: 'Carving' },
    { id: 'mining',      label: 'Mining',   floorTag: 'Greystone Reach' },
    { id: 'smithing',    label: 'Smithing', floorTag: 'Greystone Reach' },
  ];

  const visited = !!state.questFlags.visited_greystone;

  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Hire someone to do the boring parts. They work slower than you would, but they work while you're elsewhere.
      </p>
      {groups.map((g) => {
        if ((g.id === 'mining' || g.id === 'smithing') && !visited) return null;

        const groupHelpers = HELPERS.filter((h) => h.requiredSkill === g.id);
        if (groupHelpers.length === 0) return null;

        const collapsed = !!state.satchelCollapsed['helpers_' + g.id];
        const hiredCount = groupHelpers.filter((h) => state.helpersHired[h.id]).length;

        return (
          <div key={g.id} className="satchel-section helpers-section">
            <div
              className="satchel-section-header"
              onClick={() => {
                state.satchelCollapsed['helpers_' + g.id] = !collapsed;
                onAction();
              }}
            >
              <span>{collapsed ? '▸' : '▾'} {g.label}{g.floorTag && <span className="helpers-group-floor"> · {g.floorTag}</span>}</span>
              <span className="satchel-section-meta">{hiredCount} / {groupHelpers.length} hired</span>
            </div>
            {!collapsed && groupHelpers.map((h) => {
              const hired = !!state.helpersHired[h.id];
              const meetsLevel = !h.requiredLevel || !h.requiredSkill ||
                state.skills[h.requiredSkill].level >= h.requiredLevel;
              const canHire = !hired && bGte(state.coin, h.hireCost) && meetsLevel;
              let starving = false;
              if (hired && (h.kind === 'cv' || h.kind === 'sm' || h.kind === 'al')) {
                const def = getTaskDef(h.kind, h.taskId);
                if (def && (def as any).cost) {
                  for (const k in (def as any).cost) {
                    if ((state.inv[k] ?? 0) < (def as any).cost[k]) { starving = true; break; }
                  }
                }
              }
              return (
                <div key={h.id} className={`action-card ${!meetsLevel ? 'locked' : ''} ${hired ? 'active-task' : ''}`}>
                  <div>
                    <h4>{h.name}</h4>
                    <div className="flavor">{h.flavor}</div>
                    <div className="reqs">
                      {h.description} · {Math.round(h.speedMultiplier * 100)}% your speed
                      {h.requiredLevel && ` · req. ${h.requiredSkill} Lv ${h.requiredLevel}`}
                      {starving && <span className="helper-starving"> · ⚠ Waiting on materials</span>}
                    </div>
                  </div>
                  <div>
                    {hired
                      ? <span className="locked-label">{starving ? 'Idle' : 'Hired'}</span>
                      : !meetsLevel
                        ? <span className="locked-label">Locked</span>
                        : <button className="no-click-sfx" disabled={!canHire} onClick={() => { hireHelper(state, h.id); onAction(); }}>
                            Hire ({fmt(h.hireCost)}c)
                          </button>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
