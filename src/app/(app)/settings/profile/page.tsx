import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function BusinessProfilePage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const profile = await prisma.businessProfile.findUnique({
    where: { tenantId: ctx.tenantId },
  });
  if (!profile) redirect("/onboarding");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Business profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>{profile.publicName}</p>
        <p>{profile.description}</p>
        <p>
          {profile.city}, {profile.provinceOrState}, {profile.country}
        </p>
        <p>{profile.mainPhone}</p>
        <p>{profile.website}</p>
        <p>Timezone: {profile.timezone}</p>
        <p>Services: {(profile.services as string[]).join(", ")}</p>
        <p className="text-xs text-muted-foreground">
          Recording/transcription consent is configured per tenant. The business is responsible for
          meeting applicable privacy and consent requirements in their jurisdiction.
        </p>
      </CardContent>
    </Card>
  );
}
