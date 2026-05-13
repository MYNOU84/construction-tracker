import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { getWeekNumber } from '../utils/helpers';

// ─── Daily Reports ────────────────────────────────────────────────────────────

export const getDailyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { from, to, status } = req.query;
    const reports = await prisma.dailyReport.findMany({
      where: {
        projectId,
        ...(from || to ? { reportDate: { gte: from ? new Date(String(from)) : undefined, lte: to ? new Date(String(to)) : undefined } } : {}),
        ...(status ? { status: String(status) } : {}),
      },
      include: {
        author: { select: { id: true, name: true } },
        photos: true,
        _count: { select: { comments: true } },
      },
      orderBy: { reportDate: 'desc' },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch reports', error: String(err) });
  }
};

export const getDailyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.dailyReport.findUnique({
      where: { id: req.params.reportId },
      include: {
        author: { select: { id: true, name: true, role: true } },
        photos: true,
        comments: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!report) { res.status(404).json({ message: 'Report not found' }); return; }
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch report' });
  }
};

export const createDailyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const data = req.body;

    const reportDate = new Date(data.reportDate);
    const weekNum = getWeekNumber(reportDate);
    const count = await prisma.dailyReport.count({ where: { projectId } });

    const report = await prisma.dailyReport.create({
      data: {
        projectId,
        reportDate,
        reportNumber: count + 1,
        weekNumber: weekNum,
        weather: data.weather || 'Clear',
        temperature: data.temperature,
        humidity: data.humidity,
        windSpeed: data.windSpeed,
        conditions: data.conditions,
        generalSummary: data.generalSummary,
        workCompleted: data.workCompleted,
        plannedWork: data.plannedWork,
        manpowerData: JSON.stringify(data.manpowerData || []),
        totalManpower: (data.manpowerData || []).reduce((s: number, m: any) => s + (m.np || m.count || 0), 0),
        equipmentData: JSON.stringify(data.equipmentData || []),
        materialsData: JSON.stringify(data.materialsData || []),
        activitiesData: JSON.stringify(data.activitiesData || []),
        delays: JSON.stringify(data.delays || []),
        issues: JSON.stringify(data.issues || []),
        risks: JSON.stringify(data.risks || []),
        pendingActions: JSON.stringify(data.pendingActions || []),
        inspections: JSON.stringify(data.inspections || []),
        hseData: JSON.stringify(data.hseData || {}),
        safetyNotes: data.safetyNotes,
        incidents: data.incidents || 0,
        nearMisses: data.nearMisses || 0,
        toolboxTalks: data.toolboxTalks || 0,
        status: data.status || 'DRAFT',
        submittedBy: req.user!.userId,
        submittedAt: data.status === 'SUBMITTED' ? new Date() : undefined,
      },
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create report', error: String(err) });
  }
};

export const updateDailyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const updateData: any = { ...data };
    if (data.reportDate) updateData.reportDate = new Date(data.reportDate);
    if (data.manpowerData) {
      updateData.manpowerData = JSON.stringify(data.manpowerData);
      updateData.totalManpower = data.manpowerData.reduce((s: number, m: any) => s + (m.np || m.count || 0), 0);
    }
    if (data.hseData) updateData.hseData = JSON.stringify(data.hseData);
    if (data.equipmentData) updateData.equipmentData = JSON.stringify(data.equipmentData);
    if (data.materialsData) updateData.materialsData = JSON.stringify(data.materialsData);
    if (data.activitiesData) updateData.activitiesData = JSON.stringify(data.activitiesData);
    if (data.delays) updateData.delays = JSON.stringify(data.delays);
    if (data.issues) updateData.issues = JSON.stringify(data.issues);
    if (data.risks) updateData.risks = JSON.stringify(data.risks);
    if (data.pendingActions) updateData.pendingActions = JSON.stringify(data.pendingActions);
    if (data.inspections) updateData.inspections = JSON.stringify(data.inspections);
    if (data.status === 'SUBMITTED') updateData.submittedAt = new Date();
    if (data.status === 'APPROVED') { updateData.approvedBy = req.user!.userId; updateData.approvedAt = new Date(); }

    const report = await prisma.dailyReport.update({ where: { id: req.params.reportId }, data: updateData });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update report', error: String(err) });
  }
};

export const deleteDailyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.dailyReport.delete({ where: { id: req.params.reportId } });
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete report' });
  }
};

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comment = await prisma.comment.create({
      data: { content: req.body.content, userId: req.user!.userId, dailyReportId: req.params.reportId },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add comment' });
  }
};

