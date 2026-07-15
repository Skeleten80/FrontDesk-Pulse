import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import { getAuthorizedTenantContext } from "@/lib/session";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthorizedTenantContext().catch(() => null);
  if (!ctx?.user) redirect("/sign-in");

  if (!ctx.tenantId || !ctx.membership) {
    redirect("/onboarding");
  }

  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: ctx.user.id },
    include: { tenant: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell
      user={ctx.user}
      tenant={ctx.membership.tenant}
      tenants={memberships.map((m) => m.tenant)}
    >
      {children}
    </AppShell>
  );
}
