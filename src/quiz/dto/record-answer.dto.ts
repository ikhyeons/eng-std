import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RecordAnswerDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  correct: boolean;
}
