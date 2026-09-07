import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class GoogleExchangeDto {
  @ApiProperty({ description: 'Google 콜백에서 받은 일회용 ticket' })
  @IsUUID('4', { message: '유효하지 않은 Google 로그인 티켓입니다.' })
  ticket: string;

  @ApiPropertyOptional({ example: true, description: '로그인 유지' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    return value === true || value === 'true'
  })
  @IsBoolean()
  rememberMe?: boolean;
}
