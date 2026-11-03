import { createHash } from 'node:crypto';

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be configured');
  return secret;
}

// Refresh JWTs exceed bcrypt's 72-byte input limit. Hash the entire random token.
export function refreshTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isAccessPayload(payload: { sub?: unknown; type?: unknown; email?: unknown }): boolean {
  return (
    payload.type === 'access' &&
    Number.isSafeInteger(payload.sub) &&
    Number(payload.sub) > 0 &&
    typeof payload.email === 'string'
  );
}

// Existing deployments specify the refresh cookie lifetime in milliseconds.
export function refreshLifetimeMs(): number {
  const value = Number(process.env.REFRESH_COOKIE_LIFETIME ?? 604800000);
  if (!Number.isSafeInteger(value) || value < 1000) throw new Error('Invalid REFRESH_COOKIE_LIFETIME');
  return value;
}
