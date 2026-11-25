import jwt from 'jsonwebtoken';

const isProd = process.env.NODE_ENV === 'production';
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  if (isProd) throw new Error('JWT_SECRET environment variable is required in production');
  console.warn('⚠️  JWT_SECRET not set — using insecure fallback (dev only)');
} else if (isProd && SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}
const RESOLVED_SECRET = SECRET || 'dev_fallback_secret_not_for_production';
const EXPIRES = process.env.JWT_EXPIRES_IN || '12h';
const ISSUER = 'buildtrack-pro';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  /** User.tokenVersion at sign time; bumping it revokes older tokens. */
  tv?: number;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(
    { userId: payload.userId, email: payload.email, role: payload.role, tv: payload.tv ?? 0 },
    RESOLVED_SECRET,
    { expiresIn: EXPIRES, algorithm: 'HS256', issuer: ISSUER } as jwt.SignOptions,
  );

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, RESOLVED_SECRET, { algorithms: ['HS256'], issuer: ISSUER }) as TokenPayload;

/** Cookie lifetime in ms, derived from JWT_EXPIRES_IN (supports s/m/h/d suffixes). */
export const tokenMaxAgeMs = (): number => {
  const m = /^(\d+)\s*([smhd])?$/.exec(EXPIRES.trim());
  if (!m) return 12 * 3600 * 1000;
  const n = Number(m[1]);
  const unit = { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7 }[(m[2] || 's') as 's' | 'm' | 'h' | 'd'];
  return n * unit;
};
