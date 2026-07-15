import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function IntegrationsPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const integrations = await prisma.integrationConnection.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { provider: "asc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Integrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No integrations connected yet. MVP uses mock providers by default.
          </p>
        ) : null}
        {integrations.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{item.provider}</p>
              <Badge variant={item.status === "ERROR" ? "danger" : "success"}>{item.status}</Badge>
            </div>
            {item.lastError ? <p className="mt-2 text-sm text-danger">{item.lastError}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Last success:{" "}
              {item.lastSuccessfulSyncAt
                ? new Date(item.lastSuccessfulSyncAt).toLocaleString()
                : "—"}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
