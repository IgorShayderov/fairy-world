import { api } from '@shared/api';

import type { ISignData } from '../../../shared/types/user';

import routes from '@/routes';

export const signIn = async ({ email, password }: ISignData) => {
  const response = await api(routes.api.signInPath(), {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  // FIXME заменить на http-only cookie
  localStorage.setItem('acess_token', data.access);
  localStorage.setItem('acess_token_expires_at', data.access_expires_at);

  return data;
};

export const signUp = ({ email, password }: ISignData) => {
  console.info(email, password);

  return {
    token: '',
    username: '',
  };
};
