import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBy', () => {
    it('should return a user by given conditions (e.g., email)', async () => {
      const expectedUser = { id: 1, email: 'john@mail.ru', password: 'hashed_password' };

      mockPrismaService.user.findFirst.mockResolvedValue(expectedUser);

      const user = await service.findBy({ email: 'john@mail.ru' });

      expect(user).toEqual(expectedUser);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@mail.ru' },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const expectedUser = { id: 1, email: 'john@mail.ru', password: 'hashed_password' };

      mockPrismaService.user.findUnique.mockResolvedValue(expectedUser);

      const user = await service.findById(1);

      expect(user).toEqual(expectedUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe('update', () => {
    it('should update and return the user', async () => {
      const updateData = { resetPasswordToken: 'new_token' };
      const expectedUser = { id: 1, email: 'john@mail.ru', resetPasswordToken: 'new_token' };

      mockPrismaService.user.update.mockResolvedValue(expectedUser);

      const user = await service.update(1, updateData);

      expect(user).toEqual(expectedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateData,
      });
    });
  });
});
