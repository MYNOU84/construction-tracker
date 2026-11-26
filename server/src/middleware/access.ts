/**
 * Project-level access control.
 *
 * - ADMIN can access every project.
 * - Every other role must be a ProjectMember of the project in the URL.
 * - Child records (risks, activities, reports, ...) must belong to that same
 *   project, so a member of project A cannot read or edit records of project B
 *   by passing A's id in the URL and B's record id.
 * - Client-supplied `id` / `projectId` / relation fields are stripped from
 *   request bodies so records cannot be moved to another project.
 */
import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from './auth';
import { isDemoProjectId } from '../config/security';
import { can, Module, Action, ProjectRole } from '../config/permissions';

const projectIdFrom = (req: AuthRequest): string | undefined =>
  req.params.projectId || req.params.id;

export const isProjectMember = async (userId: string, projectId: string) =>
  !!(await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { id: true },
  }));

/**
 * Can this user see the project? ADMIN: every project. Demo accounts: demo projects only, and only as
 * members. Everyone else: projects they are a member of.
 */
export const canAccessProject = async (user: { userId: string; role: string; demo?: boolean }, projectId: string) => {
  if (user.demo && !isDemoProjectId(projectId)) return false;
  if (user.role === 'ADMIN' && !user.demo) return true;
  return isProjectMember(user.userId, projectId);
};

export const requireProjectAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = projectIdFrom(req);
    if (!req.user || !projectId) { res.status(403).json({ message: 'Access denied' }); return; }
    if (req.user.demo && !isDemoProjectId(projectId)) { res.status(404).json({ message: 'Project not found' }); return; }
    if (req.user.role === 'ADMIN') { next(); return; }
    if (await isProjectMember(req.user.userId, projectId)) { next(); return; }
    // 404 rather than 403 so project ids cannot be probed.
    res.status(404).json({ message: 'Project not found' });
  } catch {
    res.status(500).json({ message: 'Access check failed' });
  }
};

/** ADMIN, or a member whose project role is PROJECT_MANAGER. */
export const requireProjectManager = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = projectIdFrom(req);
    if (!req.user || !projectId) { res.status(403).json({ message: 'Access denied' }); return; }
    if (req.user.demo && !isDemoProjectId(projectId)) { res.status(404).json({ message: 'Project not found' }); return; }
    if (req.user.role === 'ADMIN' && !req.user.demo) { next(); return; }
    const m = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user.userId, projectId } },
      select: { role: true },
    });
    if (m?.role === 'PROJECT_MANAGER') { next(); return; }
    res.status(403).json({ message: 'Only the project manager or an administrator can do this' });
  } catch {
    res.status(500).json({ message: 'Access check failed' });
  }
};

/**
 * The caller's role on a project: OWNER for the (non-demo) system administrator, otherwise the
 * ProjectMember role, or null for non-members.
 */
export const projectRoleOf = async (
  user: { userId: string; role: string; demo?: boolean }, projectId: string,
): Promise<ProjectRole | null> => {
  if (user.role === 'ADMIN' && !user.demo) return 'OWNER';
  const m = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: user.userId, projectId } }, select: { role: true },
  });
  return (m?.role as ProjectRole) ?? null;
};

/** Role on the project in the URL, resolved once per request (after requireProjectAccess). */
export const getProjectRole = async (req: AuthRequest): Promise<ProjectRole | null> => {
  const r = req as AuthRequest & { projectRole?: ProjectRole | null };
  if (r.projectRole === undefined) {
    const projectId = projectIdFrom(req);
    r.projectRole = req.user && projectId ? await projectRoleOf(req.user, projectId) : null;
  }
  return r.projectRole;
};

/** Enforces the permission matrix (config/permissions.ts) for the project in the URL. */
export const requirePermission = (module: Module, action: Action) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const role = await getProjectRole(req);
      if (role && can(role, module, action)) { next(); return; }
      res.status(403).json({ message: 'Your role on this project does not allow this action', permission: `${module}:${action}` });
    } catch {
      res.status(500).json({ message: 'Access check failed' });
    }
  };

type ChildModel =
  | 'dailyReport' | 'weeklyReport' | 'monthlyReport' | 'activity' | 'milestone'
  | 'risk' | 'nCR' | 'plantEquipment' | 'siteResource' | 'document';

/** Ensures the record named by `param` belongs to req.params.projectId. */
export const requireChildOfProject = (model: ChildModel, param: string) =>
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const delegate = (prisma as any)[model];
      const row = await delegate.findFirst({
        where: { id: req.params[param], projectId: req.params.projectId },
        select: { id: true },
      });
      if (!row) { res.status(404).json({ message: 'Not found' }); return; }
      next();
    } catch {
      res.status(500).json({ message: 'Access check failed' });
    }
  };

const PROTECTED_BODY_KEYS = [
  'id', 'projectId', 'project', 'members', 'createdAt', 'updatedAt',
  'submitter', 'uploader', 'comments', 'photos', 'user', 'userId',
  'submittedBy', 'approvedBy', 'raisedBy', 'uploadedBy',
];

export const stripProtectedFields = (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    for (const k of PROTECTED_BODY_KEYS) delete req.body[k];
  }
  next();
};
