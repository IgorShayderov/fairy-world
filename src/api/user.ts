import { api } from '.';

import type { ISignData } from '../types/user';

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

  console.log({ data });

  return {
    token: data.access_token,
    username: data.login,
  };
};

export const signUp = ({ login, password }: ISignData) => {
  console.info(login, password);

  return {
    token: '',
    username: '',
  };
};
