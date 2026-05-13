import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const projectWhere = role === 'ADMIN' ? {} : { members: { some: { userId } } };

    const [projects, totalReports, recentReports] = await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        include: {
          _count: { select: { dailyReports: true, activities: true, milestones: true } },
        },
      }),
      prisma.dailyReport.count({ where: { project: projectWhere } }),
      prisma.dailyReport.findMany({
        where: {
          project: projectWhere,
          reportDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { reportDate: 'asc' },
      }),
    ]);

    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'ACTIVE').length,
      completedProjects: projects.filter(p => p.status === 'COMPLETED').length,
      totalReports,
      avgProgress: projects.length > 0
        ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
        : 0,
      manpowerTrend: recentReports.map(r => ({
        date: r.reportDate.toISOString().split('T')[0],
        manpower: r.totalManpower,
      })),
      projectsByStatus: {
        PLANNING: projects.filter(p => p.status === 'PLANNING').length,
        ACTIVE: projects.filter(p => p.status === 'ACTIVE').length,
        ON_HOLD: projects.filter(p => p.status === 'ON_HOLD').length,
        COMPLETED: projects.filter(p => p.status === 'COMPLETED').length,
      },
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        status: p.status,
        progress: p.progress,
        endDate: p.endDate,
        reportCount: p._count.dailyReports,
      })),
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get dashboard stats', error: String(err) });
  }
};

export const getProjectAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { period = '30' } = req.query;
    const days = parseInt(String(period));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [reports, activities, milestones, risks, ncrs] = await Promise.all([
      prisma.dailyReport.findMany({
        where: { projectId, reportDate: { gte: since } },
        orderBy: { reportDate: 'asc' },
      }),
      prisma.activity.findMany({ where: { projectId } }),
      prisma.milestone.findMany({ where: { projectId }, orderBy: { plannedDate: 'asc' } }),
      prisma.risk.findMany({ where: { projectId } }),
      prisma.nCR.findMany({ where: { projectId } }),
    ]);

    // Manpower trend
    const manpowerTrend = reports.map(r => ({
      date: r.reportDate.toISOString().split('T')[0],
      manpower: r.totalManpower,
    }));

    // Activity breakdown by discipline
    const disciplineMap: Record<string, { total: number; completed: number; progress: number }> = {};
    activities.forEach(a => {
      if (!disciplineMap[a.discipline]) disciplineMap[a.discipline] = { total: 0, completed: 0, progress: 0 };
      disciplineMap[a.discipline].total++;
      if (a.status === 'COMPLETED') disciplineMap[a.discipline].completed++;
      disciplineMap[a.discipline].progress += a.actualProgress;
    });

    const disciplineBreakdown = Object.entries(disciplineMap).map(([discipline, data]) => ({
      discipline,
      total: data.total,
      completed: data.completed,
      avgProgress: data.total > 0 ? Math.round(data.progress / data.total) : 0,
    }));

    // Activity status counts
    const activityStats = {
      total: activities.length,
      notStarted: activities.filter(a => a.status === 'NOT_STARTED').length,
      inProgress: activities.filter(a => a.status === 'IN_PROGRESS').length,
      completed: activities.filter(a => a.status === 'COMPLETED').length,
      delayed: activities.filter(a => a.status === 'DELAYED').length,
    };

    // Milestone timeline
    const milestoneTimeline = milestones.map(m => ({
      id: m.id,
      name: m.name,
      plannedDate: m.plannedDate,
      actualDate: m.actualDate,
      status: m.status,
      variance: m.actualDate
        ? Math.round((m.actualDate.getTime() - m.plannedDate.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    // Risk matrix
    const riskMatrix = risks.map(r => ({
      id: r.id,
      title: r.title,
      probability: r.probability,
      impact: r.impact,
      riskScore: r.riskScore,
      status: r.status,
      category: r.category,
    }));

    // Weather breakdown
    const weatherCounts: Record<string, number> = {};
    reports.forEach(r => {
      weatherCounts[r.weather] = (weatherCounts[r.weather] || 0) + 1;
    });

    res.json({
      manpowerTrend,
      disciplineBreakdown,
      activityStats,
      milestoneTimeline,
      riskMatrix,
      weatherBreakdown: Object.entries(weatherCounts).map(([weather, count]) => ({ weather, count })),
      ncrStats: {
        total: ncrs.length,
        open: ncrs.filter(n => n.status === 'OPEN').length,
        closed: ncrs.filter(n => n.status === 'CLOSED').length,
      },
      totalWorkingDays: reports.length,
      totalManpowerDays: reports.reduce((s, r) => s + r.totalManpower, 0),
      avgDailyManpower: reports.length > 0
        ? Math.round(reports.reduce((s, r) => s + r.totalManpower, 0) / reports.length)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get analytics', error: String(err) });
  }
};

export const getUserAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, email: true, role: true, company: true,
        _count: { select: { dailyReports: true } },
      },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get user analytics' });
  }
};
