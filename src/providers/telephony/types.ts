export type InboundCallWebhook = {
  callSid: string;
  from: string;
  to: string;
  callStatus?: string;
};

export type TelephonyGreetingResult = {
  greetingText: string;
  shouldRecord: boolean;
};

export interface TelephonyProvider {
  verifySignature(input: {
    signature: string | null;
    url: string;
    params: Record<string, string>;
  }): boolean;

  buildGreeting(input: {
    assistantName: string;
    greeting: string;
    recordingConsentEnabled: boolean;
    recordingConsentMessage?: string | null;
  }): TelephonyGreetingResult;
}
