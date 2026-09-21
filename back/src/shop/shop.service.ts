import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { EquipmentType, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { BuyDto } from './dto/buy.dto';
import { SellDto } from './dto/sell.dto';
import { SellManyDto } from './dto/sell-many.dto';
import { ItemView } from '../common/views/item.view';
import { ItemGeneratorService } from '../items/item-generator.service';
import { SEEDED_CONSUMABLES } from '../items/seeded-consumables';
import { CRAFTING_MIN_LEVEL } from '../crafting/crafting.catalog';
import { townAt } from '../locations/towns';
import { requiredPlayerLevel } from '../users/level-progression';
import { getPotionRequiredLevel } from '../items/potion-effects';

const SHOP_RESTOCK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SHOP_RESTOCK_ITEM_COUNT = 12;
const SHOP_RANDOM_EQUIPMENT_COUNT = 8;
const SHOP_GUARANTEED_EQUIPMENT_TYPES = [EquipmentType.GLOVES, EquipmentType.LEGS] as const;
const SHOP_ITEM_LEVEL_OFFSETS = [-2, -1, 0, 1, 2] as const;
export const SHOP_REFRESH_GEM_COST = 10;
export const SHOP_DEFAULT_GOLD = 1_000_000;
export const SHOP_FREE_ATTRIBUTE_POTION_CHANCE = 0.03;
export const SHOP_RECIPE_CHANCE = 0.25;

export const potionWeightForLevel = (level: number): number => {
  return Math.max(1, 6 - Math.floor(level / 10));
};

const pickWeightedIndex = (items: Array<{ level: number; name: string }>): number => {
  const weights = items.map((item) => {
    const lvl = Math.max(getPotionRequiredLevel(item.name), item.level ?? 1);
    return potionWeightForLevel(lvl);
  });
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return items.length - 1;
};

@Injectable()
export class ShopService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private itemGenerator: ItemGeneratorService,
  ) {}

  async onModuleInit() {
    for (const consumable of SEEDED_CONSUMABLES) {
      const data = {
        level: consumable.level,
        price: consumable.price,
        description: consumable.description,
        icon: 'icon_potion.png',
        isConsumable: true,
        rarity: consumable.rarity,
        equipmentType: [consumable.equipmentType],
      };
      const existing = await this.prisma.item.findFirst({ where: { name: consumable.name }, select: { id: true } });
      if (existing) await this.prisma.item.update({ where: { id: existing.id }, data });
      else await this.prisma.item.create({ data: { name: consumable.name, ...data } });
    }
    await this.prisma.item.updateMany({
      where: { name: { contains: 'Axe' } },
      data: { icon: 'icon_axe.png' },
    });
    await this.prisma.shopStock.updateMany({
      where: { item: { name: { contains: 'Health Potion' } }, quantity: { lt: 5 } },
      data: { quantity: 5 },
    });
  }

  async getShop(userId: number, shopId: number) {
    return this.trade(userId, shopId, async (tx, shopId) => {
      const [shop, profile] = await Promise.all([
        tx.shop.findUnique({ where: { id: shopId } }),
        tx.gameProfile.findUnique({ where: { userId }, select: { id: true, level: true } }),
      ]);
      if (!shop) throw new NotFoundException('Shop not found');
      if (!profile) throw new NotFoundException('Game profile not found');

      await tx.shopStock.deleteMany({ where: { shopId, quantity: { lte: 0 } } });

      const now = new Date();
      if (!shop.nextRestockAt || shop.nextRestockAt <= now || shop.stockLevel !== profile.level) {
        await this.restock(tx, shopId, profile.id, profile.level, now);
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
        id: details.townId ?? details.id,
        name: details.name,
        gold: details.gold,
        nextRestockAt: details.nextRestockAt,
        refreshCost: SHOP_REFRESH_GEM_COST,
        items: stock
          .filter(({ item }) => {
            const req = item.isConsumable
              ? Math.max(getPotionRequiredLevel(item.name), item.level ?? 1)
              : requiredPlayerLevel(item.level);
            return req <= profile.level;
          })
          .map(({ item, quantity }) => ({ ...ItemView.render(item), quantity })),
      };
    });
  }

  async refresh(userId: number, shopId: number) {
    return this.trade(userId, shopId, async (tx, shopId) => {
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
      const nextRestockAt = await this.restock(tx, shopId, profile.id, profile.level, new Date());

      return { success: true, cost: SHOP_REFRESH_GEM_COST, nextRestockAt };
    });
  }

  private async restock(
    tx: Prisma.TransactionClient,
    shopId: number,
    gameProfileId: number,
    playerLevel: number,
    now: Date,
  ) {
    await tx.shopStock.deleteMany({ where: { shopId } });
    let stockCount = 0;
    for (let index = 0; index < SHOP_RANDOM_EQUIPMENT_COUNT; index++) {
      const levelOffset = SHOP_ITEM_LEVEL_OFFSETS[index % SHOP_ITEM_LEVEL_OFFSETS.length];
      let itemLevel = Math.max(1, playerLevel + levelOffset);
      if (requiredPlayerLevel(itemLevel) > playerLevel) {
        itemLevel = playerLevel;
      }
      const item = await this.itemGenerator.generate({ level: itemLevel }, tx);
      if (!item.isConsumable && requiredPlayerLevel(item.level) > playerLevel) continue;
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: item.id } },
        create: { shopId, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      stockCount++;
    }

    for (const equipmentType of SHOP_GUARANTEED_EQUIPMENT_TYPES) {
      const levelOffset = SHOP_ITEM_LEVEL_OFFSETS[stockCount % SHOP_ITEM_LEVEL_OFFSETS.length];
      let itemLevel = Math.max(1, playerLevel + levelOffset);
      if (requiredPlayerLevel(itemLevel) > playerLevel) {
        itemLevel = playerLevel;
      }
      const item = await this.itemGenerator.generate({ level: itemLevel, equipmentType }, tx);
      if (!item.isConsumable && requiredPlayerLevel(item.level) > playerLevel) continue;
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
        equipmentType: { hasSome: [EquipmentType.POTION] },
      },
      select: { id: true, name: true, level: true, equipmentType: true },
    });
    const eligibleConsumables = consumables.filter((item) => {
      const req = Math.max(getPotionRequiredLevel(item.name), item.level ?? 1);
      return req <= playerLevel;
    });

    const freeAttributeItem =
      playerLevel >= 30 ? eligibleConsumables.find((item) => item.name === 'Free Attribute Potion') : undefined;
    const healthPotions = eligibleConsumables
      .filter((item) => item.name?.includes('Health Potion'))
      .sort(
        (left, right) =>
          Math.max(getPotionRequiredLevel(right.name), right.level ?? 1) -
          Math.max(getPotionRequiredLevel(left.name), left.level ?? 1),
      );
    const regularPotions = eligibleConsumables.filter(
      (item) => item.name !== 'Free Attribute Potion' && !item.name?.includes('Health Potion'),
    );

    const selectedPotions: typeof consumables = [];
    if (healthPotions[0]) selectedPotions.push(healthPotions[0]);
    if (freeAttributeItem && Math.random() < SHOP_FREE_ATTRIBUTE_POTION_CHANCE) {
      selectedPotions.push(freeAttributeItem);
    }

    const availableRegular = [...regularPotions];
    const maxPotions = Math.min(2, SHOP_RESTOCK_ITEM_COUNT - stockCount);
    while (selectedPotions.length < maxPotions && availableRegular.length > 0) {
      const index = pickWeightedIndex(availableRegular);
      const [item] = availableRegular.splice(index, 1);
      selectedPotions.push(item);
    }

    for (const item of selectedPotions) {
      const quantity = item.name?.includes('Health Potion') ? 5 : 1;
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: item.id } },
        create: { shopId, itemId: item.id, quantity },
        update: { quantity: { increment: quantity } },
      });
      stockCount++;
    }

    if (playerLevel >= CRAFTING_MIN_LEVEL && Math.random() < SHOP_RECIPE_CHANCE) {
      const recipes = await tx.craftRecipe.findMany({
        where: {
          learners: { none: { gameProfileId } },
          shopItem: { inventoryItem: { none: { gameProfileId } } },
        },
        select: { shopItemId: true },
        orderBy: { id: 'asc' },
      });
      if (recipes.length) {
        const recipe = recipes[Math.floor(Math.random() * recipes.length)];
        await tx.shopStock.create({ data: { shopId, itemId: recipe.shopItemId, quantity: 1 } });
        stockCount++;
      }
    }

    while (stockCount < SHOP_RESTOCK_ITEM_COUNT) {
      const levelOffset = SHOP_ITEM_LEVEL_OFFSETS[stockCount % SHOP_ITEM_LEVEL_OFFSETS.length];
      let itemLevel = Math.max(1, playerLevel + levelOffset);
      if (requiredPlayerLevel(itemLevel) > playerLevel) {
        itemLevel = playerLevel;
      }
      const item = await this.itemGenerator.generate({ level: itemLevel }, tx);
      if (!item.isConsumable && requiredPlayerLevel(item.level) > playerLevel) continue;
      await tx.shopStock.upsert({
        where: { shopId_itemId: { shopId, itemId: item.id } },
        create: { shopId, itemId: item.id, quantity: 1 },
        update: { quantity: { increment: 1 } },
      });
      stockCount++;
    }

    const nextRestockAt = new Date(now.getTime() + SHOP_RESTOCK_INTERVAL_MS);
    await tx.shop.update({
      where: { id: shopId },
      data: {
        nextRestockAt,
        stockLevel: playerLevel,
        gold: SHOP_DEFAULT_GOLD,
      },
    });
    return nextRestockAt;
  }

  private validateQuantity(quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }
  }

  // Retry serialization conflicts so concurrent trades cannot spend the same stock or gold.
  private async trade<T>(
    userId: number,
    shopId: number,
    operation: (tx: Prisma.TransactionClient, personalShopId: number) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const profile = await tx.gameProfile.findUnique({ where: { userId } });
            if (!profile) throw new NotFoundException('Game profile not found');
            const town = townAt(profile);
            if (!town || town.shopId !== shopId) throw new BadRequestException('Travel to this town to use its shop');
            const shop = await tx.shop.upsert({
              where: { ownerId_townId: { ownerId: profile.id, townId: shopId } },
              create: { ownerId: profile.id, townId: shopId, name: `${town.name} Market`, gold: SHOP_DEFAULT_GOLD },
              update: {},
            });
            return operation(tx, shop.id);
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 3) continue;
        throw error;
      }
    }
  }

  async buy(userId: number, shopId: number, dto: BuyDto) {
    this.validateQuantity(dto.quantity);
    return this.trade(userId, shopId, async (tx, shopId) => {
      const shop = await tx.shop.findUnique({ where: { id: shopId } });
      if (!shop) throw new NotFoundException('Shop not found');
      const profile = await tx.gameProfile.findUnique({ where: { userId } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const stock = await tx.shopStock.findUnique({
        where: { shopId_itemId: { shopId, itemId: dto.itemId } },
        include: { item: true },
      });
      if (!stock) throw new NotFoundException('Item not found in shop');
      const craftRecipe = await tx.craftRecipe.findUnique({ where: { shopItemId: stock.itemId } });
      if (craftRecipe && dto.quantity !== 1) throw new BadRequestException('Recipes can only be purchased once');
      if (craftRecipe) {
        if (profile.level < CRAFTING_MIN_LEVEL) {
          throw new BadRequestException(`Crafting is available from level ${CRAFTING_MIN_LEVEL}`);
        }
        const learned = await tx.learnedCraftRecipe.findUnique({
          where: { gameProfileId_recipeId: { gameProfileId: profile.id, recipeId: craftRecipe.id } },
        });
        if (learned) throw new BadRequestException('Recipe has already been learned');
      }
      const req = stock.item.isConsumable
        ? Math.max(getPotionRequiredLevel(stock.item.name), stock.item.level ?? 1)
        : requiredPlayerLevel(stock.item.level);
      if (profile.level < req) {
        throw new BadRequestException(`This item requires player level ${req}`);
      }
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
        const backpackCount = await tx.inventoryItem.count({
          where: { gameProfileId: profile.id, isEquiped: false },
        });
        if (backpackCount >= 24) throw new BadRequestException('Inventory is full (maximum 24 slots)');
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
    return this.trade(userId, shopId, async (tx, shopId) => {
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
    for (const item of dto.items) this.validateQuantity(item.quantity);
    const requested = new Map<number, number>();
    for (const { itemId, quantity } of dto.items) requested.set(itemId, (requested.get(itemId) ?? 0) + quantity);
    const items = [...requested].map(([itemId, quantity]) => ({ itemId, quantity }));
    for (const item of items) this.validateQuantity(item.quantity);

    return this.trade(userId, shopId, async (tx, shopId) => {
      const [shop, profile] = await Promise.all([
        tx.shop.findUnique({ where: { id: shopId } }),
        tx.gameProfile.findUnique({ where: { userId }, select: { id: true } }),
      ]);
      if (!shop) throw new NotFoundException('Shop not found');
      if (!profile) throw new NotFoundException('Game profile not found');

      const entries = await tx.inventoryItem.findMany({
        where: {
          gameProfileId: profile.id,
          itemId: { in: items.map(({ itemId }) => itemId) },
          isEquiped: false,
        },
        include: { item: true },
      });
      const saleLines = items.map(({ itemId, quantity }) => {
        const stacks = entries.filter((entry) => entry.itemId === itemId).sort((a, b) => a.id - b.id);
        if (!stacks.length) throw new NotFoundException(`Item ${itemId} not found in inventory`);
        if (stacks.reduce((sum, entry) => sum + entry.quantity, 0) < quantity)
          throw new BadRequestException(`Not enough item ${itemId} in inventory`);
        return {
          stacks,
          itemId,
          quantity,
          earnedGold: Math.max(1, Math.floor(stacks[0].item.price * 0.5 * quantity)),
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
        let remaining = line.quantity;
        for (const entry of line.stacks) {
          if (!remaining) break;
          const sold = Math.min(remaining, entry.quantity);
          if (sold === entry.quantity) await tx.inventoryItem.delete({ where: { id: entry.id } });
          else await tx.inventoryItem.update({ where: { id: entry.id }, data: { quantity: { decrement: sold } } });
          remaining -= sold;
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
