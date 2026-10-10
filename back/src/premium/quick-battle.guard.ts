import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PremiumService } from './premium.service';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Injectable()
export class QuickBattleGuard implements CanActivate {
  constructor(private readonly premium: PremiumService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    await this.premium.assertQuickBattle(request.user.sub);
    return true;
  }
}
