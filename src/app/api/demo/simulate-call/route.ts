import { NextResponse } from "next/server";
import { MembershipRole } from "@prisma/client";
import { simulateCallSchema } from "@/domain/schemas/onboarding";
import { prisma } from "@/lib/db";
import { generateRequestId } from "@/lib/utils";
import { getAuthorizedTenantContext } from "@/lib/session";
import { requireTenantRole } from "@/server/authorization";
import { processInboundCall } from "@/services/call/call-service";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const log = logger.child({ requestId, route: "demo/simulate-call" });

  try {
    const json = await request.json();
    const parsed = simulateCallSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const ctx = await getAuthorizedTenantContext(parsed.data.tenantId);
    if (!ctx.membership || ctx.tenantId !== parsed.data.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    requireTenantRole(ctx.membership, [MembershipRole.OWNER, MembershipRole.STAFF]);

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { id: parsed.data.tenantId },
      select: { phoneNumber: true },
    });

    const callSid = `CA_SIM_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;

    const result = await processInboundCall({
      tenantId: parsed.data.tenantId,
      callSid,
      fromPhoneNumber: parsed.data.fromPhoneNumber,
      toPhoneNumber: tenant.phoneNumber ?? "+15550000000",
      callerSpeech: parsed.data.callerSpeech,
      callerFirstName: parsed.data.callerFirstName,
      callerLastName: parsed.data.callerLastName,
      callerEmail: parsed.data.callerEmail,
      callerCompanyName: parsed.data.callerCompanyName,
      requestId,
    });

    log.info("Simulated call completed", { callId: result.call.id });

    return NextResponse.json({
      ok: true,
      callId: result.call.id,
      leadIds: result.call.leads.map((l) => l.id),
      taskIds: result.call.tasks.map((t) => t.id),
      appointmentId: result.call.appointmentId,
      healthScore: result.idempotent ? null : result.health.score,
      health: result.idempotent ? null : result.health,
      idempotent: result.idempotent,
    });
  } catch (error) {
    log.error("Simulate call failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to simulate call" },
      { status: 500 },
    );
  }
}
