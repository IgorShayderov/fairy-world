import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { authAPI } from '@/api';
import type { ISignData, ICurrentUser } from '@/types/auth';

import routes from '@/routes';

const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser>({});

  const navigate = useNavigate();

  const signIn = async ({ email, password }: ISignData) => {
    const { access, access_expires_at } = await authAPI.signIn({
      email,
      password,
    });

    // FIXME заменить на http-only cookie
    localStorage.setItem('access_token', access);
    // setAccessToken(access);
    localStorage.setItem('access_token_expires_at', access_expires_at);

    await getCurrentUser();
  };

  const signUp = async ({ email, password }: ISignData) => {
    const { access, access_expires_at } = await authAPI.signUp({
      email,
      password,
    });

    localStorage.setItem('access_token', access);
    localStorage.setItem('access_token_expires_at', access_expires_at);
  };

  const signOut = async () => {
    await authAPI.signOut();

    localStorage.removeItem('access_token');
    localStorage.removeItem('access_token_expires_at');
  };

  const getCurrentUser = async () => {
    const data = await authAPI.fetchCurrentUser();

    setCurrentUser({ ...data });
  };

  return {
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    currentUser,
  };
};

export { useAuth };
