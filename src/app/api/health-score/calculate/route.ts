import { NextResponse } from "next/server";
import { z } from "zod";
import { subDays } from "date-fns";
import { getEnv } from "@/lib/env";
import { getAuthorizedTenantContext } from "@/lib/session";
import { calculateBusinessHealthScore } from "@/services/health-score/health-score-service";
import { MembershipRole } from "@prisma/client";
import { requireTenantRole } from "@/server/authorization";

const bodySchema = z.object({
  tenantId: z.string().cuid(),
  periodDays: z.number().int().min(1).max(90).default(1),
});

export async function POST(request: Request) {
  const env = getEnv();
  const cronSecret = request.headers.get("x-cron-secret");
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const isCron = Boolean(env.CRON_SECRET && cronSecret === env.CRON_SECRET);

  if (!isCron) {
    const ctx = await getAuthorizedTenantContext(parsed.data.tenantId).catch(() => null);
    if (!ctx?.membership || ctx.tenantId !== parsed.data.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    requireTenantRole(ctx.membership, [MembershipRole.OWNER]);
  }

  const periodEnd = new Date();
  const periodStart = subDays(periodEnd, parsed.data.periodDays);
  const result = await calculateBusinessHealthScore({
    tenantId: parsed.data.tenantId,
    periodStart,
    periodEnd,
    periodType: parsed.data.periodDays >= 28 ? "monthly" : parsed.data.periodDays >= 7 ? "weekly" : "daily",
    persist: true,
  });

  return NextResponse.json(result);
}
