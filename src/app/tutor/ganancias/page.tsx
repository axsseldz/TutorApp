import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { COMMISSION_RATE } from "@/lib/config";
import { formatMonth, formatShortDay, now, toZonedMonthKey } from "@/lib/dates";
import { formatMXN, formatPercent } from "@/lib/money";
import { completeExpiredSessions } from "@/lib/tutoring";
import { ButtonLink, Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Mis ganancias" };

type MonthRow = {
  key: string;
  label: string;
  sessions: number;
  gross: number;
  commission: number;
  net: number;
};

export default async function EarningsPage() {
  const user = await requireRole(["TUTOR"], "/tutor/ganancias");
  await completeExpiredSessions();

  const [completed, pending] = await Promise.all([
    prisma.tutoringSession.findMany({
      where: { tutorId: user.id, status: "COMPLETADA", payment: { is: { status: "PAGADO" } } },
      orderBy: { startsAt: "desc" },
      include: {
        payment: true,
        subject: { select: { name: true } },
        student: { select: { name: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { status: "PAGADO", session: { tutorId: user.id, status: "PAGADA" } },
      _sum: { tutorPayoutCents: true },
      _count: { _all: true },
    }),
  ]);

  // Agrupa por mes de la sesión (zona horaria de Tijuana).
  const months = new Map<string, MonthRow>();
  for (const s of completed) {
    const key = toZonedMonthKey(s.startsAt);
    const row = months.get(key) ?? {
      key,
      label: formatMonth(s.startsAt),
      sessions: 0,
      gross: 0,
      commission: 0,
      net: 0,
    };
    row.sessions += 1;
    row.gross += s.payment!.amountCents;
    row.commission += s.payment!.commissionCents;
    row.net += s.payment!.tutorPayoutCents;
    months.set(key, row);
  }
  const rows = [...months.values()].sort((a, b) => b.key.localeCompare(a.key));
  const totals = rows.reduce(
    (acc, r) => ({
      sessions: acc.sessions + r.sessions,
      gross: acc.gross + r.gross,
      commission: acc.commission + r.commission,
      net: acc.net + r.net,
    }),
    { sessions: 0, gross: 0, commission: 0, net: 0 },
  );
  const thisMonth = months.get(toZonedMonthKey(now()));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Mis ganancias"
        description={`Ingresos de sesiones completadas. TutorPar descuenta una comisión del ${formatPercent(COMMISSION_RATE)} por sesión.`}
        actions={<ButtonLink href="/tutor" variant="secondary">Panel del tutor</ButtonLink>}
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingreso neto total" value={formatMXN(totals.net)} tone="green" hint={`${totals.sessions} sesiones impartidas`} />
        <Stat label="Neto este mes" value={formatMXN(thisMonth?.net ?? 0)} hint={`${thisMonth?.sessions ?? 0} sesiones`} />
        <Stat label="Ingresos brutos" value={formatMXN(totals.gross)} tone="slate" hint={`Comisión: ${formatMXN(totals.commission)}`} />
        <Stat
          label="Por cobrar"
          value={formatMXN(pending._sum.tutorPayoutCents ?? 0)}
          tone="orange"
          hint={`${pending._count._all} sesiones pagadas aún no impartidas`}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Wallet />}
          title="Aún no tienes ganancias"
          description="Cuando completes tu primera sesión verás aquí tus ingresos por mes."
          action={<ButtonLink href="/tutor">Publicar horarios</ButtonLink>}
        />
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">Resumen por mes</h2>
          <Card className="mb-8 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Mes</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Sesiones</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Ingresos brutos</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Comisión</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Ingreso neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-slate-900">{r.label}</th>
                    <td className="px-4 py-3 text-right">{r.sessions}</td>
                    <td className="px-4 py-3 text-right">{formatMXN(r.gross)}</td>
                    <td className="px-4 py-3 text-right text-red-700">−{formatMXN(r.commission)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{formatMXN(r.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold tabular-nums">
                <tr>
                  <th scope="row" className="px-4 py-3 text-left">Total</th>
                  <td className="px-4 py-3 text-right">{totals.sessions}</td>
                  <td className="px-4 py-3 text-right">{formatMXN(totals.gross)}</td>
                  <td className="px-4 py-3 text-right text-red-700">−{formatMXN(totals.commission)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700">{formatMXN(totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <h2 className="mb-3 text-lg font-semibold">Sesiones impartidas</h2>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Materia</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estudiante</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Bruto</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completed.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatShortDay(s.startsAt)}</td>
                    <td className="px-4 py-3">{s.subject.name}</td>
                    <td className="px-4 py-3">{s.student.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMXN(s.payment!.amountCents)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                      {formatMXN(s.payment!.tutorPayoutCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
