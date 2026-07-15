import {
  AppointmentStatus,
  LeadStatus,
  ResolutionStatus,
  SmsStatus,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const HEALTH_SCORE_CALCULATION_VERSION = "1.0.0";

export type CategoryStatus = "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION" | "AT_RISK" | "CRITICAL" | "NOT_ENOUGH_DATA";

export type CategoryScore = {
  score: number | null;
  maxScore: number;
  status: CategoryStatus;
  explanation: string;
};

export type HealthScoreDeduction = {
  category: string;
  points: number;
  reason: string;
};

export type HealthScoreRecommendation = {
  priority: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  actionType: string;
  relatedIds?: string[];
};

export type HealthScoreResult = {
  score: number | null;
  trend: number | null;
  categoryScores: {
    leadResponse: CategoryScore;
    callResolution: CategoryScore;
    appointment: CategoryScore;
    followUp: CategoryScore;
    opportunity: CategoryScore;
    customerExperience: CategoryScore;
  };
  deductions: HealthScoreDeduction[];
  recommendations: HealthScoreRecommendation[];
  summary: string;
  calculationVersion: string;
  periodStart: Date;
  periodEnd: Date;
  insufficientData: boolean;
};

function statusForRatio(ratio: number, maxScore: number, score: number): CategoryStatus {
  const pct = maxScore === 0 ? 0 : score / maxScore;
  if (pct >= 0.9) return "EXCELLENT";
  if (pct >= 0.75) return "GOOD";
  if (pct >= 0.6) return "NEEDS_ATTENTION";
  if (pct >= 0.4) return "AT_RISK";
  return "CRITICAL";
}

function overallLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Healthy";
  if (score >= 60) return "Needs Attention";
  if (score >= 40) return "At Risk";
  return "Critical";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function calculateBusinessHealthScore(input: {
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  periodType?: "daily" | "weekly" | "monthly";
  persist?: boolean;
}): Promise<HealthScoreResult> {
  const log = logger.child({
    tenantId: input.tenantId,
    service: "healthScoreService",
    calculationVersion: HEALTH_SCORE_CALCULATION_VERSION,
  });

  const { tenantId, periodStart, periodEnd } = input;

  const [leads, calls, appointments, tasks, smsMessages, previousSnapshot] =
    await Promise.all([
      prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.call.findMany({
        where: {
          tenantId,
          startedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.appointment.findMany({
        where: {
          tenantId,
          deletedAt: null,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.followUpTask.findMany({
        where: {
          tenantId,
          createdAt: { lte: periodEnd },
          OR: [
            { status: { in: [TaskStatus.OPEN, TaskStatus.IN_PROGRESS] } },
            { completedAt: { gte: periodStart, lte: periodEnd } },
          ],
        },
      }),
      prisma.smsMessage.findMany({
        where: {
          tenantId,
          createdAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.healthScoreSnapshot.findFirst({
        where: {
          tenantId,
          periodEnd: { lt: periodStart },
        },
        orderBy: { periodEnd: "desc" },
      }),
    ]);

  const deductions: HealthScoreDeduction[] = [];
  const recommendations: HealthScoreRecommendation[] = [];

  // 1) Lead Response — 20
  const leadMax = 20;
  let leadScore: number | null = null;
  let leadExplanation = "Not enough data";
  if (leads.length >= 3) {
    const contacted = leads.filter(
      (l) => l.status !== LeadStatus.NEW || l.lastContactedAt != null,
    ).length;
    const coverage = contacted / leads.length;
    const closedStatuses = new Set<LeadStatus>([
      LeadStatus.WON,
      LeadStatus.LOST,
      LeadStatus.UNRESPONSIVE,
    ]);
    const overdueHigh = leads.filter(
      (l) =>
        l.followUpDeadline &&
        l.followUpDeadline < periodEnd &&
        !closedStatuses.has(l.status) &&
        (l.priority === "HIGH" || l.priority === "URGENT"),
    );
    const noNextAction = leads.filter(
      (l) => !l.nextAction && l.status === LeadStatus.NEW,
    ).length;

    leadScore = clamp(Math.round(coverage * leadMax - overdueHigh.length * 2 - noNextAction), 0, leadMax);
    if (coverage < 0.95) {
      deductions.push({
        category: "LEAD_RESPONSE",
        points: Math.round((0.95 - coverage) * leadMax),
        reason: `Only ${Math.round(coverage * 100)}% of new leads received a response within the period.`,
      });
    }
    if (overdueHigh.length > 0) {
      deductions.push({
        category: "LEAD_RESPONSE",
        points: Math.min(8, overdueHigh.length * 2),
        reason: `${overdueHigh.length} high-priority lead(s) are overdue for follow-up.`,
      });
      recommendations.push({
        priority: "HIGH",
        title: `Contact ${overdueHigh.length} overdue lead${overdueHigh.length === 1 ? "" : "s"}`,
        description: "These leads requested help and have passed their follow-up deadline.",
        actionType: "VIEW_OVERDUE_LEADS",
        relatedIds: overdueHigh.map((l) => l.id),
      });
    }
    leadExplanation = `Response coverage ${Math.round(coverage * 100)}% across ${leads.length} leads.`;
  }

  // 2) Call Resolution — 20
  const callMax = 20;
  let callScore: number | null = null;
  let callExplanation = "Not enough data";
  const legitimateCalls = calls.filter((c) => c.intent !== "SPAM");
  if (legitimateCalls.length >= 3) {
    const resolved = legitimateCalls.filter(
      (c) => c.resolutionStatus === ResolutionStatus.RESOLVED,
    ).length;
    const abandoned = legitimateCalls.filter((c) => c.outcome === "ABANDONED").length;
    const escalated = legitimateCalls.filter(
      (c) => c.resolutionStatus === ResolutionStatus.ESCALATED,
    ).length;
    const unresolved = legitimateCalls.filter(
      (c) =>
        c.resolutionStatus === ResolutionStatus.UNRESOLVED ||
        c.resolutionStatus === ResolutionStatus.NEEDS_FOLLOW_UP,
    ).length;

    const resolutionRatio = resolved / legitimateCalls.length;
    callScore = clamp(
      Math.round(resolutionRatio * callMax - abandoned * 3 - unresolved * 1 + escalated * 0.5),
      0,
      callMax,
    );
    callExplanation = `${resolved}/${legitimateCalls.length} legitimate calls resolved.`;
    if (unresolved > 0) {
      deductions.push({
        category: "CALL_RESOLUTION",
        points: Math.min(10, unresolved),
        reason: `${unresolved} call(s) still need follow-up or remain unresolved.`,
      });
      recommendations.push({
        priority: "HIGH",
        title: `Review ${unresolved} unresolved call${unresolved === 1 ? "" : "s"}`,
        description: "These callers did not get a clear next step.",
        actionType: "VIEW_UNRESOLVED_CALLS",
      });
    }
    if (abandoned > 0) {
      deductions.push({
        category: "CALL_RESOLUTION",
        points: Math.min(9, abandoned * 3),
        reason: `${abandoned} abandoned call(s) reduced resolution performance.`,
      });
    }
  }

  // 3) Appointment Performance — 15
  const apptMax = 15;
  let apptScore: number | null = null;
  let apptExplanation = "Not enough data";
  const appointmentRequests = calls.filter((c) => c.intent === "APPOINTMENT_REQUEST");
  if (appointments.length >= 2 || appointmentRequests.length >= 2) {
    const confirmed = appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED || a.status === AppointmentStatus.COMPLETED).length;
    const cancelled = appointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
    const noShow = appointments.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
    const unconfirmed = appointments.filter((a) => a.status === AppointmentStatus.PENDING).length;
    const bookingRate =
      appointmentRequests.length === 0
        ? appointments.length > 0
          ? 1
          : 0
        : appointments.length / appointmentRequests.length;

    apptScore = clamp(
      Math.round(bookingRate * apptMax - cancelled * 2 - noShow * 3 - unconfirmed),
      0,
      apptMax,
    );
    apptExplanation = `${appointments.length} appointment(s); ${confirmed} confirmed/completed.`;
    if (unconfirmed > 0) {
      recommendations.push({
        priority: "MEDIUM",
        title: `Confirm ${unconfirmed} pending appointment${unconfirmed === 1 ? "" : "s"}`,
        description: "Unconfirmed appointments increase no-show risk.",
        actionType: "CONFIRM_APPOINTMENTS",
      });
      deductions.push({
        category: "APPOINTMENT",
        points: Math.min(5, unconfirmed),
        reason: `${unconfirmed} appointment(s) remain unconfirmed.`,
      });
    }
  }

  // 4) Follow-Up Execution — 20
  const followMax = 20;
  let followScore: number | null = null;
  let followExplanation = "Not enough data";
  if (tasks.length >= 3) {
    const openTasks = tasks.filter((t) => t.status === TaskStatus.OPEN || t.status === TaskStatus.IN_PROGRESS);
    const overdue = openTasks.filter((t) => t.dueAt < periodEnd);
    const highOverdue = overdue.filter((t) => t.priority === "HIGH" || t.priority === "URGENT");
    const completed = tasks.filter((t) => t.status === TaskStatus.COMPLETED);
    const completionRate = completed.length / tasks.length;

    followScore = clamp(
      Math.round(completionRate * followMax - overdue.length * 1.5 - highOverdue.length * 2),
      0,
      followMax,
    );
    followExplanation = `${completed.length}/${tasks.length} tasks completed; ${overdue.length} overdue.`;
    if (highOverdue.length > 0) {
      deductions.push({
        category: "FOLLOW_UP",
        points: Math.min(10, highOverdue.length * 2 + 2),
        reason: `${highOverdue.length} high-priority follow-up task(s) are overdue.`,
      });
      recommendations.push({
        priority: "HIGH",
        title: `Complete ${highOverdue.length} overdue high-priority task${highOverdue.length === 1 ? "" : "s"}`,
        description: "Overdue follow-ups are cooling hot leads.",
        actionType: "VIEW_OVERDUE_TASKS",
        relatedIds: highOverdue.map((t) => t.id),
      });
    }
  }

  // 5) Opportunity Conversion — 15
  const oppMax = 15;
  let oppScore: number | null = null;
  let oppExplanation = "Not enough data";
  if (leads.length >= 3) {
    const weights: Record<LeadStatus, number> = {
      NEW: 0.1,
      CONTACTED: 0.25,
      QUALIFIED: 0.45,
      APPOINTMENT_BOOKED: 0.7,
      QUOTE_REQUESTED: 0.65,
      WON: 1,
      LOST: 0,
      UNRESPONSIVE: 0.05,
    };
    const avg =
      leads.reduce((sum, l) => sum + (weights[l.status] ?? 0), 0) / leads.length;
    const unowned = leads.filter((l) => !l.assignedUserId && l.status === LeadStatus.NEW);
    oppScore = clamp(Math.round(avg * oppMax - unowned.length), 0, oppMax);
    oppExplanation = `Pipeline conversion index ${Math.round(avg * 100)}% across ${leads.length} leads.`;
    if (unowned.length > 0) {
      recommendations.push({
        priority: "MEDIUM",
        title: `Assign ${unowned.length} unowned lead${unowned.length === 1 ? "" : "s"}`,
        description: "Leads without an owner are more likely to go cold.",
        actionType: "ASSIGN_LEADS",
      });
      deductions.push({
        category: "OPPORTUNITY",
        points: Math.min(5, unowned.length),
        reason: `${unowned.length} new lead(s) have no owner.`,
      });
    }
  }

  // 6) Customer Experience — 10
  const cxMax = 10;
  let cxScore: number | null = null;
  let cxExplanation = "Not enough data";
  if (legitimateCalls.length >= 3 || smsMessages.length >= 3) {
    const negative = calls.filter((c) => c.sentiment === "NEGATIVE" || c.sentiment === "MIXED").length;
    const failedSms = smsMessages.filter((s) => s.status === SmsStatus.FAILED).length;
    const noNextStep = calls.filter(
      (c) => c.resolutionStatus === ResolutionStatus.UNRESOLVED && !c.requiresFollowUp,
    ).length;
    const positive = calls.filter((c) => c.sentiment === "POSITIVE").length;
    const base = legitimateCalls.length === 0 ? 0.7 : positive / Math.max(legitimateCalls.length, 1);
    cxScore = clamp(Math.round(base * cxMax - negative - failedSms * 2 - noNextStep), 0, cxMax);
    cxExplanation = `Sentiment and messaging quality across ${legitimateCalls.length} calls / ${smsMessages.length} SMS.`;
    if (failedSms > 0) {
      deductions.push({
        category: "CUSTOMER_EXPERIENCE",
        points: Math.min(4, failedSms * 2),
        reason: `${failedSms} SMS message(s) failed to send.`,
      });
      recommendations.push({
        priority: "MEDIUM",
        title: "Fix failed SMS delivery",
        description: "Callers may not have received confirmations or follow-ups.",
        actionType: "REVIEW_SMS_FAILURES",
      });
    }
  }

  const categories = {
    leadResponse: {
      score: leadScore,
      maxScore: leadMax,
      status: leadScore == null ? ("NOT_ENOUGH_DATA" as const) : statusForRatio(1, leadMax, leadScore),
      explanation: leadExplanation,
    },
    callResolution: {
      score: callScore,
      maxScore: callMax,
      status: callScore == null ? ("NOT_ENOUGH_DATA" as const) : statusForRatio(1, callMax, callScore),
      explanation: callExplanation,
    },
    appointment: {
      score: apptScore,
      maxScore: apptMax,
      status: apptScore == null ? ("NOT_ENOUGH_DATA" as const) : statusForRatio(1, apptMax, apptScore),
      explanation: apptExplanation,
    },
    followUp: {
      score: followScore,
      maxScore: followMax,
      status: followScore == null ? ("NOT_ENOUGH_DATA" as const) : statusForRatio(1, followMax, followScore),
      explanation: followExplanation,
    },
    opportunity: {
      score: oppScore,
      maxScore: oppMax,
      status: oppScore == null ? ("NOT_ENOUGH_DATA" as const) : statusForRatio(1, oppMax, oppScore),
      explanation: oppExplanation,
    },
    customerExperience: {
      score: cxScore,
      maxScore: cxMax,
      status: cxScore == null ? ("NOT_ENOUGH_DATA" as const) : statusForRatio(1, cxMax, cxScore),
      explanation: cxExplanation,
    },
  };

  const available = Object.values(categories).filter((c) => c.score != null);
  const insufficientData = available.length === 0;

  let score: number | null = null;
  if (!insufficientData) {
    const earned = available.reduce((sum, c) => sum + (c.score ?? 0), 0);
    const max = available.reduce((sum, c) => sum + c.maxScore, 0);
    score = Math.round((earned / max) * 100);
  }

  const integrationError = await prisma.integrationConnection.findFirst({
    where: { tenantId, status: "ERROR" },
  });
  if (integrationError) {
    recommendations.push({
      priority: "HIGH",
      title: "Reconnect a failing integration",
      description: `${integrationError.provider} reported: ${integrationError.lastError ?? "unknown error"}`,
      actionType: "FIX_INTEGRATION",
    });
  }

  const summary =
    score == null
      ? "Not enough data yet to calculate a reliable Business Health Score."
      : `Business Health Score is ${score} (${overallLabel(score)}). ${deductions[0]?.reason ?? "No major deductions in this period."}`;

  const trend =
    score != null && previousSnapshot ? Math.round(score - previousSnapshot.score) : null;

  const result: HealthScoreResult = {
    score,
    trend,
    categoryScores: categories,
    deductions,
    recommendations: recommendations.slice(0, 8),
    summary,
    calculationVersion: HEALTH_SCORE_CALCULATION_VERSION,
    periodStart,
    periodEnd,
    insufficientData,
  };

  if (input.persist !== false && score != null) {
    await prisma.healthScoreSnapshot.create({
      data: {
        tenantId,
        score,
        leadResponseScore: leadScore,
        callResolutionScore: callScore,
        appointmentScore: apptScore,
        followUpScore: followScore,
        opportunityScore: oppScore,
        customerExperienceScore: cxScore,
        categoryDetails: categories,
        deductions,
        summary,
        recommendations: result.recommendations,
        calculationVersion: HEALTH_SCORE_CALCULATION_VERSION,
        periodStart,
        periodEnd,
        periodType: input.periodType ?? "daily",
      },
    });

    await prisma.activityEvent.create({
      data: {
        tenantId,
        eventType: "SCORE_RECALCULATED",
        title: "Business Health Score recalculated",
        description: summary,
        resourceType: "HealthScoreSnapshot",
        metadata: { score, trend },
      },
    });
  }

  log.info("Health score calculated", {
    score,
    trend,
    deductionCount: deductions.length,
  });

  return result;
}

export function getHealthScoreStatusLabel(score: number | null): string {
  if (score == null) return "Not enough data";
  return overallLabel(score);
}
