import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  JWT_SECRET not set — using insecure fallback (dev only)');
}
const RESOLVED_SECRET = SECRET || 'dev_fallback_secret_not_for_production';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, RESOLVED_SECRET, { expiresIn: EXPIRES } as jwt.SignOptions);

export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, RESOLVED_SECRET) as TokenPayload;
