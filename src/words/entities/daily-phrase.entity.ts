import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DailySituation } from './daily-situation.entity';

/** 종 테이블: 메인 상황에 속한 구문 */
@Entity('daily_phrases')
export class DailyPhrase {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'situation_id', type: 'int' })
  situationId: number;

  @ManyToOne(() => DailySituation, (situation) => situation.phrases, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'situation_id', referencedColumnName: 'id' })
  situation: DailySituation;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'text' })
  english: string;

  @Column({ type: 'text' })
  korean: string;

  @Column({ type: 'text' })
  example: string;

  @Column({ name: 'example_ko', type: 'text' })
  exampleKo: string;
}
