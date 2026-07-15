import { NextResponse } from "next/server";
import { z } from "zod";
import { ACTIVE_TENANT_COOKIE, requireSessionUser } from "@/lib/session";
import { requireTenantMembership } from "@/server/authorization";

const bodySchema = z.object({
  tenantId: z.string().cuid(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await requireTenantMembership(user.id, parsed.data.tenantId);

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACTIVE_TENANT_COOKIE, parsed.data.tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
