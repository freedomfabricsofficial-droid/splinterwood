# Content Authoring Guide

How to add new content to Splinterwood. Each section is "what file, what
shape, what to know."

If you're adding something not listed here, it probably needs code, not
just data. Check the stats-rules.md and the registry pattern in
`src/data/tasks.ts` for what new categories should look like.

---

## Items

**File:** `src/data/items.ts`

Items are everything that lives in the player's inventory — materials,
equipment, consumables, currency-like tokens.

Add one entry per item to the `ITEMS` record. The key is the item's id
(used everywhere else to reference it).

```ts
log_oak: { name: 'Oak Log', sell: 6, category: 'material', flavor: 'Hefty. Honest.' },
```

**Required fields:**
- `name`: display name
- `sell`: base sell price in coin
- `category`: `'material' | 'equipment' | 'consumable' | 'loot' | 'currency'`
- `flavor`: short one-line description

**Equipment items also have:**
```ts
equip: { slot: 'weapon' | 'offhand' | 'head' | 'body' | 'hands' | 'trinket', atk?, def?, hp?, ... }
```
Other equip stats: `crit`, `crit_dmg`, `speed`, `gather_speed`, `craft_speed`,
`coin_find`, `drop_rate`, `xp_gain`. See `stats-rules.md` for what each means.

**Consumables also have:**
```ts
consume: { heal?: number, healPercent?: number, description: string }
```

**Adding an icon:** edit `src/data/icons.tsx` and add a case for your item id
in `getItemIcon`. SVG icons follow the hand-drawn ledger style with feTurbulence
wobble. If you skip this, the generic icon will render.

---

## Foes (combat enemies)

**File:** `src/data/combat.ts`

Foes live in **pools**. A pool is a tier+floor grouping. All foes in a
pool share the same drop table and reward tier; variety is purely visual.

**Adding a foe to an existing pool:**

```ts
{ id: 'wolf', name: 'Hungry Wolf', level: 1, hp: 8, atk: 2, xp: 8, coin: 18,
  drops: [{ id: 'meat_scrap', chance: 0.4 }],
  flavor: 'A persuasive vegetable.', poolId: 'splinterwood-t1' },
```

Match the stats of others in the pool (per Section 7 in this doc).

**Adding a new pool:**

Add an entry to `COMBAT_POOLS`:
```ts
{ id: 'greystone-t1', label: 'The Cave-Dwellers', floor: 'greystone_reach',
  tier: 1, unlockLevel: 1, flavor: 'Subterranean and unfriendly.' },
```

Then add foes with that `poolId`. The combat tab dropdown picks them up automatically.

**Foe icon:** add a case to `getFoeIcon` in `src/data/icons.tsx`.

---

## Journal Pages (lore drops)

**File:** `src/data/pages.ts`

Pages drop rarely from task completions. They appear in a blocking
DiscoveryModal and stay readable in the Tome.

```ts
{
  id: 'page_greystone_03',
  title: 'A folded page from inside a vein',
  floor: 2,
  dropChance: 0.003,
  sources: ['mn'],
  body: [
    { kind: 'content', text: "The writer's actual writing." },
    { kind: 'observation', text: "The handwriting is hurried." },
  ],
},
```

**Page block kinds:**
- `'content'` — the writer's writing (Schoolbell cursive)
- `'observation'` — player's thoughts about the artifact (italic serif, indented)
- `'maggie'` — handwriting from Maggie specifically (Indie Flower)

**Writing rules** (per `story.md`):
- Past tense
- NO dates or specific durations
- Writer expresses time-confusion
- Handwriting/ink descriptions add atmosphere

**Drop sources** (`sources`): `'wc' | 'mn' | 'cv' | 'sm' | 'cb'`. Page can
drop from any task kind listed.

**Drop chance:** Per task completion. Keep RARE — 0.003 = 0.3% feels right.

Pages drop once. The system tracks `state.pagesFound` and won't re-drop.

---

## Quests (NPC-given tasks)

**File:** `src/data/quests.ts`

Quests appear when an NPC has work for the player. They're a linear chain
per NPC — the player completes them in order.

