import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DailySituation } from './daily-situation.entity';

/** 종 테이블: 메인 상황에 속한 단어 */
@Entity('daily_words')
export class DailyWord {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'situation_id', type: 'int' })
  situationId: number;

  @ManyToOne(() => DailySituation, (situation) => situation.words, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'situation_id', referencedColumnName: 'id' })
  situation: DailySituation;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ length: 255 })
  english: string;

  @Column({ length: 255 })
  korean: string;

  @Column({ length: 20 })
  category: string;

  @Column({ type: 'text' })
  example: string;

  @Column({ name: 'example_ko', type: 'text' })
  exampleKo: string;
}
