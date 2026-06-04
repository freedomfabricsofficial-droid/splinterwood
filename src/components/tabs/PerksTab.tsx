// PerksTab — Self tab's skill tree view.
//
// Renders the four category trees: Gathering, Crafting, Combat, Leadership.
// Each tree is a column of branches (or a linear ladder for Leadership).
// Tier bands visually differentiate the row depth. Capstones are visually
// distinct (larger node, gold-tinted band).
//
// Internal helpers (CategoryTreeView, BranchesView, LadderView, PerkNode)
// live in this file — they're only used by PerksTab and form a tight unit.
//
// Buying a perk drains from the appropriate point pool — see buyCategoryPerk
// in engine.ts. Locked perks are revealed (per design: full transparency).
import { useState } from 'react';
import type { GameState, SkillId } from '../../types';
import { CATEGORY_TREES } from '../../data/perks';
import type { Branch, CategoryPerk } from '../../data/perks';
import { buyCategoryPerk, pointsAvailableForTree, prereqForPerk } from '../../systems/engine';

type TreeId = 'gathering' | 'crafting' | 'combat' | 'leadership';

export function PerksTab({ state, onAction }: { state: GameState; onAction: () => void }) {
  const trees: readonly TreeId[] = ['gathering', 'crafting', 'combat', 'leadership'] as const;
  // Track which tree is open. Default to first; null means all collapsed.
  const [openTree, setOpenTree] = useState<TreeId | null>('gathering');
  return (
    <>
      <p style={{ fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 10 }}>
        Each skill grants a perk point every 5 levels. Helpers grant Leadership points. Spend wisely.
      </p>
      {trees.map((treeId) => (
        <CategoryTreeView
          key={treeId}
          state={state}
          treeId={treeId}
          onAction={onAction}
          open={openTree === treeId}
          onToggle={() => setOpenTree(openTree === treeId ? null : treeId)}
        />
      ))}
    </>
  );
}

function CategoryTreeView({ state, treeId, onAction, open, onToggle }: {
  state: GameState;
  treeId: TreeId;
  onAction: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const tree = CATEGORY_TREES[treeId];
  const available = pointsAvailableForTree(state, treeId);
  return (
    <div className="category-tree">
      <div className="category-tree-header collapsible" onClick={onToggle}>
        <span className="category-tree-chevron">{open ? '▼' : '▶'}</span>
        <h3 className="category-tree-label">{tree.label}</h3>
        <span className="category-tree-points">{available} {available === 1 ? 'point' : 'points'} available</span>
      </div>
      {open && (
        <>
          <div className="category-tree-subtitle">{tree.subtitle}</div>
          <div className="category-tree-divider"></div>
          {tree.ladder
            ? <LadderView state={state} treeId={treeId} ladder={tree.ladder} onAction={onAction} />
            : <BranchesView state={state} treeId={treeId} branches={tree.branches} onAction={onAction} />
          }
        </>
      )}
    </div>
  );
}

// Three branches side by side (Gathering / Crafting / Combat). Perks rendered
// in tier order from top to bottom, with tier bands tinting each row.
function BranchesView({ state, treeId, branches, onAction }: {
  state: GameState;
  treeId: TreeId;
  branches: Branch[];
  onAction: () => void;
}) {
  const tierLabels = ['tier one', 'tier two', 'tier three', 'tier four', 'capstone'];
  return (
    <div className="branches-grid">
      {branches.map(b => (
        <div key={`hdr-${b.id}`} className="branch-header">
          <div className="branch-label">{b.label}</div>
          <div className="branch-sub">{b.sub}</div>
        </div>
      ))}
      {[1, 2, 3, 4, 5].map((tier) => (
        <div key={`tier-${tier}`} className={`tier-row tier-${tier} ${tier === 5 ? 'capstone-row' : ''}`}>
          <div className="tier-label">{tierLabels[tier - 1]}</div>
          {branches.map(b => {
            const perk = b.perks.find(p => p.tier === tier);
            if (!perk) return <div key={`empty-${b.id}-${tier}`} className="perk-slot empty" />;
            return <PerkNode key={perk.id} state={state} treeId={treeId} perk={perk} onAction={onAction} />;
          })}
        </div>
      ))}
    </div>
  );
}

// Linear ladder (Leadership) — same look, single column.
function LadderView({ state, treeId, ladder, onAction }: {
  state: GameState;
  treeId: TreeId;
  ladder: CategoryPerk[];
  onAction: () => void;
}) {
  return (
    <div className="ladder-grid">
      {ladder.map(perk => (
        <PerkNode key={perk.id} state={state} treeId={treeId} perk={perk} onAction={onAction} />
      ))}
    </div>
  );
}

function PerkNode({ state, treeId, perk, onAction }: {
  state: GameState;
  treeId: TreeId;
  perk: CategoryPerk;
  onAction: () => void;
}) {
  const owned = treeId === 'leadership'
    ? !!(state.leadershipOwned ?? {})[perk.id]
    : (Object.keys(state.skills) as SkillId[]).some(sk => state.skills[sk].owned[perk.id]);

  const prereq = prereqForPerk(perk.id);
  let prereqOwned = true;
  if (prereq) {
    if (treeId === 'leadership') {
      prereqOwned = !!(state.leadershipOwned ?? {})[prereq.id];
    } else {
      prereqOwned = (Object.keys(state.skills) as SkillId[]).some(sk => state.skills[sk].owned[prereq.id]);
    }
  }

  const available = pointsAvailableForTree(state, treeId);
  const canBuy = !owned && prereqOwned && available >= perk.cost;
  const isCapstone = perk.tier === 5;
  const cls = `perk-node ${owned ? 'owned' : canBuy ? 'available' : 'locked'} ${isCapstone ? 'capstone' : ''}`;
  return (
    <div
      className={cls}
      onClick={() => {
        if (canBuy) { buyCategoryPerk(state, treeId, perk.id); onAction(); }
      }}
      title={perk.desc}
    >
      <div className="perk-node-marker">
        {owned ? '✓' : isCapstone ? '★' : '+'}
      </div>
      <div className="perk-node-body">
        <div className="perk-node-name">{isCapstone ? '★ ' : ''}{perk.name}</div>
        <div className="perk-node-desc">{perk.desc}</div>
        <div className="perk-node-cost">
          {owned
            ? 'owned'
            : !prereqOwned
              ? <span className="perk-node-prereq">requires {prereq!.name}</span>
              : `${perk.cost} pt`}
        </div>
      </div>
    </div>
  );
}
