import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BuyDto } from './dto/buy.dto';
import { EquipDto } from './dto/equip.dto';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  getItems() {
    return this.prisma.item.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async buy(userId: number, dto: BuyDto) {
    const item = await this.prisma.item.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new Error('Item not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const totalCost = item.price * dto.quantity;
    if (user.gold < totalCost) throw new Error('Not enough gold');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { gold: { decrement: totalCost } },
      }),
      this.prisma.inventoryItem.upsert({
        where: {
          userId_itemId: { userId, itemId: item.id },
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        create: {
          userId,
          itemId: item.id,
          quantity: dto.quantity,
        },
      }),
    ]);

    return { success: true, item: item.name, quantity: dto.quantity, totalCost };
  }

  async sell(userId: number, dto: { name: string; quantity: number }) {
    const userItems = await this.prisma.inventoryItem.findMany({
      where: { userId },
      include: { item: true },
    });

    const targetItem = userItems.find((i) => i.item.name === dto.name);
    if (!targetItem) throw new Error('Item not in inventory');
    if (targetItem.quantity < dto.quantity) throw new Error('Not enough items');

    const sellValue = Math.floor(targetItem.item.price * 0.5 * dto.quantity);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { gold: { increment: sellValue } },
      }),
      this.prisma.inventoryItem.update({
        where: { id: targetItem.id },
        data: {
          quantity: { decrement: dto.quantity },
        },
      }),
    ]);

    return { success: true, item: dto.name, quantity: dto.quantity, sellValue };
  }

  getInventory(userId: number) {
    return this.prisma.inventoryItem.findMany({
      where: { userId },
      include: { item: true },
    });
  }

  async equip(userId: number, dto: EquipDto) {
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: { id: dto.inventoryItemId },
    });

    if (!inventoryItem || inventoryItem.userId !== userId) {
      throw new Error('Item not found in inventory');
    }
    if (inventoryItem.quantity <= 0) {
      throw new Error('No items of this type to equip');
    }

    return this.prisma.inventoryItem.update({
      where: { id: dto.inventoryItemId },
      data: { equipped: dto.equipped },
    });
  }
}
