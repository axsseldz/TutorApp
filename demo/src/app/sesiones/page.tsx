import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarClock, History, MapPin, Video } from "lucide-react";
import { STUDENT_CANCELLATION_HOURS } from "@/lib/config";
import { DEMO_USER, blockPriceCents, getDemoUserSessions, getFreeBlock, getTutor, type Session } from "@/lib/data";
import { formatDateTime, formatDay, formatTimeRange, now } from "@/lib/dates";
import { formatMXN, splitPayment } from "@/lib/money";
import { ModalityBadge, SessionStatusBadge } from "@/components/labels";
import { CancelSessionButton, ReviewButton } from "@/components/forms/session-actions";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Stars, cn } from "@/components/ui";

export const metadata: Metadata = { title: "Mis sesiones" };

export const dynamic = "force-dynamic";

/** Sesión "reservada" en el checkout de la demo (solo existe en la URL, no se guarda). */
function demoBooking(blockId: unknown, subjectId: unknown): Session | undefined {
  if (typeof blockId !== "string") return undefined;
  const block = getFreeBlock(blockId);
  if (!block) return undefined;
  const tutor = getTutor(block.tutorId)!;
  const subject =
    tutor.subjects.find((s) => s.id === subjectId) ?? tutor.subjects[0];
  return {
    id: `demo-${block.id}`,
    block,
    status: "PAGADA",
    startsAt: block.startsAt,
    endsAt: block.endsAt,
    modality: block.modality,
    location: block.location,
    meetingUrl: block.meetingUrl,
    notes: null,
    tutor,
    student: DEMO_USER,
    subject,
    payment: { ...splitPayment(blockPriceCents(block)), status: "PAGADO", reference: "SIM-DEMO" },
    review: null,
    cancelledByTutor: false,
    cancelledAt: null,
    cancellationReason: null,
  };
}

export default async function MySessionsPage({ searchParams }: PageProps<"/sesiones">) {
  const sp = await searchParams;
  const justBooked = demoBooking(sp.reservada, sp.materia);

  const sessions = getDemoUserSessions();
  const upcoming = [...(justBooked ? [justBooked] : []), ...sessions.filter((s) => s.status === "PAGADA")].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
  const history = sessions.filter((s) => s.status !== "PAGADA").reverse();
  const current = now();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Mis sesiones"
        description={`Tus tutorías reservadas. Puedes cancelar hasta ${STUDENT_CANCELLATION_HOURS} horas antes.`}
        actions={
          <ButtonLink href="/tutores" variant="accent">
            Reservar otra sesión
          </ButtonLink>
        }
      />

      {justBooked ? (
        <Alert tone="success" className="mb-6">
          <strong>Reserva confirmada (demo).</strong> Así se vería tu sesión de {justBooked.subject.name} con{" "}
          {justBooked.tutor.name} el {formatDay(justBooked.startsAt).toLowerCase()} a las{" "}
          {formatTimeRange(justBooked.startsAt, justBooked.endsAt)} por {formatMXN(justBooked.payment.amountCents)}. No
          se realizó ningún cargo ni se guardó la reserva.
        </Alert>
      ) : null}

      <section aria-labelledby="proximas" className="mb-10">
        <h2 id="proximas" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="size-5 text-blue-700" aria-hidden /> Próximas ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck />}
            title="No tienes sesiones próximas"
            description="Busca un tutor por materia y reserva tu primera sesión."
            action={<ButtonLink href="/tutores">Buscar tutores</ButtonLink>}
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} s={s} current={current} highlight={s.id === justBooked?.id} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <History className="size-5 text-blue-700" aria-hidden /> Historial ({history.length})
        </h2>
        <ul className="space-y-3">
          {history.map((s) => (
            <SessionCard key={s.id} s={s} current={current} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function SessionCard({ s, current, highlight }: { s: Session; current: Date; highlight?: boolean }) {
  const other = s.tutor;
  const isUpcoming = s.status === "PAGADA";
  const pay = s.payment;
  const canCancel = s.startsAt.getTime() - current.getTime() >= STUDENT_CANCELLATION_HOURS * 3600_000;

  return (
    <li>
      <Card className={cn("p-5", highlight && "ring-2 ring-orange-400")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{s.subject.name}</h3>
              <SessionStatusBadge status={s.status} />
              <ModalityBadge modality={s.modality} />
            </div>
            <p className="text-sm text-slate-600">
              Tutor:{" "}
              <Link href={`/tutores/${other.id}`} className="font-medium text-blue-700 hover:underline">
                {other.name}
              </Link>
              {isUpcoming ? <span className="text-slate-400"> · {other.email}</span> : null}
            </p>
            <p className="text-sm text-slate-600">
              {formatDay(s.startsAt)} · <span className="tabular-nums">{formatTimeRange(s.startsAt, s.endsAt)}</span>
            </p>
            {isUpcoming && s.modality === "PRESENCIAL" ? (
              <p className="flex items-center gap-1 text-sm text-slate-600">
                <MapPin className="size-4 text-slate-400" aria-hidden /> {s.location}
              </p>
            ) : null}
            {isUpcoming && s.modality === "EN_LINEA" && s.meetingUrl ? (
              // Enlace de ejemplo: no apunta a una videollamada real.
              <span
                title="Enlace de ejemplo (demo)"
                className="inline-flex cursor-default items-center gap-1 text-sm font-medium text-blue-700"
              >
                <Video className="size-4" aria-hidden /> Entrar a la videollamada
              </span>
            ) : null}
            {s.notes ? <p className="text-sm italic text-slate-500">“{s.notes}”</p> : null}
            {s.status === "CANCELADA" ? (
              <p className="text-sm text-slate-500">
                Cancelada por {s.cancelledByTutor ? "el tutor" : "el estudiante"}
                {s.cancelledAt ? ` el ${formatDateTime(s.cancelledAt)}` : ""}
                {s.cancellationReason ? ` · “${s.cancellationReason}”` : ""}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="text-lg font-bold tabular-nums text-slate-900">{formatMXN(pay.amountCents)}</p>
            <p className="text-xs text-slate-500">Folio {pay.reference}</p>
            {pay.status === "REEMBOLSADO" ? (
              <Badge tone="amber" className="mt-1">
                Reembolsado
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 empty:hidden">
          {isUpcoming ? (
            canCancel ? (
              <CancelSessionButton sessionId={s.id} />
            ) : (
              <p className="text-sm text-slate-500">
                Ya no puedes cancelar (faltan menos de {STUDENT_CANCELLATION_HOURS} horas).
              </p>
            )
          ) : null}

          {s.status === "COMPLETADA" && !s.review ? <ReviewButton /> : null}

          {s.status === "COMPLETADA" && s.review ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>Tu reseña:</span>
              <Stars value={s.review.rating} />
              <span className="italic">“{s.review.comment}”</span>
            </div>
          ) : null}
        </div>
      </Card>
    </li>
  );
}
