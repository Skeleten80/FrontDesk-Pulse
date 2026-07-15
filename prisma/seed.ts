import {
  AppointmentStatus,
  CallDirection,
  CallIntent,
  CallOutcome,
  CallStatus,
  IntegrationProvider,
  IntegrationStatus,
  LeadPriority,
  LeadSource,
  LeadStatus,
  MembershipRole,
  PrismaClient,
  ResolutionStatus,
  Sentiment,
  TaskPriority,
  TaskStatus,
  TenantStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { addDays, addHours, subDays, subHours } from "date-fns";

const prisma = new PrismaClient();

const defaultHours = {
  monday: { open: "08:00", close: "17:00", closed: false },
  tuesday: { open: "08:00", close: "17:00", closed: false },
  wednesday: { open: "08:00", close: "17:00", closed: false },
  thursday: { open: "08:00", close: "17:00", closed: false },
  friday: { open: "08:00", close: "16:00", closed: false },
  saturday: { open: "09:00", close: "12:00", closed: true },
  sunday: { open: "09:00", close: "12:00", closed: true },
};

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD ?? "DemoOwner123!";
  const passwordHash = await hash(password, 10);

  await prisma.activityEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.healthScoreSnapshot.deleteMany();
  await prisma.smsMessage.deleteMany();
  await prisma.followUpTask.deleteMany();
  await prisma.callEvent.deleteMany();
  await prisma.call.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.caller.deleteMany();
  await prisma.knowledgeBaseChunk.deleteMany();
  await prisma.knowledgeBaseDocument.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.twilioInboundNumber.deleteMany();
  await prisma.receptionistConfiguration.deleteMany();
  await prisma.businessProfile.deleteMany();
  await prisma.tenantMembership.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const owner = await prisma.user.create({
    data: {
      authProviderId: "demo-owner",
      name: "Jordan Hale",
      email: "owner@precisioncnc.demo",
      passwordHash,
      isPlatformAdmin: false,
    },
  });

  const staff = await prisma.user.create({
    data: {
      authProviderId: "demo-staff",
      name: "Sam Rivera",
      email: "staff@precisioncnc.demo",
      passwordHash,
    },
  });

  const admin = await prisma.user.create({
    data: {
      authProviderId: "demo-admin",
      name: "Platform Admin",
      email: "admin@frontdeskpulse.demo",
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: "Precision CNC Works",
      slug: "precision-cnc-works",
      industry: "Machine Shop",
      phoneNumber: "+15550100100",
      timezone: "America/Toronto",
      status: TenantStatus.ACTIVE,
      isDemo: true,
      activatedAt: subDays(new Date(), 30),
      recordingConsentEnabled: true,
      recordingConsentMessage:
        "This call may be recorded and transcribed so our team can follow up accurately.",
      businessProfile: {
        create: {
          legalName: "Precision CNC Works Ltd.",
          publicName: "Precision CNC Works",
          description:
            "Local machine shop specializing in CNC milling, turning, and low-volume prototype work for manufacturers and maintenance teams.",
          address: "120 Industrial Parkway",
          city: "Mississauga",
          provinceOrState: "ON",
          postalCode: "L5A 1A1",
          country: "CA",
          timezone: "America/Toronto",
          website: "https://precisioncnc.demo",
          publicEmail: "hello@precisioncnc.demo",
          mainPhone: "+15550100100",
          businessHours: defaultHours,
          services: [
            "CNC milling",
            "CNC turning",
            "Prototype machining",
            "Low-volume production",
            "Fixture fabrication",
          ],
          serviceArea: ["Mississauga", "Brampton", "Oakville", "Toronto"],
          appointmentRules: {
            durationMinutes: 45,
            bookingNoticeHours: 24,
          },
          emergencyInstructions:
            "For machine-down replacement parts, capture material, dimensions, and needed-by date, then escalate immediately.",
          escalationInstructions:
            "Transfer or create an urgent task when the caller requests a human, describes an emergency, or asks for job status on an existing order.",
        },
      },
      receptionistConfiguration: {
        create: {
          assistantName: "Riley",
          greeting:
            "Thanks for calling Precision CNC Works. This is Riley, the AI receptionist. How can I help today?",
          speakingStyle: "clear and practical",
          language: "en-CA",
          allowAppointmentBooking: true,
          allowSmsFollowUp: true,
          allowCallTransfer: true,
          transferNumber: "+15550100199",
          fallbackMessage:
            "I want to make sure you get accurate information. A team member will follow up shortly.",
          afterHoursMessage:
            "We are currently closed. Please share your name, number, and what you need, and we will call you back next business day.",
          prohibitedTopics: ["legal advice", "medical advice", "guaranteed delivery dates"],
          escalationRules: {
            escalateOn: ["human request", "emergency", "job status", "low confidence"],
          },
          industryQualificationHints: {
            askAbout: ["material", "quantity", "tolerances", "needed-by date", "drawing availability"],
          },
        },
      },
      memberships: {
        create: [
          { userId: owner.id, role: MembershipRole.OWNER },
          { userId: staff.id, role: MembershipRole.STAFF },
        ],
      },
      inboundNumbers: {
        create: {
          phoneNumber: "+15550100100",
          label: "Main line",
        },
      },
    },
  });

  const faqs = [
    {
      title: "Prototype capability",
      content:
        "Precision CNC Works handles low-volume prototypes and small batches. Exact capacity depends on machine load and material.",
    },
    {
      title: "Tolerances",
      content:
        "We commonly machine to tight tolerances on approved materials. Final capability depends on the drawing and inspection requirements.",
    },
    {
      title: "Quote process",
      content:
        "Quotes usually need a drawing or clear dimensions, material, quantity, and needed-by date. A estimator follows up with pricing.",
    },
  ];

  for (const faq of faqs) {
    const doc = await prisma.knowledgeBaseDocument.create({
      data: {
        tenantId: tenant.id,
        title: faq.title,
        sourceType: "FAQ",
        content: faq.content,
        status: "READY",
      },
    });
    await prisma.knowledgeBaseChunk.create({
      data: {
        tenantId: tenant.id,
        documentId: doc.id,
        content: faq.content,
        metadata: { source: "seed-faq" },
      },
    });
  }

  await prisma.integrationConnection.createMany({
    data: [
      {
        tenantId: tenant.id,
        provider: IntegrationProvider.TWILIO,
        status: IntegrationStatus.CONNECTED,
        lastSuccessfulSyncAt: subHours(new Date(), 2),
        encryptedCredentialsReference: "enc_ref_twilio_demo",
      },
      {
        tenantId: tenant.id,
        provider: IntegrationProvider.GOOGLE_CALENDAR,
        status: IntegrationStatus.ERROR,
        lastError: "OAuth refresh token expired — reconnect Google Calendar.",
        encryptedCredentialsReference: "enc_ref_gcal_demo",
      },
    ],
  });

  const callScripts = [
    {
      speech: "Hi, I need a CNC machining quote for an aluminum bracket, about 25 pieces.",
      intent: CallIntent.QUOTE_REQUEST,
      outcome: CallOutcome.LEAD_CAPTURED,
      resolution: ResolutionStatus.NEEDS_FOLLOW_UP,
      firstName: "Casey",
      lastName: "Nguyen",
      company: "Northline Automation",
      phone: "+15550101001",
      priority: LeadPriority.HIGH,
      service: "CNC machining quote — aluminum brackets",
      estimatedValue: 4200,
    },
    {
      speech: "Can you hold tolerances around two thousandths on steel shafts?",
      intent: CallIntent.GENERAL_INFORMATION,
      outcome: CallOutcome.INFORMATION_PROVIDED,
      resolution: ResolutionStatus.RESOLVED,
      firstName: "Morgan",
      lastName: "Blake",
      company: null,
      phone: "+15550101002",
      priority: LeadPriority.MEDIUM,
      service: null,
      estimatedValue: null,
    },
    {
      speech: "We have an urgent replacement-part request. Our line is down.",
      intent: CallIntent.EMERGENCY_REQUEST,
      outcome: CallOutcome.ESCALATED,
      resolution: ResolutionStatus.ESCALATED,
      firstName: "Avery",
      lastName: "Patel",
      company: "Lakeview Packaging",
      phone: "+15550101003",
      priority: LeadPriority.URGENT,
      service: "Urgent replacement part",
      estimatedValue: 1800,
    },
    {
      speech: "Do you handle low-volume prototypes for a new fixture design?",
      intent: CallIntent.QUOTE_REQUEST,
      outcome: CallOutcome.LEAD_CAPTURED,
      resolution: ResolutionStatus.NEEDS_FOLLOW_UP,
      firstName: "Riley",
      lastName: "Cho",
      company: "Blue Harbor Labs",
      phone: "+15550101004",
      priority: LeadPriority.HIGH,
      service: "Low-volume prototype machining",
      estimatedValue: 2600,
    },
    {
      speech: "I'd like an appointment for a project review next week.",
      intent: CallIntent.APPOINTMENT_REQUEST,
      outcome: CallOutcome.APPOINTMENT_BOOKED,
      resolution: ResolutionStatus.RESOLVED,
      firstName: "Taylor",
      lastName: "Brooks",
      company: "Summit Motion",
      phone: "+15550101005",
      priority: LeadPriority.MEDIUM,
      service: "Project review meeting",
      estimatedValue: 0,
    },
    {
      speech: "This is an existing customer asking about job status on PO 4412.",
      intent: CallIntent.EXISTING_CUSTOMER,
      outcome: CallOutcome.ESCALATED,
      resolution: ResolutionStatus.ESCALATED,
      firstName: "Jamie",
      lastName: "Ortiz",
      company: "Ortiz Tooling",
      phone: "+15550101006",
      priority: LeadPriority.MEDIUM,
      service: "Job status inquiry",
      estimatedValue: null,
    },
  ] as const;

  // Expand to ~20 calls by repeating patterns with variation
  const expanded = Array.from({ length: 20 }, (_, i) => {
    const base = callScripts[i % callScripts.length]!;
    return {
      ...base,
      phone: `+15550101${String(100 + i).padStart(3, "0")}`,
      firstName: base.firstName,
      lastName: `${base.lastName}${i > 5 ? ` ${i}` : ""}`,
      hoursAgo: 4 + i * 5,
    };
  });

  const leadStatuses: LeadStatus[] = [
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFIED,
    LeadStatus.APPOINTMENT_BOOKED,
    LeadStatus.QUOTE_REQUESTED,
    LeadStatus.WON,
    LeadStatus.LOST,
    LeadStatus.UNRESPONSIVE,
    LeadStatus.QUOTE_REQUESTED,
    LeadStatus.NEW,
    LeadStatus.QUALIFIED,
    LeadStatus.CONTACTED,
  ];

  let leadsCreated = 0;
  let appointmentsCreated = 0;
  let tasksCreated = 0;

  for (const [index, script] of expanded.entries()) {
    const caller = await prisma.caller.create({
      data: {
        tenantId: tenant.id,
        phoneNumber: script.phone,
        firstName: script.firstName,
        lastName: script.lastName,
        companyName: script.company,
        email: `${script.firstName.toLowerCase()}.${index}@example.demo`,
      },
    });

    const startedAt = subHours(new Date(), script.hoursAgo);
    const call = await prisma.call.create({
      data: {
        tenantId: tenant.id,
        callerId: caller.id,
        twilioCallSid: `CA_DEMO_${String(index + 1).padStart(3, "0")}`,
        direction: CallDirection.INBOUND,
        status: CallStatus.COMPLETED,
        startedAt,
        endedAt: addHours(startedAt, 0.1),
        durationSeconds: 90 + index * 7,
        transcript: script.speech,
        summary: `Caller discussed: ${script.speech}`,
        sentiment: index % 5 === 0 ? Sentiment.MIXED : Sentiment.NEUTRAL,
        intent: script.intent,
        intentConfidence: 0.8 + (index % 10) / 100,
        outcome: script.outcome,
        resolutionStatus: script.resolution,
        requiresFollowUp: script.resolution !== ResolutionStatus.RESOLVED,
        followUpDeadline:
          script.resolution !== ResolutionStatus.RESOLVED
            ? subHours(new Date(), index % 3 === 0 ? 6 : -12)
            : null,
        aiRawResult: { seeded: true, intent: script.intent },
      },
    });

    await prisma.callEvent.createMany({
      data: [
        {
          tenantId: tenant.id,
          callId: call.id,
          eventType: "INCOMING",
          eventTimestamp: startedAt,
          idempotencyKey: `${call.twilioCallSid}:INCOMING`,
        },
        {
          tenantId: tenant.id,
          callId: call.id,
          eventType: "CALL_COMPLETED",
          eventTimestamp: call.endedAt ?? startedAt,
          idempotencyKey: `${call.twilioCallSid}:CALL_COMPLETED`,
        },
      ],
    });

    if (leadsCreated < 12 && script.service) {
      const status = leadStatuses[leadsCreated]!;
      const lead = await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          callerId: caller.id,
          sourceCallId: call.id,
          source: LeadSource.PHONE,
          status,
          priority: script.priority,
          serviceRequested: script.service,
          estimatedValue: script.estimatedValue,
          qualificationScore: 60 + (leadsCreated % 30),
          nextAction:
            status === LeadStatus.NEW
              ? "Call back with quote details"
              : "Advance pipeline",
          followUpDeadline:
            status === LeadStatus.NEW || status === LeadStatus.QUOTE_REQUESTED
              ? subHours(new Date(), leadsCreated === 0 ? 30 : -8)
              : addHours(new Date(), 24),
          assignedUserId: leadsCreated % 4 === 0 ? null : staff.id,
          lastContactedAt: status === LeadStatus.NEW ? null : subDays(new Date(), 1),
        },
      });
      leadsCreated += 1;

      if (appointmentsCreated < 6 && (script.intent === CallIntent.APPOINTMENT_REQUEST || leadsCreated <= 6)) {
        const start = addDays(new Date(), appointmentsCreated + 1);
        start.setHours(10 + appointmentsCreated, 0, 0, 0);
        const appointment = await prisma.appointment.create({
          data: {
            tenantId: tenant.id,
            callerId: caller.id,
            leadId: lead.id,
            externalCalendarEventId: `demo_cal_${appointmentsCreated + 1}`,
            title: `Review — ${caller.firstName}`,
            description: script.service ?? "Project review",
            startTime: start,
            endTime: addHours(start, 1),
            timezone: "America/Toronto",
            status:
              appointmentsCreated === 2
                ? AppointmentStatus.PENDING
                : AppointmentStatus.CONFIRMED,
            assignedUserId: owner.id,
          },
        });
        await prisma.call.update({
          where: { id: call.id },
          data: { appointmentId: appointment.id },
        });
        appointmentsCreated += 1;
      }

      if (tasksCreated < 10) {
        const overdue = tasksCreated < 3;
        await prisma.followUpTask.create({
          data: {
            tenantId: tenant.id,
            leadId: lead.id,
            callId: call.id,
            assignedUserId: tasksCreated % 2 === 0 ? owner.id : staff.id,
            title:
              tasksCreated === 0
                ? "Call high-value unresolved quote lead"
                : `Follow up: ${script.service}`,
            description: call.summary,
            priority:
              script.priority === LeadPriority.URGENT
                ? TaskPriority.URGENT
                : script.priority === LeadPriority.HIGH
                  ? TaskPriority.HIGH
                  : TaskPriority.MEDIUM,
            dueAt: overdue ? subHours(new Date(), 12 + tasksCreated) : addHours(new Date(), 18),
            status: tasksCreated === 9 ? TaskStatus.COMPLETED : TaskStatus.OPEN,
            completedAt: tasksCreated === 9 ? new Date() : null,
          },
        });
        tasksCreated += 1;
      }
    }

    if (index % 4 === 0) {
      await prisma.smsMessage.create({
        data: {
          tenantId: tenant.id,
          callerId: caller.id,
          callId: call.id,
          twilioMessageSid: `SM_DEMO_${index}`,
          direction: "OUTBOUND",
          body: "Thanks for calling Precision CNC Works. We will follow up shortly.",
          status: index === 8 ? "FAILED" : "SENT",
          sentAt: startedAt,
        },
      });
    }
  }

  // Ensure one unresolved high-value lead exists prominently
  const highValueCaller = await prisma.caller.create({
    data: {
      tenantId: tenant.id,
      phoneNumber: "+15550999901",
      firstName: "Dana",
      lastName: "West",
      companyName: "Westfield Robotics",
      email: "dana.west@example.demo",
    },
  });
  await prisma.lead.create({
    data: {
      tenantId: tenant.id,
      callerId: highValueCaller.id,
      source: LeadSource.PHONE,
      status: LeadStatus.QUOTE_REQUESTED,
      priority: LeadPriority.URGENT,
      serviceRequested: "High-value CNC production quote — 200 housings",
      estimatedValue: 28000,
      qualificationScore: 92,
      nextAction: "Provide quote and confirm material availability",
      followUpDeadline: subHours(new Date(), 40),
      assignedUserId: null,
    },
  });

  for (let i = 0; i < 5; i++) {
    const periodEnd = subDays(new Date(), 4 - i);
    const periodStart = subDays(periodEnd, 1);
    const score = 68 + i * 3 - (i === 4 ? 6 : 0);
    await prisma.healthScoreSnapshot.create({
      data: {
        tenantId: tenant.id,
        score,
        leadResponseScore: 14 + (i % 3),
        callResolutionScore: 16,
        appointmentScore: 11,
        followUpScore: 12 - (i === 4 ? 4 : 0),
        opportunityScore: 10,
        customerExperienceScore: 7,
        categoryDetails: {
          leadResponse: { score: 14, maxScore: 20, status: "NEEDS_ATTENTION" },
          followUp: { score: i === 4 ? 8 : 12, maxScore: 20, status: "NEEDS_ATTENTION" },
        },
        deductions: [
          {
            category: "FOLLOW_UP",
            points: i === 4 ? 4 : 2,
            reason: "High-priority follow-up tasks are overdue.",
          },
        ],
        summary: `Seeded score ${score} for demo period.`,
        recommendations: [
          {
            priority: "HIGH",
            title: "Contact overdue quote leads",
            description: "Several quote requests have not received a response.",
            actionType: "VIEW_OVERDUE_LEADS",
          },
        ],
        calculationVersion: "1.0.0",
        periodStart,
        periodEnd,
        periodType: "daily",
      },
    });
  }

  await prisma.notification.create({
    data: {
      tenantId: tenant.id,
      userId: owner.id,
      type: "CALENDAR_INTEGRATION_FAILURE",
      title: "Calendar integration needs attention",
      body: "Google Calendar OAuth refresh token expired.",
      href: "/settings/integrations",
    },
  });

  await prisma.activityEvent.createMany({
    data: [
      {
        tenantId: tenant.id,
        eventType: "INTEGRATION_ERROR",
        title: "Calendar integration error",
        description: "OAuth refresh token expired",
      },
      {
        tenantId: tenant.id,
        eventType: "SCORE_RECALCULATED",
        title: "Business Health Score recalculated",
        description: "Latest demo snapshot stored",
      },
    ],
  });

  console.log("Seed complete");
  console.log("Demo owner:", owner.email, password);
  console.log("Demo staff:", staff.email, password);
  console.log("Platform admin:", admin.email, password);
  console.log("Demo tenant:", tenant.slug);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
