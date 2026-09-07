import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WordsService } from './words.service';

@ApiTags('words')
@ApiBearerAuth()
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get('today')
  @ApiOperation({
    summary: '오늘 저장된 학습 내용 조회 (앱 표시용, AI 호출 없음)',
  })
  getToday() {
    return this.wordsService.getToday();
  }

  @Get('today/words')
  @ApiOperation({ summary: '오늘의 단어 목록' })
  getTodayWords() {
    return this.wordsService.getTodayWords();
  }

  @Get('today/phrases')
  @ApiOperation({ summary: '오늘의 표현 목록' })
  getTodayPhrases() {
    return this.wordsService.getTodayPhrases();
  }

  @Get()
  @ApiOperation({ summary: '저장된 상황 목록 조회' })
  getAll() {
    return this.wordsService.getAll();
  }
}
