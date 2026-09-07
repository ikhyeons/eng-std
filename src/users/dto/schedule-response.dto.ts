import { ApiProperty } from '@nestjs/swagger';

export class ScheduleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '2026-09-03' })
  date: string;

  @ApiProperty({ example: '단어 20개 복습' })
  content: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;
}
