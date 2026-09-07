import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

function resolvedVersionFile(): string | null {
  try {
    // 상대 경로를 고정해 두면 Vercel 번들에 products/version.txt 가 포함됩니다.
    return require.resolve('../products/version.txt');
  } catch {
    return null;
  }
}

function versionFilePath(): string | null {
  const candidates = [
    resolvedVersionFile(),
    join(process.cwd(), 'products', 'version.txt'),
    join(__dirname, '..', 'products', 'version.txt'),
    join(__dirname, '..', '..', 'products', 'version.txt'),
  ].filter((file): file is string => Boolean(file));
  return candidates.find((file) => existsSync(file)) ?? null;
}

export function appVersion(): string {
  const file = versionFilePath();
  if (!file) {
    throw new Error('products/version.txt 를 찾을 수 없습니다.');
  }
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)[0]
    ?.trim()
    .replace(/^v/i, '');
  if (!line || !/^\d+(\.\d+)*$/.test(line)) {
    throw new Error('products/version.txt 형식이 올바르지 않습니다.');
  }
  return line;
}

export function installerDownloadName(version = appVersion()): string {
  return `eng-std-Setup-${version}.exe.zip`;
}

export function installerSourceName(version = appVersion()): string {
  return `eng-std Setup ${version}.exe.zip`;
}

export function installerFilePath(): string | null {
  const version = appVersion();
  const downloadName = installerDownloadName(version);
  const sourceName = installerSourceName(version);
  const candidates = [
    join(process.cwd(), 'public', 'downloads', downloadName),
    join(process.cwd(), 'products', sourceName),
    join(__dirname, '..', 'public', 'downloads', downloadName),
    join(__dirname, '..', '..', 'public', 'downloads', downloadName),
  ];
  return candidates.find((file) => existsSync(file)) ?? null;
}
