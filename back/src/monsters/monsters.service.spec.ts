import { Test, TestingModule } from '@nestjs/testing';
import { MonstersService, rollDeathCurse, DEATH_CURSES } from './monsters.service';
import { PrismaService } from '../prisma.service';
import { NotFoundException } from '@nestjs/common';
import { MonsterGeneratorService } from './monster-generator.service';
import { UsersService } from '../users/users.service';
import { PlayerBuffType, StatType } from '../../generated/client';
import { ItemGeneratorService } from '../items/item-generator.service';
import { DungeonRunsService } from './dungeon-runs.service';

describe('MonstersService', () => {
  let service: MonstersService;

  const mockPrismaService = {
    playerQuest: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    gameProfileBuff: { deleteMany: jest.fn(), create: jest.fn() },
    $executeRaw: jest.fn(),
    dungeonVisit: { findUnique: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
    gameProfile: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    monster: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    inventoryItem: {
      create: jest.fn().mockResolvedValue({ id: 99 }),
      count: jest.fn().mockResolvedValue(0),
    },
    craftItem: { findUnique: jest.fn() },
    playerCraftItem: { upsert: jest.fn() },
  };
  const mockMonsterGenerator = {
    generate: jest.fn(),
  };
  const mockUsersService = {
    findCurrentUser: jest.fn(),
    updateMapPosition: jest.fn(),
  };
  const mockItemGenerator = {
    generate: jest.fn(),
  };
  const mockDungeonRuns = {
    partyLobby: jest.fn(),
    createParty: jest.fn(),
    joinParty: jest.fn(),
    leaveParty: jest.fn(),
    startParty: jest.fn(),
    active: jest.fn(),
    enter: jest.fn(),
    attack: jest.fn(),
    leave: jest.fn(),
    useHealthPotion: jest.fn(),
    reset: jest.fn(),
  };
  const currentUser = (
    level: number,
    healthBase?: number,
    buffs: Array<{ type: PlayerBuffType; value: number; expiresAt: Date }> = [],
  ) => ({
    id: 7,
    name: 'Hero',
    email: 'hero@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    gameProfile: {
      level,
      id: 5,
      gold: 0,
      gems: 0,
      experience: 0,
      freeAttributes: 0,
      buffs,
      mapPositionX: 1470,
      mapPositionY: 960,
      inventory: [],
      profileAttributes: [],
      profileStats:
        healthBase === undefined ? [] : [{ value: healthBase, stat: { name: StatType.HEALTH, description: null } }],
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockPrismaService.playerQuest.findMany.mockResolvedValue([]);
    mockPrismaService.playerQuest.updateMany.mockResolvedValue({ count: 1 });
    mockPrismaService.dungeonVisit.findUnique.mockResolvedValue(null);
    mockPrismaService.$transaction.mockImplementation((operation: (client: typeof mockPrismaService) => unknown) =>
      operation(mockPrismaService),
    );
    mockPrismaService.gameProfile.update.mockResolvedValue({ id: 5, level: 1, experience: 14 });
    mockPrismaService.craftItem.findUnique.mockResolvedValue(null);
    mockDungeonRuns.active.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonstersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonsterGeneratorService, useValue: mockMonsterGenerator },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ItemGeneratorService, useValue: mockItemGenerator },
        { provide: DungeonRunsService, useValue: mockDungeonRuns },
      ],
    }).compile();

    service = module.get<MonstersService>(MonstersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('respawns in Evercross and clears all buffs on defeat without awarding a kill', async () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.99);
    mockUsersService.findCurrentUser.mockResolvedValue(currentUser(1));
    mockMonsterGenerator.generate.mockReturnValue({
      id: 2,
      name: 'Dire Wolf',
      monsterType: 'Dire Wolf',
      level: 1,
      attributes: [],
      rewardGold: 7,
      rewardExperience: 11,
    });
    const result = await service.rollEncounter(7);
    if (!result.encountered) throw new Error('Expected battle');
    result.battle.player.health = 1;
    result.battle.player.damage = 1;
    const battle = await service.attack(7, result.battle.id);
    expect(battle.status).toBe('DEFEAT');
    expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
      where: { userId: 7 },
      data: { mapPositionX: 1470, mapPositionY: 960 },
    });
    expect(mockPrismaService.gameProfileBuff.deleteMany).toHaveBeenCalledWith({ where: { gameProfileId: 5 } });
    expect(mockPrismaService.gameProfileBuff.create).not.toHaveBeenCalled();
    expect(mockPrismaService.playerQuest.findMany).not.toHaveBeenCalled();
    expect(mockPrismaService.gameProfile.update).toHaveBeenCalledTimes(1);
  });

  it('rolls a death curse only for levels above 10 and with 20% probability', () => {
    expect(rollDeathCurse(10, () => 0.1)).toBeNull();
    expect(rollDeathCurse(11, () => 0.25)).toBeNull();
    const curse = rollDeathCurse(11, () => 0.1);
    expect(curse).not.toBeNull();
    expect(DEATH_CURSES).toContainEqual(curse);
    expect(curse!.value).toBeLessThan(0);
  });

  it('applies a curse on defeat when player level is above 10 and roll succeeds', async () => {
    mockPrismaService.gameProfile.update.mockResolvedValue({ id: 5, level: 15 });
    jest.spyOn(Math, 'random').mockReturnValue(0.05);
    mockUsersService.findCurrentUser.mockResolvedValue(currentUser(15, 1));
    mockMonsterGenerator.generate.mockReturnValue({
      id: 99,
      name: 'Dragon',
      monsterType: 'Dragon',
      level: 15,
      attributes: [],
      rewardGold: 50,
      rewardExperience: 50,
    });
    const result = await service.rollEncounter(7);
    if (!result.encountered) throw new Error('Expected battle');
    result.battle.player.health = 1;
    result.battle.player.damage = 1;
    await service.attack(7, result.battle.id);
    expect(mockPrismaService.gameProfileBuff.create).toHaveBeenCalledTimes(1);
    const callArgs = mockPrismaService.gameProfileBuff.create.mock.calls[0] as [
      { data: { gameProfileId: number; value: number; expiresAt: Date } },
    ];
    expect(callArgs[0].data.gameProfileId).toBe(5);
    expect(callArgs[0].data.value).toBeLessThan(0);
    expect(callArgs[0].data.expiresAt).toBeInstanceOf(Date);
  });

  it('grants quest gold, XP and Magic-or-better loot once, including XP in level-up calculation', async () => {
    jest
      .spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.1)
      .mockReturnValue(0.95);
    mockUsersService.findCurrentUser.mockResolvedValue(currentUser(1));
    mockMonsterGenerator.generate.mockReturnValue({
      id: 2,
      name: 'Dire Wolf',
      monsterType: 'Dire Wolf',
      level: 1,
      attributes: [],
      rewardGold: 7,
      rewardExperience: 11,
    });
    mockPrismaService.playerQuest.findMany.mockResolvedValue([
      { questId: 1, progress: 19, quest: { target: 20, rewardGold: 200, rewardExperience: 400 } },
    ]);
    mockItemGenerator.generate.mockResolvedValue({
      id: 99,
      name: 'Quest sword',
      description: '',
      price: 1,
      icon: '',
      equipmentType: ['WEAPON'],
      rarity: 'MAGIC',
      level: 1,
      attributes: [],
      stats: [],
    });
    const result = await service.rollEncounter(7);
    if (!result.encountered) throw new Error('Expected battle');
    result.battle.player.damage = 10000;
    const battle = await service.attack(7, result.battle.id);
    expect(battle.rewards).toMatchObject({ gold: 207, experience: 411, items: [{ id: 99, rarity: 'MAGIC' }] });
    expect(mockItemGenerator.generate).toHaveBeenCalledWith(
      { level: 1, rarity: 'MAGIC', minimumRarity: 'MAGIC' },
      mockPrismaService,
    );
    expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { level: 2, experience: 0, freeAttributes: { increment: 5 } },
    });
    await expect(service.attack(7, result.battle.id)).rejects.toThrow('Active battle not found');
    expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledTimes(1);
  });

  it('delegates persistent dungeon operations to the dungeon run service', async () => {
    const run = { id: 'run-1', dungeon: 'EMBERDEEP', status: 'ACTIVE' };
    mockDungeonRuns.enter.mockResolvedValue(run);
    mockDungeonRuns.active.mockResolvedValue(run);
    mockDungeonRuns.attack.mockResolvedValue({ ...run, status: 'VICTORY' });
    mockDungeonRuns.reset.mockResolvedValue({ success: true, cost: 10 });

    await expect(service.enterDungeon(7, 'EMBERDEEP')).resolves.toBe(run);
    await expect(service.activeDungeon(7)).resolves.toBe(run);
    await expect(service.attackDungeonOpponent(7, 'run-1', 'enemy-1')).resolves.toMatchObject({
      status: 'VICTORY',
    });
    await expect(service.resetDungeon(7, 'EMBERDEEP')).resolves.toEqual({ success: true, cost: 10 });
    expect(mockDungeonRuns.enter).toHaveBeenCalledWith(7, 'EMBERDEEP');
    expect(mockDungeonRuns.attack).toHaveBeenCalledWith(7, 'run-1', 'enemy-1');
  });

  describe('findAll', () => {
    it('should return all monsters ordered by id', async () => {
      const monsters = [{ id: 1, name: 'Goblin', level: 1 }];
      mockPrismaService.monster.findMany.mockResolvedValue(monsters);

      const result = await service.findAll();

      expect(mockPrismaService.monster.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
      expect(result).toEqual(monsters);
    });
  });

  describe('findOne', () => {
    it('should return a monster when found', async () => {
      const monster = { id: 1, name: 'Goblin', level: 1 };
      mockPrismaService.monster.findUnique.mockResolvedValue(monster);

      const result = await service.findOne(1);

      expect(mockPrismaService.monster.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(monster);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.monster.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rollEncounter', () => {
    it('uses ten percent on a route and does not generate a monster when the roll misses', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.2);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(1));

      await expect(service.rollEncounter(7)).resolves.toEqual({ encountered: false, chance: 0.1 });
      expect(mockMonsterGenerator.generate).not.toHaveBeenCalled();
    });

    it('keeps twenty percent encounter chance away from routes', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.15);
      const user = currentUser(1);
      user.gameProfile.mapPositionX = 1400;
      user.gameProfile.mapPositionY = 800;
      mockUsersService.findCurrentUser.mockResolvedValue(user);
      mockMonsterGenerator.generate.mockReturnValue({ id: 2, name: 'Wolf', level: 1, attributes: [] });
      const result = await service.rollEncounter(7);
      expect(result.encountered).toBe(true);
      expect(result.chance).toBe(0.2);
    });

    it('uses thirty percent in forests and bogs', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      const user = currentUser(1);
      user.gameProfile.mapPositionX = 790;
      user.gameProfile.mapPositionY = 1220;
      mockUsersService.findCurrentUser.mockResolvedValue(user);

      await expect(service.rollEncounter(7)).resolves.toEqual({ encountered: false, chance: 0.3 });

      user.gameProfile.mapPositionX = 420;
      user.gameProfile.mapPositionY = 1510;
      await expect(service.rollEncounter(7)).resolves.toEqual({ encountered: false, chance: 0.3 });
    });

    it('saves a travel step and rolls its encounter in one operation', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9);
      const user = currentUser(1);
      user.gameProfile.mapPositionX = 1400;
      user.gameProfile.mapPositionY = 800;
      mockUsersService.findCurrentUser.mockResolvedValue(user);

      await expect(service.updateMapPositionAndRollEncounter(7, { x: 1400, y: 800 })).resolves.toEqual({
        position: { x: 1400, y: 800 },
        encounter: { encountered: false, chance: 0.2 },
      });
      expect(mockUsersService.updateMapPosition).toHaveBeenCalledWith(7, { x: 1400, y: 800 });
    });

    it('rejects a forged position jump before saving or rolling an encounter', async () => {
      const user = currentUser(1);
      user.gameProfile.mapPositionX = 100;
      user.gameProfile.mapPositionY = 100;
      mockUsersService.findCurrentUser.mockResolvedValue(user);

      await expect(service.updateMapPositionAndRollEncounter(7, { x: 500, y: 100 })).rejects.toThrow(
        'Map position changed too far',
      );
      expect(mockUsersService.updateMapPosition).not.toHaveBeenCalled();
      expect(mockMonsterGenerator.generate).not.toHaveBeenCalled();
    });

    it('allows retreat only on roads or near towns', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.01);
      const user = currentUser(1);
      user.gameProfile.mapPositionX = 1400;
      user.gameProfile.mapPositionY = 800;
      mockUsersService.findCurrentUser.mockResolvedValue(user);
      mockMonsterGenerator.generate.mockReturnValue({ id: 2, name: 'Wolf', level: 1, attributes: [] });

      const offRoad = await service.rollEncounter(7);
      if (!offRoad.encountered) throw new Error('Expected encounter');
      expect(offRoad.battle.canRetreat).toBe(false);
      expect(service.activeForcedBattle(7)?.id).toBe(offRoad.battle.id);
      expect(service.activeForcedBattle(8)).toBeNull();
      expect(() => service.retreat(7, offRoad.battle.id)).toThrow('only on a road or near a town');

      user.gameProfile.mapPositionX = 1470;
      user.gameProfile.mapPositionY = 960;
      const onRoad = await service.rollEncounter(7);
      if (!onRoad.encountered) throw new Error('Expected encounter');
      expect(onRoad.battle.canRetreat).toBe(true);
      expect(service.retreat(7, onRoad.battle.id)).toEqual({ success: true });
    });

    it('returns a generated level-appropriate monster when the roll succeeds', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(100, 2_000));
      const monster = {
        id: 2,
        name: 'Savage Bandit',
        description: 'A generated bandit.',
        level: 4,
        rewardGold: 18,
        rewardExperience: 30,
        attributes: [],
      };
      mockMonsterGenerator.generate.mockReturnValue(monster);

      const result = await service.rollEncounter(7);
      expect(result.encountered).toBe(true);
      if (!result.encountered) throw new Error('Expected encounter');
      expect(mockMonsterGenerator.generate).toHaveBeenCalledWith(100, { x: 1470, y: 960 });
      expect(result.monster).toBe(monster);
      expect(typeof result.battle.id).toBe('string');
      expect(result.battle.status).toBe('ACTIVE');
      expect(result.battle.player).toMatchObject({
        name: 'Hero',
        health: 3_065,
        maxHealth: 3_065,
        damage: 6,
        defense: 0.5,
        dodge: 1,
        criticalChance: 1,
        criticalDamage: 166.7,
      });
      expect(result.battle.monster.id).toBe(2);
      expect(result.battle.monster.health).toBeGreaterThan(0);
    });

    it('starts a guaranteed hunt encounter away from roads and landmarks', async () => {
      const user = currentUser(8);
      user.gameProfile.mapPositionX = 1400;
      user.gameProfile.mapPositionY = 800;
      mockUsersService.findCurrentUser.mockResolvedValue(user);
      const monster = {
        id: 2,
        name: 'Hunted Wolf',
        monsterType: 'Dire Wolf',
        level: 8,
        rewardGold: 25,
        rewardExperience: 40,
        attributes: [],
      };
      mockMonsterGenerator.generate.mockReturnValue(monster);

      const result = await service.hunt(7);

      expect(mockMonsterGenerator.generate).toHaveBeenCalledWith(8, { x: 1400, y: 800 });
      expect(result.monster).toBe(monster);
      expect(result.battle.status).toBe('ACTIVE');
      expect(result.battle.monsterType).toBe('Dire Wolf');
      expect(result.battle.canRetreat).toBe(false);
    });

    it('rejects hunting on roads, near settlements, and near sanctuaries', async () => {
      const user = currentUser(8);
      mockUsersService.findCurrentUser.mockResolvedValue(user);
      await expect(service.hunt(7)).rejects.toThrow('Hunting is available only away from roads');

      user.gameProfile.mapPositionX = 1200;
      user.gameProfile.mapPositionY = 250;
      await expect(service.hunt(7)).rejects.toThrow('Hunting is available only away from roads');
      expect(mockMonsterGenerator.generate).not.toHaveBeenCalled();
    });

    it('does not allow hunting during an active dungeon run', async () => {
      mockDungeonRuns.active.mockResolvedValue({ id: 'active-run' });

      await expect(service.hunt(7)).rejects.toThrow('Finish the active dungeon first');
      expect(mockUsersService.findCurrentUser).not.toHaveBeenCalled();
    });

    it('resolves the entire battle with one attack and permanently awards victory rewards', async () => {
      mockPrismaService.gameProfile.update.mockResolvedValueOnce({ id: 5, level: 5, experience: 2500 });
      jest
        .spyOn(Math, 'random')
        .mockReturnValueOnce(0.01)
        .mockReturnValueOnce(0.99)
        .mockReturnValueOnce(0.99)
        .mockReturnValue(0.1);
      mockUsersService.findCurrentUser.mockResolvedValue(
        currentUser(5, undefined, [
          { type: PlayerBuffType.EXPERIENCE, value: 25, expiresAt: new Date('2099-01-01T00:00:00Z') },
        ]),
      );
      mockMonsterGenerator.generate.mockReturnValue({
        id: 2,
        name: 'Wandering Rat',
        description: 'A generated rat.',
        level: 1,
        rewardGold: 7,
        rewardExperience: 11,
        attributes: [],
      });
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');
      encounter.battle.player.damage = 1_000;

      const battle = await service.attack(7, encounter.battle.id);

      expect(battle.status).toBe('VICTORY');
      expect(battle.events.length).toBeGreaterThan(0);
      expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
        where: { userId: 7 },
        data: { gold: { increment: 7 }, experience: { increment: 14 }, killedMonsters: { increment: 1 } },
        select: { id: true, level: true, experience: true },
      });
      expect(battle.rewards?.items).toEqual([]);
      expect(mockPrismaService.craftItem.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.gameProfile.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { level: 6, experience: 0, freeAttributes: { increment: 5 } },
      });
    });

    it.each([
      ['Stone Golem', 1, 22],
      ['Dire Wolf', 4, 19],
    ])('uses %s movement on the server', async (monsterType, movement, destination) => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValue(0.99);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(5, 500));
      mockMonsterGenerator.generate.mockReturnValue({
        id: 3,
        name: monsterType,
        monsterType,
        level: 5,
        rewardGold: 20,
        rewardExperience: 25,
        attributes: [],
      });
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');
      expect(encounter.battle.monster.movement).toBe(movement);
      expect(encounter.battle.arena.playerMovement).toBe(3);
      await expect(service.takeTurn(7, encounter.battle.id, 'MOVE', 20)).rejects.toThrow('outside your movement range');
      const turn = await service.takeTurn(7, encounter.battle.id, 'DEFEND');
      expect(turn.arena.monsterPosition).toBe(destination);
    });

    it('uses the player Movement stat for reachable hexes and move validation', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValue(0.99);
      const user = currentUser(5, 500);
      mockUsersService.findCurrentUser.mockResolvedValue({
        ...user,
        gameProfile: {
          ...user.gameProfile,
          profileAttributes: [{ value: 40, attribute: { name: 'AGILITY', description: null } }],
        },
      });
      mockMonsterGenerator.generate.mockReturnValue({
        id: 3,
        name: 'Stone Golem',
        monsterType: 'Stone Golem',
        level: 5,
        rewardGold: 20,
        rewardExperience: 25,
        attributes: [],
      });
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');
      expect(encounter.battle.player.movement).toBe(6);
      expect(encounter.battle.arena.reachableCells).toContain(20);
      const moved = await service.takeTurn(7, encounter.battle.id, 'MOVE', 20);
      expect(moved.arena.playerPosition).toBe(20);
      expect(moved.arena.reachableCells).toEqual([]);
    });

    it('lets the player move and attack before the monster takes its turn', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValue(0.99);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(5, 500));
      mockMonsterGenerator.generate.mockReturnValue({
        id: 3,
        name: 'Hill Raider',
        monsterType: 'Hill Raider',
        level: 5,
        rewardGold: 20,
        rewardExperience: 25,
        attributes: [],
      });
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');

      await expect(service.takeTurn(7, encounter.battle.id, 'ATTACK')).rejects.toThrow(
        'Move next to the enemy before attacking',
      );
      const firstTurn = await service.takeTurn(7, encounter.battle.id, 'MOVE', 19);

      expect(firstTurn.status).toBe('ACTIVE');
      expect(firstTurn.turn).toBe(1);
      expect(firstTurn.events).toHaveLength(1);
      expect(firstTurn.events[0]).toMatchObject({ actor: 'PLAYER', action: 'MOVE', fromCell: 16, toCell: 19 });
      expect(firstTurn.arena).toMatchObject({
        playerPosition: 19,
        monsterPosition: 23,
        canAttack: false,
        playerHasMoved: true,
      });
      expect(mockPrismaService.gameProfile.update).not.toHaveBeenCalled();
      await expect(service.takeTurn(7, encounter.battle.id, 'MOVE', 20)).rejects.toThrow(
        'You have already moved this turn',
      );

      const defended = await service.takeTurn(7, encounter.battle.id, 'DEFEND');
      expect(defended.turn).toBe(2);
      expect(defended.events[0]).toMatchObject({ actor: 'PLAYER', action: 'MOVE', fromCell: 16, toCell: 19 });
      expect(defended.events[1]).toMatchObject({ actor: 'PLAYER', action: 'DEFEND', damage: 0 });
      expect(defended.events[2]).toMatchObject({ actor: 'MONSTER', action: 'MOVE', fromCell: 23, toCell: 21 });
      expect(defended.arena).toMatchObject({
        playerPosition: 19,
        monsterPosition: 21,
        canAttack: false,
        playerHasMoved: false,
      });

      const movedIntoRange = await service.takeTurn(7, encounter.battle.id, 'MOVE', 20);
      expect(movedIntoRange.turn).toBe(2);
      expect(movedIntoRange.arena).toMatchObject({
        playerPosition: 20,
        monsterPosition: 21,
        canAttack: true,
        playerHasMoved: true,
      });

      const attacked = await service.takeTurn(7, encounter.battle.id, 'ATTACK');
      expect(attacked.turn).toBe(3);
      expect(attacked.events[0]).toMatchObject({ actor: 'PLAYER', action: 'MOVE', fromCell: 19, toCell: 20 });
      expect(attacked.events[1]).toMatchObject({ actor: 'PLAYER', action: 'ATTACK' });
      expect(attacked.events.at(-1)).toMatchObject({ actor: 'MONSTER' });
      expect(attacked.arena.playerHasMoved).toBe(false);
    });

    it('gives tactical power strike a three-turn cooldown', async () => {
      jest.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValue(0.99);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(5, 500));
      mockMonsterGenerator.generate.mockReturnValue({
        id: 4,
        name: 'Ironhide',
        monsterType: 'Ironhide',
        level: 5,
        rewardGold: 20,
        rewardExperience: 25,
        attributes: [{ value: 50, attribute: { name: 'ENDURANCE' } }],
      });
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');

      await service.takeTurn(7, encounter.battle.id, 'MOVE', 19);
      await service.takeTurn(7, encounter.battle.id, 'DEFEND');
      await service.takeTurn(7, encounter.battle.id, 'MOVE', 20);
      const turn = await service.takeTurn(7, encounter.battle.id, 'POWER_ATTACK');

      expect(turn.status).toBe('ACTIVE');
      expect(turn.powerAttackCooldown).toBe(3);
      expect(turn.events).toContainEqual(expect.objectContaining({ actor: 'PLAYER', action: 'POWER_ATTACK' }));
      await expect(service.takeTurn(7, encounter.battle.id, 'POWER_ATTACK')).rejects.toThrow(
        'Power attack is ready in 3 turn(s)',
      );
    });

    it('adds a generated rarity-weighted item drop to inventory on victory', async () => {
      const random = jest.spyOn(Math, 'random');
      random.mockReturnValueOnce(0.01).mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValueOnce(0.97);
      mockUsersService.findCurrentUser.mockResolvedValue(currentUser(5));
      mockMonsterGenerator.generate.mockReturnValue({
        id: 2,
        name: 'Wandering Rat',
        description: 'A generated rat.',
        level: 4,
        rewardGold: 7,
        rewardExperience: 11,
        attributes: [],
      });
      const droppedItem = {
        id: 44,
        name: 'Lucky Ring',
        description: 'MAGIC level 4 ring.',
        price: 100,
        icon: 'icon_ring.png',
        isConsumable: false,
        rarity: 'MAGIC' as const,
        equipmentType: ['RING' as const],
        level: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        attributes: [],
        stats: [],
      };
      mockItemGenerator.generate.mockResolvedValue(droppedItem);
      const encounter = await service.rollEncounter(7);
      if (!encounter.encountered) throw new Error('Expected encounter');
      encounter.battle.player.damage = 1_000;

      const battle = await service.attack(7, encounter.battle.id);

      expect(mockItemGenerator.generate).toHaveBeenCalledWith({ level: 4, rarity: 'MAGIC' }, mockPrismaService);
      expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledWith({
        data: { gameProfileId: 5, itemId: 44, quantity: 1, slot: null, isEquiped: false },
      });
      expect(battle.rewards?.items).toEqual([
        expect.objectContaining({ id: 44, name: 'Lucky Ring', rarity: 'MAGIC', quantity: 1 }),
      ]);
    });

    it('marks drop as inventoryFull and does not insert into inventory when backpack is at 24 slots', async () => {
      mockPrismaService.inventoryItem.count.mockResolvedValue(24);
      const random = jest.spyOn(Math, 'random');
      random.mockReturnValueOnce(0.01).mockReturnValueOnce(0.99).mockReturnValueOnce(0.99).mockReturnValue(0.95);
      const droppedItem = {
        id: 44,
        name: 'Lucky Ring',
        description: 'Magic ring',
        price: 100,
        icon: 'icon_ring.png',
        isConsumable: false,
        rarity: 'MAGIC' as const,
        equipmentType: ['RING' as const],
        level: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        attributes: [],
        stats: [],
      };
      mockItemGenerator.generate.mockResolvedValue(droppedItem);
      mockMonsterGenerator.generate.mockReturnValue({
        id: 99,
        name: 'Spider',
        monsterType: 'Spider',
        level: 1,
        attributes: [],
        rewardGold: 7,
        rewardExperience: 11,
      });
      const result = await service.rollEncounter(7);
      if (!result.encountered) throw new Error('Expected battle');
      result.battle.player.damage = 1_000;
      mockPrismaService.inventoryItem.create.mockClear();

      const battle = await service.attack(7, result.battle.id);
      expect(battle.status).toBe('VICTORY');
      expect(battle.rewards?.items.length).toBeGreaterThan(0);
      expect(battle.rewards?.items[0].inventoryFull).toBe(true);
      expect(mockPrismaService.inventoryItem.create).not.toHaveBeenCalled();
    });
  });
});
