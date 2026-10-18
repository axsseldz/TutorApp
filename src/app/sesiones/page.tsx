import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, CalendarClock, CircleCheck, History, MapPin, Star, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { STUDENT_CANCELLATION_HOURS } from "@/lib/config";
import { formatDateTime, formatDay, formatTimeRange, now } from "@/lib/dates";
import { formatMXN } from "@/lib/money";
import { completeExpiredSessions, studentCanCancel, tutorCanCancel, tutorCanComplete } from "@/lib/tutoring";
import { completeSessionAction } from "@/actions/sessions";
import { ModalityBadge, SessionStatusBadge } from "@/components/labels";
import { CancelSessionButton } from "@/components/forms/session-actions";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, Stars, cn } from "@/components/ui";

export const metadata: Metadata = { title: "Mis sesiones" };

type View = "estudiante" | "tutor";

async function loadSessions(userId: string, view: View) {
  return prisma.tutoringSession.findMany({
    where: view === "tutor" ? { tutorId: userId } : { studentId: userId },
    orderBy: { startsAt: "asc" },
    include: {
      subject: { select: { name: true } },
      student: { select: { id: true, name: true, email: true } },
      tutor: { select: { id: true, name: true, email: true } },
      payment: true,
      review: { select: { rating: true, comment: true } },
      cancelledBy: { select: { id: true, name: true } },
    },
  });
}
type SessionRow = Awaited<ReturnType<typeof loadSessions>>[number];

