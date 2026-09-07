import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ example: '2026-09-03' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '날짜는 YYYY-MM-DD 형식이어야 합니다.' })
  date: string;

  @ApiProperty({ example: '단어 20개 복습' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: '일정을 입력해 주세요.' })
  @MaxLength(500, { message: '일정은 500자 이하여야 합니다.' })
  content: string;
}
