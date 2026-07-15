import twilio from "twilio";
import { getEnv } from "@/lib/env";
import type { TelephonyProvider } from "@/providers/telephony/types";

export class TwilioTelephonyProvider implements TelephonyProvider {
  verifySignature(input: {
    signature: string | null;
    url: string;
    params: Record<string, string>;
  }): boolean {
    const env = getEnv();
    if (!env.TWILIO_VALIDATE_SIGNATURE) {
      return true;
    }

    if (!env.TWILIO_AUTH_TOKEN || !input.signature) {
      return false;
    }

    return twilio.validateRequest(
      env.TWILIO_AUTH_TOKEN,
      input.signature,
      input.url,
      input.params,
    );
  }

  buildGreeting(input: {
    assistantName: string;
    greeting: string;
    recordingConsentEnabled: boolean;
    recordingConsentMessage?: string | null;
  }) {
    const consent =
      input.recordingConsentEnabled && input.recordingConsentMessage
        ? ` ${input.recordingConsentMessage}`
        : input.recordingConsentEnabled
          ? " This call may be recorded and transcribed for quality and follow-up."
          : "";

    return {
      greetingText: `${input.greeting}${consent}`,
      shouldRecord: input.recordingConsentEnabled,
    };
  }
}