export default async function MySessionsPage({ searchParams }: PageProps<"/sesiones">) {
  const user = await requireUser("/sesiones");
  await completeExpiredSessions();
  const sp = await searchParams;

  const tutorCount = await prisma.tutoringSession.count({ where: { tutorId: user.id } });
  const canSeeTutor = user.role === "TUTOR" || tutorCount > 0;
  const view: View = sp.vista === "tutor" && canSeeTutor ? "tutor" : "estudiante";

  const sessions = await loadSessions(user.id, view);
  const upcoming = sessions.filter((s) => s.status === "PAGADA");
  const history = sessions.filter((s) => s.status !== "PAGADA").reverse();
  const justBooked = typeof sp.reservada === "string" ? sessions.find((s) => s.id === sp.reservada) : undefined;
  const current = now();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Mis sesiones"
        description={
          view === "tutor"
            ? "Sesiones que impartes como tutor."
            : `Tus tutorías reservadas. Puedes cancelar hasta ${STUDENT_CANCELLATION_HOURS} horas antes.`
        }
        actions={
          view === "estudiante" ? (
            <ButtonLink href="/tutores" variant="accent">
              Reservar otra sesión
            </ButtonLink>
          ) : (
            <ButtonLink href="/tutor" variant="secondary">
              Administrar horarios
            </ButtonLink>
          )
        }
      />

      {justBooked ? (
        <Alert tone="success" className="mb-6">
          <strong>¡Reserva confirmada!</strong> Pagaste {formatMXN(justBooked.payment?.amountCents ?? 0)} (folio{" "}
          {justBooked.payment?.reference}). Tu sesión de {justBooked.subject.name} con {justBooked.tutor.name} es el{" "}
          {formatDay(justBooked.startsAt).toLowerCase()} a las {formatTimeRange(justBooked.startsAt, justBooked.endsAt)}.
        </Alert>
      ) : null}
      {sp.resena === "1" ? (
        <Alert tone="success" className="mb-6">
          ¡Gracias por tu reseña! Ayuda a otros estudiantes a elegir tutor.
        </Alert>
      ) : null}

      {canSeeTutor ? (
        <div className="mb-6 inline-flex rounded-xl bg-slate-200/70 p-1" role="tablist" aria-label="Tipo de sesiones">
          {(["estudiante", "tutor"] as const).map((v) => (
            <Link
              key={v}
              role="tab"
              aria-selected={view === v}
              href={v === "tutor" ? "/sesiones?vista=tutor" : "/sesiones"}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition",
                view === v ? "bg-white text-blue-800 shadow-sm" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {v === "tutor" ? "Como tutor" : "Como estudiante"}
            </Link>
          ))}
        </div>
      ) : null}

      <section aria-labelledby="proximas" className="mb-10">
        <h2 id="proximas" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="size-5 text-blue-700" aria-hidden /> Próximas ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck />}
            title="No tienes sesiones próximas"
            description={
              view === "tutor"
                ? "Cuando un estudiante reserve uno de tus horarios aparecerá aquí."
                : "Busca un tutor por materia y reserva tu primera sesión."
            }
            action={
              view === "tutor" ? (
                <ButtonLink href="/tutor">Publicar horarios</ButtonLink>
              ) : (
                <ButtonLink href="/tutores">Buscar tutores</ButtonLink>
              )
            }
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s.id} s={s} view={view} current={current} highlight={s.id === justBooked?.id} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <History className="size-5 text-blue-700" aria-hidden /> Historial ({history.length})
        </h2>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Aquí verás tus sesiones completadas y canceladas.
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((s) => (
              <SessionCard key={s.id} s={s} view={view} current={current} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SessionCard({
  s,
  view,
  current,
  highlight,
}: {
  s: SessionRow;
  view: View;
  current: Date;
  highlight?: boolean;
}) {
  const other = view === "tutor" ? s.student : s.tutor;
  const isUpcoming = s.status === "PAGADA";
  const pay = s.payment;

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
              {view === "tutor" ? "Estudiante: " : "Tutor: "}
              {view === "tutor" ? (
                <span className="font-medium text-slate-800">{other.name}</span>
              ) : (
                <Link href={`/tutores/${other.id}`} className="font-medium text-blue-700 hover:underline">
                  {other.name}
                </Link>
              )}
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
              <a
                href={s.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
              >
                <Video className="size-4" aria-hidden /> Entrar a la videollamada
              </a>
            ) : null}
            {s.notes ? <p className="text-sm italic text-slate-500">“{s.notes}”</p> : null}
            {s.status === "CANCELADA" ? (
              <p className="text-sm text-slate-500">
                Cancelada por {s.cancelledBy?.id === s.tutorId ? "el tutor" : "el estudiante"}
                {s.cancelledAt ? ` el ${formatDateTime(s.cancelledAt)}` : ""}
                {s.cancellationReason ? ` · “${s.cancellationReason}”` : ""}
              </p>
            ) : null}
          </div>

          {pay ? (
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-lg font-bold tabular-nums text-slate-900">
                {formatMXN(view === "tutor" ? pay.tutorPayoutCents : pay.amountCents)}
              </p>
              <p className="text-xs text-slate-500">
                {view === "tutor" ? `de ${formatMXN(pay.amountCents)} (comisión ${formatMXN(pay.commissionCents)})` : `Folio ${pay.reference}`}
              </p>
              {pay.status === "REEMBOLSADO" ? (
                <Badge tone="amber" className="mt-1">
                  Reembolsado
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Acciones */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 empty:hidden">
          {isUpcoming && view === "estudiante" ? (
            studentCanCancel(s.startsAt, current) ? (
              <CancelSessionButton sessionId={s.id} asTutor={false} />
            ) : (
              <p className="text-sm text-slate-500">
                Ya no puedes cancelar (faltan menos de {STUDENT_CANCELLATION_HOURS} horas).
              </p>
            )
          ) : null}

          {isUpcoming && view === "tutor" ? (
            <>
              {tutorCanComplete(s.startsAt, current) ? (
                <form action={completeSessionAction}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <SubmitButton size="sm" pendingText="Guardando…">
                    <CircleCheck className="size-4" aria-hidden /> Marcar como completada
                  </SubmitButton>
                </form>
              ) : (
                <p className="text-sm text-slate-500">Podrás marcarla como completada cuando empiece.</p>
              )}
              {tutorCanCancel(s.startsAt, current) ? <CancelSessionButton sessionId={s.id} asTutor /> : null}
            </>
          ) : null}

          {s.status === "COMPLETADA" && view === "estudiante" && !s.review ? (
            <ButtonLink href={`/sesiones/${s.id}/resena`} variant="accent" size="sm">
              <Star className="size-4" aria-hidden /> Dejar reseña
            </ButtonLink>
          ) : null}

          {s.status === "COMPLETADA" && s.review ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{view === "tutor" ? "Reseña recibida:" : "Tu reseña:"}</span>
              <Stars value={s.review.rating} />
              <span className="italic">“{s.review.comment}”</span>
            </div>
          ) : null}

          {s.status === "COMPLETADA" && view === "tutor" && !s.review ? (
            <p className="text-sm text-slate-500">El estudiante aún no deja reseña.</p>
          ) : null}
        </div>
      </Card>
    </li>
  );
}
