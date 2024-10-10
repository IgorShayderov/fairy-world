import { api } from '.';

import type { ISignData, ICurrentUser } from '@/types/auth';

import routes from '@/routes';

export const signIn = async ({ email, password }: ISignData) => {
  const response = await api(routes.api.signInPath(), {
    method: 'POST',
    body: {
      email,
      password,
    },
  });

  return await response.json();
};

export const signOut = async () => {
  const response = await api(routes.api.signOutPath());

  return response.json();
};

export const updateToken = () => {
  //
};

export const fetchCurrentUser = async () => {
  const response = await api.get(routes.api.currentUserPath());

  return response.json();
};
