import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateScheduleDto {
  @ApiProperty({ example: '단어 20개 복습' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1, { message: '일정을 입력해 주세요.' })
  @MaxLength(500, { message: '일정은 500자 이하여야 합니다.' })
  content: string;
}
