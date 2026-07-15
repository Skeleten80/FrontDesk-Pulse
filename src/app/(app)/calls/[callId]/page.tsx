import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";
import { assertTenantResourceAccess } from "@/server/authorization";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId || !ctx.membership) redirect("/sign-in");

  const call = await prisma.call.findFirst({
    where: { id: callId, tenantId: ctx.tenantId },
    include: {
      caller: true,
      leads: true,
      appointment: true,
      tasks: true,
      events: { orderBy: { eventTimestamp: "asc" } },
      smsMessages: true,
    },
  });

  if (!call) notFound();
  assertTenantResourceAccess(call.tenantId, ctx.tenantId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href="/calls" className="hover:underline">
              Calls
            </Link>{" "}
            / Detail
          </p>
          <h2 className="font-display text-3xl">
            {call.caller.firstName ?? "Caller"} {call.caller.lastName ?? ""}
          </h2>
        </div>
        <Badge>{call.status}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Summary & transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{call.summary ?? "No summary yet."}</p>
            <div className="rounded-lg bg-muted/60 p-4 text-sm whitespace-pre-wrap">
              {call.transcript ?? "No transcript."}
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Intent: {call.intentOverride ?? call.intent ?? "—"}</p>
              <p>Outcome: {call.outcomeOverride ?? call.outcome ?? "—"}</p>
              <p>Sentiment: {call.sentiment ?? "—"}</p>
              <p>
                AI confidence:{" "}
                {call.intentConfidence != null
                  ? `${Math.round(call.intentConfidence * 100)}%`
                  : "—"}
              </p>
              <p>Resolution: {call.resolutionStatus ?? "—"}</p>
              <p>Duration: {call.durationSeconds ?? "—"}s</p>
            </div>
            {call.aiRawResult ? (
              <p className="text-xs text-muted-foreground">
                Original AI result preserved for auditability.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Caller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{call.caller.phoneNumber}</p>
              <p>{call.caller.email ?? "No email"}</p>
              <p>{call.caller.companyName ?? "No company"}</p>
              <Link href="/customers" className="text-primary hover:underline">
                View customers
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {call.leads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="block text-primary hover:underline">
                  Lead · {lead.status} · {lead.serviceRequested ?? "General"}
                </Link>
              ))}
              {call.appointment ? (
                <Link href="/appointments" className="block text-primary hover:underline">
                  Appointment · {call.appointment.status}
                </Link>
              ) : (
                <p>No appointment</p>
              )}
              {call.tasks.map((task) => (
                <Link key={task.id} href="/tasks" className="block text-primary hover:underline">
                  Task · {task.title}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {call.events.map((event) => (
            <div key={event.id} className="border-l-2 border-primary/40 pl-3">
              <p className="font-medium">{event.eventType}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(event.eventTimestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
