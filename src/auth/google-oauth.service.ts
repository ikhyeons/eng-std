import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GoogleProfile } from './types/auth.types';

interface GoogleStatePayload {
  typ: 'google_oauth';
}

interface GoogleTokenResponse {
  id_token?: string;
  error_description?: string;
}

interface GoogleIdTokenInfo {
  aud?: string;
  iss?: string;
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  error?: string;
}

@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  buildAuthUrl(): string {
    this.assertConfigured();
    const state = this.jwt.sign(
      { typ: 'google_oauth' } satisfies GoogleStatePayload,
      {
        secret: this.stateSecret,
        expiresIn: '10m' as JwtSignOptions['expiresIn'],
      },
    );

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.getCallbackUrl());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('include_granted_scopes', 'true');
    return url.toString();
  }

  async handleCallback(params: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    if (params.error === 'access_denied') {
      throw new UnauthorizedException('Google 로그인을 취소했습니다.');
    }
    if (params.error) {
      throw new UnauthorizedException('Google 로그인에 실패했습니다.');
    }
    if (!params.code || !params.state) {
      throw new UnauthorizedException('Google 로그인 정보가 올바르지 않습니다.');
    }

    await this.verifyState(params.state);
    const profile = await this.exchangeCode(params.code);
    return this.authService.createGoogleLoginTicket(profile);
  }

  private async exchangeCode(code: string): Promise<GoogleProfile> {
    this.assertConfigured();

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.getCallbackUrl(),
        grant_type: 'authorization_code',
      }),
    });
    const tokens = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokens.id_token) {
      throw new UnauthorizedException(
        tokens.error_description || 'Google 계정 정보를 확인하지 못했습니다.',
      );
    }

    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
    );
    const payload = (await infoRes.json()) as GoogleIdTokenInfo;
    if (!infoRes.ok || payload.error) {
      throw new UnauthorizedException('Google 계정 정보를 확인하지 못했습니다.');
    }

    const issuerOk =
      payload.iss === 'accounts.google.com' ||
      payload.iss === 'https://accounts.google.com';
    if (!issuerOk || payload.aud !== this.clientId || !payload.sub) {
      throw new UnauthorizedException('Google 계정 정보를 확인하지 못했습니다.');
    }
    if (!payload.email) {
      throw new UnauthorizedException(
        'Google 계정에서 이메일 제공에 동의해 주세요.',
      );
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name?.trim() || payload.email.split('@')[0],
      avatarUrl: payload.picture ?? null,
    };
  }

  private async verifyState(state: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<GoogleStatePayload>(state, {
        secret: this.stateSecret,
      });
      if (payload.typ !== 'google_oauth') {
        throw new UnauthorizedException('유효하지 않은 로그인 요청입니다.');
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(
        '로그인 요청이 만료되었습니다. 다시 시도해 주세요.',
      );
    }
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Google 로그인이 아직 설정되지 않았습니다. 서버 환경 변수를 확인해 주세요.',
      );
    }
  }

  private get clientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID', '').trim();
  }

  private get clientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET', '').trim();
  }

  getCallbackUrl(): string {
    const fromEnv = this.config.get<string>('GOOGLE_CALLBACK_URL')?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    const port = this.config.get<string>('PORT', '3000');
    return `http://localhost:${port}/api/auth/google/callback`;
  }

  private get stateSecret(): string {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }
}
