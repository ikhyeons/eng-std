import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student@example.com' })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail({}, { message: '올바른 이메일 주소를 입력해 주세요.' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  @MaxLength(72, { message: '비밀번호는 72자 이하여야 합니다.' })
  password: string;

  @ApiPropertyOptional({ example: '홍길동' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100, { message: '이름은 100자 이하여야 합니다.' })
  name?: string;

  @ApiPropertyOptional({ example: true, description: '로그인 유지' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    return value === true || value === 'true'
  })
  @IsBoolean()
  rememberMe?: boolean;
}
