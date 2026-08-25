import { UserModel } from '../../../generated/prisma/models';

export interface AccessTokenPayload {
  sub: number;
  email: UserModel['email'];
}
