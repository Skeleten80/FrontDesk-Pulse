import { redirect } from "next/navigation";
import { updateReceptionistAction } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function OnboardingReceptionistPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const ctx = await getAuthorizedTenantContext(tenantId).catch(() => null);
  if (!ctx?.membership) redirect("/sign-in");

  async function action(formData: FormData) {
    "use server";
    await updateReceptionistAction(tenantId, formData);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Step 3 of 4</p>
          <CardTitle className="font-display text-3xl">Receptionist setup</CardTitle>
          <CardDescription>Greeting, style, and follow-up preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assistantName">Assistant name</Label>
                <Input id="assistantName" name="assistantName" defaultValue="Alex" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speakingStyle">Speaking style</Label>
                <Input id="speakingStyle" name="speakingStyle" defaultValue="professional" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting</Label>
              <Textarea
                id="greeting"
                name="greeting"
                required
                defaultValue="Thanks for calling. How can I help you today?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="afterHoursMessage">After-hours message</Label>
              <Textarea
                id="afterHoursMessage"
                name="afterHoursMessage"
                required
                defaultValue="We are currently closed. Please leave your name and number and we will call you back."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackMessage">Fallback message</Label>
              <Textarea
                id="fallbackMessage"
                name="fallbackMessage"
                required
                defaultValue="A team member will follow up with accurate details."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferNumber">Transfer number</Label>
              <Input id="transferNumber" name="transferNumber" placeholder="+1..." />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allowAppointmentBooking" defaultChecked />
                Allow appointment booking
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allowSmsFollowUp" defaultChecked />
                Allow SMS follow-up
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="allowCallTransfer" />
                Allow call transfer
              </label>
            </div>
            <Button type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