// ─── Weekly Reports ───────────────────────────────────────────────────────────

export const getWeeklyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reports = await prisma.weeklyReport.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch weekly reports' });
  }
};

export const generateWeeklyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { weekNumber, year } = req.body;

    const startDate = getWeekStartDate(weekNumber, year);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const dailyReports = await prisma.dailyReport.findMany({
      where: { projectId, reportDate: { gte: startDate, lte: endDate } },
    });

    const totalManpower = dailyReports.reduce((s, r) => s + r.totalManpower, 0);
    const peakManpower = Math.max(...dailyReports.map(r => r.totalManpower), 0);

    const manpowerByDay: Record<string, number> = {};
    dailyReports.forEach(r => {
      const day = r.reportDate.toISOString().split('T')[0];
      manpowerByDay[day] = r.totalManpower;
    });

    const project = await prisma.project.findUnique({ where: { id: projectId } });

    // Build direct/indirect breakdown from daily reports
    const manpowerBreakdown: Record<string, { direct: number; indirect: number; total: number }> = {};
    dailyReports.forEach(r => {
      const mpData: any[] = (() => { try { return JSON.parse(r.manpowerData); } catch { return []; } })();
      mpData.forEach((m: any) => {
        const company = m.company || 'Unknown';
        if (!manpowerBreakdown[company]) manpowerBreakdown[company] = { direct: 0, indirect: 0, total: 0 };
        const np = m.np || m.count || 0;
        if (m.type === 'INDIRECT') { manpowerBreakdown[company].indirect += np; }
        else { manpowerBreakdown[company].direct += np; }
        manpowerBreakdown[company].total += np;
      });
    });

    const report = await prisma.weeklyReport.upsert({
      where: { projectId_weekNumber_year: { projectId, weekNumber, year } },
      create: {
        projectId, weekNumber, year, startDate, endDate,
        overallProgress: project?.progress || 0,
        totalManpowerWeek: totalManpower,
        peakManpower,
        manpowerByDay: JSON.stringify(manpowerByDay),
        manpowerBreakdown: JSON.stringify(manpowerBreakdown),
      },
      update: {
        totalManpowerWeek: totalManpower,
        peakManpower,
        manpowerByDay: JSON.stringify(manpowerByDay),
        manpowerBreakdown: JSON.stringify(manpowerBreakdown),
        overallProgress: project?.progress || 0,
      },
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate weekly report', error: String(err) });
  }
};

export const updateWeeklyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.weeklyReport.update({
      where: { id: req.params.reportId },
      data: req.body,
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update weekly report' });
  }
};

export const deleteWeeklyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    await prisma.weeklyReport.delete({ where: { id: reportId } });
    res.json({ message: 'Weekly report deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete weekly report' });
  }
};

// ─── Monthly Reports ──────────────────────────────────────────────────────────

