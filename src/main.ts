import { NestFactory, Reflector } from '@nestjs/core';
import {
  ClassSerializerInterceptor,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Express, Request, Response } from 'express';
import { join } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';
import { renderIndexPage } from './index.page';
import { renderSwaggerPage } from './docs.page';
import { appVersion, installerDownloadPath, installerFileName, installerFilePath } from './download-file';

async function createNestApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api', {
    exclude: [
      { path: '', method: RequestMethod.GET },
      { path: '/', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const config = new DocumentBuilder()
    .setTitle('eng-std API')
    .setDescription('영어 학습 앱 백엔드 API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, { ui: false });

  app.useStaticAssets(join(process.cwd(), 'public'));

  const http = app.getHttpAdapter().getInstance();
  const sendDocs = (_req: Request, res: Response) => {
    res.type('html').send(renderSwaggerPage());
  };
  http.get('/docs', sendDocs);
  http.get('/docs/', sendDocs);
  http.get('/download', (_req: Request, res: Response) => {
    const fileName = installerFileName();
    const file = installerFilePath();
    if (file) {
      res.download(file, fileName);
      return;
    }
    res.redirect(installerDownloadPath());
  });
  http.get('/', (_req: Request, res: Response) => {
    res.type('html').send(renderIndexPage(appVersion()));
  });

  await app.init();
  return app;
}

let expressApp: Express | undefined;
let ready: Promise<Express> | undefined;

function getExpressApp(): Promise<Express> {
  ready ??= createNestApp().then((app) => {
    expressApp = app.getHttpAdapter().getInstance();
    return expressApp;
  });
  return ready;
}

async function startLocal() {
  const app = await createNestApp();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}/`);
  console.log(`📖 Swagger docs: http://localhost:${port}/docs`);
}

if (!process.env.VERCEL) {
  void startLocal();
}

async function handler(req: IncomingMessage, res: ServerResponse) {
  const server = await getExpressApp();
  server(req, res);
}

export default handler;
module.exports = handler;
