import type { CarvingRecipe } from '../types';

// ============================================================================
// ALCHEMY RECIPES (Floor 3 — The Cloud Islands, taught by Laileb)
// ============================================================================
//
// Alchemy is a Workshop skill: it brews tonics. The crucial design rule —
// every recipe is brewed ONLY from rare reagents that drop while GATHERING
// (oak bulbs, pinecones, pulsing blue gems, etc; see data/reagents.ts). Those
// reagents start dropping from the very first node, long before the player can
// brew, so they hoard mysterious oddities and later learn their purpose.
// Because the reagents come from gathering and ride the rare-drop perks, every
// gathering skill stays relevant forever — the anti-obsolescence promise.
//
// Tonics use the existing consumable machinery (consume.xpBoost in items.ts),
// so no new engine plumbing is needed for the effects.
//
// Recipe shape mirrors CarvingRecipe exactly (id/name/level/time/xp/cost/
// produces/flavor), so the engine's getTaskDef and the TaskTabRenderer treat
// it identically to carving and smithing.

export const ALCHEMY_RECIPES: CarvingRecipe[] = [
  {
    id: 'swiftroot',
    name: 'Swiftroot Tonic',
    level: 1,
    time: 3.0,
    xp: 18,
    cost: { reagent_twig_burl: 2, reagent_oak_bulb: 1 },
    produces: 'tonic_swiftroot',
    flavor: 'Laileb swears it\'s "mostly root." The "mostly" does a lot of work.',
  },
  {
    id: 'ember_tincture',
    name: 'Ember Tincture',
    level: 10,
    time: 5.0,
    xp: 70,
    cost: { reagent_pinecone: 1, reagent_sand_pearl: 1, reagent_grey_geode: 1 },
    produces: 'tonic_ember',
    flavor: 'Warms you from the inside. Possibly forever. Drink responsibly.',
  },
  {
    id: 'veil_extract',
    name: 'Veil Extract',
    level: 22,
    time: 8.0,
    xp: 180,
    cost: { reagent_ironbud: 1, reagent_blue_gem: 1, reagent_veinheart: 1 },
    produces: 'tonic_veil',
    flavor: 'Tastes like a word you almost remember. Then don\'t.',
  },
];
