import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EquipmentType, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { UserModel, UserWhereInput } from '../../generated/models';
import type { EquipItemDto, EquipmentSlotId } from './dto/equip-item.dto';
import type { AllocateAttributeDto } from './dto/allocate-attribute.dto';
import type { UpdateMapPositionDto } from './dto/update-map-position.dto';
import type { ReplaceInventoryItemDto } from './dto/replace-inventory-item.dto';
import { STARTING_ATTRIBUTE_VALUE } from './player-defaults';
import { requiredPlayerLevel } from './level-progression';
import { getPotionEffect, isHealthPotion, POTION_BUFF_DURATION_MS } from '../items/potion-effects';
import { isTwoHandedWeapon } from '../items/weapon-types';

const SLOT_TYPES: Record<EquipmentSlotId, EquipmentType[]> = {
  head: [EquipmentType.HELMET],
  body: [EquipmentType.BODY],
  'left-hand': [EquipmentType.WEAPON],
  'right-hand': [EquipmentType.WEAPON, EquipmentType.SHIELD],
  hands: [EquipmentType.GLOVES],
  legs: [EquipmentType.LEGS],
  feet: [EquipmentType.BOOTS],
  accessory: [EquipmentType.RING, EquipmentType.AMULET],
  scroll: [EquipmentType.SCROLL],
  potion: [EquipmentType.POTION],
};

@Injectable()
export class UsersService {
  async claimDevGems(userId: number) {
    if (
      process.env.NODE_ENV === 'production' ||
      (process.env.NODE_ENV !== 'development' && process.env.npm_lifecycle_event !== 'start:dev')
    )
      throw new ForbiddenException('Development only');
    return this.prisma.gameProfile.update({
      where: { userId },
      data: { gems: { increment: 100 } },
      select: { gems: true },
    });
  }
  constructor(private prisma: PrismaService) {}

