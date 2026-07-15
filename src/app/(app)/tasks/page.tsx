import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function TasksPage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const tasks = await prisma.followUpTask.findMany({
    where: { tenantId: ctx.tenantId },
    include: { lead: true, assignedUser: true },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    take: 100,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-3xl">Follow-up tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{task.title}</p>
              <Badge variant={task.dueAt < new Date() && task.status !== "COMPLETED" ? "danger" : "secondary"}>
                {task.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
            <p className="mt-2 text-sm">
              Due {new Date(task.dueAt).toLocaleString()} · {task.priority} ·{" "}
              {task.assignedUser?.name ?? "Unassigned"}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