export const getMonthlyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reports = await prisma.monthlyReport.findMany({
      where: { projectId: req.params.projectId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch monthly reports' });
  }
};

export const generateMonthlyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { month, year } = req.body;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [dailyReports, project, risks, ncrs, milestones, activities] = await Promise.all([
      prisma.dailyReport.findMany({ where: { projectId, reportDate: { gte: startDate, lte: endDate } } }),
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.risk.findMany({ where: { projectId } }),
      prisma.nCR.findMany({ where: { projectId } }),
      prisma.milestone.findMany({ where: { projectId } }),
      prisma.activity.findMany({ where: { projectId } }),
    ]);

    const totalManpowerDays = dailyReports.reduce((s: number, r: any) => s + r.totalManpower, 0);
    const peakManpower = dailyReports.length > 0 ? Math.max(...dailyReports.map((r: any) => r.totalManpower)) : 0;
    const avgDailyManpower = dailyReports.length > 0 ? totalManpowerDays / dailyReports.length : 0;

    // Normalise discipline codes from legacy values
    const normDisc = (d: string): string => ({
      'MEP': 'MECANIQUE', 'Civilisation': 'CIVIL', 'CIVILISATION': 'CIVIL',
      'Civil': 'CIVIL', 'Génie Civil': 'CIVIL', 'GENIE CIVIL': 'CIVIL',
      'Mechanical': 'MECANIQUE', 'Electrical': 'ELECTRICITE', 'Plumbing': 'PLOMBERIE',
      'ELECTRICAL': 'ELECTRICITE', 'MECHANICAL': 'MECANIQUE', 'PLUMBING': 'PLOMBERIE',
    }[d] ?? d);

    // Auto-calculate average progress per discipline from activities
    const discAvg = (code: string): number => {
      const acts = activities.filter((a: any) => normDisc(a.discipline) === code);
      if (!acts.length) return 0;
      return Math.round(acts.reduce((s: number, a: any) => s + a.actualProgress, 0) / acts.length);
    };

    // Activity status counts
    const activitiesCompleted = activities.filter((a: any) => a.status === 'COMPLETED').length;
    const activitiesDelayed   = activities.filter((a: any) => a.status === 'DELAYED').length;
    const activitiesOngoing   = activities.filter((a: any) => a.status === 'IN_PROGRESS').length;
    const activitiesNotStarted = activities.filter((a: any) => a.status === 'NOT_STARTED').length;

    // Build discipline stats JSON for rich chart display
    const disciplineStats: Record<string, any> = {};
    ['STRUCTURE','ARCHITECTURE','MECANIQUE','ELECTRICITE','PLOMBERIE','CIVIL','INFRASTRUCTURE','GENERAL'].forEach(code => {
      const acts = activities.filter((a: any) => normDisc(a.discipline) === code);
      if (acts.length > 0) {
        disciplineStats[code] = {
          total: acts.length,
          completed: acts.filter((a: any) => a.status === 'COMPLETED').length,
          inProgress: acts.filter((a: any) => a.status === 'IN_PROGRESS').length,
          delayed: acts.filter((a: any) => a.status === 'DELAYED').length,
          notStarted: acts.filter((a: any) => a.status === 'NOT_STARTED').length,
          avgProgress: discAvg(code),
        };
      }
    });

    const commonData = {
      overallProgress: project?.progress || 0,
      totalManpowerDays,
      peakManpower,
      avgDailyManpower,
      structureProgress:      discAvg('STRUCTURE'),
      architectureProgress:   discAvg('ARCHITECTURE'),
      mecaniqueProgress:      discAvg('MECANIQUE'),
      electriciteProgress:    discAvg('ELECTRICITE'),
      plomberieProgress:      discAvg('PLOMBERIE'),
      infrastructureProgress: discAvg('INFRASTRUCTURE'),
      openRisks:            risks.filter((r: any) => r.status === 'OPEN').length,
      mitigatedRisks:       risks.filter((r: any) => r.status === 'MITIGATED').length,
      openNCRs:             ncrs.filter((n: any) => n.status === 'OPEN').length,
      closedNCRs:           ncrs.filter((n: any) => n.status === 'CLOSED').length,
      completedMilestones:  milestones.filter((m: any) => m.status === 'ACHIEVED').length,
      pendingMilestones:    milestones.filter((m: any) => m.status === 'PENDING').length,
      delayedMilestones:    milestones.filter((m: any) => m.status === 'DELAYED').length,
      kpis: JSON.stringify({ activitiesCompleted, activitiesDelayed, activitiesOngoing, activitiesNotStarted }),
      progressByDiscipline: JSON.stringify(disciplineStats),
    };

    const report = await prisma.monthlyReport.upsert({
      where: { projectId_month_year: { projectId, month, year } },
      create: { projectId, month, year, ...commonData },
      update: commonData,
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate monthly report', error: String(err) });
  }
};

export const updateMonthlyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await prisma.monthlyReport.update({
      where: { id: req.params.reportId },
      data: req.body,
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update monthly report' });
  }
};

export const deleteMonthlyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportId } = req.params;
    await prisma.monthlyReport.delete({ where: { id: reportId } });
    res.json({ message: 'Monthly report deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete monthly report' });
  }
};

// ─── Activities & Milestones ──────────────────────────────────────────────────

export const getActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const activities = await prisma.activity.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { plannedStart: 'asc' },
    });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch activities' });
  }
};

export const bulkImportActivities = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { activities } = req.body;
    if (!Array.isArray(activities) || activities.length === 0) {
      res.status(400).json({ message: 'No activities provided' });
      return;
    }
    let count = 0;
    for (const a of activities) {
      await prisma.activity.create({
        data: {
          name: String(a.name),
          description: a.description ? String(a.description) : null,
          discipline: String(a.discipline || 'GENERAL'),
          area: a.area ? String(a.area) : null,
          phase: a.phase ? String(a.phase) : null,
          wbsCode: a.wbsCode ? String(a.wbsCode) : null,
          plannedStart: new Date(a.plannedStart),
          plannedEnd: new Date(a.plannedEnd),
          actualProgress: Number(a.actualProgress) || 0,
          plannedProgress: Number(a.plannedProgress) || 0,
          status: String(a.status || 'NOT_STARTED'),
          priority: String(a.priority || 'MEDIUM'),
          projectId: req.params.projectId,
        },
      });
      count++;
    }
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Failed to import activities', error: String(err) });
  }
};

