import type { Metadata } from "next";
import { getNotifications } from "@/lib/data";
import { formatDateTime } from "@/lib/dates";
import { NotificationsList } from "@/components/notifications-list";

export const metadata: Metadata = { title: "Notificaciones" };

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  const items = getNotifications().map(({ createdAt, ...n }) => ({ ...n, date: formatDateTime(createdAt) }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <NotificationsList items={items} />
    </div>
  );
}
