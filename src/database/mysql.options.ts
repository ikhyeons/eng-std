import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mysql2 from 'mysql2';
import type { DataSourceOptions } from 'typeorm';

const logger = new Logger('MySQL');

export function mysqlConnectionOptions(
  config: ConfigService,
): DataSourceOptions {
  const host = config.get<string>('DB_HOST', 'localhost');
  const port = Number(config.get('DB_PORT', 3306));
  const database = config.get<string>('DB_NAME', 'eng_std');
  const sslEnabled = config.get<string>('DB_SSL', '') === 'true';

  logger.log(
    `연결 대상 ${host}:${port}/${database}${sslEnabled ? ' (SSL)' : ''}`,
  );

  if (process.env.VERCEL && (host === 'localhost' || host === '127.0.0.1')) {
    throw new Error(
      'Vercel에서 DB_HOST가 localhost입니다. 프로젝트 Environment Variables에 원격 MySQL 정보를 넣으세요.',
    );
  }

  return {
    type: 'mysql',
    driver: mysql2,
    host,
    port,
    username: config.get<string>('DB_USER', 'root'),
    password: config.get<string>('DB_PASSWORD', ''),
    database,
    charset: 'utf8mb4',
    timezone: '+09:00',
    connectTimeout: 15_000,
    extra: {
      connectionLimit: process.env.VERCEL ? 1 : 10,
      connectTimeout: 15_000,
      enableKeepAlive: true,
    },
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  };
}
