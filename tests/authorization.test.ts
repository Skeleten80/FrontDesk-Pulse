import { describe, expect, it } from "vitest";
import { MembershipRole } from "@prisma/client";
import {
  assertTenantResourceAccess,
  AuthError,
  requireTenantRole,
} from "@/server/authorization";

describe("authorization helpers", () => {
  it("blocks cross-tenant resource access", () => {
    expect(() => assertTenantResourceAccess("tenant_a", "tenant_b")).toThrow(AuthError);
  });

  it("allows same-tenant resource access", () => {
    expect(() => assertTenantResourceAccess("tenant_a", "tenant_a")).not.toThrow();
  });

  it("enforces role checks", () => {
    expect(() =>
      requireTenantRole(
        {
          id: "m1",
          tenantId: "t1",
          userId: "u1",
          role: MembershipRole.STAFF,
          createdAt: new Date(),
        },
        [MembershipRole.OWNER],
      ),
    ).toThrow(AuthError);

    expect(() =>
      requireTenantRole(
        {
          id: "m1",
          tenantId: "t1",
          userId: "u1",
          role: MembershipRole.OWNER,
          createdAt: new Date(),
        },
        [MembershipRole.OWNER],
      ),
    ).not.toThrow();
  });
});
