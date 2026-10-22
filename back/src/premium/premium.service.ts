import { BadRequestException, ForbiddenException, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { GEM_ACTIONS, gemActionCost } from '../gem-prices/gem-prices';

export const PREMIUM_PRICE = GEM_ACTIONS.PREMIUM_ACCOUNT.defaultCost;
export const PREMIUM_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export function premiumActive(account: { active: boolean; expiresAt: Date } | null | undefined, now = new Date()) {
  return !!account?.active && account.expiresAt > now;
}
export function developmentQuickBattle() {
  return process.env.NODE_ENV === 'development';
}

@Injectable()
export class PremiumService implements OnApplicationBootstrap {
  constructor(private readonly prisma: PrismaService) {}

  async buy(userId: number, expectedCost?: number) {
    return this.prisma.$transaction(async (tx) => {
      const cost = await gemActionCost(tx, 'PREMIUM_ACCOUNT', expectedCost);
      // This conditional update locks the profile row until commit, serializing renewals.
      const charged = await tx.gameProfile.updateMany({
        where: { userId, gems: { gte: cost } },
        data: { gems: { decrement: cost } },
      });
      if (charged.count !== 1) throw new BadRequestException(`You need ${cost} gems to buy premium`);
      const profile = await tx.gameProfile.findUniqueOrThrow({ where: { userId } });
      const existing = await tx.premiumAccount.findUnique({ where: { gameProfileId: profile.id } });
      const now = new Date();
      const expiresAt = new Date(Math.max(now.getTime(), existing?.expiresAt.getTime() ?? 0) + PREMIUM_DURATION_MS);
      const account = await tx.premiumAccount.upsert({
        where: { gameProfileId: profile.id },
        create: { gameProfileId: profile.id, expiresAt, active: true },
        update: { expiresAt, active: true },
      });
      return { active: true, expiresAt: account.expiresAt, gems: profile.gems };
    });
  }

  async assertQuickBattle(userId: number) {
    if (developmentQuickBattle()) return;
    const account = await this.prisma.premiumAccount.findFirst({ where: { gameProfile: { userId } } });
    if (!premiumActive(account)) throw new ForbiddenException('Quick battle requires an active premium account');
  }

  @Cron('0 0 0 * * *', { name: 'premium-expiration', timeZone: 'UTC', waitForCompletion: true })
  expireAccounts() {
    return this.prisma.premiumAccount.updateMany({
      where: { active: true, expiresAt: { lte: new Date() } },
      data: { active: false },
    });
  }

  async onApplicationBootstrap() {
    await this.expireAccounts();
  }
}
