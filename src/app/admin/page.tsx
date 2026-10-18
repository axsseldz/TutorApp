import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { COMMISSION_RATE } from "@/lib/config";
import { formatMXN, formatPercent } from "@/lib/money";
import { completeExpiredSessions } from "@/lib/tutoring";
import { Alert, Card, PageHeader, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"], "/admin");
  await completeExpiredSessions();

  const [usersByRole, pendingApps, sessionsByStatus, earned, pendingCommission, refunded, subjects] =
    await Promise.all([
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
      prisma.tutorApplication.count({ where: { status: "PENDING" } }),
      prisma.tutoringSession.groupBy({ by: ["status"], _count: { _all: true } }),
      // Comisión ganada: sesiones completadas con pago vigente.
      prisma.payment.aggregate({
        where: { status: "PAGADO", session: { status: "COMPLETADA" } },
        _sum: { commissionCents: true, amountCents: true },
      }),
      // Comisión por realizar: sesiones pagadas que aún no ocurren.
      prisma.payment.aggregate({
        where: { status: "PAGADO", session: { status: "PAGADA" } },
        _sum: { commissionCents: true, amountCents: true },
      }),
      prisma.payment.aggregate({ where: { status: "REEMBOLSADO" }, _sum: { amountCents: true }, _count: { _all: true } }),
      prisma.subject.findMany({
        orderBy: { name: "asc" },
        select: {
          name: true,
          _count: { select: { sessions: { where: { status: "COMPLETADA" } }, tutors: { where: { user: { role: "TUTOR" } } } } },
        },
      }),
    ]);

  const roleCount = (r: string) => usersByRole.find((u) => u.role === r)?._count._all ?? 0;
  const statusCount = (s: string) => sessionsByStatus.find((x) => x.status === s)?._count._all ?? 0;
  const totalUsers = usersByRole.reduce((a, u) => a + u._count._all, 0);
  const totalSessions = sessionsByStatus.reduce((a, s) => a + s._count._all, 0);

  return (
    <>
      <PageHeader
        title="Resumen"
        description={`Métricas generales de la plataforma. Comisión vigente: ${formatPercent(COMMISSION_RATE)}.`}
      />
      {pendingApps > 0 ? (
        <Alert tone="warning" className="mb-6">
          Hay <strong>{pendingApps}</strong> {pendingApps === 1 ? "solicitud de tutor pendiente" : "solicitudes de tutor pendientes"}.{" "}
          <Link href="/admin/solicitudes" className="inline-flex items-center gap-1 font-semibold underline">
            Revisar ahora <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Alert>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Usuarios</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Usuarios registrados" value={totalUsers} tone="slate" />
        <Stat label="Estudiantes" value={roleCount("STUDENT")} />
        <Stat label="Tutores aprobados" value={roleCount("TUTOR")} tone="orange" />
        <Stat label="Solicitudes pendientes" value={pendingApps} tone="slate" />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Sesiones</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sesiones totales" value={totalSessions} tone="slate" />
        <Stat label="Pagadas (próximas)" value={statusCount("PAGADA")} />
        <Stat label="Completadas" value={statusCount("COMPLETADA")} tone="green" />
        <Stat label="Canceladas" value={statusCount("CANCELADA")} tone="slate" hint={`${formatMXN(refunded._sum.amountCents ?? 0)} reembolsados`} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Ingresos</h2>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Ingresos por comisión"
          value={formatMXN(earned._sum.commissionCents ?? 0)}
          tone="green"
          hint="De sesiones completadas"
        />
        <Stat
          label="Comisión por realizar"
          value={formatMXN(pendingCommission._sum.commissionCents ?? 0)}
          tone="orange"
          hint="De sesiones pagadas aún no impartidas"
        />
        <Stat
          label="Volumen transaccionado"
          value={formatMXN((earned._sum.amountCents ?? 0) + (pendingCommission._sum.amountCents ?? 0))}
          tone="slate"
          hint="Pagos vigentes (sin reembolsos)"
        />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Por materia</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Materia</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Tutores</th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">Sesiones completadas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {subjects.map((s) => (
              <tr key={s.name}>
                <th scope="row" className="px-4 py-3 text-left font-medium">{s.name}</th>
                <td className="px-4 py-3 text-right">{s._count.tutors}</td>
                <td className="px-4 py-3 text-right">{s._count.sessions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
