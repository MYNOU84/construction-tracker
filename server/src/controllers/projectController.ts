import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { ROLES } from '../config/security';

// Fields a client may set on a project; everything else (id, members, ...) is ignored.
const PROJECT_FIELDS = [
  'name', 'code', 'description', 'client', 'consultant', 'contractor', 'location',
  'startDate', 'endDate', 'status', 'progress', 'budget', 'actualCost', 'currency',
  'imageUrl', 'presentationData',
] as const;

const pickProjectFields = (body: any) => {
  const out: Record<string, any> = {};
  if (!body || typeof body !== 'object') return out;
  for (const k of PROJECT_FIELDS) if (body[k] !== undefined) out[k] = body[k];
  if (out.startDate) out.startDate = new Date(out.startDate);
  if (out.endDate) out.endDate = new Date(out.endDate);
  return out;
};

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
    res.status(500).json({ message: 'Failed to fetch projects' });
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
        _count: { select: { dailyReports: true, activities: true, documents: true, ncrs: true } },
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
    const data = pickProjectFields(req.body);
    const project = await prisma.project.create({
      data: {
        ...(data as any),
        members: {
          create: { userId: req.user!.userId, role: 'PROJECT_MANAGER' },
        },
      },
    });
    res.status(201).json(project);
  } catch (err) {
    console.error('[createProject]', err);
    res.status(500).json({ message: 'Failed to create project' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = pickProjectFields(req.body);
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
    const { userId, role } = req.body ?? {};
    if (typeof userId !== 'string' || !(ROLES as readonly string[]).includes(role)) {
      res.status(400).json({ message: 'A valid userId and role are required' });
      return;
    }
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
    if (!exists?.isActive) { res.status(404).json({ message: 'User not found' }); return; }
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
