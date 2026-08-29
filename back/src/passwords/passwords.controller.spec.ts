import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PasswordsController } from './passwords.controller';
import { PasswordsService } from './passwords.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

describe('PasswordsController', () => {
  let controller: PasswordsController;

  const mockPasswordsService = {
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PasswordsController],
      providers: [
        {
          provide: PasswordsService,
          useValue: mockPasswordsService,
        },
      ],
    }).compile();

    controller = module.get<PasswordsController>(PasswordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('should call passwordsService.requestPasswordReset and return success message', async () => {
      const dto: ForgotPasswordDto = { email: 'test@example.com' };
      mockPasswordsService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.forgotPassword(dto);

      expect(mockPasswordsService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        message: 'Если аккаунт существует, инструкции будут отправлены на email.',
      });
    });
  });

  describe('resetPassword', () => {
    it('should call passwordsService.resetPassword and return success message', async () => {
      const dto: ResetPasswordDto = { token: 'some_valid_token_string', password: 'newPassword123' };
      mockPasswordsService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword(dto);

      expect(mockPasswordsService.resetPassword).toHaveBeenCalledWith('some_valid_token_string', 'newPassword123');
      expect(result).toEqual({
        message: 'Пароль успешно изменён',
      });
    });
  });
});
