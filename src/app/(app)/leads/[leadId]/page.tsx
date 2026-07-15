import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";
import { assertTenantResourceAccess } from "@/server/authorization";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: ctx.tenantId },
    include: {
      caller: true,
      assignedUser: true,
      appointments: true,
      tasks: true,
      sourceCall: true,
    },
  });

  if (!lead) notFound();
  assertTenantResourceAccess(lead.tenantId, ctx.tenantId);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/leads" className="hover:underline">
            Leads
          </Link>{" "}
          / Detail
        </p>
        <h2 className="font-display text-3xl">
          {lead.caller.firstName} {lead.caller.lastName}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Status: {lead.status}</p>
            <p>Priority: {lead.priority}</p>
            <p>Source: {lead.source}</p>
            <p>Service: {lead.serviceRequested ?? "—"}</p>
            <p>Estimated value: {lead.estimatedValue?.toString() ?? "—"}</p>
            <p>Owner: {lead.assignedUser?.name ?? "Unassigned"}</p>
            <p>Next action: {lead.nextAction ?? "—"}</p>
            <p>
              Follow-up deadline:{" "}
              {lead.followUpDeadline ? new Date(lead.followUpDeadline).toLocaleString() : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{lead.caller.phoneNumber}</p>
            <p>{lead.caller.email ?? "No email"}</p>
            <p>{lead.caller.companyName ?? "No company"}</p>
            {lead.sourceCall ? (
              <Link href={`/calls/${lead.sourceCall.id}`} className="text-primary hover:underline">
                View source call
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks & appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {lead.tasks.map((task) => (
            <p key={task.id}>
              Task: {task.title} · {task.status} · due {new Date(task.dueAt).toLocaleString()}
            </p>
          ))}
          {lead.appointments.map((appt) => (
            <p key={appt.id}>
              Appointment: {appt.title} · {appt.status} ·{" "}
              {new Date(appt.startTime).toLocaleString()}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
