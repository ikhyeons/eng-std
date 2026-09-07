import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toDateKey, todayKst } from '../common/date-key';
import { UsersService } from '../users/users.service';
import { QuizResult } from './entities/quiz-result.entity';
import { User } from '../users/entities/user.entity';

export interface QuizActivity {
  date: string;
  quizCorrect: number;
  quizTotal: number;
}

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizResult)
    private readonly repo: Repository<QuizResult>,
    private readonly usersService: UsersService,
  ) {}

  async recordAnswer(
    userId: string,
    correct: boolean,
  ): Promise<{ user: User; activity: QuizActivity[] }> {
    const date = todayKst();
    await this.repo.save(
      this.repo.create({
        userId,
        date,
        correct: correct ? 1 : 0,
        total: 1,
        accuracy: correct ? 100 : 0,
      }),
    );
    const user = await this.usersService.applyQuizAnswer(userId, correct);
    const activity = await this.getActivity(userId);
    return { user, activity };
  }

  async getActivity(userId: string): Promise<QuizActivity[]> {
    const rows = await this.repo.find({ where: { userId } });
    const byDate = new Map<string, QuizActivity>();
    for (const row of rows) {
      const date = toDateKey(row.date);
      const current = byDate.get(date) ?? {
        date,
        quizCorrect: 0,
        quizTotal: 0,
      };
      current.quizCorrect += row.correct;
      current.quizTotal += row.total;
      byDate.set(date, current);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
}
