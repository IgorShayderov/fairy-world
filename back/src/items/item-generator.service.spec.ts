import { EquipmentType, ItemRarity, StatType } from '../../generated/client';
import { PrismaService } from '../prisma.service';
import { ItemGeneratorService } from './item-generator.service';
import { BASE_ITEMS } from './item-generator.config';

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

  it('does not reuse Common gear for a Magic-or-better quest reward', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const options = {
      level: 1,
      equipmentType: EquipmentType.WEAPON,
      rarity: ItemRarity.MAGIC,
      minimumRarity: ItemRarity.MAGIC,
    };
    await service.generate(options);
    const args = create.mock.calls[0][0] as GeneratedItemCreateArgs;
    findMany.mockResolvedValue([
      {
        id: 42,
        name: 'Old sword',
        equipmentType: ['WEAPON'],
        isConsumable: false,
        rarity: ItemRarity.COMMON,
        stats: args.data.stats.create.map((entry) => ({ value: entry.value, stat: { name: entry.stat.connect.name } })),
        attributes: args.data.attributes.create.map((entry) => ({
          value: entry.value,
          attribute: { name: entry.attribute.connect.name },
        })),
      },
    ]);
    create.mockClear();
    await service.generate(options);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it.each([ItemRarity.MAGIC, ItemRarity.RARE, ItemRarity.UNIQUE])(
    'guarantees an attribute bonus for %s items',
    async (rarity) => {
      for (const equipmentType of [
        EquipmentType.WEAPON,
        EquipmentType.SHIELD,
        EquipmentType.RING,
        EquipmentType.AMULET,
      ]) {
        await service.generate({ level: 1, equipmentType, rarity });
        const args = create.mock.calls.at(-1)?.[0] as GeneratedItemCreateArgs;
        expect(args.data.attributes.create.length).toBeGreaterThan(0);
        expect(args.data.attributes.create.every(({ value }) => value > 0)).toBe(true);
      }
    },
  );

  it('reuses identical bonuses despite different presentation and level', async () => {
    const existing = {
      id: 42,
      name: 'Old ring',
      equipmentType: ['RING'],
      isConsumable: false,
      stats: [{ stat: { name: 'CRIT' }, value: 21 }],
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
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    await service.generate({ level: 1, equipmentType, rarity: ItemRarity.COMMON });
    random.mockRestore();

    const args = create.mock.calls[0]?.[0] as GeneratedItemCreateArgs;
    expect(args.data.stats.create).toEqual([{ stat: { connect: { name: stat } }, value }]);
  });

  it('scales the inherent ring property with item level', async () => {
    await service.generate({ level: 100, equipmentType: EquipmentType.RING, rarity: ItemRarity.COMMON });

    const args = create.mock.calls[0]?.[0] as GeneratedItemCreateArgs;
    expect(args.data.stats.create).toEqual([{ stat: { connect: { name: StatType.CRIT } }, value: 21 }]);
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

  it('scales stat modifiers more aggressively than attributes at higher levels', async () => {
    const random = jest.spyOn(Math, 'random');
    random.mockReturnValue(0.999);
    await service.generate({ level: 1, equipmentType: EquipmentType.WEAPON, rarity: ItemRarity.MAGIC });
    const lvl1Args = create.mock.calls[0]?.[0] as GeneratedItemCreateArgs;

    findMany.mockResolvedValue([]);
    await service.generate({ level: 20, equipmentType: EquipmentType.WEAPON, rarity: ItemRarity.MAGIC });
    const lvl20Args = create.mock.calls[1]?.[0] as GeneratedItemCreateArgs;
    random.mockRestore();

    const lvl1StatTotal = lvl1Args.data.stats.create.reduce((sum, s) => sum + s.value, 0);
    const lvl20StatTotal = lvl20Args.data.stats.create.reduce((sum, s) => sum + s.value, 0);
    expect(lvl20StatTotal).toBeGreaterThan(lvl1StatTotal * 2);
  });

  it('makes a level-twenty common weapon stronger in its base stat than a level-four unique weapon', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    await service.generate({ level: 4, equipmentType: EquipmentType.WEAPON, rarity: ItemRarity.UNIQUE });
    const low = create.mock.calls[0]?.[0] as GeneratedItemCreateArgs;
    findMany.mockResolvedValue([]);
    await service.generate({ level: 20, equipmentType: EquipmentType.WEAPON, rarity: ItemRarity.COMMON });
    const high = create.mock.calls[1]?.[0] as GeneratedItemCreateArgs;
    const total = (args: GeneratedItemCreateArgs) =>
      args.data.stats.create.reduce((sum, entry) => sum + entry.value, 0);
    expect(total(high)).toBeGreaterThan(total(low));
  });

  it('generates a two-handed sword with higher base damage than a regular sword', () => {
    const sword = BASE_ITEMS.find((item) => item.name === 'Sword')!;
    const twoHanded = BASE_ITEMS.find((item) => item.name === 'Two-handed Sword')!;
    expect(twoHanded.baseStats![StatType.DAMAGE]!).toBeGreaterThan(sword.baseStats![StatType.DAMAGE]! * 2);
  });
});
