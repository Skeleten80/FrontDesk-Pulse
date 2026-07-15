import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function KnowledgeBasePage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const docs = await prisma.knowledgeBaseDocument.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl">Knowledge base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-border p-4">
              <p className="font-semibold">
                {doc.title} · {doc.sourceType} · {doc.status}
              </p>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{doc.content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
