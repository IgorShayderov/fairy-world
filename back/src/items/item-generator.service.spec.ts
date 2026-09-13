import { EquipmentType, ItemRarity, StatType } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ItemGeneratorService } from './item-generator.service';

interface GeneratedItemCreateArgs {
  data: {
    icon: string;
    stats: {
      create: Array<{ stat: { connect: { name: StatType } }; value: number }>;
    };
    attributes: {
      create: Array<{ attribute: { connect: { name: string } }; value: number }>;
    };
  };
}

describe('ItemGeneratorService', () => {
  const create = jest.fn<Promise<{ id: number }>, [unknown]>();
  const findMany = jest.fn();
  const tx = { item: { create, findMany }, $executeRaw: jest.fn() };
  const service = new ItemGeneratorService({
    $transaction: (operation: (client: typeof tx) => unknown) => operation(tx),
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    create.mockResolvedValue({ id: 1 });
    findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('reuses identical bonuses despite different presentation and level', async () => {
    const existing = {
      id: 42,
      name: 'Old ring',
      equipmentType: ['RING'],
      isConsumable: false,
      stats: [{ stat: { name: 'CRIT' }, value: 9 }],
      attributes: [],
    };
    findMany.mockResolvedValue([existing]);
    await expect(
      service.generate({ level: 100, equipmentType: EquipmentType.RING, rarity: ItemRarity.COMMON }),
    ).resolves.toBe(existing);
    expect(create).not.toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it.each([
    [EquipmentType.WEAPON, StatType.DAMAGE, 3],
    [EquipmentType.SHIELD, StatType.DEFENSE, 3],
    [EquipmentType.BODY, StatType.DEFENSE, 5],
    [EquipmentType.HELMET, StatType.DEFENSE, 2],
    [EquipmentType.BOOTS, StatType.DODGE, 1],
    [EquipmentType.GLOVES, StatType.DEFENSE, 2],
    [EquipmentType.LEGS, StatType.DEFENSE, 4],
    [EquipmentType.RING, StatType.CRIT, 1],
    [EquipmentType.AMULET, StatType.MANA, 3],
  ])('gives a level-one common %s an inherent %s property', async (equipmentType, stat, value) => {
    await service.generate({ level: 1, equipmentType, rarity: ItemRarity.COMMON });

    const args = create.mock.calls[0]?.[0] as GeneratedItemCreateArgs;
    expect(args.data.stats.create).toEqual([{ stat: { connect: { name: stat } }, value }]);
  });

  it('scales the inherent ring property with item level', async () => {
    await service.generate({ level: 100, equipmentType: EquipmentType.RING, rarity: ItemRarity.COMMON });

    const args = create.mock.calls[0]?.[0] as GeneratedItemCreateArgs;
    expect(args.data.stats.create).toEqual([{ stat: { connect: { name: StatType.CRIT } }, value: 9 }]);
  });

  it('keeps the original icon and can select the new variant', async () => {
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValue(0);
    await service.generate({ level: 1, equipmentType: EquipmentType.WEAPON, rarity: ItemRarity.COMMON });
    expect((create.mock.calls[0]?.[0] as GeneratedItemCreateArgs).data.icon).toBe('icon_sword.png');

    random.mockReturnValue(0.999);
    await service.generate({ level: 1, equipmentType: EquipmentType.WEAPON, rarity: ItemRarity.COMMON });
    expect((create.mock.calls[1]?.[0] as GeneratedItemCreateArgs).data.icon).toBe('icon_sword_2.png');
    random.mockRestore();
  });

  it('generates modifiers for unique equipment', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    await service.generate({ level: 10, equipmentType: EquipmentType.WEAPON, rarity: ItemRarity.UNIQUE });

    const args = create.mock.calls[0]?.[0] as GeneratedItemCreateArgs;
    expect(args.data.stats.create.length + args.data.attributes.create.length).toBeGreaterThan(1);
  });
});