export const createActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const activity = await prisma.activity.create({
      data: {
        ...data,
        projectId: req.params.projectId,
        plannedStart: new Date(data.plannedStart),
        plannedEnd: new Date(data.plannedEnd),
        actualStart: data.actualStart ? new Date(data.actualStart) : undefined,
        actualEnd: data.actualEnd ? new Date(data.actualEnd) : undefined,
      },
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create activity', error: String(err) });
  }
};

export const updateActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (data.plannedStart) data.plannedStart = new Date(data.plannedStart);
    if (data.plannedEnd) data.plannedEnd = new Date(data.plannedEnd);
    if (data.actualStart) data.actualStart = new Date(data.actualStart);
    if (data.actualEnd) data.actualEnd = new Date(data.actualEnd);
    const activity = await prisma.activity.update({ where: { id: req.params.activityId }, data });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update activity' });
  }
};

export const deleteActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.activity.delete({ where: { id: req.params.activityId } });
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete activity' });
  }
};

export const getMilestones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const milestones = await prisma.milestone.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { plannedDate: 'asc' },
    });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch milestones' });
  }
};

export const createMilestone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const milestone = await prisma.milestone.create({
      data: { ...data, projectId: req.params.projectId, plannedDate: new Date(data.plannedDate) },
    });
    res.status(201).json(milestone);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create milestone', error: String(err) });
  }
};

export const updateMilestone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (data.plannedDate) data.plannedDate = new Date(data.plannedDate);
    if (data.actualDate) data.actualDate = new Date(data.actualDate);
    const milestone = await prisma.milestone.update({ where: { id: req.params.milestoneId }, data });
    res.json(milestone);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update milestone' });
  }
};

export const deleteMilestone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.milestone.delete({ where: { id: req.params.milestoneId } });
    res.json({ message: 'Milestone deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete milestone' });
  }
};

// ─── Risks & NCRs ─────────────────────────────────────────────────────────────

export const getRisks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const risks = await prisma.risk.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { riskScore: 'desc' },
    });
    res.json(risks);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch risks' });
  }
};

export const createRisk = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const riskScore = (data.probability || 3) * (data.impact || 3);
    const risk = await prisma.risk.create({
      data: { ...data, projectId: req.params.projectId, riskScore, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
    });
    res.status(201).json(risk);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create risk', error: String(err) });
  }
};

export const updateRisk = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (data.probability && data.impact) data.riskScore = data.probability * data.impact;
    const risk = await prisma.risk.update({ where: { id: req.params.riskId }, data });
    res.json(risk);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update risk' });
  }
};

export const deleteRisk = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.risk.delete({ where: { id: req.params.riskId } });
    res.json({ message: 'Risk deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete risk' });
  }
};

export const getNCRs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ncrs = await prisma.nCR.findMany({
      where: { projectId: req.params.projectId },
      include: { photos: true },
      orderBy: { raisedDate: 'desc' },
    });
    res.json(ncrs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch NCRs' });
  }
};

export const createNCR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const count = await prisma.nCR.count({ where: { projectId: req.params.projectId } });
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    const ncrNumber = `NCR-${project?.code}-${String(count + 1).padStart(3, '0')}`;
    const ncr = await prisma.nCR.create({
      data: { ...data, projectId: req.params.projectId, ncrNumber, raisedDate: new Date(data.raisedDate || new Date()), raisedBy: req.user!.userId },
    });
    res.status(201).json(ncr);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create NCR', error: String(err) });
  }
};

export const updateNCR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    if (data.closedDate) data.closedDate = new Date(data.closedDate);
    const ncr = await prisma.nCR.update({ where: { id: req.params.ncrId }, data });
    res.json(ncr);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update NCR' });
  }
};

export const deleteNCR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.nCR.delete({ where: { id: req.params.ncrId } });
    res.json({ message: 'NCR deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete NCR' });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStartDate(weekNumber: number, year: number): Date {
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay();
  const daysToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const firstMonday = new Date(jan1);
  firstMonday.setDate(jan1.getDate() + daysToMonday);
  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  return start;
}
