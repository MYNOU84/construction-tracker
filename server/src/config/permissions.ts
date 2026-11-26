/**
 * Project permission matrix.
 *
 * The owner (system role ADMIN) has every permission on every project. Everyone else gets the permissions of
 * their role on that project (ProjectMember.role). The server enforces this matrix on every route; the
 * interface reads the same matrix (GET /projects/:id/permissions) only to hide controls.
 *
 * Actions
 *   view     read the module
 *   create   add records (generate, for weekly and monthly reports)
 *   edit     change records. Authors may also change their own draft daily reports and internal documents.
 *   delete   remove records. Authors may also remove their own draft daily reports and internal documents.
 *   submit   issue a daily report or a document officially (DRAFT/INTERNAL -> SUBMITTED)
 *   review   comment on submitted records
 *   approve  approve or reject submitted records
 *   export   PDF / Excel exports
 */
export const PROJECT_ROLES = ['PROJECT_MANAGER', 'SITE_ENGINEER', 'CONSULTANT', 'CONTRACTOR', 'CLIENT_VIEWER'] as const;
export type ProjectRole = typeof PROJECT_ROLES[number] | 'OWNER';

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'submit', 'review', 'approve', 'export'] as const;
export type Action = typeof ACTIONS[number];

export const MODULES = [
  'project', 'daily', 'weekly', 'monthly', 'schedule', 'risks', 'ncrs', 'plant', 'resources', 'documents',
] as const;
export type Module = typeof MODULES[number];

type Matrix = Record<Module, Action[]>;

const ALL: Action[] = [...ACTIONS];
const READ: Action[] = ['view', 'export'];

const MATRIX: Record<Exclude<ProjectRole, 'OWNER'>, Matrix> = {
  // Runs the project: every module, approvals and team membership.
  PROJECT_MANAGER: {
    // Team membership (create/delete) and project deletion: the PM of that project only (requireProjectManager).
    project: ['view', 'create', 'edit', 'delete', 'export'],
    daily: ALL, weekly: ALL, monthly: ALL, schedule: ALL, risks: ALL, ncrs: ALL, plant: ALL, resources: ALL, documents: ALL,
  },
  // Site supervision: writes the daily record and keeps the site registers up to date. Does not approve.
  SITE_ENGINEER: {
    project: READ,
    daily: ['view', 'create', 'edit', 'submit', 'review', 'export'],
    weekly: ['view', 'create', 'edit', 'export'],
    monthly: ['view', 'create', 'edit', 'export'],
    schedule: ['view', 'create', 'edit', 'export'],
    risks: ['view', 'create', 'edit', 'export'],
    ncrs: ['view', 'create', 'edit', 'export'],
    plant: ['view', 'create', 'edit', 'delete', 'export'],
    resources: ['view', 'create', 'edit', 'delete', 'export'],
    documents: ['view', 'create', 'submit', 'review', 'export'],
  },
  // Supervising consultant: reviews and approves what is submitted, raises NCRs and risks. Writes no site record.
  CONSULTANT: {
    project: READ,
    daily: ['view', 'review', 'approve', 'export'],
    weekly: ['view', 'review', 'export'],
    monthly: ['view', 'review', 'export'],
    schedule: READ,
    risks: ['view', 'create', 'edit', 'export'],
    ncrs: ['view', 'create', 'edit', 'approve', 'export'],
    plant: READ,
    resources: READ,
    documents: ['view', 'create', 'submit', 'review', 'approve', 'export'],
  },
  // Contractor: submits its daily reports and documents, keeps its plant and workforce registers, answers NCRs.
  CONTRACTOR: {
    project: READ,
    daily: ['view', 'create', 'edit', 'submit', 'export'],
    weekly: READ,
    monthly: READ,
    schedule: ['view', 'edit', 'export'],
    risks: ['view', 'create', 'export'],
    ncrs: ['view', 'edit', 'export'],
    plant: ['view', 'create', 'edit', 'delete', 'export'],
    resources: ['view', 'create', 'edit', 'delete', 'export'],
    documents: ['view', 'create', 'submit', 'export'],
  },
  // Client / employer representative: reads and exports official information only.
  CLIENT_VIEWER: {
    project: READ, daily: READ, weekly: READ, monthly: READ, schedule: READ,
    risks: READ, ncrs: READ, plant: READ, resources: READ, documents: READ,
  },
};

const OWNER_MATRIX: Matrix = Object.fromEntries(MODULES.map(m => [m, ALL])) as Matrix;

export const permissionsFor = (role: ProjectRole | string | null | undefined): Matrix => {
  if (role === 'OWNER') return OWNER_MATRIX;
  return MATRIX[role as keyof typeof MATRIX] ?? (Object.fromEntries(MODULES.map(m => [m, [] as Action[]])) as Matrix);
};

export const can = (role: ProjectRole | string | null | undefined, module: Module, action: Action) =>
  permissionsFor(role)[module].includes(action);

/**
 * Roles that see the project team's internal work: draft daily reports and internal (unissued) documents.
 * Consultants, contractors and clients see only what has been officially submitted, plus their own drafts.
 */
export const INTERNAL_ROLES: ProjectRole[] = ['OWNER', 'PROJECT_MANAGER', 'SITE_ENGINEER'];
export const seesInternal = (role: ProjectRole | string | null | undefined) => INTERNAL_ROLES.includes(role as ProjectRole);

/** Document lifecycle. INTERNAL documents have not been issued; the others are official. */
export const DOCUMENT_STATUSES = ['INTERNAL', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
export const REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const;