```ts
{
  id: 'q5',                                    // unique id
  npc: 'Maggie the Innkeep',                   // who gives it
  text: `"Quote text. Maggie's voice."`,       // shown in QuestGiverModal
  visible: hasEverItem('item_sword'),          // when this quest is visible
  check: (s) => (s.inv.log_oak ?? 0) >= 10,    // completion condition
  claim: (s, h) => {                           // what happens on claim
    s.inv.log_oak -= 10;
    h.addCoin(500);
    h.addPerkPoint('combat', 1);
  },
},
```

**`visible` predicates** are helpers from the same file: `hasEverItem`, `levelAtLeast`, etc.

**`claim` helpers** (`h`): `addCoin`, `addPerkPoint`, `setQuestFlag`, etc. Look at
existing quests for the available shape.

---

## Story Letters (NPC narrative letters)

**File:** `src/data/storyLetters.ts`

Different from daily rewards. Triggered by gameplay thresholds (first kill,
reaching Greystone, X pages collected, etc.) via `queueStoryLetter(state, id)`.

```ts
{
  id: 'maggie_first_kill',
  sender: 'maggie',
  senderLabel: 'From: Maggie',
  intro: "OH. SO you DID it. The little WHATEVER is DEAD.",
  body: "Look, I'm not going to make a thing about this...",
  outro: "Anyway. Eat something. — Maggie",
  observation: "The seal was barely closed. Like she expected the answer.",
  reward: { coin: 100 },     // optional
},
```

**Voice rules:**
- `'maggie'` — ALL CAPS bursts, affectionate insults, "dear". Renders in Indie Flower.
- `'brock'` — 1-5 words per sentence. Renders in Special Elite (typewriter).
- `'laileb'` — Raunchy, bitter, sing-song. Italic Schoolbell placeholder.
- `'unknown'` — Generic.

**Wiring the trigger:** in `engine.ts` (or wherever the trigger event fires),
call:
```ts
import { queueStoryLetter } from './data/storyLetters';
queueStoryLetter(state, 'maggie_first_kill');
```

The mailbox appears automatically when there's anything queued.

---

## Helpers (auto-task workers)

**File:** `src/data/helpers.ts`

Helpers complete tasks in the background. Each is tied to one specific task.

```ts
{
  id: 'helper_oak',
  name: 'Twig-Picker Pim',
  description: 'Chops oak trees so you don\'t have to.',
  flavor: 'A small, anxious person with a large axe.',
  hireCost: 250,
  kind: 'wc',
  taskId: 'oak',
  speedMultiplier: 1.0,
  requiredSkill: 'woodcutting',
  requiredLevel: 5,
  introLine: "I won't let you down. Probably.",
  floorTag: 'Splinterwood',
},
```

**Required to also register the task:** the helper's `taskId` must match a task in
`TASK_REGISTRY` (`src/data/tasks.ts`). If you forget, dev mode warns.

---

## Tasks (gather/craft/mine/smith)

**File:** The data file matching the task kind:
- `woodcutting.ts` (kind: `'wc'`)
- `mining.ts` (kind: `'mn'`)
- `carving.ts` (kind: `'cv'`)
- `smithing.ts` (kind: `'sm'`)

Plus the registry: `src/data/tasks.ts`

**Step 1** — Add the task data:
```ts
// in woodcutting.ts
{ id: 'birch', name: 'Whispering Birch', level: 8, time: 3.5, xp: 18,
  yield: 'log_birch', flavor: 'Pale, papery, prone to secrets.' },
```

Make sure `yield` references an item that exists in `items.ts`.

**Step 2** — Register it:
```ts
// in tasks.ts
{ kind: 'wc', taskId: 'birch', skill: 'woodcutting', category: 'gather',
  district: 'gather', buttonLabel: 'Chop', swingLabel: 'Chop' },
```

**Step 3** — Optionally add a helper (`helpers.ts`).

Tab UI wires itself up automatically.

---

## Perks (skill tree nodes)

**File:** `src/data/perks.ts`

Perks live in category trees (`GATHERING`, `CRAFTING`, `COMBAT`, `LEADERSHIP`)
with branches.

```ts
{ id: 'wc_double', branch: 'gathering_a', tier: 2,
  name: 'Lucky Strike', cost: 1,
  desc: 'Chance to double yield on each gather.',
  effect: { wc_double: 0.10 } },
```

