import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EquipmentType, Prisma } from '../../generated/client';
import { gemActionCost } from '../gem-prices/gem-prices';
import { requireLandmark } from './landmarks';

const socketTypes: EquipmentType[] = [
  'WEAPON',
  'SHIELD',
  'BODY',
  'HELMET',
  'BOOTS',
  'GLOVES',
  'LEGS',
  'RING',
  'AMULET',
];

@Injectable()
export class ItemSocketsService {
  constructor(private readonly prisma: PrismaService) {}

  private async prices(tx: Prisma.TransactionClient) {
    const [goldPerLevel, gems, removalGoldPerLevel] = await Promise.all([
      gemActionCost(tx, 'BLACKSMITH_SOCKET_GOLD'),
      gemActionCost(tx, 'BLACKSMITH_SOCKET_GEMS'),
      gemActionCost(tx, 'BLACKSMITH_SOCKET_REMOVE_GOLD'),
    ]);
    return { goldPerLevel, gems, removalGoldPerLevel };
  }

  private async owner(tx: Prisma.TransactionClient, userId: number) {
    const profile = await tx.gameProfile.findUnique({
      where: { userId },
      include: { dungeonRun: true, dungeonParty: { include: { party: true } } },
    });
    if (!profile) throw new NotFoundException('Game profile not found');
    requireLandmark('BLACKSMITH', 'blacksmith', profile);
    if (profile.dungeonRun || profile.dungeonParty?.party.status === 'ACTIVE')
      throw new BadRequestException('Leave the dungeon before using the blacksmith');
    return profile;
  }

  offer(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await this.owner(tx, userId);
      return {
        prices: await this.prices(tx),
        gold: profile.gold,
        gems: profile.gems,
        equipmentGems: await tx.equipmentGem.findMany({
          where: { gameProfileId: profile.id },
          orderBy: { createdAt: 'desc' },
        }),
        items: await tx.inventoryItem.findMany({
          where: {
            gameProfileId: profile.id,
            quantity: { gt: 0 },
            item: { isConsumable: false, rarity: { not: 'QUEST' }, equipmentType: { hasSome: socketTypes } },
            OR: [{ isEquiped: true }, { slot: null }],
          },
          include: { item: true },
          orderBy: { id: 'asc' },
        }),
      };
    });
  }

  change(
    userId: number,
    id: number,
    action: 'add' | 'remove' | 'insert',
    quote: { expectedCost: number; expectedGemCost: number; gemId?: string },
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
        const profile = await this.owner(tx, userId);
        const target = await tx.inventoryItem.findFirst({
          where: { id, gameProfileId: profile.id, quantity: { gt: 0 } },
          include: { item: true },
        });
        if (
          !target ||
          target.item.isConsumable ||
          target.item.rarity === 'QUEST' ||
          !target.item.equipmentType.some((type) => socketTypes.includes(type)) ||
          (!target.isEquiped && target.slot)
        )
          throw new BadRequestException('Choose an owned equipment item');
        if (action === 'add' ? target.hasSocket : !target.hasSocket)
          throw new BadRequestException(
            action === 'add' ? 'This item already has its one socket' : 'This item has no socket',
          );
        const prices = await this.prices(tx);
        const gold =
          action === 'add'
            ? prices.goldPerLevel * target.item.level
            : action === 'remove'
              ? prices.removalGoldPerLevel * target.item.level
              : 0;
        const gems = action === 'add' ? prices.gems : 0;
        if (quote.expectedCost !== gold || quote.expectedGemCost !== gems)
          throw new BadRequestException('The price changed. Refresh the Blacksmith before confirming');
        let data: Prisma.InventoryItemUpdateInput =
          action === 'add' ? { hasSocket: true } : { hasSocket: false, socketGemType: null, socketGemValue: null };
        if (action === 'insert') {
          if (target.socketGemType) throw new BadRequestException('This socket already contains a gem');
          if (!quote.gemId) throw new BadRequestException('Choose a gem');
          const gem = await tx.equipmentGem.findFirst({ where: { id: quote.gemId, gameProfileId: profile.id } });
          if (!gem) throw new BadRequestException('Gem not found in your storage');
          data = { socketGemType: gem.type, socketGemValue: gem.value };
          await tx.equipmentGem.delete({ where: { id: gem.id } });
        }
        const charged = await tx.gameProfile.updateMany({
          where: { id: profile.id, gold: { gte: gold }, gems: { gte: gems } },
          data: { gold: { decrement: gold }, gems: { decrement: gems } },
        });
        if (charged.count !== 1) throw new BadRequestException('Not enough gold or gems');
        if (target.quantity > 1) {
          if (action !== 'add') throw new BadRequestException('Socketed equipment cannot be stacked');
          if ((await tx.inventoryItem.count({ where: { gameProfileId: profile.id, isEquiped: false } })) >= 24)
            throw new BadRequestException('Make room in your backpack to separate this item from its stack');
          await tx.inventoryItem.update({ where: { id }, data: { quantity: { decrement: 1 } } });
          await tx.inventoryItem.create({
            data: {
              gameProfileId: profile.id,
              itemId: target.itemId,
              quantity: 1,
              isEquiped: false,
              hasSocket: true,
              upgradeType: target.upgradeType,
              upgradeValue: target.upgradeValue,
            },
          });
        } else await tx.inventoryItem.update({ where: { id }, data });
        return { success: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
