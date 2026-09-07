import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { DailyWord } from './daily-word.entity';
import { DailyPhrase } from './daily-phrase.entity';

/** 주 테이블: 그날의 메인 상황 */
@Entity('daily_situations')
export class DailySituation {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'date' })
  date: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @OneToMany(() => DailyWord, (word) => word.situation, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  words: DailyWord[];

  @OneToMany(() => DailyPhrase, (phrase) => phrase.situation, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  phrases: DailyPhrase[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
