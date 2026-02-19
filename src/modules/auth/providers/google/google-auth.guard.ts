import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      query?: { callbackUrl?: string };
    }>();

    const callbackUrl = request.query?.callbackUrl;

    if (!callbackUrl) {
      return {
        session: false,
        prompt: 'select_account',
      };
    }

    return {
      session: false,
      prompt: 'select_account',
      state: Buffer.from(
        JSON.stringify({
          callbackUrl,
        }),
      ).toString('base64url'),
    };
  }
}
