import {
  MembershipRole,
  type TenantMembership,
  type User,
} from "@prisma/client";
import { prisma } from "@/lib/db";

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export type AuthenticatedUser = User;

export async function requireAuthenticatedUser(
  userId: string | null | undefined,
): Promise<AuthenticatedUser> {
  if (!userId) {
    throw new AuthError("Authentication required", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AuthError("User not found", 401);
  }

  return user;
}

export async function requireTenantMembership(
  userId: string,
  tenantId: string,
): Promise<TenantMembership & { tenant: { id: string; name: string; slug: string; status: string } }> {
  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: { tenantId, userId },
    },
    include: {
      tenant: {
        select: { id: true, name: true, slug: true, status: true },
      },
    },
  });

  if (!membership) {
    throw new AuthError("You do not have access to this workspace", 403);
  }

  return membership;
}

export function requireTenantRole(
  membership: TenantMembership,
  allowedRoles: MembershipRole[],
): void {
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError("Insufficient permissions for this action", 403);
  }
}

export function assertTenantResourceAccess(
  resourceTenantId: string,
  membershipTenantId: string,
): void {
  if (resourceTenantId !== membershipTenantId) {
    throw new AuthError("Cross-tenant access denied", 403);
  }
}

export function requirePlatformAdmin(user: User): void {
  if (!user.isPlatformAdmin) {
    throw new AuthError("Platform admin access required", 403);
  }
}

export async function resolveActiveTenantId(
  userId: string,
  preferredTenantId?: string | null,
): Promise<string | null> {
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { tenantId: true },
  });

  if (memberships.length === 0) {
    return null;
  }

  if (preferredTenantId) {
    const match = memberships.find((m) => m.tenantId === preferredTenantId);
    if (match) {
      return match.tenantId;
    }
  }

  return memberships[0]?.tenantId ?? null;
}
