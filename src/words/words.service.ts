import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SituationGeneratorService } from '../ai/situation-generator.service';
import { DailySituation } from './entities/daily-situation.entity';
import {
  Situation,
  SituationPhrase,
  SituationWord,
} from './situation.types';
import { takeAndMoveLastSituationToTop } from './situation-file';

export type { Situation, SituationPhrase, SituationWord };

@Injectable()
export class WordsService {
  private readonly logger = new Logger(WordsService.name);
  private readonly inflight = new Map<string, Promise<Situation>>();

  constructor(
    @InjectRepository(DailySituation)
    private readonly repo: Repository<DailySituation>,
    private readonly situationGenerator: SituationGeneratorService,
  ) {}

  /** 앱은 저장된 오늘의 학습만 조회한다. AI를 호출하지 않는다. */
  async getToday(): Promise<Situation> {
    const date = this.todayKst();
    const pending = this.inflight.get(date);
    if (pending) return pending;

    const saved = await this.findWithItems(date);
    if (!saved) {
      throw new NotFoundException(
        '오늘 학습 내용이 아직 준비되지 않았습니다. 서버가 매일 23시 55분(KST)에 다음 날 학습을 생성합니다.',
      );
    }
    return this.toSituation(saved);
  }

  async getTodayWords(): Promise<SituationWord[]> {
    return (await this.getToday()).words;
  }

  async getTodayPhrases(): Promise<SituationPhrase[]> {
    return (await this.getToday()).phrases;
  }

  async getAll(): Promise<Situation[]> {
    const rows = await this.repo.find({
      relations: { words: true, phrases: true },
      order: { date: 'DESC' },
    });
    return rows.map((row) => this.toSituation(row));
  }

  /**
   * 해당 날짜에 아직 저장본이 없을 때만 situation_generator를 호출한다.
   * 같은 날짜에는 절대 두 번 돌지 않는다.
   */
  async generateForDate(date: string): Promise<Situation | null> {
    const pending = this.inflight.get(date);
    if (pending) return pending;

    const task = this.loadOrCreate(date);
    this.inflight.set(date, task);
    try {
      return await task;
    } finally {
      this.inflight.delete(date);
    }
  }

  async generateToday(): Promise<Situation | null> {
    return this.generateForDate(this.todayKst());
  }

  async generateTomorrow(): Promise<Situation | null> {
    return this.generateForDate(this.tomorrowKst());
  }

  private async loadOrCreate(date: string): Promise<Situation> {
    const existing = await this.findWithItems(date);
    if (existing) {
      this.logger.log(`[situation_generator] 이미 생성됨, 건너뜀: ${date}`);
      return this.toSituation(existing);
    }

    return this.runGenerator(date);
  }

  private async runGenerator(date: string): Promise<Situation> {
    const situationText = takeAndMoveLastSituationToTop();
    if (!situationText) {
      throw new Error('situation.txt의 마지막 줄이 비어 있습니다.');
    }

    this.logger.log(
      `[situation_generator] situation.txt 마지막 줄을 맨 위로 옮긴 뒤 생성 시작: ${date} / ${situationText}`,
    );

    const vocab = await this.situationGenerator.generateVocab(
      situationText,
      date,
    );

    const entity = this.repo.create({
      date,
      title: vocab.title,
      description: situationText,
      words: vocab.words.map((word, index) => ({
        sortOrder: index,
        english: word.english,
        korean: word.korean,
        category: word.category,
        example: word.example,
        exampleKo: word.exampleKo,
      })),
      phrases: vocab.phrases.map((phrase, index) => ({
        sortOrder: index,
        english: phrase.english,
        korean: phrase.korean,
        example: phrase.example,
        exampleKo: phrase.exampleKo,
      })),
    });

    const saved = await this.repo.manager.transaction(async (manager) =>
      manager.save(DailySituation, entity),
    );

    this.logger.log(
      `[situation_generator] 저장 완료: ${date} / 단어 ${saved.words.length} / 표현 ${saved.phrases.length}`,
    );
    return this.toSituation(saved);
  }

  private findWithItems(date: string) {
    return this.repo.findOne({
      where: { date },
      relations: { words: true, phrases: true },
    });
  }

  private todayKst(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
      new Date(),
    );
  }

  private tomorrowKst(): string {
    const [year, month, day] = this.todayKst().split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return next.toISOString().slice(0, 10);
  }

  private toSituation(row: DailySituation): Situation {
    const date = this.toDateString(row.date);

    return {
      id: Number(date.replace(/-/g, '')),
      date,
      title: row.title,
      description: row.description,
      words: [...(row.words ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((word) => ({
          id: word.id,
          english: word.english,
          korean: word.korean,
          category: word.category,
          example: word.example,
          exampleKo: word.exampleKo,
        })),
      phrases: [...(row.phrases ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((phrase) => ({
          id: phrase.id,
          english: phrase.english,
          korean: phrase.korean,
          example: phrase.example,
          exampleKo: phrase.exampleKo,
        })),
    };
  }

  private toDateString(value: string | Date): string {
    if (value instanceof Date) {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(
        value,
      );
    }
    return String(value).slice(0, 10);
  }
}
