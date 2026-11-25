import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { verifyToken, TokenPayload, tokenMaxAgeMs } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const AUTH_COOKIE = 'bt_token';
const isProd = () => process.env.NODE_ENV === 'production';

/** Minimal cookie parser (avoids adding a dependency). */
export const readCookie = (req: Request, name: string): string | undefined => {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) {
      try { return decodeURIComponent(part.slice(idx + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
};

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: tokenMaxAgeMs(),
  });
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie(AUTH_COOKIE, { httpOnly: true, secure: isProd(), sameSite: 'lax', path: '/' });
};

const extractToken = (req: Request): string | undefined => {
  const cookieToken = readCookie(req, AUTH_COOKIE);
  if (cookieToken) return cookieToken;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return undefined;
};

/**
 * Verifies the JWT (httpOnly cookie first, Bearer header as fallback), then
 * re-loads the user so deactivation, role changes and token revocation
 * (tokenVersion) take effect immediately.
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ message: 'Not authenticated' }); return; }
  let payload: TokenPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive || user.tokenVersion !== (payload.tv ?? 0)) {
      res.status(401).json({ message: 'Invalid or expired session' });
      return;
    }
    req.user = { userId: user.id, email: user.email, role: user.role, tv: user.tokenVersion };
    next();
  } catch {
    res.status(500).json({ message: 'Authentication failed' });
  }
};

export const authorize = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
