import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function AppointmentsPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    include: { caller: true },
    orderBy: { startTime: "asc" },
    take: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {appointments.map((appt) => (
          <div key={appt.id} className="rounded-lg border border-border p-4">
            <p className="font-semibold">{appt.title}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(appt.startTime).toLocaleString()} · {appt.timezone} · {appt.status}
            </p>
            <p className="text-sm">
              {appt.caller.firstName} {appt.caller.lastName} · {appt.caller.phoneNumber}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
