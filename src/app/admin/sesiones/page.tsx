import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatShortDay, formatTimeRange } from "@/lib/dates";
import { formatMXN } from "@/lib/money";
import { completeExpiredSessions } from "@/lib/tutoring";
import { ModalityBadge, SESSION_STATUS_LABEL, SessionStatusBadge } from "@/components/labels";
import { Badge, Card, EmptyState, PageHeader, cn } from "@/components/ui";
import type { SessionStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Sesiones" };

const STATUSES: SessionStatus[] = ["PAGADA", "COMPLETADA", "CANCELADA"];

export default async function AdminSessionsPage({ searchParams }: PageProps<"/admin/sesiones">) {
  await requireRole(["ADMIN"], "/admin/sesiones");
  await completeExpiredSessions();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.estado as SessionStatus) ? (sp.estado as SessionStatus) : undefined;

  const sessions = await prisma.tutoringSession.findMany({
    where: status ? { status } : {},
    orderBy: { startsAt: "desc" },
    take: 200,
    include: {
      student: { select: { name: true } },
      tutor: { select: { id: true, name: true } },
      subject: { select: { name: true } },
      payment: true,
      review: { select: { rating: true } },
    },
  });

  return (
    <>
      <PageHeader title="Sesiones" description="Todas las sesiones de la plataforma (máximo 200 más recientes)." />
      <div className="mb-4 flex flex-wrap gap-1 text-sm">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/sesiones?estado=${s}` : "/admin/sesiones"}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium",
              status === s ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {s ? SESSION_STATUS_LABEL[s] : "Todas"}
          </Link>
        ))}
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon={<CalendarX />} title="No hay sesiones" description="Aún no hay sesiones con ese estado." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                <th scope="col" className="px-4 py-3 font-semibold">Materia</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estudiante → Tutor</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Comisión</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Tutor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatShortDay(s.startsAt)}
                    <p className="text-xs tabular-nums text-slate-500">{formatTimeRange(s.startsAt, s.endsAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {s.subject.name}
                    <div className="mt-1">
                      <ModalityBadge modality={s.modality} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.student.name} →{" "}
                    <Link href={`/tutores/${s.tutor.id}`} className="text-blue-700 hover:underline">
                      {s.tutor.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <SessionStatusBadge status={s.status} />
                      {s.payment?.status === "REEMBOLSADO" ? <Badge tone="amber">Reembolsado</Badge> : null}
                      {s.review ? <span className="text-xs text-slate-500">Reseña: {s.review.rating}★</span> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.payment ? formatMXN(s.payment.amountCents) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-800">
                    {s.payment ? formatMXN(s.payment.commissionCents) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.payment ? formatMXN(s.payment.tutorPayoutCents) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
