import { Injectable } from '@nestjs/common';
import { appVersion } from './download-file';
import { renderIndexPage } from './index.page';

@Injectable()
export class AppService {
  getIndexPage(): string {
    return renderIndexPage(appVersion());
  }

  getHealth() {
    return { ok: true, service: 'eng-std' };
  }
}
