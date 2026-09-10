import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { BuyDto } from './dto/buy.dto';
import { SellDto } from './dto/sell.dto';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  async getShop(shopId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const shop = await tx.shop.findUnique({
          where: { id: shopId },
          include: {
            stock: { orderBy: { itemId: 'asc' }, include: { item: { include: { attributes: true, stats: true } } } },
          },
        });
        if (!shop) throw new NotFoundException('Shop not found');
        const { stock, ...details } = shop;
        return {
          ...details,
          items: stock.map(({ item, quantity }) => ({ ...item, quantity })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private validateQuantity(quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }
  }

  // Retry serialization conflicts so concurrent trades cannot spend the same stock or gold.
  private async trade<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 3) continue;
        throw error;
      }
    }
  }

  async buy(userId: number, shopId: number, dto: BuyDto) {
    this.validateQuantity(dto.quantity);
    return this.trade(async (tx) => {
      const shop = await tx.shop.findUnique({ where: { id: shopId } });
      if (!shop) throw new NotFoundException('Shop not found');
      const profile = await tx.gameProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const stock = await tx.shopStock.findUnique({
        where: { shopId_itemId: { shopId, itemId: dto.itemId } },
        include: { item: true },
      });
      if (!stock) throw new NotFoundException('Item not found in shop');
      if (stock.quantity < dto.quantity) throw new BadRequestException('Not enough items in stock');
      const totalCost = stock.item.price * dto.quantity;
      if (profile.gold < totalCost) throw new BadRequestException('Not enough gold');
      await tx.gameProfile.update({ where: { id: profile.id }, data: { gold: { decrement: totalCost } } });
      await tx.shop.update({ where: { id: shopId }, data: { gold: { increment: totalCost } } });
      await tx.shopStock.update({
        where: { shopId_itemId: { shopId, itemId: dto.itemId } },
        data: { quantity: { decrement: dto.quantity } },
      });
      await tx.inventoryItem.upsert({
        where: { gameProfileId_itemId: { gameProfileId: profile.id, itemId: dto.itemId } },
        update: { quantity: { increment: dto.quantity } },
        create: { gameProfileId: profile.id, itemId: dto.itemId, quantity: dto.quantity, slot: 0, isEquiped: false },
      });
      return { success: true, itemId: dto.itemId, quantity: dto.quantity, totalCost };
    });
  }

  async sell(userId: number, shopId: number, dto: SellDto) {
    this.validateQuantity(dto.quantity);
    return this.trade(async (tx) => {
      const shop = await tx.shop.findUnique({ where: { id: shopId } });
      if (!shop) throw new NotFoundException('Shop not found');
      const entry = await tx.inventoryItem.findFirst({
        where: { gameProfile: { userId }, itemId: dto.itemId },
        include: { item: true },
      });
      if (!entry) throw new NotFoundException('Item not found in inventory');
      if (entry.quantity < dto.quantity) throw new BadRequestException('Not enough items in inventory');
      const earnedGold = Math.max(1, Math.floor(entry.item.price * 0.5 * dto.quantity));
      if (shop.gold < earnedGold) throw new BadRequestException('Shop does not have enough gold');
      await tx.shop.update({ where: { id: shopId }, data: { gold: { decrement: earnedGold } } });
      await tx.gameProfile.update({ where: { id: entry.gameProfileId }, data: { gold: { increment: earnedGold } } });
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: dto.itemId } },
        update: { quantity: { increment: dto.quantity } },
        create: { shopId, itemId: dto.itemId, quantity: dto.quantity },
      });
      if (entry.quantity === dto.quantity) {
        await tx.inventoryItem.delete({ where: { id: entry.id } });
      } else {
        await tx.inventoryItem.update({ where: { id: entry.id }, data: { quantity: { decrement: dto.quantity } } });
      }
      return { success: true, itemId: dto.itemId, quantity: dto.quantity, earnedGold };
    });
  }
}
