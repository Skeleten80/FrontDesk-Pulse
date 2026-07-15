import { beforeAll, describe, expect, it } from "vitest";
import { MembershipRole, TenantStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { processInboundCall } from "@/services/call/call-service";

describe("inbound call vertical slice", () => {
  let tenantId = "";

  beforeAll(async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        authProviderId: `call-owner-${suffix}`,
        email: `call-owner-${suffix}@test.demo`,
        name: "Call Owner",
        passwordHash: await hash("password123", 10),
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: `Call Flow Shop ${suffix}`,
        slug: `call-flow-${suffix}`,
        industry: "Machine Shop",
        phoneNumber: `+1555300${suffix.slice(0, 4)}`,
        status: TenantStatus.ACTIVE,
        memberships: {
          create: { userId: user.id, role: MembershipRole.OWNER },
        },
        businessProfile: {
          create: {
            legalName: "Call Flow Shop",
            publicName: "Call Flow Shop",
            timezone: "America/Toronto",
            businessHours: {},
            services: ["CNC milling", "Prototype machining"],
            serviceArea: ["Mississauga"],
            appointmentRules: { durationMinutes: 45, bookingNoticeHours: 24 },
          },
        },
        receptionistConfiguration: {
          create: {
            assistantName: "Riley",
            greeting: "Thanks for calling Call Flow Shop",
            fallbackMessage: "A team member will follow up",
            afterHoursMessage: "We are closed",
            allowAppointmentBooking: true,
            allowSmsFollowUp: true,
          },
        },
        knowledgeBaseDocuments: {
          create: {
            title: "Prototypes",
            sourceType: "FAQ",
            content: "We handle low-volume prototypes.",
            status: "READY",
          },
        },
      },
    });

    tenantId = tenant.id;
  });

  it("creates caller, lead, task, and is idempotent on call sid", async () => {
    const callSid = `CA_FLOW_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;

    const first = await processInboundCall({
      tenantId,
      callSid,
      fromPhoneNumber: "+15559876111",
      toPhoneNumber: "+15553000000",
      callerSpeech:
        "Hi, I need a CNC machining quote for a low-volume prototype and would like an appointment for a project review.",
      callerFirstName: "Pat",
      callerLastName: "Lee",
      callerCompanyName: "Lee Robotics",
    });

    expect(first.idempotent).toBe(false);
    expect(first.call.leads.length).toBeGreaterThan(0);
    // Appointment confirmation resolves the call; follow-up tasks are created when unresolved.
    expect(first.call.appointmentId || first.call.tasks.length > 0).toBeTruthy();
    if (first.idempotent) {
      throw new Error("Expected non-idempotent first call");
    }
    // Score may be null until enough period data exists; snapshot path still runs.
    expect(first.health).toBeDefined();

    const second = await processInboundCall({
      tenantId,
      callSid,
      fromPhoneNumber: "+15559876111",
      toPhoneNumber: "+15553000000",
      callerSpeech: "duplicate",
    });

    expect(second.idempotent).toBe(true);
    expect(second.call.id).toBe(first.call.id);
  });

  it("creates a follow-up task for quote requests without booking", async () => {
    const callSid = `CA_QUOTE_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const result = await processInboundCall({
      tenantId,
      callSid,
      fromPhoneNumber: "+15559876333",
      toPhoneNumber: "+15553000000",
      callerSpeech: "I need a CNC machining quote for 25 aluminum brackets.",
      callerFirstName: "Quinn",
      callerLastName: "Adler",
      callerCompanyName: "Adler Manufacturing",
    });

    expect(result.idempotent).toBe(false);
    expect(result.call.leads.length).toBeGreaterThan(0);
    expect(result.call.tasks.length).toBeGreaterThan(0);
  });

  it("never claims booking without calendar confirmation path", async () => {
    const callSid = `CA_INFO_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const result = await processInboundCall({
      tenantId,
      callSid,
      fromPhoneNumber: "+15559876222",
      toPhoneNumber: "+15553000000",
      callerSpeech: "What are your hours of operation?",
      callerFirstName: "Info",
      callerLastName: "Caller",
    });

    expect(result.idempotent).toBe(false);
    if (!result.idempotent) {
      // General info should not force a fabricated appointment.
      expect(result.call.appointmentId == null || result.call.intent === "APPOINTMENT_REQUEST").toBe(
        true,
      );
    }
  });
});
