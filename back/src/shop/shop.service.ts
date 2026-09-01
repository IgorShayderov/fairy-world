import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BuyDto } from './dto/buy.dto';

@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  getItems() {
    return this.prisma.item.findMany({
      orderBy: { id: 'asc' },
      include: {
        attributes: true,
        stats: true,
      },
    });
  }

  async buy(userId: number, dto: BuyDto) {
    if (dto.quantity <= 0) throw new BadRequestException('Quantity must be greater than 0');

    const profile = await this.prisma.gameProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Game profile not found');

    const item = await this.prisma.item.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const totalCost = item.price * dto.quantity;
    if (profile.gold < totalCost) throw new BadRequestException('Not enough gold');

    await this.prisma.$transaction([
      this.prisma.gameProfile.update({
        where: { id: profile.id },
        data: { gold: { decrement: totalCost } },
      }),
      this.prisma.inventoryItem.upsert({
        where: {
          gameProfileId_itemId: {
            gameProfileId: profile.id,
            itemId: item.id,
          },
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        create: {
          gameProfileId: profile.id,
          itemId: item.id,
          quantity: dto.quantity,
          slot: 0,
          isEquiped: false,
        },
      }),
    ]);

    await this.prisma.$transaction([
      // Списываем золото у профиля
      this.prisma.gameProfile.update({
        where: { id: profile.id },
        data: { gold: { decrement: totalCost } },
      }),
      // Добавляем предмет в инвентарь профиля
      this.prisma.inventoryItem.upsert({
        where: {
          // Prisma автоматически генерирует этот составной ключ из @@unique([gameProfileId, itemId])
          gameProfileId_itemId: {
            gameProfileId: profile.id,
            itemId: item.id,
          },
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        create: {
          gameProfileId: profile.id,
          itemId: item.id,
          quantity: dto.quantity,
          // FIXME: Для слота лучше сделать отдельный запрос перед транзакцией,
          // чтобы найти максимальный slot у текущего профиля и прибавить 1.
          slot: 0,
          isEquiped: false,
        },
      }),
    ]);

    return { success: true, item: item.name, quantity: dto.quantity, totalCost };
  }

  async sell(userId: number, dto: { name: string; quantity: number }) {
    if (dto.quantity <= 0) throw new BadRequestException('Quantity must be greater than 0');

    // 1. Ищем профиль и предмет в инвентаре прямым запросом в БД
    const targetInvItem = await this.prisma.inventoryItem.findFirst({
      where: {
        gameProfile: { userId }, // Фильтруем по владельцу
        item: { name: dto.name }, // Ищем предмет по имени
      },
      include: { item: true },
    });

    if (!targetInvItem) throw new NotFoundException('Item not found in inventory');
    if (targetInvItem.quantity < dto.quantity) throw new BadRequestException('Not enough items in inventory');

    // Рассчитываем стоимость продажи (50% от цены покупки).
    // Если предмет стоит 1 монету, Math.max не даст продать его за 0.
    const sellValue = Math.max(1, Math.floor(targetInvItem.item.price * 0.5 * dto.quantity));

    // 2. Формируем массив транзакций
    const transactions: any[] = [
      this.prisma.gameProfile.update({
        where: { id: targetInvItem.gameProfileId },
        data: { gold: { increment: sellValue } },
      }),
    ];

    // Если продаем всё — удаляем слот из инвентаря. Иначе — просто уменьшаем количество.
    if (targetInvItem.quantity === dto.quantity) {
      transactions.push(
        this.prisma.inventoryItem.delete({
          where: { id: targetInvItem.id },
        }),
      );
    } else {
      transactions.push(
        this.prisma.inventoryItem.update({
          where: { id: targetInvItem.id },
          data: { quantity: { decrement: dto.quantity } },
        }),
      );
    }

    await this.prisma.$transaction(transactions);

    return { success: true, item: dto.name, quantity: dto.quantity, earnedGold: sellValue };
  }

  getInventory(userId: number) {
    return this.prisma.inventoryItem.findMany({
      where: { userId },
      include: { item: true },
    });
  }
}
