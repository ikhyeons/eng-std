import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { OpenAiClient } from './openai.client';
import { SituationGeneratorService } from './situation-generator.service';
import { EngTalkerService } from './eng-talker.service';

@Module({
  controllers: [AiController],
  providers: [OpenAiClient, SituationGeneratorService, EngTalkerService],
  exports: [SituationGeneratorService, EngTalkerService],
})
export class AiModule {}
