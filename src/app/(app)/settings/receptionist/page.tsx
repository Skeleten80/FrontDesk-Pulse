import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function ReceptionistSettingsPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const config = await prisma.receptionistConfiguration.findUnique({
    where: { tenantId: ctx.tenantId },
  });

  if (!config) redirect("/onboarding");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">AI receptionist settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>Assistant name: {config.assistantName}</p>
        <p>Speaking style: {config.speakingStyle}</p>
        <p>Language: {config.language}</p>
        <p>Greeting: {config.greeting}</p>
        <p>After hours: {config.afterHoursMessage}</p>
        <p>Fallback: {config.fallbackMessage}</p>
        <p>Appointment booking: {config.allowAppointmentBooking ? "Enabled" : "Disabled"}</p>
        <p>SMS follow-up: {config.allowSmsFollowUp ? "Enabled" : "Disabled"}</p>
        <p>Call transfer: {config.allowCallTransfer ? "Enabled" : "Disabled"}</p>
        <p>Transfer number: {config.transferNumber ?? "—"}</p>
      </CardContent>
    </Card>
  );
}
