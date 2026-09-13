import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

describe('development gems', () => {
  const update = jest.fn();
  const service = new UsersService({ gameProfile: { update } } as unknown as PrismaService);
  const originalEnvironment = process.env;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnvironment };
  });
  afterEach(() => {
    process.env = originalEnvironment;
  });

  it('blocks production even if started with a development lifecycle name', async () => {
    process.env.NODE_ENV = 'production';
    process.env.npm_lifecycle_event = 'start:dev';
    await expect(service.claimDevGems(7)).rejects.toThrow('Development only');
    expect(update).not.toHaveBeenCalled();
  });
  it('blocks unconfigured environments', async () => {
    delete process.env.NODE_ENV;
    delete process.env.npm_lifecycle_event;
    await expect(service.claimDevGems(7)).rejects.toThrow('Development only');
    expect(update).not.toHaveBeenCalled();
  });
  it('grants a fixed 100 gems to the authenticated development player', async () => {
    process.env.NODE_ENV = 'development';
    await service.claimDevGems(7);
    expect(update).toHaveBeenCalledWith({
      where: { userId: 7 },
      data: { gems: { increment: 100 } },
      select: { gems: true },
    });
  });
});
