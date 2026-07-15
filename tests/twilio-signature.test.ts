import { describe, expect, it } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { MockTelephonyProvider } from "@/providers/telephony/mock-telephony-provider";
import { TwilioTelephonyProvider } from "@/providers/telephony/twilio-telephony-provider";

describe("Twilio signature validation", () => {
  it("mock provider accepts signatures in demo mode", () => {
    const provider = new MockTelephonyProvider();
    expect(
      provider.verifySignature({
        signature: null,
        url: "http://localhost:3000/api/webhooks/twilio/voice",
        params: {},
      }),
    ).toBe(true);
  });

  it("twilio provider rejects missing signature when validation enabled", () => {
    process.env.TWILIO_VALIDATE_SIGNATURE = "true";
    process.env.TWILIO_AUTH_TOKEN = "test-token";
    resetEnvCache();
    const provider = new TwilioTelephonyProvider();
    expect(
      provider.verifySignature({
        signature: null,
        url: "http://localhost:3000/api/webhooks/twilio/voice",
        params: { CallSid: "CA123" },
      }),
    ).toBe(false);
  });
});