  findBy(where: UserWhereInput): Promise<UserModel | null> {
    return this.prisma.user.findFirst({
      where,
    });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findCurrentUser(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        gameProfile: {
          include: {
            inventory: {
              include: {
                item: {
                  include: {
                    attributes: { include: { attribute: true } },
                    stats: { include: { stat: true } },
                  },
                },
              },
              orderBy: { id: 'asc' },
            },
            profileAttributes: { include: { attribute: true } },
            profileStats: { include: { stat: true } },
            buffs: true,
            dungeonVisits: true,
            sanctuaryVisits: true,
            _count: { select: { quests: { where: { completedAt: { not: null } } } } },
          },
        },
      },
    });
  }

  allocateAttribute(userId: number, dto: AllocateAttributeDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const [profile, attribute] = await Promise.all([
          tx.gameProfile.findUnique({ where: { userId }, select: { id: true } }),
          tx.attribute.findUnique({ where: { name: dto.attribute }, select: { id: true, name: true } }),
        ]);
        if (!profile) throw new NotFoundException('Game profile not found');
        if (!attribute) throw new NotFoundException('Attribute not found');

        const spent = await tx.gameProfile.updateMany({
          where: { id: profile.id, freeAttributes: { gte: dto.amount } },
          data: { freeAttributes: { decrement: dto.amount } },
        });
        if (spent.count !== 1) throw new BadRequestException('Not enough free attribute points');

        const allocation = await tx.profileAttribute.upsert({
          where: {
            gameProfileId_attributeId: { gameProfileId: profile.id, attributeId: attribute.id },
          },
          create: {
            gameProfileId: profile.id,
            attributeId: attribute.id,
            value: STARTING_ATTRIBUTE_VALUE + dto.amount,
          },
          update: { value: { increment: dto.amount } },
          select: { value: true },
        });

        return {
          success: true,
          attribute: attribute.name,
          value: allocation.value,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  equipItem(userId: number, dto: EquipItemDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true, level: true } });
        if (!profile) throw new NotFoundException('Game profile not found');

        const source = await tx.inventoryItem.findFirst({
          where: { id: dto.inventoryItemId, gameProfileId: profile.id },
          include: { item: true },
        });
        if (!source) throw new NotFoundException('Inventory item not found');
        if (profile.level < requiredPlayerLevel(source.item.level)) {
          throw new BadRequestException(`This item requires player level ${requiredPlayerLevel(source.item.level)}`);
        }
        if (!source.item.equipmentType.some((type) => SLOT_TYPES[dto.slot].includes(type))) {
          throw new BadRequestException('Item cannot be equipped in this slot');
        }
        if (source.item.equipmentType.includes(EquipmentType.POTION) && !isHealthPotion(source.item.name)) {
          throw new BadRequestException('Only health potions can be equipped');
        }
        if (isTwoHandedWeapon(source.item.name) && dto.slot !== 'left-hand') {
          throw new BadRequestException('Two-handed weapons must be equipped in the left hand');
        }

        const target = await tx.inventoryItem.findFirst({
          where: { gameProfileId: profile.id, isEquiped: true, slot: dto.slot },
          include: { item: true },
        });

        if (dto.slot === 'left-hand' && isTwoHandedWeapon(source.item.name)) {
          const rightHand = await tx.inventoryItem.findFirst({
            where: { gameProfileId: profile.id, isEquiped: true, slot: 'right-hand' },
            select: { id: true, itemId: true, quantity: true },
          });
          if (rightHand) {
            const backpackEntry = await tx.inventoryItem.findFirst({
              where: { gameProfileId: profile.id, itemId: rightHand.itemId, isEquiped: false },
              select: { id: true },
            });
            if (backpackEntry) {
              await tx.inventoryItem.update({
                where: { id: backpackEntry.id },
                data: { quantity: { increment: rightHand.quantity } },
              });
              await tx.inventoryItem.delete({ where: { id: rightHand.id } });
            } else {
              await tx.inventoryItem.update({
                where: { id: rightHand.id },
                data: { isEquiped: false, slot: null },
              });
            }
          }
        }

        if (dto.slot === 'right-hand') {
          const leftHand = await tx.inventoryItem.findFirst({
            where: { gameProfileId: profile.id, isEquiped: true, slot: 'left-hand' },
            include: { item: true },
          });
          if (leftHand && isTwoHandedWeapon(leftHand.item.name)) {
            const backpackEntry = await tx.inventoryItem.findFirst({
              where: { gameProfileId: profile.id, itemId: leftHand.itemId, isEquiped: false },
              select: { id: true },
            });
            if (backpackEntry) {
              await tx.inventoryItem.update({
                where: { id: backpackEntry.id },
                data: { quantity: { increment: leftHand.quantity } },
              });
              await tx.inventoryItem.delete({ where: { id: leftHand.id } });
            } else {
              await tx.inventoryItem.update({
                where: { id: leftHand.id },
                data: { isEquiped: false, slot: null },
              });
            }
          }
        }

        if (dto.slot === 'potion') {
          if (source.isEquiped) return { success: true };

          if (target?.itemId === source.itemId) {
            const transferQuantity = Math.min(5 - target.quantity, source.quantity);
            if (transferQuantity <= 0) throw new BadRequestException('Health potion slot is full');
            await tx.inventoryItem.update({
              where: { id: target.id },
              data: { quantity: { increment: transferQuantity } },
            });
            if (source.quantity === transferQuantity) {
              await tx.inventoryItem.delete({ where: { id: source.id } });
            } else {
              await tx.inventoryItem.update({
                where: { id: source.id },
                data: { quantity: { decrement: transferQuantity } },
              });
            }
            return { success: true };
          }

          if (target) {
            const backpackEntry = await tx.inventoryItem.findFirst({
              where: { gameProfileId: profile.id, itemId: target.itemId, isEquiped: false },
              select: { id: true },
            });
            if (backpackEntry) {
              await tx.inventoryItem.update({
                where: { id: backpackEntry.id },
                data: { quantity: { increment: target.quantity } },
              });
              await tx.inventoryItem.delete({ where: { id: target.id } });
            } else {
              await tx.inventoryItem.update({ where: { id: target.id }, data: { isEquiped: false, slot: null } });
            }
          }

          const equipQuantity = Math.min(5, source.quantity);
          if (source.quantity > equipQuantity) {
            await tx.inventoryItem.update({
              where: { id: source.id },
              data: { quantity: { decrement: equipQuantity } },
            });
            await tx.inventoryItem.create({
              data: {
                gameProfileId: profile.id,
                itemId: source.itemId,
                quantity: equipQuantity,
                isEquiped: true,
                slot: dto.slot,
              },
            });
          } else {
            await tx.inventoryItem.update({
              where: { id: source.id },
              data: { quantity: equipQuantity, isEquiped: true, slot: dto.slot },
            });
          }
          return { success: true };
        }

        if (source.isEquiped) {
          if (!source.slot) throw new BadRequestException('Equipped item has no slot');
          if (source.slot === dto.slot) return { success: true };
          if (
            target &&
            !target.item.equipmentType.some((type) => SLOT_TYPES[source.slot as EquipmentSlotId].includes(type))
          ) {
            throw new BadRequestException('Equipped items cannot be swapped between these slots');
          }
          await tx.inventoryItem.update({ where: { id: source.id }, data: { slot: `__moving-${source.id}` } });
          if (target) {
            await tx.inventoryItem.update({ where: { id: target.id }, data: { slot: source.slot } });
          }
          await tx.inventoryItem.update({ where: { id: source.id }, data: { slot: dto.slot } });
          return { success: true };
        }

        if (target) {
          const backpackEntry = await tx.inventoryItem.findFirst({
            where: { gameProfileId: profile.id, itemId: target.itemId, isEquiped: false },
            select: { id: true },
          });
          if (backpackEntry) {
            await tx.inventoryItem.update({
              where: { id: backpackEntry.id },
              data: { quantity: { increment: target.quantity } },
            });
            await tx.inventoryItem.delete({ where: { id: target.id } });
          } else {
            await tx.inventoryItem.update({
              where: { id: target.id },
              data: { isEquiped: false, slot: null },
            });
          }
        }

        if (source.quantity > 1) {
          await tx.inventoryItem.update({ where: { id: source.id }, data: { quantity: { decrement: 1 } } });
          await tx.inventoryItem.create({
            data: { gameProfileId: profile.id, itemId: source.itemId, quantity: 1, isEquiped: true, slot: dto.slot },
          });
        } else {
          await tx.inventoryItem.update({
            where: { id: source.id },
            data: { quantity: 1, isEquiped: true, slot: dto.slot },
          });
        }

        return { success: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  consumeInventoryItem(userId: number, inventoryItemId: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!profile) throw new NotFoundException('Game profile not found');

        const inventoryEntry = await tx.inventoryItem.findFirst({
          where: { id: inventoryItemId, gameProfileId: profile.id, isEquiped: false },
          include: { item: true },
        });
        if (!inventoryEntry) throw new NotFoundException('Inventory item not found');

        const effect = getPotionEffect(inventoryEntry.item.name);
        if (!inventoryEntry.item.isConsumable || !effect) {
          throw new BadRequestException('Item cannot be consumed');
        }
        if (effect.kind === 'HEALTH') {
          throw new BadRequestException('Health potions must be equipped');
        }

        if (inventoryEntry.quantity > 1) {
          await tx.inventoryItem.update({
            where: { id: inventoryEntry.id },
            data: { quantity: { decrement: 1 } },
          });
        } else {
          await tx.inventoryItem.delete({ where: { id: inventoryEntry.id } });
        }

        if (effect.kind === 'FREE_ATTRIBUTE') {
          await tx.gameProfile.update({
            where: { id: profile.id },
            data: { freeAttributes: { increment: effect.value } },
          });
          return { success: true, effect: 'FREE_ATTRIBUTE', value: effect.value };
        }

        const expiresAt = new Date(Date.now() + POTION_BUFF_DURATION_MS);
        const buff = await tx.gameProfileBuff.upsert({
          where: { gameProfileId_type: { gameProfileId: profile.id, type: effect.type } },
          create: { gameProfileId: profile.id, type: effect.type, value: effect.value, expiresAt },
          update: { value: effect.value, expiresAt },
        });
        return { success: true, effect: buff.type, value: buff.value, expiresAt: buff.expiresAt };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async updateMapPosition(userId: number, position: UpdateMapPositionDto) {
    const result = await this.prisma.gameProfile.updateMany({
      where: { userId },
      data: { mapPositionX: position.x, mapPositionY: position.y },
    });
    if (result.count === 0) throw new NotFoundException('Game profile not found');
    return { x: position.x, y: position.y };
  }

  unequipItem(userId: number, slot: EquipmentSlotId) {
    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!profile) throw new NotFoundException('Game profile not found');
        const equipped = await tx.inventoryItem.findFirst({
          where: { gameProfileId: profile.id, isEquiped: true, slot },
        });
        if (!equipped) throw new NotFoundException('Equipped item not found');
        const backpackEntry = await tx.inventoryItem.findFirst({
          where: { gameProfileId: profile.id, itemId: equipped.itemId, isEquiped: false },
          select: { id: true },
        });
        if (backpackEntry) {
          await tx.inventoryItem.update({
            where: { id: backpackEntry.id },
            data: { quantity: { increment: equipped.quantity } },
          });
          await tx.inventoryItem.delete({ where: { id: equipped.id } });
        } else {
          const backpackCount = await tx.inventoryItem.count({
            where: { gameProfileId: profile.id, isEquiped: false },
          });
          if (backpackCount >= 24) throw new BadRequestException('Inventory is full (maximum 24 slots)');
          await tx.inventoryItem.update({
            where: { id: equipped.id },
            data: { isEquiped: false, slot: null },
          });
        }
        return { success: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async dropInventoryItem(userId: number, inventoryItemId: number) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const entry = await tx.inventoryItem.findFirst({
        where: { id: inventoryItemId, gameProfileId: profile.id, isEquiped: false },
      });
      if (!entry) throw new NotFoundException('Inventory item not found');
      await tx.inventoryItem.delete({ where: { id: entry.id } });
      return { success: true };
    });
  }

  async replaceInventoryItem(userId: number, dto: ReplaceInventoryItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const toReplace = await tx.inventoryItem.findFirst({
        where: { id: dto.replaceInventoryItemId, gameProfileId: profile.id, isEquiped: false },
      });
      if (!toReplace) throw new NotFoundException('Item to replace not found in inventory');
      const newItem = await tx.item.findUnique({ where: { id: dto.newItemId } });
      if (!newItem) throw new NotFoundException('New item not found');

      await tx.inventoryItem.delete({ where: { id: toReplace.id } });
      const created = await tx.inventoryItem.create({
        data: {
          gameProfileId: profile.id,
          itemId: newItem.id,
          quantity: 1,
          slot: null,
          isEquiped: false,
        },
      });
      return { success: true, inventoryItemId: created.id };
    });
  }

  update(id: number, data: Partial<Omit<UserModel, 'id'>>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async getLeaderboard(limit = 50) {
    const profiles = await this.prisma.gameProfile.findMany({
      take: limit,
      orderBy: [{ level: 'desc' }, { killedMonsters: 'desc' }, { experience: 'desc' }],
      include: {
        user: { select: { name: true } },
        _count: { select: { quests: { where: { completedAt: { not: null } } } } },
      },
    });

    return profiles.map((profile, index) => ({
      rank: index + 1,
      name: profile.user.name,
      level: profile.level,
      killedMonsters: profile.killedMonsters,
      questsCompleted: profile._count.quests,
    }));
  }
}
