import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@example.com' })
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail({}, { message: '올바른 이메일 주소를 입력해 주세요.' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해 주세요.' })
  @MaxLength(72, { message: '비밀번호는 72자 이하여야 합니다.' })
  password: string;

  @ApiProperty({ example: true, required: false, description: '로그인 유지' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined
    return value === true || value === 'true'
  })
  @IsBoolean()
  rememberMe?: boolean;
}
