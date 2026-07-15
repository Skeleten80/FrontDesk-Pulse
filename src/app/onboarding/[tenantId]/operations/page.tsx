import { redirect } from "next/navigation";
import { updateOperationsAction } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function OnboardingOperationsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const ctx = await getAuthorizedTenantContext(tenantId).catch(() => null);
  if (!ctx?.membership) redirect("/sign-in");

  async function action(formData: FormData) {
    "use server";
    await updateOperationsAction(tenantId, formData);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Step 2 of 4</p>
          <CardTitle className="font-display text-3xl">Business operations</CardTitle>
          <CardDescription>Services, area, and appointment rules used by the receptionist.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                required
                defaultValue="Local service business helping customers with quotes, appointments, and support."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services">Services (comma-separated)</Label>
              <Input id="services" name="services" required defaultValue="Service A, Service B" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceArea">Service area (comma-separated)</Label>
              <Input id="serviceArea" name="serviceArea" required defaultValue="Local area" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="appointmentDurationMinutes">Appointment duration (minutes)</Label>
                <Input
                  id="appointmentDurationMinutes"
                  name="appointmentDurationMinutes"
                  type="number"
                  defaultValue={60}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bookingNoticeHours">Booking notice (hours)</Label>
                <Input
                  id="bookingNoticeHours"
                  name="bookingNoticeHours"
                  type="number"
                  defaultValue={24}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyInstructions">Emergency instructions</Label>
              <Textarea id="emergencyInstructions" name="emergencyInstructions" />
            </div>
            <Button type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
