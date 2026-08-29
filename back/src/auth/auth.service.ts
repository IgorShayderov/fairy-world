import { Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, RegisterResponse } from './register.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './reset-password.dto';

import { UserModel } from '../../generated/prisma/models';
import type { TokenResult } from './interfaces/token-payload.interface';
import { UsersService } from '../users/users.service';

/**
 * Service handling authentication logic including sign-in, registration,
 * and password reset functionality.
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async signIn(email: string, password: string): Promise<TokenResult> {
    const user = await this.usersService.findBy({ email });

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

  /**
   * Registers a new user with required and optional fields.
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    // Check if user already exists
    const existing = await this.usersService.findOne(dto.email);
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        gender: dto.gender ? dto.gender : undefined,
        country: dto.country,
        city: dto.city,
        language: dto.language,
      },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        country: true,
        city: true,
        language: true,
      },
    });

    const payload = { sub: user.id, email: user.email };
    const expiresIn = 60;
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: `${expiresIn}s`,
    });

    return { access_token, expiresIn, user };
  }

  /**
   * Handles password reset request: finds user, generates token, stores in DB, logs it (simulate email).
   */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findOne(dto.email);

    if (!user) {
      // Always return success to prevent user enumeration
      return { message: 'Если аккаунт существует, инструкции для восстановления будут отправлены на email.' };
    }

    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 15 * 60_000); // 15 minutes

    // Store token in database (hashed for security)
    const tokenHash = await bcrypt.hash(token, 10);
    await this.prisma.passwordResetToken.create({
      data: {
        token: tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // TODO: In production, send email with link containing token
    console.log(`🔑 [PASSWORD RESET] Token for ${user.email}: ${token} (expires at ${expiresAt.toISOString()})`);

    return { message: 'Если аккаунт существует, инструкции для восстановления будут отправлены на email.' };
  }

  /**
   * Resets user password using a valid token from database.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Find token in database (not expired, not used)
    const tokens = await this.prisma.passwordResetToken.findMany({
      where: {
        expiresAt: { gt: new Date() },
        used: false,
      },
      include: { user: true },
    });

    // Check each token hash against the provided token
    let validToken: (typeof tokens)[0] | null = null;
    for (const t of tokens) {
      const isValid = await bcrypt.compare(dto.token, t.token);
      if (isValid) {
        validToken = t;
        break;
      }
    }

    if (!validToken) {
      throw new BadRequestException('Недействительный или просроченный токен.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: validToken.userId },
      data: { password: hashedPassword },
    });

    // Invalidate token after use
    await this.prisma.passwordResetToken.update({
      where: { id: validToken.id },
      data: { used: true },
    });

    return { message: 'Пароль успешно обновлён.' };
  }

  /**
   * Generates a cryptographically secure random token.
   */
  private generateSecureToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
}
