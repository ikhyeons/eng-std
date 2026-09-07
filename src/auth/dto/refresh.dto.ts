import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: '로그인 시 발급된 refresh token' })
  @IsString()
  @MinLength(10, { message: 'refresh token이 필요합니다.' })
  refreshToken: string;
}
