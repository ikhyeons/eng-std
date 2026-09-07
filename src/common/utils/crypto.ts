import { createHash, timingSafeEqual } from 'crypto';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;
let dummyHashPromise: Promise<string> | null = null;

function dummyHash(): Promise<string> {
  dummyHashPromise ??= bcrypt.hash('not-a-real-password', BCRYPT_ROUNDS);
  return dummyHashPromise;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, await dummyHash());
    return false;
  }
  return bcrypt.compare(plain, hash);
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
