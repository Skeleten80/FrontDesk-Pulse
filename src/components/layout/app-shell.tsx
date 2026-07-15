import Link from "next/link";
import type { Tenant, User } from "@prisma/client";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calls", label: "Calls" },
  { href: "/leads", label: "Leads" },
  { href: "/appointments", label: "Appointments" },
  { href: "/tasks", label: "Tasks" },
  { href: "/customers", label: "Customers" },
  { href: "/knowledge-base", label: "Knowledge" },
  { href: "/health-score", label: "Health score" },
  { href: "/settings/receptionist", label: "Receptionist" },
  { href: "/settings/profile", label: "Business profile" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/billing", label: "Billing" },
];

export function AppShell({
  user,
  tenant,
  tenants,
  children,
}: {
  user: User;
  tenant: Pick<Tenant, "id" | "name">;
  tenants: Array<Pick<Tenant, "id" | "name">>;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-[#12352c] text-white lg:border-b-0 lg:border-r">
        <div className="px-5 py-5">
          <p className="font-display text-xl">FrontDesk Pulse</p>
          <p className="mt-1 text-sm text-white/70">{tenant.name}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-white/85 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white/80 px-4 py-3 backdrop-blur md:px-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="font-display text-2xl">{tenant.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <TenantSwitcher tenantId={tenant.id} tenants={tenants} />
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
            <Link
              href="/api/auth/signout"
              className="inline-flex h-10 items-center rounded-md border border-border bg-card px-3 text-sm font-semibold"
            >
              Sign out
            </Link>
          </div>
        </header>
        <div className="px-4 py-6 md:px-6">{children}</div>
      </div>
    </div>
  );
}
