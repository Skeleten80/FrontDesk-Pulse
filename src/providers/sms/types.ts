export type SendSmsRequest = {
  tenantId: string;
  to: string;
  body: string;
  from?: string;
};

export type SendSmsResult = {
  providerMessageSid: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  sentAt: Date;
};

export interface SmsProvider {
  sendSms(input: SendSmsRequest): Promise<SendSmsResult>;
}
