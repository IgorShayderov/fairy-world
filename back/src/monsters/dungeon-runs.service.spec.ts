import { ItemRarity, StatType } from '../../generated/client';
import { requiredPlayerLevel } from '../users/level-progression';
import { DUNGEON_ROSTERS, DungeonRunsService, type DungeonRunState } from './dungeon-runs.service';

describe('DungeonRunsService', () => {
  let storedRun: { id: string; state: DungeonRunState } | null;
  let service: DungeonRunsService;
  // Reward/skill tests start in melee range; dedicated tactical tests cover travelling between waves.
  const inMelee = (opponentId: string) => {
    if (!storedRun?.state.tactical) throw new Error('Missing tactical run');
    storedRun.state.tactical.opponentId = opponentId;
    storedRun.state.tactical.playerPosition = 40;
    storedRun.state.tactical.monsterPosition = 41;
  };

  const prisma = {
    gemActionPrice: { findUnique: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
    dungeonRun: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    dungeonParty: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    dungeonPartyMember: { findUnique: jest.fn(), findFirst: jest.fn() },
    dungeonVisit: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    gameProfile: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    gameProfileBuff: { deleteMany: jest.fn(), create: jest.fn() },
    inventoryItem: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    craftItem: { findUnique: jest.fn() },
    playerCraftItem: { upsert: jest.fn() },
  };
  const monsterGenerator = { generate: jest.fn() };
  const usersService = { findCurrentUser: jest.fn() };
  const itemGenerator = { generate: jest.fn() };

  const user = {
    id: 7,
    name: 'Hero',
    email: 'hero@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    gameProfile: {
      id: 5,
      level: 5,
      gold: 0,
      gems: 0,
      experience: 0,
      freeAttributes: 0,
      killedMonsters: 0,
      buffs: [],
      mapPositionX: 2470,
      mapPositionY: 1370,
      inventory: [],
      profileAttributes: [],
      profileStats: [
        { value: 500, stat: { name: StatType.HEALTH, description: null } },
        { value: 50, stat: { name: StatType.DAMAGE, description: null } },
      ],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.gemActionPrice.findUnique.mockResolvedValue(null);
    storedRun = null;
    user.gameProfile.level = 5;
    prisma.$transaction.mockImplementation((operation: (client: typeof prisma) => unknown) => operation(prisma));
    prisma.dungeonRun.findUnique.mockImplementation(() =>
      Promise.resolve(storedRun ? { id: storedRun.id, state: storedRun.state } : null),
    );
    prisma.dungeonRun.create.mockImplementation(({ data }: { data: { id: string; state: DungeonRunState } }) => {
      storedRun = { id: data.id, state: data.state };
      return Promise.resolve(storedRun);
    });
    prisma.dungeonRun.update.mockImplementation(({ data }: { data: { state: DungeonRunState } }) => {
      if (storedRun) storedRun.state = data.state;
      return Promise.resolve(storedRun);
    });
    prisma.dungeonRun.delete.mockImplementation(() => {
      storedRun = null;
      return Promise.resolve(null);
    });
    prisma.dungeonVisit.findUnique.mockResolvedValue(null);
    prisma.dungeonParty.findUnique.mockResolvedValue(null);
    prisma.dungeonPartyMember.findUnique.mockResolvedValue(null);
    prisma.dungeonPartyMember.findFirst.mockResolvedValue(null);
    prisma.gameProfile.findUnique.mockImplementation(() =>
      Promise.resolve({
        id: 5,
        userId: 7,
        level: user.gameProfile.level,
        mapPositionX: 2470,
        mapPositionY: 1370,
        dungeonRun: storedRun,
      }),
    );
    prisma.gameProfile.update.mockResolvedValue({ id: 5, level: 5, experience: 0 });
    prisma.gameProfile.findUniqueOrThrow.mockResolvedValue({ level: 5 });
    prisma.inventoryItem.count.mockResolvedValue(0);
    prisma.inventoryItem.create.mockResolvedValue({ id: 91 });
    usersService.findCurrentUser.mockResolvedValue(user);
    monsterGenerator.generate.mockImplementation((level: number) => ({
      id: level,
      monsterType: 'Guardian',
      name: 'Guardian',
      description: '',
      level,
      rewardGold: 20,
      rewardExperience: 30,
      attributes: [],
    }));
    itemGenerator.generate.mockResolvedValue({
      id: 44,
      name: 'Warden Blade',
      description: 'Rare blade',
      price: 500,
      icon: 'icon_sword.png',
      isConsumable: false,
      rarity: ItemRarity.RARE,
      equipmentType: ['WEAPON'],
      level: 9,
      createdAt: new Date(),
      updatedAt: new Date(),
      attributes: [],
      stats: [],
    });
    service = new DungeonRunsService(
      prisma as never,
      monsterGenerator as never,
      usersService as never,
      itemGenerator as never,
    );
  });

  it.each([0, 23])('charges the configured dungeon cooldown price %i', async (cost) => {
    prisma.dungeonVisit.findUnique.mockResolvedValue({ nextEntryAt: new Date('2099-01-01') });
    prisma.gemActionPrice.findUnique.mockResolvedValue({ cost });
    prisma.gameProfile.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.reset(7, 'EMBERDEEP', cost)).resolves.toEqual({ success: true, cost });
    expect(prisma.gameProfile.updateMany).toHaveBeenCalledWith({
      where: { id: 5, gems: { gte: cost } },
      data: { gems: { decrement: cost } },
    });
    expect(prisma.dungeonVisit.delete).toHaveBeenCalledTimes(1);
  });

  it('plays consecutive tactical waves, preserves resources, and counts actual damage rather than overkill', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.damage = 1_000_000;
    run.player.attackRange = 7;
    const guardian = run.opponents[0];
    await expect(service.attack(7, run.id, run.opponents[1].id)).rejects.toThrow('current wave');
    const moved = await service.attack(7, run.id, guardian.id, undefined, { action: 'MOVE', targetCell: 37 });
    expect(moved.player.health).toBe(run.player.maxHealth);
    expect(moved.exchange?.events).toHaveLength(1);
    expect(moved.tactical?.turn).toBe(1);
    await expect(service.attack(7, run.id, guardian.id, undefined, { action: 'MOVE', targetCell: 38 })).rejects.toThrow(
      'movement',
    );
    const expectedDamage = run.opponents.reduce((sum, enemy) => sum + enemy.monster.health, 0);
    let latest = moved;
    for (const enemy of run.opponents) {
      latest = await service.attack(7, run.id, enemy.id, undefined, { action: 'ATTACK' });
      expect(latest.tactical?.playerPosition).toBe(37);
      expect(latest.exchange?.opponentId).toBe(enemy.id);
      if (!enemy.isBoss) expect(latest.status).toBe('ACTIVE');
    }
    expect(latest.status).toBe('VICTORY');
    expect(latest.damageDealt?.['5']).toEqual({ name: 'Hero', damage: expectedDamage });
    expect(latest.player.health).toBe(run.player.maxHealth);
  });

  it.each([6, 7])('allows a saved ranged weapon with old range %i to attack across the dungeon', async (range) => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.attackRange = range;
    run.tactical!.playerPosition = 0;
    run.tactical!.monsterPosition = 76;
    const result = await service.attack(7, run.id, run.opponents[0].id, undefined, { action: 'ATTACK' });
    expect(result.exchange?.events.some((event) => event.actor === 'PLAYER' && event.damage !== undefined)).toBe(true);
  });

  it('restores per-archetype movement in saved runs without resetting HP or positions', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.opponents.forEach((enemy) => {
      enemy.monster.movement = 2;
    });
    run.player.health = 123;
    const positions = { ...run.tactical };
    const restored = await service.active(7);
    expect(restored?.opponents.map((enemy) => enemy.monster.movement)).toEqual([5, 1, 4, 3]);
    expect(restored?.player.health).toBe(123);
    expect(restored?.tactical).toEqual(positions);
  });

  it('upgrades a saved slow boss once, preserving its remaining health percentage', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.dungeon = 'ICEVAULT';
    const boss = run.opponents[3];
    boss.monsterType = 'Icebound Sovereign';
    boss.monster.maxHealth = 1000;
    boss.monster.health = 500;
    boss.monster.defense = 30;
    delete run.bossBalanceVersion;
    const restored = await service.active(7);
    expect(restored?.opponents[3].monster).toMatchObject({ health: 1400, maxHealth: 2800, defense: 60, movement: 2 });
    const again = await service.active(7);
    expect(again?.opponents[3].monster.maxHealth).toBe(2800);
  });

  it('upgrades saved minions and bosses once without reviving enemies or resetting progress', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.bossBalanceVersion = 1;
    run.player.health = 123;
    run.opponents[0].status = 'DEFEATED';
    run.opponents[0].monster.health = 0;
    for (const opponent of run.opponents.slice(1)) {
      Object.assign(opponent.monster, { health: 400, maxHealth: 1000, damage: 100, defense: 30 });
    }
    const tactics = { ...run.tactical };
    const result = await service.active(7);
    expect(result?.bossBalanceVersion).toBe(4);
    expect(result?.opponents[0].monster.health).toBe(0);
    expect(result?.opponents[0].status).toBe('DEFEATED');
    expect(result?.opponents[1].monster).toMatchObject({ health: 1500, maxHealth: 3750, damage: 195, defense: 60 });
    expect(result?.opponents[3].monster).toMatchObject({ health: 700, maxHealth: 1750, damage: 140, defense: 38 });
    expect(result?.player.health).toBe(123);
    expect(result?.tactical).toEqual(tactics);
    const snapshot = JSON.stringify(result?.opponents);
    expect(JSON.stringify((await service.active(7))?.opponents)).toBe(snapshot);
  });

  it('does not reapply strength when reopening a newly generated dungeon', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    expect(run.bossBalanceVersion).toBe(4);
    const snapshot = JSON.stringify(run.opponents);
    expect(JSON.stringify((await service.active(7))?.opponents)).toBe(snapshot);
  });

  it('upgrades version-three slow enemy damage once without multiplying HP again', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.bossBalanceVersion = 3;
    Object.assign(run.opponents[1].monster, { health: 1701, maxHealth: 2325, damage: 100 });
    const restored = await service.active(7);
    expect(restored?.opponents[1].monster).toMatchObject({ health: 1701, maxHealth: 2325, damage: 150, movement: 1 });
    expect((await service.active(7))?.opponents[1].monster.damage).toBe(150);
  });

  it('upgrades version-two tanks without repeating the earlier damage and boss buffs', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.bossBalanceVersion = 2;
    Object.assign(run.opponents[1].monster, { health: 70, maxHealth: 896, damage: 100, defense: 30 });
    const boss = JSON.stringify(run.opponents[3]);
    const restored = await service.active(7);
    expect(restored?.opponents[1].monster).toMatchObject({
      health: 175,
      maxHealth: 2240,
      damage: 150,
      defense: 60,
      movement: 1,
    });
    expect(JSON.stringify(restored?.opponents[3])).toBe(boss);
    const snapshot = JSON.stringify(restored?.opponents);
    expect(JSON.stringify((await service.active(7))?.opponents)).toBe(snapshot);
  });

  it('petrified dungeon enemies skip their entire turn and then recover', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.attackRange = 7;
    run.player.skillState = {
      class: 'SCOUT',
      ranks: { 'scout-volley': 1 },
      mana: 200,
      maxMana: 200,
      spellPower: 0,
      turn: 1,
      readyOnTurn: {},
      loadedRangedWeapon: true,
    };
    const enemy = run.opponents[0];
    enemy.monster.dodge = 0;
    enemy.monster.blockChance = 0;
    enemy.monster.health = 10000;
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const position = run.tactical!.monsterPosition;
    const result = await service.attack(7, run.id, enemy.id, 'scout-volley', { action: 'SKILL' });
    expect(result.tactical!.monsterPosition).toBe(position);
    expect(result.exchange?.events.some((event) => event.statusText === 'Petrified — turn skipped')).toBe(true);
    expect(result.opponents[0].monster.statuses?.petrify).toBeUndefined();
  });

  it('lets a melee player attack after the enemy approaches during defend turns', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const run = await service.enter(7, 'EMBERDEEP');
    const guardian = run.opponents[0];
    run.player.attackRange = 1;
    guardian.monster.damage = 1;
    guardian.monster.movement = 3;
    await expect(service.attack(7, run.id, guardian.id, undefined, { action: 'ATTACK' })).rejects.toThrow('range');
    for (let turn = 0; turn < 3; turn++) {
      await service.attack(7, run.id, guardian.id, undefined, { action: 'DEFEND' });
    }
    const result = await service.attack(7, run.id, guardian.id, undefined, { action: 'ATTACK' });
    expect(result.exchange?.events.some((event) => event.actor === 'PLAYER' && event.damage > 0)).toBe(true);
    expect(result.player.health).toBeLessThan(result.player.maxHealth);
  });

  it('ranged dungeon monsters attack without walking into melee', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    const enemy = run.opponents[2];
    run.opponents.slice(0, 2).forEach((entry) => {
      entry.monster.health = 0;
      entry.status = 'DEFEATED';
    });
    run.tactical!.opponentId = enemy.id;
    run.tactical!.playerPosition = 0;
    run.tactical!.monsterPosition = 76;
    const result = await service.attack(7, run.id, enemy.id, undefined, { action: 'DEFEND' });
    expect(result.tactical!.monsterPosition).toBe(76);
    expect(result.exchange?.events.filter((event) => event.actor === 'MONSTER')).toEqual([
      expect.objectContaining({ action: 'ATTACK', skillName: 'Ember Bolt', effect: 'fire', critical: false }),
    ]);
  });

  it('mage minions spend a turn on Arcane Focus, persist it, and boost exactly two undodgeable spells', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    const enemy = run.opponents[2];
    run.opponents.slice(0, 2).forEach((entry) => {
      entry.monster.health = 0;
      entry.status = 'DEFEATED';
    });
    run.tactical!.opponentId = enemy.id;
    run.tactical!.playerPosition = 0;
    run.tactical!.monsterPosition = 76;
    Object.assign(run.player, { health: 10000, maxHealth: 10000, dodge: 100, blockChance: 0 });
    enemy.monster.damage = 100;
    const turn = () => service.attack(7, run.id, enemy.id, undefined, { action: 'DEFEND' });
    const first = await turn();
    expect(first.exchange?.events.find((event) => event.actor === 'MONSTER')).toMatchObject({
      damage: 100,
      dodged: false,
    });
    const health = first.player.health;
    const buff = await turn();
    expect(buff.player.health).toBe(health);
    expect(buff.exchange?.events.filter((event) => event.actor === 'MONSTER')).toEqual([
      expect.objectContaining({ effect: 'empower', action: 'SKILL', damage: 0 }),
    ]);
    const restored = await service.active(7);
    expect(restored?.opponents[2].monster.statuses?.empower).toEqual({ hits: 2, percent: 35 });
    expect(restored?.opponents[2].monster.buffCooldown).toBe(4);
    for (let i = 0; i < 2; i++) {
      const result = await turn();
      expect(result.exchange?.events.find((event) => event.actor === 'MONSTER')).toMatchObject({
        damage: 135,
        dodged: false,
      });
    }
    const after = await turn();
    expect(after.opponents[2].monster.statuses?.empower).toBeUndefined();
    expect(after.opponents[2].monster.damage).toBe(100);
    expect(after.exchange?.events.find((event) => event.actor === 'MONSTER')).toMatchObject({ damage: 100 });
  });

  it('a distant melee boss casts after its approach turn and keeps cooldown on reload', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.dungeon = 'ICEVAULT';
    const enemy = run.opponents[3];
    enemy.status = 'AVAILABLE';
    run.opponents.slice(0, 3).forEach((entry) => {
      entry.monster.health = 0;
      entry.status = 'DEFEATED';
    });
    run.tactical!.opponentId = enemy.id;
    run.tactical!.playerPosition = 0;
    run.tactical!.monsterPosition = 76;
    const approach = await service.attack(7, run.id, enemy.id, undefined, { action: 'DEFEND' });
    expect(approach.exchange?.events.some((event) => event.actor === 'MONSTER' && event.action === 'MOVE')).toBe(true);
    expect(approach.exchange?.events.some((event) => event.action === 'SKILL')).toBe(false);
    expect(approach.opponents[3].monster.rangedSkill?.cooldown).toBe(0);
    const cast = await service.attack(7, run.id, enemy.id, undefined, { action: 'DEFEND' });
    expect(cast.exchange?.events.filter((event) => event.actor === 'MONSTER')).toEqual([
      expect.objectContaining({ action: 'SKILL', skillName: 'Glacial Shard', effect: 'ice', critical: false }),
    ]);
    expect(cast.tactical!.monsterPosition).toBe(approach.tactical!.monsterPosition);
    expect(cast.opponents[3].monster.rangedSkillCooldown).toBe(2);
    const after = await service.attack(7, run.id, enemy.id, undefined, { action: 'DEFEND' });
    expect(after.exchange?.events.some((event) => event.action === 'SKILL')).toBe(false);
    expect(after.opponents[3].monster.rangedSkillCooldown).toBe(1);
  });

  it('rejects backpack potions until assigned to a quick slot', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 10;
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: 71,
      quantity: 2,
      slot: null,
      item: { name: 'Minor Health Potion', isConsumable: true },
    });
    await expect(service.useHealthPotion(7, run.id, 71)).rejects.toThrow('quick slot');
    expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
  });

  it('does not allow health potions to revive a defeated dungeon member', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 0;
    await expect(service.useHealthPotion(7, run.id, 42)).rejects.toThrow('defeated player');
    expect(prisma.inventoryItem.delete).not.toHaveBeenCalled();
  });

  it('does not clear or charge the dungeon cooldown with an old quote', async () => {
    prisma.dungeonVisit.findUnique.mockResolvedValue({ nextEntryAt: new Date('2099-01-01') });
    prisma.gemActionPrice.findUnique.mockResolvedValue({ cost: 23 });
    await expect(service.reset(7, 'EMBERDEEP', 10)).rejects.toThrow('price has changed');
    expect(prisma.gameProfile.updateMany).not.toHaveBeenCalled();
    expect(prisma.dungeonVisit.delete).not.toHaveBeenCalled();
  });

  it('creates a waiting dungeon party with the creator as leader', async () => {
    prisma.dungeonParty.create.mockResolvedValue({
      id: 'party-1',
      dungeon: 'EMBERDEEP',
      status: 'WAITING',
      leaderProfileId: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [
        {
          partyId: 'party-1',
          gameProfileId: 5,
          joinedAt: new Date(),
          gameProfile: { id: 5, userId: 7, level: 5, user: { name: 'Hero' } },
        },
      ],
    });

    await expect(service.createParty(7, 'EMBERDEEP')).resolves.toMatchObject({
      id: 'party-1',
      status: 'WAITING',
      isLeader: true,
      members: [{ name: 'Hero', leader: true }],
    });
  });

  it('persists four opponents and restores the same unfinished run', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    expect(run.opponents).toHaveLength(4);
    expect(run.opponents.filter(({ isBoss }) => !isBoss).every(({ status }) => status === 'AVAILABLE')).toBe(true);
    expect(run.opponents.find(({ isBoss }) => isBoss)?.status).toBe('LOCKED');
    await expect(service.active(7)).resolves.toMatchObject({ id: run.id, dungeon: 'EMBERDEEP' });
    expect(monsterGenerator.generate).toHaveBeenCalledTimes(4);
  });

  it('defines a completely distinct four-monster roster for every dungeon', () => {
    expect(Object.keys(DUNGEON_ROSTERS).sort()).toEqual(['EMBERDEEP', 'HOLLOWGATE', 'ICEVAULT', 'RAVENCRYPT']);
    expect(Object.values(DUNGEON_ROSTERS).every((roster) => roster.length === 4)).toBe(true);
    const roles = Object.values(DUNGEON_ROSTERS).flat();
    expect(new Set(roles.map(({ name }) => name))).toHaveProperty('size', 16);
    expect(new Set(roles.map(({ image }) => image))).toHaveProperty('size', 16);
    expect(Object.values(DUNGEON_ROSTERS).every((roster) => roster.filter(({ boss }) => boss).length === 1)).toBe(true);
  });

  it.each(['active', 'enter'] as const)(
    'restores a pre-tactical run through %s with an attackable opponent and replayable skills',
    async (route) => {
      usersService.findCurrentUser.mockResolvedValue({
        ...user,
        gameProfile: { ...user.gameProfile, skillTree: { class: 'MAGE', ranks: { 'mage-fireball': 1 } } },
      });
      await service.enter(7, 'EMBERDEEP');
      const saved = storedRun!.state;
      delete saved.tactical;
      delete saved.player.attackRange;
      delete saved.player.movement;
      saved.player.health = 250;
      saved.opponents[0].status = 'DEFEATED';
      saved.opponents[0].monster.health = 0;
      const restored = route === 'active' ? await service.active(7) : await service.enter(7, 'EMBERDEEP');
      expect(restored?.tactical).toMatchObject({
        opponentId: saved.opponents[1].id,
        playerPosition: 40,
        monsterPosition: 41,
        revision: 0,
      });
      expect(storedRun?.state.tactical).toEqual(restored?.tactical);
      expect(restored?.player.health).toBe(250);
      expect(restored?.player.attackRange).toBe(1);
      expect(restored?.player.movement).toBeGreaterThan(0);
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const attack = await service.attack(7, saved.id, saved.opponents[1].id, undefined, { action: 'ATTACK' });
      expect(attack.exchange?.events[0].actor).toBe('PLAYER');
      const cast = await service.attack(7, saved.id, saved.opponents[1].id, 'mage-fireball', { action: 'SKILL' });
      expect(cast.tactical?.revision).toBe(2);
      expect(cast.exchange?.events[0]).toMatchObject({ action: 'SKILL', effect: 'fire', skillName: 'Fireball' });
    },
  );

  it('updates names and artwork in a persisted legacy run without resetting its progress', async () => {
    await service.enter(7, 'EMBERDEEP');
    storedRun!.state.opponents[0].monsterType = 'Legacy monster';
    storedRun!.state.opponents[0].image = '/images/dungeons/legacy.webp';
    storedRun!.state.opponents[0].status = 'DEFEATED';

    const restored = await service.active(7);
    expect(restored?.opponents[0]).toMatchObject({
      image: DUNGEON_ROSTERS.EMBERDEEP[0].image,
      status: 'DEFEATED',
      monster: { name: DUNGEON_ROSTERS.EMBERDEEP[0].name },
    });
  });

  it.each([
    ['mage-fireball', 1.4],
    ['mage-frost', 1.2],
    ['mage-nova', 2.1],
  ] as const)('%s bypasses dungeon armor and 100% dodge without changing defense', async (skillId, multiplier) => {
    user.gameProfile.level = 20;
    usersService.findCurrentUser.mockResolvedValue({
      ...user,
      gameProfile: { ...user.gameProfile, skillTree: { class: 'MAGE', ranks: { [skillId]: 1 } } },
    });
    const run = await service.enter(7, 'EMBERDEEP');
    const target = storedRun!.state.opponents[0];
    target.monster.health = 10000;
    target.monster.maxHealth = 10000;
    target.monster.defense = 60;
    target.monster.dodge = 100;
    target.monster.blockChance = 0;
    inMelee(target.id);
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = await service.attack(7, run.id, target.id, skillId);
    expect(result.latestEvents[0].damage).toBe(Math.round(run.player.skillState!.spellPower * multiplier));
    expect(result.latestEvents[0].dodged).toBe(false);
    expect(result.opponents[0].monster.defense).toBe(60);
  });

  it('casts learned dungeon skills, persists mana and cooldowns, and rejects unlearned spells', async () => {
    const mage = {
      ...user,
      gameProfile: { ...user.gameProfile, skillTree: { class: 'MAGE', ranks: { 'mage-fireball': 1 } } },
    };
    usersService.findCurrentUser.mockResolvedValue(mage);
    const run = await service.enter(7, 'EMBERDEEP');
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const target = run.opponents[0];
    target.monster.health = 10000;
    target.monster.maxHealth = 10000;
    inMelee(target.id);
    const result = await service.attack(7, run.id, target.id, 'mage-fireball');
    expect(result.latestEvents[0]).toMatchObject({ action: 'SKILL', effect: 'fire', actorName: 'Hero' });
    expect(result.skills?.mana).toBe((run.player.skillState?.maxMana ?? 0) - 30 + 3);
    await expect(service.attack(7, run.id, target.id, 'mage-fireball')).rejects.toThrow('cooldown');
    await expect(service.attack(7, run.id, target.id, 'mage-nova')).rejects.toThrow('not been learned');
    const reloaded = await service.active(7);
    expect(reloaded?.skills?.abilities[0]?.remainingCooldown).toBe(1);
  });

  it('awards only experience for guardians, unlocks the boss, then guarantees final gold and Rare loot', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1);
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.damage = 1_000_000;
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    await expect(service.attack(7, run.id, boss.id)).rejects.toThrow('Defeat the three guardians');

    for (const guardian of run.opponents.filter(({ isBoss }) => !isBoss)) {
      inMelee(guardian.id);
      const result = await service.attack(7, run.id, guardian.id);
      expect(result.lastExperience).toBeGreaterThan(0);
      expect(result.rewards).toBeNull();
      expect(result.lastBattleResult).toEqual({ winner: 'PLAYER', winnerName: 'Hero' });
    }
    expect(storedRun?.state.opponents.find(({ isBoss }) => isBoss)?.status).toBe('AVAILABLE');
    expect(itemGenerator.generate).not.toHaveBeenCalled();

    inMelee(boss.id);
    const completed = await service.attack(7, run.id, boss.id);
    expect(completed.status).toBe('VICTORY');
    expect(typeof completed.rewards?.gold).toBe('number');
    expect(completed.rewards?.items[0]).toMatchObject({ id: 44, rarity: ItemRarity.RARE, addedToInventory: true });
    expect(completed.rewards!.gold).toBe(run.opponents.reduce((sum, entry) => sum + entry.monster.rewardGold, 0) * 2);
    const rewardLevel = Array.from({ length: boss.monster.level }, (_, index) => boss.monster.level - index).find(
      (level) => requiredPlayerLevel(level) <= user.gameProfile.level,
    );
    expect(itemGenerator.generate).toHaveBeenCalledWith(
      { level: rewardLevel, rarity: ItemRarity.RARE, minimumRarity: ItemRarity.RARE },
      prisma,
    );
    expect(storedRun).toBeNull();
  });

  it('can award a second Rare item and guaranteed crafting materials to level 10 players', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    user.gameProfile.level = 10;
    prisma.craftItem.findUnique.mockResolvedValue({
      id: 12,
      name: 'Iron Ore',
      description: 'Ore',
      icon: 'craft_iron_ore.png',
      rarity: ItemRarity.COMMON,
    });
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.damage = 1_000_000;
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    let completed = run;
    for (const opponent of run.opponents) {
      inMelee(opponent.id);
      completed = await service.attack(7, run.id, opponent.id);
    }

    expect(completed.rewards?.items).toHaveLength(2);
    const rewardLevel = Array.from({ length: boss.monster.level }, (_, index) => boss.monster.level - index).find(
      (level) => requiredPlayerLevel(level) <= user.gameProfile.level,
    );
    expect(itemGenerator.generate).toHaveBeenLastCalledWith(
      { level: rewardLevel, rarity: ItemRarity.RARE, minimumRarity: ItemRarity.RARE },
      prisma,
    );
    expect(completed.rewards?.craftItems).toEqual([expect.objectContaining({ id: 12, name: 'Iron Ore', quantity: 1 })]);
    expect(prisma.playerCraftItem.upsert).toHaveBeenCalledWith({
      where: { gameProfileId_craftItemId: { gameProfileId: 5, craftItemId: 12 } },
      create: { gameProfileId: 5, craftItemId: 12, quantity: 1 },
      update: { quantity: { increment: 1 } },
    });
  });

  it('records the monster as the winner when the player loses a fight', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 1;
    run.player.damage = 1;
    const guardian = run.opponents.find(({ isBoss }) => !isBoss)!;

    inMelee(guardian.id);
    const defeated = await service.attack(7, run.id, guardian.id);

    expect(defeated.status).toBe('DEFEAT');
    expect(defeated.lastBattleResult).toEqual({ winner: 'MONSTER', winnerName: guardian.monster.name });
  });

  it('resolves and persists one solo combat exchange per attack', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 100_000;
    run.player.maxHealth = 100_000;
    run.player.damage = 1;
    const guardian = run.opponents.find(({ isBoss }) => !isBoss)!;
    const initialPlayerHealth = run.player.health;
    const initialMonsterHealth = guardian.monster.health;

    inMelee(guardian.id);
    const firstExchange = await service.attack(7, run.id, guardian.id);

    expect(firstExchange.status).toBe('ACTIVE');
    expect(guardian.status).toBe('AVAILABLE');
    expect(guardian.monster.health).toBeLessThan(initialMonsterHealth);
    expect(run.player.health).toBeLessThan(initialPlayerHealth);
    expect(firstExchange.latestEvents).toHaveLength(2);
    expect(firstExchange.latestEvents.map(({ actor }) => actor)).toEqual(['PLAYER', 'MONSTER']);
    expect(prisma.dungeonRun.update).toHaveBeenCalled();

    const secondExchange = await service.attack(7, run.id, guardian.id);

    expect(secondExchange.latestEvents).toHaveLength(4);
    expect(secondExchange.lastBattleResult).toBeNull();
    expect(secondExchange.lastExperience).toBe(0);
  });

  it('keeps the boss alive until there is room for the guaranteed reward', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.damage = 1_000_000;
    for (const guardian of run.opponents.filter(({ isBoss }) => !isBoss)) {
      inMelee(guardian.id);
      await service.attack(7, run.id, guardian.id);
    }
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    prisma.inventoryItem.count.mockResolvedValue(24);

    await expect(service.attack(7, run.id, boss.id)).rejects.toThrow(
      'Make room for up to two dungeon reward items before fighting the boss.',
    );
    expect(boss.status).toBe('AVAILABLE');
    expect(boss.monster.health).toBe(boss.monster.maxHealth);
    expect(itemGenerator.generate).not.toHaveBeenCalled();
  });

  it('awards shared party loot to the only member who requested it after everyone submits', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.status = 'VICTORY';
    run.party = {
      id: run.id,
      members: [
        { profileId: 5, userId: 7, name: 'Hero', level: 5, leader: true },
        { profileId: 6, userId: 8, name: 'Ally', level: 5, leader: false },
      ],
    };
    run.partyRewards = {
      '5': { gold: 40, experience: 100, items: [], craftItems: [] },
      '6': { gold: 40, experience: 100, items: [], craftItems: [] },
    };
    run.partyLoot = {
      status: 'CHOOSING',
      submittedProfileIds: [],
      deadlineAt: new Date(Date.now() + 60_000).toISOString(),
      items: [
        {
          id: 44,
          name: 'Warden Blade',
          description: 'Rare blade',
          price: 500,
          icon: 'icon_sword.png',
          isConsumable: false,
          rarity: ItemRarity.RARE,
          equipmentType: [],
          level: 9,
          requiredPlayerLevel: 7,
          isTwoHanded: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          attributes: [],
          properties: [],
          quantity: 1,
          addedToInventory: false,
          inventoryFull: false,
          claimantProfileIds: [],
        },
      ],
    };
    storedRun!.state = run;
    prisma.dungeonParty.findUnique.mockResolvedValue({
      id: run.id,
      members: [{ gameProfileId: 5 }, { gameProfileId: 6 }],
    });
    prisma.gameProfile.findUnique.mockImplementation(({ where }: { where: { userId: number } }) =>
      Promise.resolve({ id: where.userId === 7 ? 5 : 6 }),
    );

    const waiting = await service.submitPartyLoot(7, run.id, [44]);
    expect(waiting.partyLoot).toMatchObject({ status: 'CHOOSING', submittedProfileIds: [5] });
    expect(prisma.inventoryItem.create).not.toHaveBeenCalled();

    storedRun!.state.partyLoot!.deadlineAt = new Date(Date.now() - 1_000).toISOString();
    prisma.gameProfile.findUnique.mockResolvedValue({
      id: 6,
      dungeonRun: null,
      dungeonParty: { party: { id: run.id, status: 'VICTORY' } },
    });
    const resolved = await service.active(8);
    expect(resolved?.partyLoot).toMatchObject({
      status: 'RESOLVED',
      items: [{ id: 44, claimantProfileIds: [5], winnerProfileId: 5, winnerName: 'Hero' }],
    });
    expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
      data: { gameProfileId: 5, itemId: 44, quantity: 1, slot: null, isEquiped: false },
    });
  });

  it('splits party experience and gold and generates one shared equipment pool', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const run = await service.enter(7, 'EMBERDEEP');
    run.party = {
      id: run.id,
      members: [
        {
          profileId: 5,
          userId: 7,
          name: 'Hero',
          level: 5,
          leader: true,
          health: 500,
          maxHealth: 500,
          mana: 0,
          maxMana: 0,
          damage: 1_000_000,
          defense: 0,
          dodge: 0,
          criticalChance: 0,
          criticalDamage: 150,
        },
        {
          profileId: 6,
          userId: 8,
          name: 'Ally',
          level: 5,
          leader: false,
          health: 500,
          maxHealth: 500,
          mana: 0,
          maxMana: 0,
          damage: 50,
          defense: 0,
          dodge: 0,
          criticalChance: 0,
          criticalDamage: 150,
        },
      ],
    };
    for (const guardian of run.opponents.filter(({ isBoss }) => !isBoss)) guardian.status = 'DEFEATED';
    const boss = run.opponents.find(({ isBoss }) => isBoss)!;
    boss.status = 'AVAILABLE';
    run.latestEvents = [{ actor: 'PLAYER', damage: 10, critical: false, dodged: false, actorName: 'Ally' }];
    storedRun!.state = run;
    inMelee(boss.id);
    prisma.dungeonParty.findUnique.mockResolvedValue({
      id: run.id,
      members: [{ gameProfileId: 5 }, { gameProfileId: 6 }],
    });

    const completed = await service.attack(7, run.id, boss.id);
    const totalExperience = Math.round(boss.monster.rewardExperience * (1 + run.experienceBonusPercent / 100));
    const totalGold = Math.round(
      run.opponents.reduce((sum, entry) => sum + entry.monster.rewardGold, 0) * 2 * (1 + run.goldBonusPercent / 100),
    );

    expect(completed.lastExperience).toBe(Math.floor(totalExperience / 2));
    expect(completed.partyRewards?.['5'].gold).toBe(Math.floor(totalGold / 2));
    expect(completed.partyRewards?.['6'].gold).toBe(Math.floor(totalGold / 2));
    expect(completed.partyLoot?.items).toHaveLength(1);
    expect(completed.latestEvents).toHaveLength(2);
    expect(completed.latestEvents[0]).toMatchObject({ actorName: 'Ally', damage: 10 });
    expect(itemGenerator.generate).toHaveBeenCalledTimes(1);
  });

  it('permanently abandons an unfinished run without granting final rewards', async () => {
    const run = await service.enter(7, 'EMBERDEEP');

    await expect(service.leave(7, run.id)).resolves.toEqual({ success: true });
    expect(storedRun).toBeNull();
    expect(itemGenerator.generate).not.toHaveBeenCalled();
    expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
  });

  it('consumes a health potion and persists restored dungeon health', async () => {
    const run = await service.enter(7, 'EMBERDEEP');
    run.player.health = 10;
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: 71,
      quantity: 1,
      slot: 'potion-1',
      item: { name: 'Minor Health Potion', isConsumable: true },
    });

    await expect(service.useHealthPotion(7, run.id, 71)).resolves.toMatchObject({
      healed: 50,
      run: { player: { health: 60 } },
    });
    expect(prisma.inventoryItem.delete).toHaveBeenCalledWith({ where: { id: 71 } });
    expect(storedRun?.state.player.health).toBe(60);
    expect(storedRun?.state.potionTurns).toEqual({ '5': 1 });
    await expect(service.useHealthPotion(7, run.id, 72)).rejects.toThrow('one health potion per turn');
    expect(prisma.inventoryItem.delete).toHaveBeenCalledTimes(1);
    storedRun!.state.tactical!.turn++;
    await expect(service.useHealthPotion(7, run.id, 72)).resolves.toMatchObject({
      healed: 50,
      run: { potionUsedThisTurn: true },
    });
  });
});
