import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/client';

export const GEM_ACTIONS = {
  PREMIUM_ACCOUNT: { label: 'Premium account (30 days)', defaultCost: 200 },
  SHOP_REFRESH: { label: 'Refresh shop stock', defaultCost: 10 },
  QUEST_REFRESH: { label: 'Refresh town quests', defaultCost: 30 },
  PVP_REFRESH: { label: 'Refresh PvP opponents', defaultCost: 30 },
  PVP_COOLDOWN: { label: 'Skip PvP attack cooldown', defaultCost: 10 },
  DUNGEON_COOLDOWN: { label: 'Skip dungeon entry cooldown', defaultCost: 10 },
} as const;
export type GemAction = keyof typeof GEM_ACTIONS;
type PriceClient = Pick<Prisma.TransactionClient, 'gemActionPrice'>;

export async function gemActionCost(client: PriceClient, key: GemAction, expectedCost?: number): Promise<number> {
  const price = await client.gemActionPrice.findUnique({ where: { key } });
  const cost = price?.cost ?? GEM_ACTIONS[key].defaultCost;
  if (expectedCost !== undefined && expectedCost !== cost) {
    throw new ConflictException('The gem price has changed. Refresh and confirm the new price. No gems were spent.');
  }
  return cost;
}

export async function gemActionCosts(client: PriceClient) {
  const prices = await client.gemActionPrice.findMany();
  return (Object.keys(GEM_ACTIONS) as GemAction[]).map((key) => {
    const price = prices.find((entry) => entry.key === key);
    return {
      key,
      ...GEM_ACTIONS[key],
      cost: price?.cost ?? GEM_ACTIONS[key].defaultCost,
      updatedAt: price?.updatedAt ?? null,
    };
  });
}
