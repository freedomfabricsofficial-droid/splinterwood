import type { CarvingRecipe } from '../types';

export const CARVING_RECIPES: CarvingRecipe[] = [
  { id: 'club',     name: 'Knobbly Club',      level: 1,  time: 2.0, xp: 6,   cost: { log_twig: 2 },                  produces: 'item_club',     flavor: 'A persuasive vegetable.' },
  { id: 'shield',   name: 'Bark Shield',       level: 6,  time: 3.5, xp: 18,  cost: { log_oak: 3 },                   produces: 'item_shield',   flavor: 'Surprisingly aerodynamic when thrown.' },
  { id: 'sword',    name: 'Pinewood Sword',    level: 14, time: 5.0, xp: 42,  cost: { log_pine: 4, log_oak: 1 },      produces: 'item_sword',    flavor: 'It splinters, but with conviction.' },
  { id: 'greatbow', name: 'Ironbark Greatbow', level: 28, time: 8.0, xp: 110, cost: { log_ironbark: 3, log_pine: 4 }, produces: 'item_greatbow', flavor: 'Pulls back with a sound like an angry violin.' },
];
