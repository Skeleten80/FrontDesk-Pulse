import { z } from "zod";

export const businessHoursSchema = z.object({
  monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
  sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }),
});

export const onboardingIdentitySchema = z.object({
  businessName: z.string().min(2).max(120),
  industry: z.string().min(2).max(80),
  city: z.string().min(1).max(80),
  provinceOrState: z.string().min(1).max(80),
  country: z.string().min(2).max(2).default("CA"),
  timezone: z.string().min(1),
  website: z.string().url().optional().or(z.literal("")),
  mainPhone: z.string().min(7).max(30),
});

export const onboardingOperationsSchema = z.object({
  description: z.string().min(10).max(2000),
  services: z.array(z.string().min(1)).min(1),
  serviceArea: z.array(z.string().min(1)).min(1),
  appointmentDurationMinutes: z.number().int().min(15).max(480),
  bookingNoticeHours: z.number().int().min(0).max(720),
  emergencyInstructions: z.string().max(2000).optional(),
  businessHours: businessHoursSchema,
});

export const onboardingReceptionistSchema = z.object({
  assistantName: z.string().min(1).max(60),
  greeting: z.string().min(10).max(500),
  speakingStyle: z.string().min(1).max(60),
  transferNumber: z.string().max(30).optional().or(z.literal("")),
  afterHoursMessage: z.string().min(10).max(500),
  fallbackMessage: z.string().min(10).max(500),
  allowAppointmentBooking: z.boolean(),
  allowSmsFollowUp: z.boolean(),
  allowCallTransfer: z.boolean(),
});

export const simulateCallSchema = z.object({
  tenantId: z.string().cuid(),
  fromPhoneNumber: z.string().min(7).max(30),
  callerSpeech: z.string().min(5).max(4000),
  callerFirstName: z.string().optional(),
  callerLastName: z.string().optional(),
  callerEmail: z.string().email().optional(),
  callerCompanyName: z.string().optional(),
});
