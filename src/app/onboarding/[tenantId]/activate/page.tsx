import { redirect } from "next/navigation";
import { activateTenantAction } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function OnboardingActivatePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const ctx = await getAuthorizedTenantContext(tenantId).catch(() => null);
  if (!ctx?.membership) redirect("/sign-in");

  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId },
    include: { businessProfile: true, receptionistConfiguration: true },
  });
  if (!tenant) redirect("/onboarding");

  const missing: string[] = [];
  if (!tenant.businessProfile?.description) missing.push("Business description");
  if (!tenant.businessProfile?.services || (tenant.businessProfile.services as unknown[]).length === 0) {
    missing.push("Services");
  }
  if (!tenant.receptionistConfiguration?.greeting) missing.push("Receptionist greeting");

  async function action() {
    "use server";
    await activateTenantAction(tenantId);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Step 4 of 4</p>
          <CardTitle className="font-display text-3xl">Review and activate</CardTitle>
          <CardDescription>
            Confirm setup for {tenant.name}. Recording/transcription consent is configured by the business;
            you are responsible for meeting applicable privacy requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm">
            <li>Business: {tenant.businessProfile?.publicName}</li>
            <li>Industry: {tenant.industry}</li>
            <li>Assistant: {tenant.receptionistConfiguration?.assistantName}</li>
            <li>Main phone: {tenant.phoneNumber}</li>
          </ul>
          {missing.length > 0 ? (
            <div className="rounded-md border border-warning/40 bg-[#fff7ed] p-3 text-sm text-warning">
              Missing before a polished launch: {missing.join(", ")}. You can still activate the MVP workspace.
            </div>
          ) : (
            <div className="rounded-md border border-success/30 bg-[#ecfdf3] p-3 text-sm text-success">
              Setup checklist looks complete.
            </div>
          )}
          <form action={action}>
            <Button type="submit">Activate workspace</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
