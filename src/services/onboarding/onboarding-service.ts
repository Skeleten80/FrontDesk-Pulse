import { MembershipRole, TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { writeAuditLog } from "@/services/audit/audit-service";
import type {
  onboardingIdentitySchema,
  onboardingOperationsSchema,
  onboardingReceptionistSchema,
} from "@/domain/schemas/onboarding";
import type { z } from "zod";

type IdentityInput = z.infer<typeof onboardingIdentitySchema>;
type OperationsInput = z.infer<typeof onboardingOperationsSchema>;
type ReceptionistInput = z.infer<typeof onboardingReceptionistSchema>;

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "business";
  let attempt = 0;
  while (attempt < 20) {
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt += 1;
    slug = `${slugify(base)}-${attempt + 1}`;
  }
  return `${slugify(base)}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createWorkspace(userId: string, input: IdentityInput) {
  const slug = await uniqueSlug(input.businessName);

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        name: input.businessName,
        slug,
        industry: input.industry,
        phoneNumber: input.mainPhone,
        timezone: input.timezone,
        status: TenantStatus.PENDING_SETUP,
        businessProfile: {
          create: {
            legalName: input.businessName,
            publicName: input.businessName,
            city: input.city,
            provinceOrState: input.provinceOrState,
            country: input.country,
            timezone: input.timezone,
            website: input.website || null,
            mainPhone: input.mainPhone,
            businessHours: {
              monday: { open: "09:00", close: "17:00", closed: false },
              tuesday: { open: "09:00", close: "17:00", closed: false },
              wednesday: { open: "09:00", close: "17:00", closed: false },
              thursday: { open: "09:00", close: "17:00", closed: false },
              friday: { open: "09:00", close: "17:00", closed: false },
              saturday: { open: "09:00", close: "12:00", closed: true },
              sunday: { open: "09:00", close: "12:00", closed: true },
            },
            services: [],
            serviceArea: [],
            appointmentRules: {
              durationMinutes: 60,
              bookingNoticeHours: 24,
            },
          },
        },
        receptionistConfiguration: {
          create: {
            assistantName: "Alex",
            greeting: `Thank you for calling ${input.businessName}. How can I help you today?`,
            speakingStyle: "professional",
            fallbackMessage:
              "I want to make sure you get accurate help. A team member will follow up shortly.",
            afterHoursMessage:
              "We are currently closed. Please leave your name and number and we will call you back.",
            allowAppointmentBooking: true,
            allowSmsFollowUp: true,
            allowCallTransfer: false,
          },
        },
        memberships: {
          create: {
            userId,
            role: MembershipRole.OWNER,
          },
        },
        inboundNumbers: {
          create: {
            phoneNumber: input.mainPhone,
            label: "Main",
          },
        },
      },
    });

    return created;
  });

  await writeAuditLog({
    tenantId: tenant.id,
    userId,
    action: "TENANT_CREATED",
    resourceType: "Tenant",
    resourceId: tenant.id,
  });

  return tenant;
}

export async function updateOperations(tenantId: string, input: OperationsInput) {
  return prisma.businessProfile.update({
    where: { tenantId },
    data: {
      description: input.description,
      services: input.services,
      serviceArea: input.serviceArea,
      businessHours: input.businessHours,
      emergencyInstructions: input.emergencyInstructions,
      appointmentRules: {
        durationMinutes: input.appointmentDurationMinutes,
        bookingNoticeHours: input.bookingNoticeHours,
      },
    },
  });
}

export async function updateReceptionist(tenantId: string, input: ReceptionistInput) {
  return prisma.receptionistConfiguration.update({
    where: { tenantId },
    data: {
      assistantName: input.assistantName,
      greeting: input.greeting,
      speakingStyle: input.speakingStyle,
      transferNumber: input.transferNumber || null,
      afterHoursMessage: input.afterHoursMessage,
      fallbackMessage: input.fallbackMessage,
      allowAppointmentBooking: input.allowAppointmentBooking,
      allowSmsFollowUp: input.allowSmsFollowUp,
      allowCallTransfer: input.allowCallTransfer,
    },
  });
}

export async function activateTenant(tenantId: string, userId: string) {
  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      status: TenantStatus.ACTIVE,
      activatedAt: new Date(),
    },
  });

  await writeAuditLog({
    tenantId,
    userId,
    action: "TENANT_ACTIVATED",
    resourceType: "Tenant",
    resourceId: tenantId,
  });

  return tenant;
}
