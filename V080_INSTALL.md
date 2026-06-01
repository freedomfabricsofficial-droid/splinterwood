# v0.80 — New dependency: big-number library

This version begins Phase 1 of the progression overhaul. The level cap is
lifted (no more level 99 ceiling), the XP curve is now exponential, and
the formatter is ready to display "decillion" / "nondecillion" style names
once values get big.

## What to do after extracting

Open a terminal at the project root and run:

```
npm install break_eternity.js
```

That installs the big-number library used by the new `src/util/bignum.ts`
module. The library is MIT-licensed, ~30 KB, and is the standard choice
for idle games at NGU / Cookie Clicker scale.

If you skip the install, Vite will throw a "Cannot find module
'break_eternity.js'" error on launch.

## What changed in v0.80

- `MAX_LEVEL` removed (effectively); skills can now climb without a cap.
- XP curve is now exponential: each level costs ~1.18× the previous.
  Level 100 needs ~1.4M XP; Level 200 needs ~38B XP; Level 500 needs ~1e37 XP.
- New `src/util/bignum.ts` — Decimal wrappers and formatters used everywhere
  numbers might get huge. Names go through centillion (1e303) and beyond
  without scientific notation.
- `fmt()` in `systems/format.ts` now uses the new formatter under the hood.
  Short form (K/M/B/T) still shows up to trillion; past that, full names.
- No content XP rebalance yet — the new curve naturally slows progression.
  If that feels too slow later, we add a per-level XP-gain bonus.

## What's NOT in v0.80

- State fields like `state.coin` and `state.skills[*].xp` are still plain
  JS numbers. That happens in v0.81. Storage migration will be transparent.
- Combat damage pipeline still uses plain numbers. Phase 1 finishes when
  damage / HP can scale to billions+ without precision loss.

## Sanity checks after install

1. `npm run dev` — game should boot without module errors
2. Load your existing save — should work as before, with the level cap lifted
3. Open the console — no errors about Decimal or break_eternity

