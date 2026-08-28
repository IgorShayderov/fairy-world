import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { UserModel } from '../../generated/prisma/models';
import type { TokenResult } from './interfaces/token-payload.interface';
import { UsersService } from '../users/users.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async signIn(email: string, password: string): Promise<TokenResult> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    return await this.generateTokens(user);
  }

  async refreshTokens(sub: number, oldRefreshToken: string): Promise<TokenResult> {
    const user = await this.usersService.findById(sub);

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const isRefreshTokenValid = await bcrypt.compare(oldRefreshToken, user.hashedRefreshToken);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access Denied');
    }

    return this.generateTokens(user);
  }

  private async generateTokens(user: UserModel): Promise<TokenResult> {
    const payload = { sub: user.id, email: user.email };
    const expiresIn = parseInt(process.env.ACCESS_COOKIE_LIFETIME as string, 10);

    const refreshExpiresIn = parseInt(process.env.REFRESH_COOKIE_LIFETIME as string, 10);

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn, secret: process.env.JWT_SECRET }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh' },
        { expiresIn: refreshExpiresIn, secret: process.env.JWT_SECRET },
      ),
    ]);

    await this.updateRefreshToken(user.id, refresh_token);

    return {
      access_token,
      refresh_token,
      expiresIn,
    };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.update(userId, { hashedRefreshToken });
  }

  async logout(userId: number) {
    await this.usersService.update(userId, { hashedRefreshToken: null });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findOne(email);

    // Если юзера нет, мы ничего не делаем, но и ошибку НЕ ВЫБРАСЫВАЕМ.
    // Это защищает от перебора email-адресов злоумышленниками.
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Токен недействителен или его срок действия истёк');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + Number(process.env.RESET_PASSWORD_TOKEN_LIFETIME ?? 3_600_000));

    await this.usersService.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetPasswordExpires,
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Восстановление пароля',
      html: `
        <h2>Здравствуйте!</h2>
        <p>Вы запросили сброс пароля. Перейдите по ссылке ниже, чтобы задать новый:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>
        <p>Ссылка действительна в течение 1 часа.</p>
      `,
    });
  }
}
