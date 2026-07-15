import {
  callFinalizationSchema,
  intentClassificationSchema,
  leadQualificationSchema,
  type CallFinalization,
  type IntentClassification,
  type LeadQualification,
} from "@/domain/schemas/ai";
import type { AiBusinessContext, AiProvider } from "@/providers/ai/types";

function detectInjection(text: string): boolean {
  const patterns = [
    /ignore (all )?previous instructions/i,
    /reveal (the )?system prompt/i,
    /access (another|other) tenant/i,
    /bypass booking/i,
    /send arbitrary/i,
    /transfer.*(unapproved|any) number/i,
  ];
  return patterns.some((p) => p.test(text));
}

export class MockAiProvider implements AiProvider {
  async classifyIntent(input: {
    transcript: string;
    context: AiBusinessContext;
  }): Promise<IntentClassification> {
    void input.context;
    const text = input.transcript.toLowerCase();

    if (detectInjection(input.transcript)) {
      return intentClassificationSchema.parse({
        intent: "OTHER",
        confidence: 0.99,
        serviceRequested: null,
        urgency: "LOW",
        requiresHuman: true,
        reasoning: "Possible prompt injection detected; escalate safely.",
      });
    }

    let intent: IntentClassification["intent"] = "NEW_LEAD";
    let serviceRequested: string | null = null;
    let urgency: IntentClassification["urgency"] = "MEDIUM";
    let confidence = 0.86;
    let requiresHuman = false;

    if (text.includes("emergency") || text.includes("urgent replacement")) {
      intent = "EMERGENCY_REQUEST";
      urgency = "URGENT";
      confidence = 0.93;
      requiresHuman = true;
      serviceRequested = "Urgent replacement part";
    } else if (text.includes("appointment") || text.includes("project review")) {
      intent = "APPOINTMENT_REQUEST";
      serviceRequested = "Project review meeting";
      confidence = 0.91;
    } else if (text.includes("quote") || text.includes("cnc") || text.includes("tolerances")) {
      intent = "QUOTE_REQUEST";
      serviceRequested = text.includes("tolerances")
        ? "CNC machining with tight tolerances"
        : "CNC machining quote";
      confidence = 0.94;
    } else if (text.includes("job status") || text.includes("existing")) {
      intent = "EXISTING_CUSTOMER";
      confidence = 0.88;
      requiresHuman = true;
    } else if (text.includes("prototype") || text.includes("low-volume")) {
      intent = "QUOTE_REQUEST";
      serviceRequested = "Low-volume prototype machining";
      confidence = 0.9;
    } else if (text.includes("hours") || text.includes("location") || text.includes("do you")) {
      intent = "GENERAL_INFORMATION";
      confidence = 0.84;
    }

    return intentClassificationSchema.parse({
      intent,
      confidence,
      serviceRequested,
      urgency,
      requiresHuman,
    });
  }

  async qualifyLead(input: {
    transcript: string;
    intent: IntentClassification;
    context: AiBusinessContext;
  }): Promise<LeadQualification> {
    void input.context;
    const text = input.transcript.toLowerCase();
    const isMachineShopQuestion =
      text.includes("cnc") ||
      text.includes("tolerance") ||
      text.includes("prototype") ||
      text.includes("machining");

    return leadQualificationSchema.parse({
      serviceRequested: input.intent.serviceRequested,
      location: text.includes("mississauga") ? "Mississauga" : "Local service area",
      preferredDate: text.includes("tomorrow") ? "tomorrow" : null,
      urgency: input.intent.urgency,
      budgetRange: null,
      projectDescription: input.transcript.slice(0, 280),
      companyName: text.includes("acme") ? "Acme Components" : null,
      estimatedQuantity: isMachineShopQuestion
        ? text.includes("prototype")
          ? "1-5 pieces"
          : "small batch"
        : null,
      requiredCompletionDate: text.includes("urgent") ? "ASAP" : null,
      preferredContactMethod: "PHONE",
      qualificationScore:
        input.intent.intent === "SPAM" ? 10 : input.intent.urgency === "URGENT" ? 88 : 72,
      nextAction:
        input.intent.intent === "APPOINTMENT_REQUEST"
          ? "Confirm appointment slot and send SMS"
          : "Call back with quote details",
    });
  }

