import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toDateKey } from '../common/date-key';
import { AuthProvider, User } from './entities/user.entity';
import { Schedule } from './entities/schedule.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.repo.findOne({ where: { id } });
    if (user) user.memos ??= {};
    return user;
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.repo.findOne({ where: { googleId } });
  }

  async createLocal(params: {
    email: string;
    passwordHash: string;
    name: string;
  }): Promise<User> {
    const user = this.repo.create({
      email: params.email,
      passwordHash: params.passwordHash,
      name: params.name,
      provider: AuthProvider.LOCAL,
      emailVerified: false,
      memos: {},
    });
    const saved = await this.repo.save(user);
    saved.memos ??= {};
    return saved;
  }

  async createGoogle(params: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const user = this.repo.create({
      googleId: params.googleId,
      email: params.email,
      name: params.name,
      avatarUrl: params.avatarUrl,
      provider: AuthProvider.GOOGLE,
      emailVerified: true,
      passwordHash: null,
      memos: {},
    });
    const saved = await this.repo.save(user);
    saved.memos ??= {};
    return saved;
  }

  async linkGoogle(
    userId: string,
    params: { googleId: string; avatarUrl: string | null; name?: string },
  ): Promise<User> {
    const user = await this.findByIdOrFail(userId);
    user.googleId = params.googleId;
    if (params.avatarUrl) user.avatarUrl = params.avatarUrl;
    if (params.name && (!user.name || user.name === '학습자')) {
      user.name = params.name;
    }
    user.emailVerified = true;
    return this.repo.save(user);
  }

  async refreshGoogleProfile(
    userId: string,
    params: { name: string; avatarUrl: string | null },
  ): Promise<User> {
    const user = await this.findByIdOrFail(userId);
    if (params.name && (!user.name || user.name === '학습자')) {
      user.name = params.name;
    }
    if (params.avatarUrl) user.avatarUrl = params.avatarUrl;
    return this.repo.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { lastLoginAt: new Date() });
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findByIdOrFail(id);
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.dailyGoal !== undefined) user.dailyGoal = dto.dailyGoal;
    return this.repo.save(user);
  }

  async applyQuizAnswer(userId: string, correct: boolean): Promise<User> {
    const user = await this.findByIdOrFail(userId);
    user.xp += correct ? 10 : 0;
    user.totalCorrect += correct ? 1 : 0;
    user.totalAnswered += 1;
    return this.repo.save(user);
  }

  async listSchedules(userId: string): Promise<ScheduleResponseDto[]> {
    await this.migrateLegacyMemos(userId);
    const items = await this.scheduleRepo.find({
      where: { userId },
      order: { date: 'ASC', sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return items.map((item) => this.toScheduleResponse(item));
  }

  async createSchedule(
    userId: string,
    dto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const last = await this.scheduleRepo.findOne({
      where: { userId, date: dto.date },
      order: { sortOrder: 'DESC' },
    });
    const item = this.scheduleRepo.create({
      userId,
      date: dto.date,
      content: dto.content,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    });
    return this.toScheduleResponse(await this.scheduleRepo.save(item));
  }

  async updateSchedule(
    userId: string,
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const item = await this.requireOwnSchedule(userId, id);
    item.content = dto.content;
    return this.toScheduleResponse(await this.scheduleRepo.save(item));
  }

  async deleteSchedule(userId: string, id: string): Promise<void> {
    const item = await this.requireOwnSchedule(userId, id);
    await this.scheduleRepo.remove(item);
  }

  private async requireOwnSchedule(
    userId: string,
    id: string,
  ): Promise<Schedule> {
    const item = await this.scheduleRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('일정을 찾을 수 없습니다.');
    }
    if (item.userId !== userId) {
      throw new ForbiddenException('다른 사용자의 일정입니다.');
    }
    return item;
  }

  private async migrateLegacyMemos(userId: string): Promise<void> {
    const existing = await this.scheduleRepo.count({ where: { userId } });
    if (existing > 0) return;

    const user = await this.findByIdOrFail(userId);
    const memos = user.memos ?? {};
    const entries = Object.entries(memos).filter(
      ([date, content]) =>
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        typeof content === 'string' &&
        content.trim().length > 0,
    );
    if (entries.length === 0) return;

    await this.scheduleRepo.save(
      entries.map(([date, content], index) =>
        this.scheduleRepo.create({
          userId,
          date,
          content: content.trim(),
          sortOrder: index,
        }),
      ),
    );
    user.memos = {};
    await this.repo.save(user);
  }

  private toScheduleResponse(item: Schedule): ScheduleResponseDto {
    return {
      id: item.id,
      date: toDateKey(item.date),
      content: item.content,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
    };
  }
}
