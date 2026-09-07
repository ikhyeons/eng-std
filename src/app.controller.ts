import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiExcludeController()
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string {
    return this.appService.getIndexPage();
  }

  @Get('health')
  @ApiOperation({ summary: '서버 상태' })
  health() {
    return this.appService.getHealth();
  }
}
