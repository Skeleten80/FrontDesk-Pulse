import type {
  CallFinalization,
  IntentClassification,
  LeadQualification,
} from "@/domain/schemas/ai";

export type AiBusinessContext = {
  businessName: string;
  industry: string;
  services: string[];
  serviceArea: string[];
  businessHours: unknown;
  appointmentRules: unknown;
  knowledgeSnippets: string[];
  assistantName: string;
  speakingStyle: string;
  prohibitedTopics: string[];
  escalationRules: unknown;
};

export interface AiProvider {
  classifyIntent(input: {
    transcript: string;
    context: AiBusinessContext;
  }): Promise<IntentClassification>;

  qualifyLead(input: {
    transcript: string;
    intent: IntentClassification;
    context: AiBusinessContext;
  }): Promise<LeadQualification>;

  finalizeCall(input: {
    transcript: string;
    intent: IntentClassification;
    qualification: LeadQualification | null;
    context: AiBusinessContext;
    appointmentBooked: boolean;
  }): Promise<CallFinalization>;

  answerQuestion(input: {
    question: string;
    context: AiBusinessContext;
  }): Promise<{ answer: string; confident: boolean }>;
}
