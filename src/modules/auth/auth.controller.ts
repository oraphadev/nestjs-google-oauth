import {
  Body,
  Controller,
  Get,
  Post,
  Redirect,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthGuard } from './providers/google/google-auth.guard';
import { JwtAuthGuard } from './providers/jwt/jwt-auth.guard';
import { AuthService } from './auth.service';
import type { AuthUser, OAuthProfile } from './types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  @Redirect()
  async googleAuthRedirect(
    @Req()
    req: {
      user: OAuthProfile;
      query?: { state?: string };
      url?: string;
      raw?: { url?: string };
    },
  ): Promise<
    | { url: string; statusCode: number }
    | Awaited<ReturnType<AuthService['loginWithGoogle']>>
  > {
    const loginResult = await this.authService.loginWithGoogle(req.user);
    const callbackUrl = this.getCallbackUrlFromState(
      req.query?.state ?? this.extractStateFromRawUrl(req),
    );

    if (!callbackUrl) {
      return loginResult;
    }

    const redirectUrl = new URL(callbackUrl);
    redirectUrl.searchParams.set('accessToken', loginResult.accessToken);
    redirectUrl.searchParams.set('refreshToken', loginResult.refreshToken);

    return {
      url: redirectUrl.toString(),
      statusCode: 302,
    };
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshTokens(body?.refreshToken ?? '');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: { user: AuthUser }) {
    return req.user;
  }

  private getCallbackUrlFromState(state?: string): string | undefined {
    if (!state) {
      return undefined;
    }

    try {
      const decodedState = Buffer.from(state, 'base64url').toString('utf-8');
      const parsedState = JSON.parse(decodedState) as { callbackUrl?: string };
      const callbackUrl = parsedState.callbackUrl;

      if (!callbackUrl) {
        return undefined;
      }

      const parsedCallback = new URL(callbackUrl);
      if (!['http:', 'https:'].includes(parsedCallback.protocol)) {
        return undefined;
      }

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      if (!frontendUrl) {
        return callbackUrl;
      }

      const frontendOrigin = new URL(frontendUrl).origin;
      if (parsedCallback.origin !== frontendOrigin) {
        return undefined;
      }

      return callbackUrl;
    } catch {
      return undefined;
    }
  }

  private extractStateFromRawUrl(req: {
    url?: string;
    raw?: { url?: string };
  }): string | undefined {
    const rawUrl = req.raw?.url ?? req.url;
    if (!rawUrl) {
      return undefined;
    }

    const [, queryString] = rawUrl.split('?');
    if (!queryString) {
      return undefined;
    }

    return new URLSearchParams(queryString).get('state') ?? undefined;
  }
}
