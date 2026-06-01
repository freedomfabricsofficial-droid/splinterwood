# Stats Rules — Splinterwood

The single contract for how stats are computed, combined, and consumed.
Private design doc. Not shipped.

If you're writing code that uses, displays, or modifies a stat, read this
first. If a new stat behavior doesn't fit the rules here, the answer is to
update this doc and the code in `playerStats.ts` — not to special-case it in
a downstream caller.

---

## 1. The One Pipeline Rule

There is **one function** that computes the player's stats:
`computePlayerStats(state)` in `systems/playerStats.ts`.

It returns a `StatBlock` — a flat bag of stat keys mapped to numbers.

**Downstream code reads from the bag. It does not consult perks, permBonuses,
buffs, or equipment directly.**

If a caller needs to know "how fast does the player gather right now", it
reads `stats.gather_speed` from the bag. It does not call
`perkEffect(state, 'gather_speed')`. It does not check `state.permBonuses`.
It does not iterate equipped items.

The shield bug existed because `getTaskTime` was reading perks and
permBonuses directly without consulting the bag. That class of bug is
eliminated by following this rule.

**Exception (the only one):** functions inside `playerStats.ts` itself are
allowed to read all the sources because that's where the bag is built.

---

## 2. Stat Categories

Every stat is exactly one of these three kinds. The kind determines how it
combines.

### Flat stats
Concrete integer-ish quantities. Add directly.

- `hp` (max HP)
- `atk` (attack rating)
- `def` (defense rating)

### Percent stats
Fractional bonuses where the value `0.15` means `+15%`. Add directly. (Two
sources of `0.15` stack to `0.30`, meaning `+30%`.)

- `crit` (crit chance, default `0.02` = 2%)
- `crit_dmg` (crit damage bonus, default `0.50` = +50%)
- `speed` (combat round speed bonus)
- `gather_speed`, `craft_speed`
- `coin_find` (% coin from drops/kills)
- `drop_rate` (% drop chance multiplier)
- `xp_gain` (% XP multiplier)

### Derived stats
Computed inside `computePlayerStats`, never written to by sources. Sources
emit raw values; the bag stores the derived result.

(None today. Reserved.)

---

## 3. The Layer Order

When `computePlayerStats` runs, sources apply in this fixed order. Reading
sources out of order = bugs.

1. **Base stats** (`BASE_STATS` constant)
   The hardcoded floor. Player with no equipment, no perks, no buffs.
   `hp=20, atk=0, def=0, crit=0.02, crit_dmg=0.50`.

2. **Equipped items** (additive flat for ATK/DEF/HP, additive percent for percent stats)
   Per-instance contribution comes from `instanceStats(inst)` — see Section 4.
   All slots' contributions are summed into the bag with `addStats`.

