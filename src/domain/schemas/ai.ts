import { z } from "zod";

export const callIntentSchema = z.enum([
  "GENERAL_INFORMATION",
  "APPOINTMENT_REQUEST",
  "QUOTE_REQUEST",
  "NEW_LEAD",
  "EXISTING_CUSTOMER",
  "SUPPORT_REQUEST",
  "BILLING_QUESTION",
  "EMERGENCY_REQUEST",
  "SPAM",
  "OTHER",
]);

export const urgencySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const intentClassificationSchema = z.object({
  intent: callIntentSchema,
  confidence: z.number().min(0).max(1),
  serviceRequested: z.string().nullable(),
  urgency: urgencySchema,
  requiresHuman: z.boolean(),
  reasoning: z.string().optional(),
});

export const leadQualificationSchema = z.object({
  serviceRequested: z.string().nullable(),
  location: z.string().nullable(),
  preferredDate: z.string().nullable(),
  urgency: urgencySchema,
  budgetRange: z.string().nullable(),
  projectDescription: z.string().nullable(),
  companyName: z.string().nullable(),
  estimatedQuantity: z.string().nullable(),
  requiredCompletionDate: z.string().nullable(),
  preferredContactMethod: z.enum(["PHONE", "SMS", "EMAIL"]).nullable(),
  qualificationScore: z.number().min(0).max(100),
  nextAction: z.string(),
});

export const callOutcomeSchema = z.enum([
  "INFORMATION_PROVIDED",
  "LEAD_CAPTURED",
  "APPOINTMENT_BOOKED",
  "ESCALATED",
  "VOICEMAIL",
  "ABANDONED",
  "SPAM",
  "UNRESOLVED",
  "OTHER",
]);

export const resolutionStatusSchema = z.enum([
  "RESOLVED",
  "NEEDS_FOLLOW_UP",
  "ESCALATED",
  "UNRESOLVED",
]);

export const sentimentSchema = z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]);

export const callFinalizationSchema = z.object({
  summary: z.string().min(1),
  sentiment: sentimentSchema,
  outcome: callOutcomeSchema,
  resolutionStatus: resolutionStatusSchema,
  requiresFollowUp: z.boolean(),
  followUpDeadlineHours: z.number().int().positive().nullable(),
  recommendedNextAction: z.string(),
  callerFirstName: z.string().nullable(),
  callerLastName: z.string().nullable(),
  callerEmail: z.string().email().nullable().or(z.literal(null)),
  callerCompanyName: z.string().nullable(),
});

export const healthRecommendationRewriteSchema = z.object({
  recommendations: z.array(
    z.object({
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
      title: z.string(),
      description: z.string(),
      actionType: z.string(),
    }),
  ),
});

export type IntentClassification = z.infer<typeof intentClassificationSchema>;
export type LeadQualification = z.infer<typeof leadQualificationSchema>;
export type CallFinalization = z.infer<typeof callFinalizationSchema>;
