import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/server/auth";
import {
  requireAuthenticatedUser,
  requireTenantMembership,
  resolveActiveTenantId,
} from "@/server/authorization";

export const ACTIVE_TENANT_COOKIE = "fp_active_tenant";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }
  return requireAuthenticatedUser(session.user.id);
}

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function getAuthorizedTenantContext(preferredTenantId?: string | null) {
  const user = await requireSessionUser();
  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get(ACTIVE_TENANT_COOKIE)?.value;
  const tenantId = await resolveActiveTenantId(
    user.id,
    preferredTenantId ?? cookieTenant,
  );

  if (!tenantId) {
    return { user, membership: null, tenantId: null };
  }

  const membership = await requireTenantMembership(user.id, tenantId);
  return { user, membership, tenantId };
}
