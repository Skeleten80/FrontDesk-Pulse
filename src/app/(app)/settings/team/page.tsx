import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function TeamPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId: ctx.tenantId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Team & permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {memberships.map((m) => (
          <div key={m.id} className="rounded-lg border border-border p-4 text-sm">
            <p className="font-semibold">
              {m.user.name} · {m.role}
            </p>
            <p className="text-muted-foreground">{m.user.email}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
