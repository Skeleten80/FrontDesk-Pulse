import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function BillingPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Billing & usage</CardTitle>
        <CardDescription>
          MVP placeholder. Usage metering hooks can attach to call, SMS, and AI token logs.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        No payment provider is connected in this MVP build.
      </CardContent>
    </Card>
  );
}
