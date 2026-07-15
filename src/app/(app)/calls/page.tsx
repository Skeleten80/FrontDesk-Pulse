import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function CallsPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const calls = await prisma.call.findMany({
    where: { tenantId: ctx.tenantId },
    include: { caller: true },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Calls</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="pb-2">Caller</th>
              <th className="pb-2">Time</th>
              <th className="pb-2">Intent</th>
              <th className="pb-2">Outcome</th>
              <th className="pb-2">Duration</th>
              <th className="pb-2">AI confidence</th>
              <th className="pb-2">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call.id} className="border-t border-border">
                <td className="py-3">
                  <Link href={`/calls/${call.id}`} className="font-medium text-primary hover:underline">
                    {call.caller.firstName ?? "Caller"} {call.caller.lastName ?? ""}
                  </Link>
                  <p className="text-xs text-muted-foreground">{call.caller.phoneNumber}</p>
                </td>
                <td className="py-3">{new Date(call.startedAt).toLocaleString()}</td>
                <td className="py-3">{call.intent ?? "—"}</td>
                <td className="py-3">{call.outcome ?? "—"}</td>
                <td className="py-3">{call.durationSeconds ? `${call.durationSeconds}s` : "—"}</td>
                <td className="py-3">
                  {call.intentConfidence != null
                    ? `${Math.round(call.intentConfidence * 100)}%`
                    : "—"}
                </td>
                <td className="py-3">
                  <Badge variant={call.requiresFollowUp ? "warning" : "success"}>
                    {call.requiresFollowUp ? "Needed" : "Clear"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
