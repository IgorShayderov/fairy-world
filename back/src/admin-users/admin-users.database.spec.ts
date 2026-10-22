import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaService } from '../prisma.service';
import { AdminAuthGuard } from '../feedback/admin-auth.guard';
import { AdminAuthService } from '../feedback/admin-auth.service';
import { ItemGeneratorService } from '../items/item-generator.service';
import { MonstersService } from '../monsters/monsters.service';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

type Detail = Awaited<ReturnType<AdminUsersService['get']>>;
const databaseTests = process.env.ADMIN_USERS_DB_TEST === '1' ? describe : describe.skip;
databaseTests('admin player management HTTP and database', () => {
  let app: INestApplication, server: Server, prisma: PrismaService, token: string, adminId: number;
  let player: Detail, itemId: number;
  const prefix = `admin-users-${randomUUID()}`;
  const password = `Aa1!${randomUUID().slice(0, 20)}`;
  const monsters = { hasActiveBattle: jest.fn().mockReturnValue(false) };
  const createdItems: number[] = [];
  const reason = 'Automated admin management test';
  const data = (response: { body: unknown }) => (response.body as { data: Detail }).data;
  const profileEdit = () => ({
    expectedState: player.stateToken,
    reason,
    name: player.name,
    email: player.email,
    level: player.gameProfile!.level,
    experience: player.gameProfile!.experience,
    gold: player.gameProfile!.gold,
    gems: player.gameProfile!.gems,
    coinsOfHonour: player.gameProfile!.coinsOfHonour,
    freeAttributes: player.gameProfile!.freeAttributes,
    attributes: player.gameProfile!.profileAttributes.map((entry) => ({
      name: entry.attribute.name,
      value: entry.value,
    })),
  });
  const reload = async () => {
    player = data(await request(server).get(`/admin/users/${player.id}`).auth(token, { type: 'bearer' }).expect(200));
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        PrismaService,
        AdminUsersService,
        AdminAuthGuard,
        AdminAuthService,
        ItemGeneratorService,
        { provide: MonstersService, useValue: monsters },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    const admin = await prisma.user.create({
      data: {
        email: `${prefix}-admin@example.invalid`,
        name: 'Test admin',
        password: await bcrypt.hash(password, 10),
        role: 'ADMIN',
      },
    });
    adminId = admin.id;
    token = (await app.get(AdminAuthService).login(admin.email, password, 'admin-user-test')).token;
    const item = await prisma.item.create({ data: { name: `${prefix} Sword`, equipmentType: ['WEAPON'], level: 1 } });
    itemId = item.id;
    createdItems.push(item.id);
  });
  afterAll(async () => {
    if (prisma) {
      const users = await prisma.user.findMany({
        where: { email: { startsWith: prefix } },
        select: { id: true, gameProfile: { select: { inventory: { select: { itemId: true } } } } },
      });
      const ids = users.map((user) => user.id);
      for (const user of users) for (const entry of user.gameProfile?.inventory ?? []) createdItems.push(entry.itemId);
      await prisma.adminUserAudit.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      await prisma.item.deleteMany({ where: { id: { in: createdItems } } });
      await prisma.$disconnect();
    }
    await app?.close();
  });
  it('requires a separate admin token and creates a complete non-admin player without exposing secrets', async () => {
    await request(server).get('/admin/users').expect(401);
    const gameToken = new JwtService().sign({ sub: adminId }, { secret: process.env.JWT_SECRET || 'access-secret' });
    await request(server).get('/admin/users').auth(gameToken, { type: 'bearer' }).expect(401);
    await request(server).post('/admin/users').send({}).expect(401);
    const input = { email: `${prefix}-player@example.invalid`, name: 'Managed player', password, reason };
    await request(server)
      .post('/admin/users')
      .auth(token, { type: 'bearer' })
      .send({ ...input, role: 'ADMIN' })
      .expect(400);
    player = data(await request(server).post('/admin/users').auth(token, { type: 'bearer' }).send(input).expect(201));
    expect(player.role).toBe('USER');
    expect(player.gameProfile?.level).toBe(1);
    expect(player.gameProfile?.inventory).toHaveLength(2);
    expect(player.gameProfile?.profileAttributes).toHaveLength(5);
    createdItems.push(...player.gameProfile!.inventory.map((entry) => entry.itemId));
    expect(player.audits[0].action).toBe('CREATE_USER');
    const raw = await prisma.user.findUniqueOrThrow({ where: { id: player.id } });
    expect(await bcrypt.compare(password, raw.password)).toBe(true);
    for (const secret of ['password', 'hashedRefreshToken', 'resetPasswordToken'])
      expect(player).not.toHaveProperty(secret);
    await request(server).post('/admin/users').auth(token, { type: 'bearer' }).send(input).expect(409);
    const search = await request(server)
      .get(`/admin/users?q=${encodeURIComponent(prefix)}`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect((search.body as { data: { total: number } }).data.total).toBe(2);
  });
  it('updates progression and balances atomically, rejects stale saves, invalid XP, battles and unsafe level decreases', async () => {
    const input = {
      ...profileEdit(),
      level: 10,
      experience: 900,
      gold: 12345,
      gems: 333,
      coinsOfHonour: 42,
      freeAttributes: 45,
    };
    player = data(
      await request(server).post(`/admin/users/${player.id}`).auth(token, { type: 'bearer' }).send(input).expect(201),
    );
    expect(player.gameProfile).toMatchObject({ level: 10, gold: 12345, gems: 333, experience: 900 });
    expect(player.skillPoints?.total).toBe(10);
    await request(server)
      .post(`/admin/users/${player.id}`)
      .auth(token, { type: 'bearer' })
      .send({ ...input, gold: 1 })
      .expect(409);
    await request(server)
      .post(`/admin/users/${player.id}`)
      .auth(token, { type: 'bearer' })
      .send({ ...profileEdit(), experience: 10000 })
      .expect(400);
    await request(server)
      .post(`/admin/users/${player.id}`)
      .auth(token, { type: 'bearer' })
      .send({ ...profileEdit(), gold: -1 })
      .expect(400);
    monsters.hasActiveBattle.mockReturnValue(true);
    await request(server)
      .post(`/admin/users/${player.id}`)
      .auth(token, { type: 'bearer' })
      .send(profileEdit())
      .expect(409);
    monsters.hasActiveBattle.mockReturnValue(false);
    await prisma.gameProfileSkillTree.create({
      data: { profileId: player.gameProfile!.id, class: 'WARRIOR', ranks: { 'warrior-might': 3 } },
    });
    await reload();
    await request(server)
      .post(`/admin/users/${player.id}`)
      .auth(token, { type: 'bearer' })
      .send({ ...profileEdit(), level: 1, experience: 0 })
      .expect(400);
    expect((await prisma.gameProfile.findUniqueOrThrow({ where: { userId: player.id } })).gold).toBe(12345);
    const audit = await prisma.adminUserAudit.findFirstOrThrow({
      where: { userId: player.id, action: 'UPDATE_PROFILE' },
    });
    expect(audit.adminId).toBe(adminId);
    expect(JSON.stringify(audit.after)).not.toContain('password');
  });
  it('grants, changes quantity, unequips and removes only the selected player inventory entries', async () => {
    const catalog = await request(server)
      .get(`/admin/users/items?q=${itemId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(
      (catalog.body as { data: { entries: Array<{ id: number }> } }).data.entries.some((entry) => entry.id === itemId),
    ).toBe(true);
    player = data(
      await request(server)
        .post(`/admin/users/${player.id}/inventory/add`)
        .auth(token, { type: 'bearer' })
        .send({ expectedState: player.stateToken, reason, itemId, quantity: 3 })
        .expect(201),
    );
    const entry = player.gameProfile!.inventory.find((item) => item.itemId === itemId)!;
    expect(entry.quantity).toBe(3);
    expect(entry.isEquiped).toBe(false);
    const oldQuote = player.stateToken;
    player = data(
      await request(server)
        .post(`/admin/users/${player.id}/inventory/${entry.id}`)
        .auth(token, { type: 'bearer' })
        .send({ expectedState: player.stateToken, reason, action: 'quantity', quantity: 5 })
        .expect(201),
    );
    await request(server)
      .post(`/admin/users/${player.id}/inventory/${entry.id}`)
      .auth(token, { type: 'bearer' })
      .send({ expectedState: oldQuote, reason, action: 'remove' })
      .expect(409);
    const other = await prisma.user.create({
      data: {
        name: 'Other player',
        email: `${prefix}-other@example.invalid`,
        password: 'unused',
        gameProfile: { create: { inventory: { create: { itemId, quantity: 1, isEquiped: false } } } },
      },
      include: { gameProfile: { include: { inventory: true } } },
    });
    const otherEntry = other.gameProfile!.inventory[0];
    await request(server)
      .post(`/admin/users/${player.id}/inventory/${otherEntry.id}`)
      .auth(token, { type: 'bearer' })
      .send({ expectedState: player.stateToken, reason, action: 'remove' })
      .expect(404);
    const equipped = player.gameProfile!.inventory.find((item) => item.isEquiped)!;
    player = data(
      await request(server)
        .post(`/admin/users/${player.id}/inventory/${equipped.id}`)
        .auth(token, { type: 'bearer' })
        .send({ expectedState: player.stateToken, reason, action: 'unequip' })
        .expect(201),
    );
    expect(player.gameProfile!.inventory.find((item) => item.id === equipped.id)).toMatchObject({
      isEquiped: false,
      slot: null,
    });
    player = data(
      await request(server)
        .post(`/admin/users/${player.id}/inventory/${entry.id}`)
        .auth(token, { type: 'bearer' })
        .send({ expectedState: player.stateToken, reason, action: 'remove' })
        .expect(201),
    );
    expect(player.gameProfile!.inventory.some((item) => item.id === entry.id)).toBe(false);
    expect(await prisma.inventoryItem.findUnique({ where: { id: otherEntry.id } })).not.toBeNull();
    expect(await prisma.item.findUnique({ where: { id: itemId } })).not.toBeNull();
    expect(await prisma.adminUserAudit.count({ where: { userId: player.id } })).toBe(6);
    // Full backpack: no entry is inserted, and no audit record is written on failure.
    await prisma.inventoryItem.createMany({
      data: Array.from({ length: 23 }, () => ({
        gameProfileId: player.gameProfile!.id,
        itemId,
        quantity: 1,
        isEquiped: false,
        upgradeType: 'DAMAGE' as const,
        upgradeValue: 1,
      })),
    });
    await reload();
    await request(server)
      .post(`/admin/users/${player.id}/inventory/add`)
      .auth(token, { type: 'bearer' })
      .send({ expectedState: player.stateToken, reason, itemId, quantity: 1 })
      .expect(400);
    expect(await prisma.adminUserAudit.count({ where: { userId: player.id } })).toBe(6);
  });
});
