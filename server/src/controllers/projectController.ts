import { Response } from 'express';
import prisma from '../lib/prisma';
import { windowStart } from '../lib/clock';
import { AuthRequest } from '../middleware/auth';
import { getProjectRole } from '../middleware/access';
import { permissionsFor, seesInternal } from '../config/permissions';
import { ROLES, DEMO_PROJECT_PREFIX, isDemoAccount, isDemoProjectId } from '../config/security';

/** Projects a user may list: all for ADMIN, demo projects only for demo accounts, memberships otherwise. */
export const projectScope = (u: { userId: string; role: string; demo?: boolean }) => ({
  ...(u.role === 'ADMIN' && !u.demo ? {} : { members: { some: { userId: u.userId } } }),
  ...(u.demo ? { id: { startsWith: DEMO_PROJECT_PREFIX } } : {}),
});

// Fields a client may set on a project; everything else (id, members, ...) is ignored.
const PROJECT_FIELDS = [
  'name', 'code', 'description', 'client', 'consultant', 'contractor', 'location',
  'startDate', 'endDate', 'status', 'progress', 'budget', 'actualCost', 'currency',
  'imageUrl', 'presentationData',
] as const;

export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];

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
      where: projectScope(req.user!),
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
        _count: { select: { dailyReports: true, activities: true, documents: true, ncrs: true, risks: true } },
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
    if (!['ADMIN', 'PROJECT_MANAGER'].includes(req.user!.role)) {
      res.status(403).json({ message: 'Only administrators and project managers can create projects' });
      return;
    }
    const data = pickProjectFields(req.body);
    if (!data.name || !data.code) { res.status(400).json({ message: 'Project name and code are required' }); return; }
    const missing = ['client', 'location', 'startDate', 'endDate'].filter(k => !data[k] || (data[k] instanceof Date && isNaN(data[k].getTime())));
    if (missing.length) { res.status(400).json({ message: `Missing or invalid project fields: ${missing.join(', ')}` }); return; }
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
    // Any member may save the presentation; project details, status and archiving need a manager.
    const keys = Object.keys(data);
    if (keys.some(k => k !== 'presentationData') && req.user!.role !== 'ADMIN') {
      const m = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: req.user!.userId, projectId: req.params.id } }, select: { role: true },
      });
      if (m?.role !== 'PROJECT_MANAGER') {
        res.status(403).json({ message: 'Only the project manager or an administrator can edit project details' });
        return;
      }
    }
    if (data.status !== undefined && !PROJECT_STATUSES.includes(data.status)) {
      res.status(400).json({ message: 'Invalid project status' });
      return;
    }
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
    const since30 = await windowStart(30, { projectId });
    const [project, reports30, activities, milestones] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.dailyReport.findMany({
        where: {
          projectId,
          reportDate: { gte: since30 },
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
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, email: true } });
    if (!exists?.isActive) { res.status(404).json({ message: 'User not found' }); return; }
    // Public demo accounts never get access to private (non-demo) projects.
    if (isDemoAccount(exists.email) && !isDemoProjectId(req.params.id)) {
      res.status(400).json({ message: 'Demo accounts can only be members of demo projects' });
      return;
    }
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

/**
 * GET /projects/:id/member-candidates (project manager or administrator): active users that can be added.
 * Private projects never offer public demo accounts; demo projects offer only demo accounts.
 */
export const getMemberCandidates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const demoProject = isDemoProjectId(req.params.id);
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, role: true, company: true },
      orderBy: { name: 'asc' },
    });
    res.json(users.filter(u => isDemoAccount(u.email) === demoProject));
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

/**
 * GET /projects/:id/export: every record of one project, for the complete project export (Excel / JSON).
 * Same access rule as viewing the project. Passwords and session data are never included.
 */
export const exportProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const user = { select: { id: true, name: true, email: true } } as const;
    const where = { projectId };
    // The complete export holds what the caller may see: drafts and internal documents only for the project team.
    const internal = seesInternal(await getProjectRole(req));
    const me = req.user!.userId;
    const dailyWhere = internal ? where : { projectId, OR: [{ status: { not: 'DRAFT' } }, { submittedBy: me }] };
    const docWhere = internal ? where : { projectId, OR: [{ status: { not: 'INTERNAL' } }, { uploadedBy: me }] };
    const [project, members, activities, milestones, dailyReports, weeklyReports, monthlyReports, risks, ncrs, plant, resources, documents] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.projectMember.findMany({ where, include: { user: { select: { name: true, email: true, role: true, company: true } } } }),
      prisma.activity.findMany({ where, orderBy: { plannedStart: 'asc' } }),
      prisma.milestone.findMany({ where, orderBy: { plannedDate: 'asc' } }),
      prisma.dailyReport.findMany({ where: dailyWhere, orderBy: { reportDate: 'asc' }, include: {
        author: user,
        photos: { select: { id: true, fileName: true, caption: true, location: true, url: true, takenAt: true } },
        comments: { select: { id: true, content: true, createdAt: true, user: { select: { name: true } } } },
      } }),
      prisma.weeklyReport.findMany({ where, orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }] }),
      prisma.monthlyReport.findMany({ where, orderBy: [{ year: 'asc' }, { month: 'asc' }] }),
      prisma.risk.findMany({ where }),
      prisma.nCR.findMany({ where }),
      prisma.plantEquipment.findMany({ where }),
      prisma.siteResource.findMany({ where }),
      prisma.document.findMany({ where: docWhere, include: { uploader: user } }),
    ]);
    if (!project) { res.status(404).json({ message: 'Project not found' }); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      exportedAt: new Date().toISOString(),
      project, members, activities, milestones, dailyReports, weeklyReports, monthlyReports,
      risks, ncrs, plant, resources, documents,
    });
  } catch (err) {
    console.error('[exportProject]', err);
    res.status(500).json({ message: 'Failed to export project' });
  }
};

/** GET /projects/:id/permissions: the caller's role on the project and its permission matrix (for the interface). */
export const getMyPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await getProjectRole(req);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ role, permissions: permissionsFor(role), seesInternal: seesInternal(role) });
  } catch {
    res.status(500).json({ message: 'Failed to load permissions' });
  }
};
