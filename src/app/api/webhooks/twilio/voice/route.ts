import { NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { generateRequestId } from "@/lib/utils";
import { getTelephonyProvider } from "@/providers";
import {
  processInboundCall,
  resolveTenantIdByInboundNumber,
} from "@/services/call/call-service";

const twilioVoiceSchema = z.object({
  CallSid: z.string().min(1),
  From: z.string().min(1),
  To: z.string().min(1),
  CallStatus: z.string().optional(),
  SpeechResult: z.string().optional(),
});

function formDataToObject(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }
  return params;
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId, route: "webhooks/twilio/voice" });
  const env = getEnv();

  try {
    const formData = await request.formData();
    const params = formDataToObject(formData);
    const parsed = twilioVoiceSchema.safeParse(params);
    if (!parsed.success) {
      return new NextResponse("Invalid webhook payload", { status: 400 });
    }

    const telephony = getTelephonyProvider();
    const signature = request.headers.get("x-twilio-signature");
    const url = new URL(request.url);
    const publicUrl = `${env.NEXT_PUBLIC_APP_URL}${url.pathname}`;

    const valid = telephony.verifySignature({
      signature,
      url: publicUrl,
      params,
    });

    if (!valid) {
      log.warn("Twilio signature validation failed");
      return new NextResponse("Invalid signature", { status: 403 });
    }

    const tenantId = await resolveTenantIdByInboundNumber(parsed.data.To);
    if (!tenantId) {
      log.warn("No tenant mapped for inbound number", { to: parsed.data.To });
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say></Response>`,
        { status: 200, headers: { "Content-Type": "text/xml" } },
      );
    }

    // Full conversational media streams are out of scope for the first slice.
    // When SpeechResult is present (or in mock/demo enrichment), process the call.
    const speech =
      parsed.data.SpeechResult ??
      "Caller connected. Please have a team member follow up.";

    const result = await processInboundCall({
      tenantId,
      callSid: parsed.data.CallSid,
      fromPhoneNumber: parsed.data.From,
      toPhoneNumber: parsed.data.To,
      callerSpeech: speech,
      requestId,
    });

    const message =
      "greeting" in result && typeof result.greeting === "string"
        ? result.greeting
        : "Thanks for calling. A team member will follow up shortly.";

    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>${escapeXml(message)}</Say></Response>`,
      { status: 200, headers: { "Content-Type": "text/xml" } },
    );
  } catch (error) {
    log.error("Twilio voice webhook failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
