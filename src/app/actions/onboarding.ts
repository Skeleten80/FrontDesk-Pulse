"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  onboardingIdentitySchema,
  onboardingOperationsSchema,
  onboardingReceptionistSchema,
} from "@/domain/schemas/onboarding";
import { ACTIVE_TENANT_COOKIE, getAuthorizedTenantContext, requireSessionUser } from "@/lib/session";
import {
  activateTenant,
  createWorkspace,
  updateOperations,
  updateReceptionist,
} from "@/services/onboarding/onboarding-service";
import { MembershipRole } from "@prisma/client";
import { requireTenantRole } from "@/server/authorization";

export async function createWorkspaceAction(formData: FormData): Promise<void> {
  const user = await requireSessionUser();
  const parsed = onboardingIdentitySchema.safeParse({
    businessName: formData.get("businessName"),
    industry: formData.get("industry"),
    city: formData.get("city"),
    provinceOrState: formData.get("provinceOrState"),
    country: formData.get("country") || "CA",
    timezone: formData.get("timezone"),
    website: formData.get("website") || "",
    mainPhone: formData.get("mainPhone"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(", ") || "Invalid business identity");
  }

  const tenant = await createWorkspace(user.id, parsed.data);
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_TENANT_COOKIE, tenant.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect(`/onboarding/${tenant.id}/operations`);
}

export async function updateOperationsAction(tenantId: string, formData: FormData): Promise<void> {
  const { membership } = await getAuthorizedTenantContext(tenantId);
  if (!membership) throw new Error("Unauthorized");
  requireTenantRole(membership, [MembershipRole.OWNER]);

  const services = String(formData.get("services") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const serviceArea = String(formData.get("serviceArea") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const parsed = onboardingOperationsSchema.safeParse({
    description: formData.get("description"),
    services,
    serviceArea,
    appointmentDurationMinutes: Number(formData.get("appointmentDurationMinutes") ?? 60),
    bookingNoticeHours: Number(formData.get("bookingNoticeHours") ?? 24),
    emergencyInstructions: formData.get("emergencyInstructions") || undefined,
    businessHours: {
      monday: { open: "09:00", close: "17:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "12:00", closed: true },
      sunday: { open: "09:00", close: "12:00", closed: true },
    },
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(", ") || "Invalid operations data");
  }

  await updateOperations(tenantId, parsed.data);
  redirect(`/onboarding/${tenantId}/receptionist`);
}

export async function updateReceptionistAction(tenantId: string, formData: FormData): Promise<void> {
  const { membership } = await getAuthorizedTenantContext(tenantId);
  if (!membership) throw new Error("Unauthorized");
  requireTenantRole(membership, [MembershipRole.OWNER]);

  const parsed = onboardingReceptionistSchema.safeParse({
    assistantName: formData.get("assistantName"),
    greeting: formData.get("greeting"),
    speakingStyle: formData.get("speakingStyle"),
    transferNumber: formData.get("transferNumber") || "",
    afterHoursMessage: formData.get("afterHoursMessage"),
    fallbackMessage: formData.get("fallbackMessage"),
    allowAppointmentBooking: formData.get("allowAppointmentBooking") === "on",
    allowSmsFollowUp: formData.get("allowSmsFollowUp") === "on",
    allowCallTransfer: formData.get("allowCallTransfer") === "on",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join(", ") || "Invalid receptionist data");
  }

  await updateReceptionist(tenantId, parsed.data);
  redirect(`/onboarding/${tenantId}/activate`);
}

export async function activateTenantAction(tenantId: string): Promise<void> {
  const { user, membership } = await getAuthorizedTenantContext(tenantId);
  if (!membership) throw new Error("Unauthorized");
  requireTenantRole(membership, [MembershipRole.OWNER]);
  await activateTenant(tenantId, user.id);
  redirect("/dashboard");
}
