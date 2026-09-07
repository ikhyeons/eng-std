import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleOAuthService } from './google-oauth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { GoogleExchangeDto } from './dto/google-exchange.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { requestMeta } from '../common/utils/request-meta';
import { renderGoogleCompletePage } from './google-complete.page';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuth: GoogleOAuthService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: '이메일 회원가입' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, requestMeta(req));
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일 로그인' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, requestMeta(req));
  }

  @Public()
  @Get('google/status')
  @ApiOperation({ summary: 'Google 로그인 설정 여부' })
  googleStatus() {
    return { enabled: this.googleOAuth.isConfigured() };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('google')
  @Redirect()
  @ApiOperation({ summary: 'Google 로그인/가입 시작' })
  googleStart(@Req() req: Request) {
    return { url: this.googleOAuth.buildAuthUrl(req), statusCode: 302 };
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth 콜백' })
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const ticket = await this.googleOAuth.handleCallback(
        {
          code,
          state,
          error,
        },
        req,
      );
      res.redirect(
        `/api/auth/google/complete?ticket=${encodeURIComponent(ticket)}`,
      );
    } catch (err) {
      res.redirect(
        `/api/auth/google/complete?error=${encodeURIComponent(publicErrorMessage(err))}`,
      );
    }
  }

  @Public()
  @Get('google/complete')
  @ApiOperation({ summary: 'Google 로그인 완료 페이지' })
  googleComplete(
    @Query('ticket') ticket: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderGoogleCompletePage({ ticket, error }));
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('google/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google 일회용 ticket을 앱 토큰으로 교환' })
  exchangeGoogle(@Body() dto: GoogleExchangeDto, @Req() req: Request) {
    return this.authService.exchangeOAuthTicket(
      dto.ticket,
      requestMeta(req),
      dto.rememberMe !== false,
    );
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '액세스 토큰 재발급' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, requestMeta(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '현재 기기 로그아웃' })
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 기기에서 로그아웃' })
  async logoutAll(@CurrentUser() user: User) {
    await this.authService.logoutAll(user.id);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 로그인 사용자 조회' })
  me(@CurrentUser() user: User) {
    return this.authService.me(user);
  }
}

function publicErrorMessage(err: unknown): string {
  if (err instanceof HttpException) {
    const body = err.getResponse();
    if (typeof body === 'string') return body;
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: string | string[] }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && message[0]) return message[0];
    }
  }
  return 'Google 로그인에 실패했습니다.';
}
