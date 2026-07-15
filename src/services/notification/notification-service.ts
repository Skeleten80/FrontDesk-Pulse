import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function createNotification(input: {
  tenantId: string;
  userId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      metadata: input.metadata,
    },
  });
}
