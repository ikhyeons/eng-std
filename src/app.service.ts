import { Injectable } from '@nestjs/common';
import { renderIndexPage } from './index.page';

@Injectable()
export class AppService {
  getIndexPage(): string {
    return renderIndexPage();
  }

  getHealth() {
    return { ok: true, service: "Today's Study" };
  }
}