3. **Permanent bonuses** (from Maggie's counter)
   Applied **last** and **multiplicatively**, not in step 3.
   See the dedicated section below on permBonuses for the rule.

4. **Perks** (from skill trees)
   Each perk emits stat keys via its `effect` object. Each key adds to the
   bag. Multi-perk same-key sums.

5. **Active buffs** (consumables, ability effects)
   Time-bounded modifiers. Applied last so they stack on top of equipment
   and perks.

6. **Permanent bonuses (Maggie's counter)** — applied LAST, multiplicatively.
   This is the deliberate exception to "everything additive between layers."
   `out.gather_speed = (1 + gather_speed_so_far) * (1 + permBonus) - 1`
   so a +1% counter purchase on top of +80% existing speed becomes +81.8%,
   not +81%. Maggie's rewards stack on top of everything, scaling with the
   player's accumulated power. They are the daily-engagement reward.

**Within each layer, all contributions are additive.** Between layers,
also additive, **except for the permBonuses layer which is multiplicative
against the aggregated total**.

Result: a +10% gather_speed perk and a +15% gather_speed shield stack to
+25%. Not (1.10 × 1.15 - 1) = +26.5%. Just additive.

This is intentional. Multiplicative stacking lets numbers grow uncontrollably
once we have many sources. Additive stacking is easy to reason about, easy
to balance, and gives us predictable ceilings.

---

## 4. Equipment Math

A single equipped item contributes a `StatBlock` via `instanceStats(inst)`.
The math is:

1. **Tier multiplier scales base stats.** A weapon with `equip: { atk: 10 }`
   at `suspicious` tier (1.25x) contributes `12.5` atk. At `unreasonable`
   (1.50x) it contributes `15`.

2. **Tier multiplier also scales percent stats on equipment.** A shield with
   `equip: { gather_speed: 0.10 }` at `unreasonable` (1.50x) contributes
   `0.15` (= 15%). This is current behavior and matches player expectation
   ("higher tier item gives more").

3. **Modifiers add on top of the tier-scaled contribution.**
   - For flat stats (atk/def/hp), modifier values are percentages applied to
     this item's contribution. A "+10% atk" modifier on a 12-atk weapon
     contributes `12 + 12*0.10 = 13.2`.
   - For percent stats (crit/speed/etc), modifier values add directly. A
     "+5% crit" modifier on a 2%-crit ring contributes `0.07` (= 7%).

4. **Items contribute only what their `equip` block defines, plus modifier.**
   No global multipliers on items, no other layers between item and bag.

The tier multiplier is the ONLY multiplicative step in stat math. Everything
else is additive. (This is the deliberate compromise — items themselves can
scale by tier, but a stack of items still adds.)

---

## 5. Downstream Consumers

The bag's keys are the contract. Downstream code reads exactly these keys.
If a downstream consumer wants something that isn't a key in the bag,
either:

- Add it as a key (preferred, if it's truly a stat).
- Compute it from existing keys (e.g. `total_dps = atk * (1 + crit * crit_dmg)`).
- Don't add it as a stat at all — handle it locally where it's used.

Specifically:

- `getTaskTime` reads `stats.gather_speed` / `stats.craft_speed`. Period.
- `totalAtk` / `totalDef` / `totalMaxHp` read `stats.atk` / `stats.def` /
  `stats.hp`. Their job is to apply any final per-call math (e.g. base
  fist damage for `totalAtk`, missing-HP scaling for berserker) and floor
  to integer for display.
- Combat round speed reads `stats.speed`.
- Coin gain reads `stats.coin_find`.
- Drop rolls read `stats.drop_rate`.
- XP grants read `stats.xp_gain`.

The "final per-call math" in `totalAtk` etc. is allowed BUT it must read
exclusively from the bag for its base values. No `perkEffect(state, ...)`
calls inside these functions.

---

## 6. Bag Type Hygiene

The bag is `StatBlock`, a typed record. Every legal stat key is enumerated
in `StatKey`. **No `(out as any).foo` escape hatches.**

If a stat needs a new key (`atk_perk_pct` was an example), add it to the
type. If a key is conceptually internal to `computePlayerStats` and never
consumed downstream, fold it into the appropriate output stat before
returning.

Today: `atk_perk_pct` and `def_perk_pct` are leaked as `(as any)`. They
should be folded into `atk` and `def` inside `computePlayerStats` before
return, so callers just read `stats.atk` and get the right number.

---

## 7. Soft Caps and Hard Caps

Some stats break the game if they exceed certain values. Define caps in
ONE place: `STAT_CAPS` in `playerStats.ts`. Applied as a final step
inside `computePlayerStats`.

- `crit` capped at `1.0` (100%). **Overflow past 100% converts 1:1 into
  `crit_dmg`** — a player at 1.20 effective crit ends up with 1.0 crit and
  +0.20 added to crit_dmg. This is the soft cap: stacking past 100% still
  rewards the player, just through a different axis.
- `crit_dmg` no cap (uncapped damage bonus is intentional — it's the
  primary endgame scaling axis, and crit overflow funnels here)
- `gather_speed` / `craft_speed` capped at `4.0` (= +400%, items take 1/5
  of base time). Prevents helpers + perks + equipment from making tasks
  instant.
- `speed` (combat round speed) capped at `4.0` for the same reason.
- `coin_find`, `drop_rate`, `xp_gain` uncapped (these are the player's
  reward for stacking)

Caps apply AFTER all additive layers. They are a final sanity bound.

---

## 8. Naming Discipline

Stat keys are `snake_case` short names. They mean the same thing
everywhere they appear (in items, perks, modifiers, buffs, the bag).

**No stat key may be reused for two different concepts.** Today `hp`
means "max HP contribution." Current HP is `state.hp`, not a stat key.
If we ever need both in the bag, current goes by a different name
(`hp_current`).

**Perks that emit stats use the same key as the stat.** A "+10% gather
speed" perk emits `gather_speed: 0.10`. Not `wc_speed`, not
`gatherSpeed`. The legacy per-skill speed keys (`wc_speed`, `mn_speed`,
etc.) are kept emitted for back-compat with old perks that target them
specifically, but they are NOT bag keys. They funnel into the
`gather_speed` and `craft_speed` bag keys inside `computePlayerStats`.

Helper stats (`helper_speed`, `helper_yield`, etc.) are a separate
category — they affect helpers, not the player. They don't go into the
player stat bag. Helper code consults `perkEffect` directly for these.
This is the only sanctioned exception to Rule 1, and only because
helpers aren't "the player."

---

## 9. Buffs

Active buffs are time-bounded stat deltas. They apply LAST in the layer
order so they stack on top of everything else.

A buff has an `effect: Record<StatKey, number>` field. Each entry adds
to the bag directly. Flat stats and percent stats both follow the simple
additive rule — no buff math gets to be multiplicative.

The legacy "xp multiplier" buff field (`buff.multiplier`) is treated as
`xp_gain += multiplier`. New buffs should use the `effect` field.

---

## 10. Adding a New Stat

Checklist:

1. Decide its category (flat / percent).
2. Add the key to `StatKey` in `types.ts`.
3. Add the key to `BASE_STATS` (with sensible default, usually 0).
4. Add the key to `PERCENT_STATS` set if it's a percent stat.
5. If it has a cap, add to `STAT_CAPS`.
6. If items can grant it: add to `itemStatToStatKey` whitelist.
7. If perks can grant it: existing perk machinery already aggregates by key.
8. If a downstream caller needs it: that caller reads `stats.<key>`. Period.

---

## 11. Adding a New Source

If we add a new source of stats (e.g. floor 3 unlocks some passive aura):

1. Add it as a layer inside `computePlayerStats`, in the right order.
2. Only additive contributions to existing keys.
3. If the source can emit multiple keys, treat each independently.
4. Don't bypass the bag for downstream callers.

---

## 12. The Refactor Plan

✅ **Done in v0.53.** Sections 1-11 of this document are the current contract.

The work that was completed:

1. ✅ Folded `atk_perk_pct` / `def_perk_pct` into `stats.atk` / `stats.def`.
   Removed `(as any)` escapes.
2. ✅ `totalAtk` / `totalDef` / `totalMaxHp` now read exclusively from the
   bag, with situational per-call math (berserker missing-HP scaling)
   remaining in the wrappers.
3. ✅ Combat coin/drop reward bonuses moved from direct `perkEffect` calls
   to bag keys `combat_coin_bonus` and `combat_drop_bonus`. The combat code
   path now also correctly applies `coin_find` (which was previously missing
   in the doSwing path).
4. ✅ `STAT_CAPS` added inside `computePlayerStats`. Crit overflow runs
   before caps so the conversion still triggers.
5. ✅ `test-stats.ts` at the project root locks in the contract with a
   minimal test harness. Run with `npx tsx test-stats.ts`.

Things left as direct `perkEffect` calls because they belong there:

- Per-skill XP multipliers in `giveXp` — these intentionally differ per
  skill, not a unified xp_gain bonus.
- Random-roll triggers (gather doubles, save chances, rare drops) — not
  aggregated stats, they're per-roll probabilities.
- Helper-only perks (`helper_speed`, `helper_yield`, etc.) — sanctioned
  exception per Section 8.
- Ability cooldown reduction, retribution, heal-per-kill, situational
  sell bonuses — all situational per-call math, not stats.
