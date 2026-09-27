import { CraftUpgradeType, EquipmentType, ItemRarity } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { PVP_UPGRADE_COST, PvpShopService, pvpPotionCost } from './pvp-shop.service';

const item = (
  id: number,
  name: string,
  level: number,
  rarity: ItemRarity,
  equipmentType: EquipmentType[] = [EquipmentType.POTION],
) => ({
  id,
  name,
  description: `${name} description`,
  price: 100,
  icon: equipmentType.includes(EquipmentType.POTION) ? 'icon_potion.png' : 'craft_upgrade.png',
  isConsumable: equipmentType.includes(EquipmentType.POTION),
  rarity,
  equipmentType,
  level,
  createdAt: new Date(),
  updatedAt: new Date(),
  attributes: [],
  stats: [],
});

describe('PvpShopService', () => {
  const gameProfileFindUnique = jest.fn();
  const gameProfileUpdateMany = jest.fn();
  const itemFindMany = jest.fn();
  const inventoryFindFirst = jest.fn();
  const inventoryCount = jest.fn();
  const inventoryCreate = jest.fn();
  const inventoryUpdate = jest.fn();
  const transaction = jest.fn();

  const tx = {
    gameProfile: { findUnique: gameProfileFindUnique, updateMany: gameProfileUpdateMany },
    item: { findMany: itemFindMany },
    inventoryItem: {
      findFirst: inventoryFindFirst,
      count: inventoryCount,
      create: inventoryCreate,
      update: inventoryUpdate,
    },
  };
  const prisma = {
    gameProfile: { findUnique: gameProfileFindUnique },
    item: { findMany: itemFindMany },
    $transaction: transaction,
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    gameProfileFindUnique.mockResolvedValue({ id: 10, level: 20, coinsOfHonour: 30 });
    gameProfileUpdateMany.mockResolvedValue({ count: 1 });
    inventoryFindFirst.mockResolvedValue(null);
    inventoryCount.mockResolvedValue(3);
    inventoryCreate.mockResolvedValue({ id: 100 });
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    itemFindMany.mockResolvedValue([
      item(1, 'Medium Health Potion', 20, ItemRarity.MAGIC),
      item(2, 'Lesser Health Potion', 10, ItemRarity.COMMON),
      item(3, 'Medium Attack Potion', 20, ItemRarity.MAGIC),
      item(4, 'Medium Defense Potion', 20, ItemRarity.MAGIC),
      item(5, 'Medium Experience Potion', 20, ItemRarity.MAGIC),
      item(10, 'Runed Millstone', 10, ItemRarity.MAGIC, [EquipmentType.UNKNOWN]),
      item(11, 'Warding Plate', 10, ItemRarity.MAGIC, [EquipmentType.UNKNOWN]),
      item(12, 'Gilded Sigil', 10, ItemRarity.MAGIC, [EquipmentType.UNKNOWN]),
      item(13, "Scholar's Rune", 10, ItemRarity.MAGIC, [EquipmentType.UNKNOWN]),
      item(14, 'Vitality Crystal', 10, ItemRarity.MAGIC, [EquipmentType.UNKNOWN]),
    ]);
  });

  it('offers potions and crafted upgrades, but no equipment', async () => {
    const service = new PvpShopService(prisma);

    const shop = await service.getShop(1);

    expect(shop.offers).toHaveLength(9);
    expect(shop.offers.filter((offer) => offer.kind === 'POTION')).toHaveLength(4);
    expect(shop.offers.filter((offer) => offer.kind === 'UPGRADE')).toHaveLength(5);
    expect(shop.offers.some((offer) => offer.item.name === 'Lesser Health Potion')).toBe(false);
    expect(
      shop.offers.every((offer) => offer.item.equipmentType.includes(EquipmentType.POTION) || offer.kind === 'UPGRADE'),
    ).toBe(true);
  });

  it('adds a purchased crafted upgrade to the backpack with its scaled effect', async () => {
    const service = new PvpShopService(prisma);

    const result = await service.buy(1, 'upgrade:10');

    expect(gameProfileUpdateMany).toHaveBeenCalledWith({
      where: { id: 10, coinsOfHonour: { gte: PVP_UPGRADE_COST } },
      data: { coinsOfHonour: { decrement: PVP_UPGRADE_COST } },
    });
    expect(inventoryCreate).toHaveBeenCalledWith({
      data: {
        gameProfileId: 10,
        itemId: 10,
        quantity: 1,
        slot: null,
        isEquiped: false,
        upgradeType: CraftUpgradeType.DAMAGE,
        upgradeValue: 6,
      },
    });
    expect(result.coinsOfHonour).toBe(30 - PVP_UPGRADE_COST);
  });

  it('adds potions without an upgrade effect', async () => {
    const service = new PvpShopService(prisma);

    await service.buy(1, 'potion:1');

    expect(inventoryCreate).toHaveBeenCalledWith({
      data: {
        gameProfileId: 10,
        itemId: 1,
        quantity: 1,
        slot: null,
        isEquiped: false,
        upgradeType: null,
        upgradeValue: null,
      },
    });
  });

  it('rejects tampered item IDs that are not in the level-appropriate catalog', async () => {
    const service = new PvpShopService(prisma);

    await expect(service.buy(1, 'potion:999')).rejects.toThrow('PvP shop offer not found');
    expect(gameProfileUpdateMany).not.toHaveBeenCalled();
  });

  it('uses rarity prices for potions and level-scaled prices for upgrades', () => {
    expect(pvpPotionCost(ItemRarity.COMMON)).toBe(2);
    expect(pvpPotionCost(ItemRarity.MAGIC)).toBe(5);
    expect(pvpPotionCost(ItemRarity.RARE)).toBe(6);
    expect(pvpPotionCost(ItemRarity.UNIQUE)).toBe(10);
    expect(PVP_UPGRADE_COST).toBe(10);
  });
});
