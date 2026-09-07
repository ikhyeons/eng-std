import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordsController } from './words.controller';
import { WordsService } from './words.service';
import { DailyVocabScheduler } from './daily-vocab.scheduler';
import { DailySituation } from './entities/daily-situation.entity';
import { DailyWord } from './entities/daily-word.entity';
import { DailyPhrase } from './entities/daily-phrase.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailySituation, DailyWord, DailyPhrase]),
    AiModule,
  ],
  controllers: [WordsController],
  providers: [WordsService, DailyVocabScheduler],
  exports: [WordsService],
})
export class WordsModule {}
