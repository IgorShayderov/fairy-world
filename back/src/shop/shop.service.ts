import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EquipmentType, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { BuyDto } from './dto/buy.dto';
import { SellDto } from './dto/sell.dto';
import { SellManyDto } from './dto/sell-many.dto';
import { ItemView } from '../common/views/item.view';
import { ItemGeneratorService } from '../items/item-generator.service';
import { SEEDED_CONSUMABLES } from '../items/seeded-consumables';

const SHOP_RESTOCK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SHOP_RESTOCK_ITEM_COUNT = 12;
const SHOP_RANDOM_EQUIPMENT_COUNT = 8;
const SHOP_GUARANTEED_EQUIPMENT_TYPES = [EquipmentType.GLOVES, EquipmentType.LEGS] as const;
const SHOP_ITEM_LEVEL_OFFSETS = [-2, -1, 0, 1, 2] as const;
export const SHOP_REFRESH_GEM_COST = 10;

@Injectable()
export class ShopService {
  constructor(
    private prisma: PrismaService,
    private itemGenerator: ItemGeneratorService,
  ) {}

  async getShop(userId: number, shopId: number) {
    return this.trade(async (tx) => {
      const [shop, profile] = await Promise.all([
        tx.shop.findUnique({ where: { id: shopId } }),
        tx.gameProfile.findUnique({ where: { userId }, select: { level: true } }),
      ]);
      if (!shop) throw new NotFoundException('Shop not found');
      if (!profile) throw new NotFoundException('Game profile not found');

      await tx.shopStock.deleteMany({ where: { shopId, quantity: { lte: 0 } } });

      const now = new Date();
      if (!shop.nextRestockAt || shop.nextRestockAt <= now) {
        await this.restock(tx, shopId, profile.level, now);
      }

      const currentShop = await tx.shop.findUnique({
        where: { id: shopId },
        include: {
          stock: {
            where: { quantity: { gt: 0 } },
            orderBy: { itemId: 'asc' },
            include: {
              item: {
                include: {
                  attributes: { include: { attribute: true } },
                  stats: { include: { stat: true } },
                },
              },
            },
          },
        },
      });
      if (!currentShop) throw new NotFoundException('Shop not found');
      const { stock, ...details } = currentShop;
      return {
        ...details,
        refreshCost: SHOP_REFRESH_GEM_COST,
        items: stock.map(({ item, quantity }) => ({ ...ItemView.render(item), quantity })),
      };
    });
  }

  async refresh(userId: number, shopId: number) {
    return this.trade(async (tx) => {
      const [shop, profile] = await Promise.all([
        tx.shop.findUnique({ where: { id: shopId }, select: { id: true } }),
        tx.gameProfile.findUnique({ where: { userId }, select: { id: true, level: true, gems: true } }),
      ]);
      if (!shop) throw new NotFoundException('Shop not found');
      if (!profile) throw new NotFoundException('Game profile not found');
      if (profile.gems < SHOP_REFRESH_GEM_COST) throw new BadRequestException('Not enough gems');

      await tx.gameProfile.update({
        where: { id: profile.id },
        data: { gems: { decrement: SHOP_REFRESH_GEM_COST } },
      });
      const nextRestockAt = await this.restock(tx, shopId, profile.level, new Date());

      return { success: true, cost: SHOP_REFRESH_GEM_COST, nextRestockAt };
    });
  }

  private async restock(tx: Prisma.TransactionClient, shopId: number, playerLevel: number, now: Date) {
    await tx.shopStock.deleteMany({ where: { shopId } });
    let stockCount = 0;
    for (let index = 0; index < SHOP_RANDOM_EQUIPMENT_COUNT; index++) {
      const levelOffset = SHOP_ITEM_LEVEL_OFFSETS[index % SHOP_ITEM_LEVEL_OFFSETS.length];
      const itemLevel = Math.max(1, playerLevel + levelOffset);
      const item = await this.itemGenerator.generate({ level: itemLevel }, tx);
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: item.id } },
        create: { shopId, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      stockCount++;
    }

