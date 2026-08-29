import { UserModel } from '../../../generated/prisma/models';

export interface AccessTokenPayload {
  sub: number;
  email: UserModel['email'];
}

export interface TokenResult {
  access_token: string;
  refresh_token: string;
  expiresIn: number;
}
