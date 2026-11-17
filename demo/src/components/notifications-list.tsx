"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CalendarCheck, CalendarX, CircleCheck, Star, UserCheck, UserX } from "lucide-react";
import type { NotificationType } from "@/lib/data";
import { PageHeader, buttonClass, cn } from "@/components/ui";

const ICONS: Record<NotificationType, typeof Bell> = {
  RESERVA_NUEVA: CalendarCheck,
  CANCELACION: CalendarX,
  TUTOR_APROBADO: UserCheck,
  TUTOR_RECHAZADO: UserX,
  RESENA_NUEVA: Star,
  SESION_COMPLETADA: CircleCheck,
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  /** Fecha ya formateada en el servidor (zona horaria de Tijuana). */
  date: string;
  read: boolean;
};

/** Lista de notificaciones; "marcar como leídas" solo cambia la vista (no se guarda). */
export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const [allRead, setAllRead] = useState(false);
  const unread = allRead ? 0 : items.filter((n) => !n.read).length;

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description={unread ? `Tienes ${unread} sin leer.` : "Estás al día."}
        actions={
          unread ? (
            <button type="button" onClick={() => setAllRead(true)} className={buttonClass("secondary", "sm")}>
              Marcar todas como leídas
            </button>
          ) : null
        }
      />
      <ul className="space-y-2">
        {items.map((n) => {
          const Icon = ICONS[n.type];
          const read = allRead || n.read;
          return (
            <li key={n.id}>
              <Link
                href={n.link}
                className={cn(
                  "flex w-full gap-4 rounded-2xl border p-4 text-left transition hover:border-blue-300",
                  read ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/60",
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
                    <span className={cn("text-slate-900", !read && "font-semibold")}>{n.title}</span>
                    {!read ? (
                      <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-orange-500" aria-label="Sin leer" />
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-slate-600">{n.message}</span>
                  <span className="mt-1 block text-xs text-slate-400">{n.date}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
