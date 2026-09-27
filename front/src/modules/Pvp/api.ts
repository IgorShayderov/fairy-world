import type { CraftUpgradeType } from '@/modules/Inventory/types';
import type { ShopItem } from '@/modules/Shop/types';

import routes from '@/routes';
import { api } from '@/shared/api';

export type PvpDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface PvpOpponent {
  id: string;
  name: string;
  level: number;
  difficulty: PvpDifficulty;
  isBot: boolean;
  avatarIcon?: string;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  blockChance: number;
  criticalChance: number;
  criticalDamage: number;
  rewards: {
    gold: number;
    experience: number;
  };
}

export interface PvpCombatant {
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  damage: number;
  defense: number;
  dodge: number;
  blockChance: number;
  criticalChance: number;
  criticalDamage: number;
}

export interface PvpBattleEvent {
  actor: 'PLAYER' | 'OPPONENT';
  damage: number;
  critical: boolean;
  dodged: boolean;
  blocked?: boolean;
}

export interface PvpDuelResult {
  id: string;
  status: 'VICTORY' | 'DEFEAT';
  turn: number;
  difficulty: PvpDifficulty;
  player: PvpCombatant;
  opponent: PvpCombatant;
  events: PvpBattleEvent[];
  cooldownUntil?: string | null;
  rewards: {
    gold: number;
    experience: number;
    coinsOfHonour?: number;
  } | null;
}

export interface PvpShopOffer {
  id: string;
  kind: 'POTION' | 'UPGRADE';
  cost: number;
  upgradeType: CraftUpgradeType | null;
  upgradeValue: number | null;
  item: Omit<ShopItem, 'quantity'>;
}

export interface PvpShop {
  coinsOfHonour: number;
  offers: PvpShopOffer[];
}

export const pvpApi = {
  async getOpponents(): Promise<PvpOpponent[]> {
    const { data } = await api.get<PvpOpponent[]>(routes.api.pvp.opponentsPath());
    return data;
  },

  async refreshOpponents(): Promise<PvpOpponent[]> {
    const { data } = await api.post<PvpOpponent[]>(routes.api.pvp.refreshOpponentsPath());
    return data;
  },

  async duel(opponentId: string): Promise<PvpDuelResult> {
    const { data } = await api.post<PvpDuelResult>(routes.api.pvp.duelPath(), { opponentId });
    return data;
  },

  async resetCooldown(): Promise<{ success: boolean; pvpCooldownUntil: null }> {
    const { data } = await api.post<{ success: boolean; pvpCooldownUntil: null }>(routes.api.pvp.resetCooldownPath());
    return data;
  },
  async getShop(): Promise<PvpShop> {
    const { data } = await api.get<PvpShop>(routes.api.pvp.shopPath());
    return data;
  },
  async buyShopOffer(offerId: string): Promise<{
    success: boolean;
    itemId: number;
    cost: number;
    coinsOfHonour: number;
    offers: PvpShopOffer[];
  }> {
    const { data } = await api.post(routes.api.pvp.buyShopOfferPath(), { offerId });
    return data;
  },
};
