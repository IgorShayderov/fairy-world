export const checkAuthStatus = (): boolean => {
  const token = localStorage.getItem('access_token');
  const expiresAt = localStorage.getItem('access_token_expires_at');

  if (!token) return false;

  if (expiresAt) {
    const expirationDate = new Date(expiresAt).getTime();
    if (Date.now() > expirationDate) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('access_token_expires_at');
      return false;
    }
  }

  return true;
};
