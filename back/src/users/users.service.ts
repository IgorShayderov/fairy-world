import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EquipmentType, Prisma } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { UserModel, UserWhereInput } from '../../generated/models';
import type { EquipItemDto, EquipmentSlotId } from './dto/equip-item.dto';

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
          },
        },
      },
    });
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

        const target = await tx.inventoryItem.findFirst({
          where: { gameProfileId: profile.id, isEquiped: true, slot: dto.slot },
          include: { item: true },
        });

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
