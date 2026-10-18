import "server-only";
import type { NotificationType, Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

type Tx = Prisma.TransactionClient;

export type NewNotification = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
};

/** Crea una notificación en la app (dentro de una transacción si se pasa `tx`). */
export async function notify(n: NewNotification, tx: Tx = prisma) {
  await tx.notification.create({ data: { ...n, link: n.link ?? null } });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
