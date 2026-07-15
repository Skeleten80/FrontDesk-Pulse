import { beforeAll, describe, expect, it } from "vitest";
import {
  LeadPriority,
  LeadStatus,
  MembershipRole,
  ResolutionStatus,
  TaskPriority,
  TaskStatus,
  TenantStatus,
} from "@prisma/client";
import { addHours, subDays, subHours } from "date-fns";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { calculateBusinessHealthScore } from "@/services/health-score/health-score-service";

describe("health score calculation", () => {
  let tenantId = "";

  beforeAll(async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        authProviderId: `test-owner-${suffix}`,
        email: `owner-${suffix}@test.demo`,
        name: "Test Owner",
        passwordHash: await hash("password123", 10),
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: `Health Score Shop ${suffix}`,
        slug: `health-score-${suffix}`,
        industry: "Machine Shop",
        status: TenantStatus.ACTIVE,
        memberships: {
          create: { userId: user.id, role: MembershipRole.OWNER },
        },
        businessProfile: {
          create: {
            legalName: "Health Score Shop",
            publicName: "Health Score Shop",
            businessHours: {},
            services: ["CNC"],
          },
        },
        receptionistConfiguration: {
          create: {
            greeting: "Hello",
            fallbackMessage: "We will follow up",
            afterHoursMessage: "Closed",
          },
        },
      },
    });
    tenantId = tenant.id;

    for (let i = 0; i < 4; i++) {
      const caller = await prisma.caller.create({
        data: {
          tenantId,
          phoneNumber: `+1555200${suffix.slice(0, 3)}${i}`,
          firstName: `Caller${i}`,
        },
      });

      await prisma.call.create({
        data: {
          tenantId,
          callerId: caller.id,
          twilioCallSid: `CA_TEST_${suffix}_${i}`,
          resolutionStatus:
            i === 0 ? ResolutionStatus.UNRESOLVED : ResolutionStatus.RESOLVED,
          transcript: "test",
          summary: "test",
        },
      });

      await prisma.lead.create({
        data: {
          tenantId,
          callerId: caller.id,
          status: i === 0 ? LeadStatus.NEW : LeadStatus.CONTACTED,
          priority: i === 0 ? LeadPriority.HIGH : LeadPriority.MEDIUM,
          followUpDeadline: i === 0 ? subHours(new Date(), 5) : addHours(new Date(), 5),
          nextAction: i === 0 ? null : "Follow up",
          lastContactedAt: i === 0 ? null : new Date(),
        },
      });

      await prisma.followUpTask.create({
        data: {
          tenantId,
          title: `Task ${i}`,
          priority: i < 2 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
          dueAt: i < 2 ? subHours(new Date(), 3) : addHours(new Date(), 3),
          status: TaskStatus.OPEN,
        },
      });
    }
  });

  it("returns not enough data cleanly for empty tenants", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const empty = await prisma.tenant.create({
      data: {
        name: `Empty ${suffix}`,
        slug: `empty-${suffix}`,
        industry: "Clinic",
        status: TenantStatus.ACTIVE,
      },
    });

    const result = await calculateBusinessHealthScore({
      tenantId: empty.id,
      periodStart: subDays(new Date(), 1),
      periodEnd: new Date(),
      persist: false,
    });

    expect(result.insufficientData).toBe(true);
    expect(result.score).toBeNull();
    expect(result.categoryScores.leadResponse.status).toBe("NOT_ENOUGH_DATA");
  });

  it("applies overdue follow-up deductions and recommendations", async () => {
    const result = await calculateBusinessHealthScore({
      tenantId,
      periodStart: subDays(new Date(), 1),
      periodEnd: new Date(),
      persist: true,
    });

    expect(result.score).not.toBeNull();
    expect(result.deductions.some((d) => d.category === "FOLLOW_UP")).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.calculationVersion).toBe("1.0.0");
  });
});
