import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { jwtSecret, refreshLifetimeMs, refreshTokenHash } from './token-security';

import type { AccessTokenPayload, TokenResult } from './interfaces/token-payload.interface';
import { UsersService } from '../users/users.service';
import { AttributeType, EquipmentType, ItemRarity, StatType } from '../../generated/client';
import { ItemGeneratorService } from '../items/item-generator.service';
import { STARTING_ATTRIBUTE_VALUE, STARTING_FREE_ATTRIBUTES, STARTING_PROPERTIES } from '../users/player-defaults';

@Injectable()
export class AuthService {
  private dummyPasswordHash?: Promise<string>;
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private itemGenerator: ItemGeneratorService,
  ) {}

  async signIn(email: string, password: string): Promise<TokenResult> {
    const user = await this.usersService.findBy({ email });

    if (!user) this.dummyPasswordHash ??= bcrypt.hash(randomUUID(), 10);
    const isPasswordValid = await bcrypt.compare(password, user?.password ?? (await this.dummyPasswordHash!));
    if (!user || !isPasswordValid) {
      throw new UnauthorizedException();
    }

    return await this.generateTokens(user);
  }

  async refreshTokens(sub: number, oldRefreshToken: string): Promise<TokenResult> {
    const user = await this.usersService.findById(sub);

    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const isRefreshTokenValid = refreshTokenHash(oldRefreshToken) === user.hashedRefreshToken;

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Access Denied');
    }

    return this.generateTokens(user, user.hashedRefreshToken);
  }

  private async generateTokens(user: { id: number; email: string }, previousHash?: string): Promise<TokenResult> {
    const payload = { sub: user.id, email: user.email, type: 'access' };
    const expiresIn = Number(process.env.ACCESS_COOKIE_LIFETIME ?? 900);
    if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) throw new Error('Invalid ACCESS_COOKIE_LIFETIME');

    const refreshExpiresIn = refreshLifetimeMs();
    const secret = jwtSecret();

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn, secret }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh', jti: randomUUID() },
        { expiresIn: refreshExpiresIn / 1000, secret },
      ),
    ]);

    const hashedRefreshToken = refreshTokenHash(refresh_token);
    if (previousHash !== undefined) {
      const updated = await this.prisma.user.updateMany({
        where: { id: user.id, hashedRefreshToken: previousHash },
        data: { hashedRefreshToken },
      });
      if (updated.count !== 1) throw new UnauthorizedException('Refresh token already used');
    } else {
      await this.usersService.update(user.id, { hashedRefreshToken });
    }

    return {
      access_token,
      refresh_token,
      expiresIn,
    };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(refreshToken, {
        secret: jwtSecret(),
        algorithms: ['HS256'],
      });
      if (payload.type !== 'refresh' || !Number.isSafeInteger(payload.sub) || payload.sub <= 0) return;
    } catch {
      return; // Invalid/expired cookies may still be cleared without a database lookup.
    }
    // Revoke only this session, not a newer login that replaced it.
    await this.prisma.user.updateMany({
      where: { id: payload.sub, hashedRefreshToken: refreshTokenHash(refreshToken) },
      data: { hashedRefreshToken: null },
    });
  }

  async register(email: string, password: string): Promise<TokenResult> {
    const existingUser = await this.usersService.findBy({ email });

    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const starterItems: Array<{ id: number; slot: string }> = [];
      for (const starter of [
        { baseItemName: 'Sword', equipmentType: EquipmentType.WEAPON, slot: 'left-hand' },
        { baseItemName: 'Shield', equipmentType: EquipmentType.SHIELD, slot: 'right-hand' },
      ] as const) {
        const item = await this.itemGenerator.generate(
          {
            baseItemName: starter.baseItemName,
            level: 1,
            rarity: ItemRarity.COMMON,
            equipmentType: starter.equipmentType,
          },
          tx,
        );
        starterItems.push({ id: item.id, slot: starter.slot });
      }
      return tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: email.split('@')[0], // derive name from email
          role: 'USER',
          gameProfile: {
            create: {
              gems: 0,
              inventory: {
                create: starterItems.map((item) => ({
                  item: { connect: { id: item.id } },
                  quantity: 1,
                  isEquiped: true,
                  slot: item.slot,
                })),
              },
              freeAttributes: STARTING_FREE_ATTRIBUTES,
              profileAttributes: {
                create: Object.values(AttributeType).map((name) => ({
                  value: STARTING_ATTRIBUTE_VALUE,
                  attribute: { connect: { name } },
                })),
              },
              profileStats: {
                create: Object.values(StatType).map((name) => ({
                  value: STARTING_PROPERTIES[name],
                  stat: { connect: { name } },
                })),
              },
            },
          },
        },
      });
    });

    return this.generateTokens(user);
  }
}
