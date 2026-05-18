import type { CombatFoe } from '../types';

// Combat coin drops are the primary income engine on floor 1.
// Tuning targets (avg gameplay per kill):
//   Goblin  ~3s/kill  → ~360c/min sustained
//   Boar    ~6s/kill  → ~500c/min once unlocked
//   Bandit  ~10s/kill → ~720c/min (req. Lv 18)
//   Troll   ~25s/kill → ~1900c/min (req. Lv 32)
export const COMBAT_FOES: CombatFoe[] = [
  { id: 'goblin', name: 'Hungover Goblin',   level: 1,  hp: 8,   atk: 2,  xp: 8,   coin: 18,  drops: [{ id: 'meat_scrap',  chance: 0.4 }], flavor: 'Reeks of cheap mead and bad decisions.' },
  { id: 'boar',   name: 'Recreational Boar', level: 8,  hp: 32,  atk: 5,  xp: 30,  coin: 50,  drops: [{ id: 'meat_scrap',  chance: 0.7 }], flavor: 'It does this for fun. It is winning.' },
  { id: 'bandit', name: 'Off-Duty Bandit',   level: 18, hp: 95,  atk: 11, xp: 110, coin: 120, drops: [{ id: 'coin_purse',  chance: 0.5 }], flavor: 'Insists this is a hobby, not a career.' },
  { id: 'troll',  name: 'Bridge Toll Troll', level: 32, hp: 320, atk: 22, xp: 380, coin: 800, drops: [{ id: 'troll_tooth', chance: 0.3 }], flavor: 'Will accept exact change only.' },
];
