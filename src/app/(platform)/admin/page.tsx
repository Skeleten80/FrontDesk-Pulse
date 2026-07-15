import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requirePlatformAdmin } from "@/server/authorization";
import { writeAuditLog } from "@/services/audit/audit-service";

export default async function PlatformAdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  try {
    requirePlatformAdmin(user);
  } catch {
    redirect("/dashboard");
  }

  await writeAuditLog({
    userId: user.id,
    action: "PLATFORM_ADMIN_DASHBOARD_VIEW",
    resourceType: "Platform",
  });

  const [tenantCount, activeTenants, integrationErrors, recentAudits] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.integrationConnection.findMany({
      where: { status: "ERROR" },
      include: { tenant: { select: { name: true, slug: true } } },
      take: 20,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <div>
        <p className="font-display text-2xl text-primary">FrontDesk Pulse</p>
        <h1 className="font-display text-4xl">Platform admin</h1>
        <p className="text-muted-foreground">
          Aggregated system health only. Sensitive call content is not shown here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Tenants</CardDescription>
            <CardTitle className="font-display text-4xl">{tenantCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active</CardDescription>
            <CardTitle className="font-display text-4xl">{activeTenants}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Integration errors</CardDescription>
            <CardTitle className="font-display text-4xl">{integrationErrors.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration failures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {integrationErrors.map((item) => (
            <p key={item.id}>
              {item.tenant.name} · {item.provider} · {item.lastError}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentAudits.map((item) => (
            <p key={item.id}>
              {item.action} · {item.resourceType} · {new Date(item.createdAt).toLocaleString()}
            </p>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
