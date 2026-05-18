// Mining nodes — floor 2 gather skill.
// Same shape as WOODCUTTING_NODES.

export interface MiningNode {
  id: string;
  name: string;
  level: number;
  time: number;
  xp: number;
  yield: string;
  flavor: string;
}

export const MINING_NODES: MiningNode[] = [
  { id: 'sandstone', name: 'Sandstone Shelf',  level: 1,  time: 3.0, xp: 12, yield: 'ore_sandstone',  flavor: 'Crumbly. Mostly grit.' },
  { id: 'greystone', name: 'Greystone Vein',   level: 8,  time: 4.5, xp: 28, yield: 'ore_greystone',  flavor: 'The local stone. Behaves.' },
  { id: 'bluerock',  name: 'Bluerock Outcrop', level: 16, time: 6.0, xp: 55, yield: 'ore_bluerock',   flavor: 'Streaks of something better.' },
  { id: 'veinstone', name: 'Veinstone Cluster', level: 28, time: 8.0, xp: 110, yield: 'ore_veinstone', flavor: 'Cracks open into surprise.' },
];
