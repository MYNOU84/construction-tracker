import { Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/security';

// All routes in this controller are mounted behind authorize('ADMIN').

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  company: true, phone: true, isActive: true, createdAt: true,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isRole = (r: unknown): r is string => typeof r === 'string' && (ROLES as readonly string[]).includes(r);
const optStr = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);

export const getUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { ...USER_SELECT, _count: { select: { dailyReports: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: USER_SELECT });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, company, phone } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      res.status(400).json({ message: 'A name and a valid email are required' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters' });
      return;
    }
    if (role !== undefined && !isRole(role)) { res.status(400).json({ message: 'Invalid role' }); return; }
    const normEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normEmail } });
    if (existing) { res.status(409).json({ message: 'Email already registered' }); return; }
    const user = await prisma.user.create({
      data: {
        name: name.trim().slice(0, 120),
        email: normEmail,
        password: await bcrypt.hash(password, 12),
        role: role ?? 'SITE_ENGINEER',
        company: optStr(company, 120),
        phone: optStr(phone, 40),
      },
      select: USER_SELECT,
    });
    res.status(201).json(user);
  } catch (err) {
    console.error('[createUser]', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, role, company, phone, isActive, password } = req.body ?? {};
    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target) { res.status(404).json({ message: 'User not found' }); return; }
    if (role !== undefined && !isRole(role)) { res.status(400).json({ message: 'Invalid role' }); return; }

    const isSelf = target.id === req.user!.userId;
    if (isSelf && ((role !== undefined && role !== 'ADMIN') || isActive === false)) {
      res.status(400).json({ message: 'You cannot remove your own administrator access' });
      return;
    }

    const data: Record<string, unknown> = {
      name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : undefined,
      role,
      company: optStr(company, 120),
      phone: optStr(phone, 40),
      isActive: typeof isActive === 'boolean' ? isActive : undefined,
    };
    if (password !== undefined && password !== '') {
      if (typeof password !== 'string' || password.length < 8) {
        res.status(400).json({ message: 'Password must be at least 8 characters' });
        return;
      }
      data.password = await bcrypt.hash(password, 12);
    }
    // Revoke existing sessions when credentials, role or status change.
    const revoke = data.password !== undefined
      || (role !== undefined && role !== target.role)
      || (typeof isActive === 'boolean' && isActive !== target.isActive);
    if (revoke) data.tokenVersion = { increment: 1 };
    if (data.password !== undefined) { data.failedLoginCount = 0; data.lockedUntil = null; }

    const user = await prisma.user.update({ where: { id: target.id }, data, select: USER_SELECT });
    res.json(user);
  } catch (err) {
    console.error('[updateUser]', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.params.userId === req.user!.userId) {
      res.status(400).json({ message: 'You cannot deactivate your own account' });
      return;
    }
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
    res.json({ message: 'User deactivated' });
  } catch {
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
};
