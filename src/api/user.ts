import { api } from '.';

import type { ISignData } from '../types/user';

import routes from '@/routes';

export const signIn = async ({ login, password }: ISignData) => {
  console.info(login, password);

  const response = await api({
    url: routes.api.signInPath(),
    method: 'POST',
    body: JSON.stringify({
      username: login,
      password,
    }),
  });

  const data = response.json();

  return {
    token: data.access_token,
    username: login,
  };
};

export const signUp = ({ login, password }: ISignData) => {
  console.info(login, password);

  return {
    token: '',
    username: '',
  };
};
