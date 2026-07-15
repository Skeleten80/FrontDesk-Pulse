import type { SendSmsRequest, SendSmsResult, SmsProvider } from "@/providers/sms/types";

export class MockSmsProvider implements SmsProvider {
  async sendSms(input: SendSmsRequest): Promise<SendSmsResult> {
    if (!input.to || input.to.length < 7) {
      return {
        providerMessageSid: `mock_fail_${crypto.randomUUID()}`,
        status: "FAILED",
        sentAt: new Date(),
      };
    }

    return {
      providerMessageSid: `mock_sms_${crypto.randomUUID()}`,
      status: "SENT",
      sentAt: new Date(),
    };
  }
}
