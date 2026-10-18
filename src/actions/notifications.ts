"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { now } from "@/lib/dates";
import { safeInternalPath } from "@/lib/safe-path";

/** Marca una notificación como leída y lleva al usuario a su enlace. */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const user = await requireUser("/notificaciones");
  const id = String(formData.get("id") ?? "");
  const n = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) return;
  if (!n.readAt) {
    await prisma.notification.update({ where: { id: n.id }, data: { readAt: now() } });
  }
  revalidatePath("/", "layout");
  // Solo enlaces internos.
  const link = safeInternalPath(n.link);
  if (link) redirect(link);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser("/notificaciones");
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: now() },
  });
  revalidatePath("/", "layout");
}