  async finalizeCall(input: {
    transcript: string;
    intent: IntentClassification;
    qualification: LeadQualification | null;
    context: AiBusinessContext;
    appointmentBooked: boolean;
  }): Promise<CallFinalization> {
    void input.context;
    const requiresFollowUp =
      !input.appointmentBooked &&
      input.intent.intent !== "GENERAL_INFORMATION" &&
      input.intent.intent !== "SPAM";

    let outcome: CallFinalization["outcome"] = "LEAD_CAPTURED";
    let resolutionStatus: CallFinalization["resolutionStatus"] = "NEEDS_FOLLOW_UP";

    if (input.appointmentBooked) {
      outcome = "APPOINTMENT_BOOKED";
      resolutionStatus = "RESOLVED";
    } else if (input.intent.requiresHuman || input.intent.intent === "EMERGENCY_REQUEST") {
      outcome = "ESCALATED";
      resolutionStatus = "ESCALATED";
    } else if (input.intent.intent === "GENERAL_INFORMATION") {
      outcome = "INFORMATION_PROVIDED";
      resolutionStatus = "RESOLVED";
    } else if (input.intent.intent === "SPAM") {
      outcome = "SPAM";
      resolutionStatus = "RESOLVED";
    }

    return callFinalizationSchema.parse({
      summary: `Caller contacted about ${input.intent.serviceRequested ?? input.intent.intent.toLowerCase().replaceAll("_", " ")}. Intent confidence ${(input.intent.confidence * 100).toFixed(0)}%. ${input.qualification?.nextAction ?? "No further qualification captured."}`,
      sentiment: input.intent.urgency === "URGENT" ? "MIXED" : "NEUTRAL",
      outcome,
      resolutionStatus,
      requiresFollowUp,
      followUpDeadlineHours: requiresFollowUp
        ? input.intent.urgency === "URGENT"
          ? 2
          : 24
        : null,
      recommendedNextAction:
        input.qualification?.nextAction ??
        (input.appointmentBooked ? "Prepare for upcoming appointment" : "Review call recording"),
      callerFirstName: null,
      callerLastName: null,
      callerEmail: null,
      callerCompanyName: input.qualification?.companyName ?? null,
    });
  }

  async answerQuestion(input: {
    question: string;
    context: AiBusinessContext;
  }): Promise<{ answer: string; confident: boolean }> {
    if (detectInjection(input.question)) {
      return {
        answer:
          "I can only help with questions about this business. A team member can follow up if you need more help.",
        confident: true,
      };
    }

    const haystack = [
      ...input.context.services,
      ...input.context.knowledgeSnippets,
    ]
      .join(" ")
      .toLowerCase();

    const q = input.question.toLowerCase();
    if (q.includes("prototype") && haystack.includes("prototype")) {
      return {
        answer: `Yes, ${input.context.businessName} handles low-volume prototypes. A specialist can confirm capacity and lead times.`,
        confident: true,
      };
    }

    if (q.includes("tolerance") && haystack.includes("tolerance")) {
      return {
        answer:
          "We commonly machine to tight tolerances on approved materials. Exact capability depends on the drawing — a team member will follow up to confirm.",
        confident: true,
      };
    }

    const snippet = input.context.knowledgeSnippets.find((s) =>
      q.split(" ").some((word) => word.length > 4 && s.toLowerCase().includes(word)),
    );

    if (snippet) {
      return { answer: snippet, confident: true };
    }

    return {
      answer:
        "I do not have an approved answer for that. A team member will follow up with accurate details.",
      confident: false,
    };
  }
}
