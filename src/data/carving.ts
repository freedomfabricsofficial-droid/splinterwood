import type { CarvingRecipe } from '../types';

export const CARVING_RECIPES: CarvingRecipe[] = [
  { id: 'club',     name: 'Knobbly Club',      level: 1,  time: 2.0, xp: 12,  cost: { log_twig: 2 },                  produces: 'item_club',     flavor: 'A persuasive vegetable.' },
  { id: 'shield',   name: 'Bark Shield',       level: 6,  time: 3.5, xp: 36,  cost: { log_oak: 3 },                   produces: 'item_shield',   flavor: 'Surprisingly aerodynamic when thrown.' },
  { id: 'sword',    name: 'Pinewood Sword',    level: 14, time: 5.0, xp: 84,  cost: { log_pine: 4, log_oak: 1 },      produces: 'item_sword',    flavor: 'It splinters, but with conviction.' },
  { id: 'greatbow', name: 'Ironbark Greatbow', level: 28, time: 8.0, xp: 220, cost: { log_ironbark: 3, log_pine: 4 }, produces: 'item_greatbow', flavor: 'Pulls back with a sound like an angry violin.' },
  // Floor 3 cloud-gear (taught on The Cloud Islands; gated by visited_floor3 in the registry).
  // Woven utility pieces that complement the weapon rather than replacing it.
  { id: 'woven_gloves', name: 'Wovenbark Gloves', level: 30, time: 8.0, xp: 260, cost: { log_ironbark: 2, log_pine: 4, reagent_pinecone: 1 }, produces: 'item_wovengloves', flavor: 'Supple bark, somehow.' },
  { id: 'drift_charm',  name: 'Driftwood Charm',  level: 36, time: 9.0, xp: 320, cost: { log_ironbark: 3, reagent_blue_gem: 1 },              produces: 'item_driftcharm',  flavor: 'Driftwood from a sea no one can point to.' },
];
