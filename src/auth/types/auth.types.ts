export type JwtTokenType = 'access' | 'refresh';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  typ: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  typ: 'refresh';
  jti: string;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}
