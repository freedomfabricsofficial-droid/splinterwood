import type { ShopItem } from '../types';

// Shop prices adjusted ~2x for the new economy. Tonics shouldn't be trivially
// cheap when the player is making 300+ coin/min from combat.
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'potion_minor',   cost: 60,    stockType: 'unlimited' },
  { id: 'potion_greater', cost: 200,   stockType: 'unlimited' },
  { id: 'potion_full',    cost: 900,   stockType: 'daily', dailyStock: 2 },
  { id: 'potion_xp',      cost: 500,   stockType: 'daily', dailyStock: 3 },
  { id: 'lucky_penny',    cost: 150,   stockType: 'daily', dailyStock: 5 },
];
