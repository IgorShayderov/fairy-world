import routes from '@/routes';
import { api } from '@shared/api';


export const requestPasswordReset = async (email: string) => {
  const { data } = await api.post(routes.api.passwords.forgotPasswordPath(), { email });

  return data;
};

export const resetPassword = async (token: string, password: string) => {
  const { data } = await api.post(routes.api.passwords.resetPasswordPath(), { token, password });

  return data;
};
