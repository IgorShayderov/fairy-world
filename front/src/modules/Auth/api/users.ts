import { api } from '@shared/api';

import routes from '@/routes';

export type CurrentUser = {
  id: number;
  email: string;
  gold: number;
  experience: number;
  level: number;
};

export const usersApi = {
  async getMe(): Promise<CurrentUser> {
    const { data } = await api.get<CurrentUser>(routes.api.users.mePath());

    return data;
  },
};
