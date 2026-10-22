import { ValidationPipe } from '@nestjs/common';
import { AdminUsersQueryDto, CreateAdminUserDto, GrantAdminItemDto, UpdateAdminUserDto } from './admin-users.dto';
import { AttributeType } from '../../generated/client';

describe('admin user validation', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const update = {
    expectedState: 'a'.repeat(64),
    reason: 'Support correction',
    name: 'Player',
    email: 'player@example.invalid',
    level: 1,
    experience: 0,
    gold: 100,
    gems: 5,
    coinsOfHonour: 0,
    freeAttributes: 0,
    attributes: Object.values(AttributeType).map((name) => ({ name, value: 5 })),
  };
  it('accepts valid edits and bounded search pagination', async () => {
    await expect(pipe.transform(update, { type: 'body', metatype: UpdateAdminUserDto })).resolves.toEqual(update);
    await expect(
      pipe.transform({ q: ' Hero ', page: '2' }, { type: 'query', metatype: AdminUsersQueryDto }),
    ).resolves.toEqual({ q: 'Hero', page: 2 });
  });
  it.each([
    { gold: -1 },
    { gems: 1.2 },
    { gold: 2147483648 },
    { level: 0 },
    { level: 101 },
    { experience: null },
    { role: 'ADMIN' },
    { password: 'secret' },
    { expectedState: 'bad' },
    { reason: '  ' },
    { attributes: [] },
    { attributes: Array(5).fill({ name: 'STRENGTH', value: 5 }) },
    { attributes: [{ name: 'DAMAGE', value: 5 }] },
  ])('rejects unsafe edit %j', async (fields) => {
    await expect(
      pipe.transform({ ...update, ...fields }, { type: 'body', metatype: UpdateAdminUserDto }),
    ).rejects.toThrow();
  });
  it('enforces registration rules and prevents privileged account creation', async () => {
    const input = {
      email: 'hero@example.invalid',
      password: 'StrongPassword123!x',
      name: 'Hero',
      reason: 'Create test player',
    };
    await expect(pipe.transform(input, { type: 'body', metatype: CreateAdminUserDto })).resolves.toMatchObject({
      name: 'Hero',
    });
    for (const fields of [{ role: 'ADMIN' }, { password: 'weak' }, { email: 'invalid' }])
      await expect(
        pipe.transform({ ...input, ...fields }, { type: 'body', metatype: CreateAdminUserDto }),
      ).rejects.toThrow();
  });
  it.each([0, -1, 1.5, 10000])('rejects invalid grant quantity %s', async (quantity) => {
    await expect(
      pipe.transform(
        { expectedState: update.expectedState, reason: update.reason, itemId: 1, quantity },
        { type: 'body', metatype: GrantAdminItemDto },
      ),
    ).rejects.toThrow();
  });
});
