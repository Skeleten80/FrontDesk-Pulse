import { beforeAll, describe, expect, it } from "vitest";
import { MembershipRole, TenantStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  AuthError,
  requireTenantMembership,
  assertTenantResourceAccess,
} from "@/server/authorization";

describe("tenant isolation", () => {
  let userA = "";
  let tenantA = "";
  let tenantB = "";
  let callOnB = "";

  beforeAll(async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        authProviderId: `iso-${suffix}`,
        email: `iso-${suffix}@test.demo`,
        name: "Iso User",
        passwordHash: await hash("password123", 10),
      },
    });
    userA = user.id;

    const a = await prisma.tenant.create({
      data: {
        name: `Tenant A ${suffix}`,
        slug: `tenant-a-${suffix}`,
        industry: "Automotive",
        status: TenantStatus.ACTIVE,
        memberships: { create: { userId: user.id, role: MembershipRole.OWNER } },
      },
    });
    tenantA = a.id;

    const b = await prisma.tenant.create({
      data: {
        name: `Tenant B ${suffix}`,
        slug: `tenant-b-${suffix}`,
        industry: "Clinic",
        status: TenantStatus.ACTIVE,
      },
    });
    tenantB = b.id;

    const caller = await prisma.caller.create({
      data: {
        tenantId: tenantB,
        phoneNumber: `+1555400${suffix.slice(0, 4)}`,
      },
    });

    const call = await prisma.call.create({
      data: {
        tenantId: tenantB,
        callerId: caller.id,
        twilioCallSid: `CA_ISO_${suffix}`,
        transcript: "secret to tenant B",
      },
    });
    callOnB = call.id;
  });

  it("denies membership to foreign tenants", async () => {
    await expect(requireTenantMembership(userA, tenantB)).rejects.toBeInstanceOf(AuthError);
  });

  it("allows membership on owned tenant", async () => {
    const membership = await requireTenantMembership(userA, tenantA);
    expect(membership.tenantId).toBe(tenantA);
  });

  it("prevents reading foreign tenant call ids as authorization", async () => {
    const foreign = await prisma.call.findFirst({
      where: { id: callOnB, tenantId: tenantA },
    });
    expect(foreign).toBeNull();
    expect(() => assertTenantResourceAccess(tenantB, tenantA)).toThrow(AuthError);
  });
});
