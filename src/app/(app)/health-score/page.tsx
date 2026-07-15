import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";
import { getHealthScoreStatusLabel } from "@/services/health-score/health-score-service";

type CategoryDetails = Record<
  string,
  { score: number | null; maxScore: number; status: string; explanation?: string }
>;

type Deduction = { category: string; points: number; reason: string };
type Recommendation = {
  priority: string;
  title: string;
  description: string;
  actionType: string;
};

export default async function HealthScorePage() {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.tenantId) redirect("/sign-in");

  const snapshots = await prisma.healthScoreSnapshot.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const latest = snapshots[0];
  const previous = snapshots[1];
  const trend =
    latest && previous ? Math.round(latest.score - previous.score) : null;

  const categories = (latest?.categoryDetails ?? {}) as CategoryDetails;
  const deductions = (latest?.deductions ?? []) as Deduction[];
  const recommendations = (latest?.recommendations ?? []) as Recommendation[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardDescription>Deterministic score · version {latest?.calculationVersion ?? "—"}</CardDescription>
          <CardTitle className="flex flex-wrap items-end gap-3 font-display text-5xl">
            {latest ? latest.score : "—"}
            <Badge>{latest ? getHealthScoreStatusLabel(latest.score) : "Not enough data"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>{latest?.summary ?? "No score calculated yet."}</p>
          <p className="text-sm text-muted-foreground">
            Trend vs previous period:{" "}
            {trend == null ? "n/a" : `${trend > 0 ? "+" : ""}${trend}`}
          </p>
          {latest ? (
            <p className="text-xs text-muted-foreground">
              Period {new Date(latest.periodStart).toLocaleString()} →{" "}
              {new Date(latest.periodEnd).toLocaleString()}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(categories).map(([key, value]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base capitalize">{key.replace(/([A-Z])/g, " $1")}</CardTitle>
              <CardDescription>{value.status.replaceAll("_", " ")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl">
                {value.score ?? "—"}
                <span className="text-base text-muted-foreground"> / {value.maxScore}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {value.explanation ?? "No explanation"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deductions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deductions recorded.</p>
            ) : (
              deductions.map((item, index) => (
                <div key={`${item.category}-${index}`} className="rounded-lg border border-border p-3">
                  <p className="font-semibold">
                    {item.category} · -{item.points}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((item) => (
              <div key={item.title} className="rounded-lg border border-border p-3">
                <p className="font-semibold">
                  {item.title}{" "}
                  <span className="text-xs text-muted-foreground">({item.priority})</span>
                </p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {snapshots.map((snap) => (
            <div key={snap.id} className="flex justify-between border-b border-border py-2">
              <span>{new Date(snap.createdAt).toLocaleString()}</span>
              <span className="font-semibold">{snap.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
