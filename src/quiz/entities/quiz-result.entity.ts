import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('quiz_results')
export class QuizResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', length: 36 })
  userId: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  correct: number;

  @Column()
  total: number;

  @Column()
  accuracy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
