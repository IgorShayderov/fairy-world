import { useState } from 'react';

const useAuth = () => {
  const savedUser = localStorage.getItem('currentUser');
  const [currentUser, setUser] = useState();

  const getToken = () => {
    const token = localStorage.getItem('authToken');

    return token;
  };

  return {
    getToken,
    currentUser,
  };
};

export default useAuth;
