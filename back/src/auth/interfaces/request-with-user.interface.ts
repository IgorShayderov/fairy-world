import { Request } from 'express';
import { AccessTokenPayload } from './token-payload.interface';

export interface RequestWithUser extends Request {
  user: AccessTokenPayload & { type?: 'refresh' };
}
