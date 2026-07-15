import {
  LeadStatus,
  ResolutionStatus,
  TaskStatus,
} from "@prisma/client";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import {
  calculateBusinessHealthScore,
  getHealthScoreStatusLabel,
} from "@/services/health-score/health-score-service";

export async function getDashboardData(tenantId: string) {
  const todayStart = startOfDay(new Date());
  const periodEnd = new Date();
  const periodStart = startOfDay(new Date());

  const [
    tenant,
    callsToday,
    newLeads,
    appointmentsBooked,
    unresolvedCalls,
    overdueFollowUps,
    qualifiedOpportunities,
    recentCalls,
    leadGroups,
    latestSnapshot,
    previousSnapshot,
    activity,
    openPriorities,
  ] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { businessProfile: true },
    }),
    prisma.call.count({
      where: { tenantId, startedAt: { gte: todayStart } },
    }),
    prisma.lead.count({
      where: { tenantId, createdAt: { gte: todayStart }, deletedAt: null },
    }),
    prisma.appointment.count({
      where: {
        tenantId,
        createdAt: { gte: todayStart },
        status: { in: ["CONFIRMED", "PENDING", "COMPLETED"] },
      },
    }),
    prisma.call.count({
      where: {
        tenantId,
        resolutionStatus: {
          in: [ResolutionStatus.UNRESOLVED, ResolutionStatus.NEEDS_FOLLOW_UP],
        },
      },
    }),
    prisma.followUpTask.count({
      where: {
        tenantId,
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
        dueAt: { lt: new Date() },
      },
    }),
    prisma.lead.count({
      where: {
        tenantId,
        deletedAt: null,
        status: {
          in: [
            LeadStatus.QUALIFIED,
            LeadStatus.APPOINTMENT_BOOKED,
            LeadStatus.QUOTE_REQUESTED,
          ],
        },
      },
    }),
    prisma.call.findMany({
      where: { tenantId },
      include: { caller: true },
      orderBy: { startedAt: "desc" },
      take: 8,
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { tenantId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.healthScoreSnapshot.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.healthScoreSnapshot.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.activityEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.followUpTask.findMany({
      where: {
        tenantId,
        status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] },
      },
      include: { lead: true, call: true },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 5,
    }),
  ]);

  let health = latestSnapshot
    ? {
        score: latestSnapshot.score,
        trend:
          previousSnapshot[1] != null
            ? Math.round(latestSnapshot.score - previousSnapshot[1].score)
            : null,
        summary: latestSnapshot.summary,
        recommendations: latestSnapshot.recommendations as Array<{
          priority: "HIGH" | "MEDIUM" | "LOW";
          title: string;
          description: string;
          actionType: string;
        }>,
        categoryDetails: latestSnapshot.categoryDetails,
        deductions: latestSnapshot.deductions,
        createdAt: latestSnapshot.createdAt,
        statusLabel: getHealthScoreStatusLabel(latestSnapshot.score),
      }
    : null;

  if (!health) {
    const calculated = await calculateBusinessHealthScore({
      tenantId,
      periodStart,
      periodEnd,
      persist: true,
    });
    health = {
      score: calculated.score ?? 0,
      trend: calculated.trend,
      summary: calculated.summary,
      recommendations: calculated.recommendations,
      categoryDetails: calculated.categoryScores,
      deductions: calculated.deductions,
      createdAt: new Date(),
      statusLabel: getHealthScoreStatusLabel(calculated.score),
    };
  }

  const pipeline = Object.values(LeadStatus).reduce(
    (acc, status) => {
      acc[status] = leadGroups.find((g) => g.status === status)?._count._all ?? 0;
      return acc;
    },
    {} as Record<LeadStatus, number>,
  );

  return {
    tenant,
    kpis: {
      callsToday,
      newLeads,
      appointmentsBooked,
      unresolvedCalls,
      overdueFollowUps,
      qualifiedOpportunities,
    },
    recentCalls,
    pipeline,
    health,
    activity,
    priorities: openPriorities,
  };
}
