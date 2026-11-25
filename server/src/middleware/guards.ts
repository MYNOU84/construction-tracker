import { Request, Response, NextFunction } from 'express';
import { security } from '../config/security';

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

// Paths (relative to /api) that stay writable in the read-only public demo.
const DEMO_WRITABLE = new Set(['/auth/demo', '/auth/logout', '/auth/login']);

/** In DEMO_MODE the whole API is read-only for everyone. */
export const demoReadOnly = (req: Request, res: Response, next: NextFunction): void => {
  if (!security.demoMode || SAFE_METHODS.has(req.method) || DEMO_WRITABLE.has(req.path)) { next(); return; }
  res.status(403).json({ message: 'This public demo is read-only. Changes are disabled.', demo: true });
};
