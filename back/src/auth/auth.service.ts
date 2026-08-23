import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

export interface SignInResult {
  access_token: string;
  refresh_token: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(
    email: string,
    password: string,
  ): Promise<SignInResult> {
    const user = await this.usersService.findOne(email);

    if (user?.password !== password) {
      throw new UnauthorizedException();
    }

    const payload = { sub: user.id, email: user.email };
    const expiresIn = 60;

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: `${expiresIn}s`,
    });

    const refresh_token = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );

    return { access_token, refresh_token, expiresIn };
  }

  async refreshTokens(
    sub: number,
  ): Promise<{ access_token: string; expiresIn: number; refresh_token: string }> {
    const expiresIn = 60;

    const access_token = await this.jwtService.signAsync(
      { sub },
      { expiresIn: `${expiresIn}s` },
    );

    const refresh_token = await this.jwtService.signAsync(
      { sub, type: 'refresh' },
      { expiresIn: '7d' },
    );

    return { access_token, expiresIn, refresh_token };
  }
}
