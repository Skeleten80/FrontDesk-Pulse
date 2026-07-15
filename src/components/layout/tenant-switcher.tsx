"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function TenantSwitcher({
  tenantId,
  tenants,
}: {
  tenantId: string;
  tenants: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (tenants.length <= 1) return null;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">Switch business</span>
      <select
        className="h-10 rounded-md border border-border bg-white px-3 text-sm"
        defaultValue={tenantId}
        disabled={pending}
        onChange={async (event) => {
          const nextTenantId = event.target.value;
          await fetch("/api/tenant/switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenantId: nextTenantId }),
          });
          startTransition(() => router.refresh());
        }}
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
