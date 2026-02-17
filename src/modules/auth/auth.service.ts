import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { users } from '../database/schema';
import type { AuthJwtPayload, AuthUser, OAuthProfile } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  async loginWithGoogle(profile: OAuthProfile) {
    const user = await this.findOrCreateGoogleUser(profile);

    const tokens = this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  refreshTokens(refreshToken: string) {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.getOrThrow<string>('JWT_SECRET');

    let payload: AuthJwtPayload;
    try {
      payload = this.jwtService.verify<AuthJwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user: AuthUser = {
      id: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      picture: payload.picture,
    };

    return this.generateTokens(user);
  }

  private generateTokens(user: AuthUser) {
    const accessSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? accessSecret;

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        ...user,
        tokenType: 'access',
      },
      {
        secret: accessSecret,
        expiresIn: '5m',
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        ...user,
        tokenType: 'refresh',
      },
      {
        secret: refreshSecret,
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async findOrCreateGoogleUser(
    profile: OAuthProfile,
  ): Promise<AuthUser> {
    const [existingUser] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.googleId, profile.googleId))
      .limit(1);

    if (existingUser) {
      return {
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        picture: existingUser.picture,
      };
    }

    const [createdUser] = await this.databaseService.db
      .insert(users)
      .values({
        googleId: profile.googleId,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        picture: profile.picture,
      })
      .returning();

    return {
      id: createdUser.id,
      email: createdUser.email,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      picture: createdUser.picture,
    };
  }
}
