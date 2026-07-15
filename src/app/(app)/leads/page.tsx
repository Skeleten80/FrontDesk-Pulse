import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function LeadsPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const leads = await prisma.lead.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    include: { caller: true, assignedUser: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Leads</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-2">Contact</th>
              <th className="pb-2">Service</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Priority</th>
              <th className="pb-2">Owner</th>
              <th className="pb-2">Follow-up</th>
              <th className="pb-2">Next action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-border">
                <td className="py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-primary hover:underline">
                    {lead.caller.firstName ?? "Caller"} {lead.caller.lastName ?? ""}
                  </Link>
                  <p className="text-xs text-muted-foreground">{lead.caller.companyName}</p>
                </td>
                <td className="py-3">{lead.serviceRequested ?? "—"}</td>
                <td className="py-3">{lead.status}</td>
                <td className="py-3">
                  <Badge variant={lead.priority === "URGENT" || lead.priority === "HIGH" ? "danger" : "secondary"}>
                    {lead.priority}
                  </Badge>
                </td>
                <td className="py-3">{lead.assignedUser?.name ?? "Unassigned"}</td>
                <td className="py-3">
                  {lead.followUpDeadline ? new Date(lead.followUpDeadline).toLocaleString() : "—"}
                </td>
                <td className="py-3">{lead.nextAction ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
