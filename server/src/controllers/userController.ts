import { Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/auth';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        company: true, phone: true, isActive: true, createdAt: true,
        _count: { select: { dailyReports: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        id: true, name: true, email: true, role: true,
        company: true, phone: true, isActive: true, createdAt: true,
      },
    });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, company, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(409).json({ message: 'Email already registered' }); return; }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, company, phone },
      select: { id: true, name: true, email: true, role: true, company: true, phone: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create user', error: String(err) });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, role, company, phone, isActive, password } = req.body;
    const updateData: any = { name, role, company, phone, isActive };
    if (password) updateData.password = await bcrypt.hash(password, 12);
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, company: true, phone: true, isActive: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.update({ where: { id: req.params.userId }, data: { isActive: false } });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
};
