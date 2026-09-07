import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessage {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsString()
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'I would like to check in, please.' })
  @IsString()
  content: string;
}

export class ChatDto {
  @ApiProperty({ type: [ChatMessage] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  messages: ChatMessage[];

  @ApiPropertyOptional({
    example: '✈️ 공항 수속 및 탑승',
    description: '오늘의 상황 제목. eng_talker가 이 장면을 기준으로 대화한다.',
  })
  @IsOptional()
  @IsString()
  situationTitle?: string;

  @ApiPropertyOptional({
    example: '뉴욕행 첫 해외여행. 체크인 카운터에서 수하물 무게를 확인해야 한다.',
  })
  @IsOptional()
  @IsString()
  situationDescription?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['check in for ( ~를 위해 체크인하다 )'],
    description: 'situation_generator가 만든 오늘의 표현',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phrases?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['boarding pass ( 탑승권 )'],
    description: 'situation_generator가 만든 오늘의 단어',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  words?: string[];

  @ApiPropertyOptional({
    description: '이전 대화 누적 요약. 최근 8개 메시지와 함께 문맥으로 쓴다.',
  })
  @IsOptional()
  @IsString()
  summary?: string;
}
