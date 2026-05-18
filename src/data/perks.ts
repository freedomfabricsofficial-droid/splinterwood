import type { Perk, SkillId } from '../types';

export const PERK_TREES: Record<SkillId, Perk[]> = {
  woodcutting: [
    { id: 'wc_speed1', name: 'Sharper Axe',         cost: 1, desc: '+10% chopping speed.',                              effect: { wc_speed: 0.10 } },
    { id: 'wc_speed2', name: 'Sharper-er Axe',      cost: 2, desc: '+15% chopping speed.',                              effect: { wc_speed: 0.15 }, requires: 'wc_speed1' },
    { id: 'wc_double', name: 'Lucky Strike',        cost: 2, desc: '5% chance to chop two logs.',                       effect: { wc_double: 0.05 } },
    { id: 'wc_xp',     name: "Forester's Lore",     cost: 1, desc: '+20% woodcutting XP.',                              effect: { wc_xp: 0.20 } },
    { id: 'wc_rare',   name: 'Knot Sense',          cost: 3, desc: '2% chance to find a rare upgraded log.',            effect: { wc_rare: 0.02 }, requires: 'wc_xp' },
    { id: 'wc_fast',   name: 'PATH: Hasty Logger',  cost: 3, desc: '+30% speed. Disables Lucky Strike.',                effect: { wc_speed: 0.30, wc_double_disable: true }, exclusive: 'wc_path' },
    { id: 'wc_rich',   name: 'PATH: Patient Logger',cost: 3, desc: '+50% double-chop chance. -15% speed.',              effect: { wc_double: 0.50, wc_speed: -0.15 }, exclusive: 'wc_path' },
  ],
  carving: [
    { id: 'cv_speed1',  name: 'Steady Hand',     cost: 1, desc: '+10% carving speed.',                       effect: { cv_speed: 0.10 } },
    { id: 'cv_save',    name: 'Frugal Carver',   cost: 2, desc: '10% chance to not consume logs.',           effect: { cv_save: 0.10 } },
    { id: 'cv_xp',      name: "Whittler's Eye",  cost: 1, desc: '+25% carving XP.',                          effect: { cv_xp: 0.25 } },
    { id: 'cv_quality', name: "Master's Touch",  cost: 3, desc: 'Carved weapons grant +25% bonus stats.',    effect: { cv_quality: 0.25 }, requires: 'cv_speed1' },
  ],
  combat: [
    { id: 'cb_atk',   name: 'Vigorous Swings', cost: 1, desc: '+2 base attack.',           effect: { cb_atk: 2 } },
    { id: 'cb_def',   name: 'Thick Skin',      cost: 1, desc: '+2 base defense.',          effect: { cb_def: 2 } },
    { id: 'cb_hp',    name: 'Stout Heart',     cost: 2, desc: '+15 max HP.',               effect: { cb_hp: 15 } },
    { id: 'cb_coin',  name: 'Sticky Fingers',  cost: 2, desc: '+30% coin from foes.',      effect: { cb_coin: 0.30 } },
    { id: 'cb_drops', name: 'Eagle Eye',       cost: 3, desc: '+50% drop chance from foes.', effect: { cb_drops: 0.50 }, requires: 'cb_atk' },
  ],
  // Placeholder perks — Brock teaches the same gather/produce shape as floor 1.
  // Will flesh out with proper trees in a later pass.
  mining: [
    { id: 'mn_speed1', name: 'Heavier Swing',  cost: 1, desc: '+10% mining speed.', effect: { mn_speed: 0.10 } },
    { id: 'mn_xp',     name: 'Stone Sense',    cost: 1, desc: '+20% mining XP.',    effect: { mn_xp: 0.20 } },
  ],
  smithing: [
    { id: 'sm_speed1', name: 'Steady Heat',    cost: 1, desc: '+10% smithing speed.', effect: { sm_speed: 0.10 } },
    { id: 'sm_xp',     name: 'Forge Lore',     cost: 1, desc: '+20% smithing XP.',    effect: { sm_xp: 0.20 } },
  ],
};
