import { Controller, Post, Get, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { RecordAnswerDto } from './dto/record-answer.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('quiz')
@ApiBearerAuth()
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('answer')
  @ApiOperation({ summary: '퀴즈 한 문제 결과 저장' })
  recordAnswer(@CurrentUser() user: User, @Body() dto: RecordAnswerDto) {
    return this.quizService.recordAnswer(user.id, dto.correct);
  }

  @Get('activity')
  @ApiOperation({ summary: '날짜별 퀴즈 수행 기록 (달력용)' })
  getActivity(@CurrentUser() user: User) {
    return this.quizService.getActivity(user.id);
  }
}
