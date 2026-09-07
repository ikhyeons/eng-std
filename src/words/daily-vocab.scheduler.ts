import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WordsService } from './words.service';

@Injectable()
export class DailyVocabScheduler implements OnModuleInit {
  private readonly logger = new Logger(DailyVocabScheduler.name);

  constructor(private readonly wordsService: WordsService) {}

  async onModuleInit() {
    await this.run('서버 시작 시 오늘 데이터 확인', () =>
      this.wordsService.generateToday(),
    );
  }

  @Cron('55 23 * * *', { timeZone: 'Asia/Seoul' })
  async at2355Kst() {
    await this.run('매일 23시 55분(KST), 다음 날 학습 생성', () =>
      this.wordsService.generateTomorrow(),
    );
  }

  private async run(reason: string, task: () => Promise<unknown>) {
    this.logger.log(`[situation_generator] ${reason}`);
    try {
      await task();
    } catch (error) {
      this.logger.error(
        `[situation_generator] 생성 실패: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
