import { Controller, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EngTalkerService } from './eng-talker.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly engTalker: EngTalkerService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'eng_talker와 상황 기반 영어 대화',
    description:
      '오늘의 상황·단어·표현을 참고해 장면에 맞는 대화를 이어간다. AI 이름: eng_talker',
  })
  talk(@Body() dto: ChatDto) {
    return this.engTalker.talk(dto);
  }
}
