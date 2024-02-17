import { api } from '../api';

import { ISignData } from '../types/user';

export const signIn = async ({ login, password }: ISignData) => {
  console.info(login, password);

  const response = await api({
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
