import { api } from '@shared/api';

import type { ISignData } from '../../../shared/types/user';

import routes from '@/routes';

export const signIn = async ({ email, password }: ISignData) => {
  const { data } = await api.post<{
    access_token: string;
    expiresIn: number;
  }>(routes.api.signInPath(), { email, password });

  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('access_token_expires_at', String(Date.now() + data.expiresIn * 1000));

  return data;
};

export const signOut = async() => {

};
