import { redirect } from "next/navigation";
import { createWorkspaceAction } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSessionUser } from "@/lib/session";

export default async function OnboardingIdentityPage() {
  await requireSessionUser().catch(() => redirect("/sign-in"));

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Card className="animate-fade-up">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Step 1 of 4</p>
          <CardTitle className="font-display text-3xl">Business identity</CardTitle>
          <CardDescription>Create your workspace. Access is tied to your login, not a client-supplied tenant id.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWorkspaceAction} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" name="businessName" required placeholder="Precision CNC Works" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" required placeholder="Machine Shop" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" name="timezone" required defaultValue="America/Toronto" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provinceOrState">Province / State</Label>
                <Input id="provinceOrState" name="provinceOrState" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mainPhone">Main phone</Label>
                <Input id="mainPhone" name="mainPhone" required placeholder="+15550100100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" placeholder="https://" />
              </div>
            </div>
            <input type="hidden" name="country" value="CA" />
            <Button type="submit">Continue</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
