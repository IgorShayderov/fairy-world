import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import type { PrismaService } from '../prisma.service';
import { getPotionEffect, getPotionRequiredLevel } from './potion-effects';
import { premiumActive } from '../premium/premium.service';

export const POTION_SLOTS = Array.from({ length: 8 }, (_, index) => `potion-${index + 1}`);
export const isPotionSlot = (slot: string | null | undefined) => !!slot && POTION_SLOTS.includes(slot);

export async function ensurePotionSlotAccess(tx: Prisma.TransactionClient, gameProfileId: number, slot: string | null) {
  if (!slot || !POTION_SLOTS.slice(5).includes(slot)) return;
  const premium = await tx.premiumAccount.findUnique({ where: { gameProfileId } });
  if (!premiumActive(premium)) throw new ForbiddenException('Potion slots 6–8 require active premium');
}

/** Each belt slot owns a separate inventory row with quantity exactly one. No implicit refill. */
export async function assignPotionSlot(
  prisma: PrismaService,
  userId: number,
  index: number,
  inventoryItemId?: number | null,
) {
  if (!Number.isInteger(index) || index < 1 || index > 8) throw new BadRequestException('Choose potion slot 1–8');
  if (inventoryItemId != null && (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0))
    throw new BadRequestException('Invalid potion');
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const profile = await tx.gameProfile.findUnique({ where: { userId }, select: { id: true, level: true } });
      if (!profile) throw new NotFoundException('Game profile not found');
      const slot = POTION_SLOTS[index - 1];
      // Expired subscribers may still return their reserved potions to the backpack.
      if (inventoryItemId != null) await ensurePotionSlotAccess(tx, profile.id, slot);
      const existing = await tx.inventoryItem.findFirst({ where: { gameProfileId: profile.id, slot } });
      if (existing?.id === inventoryItemId) return { success: true };
      const source =
        inventoryItemId == null
          ? null
          : await tx.inventoryItem.findFirst({
              where: { id: inventoryItemId, gameProfileId: profile.id, isEquiped: false, slot: null },
              include: { item: true },
            });
      if (inventoryItemId != null) {
        if (!source || source.quantity < 1) throw new NotFoundException('Potion not found in backpack');
        if (!source.item.isConsumable || getPotionEffect(source.item.name)?.kind !== 'HEALTH')
          throw new BadRequestException('Only health potions can be placed in quick slots');
        if (profile.level < getPotionRequiredLevel(source.item.name))
          throw new BadRequestException('Your level is too low for this potion');
      }
      if (existing && source?.itemId === existing.itemId) return { success: true };
      if (existing) {
        const stack = await tx.inventoryItem.findFirst({
          where: { gameProfileId: profile.id, itemId: existing.itemId, isEquiped: false, slot: null },
        });
        if (stack) {
          await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { increment: 1 } } });
          await tx.inventoryItem.delete({ where: { id: existing.id } });
        } else {
          const count = await tx.inventoryItem.count({
            where: { gameProfileId: profile.id, isEquiped: false, slot: null },
          });
          if (count >= 25) throw new BadRequestException('Make space in your backpack before clearing this slot');
          await tx.inventoryItem.update({ where: { id: existing.id }, data: { slot: null } });
        }
      }
      if (source) {
        if (source.quantity > 1) {
          await tx.inventoryItem.update({ where: { id: source.id }, data: { quantity: { decrement: 1 } } });
          await tx.inventoryItem.create({
            data: { gameProfileId: profile.id, itemId: source.itemId, quantity: 1, isEquiped: false, slot },
          });
        } else await tx.inventoryItem.update({ where: { id: source.id }, data: { slot, quantity: 1 } });
      }
      return { success: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
