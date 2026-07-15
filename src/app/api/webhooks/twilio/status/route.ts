import { NextResponse } from "next/server";
import { z } from "zod";
import { CallStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getTelephonyProvider } from "@/providers";

const schema = z.object({
  CallSid: z.string().min(1),
  CallStatus: z.string().min(1),
  CallDuration: z.string().optional(),
});

function mapStatus(status: string): CallStatus {
  switch (status.toLowerCase()) {
    case "ringing":
      return CallStatus.RINGING;
    case "in-progress":
      return CallStatus.IN_PROGRESS;
    case "completed":
      return CallStatus.COMPLETED;
    case "busy":
      return CallStatus.BUSY;
    case "failed":
      return CallStatus.FAILED;
    case "no-answer":
      return CallStatus.NO_ANSWER;
    case "canceled":
      return CallStatus.CANCELED;
    default:
      return CallStatus.IN_PROGRESS;
  }
}

export async function POST(request: Request) {
  const log = logger.child({ route: "webhooks/twilio/status" });
  const env = getEnv();

  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") params[key] = value;
    }

    const parsed = schema.safeParse(params);
    if (!parsed.success) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    const telephony = getTelephonyProvider();
    const valid = telephony.verifySignature({
      signature: request.headers.get("x-twilio-signature"),
      url: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
      params,
    });
    if (!valid) {
      return new NextResponse("Invalid signature", { status: 403 });
    }

    const call = await prisma.call.findUnique({
      where: { twilioCallSid: parsed.data.CallSid },
    });

    if (!call) {
      return new NextResponse("OK", { status: 200 });
    }

    const idempotencyKey = `${parsed.data.CallSid}:STATUS:${parsed.data.CallStatus}`;
    const existingEvent = await prisma.callEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existingEvent) {
      return new NextResponse("OK", { status: 200 });
    }

    await prisma.$transaction([
      prisma.call.update({
        where: { id: call.id },
        data: {
          status: mapStatus(parsed.data.CallStatus),
          durationSeconds: parsed.data.CallDuration
            ? Number(parsed.data.CallDuration)
            : undefined,
        },
      }),
      prisma.callEvent.create({
        data: {
          tenantId: call.tenantId,
          callId: call.id,
          eventType: "STATUS_UPDATE",
          payload: parsed.data,
          idempotencyKey,
        },
      }),
    ]);

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    log.error("Status webhook failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return new NextResponse("Error", { status: 500 });
  }
}
