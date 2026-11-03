import { UserModel } from '../../../generated/models';

export interface AccessTokenPayload {
  type?: 'access' | 'refresh';
  sub: number;
  email: UserModel['email'];
}

export interface TokenResult {
  access_token: string;
  refresh_token: string;
  expiresIn: number;
}
