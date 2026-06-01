# v0.81 — Full Decimal conversion + per-level scaling

This version completes Phase 1 of the progression overhaul. Numbers can now
scale to NGU-grade magnitudes (decillion, nonillion, centillion) without
precision loss, and every kill/task earns more XP and coin as your skill
level grows.

## What to do after extracting

Same as v0.80 — you should already have `break_eternity.js` installed
from last time. No new dependencies.

If for some reason `break_eternity.js` got uninstalled, run:

```
npm install break_eternity.js
```

Then start the dev server (`npm run dev`). On first load your existing
save will run migration v11 → v12, which silently converts `coin`,
`hp`, `maxHp`, all skill `xp`, and any active task's `foeHp` from plain
JS numbers to Decimal-backed storage. No data is lost; the migration is
transparent. Console will log "Migration v11→v12: converted coin/xp/hp
to Decimal storage."

## What changed in v0.81

### Per-level scaling (the gameplay change you'll feel)

- **Per-level XP multiplier: 1.02× compounding per skill level.** A Lv 50
  skill earns ~2.7× the XP per task that a Lv 1 skill would. A Lv 200
  skill earns ~52×. Lv 500 earns ~20,000×. Multipliers stack with all
  other XP buffs (perks, potions, buffs).

- **Per-level coin multiplier: 1.025× compounding per skill level.**
  Coin earned from combat scales with combat level; coin from gather/craft
  scales with the respective skill. Slightly faster than XP, so the player
  feels rich a beat before they outpace their own leveling.

- Together these create the foundational scaling. By Lv 500 in a skill
  you're earning 200,000× more XP and ~244,000× more coin per task than at
  Lv 1. By Lv 1000: ~400M× XP, ~60B× coin. Plenty of room for prestige,
  synergies, and perks to multiply on top in later phases.

### Big-number storage (the engineering change)

- `state.coin`, `state.skills[*].xp`, `state.hp`, `state.maxHp`, and combat
  `foeHp`/`playerHp` are now stored as Decimal (break_eternity.js). They
  can hold numbers up through 10^^1e308 without precision loss.

- Every read, write, comparison, and display across 14 files was converted
  to use bignum helpers (bAdd, bSub, bGte, bToNumber, etc.).

- Save serialization uses a custom JSON replacer/reviver that converts
  Decimal instances to tagged strings on save and revives them on load.
  Old saves are converted by the v11→v12 migration step.

- The display formatter (`fmt`) automatically falls back from short-form
  K/M/B/T to long-form names ("4.27 quintillion") past trillion. The full
  scale goes through centillion (1e303) and beyond without ever showing
  scientific notation.

### Other fixes

- Fixed a coin double-credit bug in `sellAllUnprotectedEquipment` (sells
  from stacks were credited twice — to the stack's own coin add and again
  to the wrapper).

- `setLevel` in the dev panel now uses the Decimal cumulative-XP function,
  so dev-bumping a skill to Lv 500 actually sets the correct XP.

## Sanity checks after install

1. **Save loads cleanly.** Open the game. Console should show the migration
   message. No errors. Your coin and XP should look the same as before.
2. **Numbers tick up at scale.** Play for a few minutes. Watch your coin
   and XP grow faster than they used to thanks to the per-level multiplier.
   Higher-level skills should generate disproportionately more.
3. **Save and reload.** Close the tab, reopen. Coin/XP should be exactly
   where you left them. Open the console — no "save failed" or precision
   errors.
4. **Damage works.** Fight something. Damage numbers should look normal at
   low levels; the foe HP bar should drain correctly.

## What's coming in Phase 2

- Prestige / loop system tied to the story bible's loop-in-hell premise
- Prestige currency that compounds on top of the per-level scaling
- Permanent multipliers across loops (XP gain, coin find, helper starts)
- "Loop 2 unlocks a new mechanic" pattern from the plan doc

If anything is broken in v0.81, tell me — especially anything that worked
in v0.80 but doesn't now. Better to fix it before Phase 2 builds on top.
