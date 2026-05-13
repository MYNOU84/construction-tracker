export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'SITE_ENGINEER' | 'CONSULTANT' | 'CONTRACTOR' | 'CLIENT_VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  client: string;
  consultant?: string;
  contractor?: string;
  location: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  progress: number;
  budget?: number;
  actualCost?: number;
  currency: string;
  imageUrl?: string;
  presentationData?: string;
  members?: ProjectMember[];
  _count?: { dailyReports: number; milestones: number; activities: number; documents: number; ncrs: number };
  milestones?: Milestone[];
  activities?: Activity[];
  risks?: Risk[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  user?: { id: string; name: string; email: string; role: string; company?: string };
}

export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface ManpowerEntry {
  position: string;
  type: 'DIRECT' | 'INDIRECT';
  company: string;
  np: number;
  hours: number;
}
export interface EquipmentEntry { name: string; count: number; hours: number; status: string; }
export interface MaterialEntry { designation: string; unit: string; qtyDelivered: number; qtyExpected: number; remarks?: string; }
export interface TaskEntry { lot: string; area: string; description: string; resources: string; unit: string; producedQty: number; status?: string; }
export interface DelayEntry { description: string; duration: string; responsibility: string; impact?: string; }
export interface IssueEntry { description: string; severity: string; action: string; status: string; }
export interface RiskEntry { description: string; level: string; action: string; }
export interface PendingAction { action: string; responsible: string; dueDate?: string; }
export interface InspectionEntry { description: string; result: string; inspector?: string; }
export interface HSEData {
  accidentsWithLTI: number;
  accidentsWithLTIComment?: string;
  accidentsWithoutLTI: number;
  accidentsWithoutLTIComment?: string;
  recruitmentMedicalCheckup: number;
  recruitmentMedicalCheckupComment?: string;
  periodicMedicalCheckup: number;
  periodicMedicalCheckupComment?: string;
  fireIncident: number;
  fireIncidentComment?: string;
  accidentWithMaterialDamage: number;
  accidentWithMaterialDamageComment?: string;
  safetyViolationNotice: number;
  safetyViolationNoticeComment?: string;
  safetyInductions: number;
  safetyInductionsComment?: string;
  toolboxTalks: number;
  toolboxTalksComment?: string;
  specificTraining: number;
  specificTrainingComment?: string;
  lostWorkingHours: number;
  remarks: string[];
  nearMisses?: number;
  subcontractingPct?: number;
}
export interface LotProgress {
  lotNumber: string;
  description: string;
  unit: string;
  budgetQty: number;
  previousCumulPct: number;
  weeklyPct: number;
  newCumulPct: number;
  remainingPct: number;
  kpiEfficiency: number;
}

export interface DailyReport {
  id: string;
  projectId: string;
  reportDate: string;
  reportNumber: number;
  weekNumber: number;
  weather: string;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  conditions?: string;
  generalSummary?: string;
  workCompleted?: string;
  plannedWork?: string;
  manpowerData: ManpowerEntry[] | string;
  totalManpower: number;
  equipmentData: EquipmentEntry[] | string;
  materialsData: MaterialEntry[] | string;
  activitiesData: TaskEntry[] | string;
  delays: DelayEntry[] | string;
  issues: IssueEntry[] | string;
  risks: RiskEntry[] | string;
  pendingActions: PendingAction[] | string;
  inspections: InspectionEntry[] | string;
  hseData: HSEData | string;
  safetyNotes?: string;
  incidents: number;
  nearMisses: number;
  toolboxTalks: number;
  status: ReportStatus;
  submittedBy: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  photos?: Photo[];
  comments?: Comment[];
  author?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface StudyItem {
  id: string;
  docNumber: string;
  description: string;
  discipline: string;
  rev: string;
  plannedDate: string;
  actualDate?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  progress: number;
  observations?: string;
}

export interface MaterialItem {
  id: string;
  ref: string;
  description: string;
  discipline: string;
  submittedBy: string;
  submissionDate: string;
  reviewDate?: string;
  status: 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
  observations?: string;
}

export interface WeeklyReport {
  id: string;
  projectId: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  executiveSummary?: string;
  highlightsAchieved?: string;
  issuesEncountered?: string;
  nextWeekPlan?: string;
  overallProgress: number;
  plannedProgress: number;
  progressByDiscipline: Record<string, number> | string;
  manpowerByDay: Record<string, number> | string;
  totalManpowerWeek: number;
  peakManpower: number;
  activitiesCompleted: number;
  activitiesDelayed: number;
  activitiesOngoing: number;
  spi?: number;
  cpi?: number;
  weatherSummary?: string;
  lotsData: LotProgress[] | string;
  manpowerBreakdown: Record<string, any> | string;
  studiesProgress: StudyItem[] | string;
  materialApprovals: MaterialItem[] | string;
  status: ReportStatus;
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  projectId: string;
  month: number;
  year: number;
  executiveSummary?: string;
  keyAchievements?: string;
  majorChallenges?: string;
  nextMonthPlan?: string;
  overallProgress: number;
  plannedProgress: number;
  architectureProgress: number;
  structureProgress: number;
  mecaniqueProgress: number;
  electriciteProgress: number;
  plomberieProgress: number;
  infrastructureProgress: number;
  mepProgress?: number;
  totalManpowerDays: number;
  peakManpower: number;
  avgDailyManpower: number;
  budgetExpended?: number;
  forecastFinalCost?: number;
  variance?: number;
  completedMilestones: number;
  pendingMilestones: number;
  delayedMilestones: number;
  openRisks: number;
  mitigatedRisks: number;
  openNCRs: number;
  closedNCRs: number;
  kpis: Record<string, number> | string;
  studiesProgress: StudyItem[] | string;
  materialApprovals: MaterialItem[] | string;
  status: ReportStatus;
  createdAt: string;
}

export type ActivityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'ON_HOLD';

export interface Activity {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  discipline: string;
  area?: string;
  phase?: string;
  wbsCode?: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  plannedProgress: number;
  actualProgress: number;
  status: ActivityStatus;
  priority: string;
  createdAt: string;
}

export type MilestoneStatus = 'PENDING' | 'ACHIEVED' | 'DELAYED' | 'AT_RISK';

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  plannedDate: string;
  actualDate?: string;
  status: MilestoneStatus;
  createdAt: string;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  type: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  revision?: string;
  tags: string[] | string;
  uploadedBy: string;
  uploader?: { id: string; name: string };
  createdAt: string;
}

