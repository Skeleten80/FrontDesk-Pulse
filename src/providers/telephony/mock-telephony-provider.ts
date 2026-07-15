import type { TelephonyProvider } from "@/providers/telephony/types";

export class MockTelephonyProvider implements TelephonyProvider {
  verifySignature(_input: {
    signature: string | null;
    url: string;
    params: Record<string, string>;
  }): boolean {
    void _input;
    return true;
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
