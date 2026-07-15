import { getEnv } from "@/lib/env";
import { MockAiProvider } from "@/providers/ai/mock-ai-provider";
import type { AiProvider } from "@/providers/ai/types";
import { MockCalendarProvider } from "@/providers/calendar/mock-calendar-provider";
import type { CalendarProvider } from "@/providers/calendar/types";
import { MockSmsProvider } from "@/providers/sms/mock-sms-provider";
import type { SmsProvider } from "@/providers/sms/types";
import { MockTelephonyProvider } from "@/providers/telephony/mock-telephony-provider";
import { TwilioTelephonyProvider } from "@/providers/telephony/twilio-telephony-provider";
import type { TelephonyProvider } from "@/providers/telephony/types";

let calendarSingleton: CalendarProvider | null = null;

export function getAiProvider(): AiProvider {
  const env = getEnv();
  if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    // Live OpenAI adapter is loaded lazily in a later integration swap.
    // Until configured, fall back to mock to avoid fabricating success.
    return new MockAiProvider();
  }
  return new MockAiProvider();
}

export function getCalendarProvider(): CalendarProvider {
  if (!calendarSingleton) {
    calendarSingleton = new MockCalendarProvider();
  }
  return calendarSingleton;
}

export function getSmsProvider(): SmsProvider {
  return new MockSmsProvider();
}

export function getTelephonyProvider(): TelephonyProvider {
  const env = getEnv();
  if (env.TELEPHONY_PROVIDER === "twilio") {
    return new TwilioTelephonyProvider();
  }
  return new MockTelephonyProvider();
}
