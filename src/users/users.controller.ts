import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findByIdOrFail(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: '내 프로필 업데이트' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/schedules')
  @ApiOperation({ summary: '내 일정 목록' })
  listSchedules(@CurrentUser() user: User) {
    return this.usersService.listSchedules(user.id);
  }

  @Post('me/schedules')
  @ApiOperation({ summary: '일정 추가' })
  createSchedule(@CurrentUser() user: User, @Body() dto: CreateScheduleDto) {
    return this.usersService.createSchedule(user.id, dto);
  }

  @Patch('me/schedules/:id')
  @ApiOperation({ summary: '일정 수정' })
  updateSchedule(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.usersService.updateSchedule(user.id, id, dto);
  }

  @Delete('me/schedules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '일정 삭제' })
  deleteSchedule(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.usersService.deleteSchedule(user.id, id);
  }
}
