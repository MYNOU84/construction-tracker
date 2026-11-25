import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie sessions: state-changing requests must carry the
 * X-Requested-With header. Browsers cannot add it cross-site without a CORS
 * preflight, which the CORS policy rejects. (The cookie is also SameSite=Lax.)
 */
export const requireCsrfHeader = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method) || req.get('X-Requested-With')) { next(); return; }
  res.status(403).json({ message: 'Missing X-Requested-With header' });
};

// Demo restrictions are per account (DEMO_USER_EMAILS), enforced in middleware/auth.ts and middleware/access.ts.
