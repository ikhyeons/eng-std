import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 20, default: AuthProvider.LOCAL })
  provider: AuthProvider;

  @Index({ unique: true })
  @Column({ name: 'google_id', type: 'varchar', length: 255, nullable: true })
  googleId: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean;

  @Column({ length: 100, default: '학습자' })
  name: string;

  @Column({ default: 0 })
  xp: number;

  @Column({ name: 'total_correct', default: 0 })
  totalCorrect: number;

  @Column({ name: 'total_answered', default: 0 })
  totalAnswered: number;

  @Column({ name: 'daily_goal', default: 10 })
  dailyGoal: number;

  @Exclude()
  @Column({ type: 'json', nullable: true })
  memos: Record<string, string> | null;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
