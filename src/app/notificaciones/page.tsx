import type { Metadata } from "next";
import { Bell, BellOff, CalendarCheck, CalendarX, CircleCheck, Star, UserCheck, UserX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { markAllNotificationsReadAction, openNotificationAction } from "@/actions/notifications";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, PageHeader, cn } from "@/components/ui";
import type { NotificationType } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Notificaciones" };

const ICONS: Record<NotificationType, typeof Bell> = {
  RESERVA_NUEVA: CalendarCheck,
  CANCELACION: CalendarX,
  TUTOR_APROBADO: UserCheck,
  TUTOR_RECHAZADO: UserX,
  RESENA_NUEVA: Star,
  SESION_COMPLETADA: CircleCheck,
};

export default async function NotificationsPage() {
  const user = await requireUser("/notificaciones");
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Notificaciones"
        description={unread ? `Tienes ${unread} sin leer.` : "Estás al día."}
        actions={
          unread ? (
            <form action={markAllNotificationsReadAction}>
              <SubmitButton variant="secondary" size="sm" pendingText="Marcando…">
                Marcar todas como leídas
              </SubmitButton>
            </form>
          ) : null
        }
      />
      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title="No tienes notificaciones"
          description="Aquí te avisaremos de reservas, cancelaciones, reseñas y el estado de tu solicitud de tutor."
        />
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <li key={n.id}>
                <form action={openNotificationAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <button
                    type="submit"
                    className={cn(
                      "flex w-full gap-4 rounded-2xl border p-4 text-left transition hover:border-blue-300",
                      n.readAt ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        n.type === "CANCELACION" || n.type === "TUTOR_RECHAZADO"
                          ? "bg-red-100 text-red-700"
                          : n.type === "RESENA_NUEVA"
                            ? "bg-orange-100 text-orange-600"
                            : "bg-blue-100 text-blue-700",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className={cn("text-slate-900", !n.readAt && "font-semibold")}>{n.title}</span>
                        {!n.readAt ? (
                          <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-orange-500" aria-label="Sin leer" />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-slate-600">{n.message}</span>
                      <span className="mt-1 block text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
