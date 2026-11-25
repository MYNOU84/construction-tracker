import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { security } from '../config/security';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Reference "now" for recent-activity windows (last 7 / 30 days).
 * Normal mode: the real clock. DEMO_MODE: the latest daily-report date in scope (end of that day),
 * so a published demo stays populated without periodic reseeding. Never later than the real clock.
 */
export async function referenceNow(where: Prisma.DailyReportWhereInput = {}): Promise<Date> {
  const now = new Date();
  if (!security.demoMode) return now;
  const { _max } = await prisma.dailyReport.aggregate({ where, _max: { reportDate: true } });
  const latest = _max.reportDate;
  if (!latest) return now;
  const endOfDay = new Date(latest.getTime() + DAY - 1);
  return endOfDay < now ? endOfDay : now;
}

/** Start of a window of `days` days ending at the reference date. */
export async function windowStart(days: number, where: Prisma.DailyReportWhereInput = {}): Promise<Date> {
  return new Date((await referenceNow(where)).getTime() - days * DAY);
}
