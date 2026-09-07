import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '홍길동' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: '이름을 입력해 주세요.' })
  @MaxLength(100, { message: '이름은 100자 이하여야 합니다.' })
  name?: string;

  @ApiPropertyOptional({ example: 10, description: '하루 퀴즈 목표' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  dailyGoal?: number;
}