**Effect keys:** any stat key from `stats-rules.md` (the bag) is allowed.
Plus the per-action random-roll keys (`wc_double`, `craft_save`, `wc_rare`,
etc.) — these are perks that fire on a random per-roll basis, not aggregated
stats.

**Branch placement:**
- `gathering_a`, `gathering_b` (Gathering tree has 2 branches)
- `crafting_a`, `crafting_b`
- `combat_a`, `combat_b`
- Leadership uses `ladder` (linear progression, not branches)

**Tiers** 1-4 organize vertical placement. Prereqs are automatic — the
perk at tier N+1 requires owning the tier N perk in the same branch.

---

## Daily Rewards

**File:** `src/data/dailyRewards.ts`

30-day track. Currently auto-generated by `buildSchedule()` — to tweak the
formula edit that function. To override specific days, modify
`DAILY_REWARD_TRACK` directly after the build.

---

## Doodles (margin decorations)

**File:** `src/data/letter.ts` (`MARGIN_DOODLES`)

SVG decorations Maggie sticks on letters. Add one to the array:
```ts
{ id: 'doodle_wolf', label: 'a wolf with a flower', svg: '<svg>...</svg>' },
```

Doodles are awarded automatically through the daily reward track (one per
day, cycling).

---

## Random Events

**File:** `src/data/events.ts`

Pop-up events with branching choices. Triggered by `EVENT_DEFS` matching
`condition(state)` predicates.

```ts
{
  id: 'wandering_merchant',
  title: 'A Wandering Merchant',
  body: "A figure in many coats steps from the road's shoulder...",
  condition: (s) => s.skills.woodcutting.level >= 5,
  choices: [
    { label: 'Buy a pinch of dust (50 coin)',
      effect: (s, h) => { s.coin -= 50; h.addBuff(...); } },
    { label: 'Walk on', effect: () => {} },
  ],
},
```

Events fire by an idle-check elsewhere; just adding the def is enough to
make it eligible.

---

## Quality Tiers + Modifiers (equipment rolls)

**File:** `src/data/modifiers.ts`

When equipment is crafted/looted, it rolls a tier and an optional modifier.

Tier values, weights, and modifier definitions all live here. To add a new
modifier (e.g., "of Sharpness"):
```ts
{ id: 'sharp', name: 'of Sharpness', stats: { atk: 0.15 }, weight: 10 },
```

`stats` for flat stats (atk/def/hp) are percentage modifiers applied to the
item's base contribution. For percent stats (crit/speed) they add directly.
See stats-rules.md Section 4.

---

## Floors

**File:** `src/data/floors.ts`

Adding a whole new floor is bigger work (new districts, new skills,
potentially new game mechanics). The floor entry itself is small:

```ts
{
  id: 'cloud_islands',
  number: 3,
  name: 'The Cloud Islands',
  npc: 'Laileb the Wizard',
  flavor: 'Floating islands in endless sky.',
  unlockHint: 'Reach combined Greystone Lv 30.',
  theme: 'sky',
  isUnlocked: (s) => s.skills.mining.level >= 30,
  skillsTaught: ['alchemy', 'enchanting'],
},
```

You'll separately need items, foes, helpers, quests, and skill data for the
floor's content. See above sections for each.

---

## What NOT to put in data files

The data files are for **content variants of existing systems**. If you find
yourself wanting to add a special foe that does a weird thing (poison, regen,
summons adds), that's a **mechanic**, not a content variant. It needs code in
`engine.ts` or a behavior hook system (not yet built — see "back burner" items).

When in doubt: if every existing thing in the array could express your new
addition, it's data. If you need to make the array shape bigger to support it,
it's code.

---

## Checklist for any new content

1. Add data to the right file in `src/data/`
2. If it needs an icon: edit `src/data/icons.tsx`
3. If it's a task/helper: register in `src/data/tasks.ts` or `helpers.ts`
4. If it's referenced elsewhere by id: make sure the id is unique
5. Type check: `tsc --noEmit`
6. If it touches stats: re-read `stats-rules.md`

The dev panel can grant items/coin/levels for testing.