    for (const equipmentType of SHOP_GUARANTEED_EQUIPMENT_TYPES) {
      const levelOffset = SHOP_ITEM_LEVEL_OFFSETS[stockCount % SHOP_ITEM_LEVEL_OFFSETS.length];
      const item = await this.itemGenerator.generate(
        { level: Math.max(1, playerLevel + levelOffset), equipmentType },
        tx,
      );
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: item.id } },
        create: { shopId, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      stockCount++;
    }

    const consumables = await tx.item.findMany({
      where: {
        isConsumable: true,
        name: { in: SEEDED_CONSUMABLES.map((item) => item.name) },
        equipmentType: { hasSome: [EquipmentType.POTION, EquipmentType.SCROLL] },
      },
      select: { id: true, equipmentType: true },
    });
    for (const equipmentType of [EquipmentType.POTION, EquipmentType.SCROLL]) {
      const matchingItems = consumables.filter((item) => item.equipmentType.includes(equipmentType));
      if (matchingItems.length === 0) continue;

      const item = matchingItems[Math.floor(Math.random() * matchingItems.length)];
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: item.id } },
        create: { shopId, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      stockCount++;
    }

    while (stockCount < SHOP_RESTOCK_ITEM_COUNT) {
      const levelOffset = SHOP_ITEM_LEVEL_OFFSETS[stockCount % SHOP_ITEM_LEVEL_OFFSETS.length];
      const item = await this.itemGenerator.generate({ level: Math.max(1, playerLevel + levelOffset) }, tx);
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: item.id } },
        create: { shopId, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      stockCount++;
    }

    const nextRestockAt = new Date(now.getTime() + SHOP_RESTOCK_INTERVAL_MS);
    await tx.shop.update({ where: { id: shopId }, data: { nextRestockAt } });
    return nextRestockAt;
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
      if (stock.quantity === dto.quantity) {
        await tx.shopStock.delete({ where: { shopId_itemId: { shopId, itemId: dto.itemId } } });
      } else {
        await tx.shopStock.update({
          where: { shopId_itemId: { shopId, itemId: dto.itemId } },
          data: { quantity: { decrement: dto.quantity } },
        });
      }
      const inventoryEntry = await tx.inventoryItem.findFirst({
        where: { gameProfileId: profile.id, itemId: dto.itemId, isEquiped: false },
        select: { id: true },
      });
      if (inventoryEntry) {
        await tx.inventoryItem.update({
          where: { id: inventoryEntry.id },
          data: { quantity: { increment: dto.quantity } },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            gameProfileId: profile.id,
            itemId: dto.itemId,
            quantity: dto.quantity,
            slot: null,
            isEquiped: false,
          },
        });
      }
      return { success: true, itemId: dto.itemId, quantity: dto.quantity, totalCost };
    });
  }

  async sell(userId: number, shopId: number, dto: SellDto) {
    this.validateQuantity(dto.quantity);
    return this.trade(async (tx) => {
      const shop = await tx.shop.findUnique({ where: { id: shopId } });
      if (!shop) throw new NotFoundException('Shop not found');
      const entry = await tx.inventoryItem.findFirst({
        where: { gameProfile: { userId }, itemId: dto.itemId, isEquiped: false },
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

  async sellMany(userId: number, shopId: number, dto: SellManyDto) {
    if (dto.items.length === 0) throw new BadRequestException('At least one item is required');
    if (new Set(dto.items.map(({ itemId }) => itemId)).size !== dto.items.length) {
      throw new BadRequestException('Each item may appear only once');
    }
    for (const item of dto.items) this.validateQuantity(item.quantity);

    return this.trade(async (tx) => {
      const [shop, profile] = await Promise.all([
        tx.shop.findUnique({ where: { id: shopId } }),
        tx.gameProfile.findUnique({ where: { userId }, select: { id: true } }),
      ]);
      if (!shop) throw new NotFoundException('Shop not found');
      if (!profile) throw new NotFoundException('Game profile not found');

      const entries = await tx.inventoryItem.findMany({
        where: {
          gameProfileId: profile.id,
          itemId: { in: dto.items.map(({ itemId }) => itemId) },
          isEquiped: false,
        },
        include: { item: true },
      });
      const entriesByItemId = new Map(entries.map((entry) => [entry.itemId, entry]));
      const saleLines = dto.items.map(({ itemId, quantity }) => {
        const entry = entriesByItemId.get(itemId);
        if (!entry) throw new NotFoundException(`Item ${itemId} not found in inventory`);
        if (entry.quantity < quantity) throw new BadRequestException(`Not enough item ${itemId} in inventory`);
        return {
          entry,
          itemId,
          quantity,
          earnedGold: Math.max(1, Math.floor(entry.item.price * 0.5 * quantity)),
        };
      });
      const earnedGold = saleLines.reduce((total, line) => total + line.earnedGold, 0);
      if (shop.gold < earnedGold) throw new BadRequestException('Shop does not have enough gold');

      await tx.shop.update({ where: { id: shopId }, data: { gold: { decrement: earnedGold } } });
      await tx.gameProfile.update({ where: { id: profile.id }, data: { gold: { increment: earnedGold } } });
      for (const line of saleLines) {
        await tx.shopStock.upsert({
          where: { shopId_itemId: { shopId, itemId: line.itemId } },
          update: { quantity: { increment: line.quantity } },
          create: { shopId, itemId: line.itemId, quantity: line.quantity },
        });
        if (line.entry.quantity === line.quantity) {
          await tx.inventoryItem.delete({ where: { id: line.entry.id } });
        } else {
          await tx.inventoryItem.update({
            where: { id: line.entry.id },
            data: { quantity: { decrement: line.quantity } },
          });
        }
      }

      return {
        success: true,
        quantity: saleLines.reduce((total, line) => total + line.quantity, 0),
        earnedGold,
        items: saleLines.map(({ itemId, quantity, earnedGold: lineGold }) => ({
          itemId,
          quantity,
          earnedGold: lineGold,
        })),
      };
    });
  }
}
