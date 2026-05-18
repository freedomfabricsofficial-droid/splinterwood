import type { WoodcuttingNode } from '../types';

export const WOODCUTTING_NODES: WoodcuttingNode[] = [
  { id: 'twig',     name: 'Crooked Twig',   level: 1,  time: 1.5, xp: 4,   yield: 'log_twig',     flavor: 'Barely a tree. Mostly a strong suggestion.' },
  { id: 'oak',      name: 'Surly Oak',      level: 5,  time: 3.0, xp: 12,  yield: 'log_oak',      flavor: 'It sighs as you approach.' },
  { id: 'pine',     name: 'Stoic Pine',     level: 12, time: 4.5, xp: 28,  yield: 'log_pine',     flavor: 'Smells of regret and turpentine.' },
  { id: 'ironbark', name: 'Ironbark Elder', level: 25, time: 7.0, xp: 65,  yield: 'log_ironbark', flavor: 'You suspect the axe is more afraid than the tree.' },
];
