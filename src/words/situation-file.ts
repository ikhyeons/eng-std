import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const FILE_NAME = 'situation.txt';

function situationFilePath(): string {
  return join(process.cwd(), FILE_NAME);
}

/**
 * 마지막 비어 있지 않은 줄을 맨 위로 옮긴 뒤 그 줄을 반환한다.
 * AI 요청 전에 호출한다.
 */
export function takeAndMoveLastSituationToTop(): string {
  const filePath = situationFilePath();
  if (!existsSync(filePath)) {
    return '';
  }

  const raw = readFileSync(filePath, 'utf8');
  const newline = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);

  let lastIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().length > 0) {
      lastIdx = i;
      break;
    }
  }
  if (lastIdx < 0) return '';

  const used = lines[lastIdx].trim();
  if (lastIdx > 0) {
    const [moved] = lines.splice(lastIdx, 1);
    lines.unshift(moved);

    const endedWithNewline = raw.endsWith('\n');
    let next = lines.join(newline);
    if (endedWithNewline && !next.endsWith('\n')) {
      next += newline;
    }
    writeFileSync(filePath, next, 'utf8');
  }

  return used;
}
