import { useState } from 'react';

import { userAPI } from '../api';
import type { ISignData } from '../types/user';

const useAuth = () => {
  const savedUser = localStorage.getItem('currentUser');
  const [currentUser, setUser] = useState(savedUser);

  const signIn = async ({ login, password }: ISignData) => {
    const { token, username } = await userAPI.signIn({ login, password });

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', username);
    setUser(username);
  };

  const signUp = async ({ login, password }: ISignData) => {
    const { token, username } = await userAPI.signIn({ login, password });

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', username);
    setUser(username);
  };

  const signOut = () => {
    return new Promise((resolve) => {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      setUser(null);
      resolve(null);
    });
  };

  const getToken = () => {
    const token = localStorage.getItem('authToken');

    return token;
  };

  return {
    getToken,
    currentUser,
    signIn,
    signUp,
    signOut,
  };
};

export default useAuth;
