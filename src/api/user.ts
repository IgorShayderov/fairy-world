import { ISignData } from '../types/user';

export const signIn = ({ login, password }: ISignData) => {
  console.info(login, password);

  return {
    token: '',
    username: '',
  }
};

export const signUp = ({ login, password }: ISignData) => {
  console.info(login, password);

  return {
    token: '',
    username: '',
  }
};
