import { BadRequestException, NotFoundException, ValidationPipe } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import type { PrismaService } from '../prisma.service';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

describe('onboarding persistence', () => {
  const profile = { onboardingStep: 0, onboardingCompleted: false };
  const gameProfile = {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = { gameProfile, $transaction: jest.fn() };
  const service = new UsersService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.clearAllMocks();
    profile.onboardingStep = 0;
    profile.onboardingCompleted = false;
    prisma.$transaction.mockImplementation((operation: (client: typeof prisma) => unknown) => operation(prisma));
    gameProfile.updateMany.mockImplementation(
      (args: { where: { onboardingCompleted: boolean }; data: Partial<typeof profile> }) => {
        if (profile.onboardingCompleted === args.where.onboardingCompleted) Object.assign(profile, args.data);
        return Promise.resolve({ count: 1 });
      },
    );
    gameProfile.findUnique.mockImplementation(() => Promise.resolve({ ...profile }));
  });

  it('saves progress only for the authenticated user', async () => {
    const controller = new UsersController(service);
    await expect(controller.updateOnboarding({ user: { sub: 42 } } as RequestWithUser, { step: 3 })).resolves.toEqual({
      step: 3,
      completed: false,
    });
    expect(gameProfile.updateMany).toHaveBeenCalledWith({
      where: { userId: 42, onboardingCompleted: false },
      data: { onboardingStep: 3 },
    });
    expect(gameProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 42 },
      select: { onboardingStep: true, onboardingCompleted: true },
    });
  });

  it('does not reopen a skipped or completed tour when stale progress arrives', async () => {
    await expect(service.updateOnboarding(42, { step: 5, completed: true })).resolves.toEqual({
      step: 5,
      completed: true,
    });
    await expect(service.updateOnboarding(42, { step: 1, completed: false })).resolves.toEqual({
      step: 5,
      completed: true,
    });
  });

  it('rejects empty changes and missing profiles', async () => {
    await expect(service.updateOnboarding(42, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(gameProfile.updateMany).not.toHaveBeenCalled();
    gameProfile.findUnique.mockResolvedValueOnce(null);
    await expect(service.updateOnboarding(42, { step: 1 })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('onboarding payload validation', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: UpdateOnboardingDto });
  it.each([
    { step: -1 },
    { step: 6 },
    { step: 1.5 },
    { step: '2' },
    { step: null },
    { completed: 'false' },
    { completed: 1 },
    { completed: null },
    { step: 1, userId: 123 },
  ])('rejects malformed state %j', async (payload) => {
    await expect(validate(payload)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('accepts bounded progress and boolean completion', async () => {
    await expect(validate({ step: 0 })).resolves.toMatchObject({ step: 0 });
    await expect(validate({ step: 5, completed: true })).resolves.toMatchObject({ step: 5, completed: true });
  });
});
