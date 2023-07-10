import { useState } from 'react';

import { userAPI } from '../api';
import type { ISignData } from '../types/user';

const useAuth = () => {
  const savedUser = localStorage.getItem('currentUser');
  const [currentUser, setUser] = useState(savedUser);

  const signIn = async ({ email, password }: ISignData) => {
    const { token, username } = await userAPI.signIn({ email, password });

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', username);
    setUser(username);
  };

  const signUp = async ({ email, password }: ISignData) => {
    const { token, username } = await userAPI.signIn({ email, password });

    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', username);
    setUser(username);
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    setUser(null);
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
