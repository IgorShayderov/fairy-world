import { api } from '@shared/api';

import type { ISignData } from '../../../shared/types/user';

import routes from '@/routes';

export const signIn = async ({ email, password }: ISignData) => {
  const response = await api(routes.api.signInPath(), {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('access_token_expires_at', String(Date.now() + data.expiresIn * 1000));

  return data;
};
