import type { CraftInventoryItem } from '@/modules/Inventory/types';

import routes from '@/routes';
import { api } from '@/shared/api';

export interface CraftIngredient extends CraftInventoryItem {
  owned: number;
}

export interface CraftRecipe {
  id: number;
  code: string;
  name: string;
  description: string;
  result: CraftInventoryItem;
  ingredients: CraftIngredient[];
}

export interface CraftingData {
  level: number;
  recipes: CraftRecipe[];
}

export const craftingApi = {
  async get(): Promise<CraftingData> {
    const { data } = await api.get<CraftingData>(routes.api.crafting.detailsPath());
    return data;
  },
  async craft(recipeId: number): Promise<void> {
    await api.post(routes.api.crafting.craftPath(recipeId));
  },
  async applyUpgrade(upgradeInventoryItemId: number, inventoryItemId: number): Promise<void> {
    await api.post(routes.api.crafting.applyUpgradePath(), { upgradeInventoryItemId, inventoryItemId });
  },
};
