import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import type { Server } from 'node:http';
import { PrismaService } from '../prisma.service';
import { FeedbackModule } from './feedback.module';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';

const databaseTests = process.env.FEEDBACK_DB_TEST === '1' ? describe : describe.skip;
databaseTests('Feedback HTTP permissions and independent admin sessions', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  const users: Array<{ id: number; email: string }> = [];
  let playerToken: string;
  let otherToken: string;
  let adminGameToken: string;
  const password = randomUUID();
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ global: true }), FeedbackModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
    const hash = await bcrypt.hash(password, 10);
    for (const role of ['USER', 'USER', 'ADMIN'] as const)
      users.push(
        await prisma.user.create({
          data: { name: 'Feedback test', email: `feedback-${randomUUID()}@example.invalid`, password: hash, role },
          select: { id: true, email: true },
        }),
      );
    const jwt = app.get(JwtService);
    [playerToken, otherToken, adminGameToken] = users.map((user) =>
      jwt.sign(
        { sub: user.id, email: user.email },
        { secret: process.env.JWT_SECRET || 'access-secret', expiresIn: '5m' },
      ),
    );
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.feedback.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
      await prisma.$disconnect();
    }
    if (app) await app.close();
  });
  it('sends feedback, isolates players and tokens, replies once, and revokes admin logout', async () => {
    const id = randomUUID();
    const body = {
      requestId: id,
      category: 'EXPERIENCE',
      rating: 4,
      message: 'The game is fun but I would like more quests.',
    };
    await request(server).post('/feedback').send(body).expect(401);
    await request(server)
      .post('/feedback')
      .auth(playerToken, { type: 'bearer' })
      .send({ ...body, userId: users[1].id })
      .expect(400);
    await request(server).post('/feedback').auth(playerToken, { type: 'bearer' }).send(body).expect(201);
    await request(server).post('/feedback').auth(playerToken, { type: 'bearer' }).send(body).expect(201);
    expect(await prisma.feedback.count({ where: { id } })).toBe(1);
    await request(server).get(`/feedback/${id}`).auth(otherToken, { type: 'bearer' }).expect(404);
    const own = await request(server).get('/feedback?page=1').auth(playerToken, { type: 'bearer' }).expect(200);
    expect((own.body as { data: { total: number } }).data.total).toBe(1);
    await request(server).get('/admin/feedback').expect(401);
    await request(server).get('/admin/feedback').auth(adminGameToken, { type: 'bearer' }).expect(401);
    await request(server).post('/admin/auth/login').send({ email: users[0].email, password }).expect(401);
    const login = await request(server).post('/admin/auth/login').send({ email: users[2].email, password }).expect(200);
    const token = (login.body as { data: { token: string } }).data.token;
    expect(token).toMatch(/^adm_/);
    // Exercise real guards and validation without changing global game prices.
    await request(server).get('/admin/gem-prices').expect(401);
    await request(server).get('/admin/gem-prices').auth(adminGameToken, { type: 'bearer' }).expect(401);
    await request(server)
      .post('/admin/gem-prices')
      .auth(playerToken, { type: 'bearer' })
      .send({ key: 'SHOP_REFRESH', cost: 7 })
      .expect(401);
    const prices = await request(server).get('/admin/gem-prices').auth(token, { type: 'bearer' }).expect(200);
    expect((prices.body as { data: unknown[] }).data).toHaveLength(6);
    await request(server)
      .post('/admin/gem-prices')
      .auth(token, { type: 'bearer' })
      .send({ key: 'SHOP_REFRESH', cost: -1 })
      .expect(400);
    await request(server).get('/game/gem-prices').expect(401);
    await request(server).get('/game/gem-prices').auth(playerToken, { type: 'bearer' }).expect(200);
    await request(server).get('/feedback').auth(token, { type: 'bearer' }).expect(401);
    await request(server).get('/admin/feedback?page=1&status=OPEN').auth(token, { type: 'bearer' }).expect(200);
    const reply = { requestId: randomUUID(), message: 'Thank you! More quests are being planned.' };
    await request(server)
      .post(`/admin/feedback/${id}/replies`)
      .auth(playerToken, { type: 'bearer' })
      .send(reply)
      .expect(401);
    await request(server).post(`/admin/feedback/${id}/replies`).auth(token, { type: 'bearer' }).send(reply).expect(201);
    await request(server).post(`/admin/feedback/${id}/replies`).auth(token, { type: 'bearer' }).send(reply).expect(201);
    const result = await request(server).get(`/feedback/${id}`).auth(playerToken, { type: 'bearer' }).expect(200);
    const detail = (result.body as { data: { status: string; replies: Array<{ message: string }> } }).data;
    expect(detail.status).toBe('REPLIED');
    expect(detail.replies).toHaveLength(1);
    expect(detail.replies[0].message).toBe(reply.message);
    await request(server)
      .post(`/admin/feedback/${id}/status`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'CLOSED' })
      .expect(201);
    await request(server)
      .post(`/admin/feedback/${id}/replies`)
      .auth(token, { type: 'bearer' })
      .send({ ...reply, requestId: randomUUID() })
      .expect(400);
    await prisma.user.update({ where: { id: users[2].id }, data: { role: 'USER' } });
    await request(server).get('/admin/auth/me').auth(token, { type: 'bearer' }).expect(401);
    await prisma.user.update({ where: { id: users[2].id }, data: { role: 'ADMIN' } });
    await request(server).post('/admin/auth/logout').auth(token, { type: 'bearer' }).send({}).expect(201);
    await request(server).get('/admin/feedback').auth(token, { type: 'bearer' }).expect(401);
    await request(server).get('/feedback').auth(playerToken, { type: 'bearer' }).expect(200);
  });
});
