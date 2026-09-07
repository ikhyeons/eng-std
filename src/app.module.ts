import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { mysqlConnectionOptions } from './database/mysql.options';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { WordsModule } from './words/words.module';
import { QuizModule } from './quiz/quiz.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { Schedule } from './users/entities/schedule.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { OAuthTicket } from './auth/entities/oauth-ticket.entity';
import { QuizResult } from './quiz/entities/quiz-result.entity';
import { DailySituation } from './words/entities/daily-situation.entity';
import { DailyWord } from './words/entities/daily-word.entity';
import { DailyPhrase } from './words/entities/daily-phrase.entity';
import {
  migrateLegacySituationJson,
  ensureSituationMasterDetail,
} from './words/migrate-legacy-json';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const mysql = mysqlConnectionOptions(config);

        if (!process.env.VERCEL) {
          const bootstrap = new DataSource({
            ...mysql,
            entities: [],
            synchronize: false,
          });
          await bootstrap.initialize();
          try {
            await migrateLegacySituationJson(bootstrap);
            await ensureSituationMasterDetail(bootstrap);
          } finally {
            await bootstrap.destroy();
          }
        }

        return {
          ...mysql,
          entities: [
            User,
            Schedule,
            RefreshToken,
            OAuthTicket,
            QuizResult,
            DailySituation,
            DailyWord,
            DailyPhrase,
          ],
          synchronize: config.get('NODE_ENV') !== 'production',
        };
      },
    }),

    AuthModule,
    UsersModule,
    WordsModule,
    QuizModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
