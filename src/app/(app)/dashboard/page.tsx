import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimulateCallPanel } from "@/components/dashboard/simulate-call-panel";
import { getAuthorizedTenantContext } from "@/lib/session";
import { getDashboardData } from "@/services/dashboard/dashboard-service";

function kpi(label: string, value: number) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const data = await getDashboardData(ctx.tenantId);
  const healthScore = data.health?.score ?? null;
  const trend = data.health?.trend;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="animate-fade-up overflow-hidden border-primary/20 bg-[linear-gradient(135deg,#ffffff_0%,#eef7f2_100%)]">
          <CardHeader>
            <CardDescription>Business Health Score</CardDescription>
            <CardTitle className="flex flex-wrap items-end gap-3 font-display text-5xl">
              {healthScore ?? "—"}
              <Badge
                variant={
                  (healthScore ?? 0) >= 75
                    ? "success"
                    : (healthScore ?? 0) >= 60
                      ? "warning"
                      : "danger"
                }
              >
                {data.health?.statusLabel ?? "Not enough data"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {trend == null ? "No prior period to compare." : `Change from previous period: ${trend > 0 ? "+" : ""}${trend}`}
            </p>
            <p className="max-w-2xl text-base">{data.health?.summary}</p>
            <p className="text-xs text-muted-foreground">
              Calculated {data.health?.createdAt ? new Date(data.health.createdAt).toLocaleString() : "just now"}
            </p>
            <Button asChild variant="outline">
              <Link href="/health-score">View score details</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="animate-fade-up-delay">
          <CardHeader>
            <CardTitle>Today&apos;s priorities</CardTitle>
            <CardDescription>Top actions for the owner and staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.health?.recommendations ?? []).slice(0, 5).map((rec) => (
              <div key={rec.title} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{rec.title}</p>
                  <Badge variant={rec.priority === "HIGH" ? "danger" : "warning"}>{rec.priority}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
              </div>
            ))}
            {data.priorities.slice(0, 3).map((task) => (
              <div key={task.id} className="rounded-lg border border-border p-3">
                <p className="font-semibold">{task.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Due {new Date(task.dueAt).toLocaleString()} · {task.priority}
                </p>
                <Button asChild size="sm" className="mt-2" variant="secondary">
                  <Link href="/tasks">Open task</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpi("Calls today", data.kpis.callsToday)}
        {kpi("New leads", data.kpis.newLeads)}
        {kpi("Appointments booked", data.kpis.appointmentsBooked)}
        {kpi("Unresolved calls", data.kpis.unresolvedCalls)}
        {kpi("Overdue follow-ups", data.kpis.overdueFollowUps)}
        {kpi("Qualified opportunities", data.kpis.qualifiedOpportunities)}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent calls</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Caller</th>
                  <th className="pb-2 font-medium">Time</th>
                  <th className="pb-2 font-medium">Intent</th>
                  <th className="pb-2 font-medium">Outcome</th>
                  <th className="pb-2 font-medium">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCalls.map((call) => (
                  <tr key={call.id} className="border-t border-border">
                    <td className="py-2">
                      <Link className="font-medium text-primary hover:underline" href={`/calls/${call.id}`}>
                        {call.caller.firstName ?? "Caller"} {call.caller.lastName ?? ""}
                      </Link>
                    </td>
                    <td className="py-2">{new Date(call.startedAt).toLocaleTimeString()}</td>
                    <td className="py-2">{call.intent ?? "—"}</td>
                    <td className="py-2">{call.outcome ?? "—"}</td>
                    <td className="py-2">{call.requiresFollowUp ? "Needed" : "Clear"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(data.pipeline).map(([status, count]) => (
              <div key={status} className="rounded-lg bg-muted/70 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {status.replaceAll("_", " ")}
                </p>
                <p className="mt-1 font-display text-2xl">{count}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Activity feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activity.map((item) => (
              <div key={item.id} className="border-b border-border pb-3 last:border-0">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description ?? item.eventType} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <SimulateCallPanel tenantId={ctx.tenantId} />
      </section>
    </div>
  );
}
