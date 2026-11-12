import routes from '@/routes';
import { api } from '@/shared/api';

export type GemAction =
  | 'PREMIUM_ACCOUNT'
  | 'SHOP_REFRESH'
  | 'QUEST_REFRESH'
  | 'PVP_REFRESH'
  | 'PVP_COOLDOWN'
  | 'DUNGEON_COOLDOWN'
  | 'BLACKSMITH_SOCKET_GOLD'
  | 'BLACKSMITH_SOCKET_GEMS'
  | 'BLACKSMITH_SOCKET_REMOVE_GOLD';
export interface GemPrice {
  key: GemAction;
  label: string;
  unit?: string;
  defaultCost: number;
  cost: number;
  updatedAt: string | null;
}
export const getGemPrices = async () => (await api.get<GemPrice[]>(routes.api.gemPricesPath())).data;
