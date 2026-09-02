import type { Logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';

/**
 * Business analytics for the admin dashboard (/admin). All figures come from
 * this backend's own database - the single source of truth for money, since
 * Omada's voucher dashboard has no knowledge of ClickPesa payments, real TZS
 * amounts, fees, or failed/abandoned attempts.
 *
 * Read-only. Aggregates are cheap at appliance scale (a year of sales is tens
 * of thousands of rows); the route layer caches the result for a minute so the
 * Pi recomputes at most once per minute regardless of dashboard refreshes.
 */

// Tanzania is UTC+3 year-round (no DST). "Today" on the dashboard means today
// in EAT, not UTC.
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const FAILED_STATUSES = ['FAILED', 'CANCELLED', 'EXPIRED'];
const INFLIGHT_STATUSES = ['CREATED', 'PENDING', 'PROCESSING'];

/** YYYY-MM-DD for the EAT calendar day that `d` falls in. */
function eatDay(d: Date): string {
  return new Date(d.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start-of-today in EAT, as a UTC instant. */
function startOfEatToday(now: Date): Date {
  const shifted = new Date(now.getTime() + EAT_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - EAT_OFFSET_MS);
}

export interface DashboardStats {
  generatedAt: string;
  currency: string;
  revenue: {
    today: number;
    last7d: number;
    last30d: number;
    allTime: number;
    salesToday: number;
    salesLast7d: number;
    salesLast30d: number;
    salesAllTime: number;
    byPackage: Array<{ packageId: string; name: string; sales: number; revenue: number }>;
    dailyTrend: Array<{ date: string; revenue: number; sales: number }>;
  };
  funnel: {
    windowDays: number;
    started: number;
    paid: number;
    failed: number;
    inFlight: number;
    provisioned: number;
    successRatePct: number;
    failureReasons: Array<{ reason: string; count: number }>;
  };
  customers: {
    total: number;
    repeat: number;
    newLast7d: number;
    topSpenders: Array<{ phoneNumber: string; sales: number; totalSpent: number }>;
  };
  operational: {
    activeVouchers: number;
    failedJobs: number;
    lastSaleAt: string | null;
  };
}

export class AnalyticsService {
  constructor(private readonly logger: Logger) {}

  async computeDashboard(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = startOfEatToday(now);
    const d7 = new Date(now.getTime() - 7 * DAY_MS);
    const d30 = new Date(now.getTime() - 30 * DAY_MS);

    const paidAgg = (gte?: Date) =>
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: 'SUCCESS', ...(gte ? { paidAt: { gte } } : {}) },
      });

    const [
      today,
      w7,
      w30,
      allTime,
      byPackageRaw,
      packages,
      trendRows,
      funnelGroups,
      provisioned30d,
      failRows,
      totalCustomers,
      newCustomers7d,
      spendByCustomer,
      activeVouchers,
      failedJobs,
      lastSale,
    ] = await Promise.all([
      paidAgg(todayStart),
      paidAgg(d7),
      paidAgg(d30),
      paidAgg(),
      prisma.payment.groupBy({
        by: ['packageId'],
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
        orderBy: { packageId: 'asc' },
      }),
      prisma.package.findMany({ select: { id: true, name: true, currency: true } }),
      prisma.payment.findMany({
        where: { status: 'SUCCESS', paidAt: { gte: d30 } },
        select: { paidAt: true, createdAt: true, amount: true },
      }),
      prisma.payment.groupBy({
        by: ['status'],
        where: { createdAt: { gte: d30 } },
        _count: true,
        orderBy: { status: 'asc' },
      }),
      prisma.voucher.count({ where: { status: 'CREATED', createdAt: { gte: d30 } } }),
      prisma.payment.findMany({
        where: {
          status: { in: FAILED_STATUSES },
          createdAt: { gte: d30 },
          failureReason: { not: null },
        },
        select: { failureReason: true },
      }),
      prisma.customer.count(),
      prisma.customer.count({ where: { createdAt: { gte: d7 } } }),
      prisma.payment.groupBy({
        by: ['customerId'],
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
        orderBy: { customerId: 'asc' },
      }),
      prisma.voucher.count({
        where: { status: 'CREATED', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      }),
      prisma.job.count({ where: { status: 'FAILED' } }),
      prisma.payment.findFirst({
        where: { status: 'SUCCESS' },
        orderBy: { paidAt: 'desc' },
        select: { paidAt: true, createdAt: true },
      }),
    ]);

    const currency = packages[0]?.currency ?? 'TZS';
    const nameById = new Map(packages.map((p) => [p.id, p.name]));

    // --- by package ---
    const byPackage = byPackageRaw
      .map((row) => ({
        packageId: row.packageId,
        name: nameById.get(row.packageId) ?? row.packageId,
        sales: row._count,
        revenue: row._sum.amount ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- 30-day daily trend, zero-filled ---
    const bucket = new Map<string, { revenue: number; sales: number }>();
    for (let i = 29; i >= 0; i--) {
      bucket.set(eatDay(new Date(now.getTime() - i * DAY_MS)), { revenue: 0, sales: 0 });
    }
    for (const row of trendRows) {
      const key = eatDay(row.paidAt ?? row.createdAt);
      const b = bucket.get(key);
      if (b) {
        b.revenue += row.amount;
        b.sales += 1;
      }
    }
    const dailyTrend = [...bucket.entries()].map(([date, v]) => ({ date, ...v }));

    // --- funnel (last 30d) ---
    const countByStatus = new Map(funnelGroups.map((g) => [g.status, g._count]));
    const sumOf = (statuses: string[]) =>
      statuses.reduce((acc, s) => acc + (countByStatus.get(s) ?? 0), 0);
    const started = [...countByStatus.values()].reduce((a, b) => a + b, 0);
    const paid = countByStatus.get('SUCCESS') ?? 0;
    const failed = sumOf(FAILED_STATUSES);
    const inFlight = sumOf(INFLIGHT_STATUSES);

    const reasonTally = new Map<string, number>();
    for (const r of failRows) {
      const reason = (r.failureReason ?? 'unknown').slice(0, 80);
      reasonTally.set(reason, (reasonTally.get(reason) ?? 0) + 1);
    }
    const failureReasons = [...reasonTally.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // --- customers ---
    const repeat = spendByCustomer.filter((c) => c._count >= 2).length;
    const topRaw = [...spendByCustomer]
      .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
      .slice(0, 5);
    const topCustomerRows = await prisma.customer.findMany({
      where: { id: { in: topRaw.map((t) => t.customerId) } },
      select: { id: true, phoneNumber: true, normalizedPhoneNumber: true },
    });
    const phoneById = new Map(
      topCustomerRows.map((c) => [c.id, c.normalizedPhoneNumber || c.phoneNumber]),
    );
    const topSpenders = topRaw.map((t) => ({
      phoneNumber: phoneById.get(t.customerId) ?? 'unknown',
      sales: t._count,
      totalSpent: t._sum.amount ?? 0,
    }));

    return {
      generatedAt: now.toISOString(),
      currency,
      revenue: {
        today: today._sum.amount ?? 0,
        last7d: w7._sum.amount ?? 0,
        last30d: w30._sum.amount ?? 0,
        allTime: allTime._sum.amount ?? 0,
        salesToday: today._count,
        salesLast7d: w7._count,
        salesLast30d: w30._count,
        salesAllTime: allTime._count,
        byPackage,
        dailyTrend,
      },
      funnel: {
        windowDays: 30,
        started,
        paid,
        failed,
        inFlight,
        provisioned: provisioned30d,
        successRatePct: started > 0 ? Math.round((paid / started) * 1000) / 10 : 0,
        failureReasons,
      },
      customers: {
        total: totalCustomers,
        repeat,
        newLast7d: newCustomers7d,
        topSpenders,
      },
      operational: {
        activeVouchers,
        failedJobs,
        lastSaleAt: (lastSale?.paidAt ?? lastSale?.createdAt ?? null)?.toISOString() ?? null,
      },
    };
  }
}
