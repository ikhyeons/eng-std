import { Controller, Get, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { WordsService } from './words.service';

@ApiTags('words')
@ApiBearerAuth()
@Controller('words')
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get('today')
  @ApiOperation({
    summary: '오늘의 학습 내용 조회 (없으면 생성)',
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

  @Public()
  @Get('prepare')
  @ApiOperation({ summary: '오늘·내일 학습 생성 (Vercel Cron)' })
  async prepare(
    @Headers('authorization') authorization?: string,
    @Query('secret') secretQuery?: string,
  ) {
    const secret = process.env.CRON_SECRET || process.env.WORDS_PREPARE_SECRET;
    const authorized =
      Boolean(secret) &&
      (authorization === `Bearer ${secret}` || secretQuery === secret);
    if (!authorized) {
      throw new UnauthorizedException('Cron 인증이 필요합니다.');
    }
    const today = await this.wordsService.generateToday();
    const tomorrow = await this.wordsService.generateTomorrow();
    return {
      ok: true,
      today: today?.date ?? null,
      tomorrow: tomorrow?.date ?? null,
    };
  }
}
