import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CraftItemKind, CraftUpgradeType, EquipmentType, ItemRarity, Prisma } from '../../generated/client';
import { ItemView } from '../common/views/item.view';
import { CRAFTING_MIN_LEVEL, CRAFT_ITEMS, upgradeValueForLevel } from '../crafting/crafting.catalog';
import { PrismaService } from '../prisma.service';

const POTION_FAMILIES = ['Health Potion', 'Attack Potion', 'Defense Potion', 'Experience Potion', 'Attribute Potion'];
const UPGRADE_NAMES = CRAFT_ITEMS.filter((item) => item.kind === CraftItemKind.UPGRADE).map((item) => item.name);

type RenderedItem = ReturnType<typeof ItemView.render>;
type PvpShopOfferKind = 'POTION' | 'UPGRADE';

export type PvpShopOffer = {
  id: string;
  kind: PvpShopOfferKind;
  cost: number;
  upgradeType: CraftUpgradeType | null;
  upgradeValue: number | null;
  item: RenderedItem;
};

export const pvpPotionCost = (rarity: ItemRarity): number => {
  if (rarity === ItemRarity.UNIQUE) return 10;
  if (rarity === ItemRarity.RARE) return 6;
  if (rarity === ItemRarity.MAGIC) return 5;
  return 2;
};

export const PVP_UPGRADE_COST = 10;

@Injectable()
export class PvpShopService {
  constructor(private readonly prisma: PrismaService) {}

  async getShop(userId: number) {
    const profile = await this.prisma.gameProfile.findUnique({
      where: { userId },
      select: { id: true, level: true, coinsOfHonour: true },
    });
    if (!profile) throw new NotFoundException('Game profile not found');

    return {
      coinsOfHonour: profile.coinsOfHonour,
      offers: await this.buildOffers(profile.level, this.prisma),
    };
  }

  async buy(userId: number, offerId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.gameProfile.findUnique({
          where: { userId },
          select: { id: true, level: true, coinsOfHonour: true },
        });
        if (!profile) throw new NotFoundException('Game profile not found');

        const offers = await this.buildOffers(profile.level, tx);
        const offer = offers.find((entry) => entry.id === offerId);
        if (!offer) throw new NotFoundException('PvP shop offer not found');

        const existing = await tx.inventoryItem.findFirst({
          where: {
            gameProfileId: profile.id,
            itemId: offer.item.id,
            isEquiped: false,
            upgradeType: offer.upgradeType,
            upgradeValue: offer.upgradeValue,
          },
          select: { id: true },
        });
        if (!existing) {
          const backpackCount = await tx.inventoryItem.count({
            where: { gameProfileId: profile.id, isEquiped: false },
          });
          if (backpackCount >= 24) throw new BadRequestException('Inventory is full (maximum 24 slots)');
        }

        const spent = await tx.gameProfile.updateMany({
          where: { id: profile.id, coinsOfHonour: { gte: offer.cost } },
          data: { coinsOfHonour: { decrement: offer.cost } },
        });
        if (spent.count !== 1) throw new BadRequestException('Not enough Coins of Honour');

        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              gameProfileId: profile.id,
              itemId: offer.item.id,
              quantity: 1,
              slot: null,
              isEquiped: false,
              upgradeType: offer.upgradeType,
              upgradeValue: offer.upgradeValue,
            },
          });
        }

        return {
          success: true,
          itemId: offer.item.id,
          cost: offer.cost,
          coinsOfHonour: profile.coinsOfHonour - offer.cost,
          offers,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async buildOffers(
    playerLevel: number,
    client: PrismaService | Prisma.TransactionClient,
  ): Promise<PvpShopOffer[]> {
    const items = await client.item.findMany({
      where: {
        OR: [
          {
            isConsumable: true,
            equipmentType: { has: EquipmentType.POTION },
            level: { lte: playerLevel },
          },
          ...(playerLevel >= CRAFTING_MIN_LEVEL ? [{ name: { in: [...UPGRADE_NAMES] } }] : []),
        ],
      },
      include: {
        attributes: { include: { attribute: true } },
        stats: { include: { stat: true } },
      },
      orderBy: [{ level: 'desc' }, { id: 'asc' }],
    });

    const potionOffers = POTION_FAMILIES.map((family) => items.find((item) => item.name.includes(family)))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map<PvpShopOffer>((item) => ({
        id: `potion:${item.id}`,
        kind: 'POTION',
        cost: pvpPotionCost(item.rarity),
        upgradeType: null,
        upgradeValue: null,
        item: ItemView.render(item),
      }));

    if (playerLevel < CRAFTING_MIN_LEVEL) return potionOffers;

    const upgradeOffers = CRAFT_ITEMS.filter(
      (definition): definition is (typeof CRAFT_ITEMS)[number] & { upgradeType: CraftUpgradeType } =>
        definition.kind === CraftItemKind.UPGRADE && definition.upgradeType !== null,
    ).flatMap<PvpShopOffer>((definition) => {
      const item = items.find((candidate) => candidate.name === definition.name);
      if (!item) return [];
      return [
        {
          id: `upgrade:${item.id}`,
          kind: 'UPGRADE',
          cost: PVP_UPGRADE_COST,
          upgradeType: definition.upgradeType,
          upgradeValue: upgradeValueForLevel(definition.upgradeType, playerLevel),
          item: ItemView.render(item),
        },
      ];
    });

    return [...potionOffers, ...upgradeOffers];
  }
}
