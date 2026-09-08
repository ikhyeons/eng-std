import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WordsService } from './words/words.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const words = app.get(WordsService);
    const today = await words.generateToday();
    console.log(
      `[generate-today] ${today?.date ?? 'none'} / words=${today?.words.length ?? 0} / phrases=${today?.phrases.length ?? 0} / ${today?.title ?? ''}`,
    );
  } finally {
    await app.close();
  }
}

void main();
