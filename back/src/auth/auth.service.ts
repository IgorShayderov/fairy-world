import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, RegisterResponse } from './register.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './reset-password.dto';

export interface SignInResult {
  access_token: string;
  refresh_token: string;
  expiresIn: number;
}

/**
 * Service handling authentication logic including sign-in, registration,
 * and password reset functionality.
 */
@Injectable()
export class AuthService {
  // In-memory map for password reset tokens; in production use Redis or DB
  private resetTokens: Map<string, { userId: number; expiresAt: Date }> = new Map();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Authenticates a user by email and password.
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    const user = await this.usersService.findOne(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user.id, email: user.email };
    const expiresIn = 60;

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: `${expiresIn}s`,
    });

    const refresh_token = await this.jwtService.signAsync({ sub: user.id, type: 'refresh' }, { expiresIn: '7d' });

    return { access_token, refresh_token, expiresIn };
  }

  /**
   * Generates JWT tokens for token refresh flow.
   */
  async refreshTokens(sub: number): Promise<{
    access_token: string;
    expiresIn: number;
    refresh_token: string;
  }> {
    const expiresIn = 60;

    const access_token = await this.jwtService.signAsync({ sub }, { expiresIn: `${expiresIn}s` });
    const refresh_token = await this.jwtService.signAsync({ sub, type: 'refresh' }, { expiresIn: '7d' });

    return { access_token, expiresIn, refresh_token };
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
   * Handles password reset request: finds user, generates token, logs it (simulate email).
   */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findOne(dto.email);

    if (!user) {
      // Always return success to prevent user enumeration
      return { message: 'Если аккаунт существует, инструкции для восстановления будут отправлены на email.' };
    }

    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 15 * 60_000); // 15 minutes

    this.resetTokens.set(token, { userId: user.id, expiresAt });

    // TODO: In production, send email with link containing token
    console.log(`🔑 [PASSWORD RESET] Token for ${user.email}: ${token} (expires at ${expiresAt.toISOString()})`);

    return { message: 'Если аккаунт существует, инструкции для восстановления будут отправлены на email.' };
  }

  /**
   * Resets user password using a valid token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const record = this.resetTokens.get(dto.token);

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Недействительный или просроченный токен.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    // Invalidate token after use
    this.resetTokens.delete(dto.token);

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