export interface Risk {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  riskScore: number;
  status: string;
  mitigation?: string;
  owner?: string;
  dueDate?: string;
  createdAt: string;
}

export interface NCR {
  id: string;
  projectId: string;
  ncrNumber: string;
  title: string;
  description: string;
  area?: string;
  discipline?: string;
  severity: string;
  raisedBy: string;
  raisedDate: string;
  status: string;
  resolution?: string;
  closedDate?: string;
  photos?: Photo[];
  createdAt: string;
}

export interface Photo {
  id: string;
  url: string;
  fileName: string;
  caption?: string;
  takenAt?: string;
  location?: string;
  fileSize?: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  user?: { id: string; name: string; role: string };
  createdAt: string;
}

export interface PlantEquipment {
  id: string;
  projectId: string;
  name: string;
  category: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  plateNumber?: string;
  owner?: string;
  hireCompany?: string;
  dateOnSite: string;
  dateOffSite?: string;
  status: string;
  certExpiry?: string;
  lastInspection?: string;
  hoursOnSite: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteResource {
  id: string;
  projectId: string;
  fullName: string;
  company?: string;
  trade?: string;
  position?: string;
  type: string;
  idNumber?: string;
  inductionDate?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalReports: number;
  avgProgress: number;
  manpowerTrend: { date: string; manpower: number }[];
  projectsByStatus: Record<string, number>;
  projects: { id: string; name: string; code: string; status: string; progress: number; endDate: string; reportCount: number }[];
}

export interface ProjectAnalytics {
  manpowerTrend: { date: string; manpower: number }[];
  disciplineBreakdown: { discipline: string; total: number; completed: number; avgProgress: number }[];
  activityStats: { total: number; notStarted: number; inProgress: number; completed: number; delayed: number };
  milestoneTimeline: { id: string; name: string; plannedDate: string; actualDate?: string; status: string; variance?: number }[];
  riskMatrix: { id: string; title: string; probability: number; impact: number; riskScore: number; status: string; category: string }[];
  weatherBreakdown: { weather: string; count: number }[];
  ncrStats: { total: number; open: number; closed: number };
  totalWorkingDays: number;
  totalManpowerDays: number;
  avgDailyManpower: number;
}

/* ── Presentation Module ── */
export interface ZoneEntry {
  id: string;
  zone: string;
  description: string;
  surface: string;
  level: string;
  progress: number;
}

export interface IntervanantsRow {
  id: string;
  role: string;
  company: string;
  contact: string;
  phone: string;
  email: string;
}

export interface BillingEntry {
  id: string;
  number: string;
  description: string;
  amount: number;
  dateIssued: string;
  delayDays: number;
  datePaid: string;
  status: 'PENDING' | 'PAID' | 'LATE' | 'DISPUTED';
}

export interface WeightingEntry {
  id: string;
  lot: string;
  description: string;
  weighting: number;
  progress: number;
  sendRef: string;
  sendDate: string;
  approvalRef: string;
  approvalDate: string;
  approvalStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

export interface PlanEntry {
  id: string;
  number: string;
  title: string;
  revision: string;
  format: string;
  issuedBy: string;
  date: string;
  status: 'DRAFT' | 'ISSUED' | 'APPROVED' | 'FOR_INFO' | 'SUPERSEDED';
  remarks: string;
}

export interface ProjectPresentationData {
  surface: string;
  floors: string;
  totalLots: string;
  structureType: string;
  generalDescription: string;
  intervenants: IntervanantsRow[];
  zones: ZoneEntry[];
  billing: BillingEntry[];
  weighting: WeightingEntry[];
  plans: PlanEntry[];
}
