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

export const getUserId = (): number | null => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.sub === 'number' ? decoded.sub : Number(decoded.sub) || null;
  } catch {
    return null;
  }
};
