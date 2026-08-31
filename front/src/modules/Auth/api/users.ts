import routes from '@/routes';
import { api } from '@shared/api';


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
