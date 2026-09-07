import type { Request } from 'express';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

export function requestMeta(req: Request): RequestMeta {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp =
    typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined;
  const ip = forwardedIp || req.ip || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] ?? null;

  return {
    ip: ip ? ip.slice(0, 64) : null,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  };
}
