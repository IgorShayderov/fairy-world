import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CraftItemKind, EquipmentType, ItemRarity, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { CRAFTING_MIN_LEVEL, CRAFT_ITEMS, CRAFT_RECIPES, upgradeValueForLevel } from './crafting.catalog';

@Injectable()
export class CraftingService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.prisma.$transaction(async (tx) => {
      for (const definition of CRAFT_ITEMS) {
        const craftItem = await tx.craftItem.upsert({
          where: { code: definition.code },
          create: definition,
          update: definition,
        });
        if (definition.kind === CraftItemKind.UPGRADE) {
          const existingInventoryItem = await tx.item.findFirst({ where: { name: definition.name } });
          const data = {
            description: definition.description,
            price: 0,
            icon: definition.icon,
            rarity: definition.rarity,
            equipmentType: [EquipmentType.UNKNOWN],
            isConsumable: false,
            level: CRAFTING_MIN_LEVEL,
          };
          const inventoryItem = existingInventoryItem
            ? await tx.item.update({ where: { id: existingInventoryItem.id }, data })
            : await tx.item.create({ data: { ...data, name: definition.name } });

          const legacyOwners = await tx.playerCraftItem.findMany({
            where: { craftItemId: craftItem.id, quantity: { gt: 0 } },
          });
          for (const legacy of legacyOwners) {
            const backpackSlots = await tx.inventoryItem.count({
              where: { gameProfileId: legacy.gameProfileId, isEquiped: false },
            });
            if (backpackSlots >= 24) continue;
            await tx.inventoryItem.create({
              data: {
                gameProfileId: legacy.gameProfileId,
                itemId: inventoryItem.id,
                quantity: legacy.quantity,
                slot: null,
                isEquiped: false,
              },
            });
            await tx.playerCraftItem.delete({
              where: {
                gameProfileId_craftItemId: {
                  gameProfileId: legacy.gameProfileId,
                  craftItemId: craftItem.id,
                },
              },
            });
          }
        }
      }

      for (const definition of CRAFT_RECIPES) {
        const existingShopItem = await tx.item.findFirst({ where: { name: definition.name } });
        const shopItem = existingShopItem
          ? await tx.item.update({
              where: { id: existingShopItem.id },
              data: {
                description: definition.description,
                price: definition.price,
                icon: 'craft_recipe.png',
                rarity: ItemRarity.MAGIC,
                equipmentType: [EquipmentType.RECIPE],
                isConsumable: true,
                level: CRAFTING_MIN_LEVEL,
              },
            })
          : await tx.item.create({
              data: {
                name: definition.name,
                description: definition.description,
                price: definition.price,
                icon: 'craft_recipe.png',
                rarity: ItemRarity.MAGIC,
                equipmentType: [EquipmentType.RECIPE],
                isConsumable: true,
                level: CRAFTING_MIN_LEVEL,
              },
            });
        const result = await tx.craftItem.findUniqueOrThrow({ where: { code: definition.resultCode } });
        const recipe = await tx.craftRecipe.upsert({
          where: { code: definition.code },
          create: {
            code: definition.code,
            name: definition.name,
            description: definition.description,
            shopItemId: shopItem.id,
            resultCraftItemId: result.id,
          },
          update: {
            name: definition.name,
            description: definition.description,
            shopItemId: shopItem.id,
            resultCraftItemId: result.id,
          },
        });
        await tx.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
        for (const ingredient of definition.ingredients) {
          const craftItem = await tx.craftItem.findUniqueOrThrow({ where: { code: ingredient.code } });
          await tx.recipeIngredient.create({
            data: { recipeId: recipe.id, craftItemId: craftItem.id, quantity: ingredient.quantity },
          });
        }
      }
    });
  }

  async getCrafting(userId: number) {
    const profile = await this.prisma.gameProfile.findUnique({
      where: { userId },
      include: {
        craftItems: {
          where: { quantity: { gt: 0 }, craftItem: { kind: CraftItemKind.MATERIAL } },
          include: { craftItem: true },
          orderBy: { craftItemId: 'asc' },
        },
        learnedRecipes: {
          orderBy: { learnedAt: 'asc' },
          include: {
            recipe: {
              include: {
                resultCraftItem: true,
                ingredients: { include: { craftItem: true }, orderBy: { craftItemId: 'asc' } },
              },
            },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Game profile not found');
    if (profile.level < CRAFTING_MIN_LEVEL) {
      throw new BadRequestException(`Crafting is available from level ${CRAFTING_MIN_LEVEL}`);
    }
    const quantities = new Map(profile.craftItems.map(({ craftItemId, quantity }) => [craftItemId, quantity]));
    return {
      level: profile.level,
      recipes: profile.learnedRecipes.map(({ recipe }) => ({
        id: recipe.id,
        code: recipe.code,
        name: recipe.name,
        description: recipe.description,
        result: { ...recipe.resultCraftItem, quantity: recipe.resultQuantity },
        ingredients: recipe.ingredients.map(({ craftItem, quantity }) => ({
          ...craftItem,
          quantity,
          owned: quantities.get(craftItem.id) ?? 0,
        })),
      })),
    };
  }

  craft(userId: number, recipeId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
        const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true, level: true } });
        if (!profile) throw new NotFoundException('Game profile not found');
        if (profile.level < CRAFTING_MIN_LEVEL) {
          throw new BadRequestException(`Crafting is available from level ${CRAFTING_MIN_LEVEL}`);
        }
        const learned = await tx.learnedCraftRecipe.findUnique({
          where: { gameProfileId_recipeId: { gameProfileId: profile.id, recipeId } },
          include: { recipe: { include: { ingredients: true, resultCraftItem: true } } },
        });
        if (!learned) throw new BadRequestException('Recipe has not been learned');
        const backpackSlots = await tx.inventoryItem.count({
          where: { gameProfileId: profile.id, isEquiped: false },
        });
        if (backpackSlots >= 24) throw new BadRequestException('Inventory is full (maximum 24 slots)');
        const craftedInventoryItem = await tx.item.findFirst({
          where: { name: learned.recipe.resultCraftItem.name },
        });
        if (!craftedInventoryItem) throw new NotFoundException('Crafted inventory item is not configured');
        for (const ingredient of learned.recipe.ingredients) {
          const owned = await tx.playerCraftItem.findUnique({
            where: { gameProfileId_craftItemId: { gameProfileId: profile.id, craftItemId: ingredient.craftItemId } },
          });
          if (!owned || owned.quantity < ingredient.quantity)
            throw new BadRequestException('Not enough crafting materials');
        }
        for (const ingredient of learned.recipe.ingredients) {
          const where = {
            gameProfileId_craftItemId: { gameProfileId: profile.id, craftItemId: ingredient.craftItemId },
          };
          const owned = await tx.playerCraftItem.findUniqueOrThrow({ where });
          if (owned.quantity === ingredient.quantity) await tx.playerCraftItem.delete({ where });
          else await tx.playerCraftItem.update({ where, data: { quantity: { decrement: ingredient.quantity } } });
        }
        const created = await tx.inventoryItem.create({
          data: {
            gameProfileId: profile.id,
            itemId: craftedInventoryItem.id,
            quantity: learned.recipe.resultQuantity,
            slot: null,
            isEquiped: false,
          },
        });
        return {
          success: true,
          inventoryItemId: created.id,
          item: learned.recipe.resultCraftItem,
          quantity: learned.recipe.resultQuantity,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  applyUpgrade(userId: number, upgradeInventoryItemId: number, inventoryItemId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
        const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true, level: true } });
        if (!profile) throw new NotFoundException('Game profile not found');
        if (profile.level < CRAFTING_MIN_LEVEL) {
          throw new BadRequestException(`Crafting is available from level ${CRAFTING_MIN_LEVEL}`);
        }
        if (upgradeInventoryItemId === inventoryItemId)
          throw new BadRequestException('An upgrade item cannot upgrade itself');
        const ownedUpgrade = await tx.inventoryItem.findFirst({
          where: { id: upgradeInventoryItemId, gameProfileId: profile.id, isEquiped: false },
          include: { item: true },
        });
        if (!ownedUpgrade) throw new BadRequestException('Upgrade item is not available');
        const upgradeDefinition = CRAFT_ITEMS.find(
          (definition) => definition.kind === CraftItemKind.UPGRADE && definition.name === ownedUpgrade.item.name,
        );
        if (!upgradeDefinition?.upgradeType) throw new BadRequestException('Upgrade item is not available');

        const target = await tx.inventoryItem.findFirst({
          where: { id: inventoryItemId, gameProfileId: profile.id },
          include: { item: true },
        });
        if (!target || target.item.isConsumable || target.item.equipmentType.includes(EquipmentType.RECIPE))
          throw new BadRequestException('This item cannot be upgraded');
        if (target.upgradeType) throw new BadRequestException('This item has already been upgraded');

        const value = upgradeValueForLevel(upgradeDefinition.upgradeType, profile.level);
        let upgradedInventoryItemId = target.id;
        if (target.quantity > 1) {
          await tx.inventoryItem.update({ where: { id: target.id }, data: { quantity: { decrement: 1 } } });
          const created = await tx.inventoryItem.create({
            data: {
              gameProfileId: profile.id,
              itemId: target.itemId,
              quantity: 1,
              slot: null,
              isEquiped: false,
              upgradeType: upgradeDefinition.upgradeType,
              upgradeValue: value,
            },
          });
          upgradedInventoryItemId = created.id;
        } else {
          await tx.inventoryItem.update({
            where: { id: target.id },
            data: { upgradeType: upgradeDefinition.upgradeType, upgradeValue: value },
          });
        }
        if (ownedUpgrade.quantity === 1) await tx.inventoryItem.delete({ where: { id: ownedUpgrade.id } });
        else
          await tx.inventoryItem.update({
            where: { id: ownedUpgrade.id },
            data: { quantity: { decrement: 1 } },
          });
        return {
          success: true,
          inventoryItemId: upgradedInventoryItemId,
          upgradeType: upgradeDefinition.upgradeType,
          value,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
