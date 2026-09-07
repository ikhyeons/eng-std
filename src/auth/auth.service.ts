import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { OAuthTicket } from './entities/oauth-ticket.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenResponseDto, toPublicUser } from './dto/auth-response.dto';
import { GoogleProfile, RefreshTokenPayload } from './types/auth.types';
import { RequestMeta } from '../common/utils/request-meta';
import { parseDurationMs } from '../common/utils/duration';
import {
  hashPassword,
  safeEqual,
  sha256,
  verifyPassword,
} from '../common/utils/crypto';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpires: string;
  private readonly refreshExpires: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(OAuthTicket)
    private readonly ticketRepo: Repository<OAuthTicket>,
  ) {
    this.accessSecret = this.requireSecret('JWT_ACCESS_SECRET');
    this.refreshSecret = this.requireSecret('JWT_REFRESH_SECRET');
    this.accessExpires = this.config.get('JWT_ACCESS_EXPIRES', '15m');
    this.refreshExpires = this.config.get('JWT_REFRESH_EXPIRES', '30d');
  }

  async register(dto: RegisterDto, meta: RequestMeta): Promise<TokenResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const user = await this.usersService.createLocal({
      email,
      passwordHash: await hashPassword(dto.password),
      name: dto.name?.trim() || email.split('@')[0],
    });

    return this.issueSession(user, meta, undefined, dto.rememberMe !== false);
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<TokenResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      await verifyPassword(dto.password, null);
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        '이 계정은 Google로 가입되었습니다. Google 로그인을 이용해 주세요.',
      );
    }

    const matches = await verifyPassword(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    return this.issueSession(user, meta, undefined, dto.rememberMe !== false);
  }

  async refresh(rawToken: string, meta: RequestMeta): Promise<TokenResponseDto> {
    const payload = await this.verifyRefreshToken(rawToken);
    const stored = await this.refreshRepo.findOne({
      where: { id: payload.jti },
    });

    if (!stored) {
      throw new UnauthorizedException(
        '세션이 만료되었습니다. 다시 로그인해 주세요.',
      );
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException(
        '세션이 만료되었습니다. 다시 로그인해 주세요.',
      );
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      stored.revokedAt = new Date();
      await this.refreshRepo.save(stored);
      throw new UnauthorizedException(
        '세션이 만료되었습니다. 다시 로그인해 주세요.',
      );
    }

    if (!safeEqual(stored.tokenHash, sha256(rawToken))) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    if (stored.userId !== payload.sub) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const next = await this.issueSession(
      user,
      meta,
      stored.familyId,
      stored.rememberMe,
    );
    const nextPayload = this.jwt.decode(next.refreshToken) as RefreshTokenPayload;
    stored.revokedAt = new Date();
    stored.replacedBy = nextPayload?.jti ?? null;
    await this.refreshRepo.save(stored);

    return next;
  }

  async logout(rawToken: string): Promise<void> {
    try {
      const payload = await this.verifyRefreshToken(rawToken);
      await this.refreshRepo.update(
        { id: payload.jti, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    } catch {
      /* already invalid */
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshRepo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  me(user: User) {
    return toPublicUser(user);
  }

  async createGoogleLoginTicket(profile: GoogleProfile): Promise<string> {
    const user = await this.upsertGoogleUser(profile);
    const ticket = this.ticketRepo.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      consumedAt: null,
    });
    const saved = await this.ticketRepo.save(ticket);
    return saved.id;
  }

  async exchangeOAuthTicket(
    ticketId: string,
    meta: RequestMeta,
    rememberMe = true,
  ): Promise<TokenResponseDto> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (
      !ticket ||
      ticket.consumedAt ||
      ticket.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(
        'Google 로그인 세션이 만료되었습니다. 다시 시도해 주세요.',
      );
    }

    ticket.consumedAt = new Date();
    await this.ticketRepo.save(ticket);

    const user = await this.usersService.findById(ticket.userId);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return this.issueSession(user, meta, undefined, rememberMe);
  }

  async upsertGoogleUser(profile: GoogleProfile): Promise<User> {
    const googleId = profile.googleId.trim();
    const email = profile.email.toLowerCase().trim();

    const byGoogle = await this.usersService.findByGoogleId(googleId);
    if (byGoogle) {
      return this.usersService.refreshGoogleProfile(byGoogle.id, {
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      });
    }

    const byEmail = await this.usersService.findByEmail(email);
    if (byEmail) {
      return this.usersService.linkGoogle(byEmail.id, {
        googleId,
        avatarUrl: profile.avatarUrl,
        name: profile.name,
      });
    }

    return this.usersService.createGoogle({
      googleId,
      email,
      name: profile.name?.trim() || email.split('@')[0],
      avatarUrl: profile.avatarUrl,
    });
  }

  @Cron('0 3 * * *')
  async purgeRefreshTokens() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.refreshRepo
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('expires_at < :now', { now: new Date() })
      .orWhere('revoked_at IS NOT NULL AND revoked_at < :cutoff', { cutoff })
      .execute();

    await this.ticketRepo
      .createQueryBuilder()
      .delete()
      .from(OAuthTicket)
      .where('expires_at < :now', { now: new Date() })
      .orWhere('consumed_at IS NOT NULL')
      .execute();
  }

  private async issueSession(
    user: User,
    meta: RequestMeta,
    familyId?: string,
    rememberMe = true,
  ): Promise<TokenResponseDto> {
    const refreshExpires = rememberMe ? this.refreshExpires : '1d';
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, typ: 'access' },
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpires as JwtSignOptions['expiresIn'],
      },
    );

    const refreshId = randomUUID();
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, typ: 'refresh', jti: refreshId },
      {
        secret: this.refreshSecret,
        expiresIn: refreshExpires as JwtSignOptions['expiresIn'],
      },
    );

    await this.refreshRepo.save(
      this.refreshRepo.create({
        id: refreshId,
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId: familyId ?? randomUUID(),
        expiresAt: new Date(
          Date.now() + parseDurationMs(refreshExpires, 30 * 86_400_000),
        ),
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        rememberMe,
      }),
    );

    await this.usersService.updateLastLogin(user.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(
        parseDurationMs(this.accessExpires, 15 * 60 * 1000) / 1000,
      ),
      user: toPublicUser(user),
    };
  }

  private async verifyRefreshToken(rawToken: string): Promise<RefreshTokenPayload> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(rawToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        '세션이 만료되었습니다. 다시 로그인해 주세요.',
      );
    }

    if (payload.typ !== 'refresh' || !payload.jti || !payload.sub) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    return payload;
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.refreshRepo.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private requireSecret(key: string): string {
    const value = this.config.get<string>(key);
    if (!value || value.length < 32) {
      throw new Error(`${key}가 없거나 너무 짧습니다. 32자 이상으로 설정하세요.`);
    }
    return value;
  }
}
