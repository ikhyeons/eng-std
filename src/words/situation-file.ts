import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const FILE_NAME = 'situation.txt';

function situationFilePath(): string | null {
  const candidates = [
    (() => {
      try {
        return require.resolve('../situation.txt');
      } catch {
        return '';
      }
    })(),
    join(process.cwd(), FILE_NAME),
    join(__dirname, '..', '..', FILE_NAME),
    join(__dirname, '..', FILE_NAME),
  ].filter(Boolean);
  return candidates.find((file) => existsSync(file)) ?? null;
}

function nonemptyLines(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function pickLineForDate(lines: string[], date: string): string {
  let hash = 0;
  for (const ch of date) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length];
}

/**
 * 로컬에서는 마지막 줄을 맨 위로 옮긴 뒤 그 줄을 반환한다.
 * Vercel은 파일 쓰기가 유지되지 않으므로 날짜 기준으로 한 줄을 고른다.
 */
export function takeAndMoveLastSituationToTop(date?: string): string {
  const filePath = situationFilePath();
  if (!filePath) return '';

  const raw = readFileSync(filePath, 'utf8');
  const lines = nonemptyLines(raw);
  if (!lines.length) return '';

  if (process.env.VERCEL) {
    return pickLineForDate(lines, date ?? new Date().toISOString().slice(0, 10));
  }

  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const allLines = raw.split(/\r?\n/);
  let lastIdx = -1;
  for (let i = allLines.length - 1; i >= 0; i--) {
    if (allLines[i].trim().length > 0) {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx < 0) return '';

  const used = allLines[lastIdx].trim();
  if (lastIdx > 0) {
    const [moved] = allLines.splice(lastIdx, 1);
    allLines.unshift(moved);

    const endedWithNewline = raw.endsWith('\n');
    let next = allLines.join(newline);
    if (endedWithNewline && !next.endsWith('\n')) {
      next += newline;
    }
    writeFileSync(filePath, next, 'utf8');
  }

  return used;
}
