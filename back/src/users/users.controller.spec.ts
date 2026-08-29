import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return the user identified by the token subject', async () => {
      const req = { user: { sub: 7, email: 'me@example.com' } };
      const expectedUser = { id: 7, email: 'me@example.com' };
      mockUsersService.findById.mockResolvedValue(expectedUser);

      const result = await controller.getCurrentUser(req as never);

      expect(mockUsersService.findById).toHaveBeenCalledWith(7);
      expect(result).toEqual(expectedUser);
    });
  });
});
