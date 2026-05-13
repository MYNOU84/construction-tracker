import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      where: req.user!.role === 'ADMIN' ? {} : {
        members: { some: { userId: req.user!.userId } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, role: true } } } },
        _count: { select: { dailyReports: true, milestones: true, activities: true, documents: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects', error: String(err) });
  }
};

export const getProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true, company: true } } } },
        milestones: { orderBy: { plannedDate: 'asc' } },
        activities: { orderBy: { plannedStart: 'asc' } },
        risks: { orderBy: { riskScore: 'desc' } },
        _count: { select: { dailyReports: true, documents: true, ncrs: true } },
      },
    });
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch project' });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const project = await prisma.project.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        members: {
          create: { userId: req.user!.userId, role: 'PROJECT_MANAGER' },
        },
      },
    });
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create project', error: String(err) });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);
    const project = await prisma.project.update({ where: { id: req.params.id }, data });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update project' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

export const getProjectStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const [project, reports30, activities, milestones] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.dailyReport.findMany({
        where: {
          projectId,
          reportDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { reportDate: 'asc' },
      }),
      prisma.activity.findMany({ where: { projectId } }),
      prisma.milestone.findMany({ where: { projectId } }),
    ]);

    const manpowerTrend = reports30.map(r => ({
      date: r.reportDate,
      manpower: r.totalManpower,
    }));

    const activityStats = {
      total: activities.length,
      completed: activities.filter(a => a.status === 'COMPLETED').length,
      inProgress: activities.filter(a => a.status === 'IN_PROGRESS').length,
      delayed: activities.filter(a => a.status === 'DELAYED').length,
      notStarted: activities.filter(a => a.status === 'NOT_STARTED').length,
    };

    const milestoneStats = {
      total: milestones.length,
      achieved: milestones.filter(m => m.status === 'ACHIEVED').length,
      pending: milestones.filter(m => m.status === 'PENDING').length,
      delayed: milestones.filter(m => m.status === 'DELAYED').length,
    };

    res.json({ project, manpowerTrend, activityStats, milestoneStats });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get stats' });
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, role } = req.body;
    const member = await prisma.projectMember.upsert({
      where: { userId_projectId: { userId, projectId: req.params.id } },
      create: { userId, projectId: req.params.id, role },
      update: { role },
    });
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add member' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.projectMember.delete({
      where: { userId_projectId: { userId: req.params.userId, projectId: req.params.id } },
    });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove member' });
  }
};
