const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationMs(input: string, fallbackMs = 15 * 60 * 1000): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(input.trim());
  if (!match) return fallbackMs;
  return Number(match[1]) * UNIT_MS[match[2].toLowerCase()];
}
