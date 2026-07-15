import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function CustomersPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const callers = await prisma.caller.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Customers & callers</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-2">Name</th>
              <th className="pb-2">Phone</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Company</th>
            </tr>
          </thead>
          <tbody>
            {callers.map((caller) => (
              <tr key={caller.id} className="border-t border-border">
                <td className="py-3">
                  {caller.firstName ?? "—"} {caller.lastName ?? ""}
                </td>
                <td className="py-3">{caller.phoneNumber}</td>
                <td className="py-3">{caller.email ?? "—"}</td>
                <td className="py-3">{caller.companyName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
