import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentType, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { UserModel, UserWhereInput } from '../../generated/models';
import type { EquipItemDto, EquipmentSlotId } from './dto/equip-item.dto';
import type { AllocateAttributeDto } from './dto/allocate-attribute.dto';
import type { UpdateMapPositionDto } from './dto/update-map-position.dto';
import { STARTING_ATTRIBUTE_VALUE } from './player-defaults';
import { getPotionEffect, isHealthPotion, POTION_BUFF_DURATION_MS } from '../items/potion-effects';

const SLOT_TYPES: Record<EquipmentSlotId, EquipmentType[]> = {
  head: [EquipmentType.HELMET],
  body: [EquipmentType.BODY],
  'left-hand': [EquipmentType.WEAPON, EquipmentType.SHIELD],
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
        const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!profile) throw new NotFoundException('Game profile not found');

        const source = await tx.inventoryItem.findFirst({
          where: { id: dto.inventoryItemId, gameProfileId: profile.id },
          include: { item: true },
        });
        if (!source) throw new NotFoundException('Inventory item not found');
        if (!source.item.equipmentType.some((type) => SLOT_TYPES[dto.slot].includes(type))) {
          throw new BadRequestException('Item cannot be equipped in this slot');
        }
        if (source.item.equipmentType.includes(EquipmentType.POTION) && !isHealthPotion(source.item.name)) {
          throw new BadRequestException('Only health potions can be equipped');
        }

        const target = await tx.inventoryItem.findFirst({
          where: { gameProfileId: profile.id, isEquiped: true, slot: dto.slot },
          include: { item: true },
        });

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

  update(id: number, data: Partial<Omit<UserModel, 'id'>>) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
