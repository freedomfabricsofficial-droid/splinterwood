# Splinterwood — Design Document

This is the living design doc. Update as decisions are made.

## High Concept

Splinterwood is the realm/region where the player's story begins.
A story-loose, large-world idle adventure game.
Inspirations: NGU Idle (goofy tone, layered systems), Melvor Idle (skill-based progression, interconnection), Adventure Capitalist (clean exponential scaling), Borderlands/Skyrim (tonal: quirky NPCs, lore through flavor text).

## Tone

Goofy fantasy with deadpan delivery. Parchment ledger / tavern bulletin board aesthetic — the in-game framing is that the player is an accountant-adventurer keeping a careful record of their tedium. All player-voiced text (status lines, death narrations, summary lines) stays dry and journal-like. NPC dialogue can be more colorful.

## Visual Identity

**Direction: hand-drawn player-sketched ledger.** All in-game icons (items, foes, trees, recipes) are rendered as SVG illustrations with a turbulence wobble filter to look as if the player character sketched them in their own field journal.

- Icons live in `src/data/icons.tsx`
- Three lookup tables: `ITEM_ICONS`, `WOODCUTTING_ICONS`, `FOE_ICONS`
- Helper functions: `getItemIcon`, `getTreeIcon`, `getFoeIcon`, plus `GenericIcon` fallback
- Style: 1.6px black ink strokes, no fills, occasional cross-hatching for shading, slight margin annotations on memorable items
- UI chrome (wax seals, coins) uses a tighter wobble (~1px displacement) so it looks like real objects vs sketches

**Rule going forward:** when ANY new item, gather node, recipe, or foe is added, an icon must also be added to `src/data/icons.tsx`. If missing, the renderer shows the `GenericIcon` placeholder so it doesn't crash.

## Navigation — Districts

Two-level navigation. Top: districts. Within each: sub-tabs.

- **The Wilds** — gathering skills (Woodcutting, [future: Mining, Foraging, Fishing, Hunting])
- **The Workshop** — production (Carving, [future: Smithing, Cooking, Alchemy])
- **The Field** — combat and adventuring
- **The Town** — Shop, Helpers, [future: Real Estate, Factions/Guilds]
- **The Self** — Skill Trees, [future: Achievements, Stats, Settings]

## Current Systems (v0.3)

### Skills
- Woodcutting / Carving / Combat — levels 1-99, perk point per 5 levels

### Skill Trees
- Flat perks + path perks (mutually exclusive, visually separated under "Choose Your Path")

### Quest
- 4-step linear questline with branching troll choice

### Inventory ("Satchel")
- Categorized: Materials, Equipment, Consumables, Loot, Quest Items, Curios
- Collapsible sections, item lock, bulk sell per category
- Quest items can't be sold

### Coin Sinks
- Shop (Maggie's): consumables, daily-stock items
- Helpers (Hired Help): pay upfront to auto-run a task at reduced speed
- Pay-the-Troll option

### Combat Death
- Lose 10% coin (cap 500), foe heals to full, modal popup with randomized journal line

### Idle Indicator
- "Currently:" status line under character name. Cycles through flavorful idle phrases every 10s when no task is active.

### Save System
- localStorage with version field
- v2: adds helpers, shop state, satchel state, idle tracking
- Auto-save every 15s
- Offline progress with **Return Summary** card (inline popup over Happenings)
- Export/import save string

### Happenings (the log)
- Renamed from "Recent Events"
- In-memory only, capped at 50 entries
- During offline catch-up, log writes are SUPPRESSED in favor of the Return Summary

## Planned Systems

- More skills: Mining, Smithing, Cooking, Fishing, Foraging, Alchemy, Hunting
- More gathering nodes / recipes / foes per skill
- More helpers, more shop items
- Real estate (passive income)
- Factions/Guilds (mutually exclusive)
- Prestige loop with narrative beat
- Multiple regions beyond Splinterwood
- Item rarity tiers
- Achievements
- BigNumber lib (`break_infinity.js`) wired in once coin scales past Number safety

## Naming Conventions

- Place names: evocative, slightly British folklore (Splinterwood, Knobshire, etc.)
- Monsters: adjective + noun where the adjective is unexpected (Hungover Goblin, Recreational Boar)
- Items: function + slight personality (Knobbly Club, Bark Shield, Pinewood Sword)
- Helpers: First name + epithet (Twig-Picker Pim, Old Bess of the Oaks)
- All player-voiced text: dry, journal-style

## Tech

- TypeScript + React + Vite
- Plan to wrap in Tauri for Steam
- Save version: 2

## Dev Tools

Located in `src/dev/`. Controlled by `DEV_TOOLS_ENABLED` flag in `src/dev/config.ts`.

**To disable for release:**
1. Set `DEV_TOOLS_ENABLED = false` in `src/dev/config.ts`, OR
2. Delete the entire `src/dev/` folder and remove the two `import` lines + the `{DEV_TOOLS_ENABLED && <DevPanel ...} ` line from `src/App.tsx`

Features: time skip, 10x fast-forward toggle, coin grants, level setters, perk point grants, unlock-all-perks, give-all-items, hire-all-helpers, quest step skip, full heal, intro flag reset.
