import type { InventoryEntry } from '@/modules/Shop/types';

import routes from '@/routes';
import { api } from '@shared/api';

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  gold: number;
  experience: number;
  level: number;
  inventory: InventoryEntry[];
};

export const usersApi = {
  async getMe(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>(routes.api.users.mePath());

    return data;
  },
};
