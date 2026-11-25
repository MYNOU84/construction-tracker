import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { AuthRequest, setAuthCookie, clearAuthCookie } from '../middleware/auth';
import { security, MAX_FAILED_LOGINS, LOCKOUT_MINUTES, SELF_REGISTER_ROLES } from '../config/security';

const PUBLIC_USER = {
  id: true, name: true, email: true, role: true, company: true, phone: true, avatar: true, createdAt: true,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Used to keep response time similar when the email does not exist.
let dummyHash: string | undefined;
const dummyCompare = async (password: string) => {
  dummyHash ??= await bcrypt.hash('timing-equaliser', 12);
  await bcrypt.compare(password, dummyHash);
};

const issueSession = async (res: Response, userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { ...PUBLIC_USER, tokenVersion: true } });
  const { tokenVersion, ...publicUser } = user;
  setAuthCookie(res, signToken({ userId: user.id, email: user.email, role: user.role, tv: tokenVersion }));
  return publicUser;
};

export const getAuthConfig = (_req: Request, res: Response): void => {
  res.json({
    demoMode: security.demoMode,
    passwordLogin: security.passwordLoginEnabled,
    registrationOpen: security.registrationOpen,
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  if (!security.registrationOpen) {
    res.status(403).json({ message: 'Self-registration is disabled' });
    return;
  }
  try {
    const { name, email, password, role, company, phone } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() || typeof password !== 'string') {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }
    if (!EMAIL_RE.test(email)) { res.status(400).json({ message: 'Invalid email format' }); return; }
    if (password.length < 8) { res.status(400).json({ message: 'Password must be at least 8 characters' }); return; }
    const normEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normEmail } });
    if (existing) { res.status(409).json({ message: 'Email already registered' }); return; }
    const hashed = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: {
        name: name.trim().slice(0, 120),
        email: normEmail,
        password: hashed,
        role: (SELF_REGISTER_ROLES as readonly string[]).includes(role) ? role : 'SITE_ENGINEER',
        company: typeof company === 'string' ? company.slice(0, 120) : undefined,
        phone: typeof phone === 'string' ? phone.slice(0, 40) : undefined,
      },
      select: { id: true },
    });
    const user = await issueSession(res, created.id);
    res.status(201).json({ user });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  if (!security.passwordLoginEnabled) {
    res.status(403).json({ message: 'Password sign-in is disabled in the public demo. Use the demo access button.' });
    return;
  }
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || !user.isActive) {
      await dummyCompare(password);
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(429).json({ message: 'Too many failed attempts. Try again later.' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: failed >= MAX_FAILED_LOGINS
          ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000) }
          : { failedLoginCount: failed },
      });
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    if (user.failedLoginCount || user.lockedUntil) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
    }
    const publicUser = await issueSession(res, user.id);
    res.json({ user: publicUser });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

/** Public demo sign-in: no password, only for accounts listed in DEMO_USER_EMAILS. */
export const demoLogin = async (req: Request, res: Response): Promise<void> => {
  if (!security.demoMode) { res.status(404).json({ message: 'Not found' }); return; }
  try {
    const allowed = security.demoUserEmails;
    const requested = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : allowed[0];
    if (!requested || !allowed.includes(requested)) {
      res.status(400).json({ message: 'Unknown demo account' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email: requested }, select: { id: true, isActive: true, role: true } });
    // Administrator accounts are never offered by one-click demo sign-in, even if allow-listed by mistake.
    if (user?.role === 'ADMIN') { res.status(400).json({ message: 'Unknown demo account' }); return; }
    if (!user || !user.isActive) { res.status(503).json({ message: 'Demo account is not available' }); return; }
    const publicUser = await issueSession(res, user.id);
    res.json({ user: publicUser });
  } catch (err) {
    console.error('[demoLogin]', err);
    res.status(500).json({ message: 'Demo sign-in failed' });
  }
};

export const demoAccounts = async (_req: Request, res: Response): Promise<void> => {
  if (!security.demoMode) { res.json([]); return; }
  try {
    const users = await prisma.user.findMany({
      where: { email: { in: security.demoUserEmails }, isActive: true, role: { not: 'ADMIN' } },
      select: { email: true, name: true, role: true },
    });
    const order = security.demoUserEmails;
    res.json(users.sort((a, b) => order.indexOf(a.email) - order.indexOf(b.email)));
  } catch {
    res.json([]);
  }
};

export const logout = (_req: Request, res: Response): void => {
  clearAuthCookie(res);
  res.json({ message: 'Signed out' });
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: PUBLIC_USER });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to get profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, company } = req.body ?? {};
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : undefined,
        phone: typeof phone === 'string' ? phone.slice(0, 40) : undefined,
        company: typeof company === 'string' ? company.slice(0, 120) : undefined,
      },
      select: PUBLIC_USER,
    });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Update failed' });
  }
};
