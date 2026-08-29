import { BadRequestException, Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class PasswordsService {
  constructor(
    private usersService: UsersService,
    private mailerService: MailerService,
  ) {}

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findBy({ email });

    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    await this.usersService.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: new Date(Date.now() + Number(process.env.RESET_PASSWORD_TOKEN_LIFETIME ?? 3_600_000)),
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Восстановление пароля',
      template: './reset-password',
      context: { resetLink: `${process.env.FRONT_URL}/reset-password?token=${resetToken}` },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findBy({ resetPasswordToken: token });

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Токен недействителен или его срок действия истёк');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      hashedRefreshToken: null,
    });
  }
}
