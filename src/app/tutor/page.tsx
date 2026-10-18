import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Trash, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { MAX_DAYS_AHEAD } from "@/lib/config";
import { addDays, formatDay, formatDuration, formatTimeRange, minutesBetween, now, toZonedDateKey } from "@/lib/dates";
import { formatMXN, sessionPriceCents } from "@/lib/money";
import { completeExpiredSessions, ratingsByTutor } from "@/lib/tutoring";
import { deleteBlockAction } from "@/actions/tutor";
import { ModalityBadge } from "@/components/labels";
import { BlockForm, TutorProfileForm } from "@/components/forms/tutor-forms";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata: Metadata = { title: "Panel del tutor" };

export default async function TutorDashboardPage() {
  const user = await requireRole(["TUTOR"], "/tutor");
  await completeExpiredSessions();
  const current = now();

  const [profile, subjects, blocks, upcomingSessions, ratings] = await Promise.all([
    prisma.tutorProfile.findUniqueOrThrow({
      where: { userId: user.id },
      include: { subjects: { select: { id: true } } },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.availabilityBlock.findMany({
      where: { tutorId: user.id, endsAt: { gt: current } },
      orderBy: { startsAt: "asc" },
      include: {
        sessions: {
          where: { status: "PAGADA" },
          select: { id: true, student: { select: { name: true } }, subject: { select: { name: true } } },
        },
      },
    }),
    prisma.tutoringSession.count({ where: { tutorId: user.id, status: "PAGADA" } }),
    ratingsByTutor([user.id]),
  ]);
  const rating = ratings.get(user.id)!;
  const freeBlocks = blocks.filter((b) => !b.isBooked).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Panel del tutor"
        description="Administra tus materias, tu tarifa y tus horarios disponibles."
        actions={
          <>
            <ButtonLink href={`/tutores/${user.id}`} variant="secondary">
              Ver mi perfil público
            </ButtonLink>
            <ButtonLink href="/tutor/ganancias">Ver ganancias</ButtonLink>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tarifa actual" value={formatMXN(profile.hourlyRateCents)} hint="por hora" />
        <Stat label="Bloques libres" value={freeBlocks} tone="orange" hint="próximos" />
        <Stat label="Sesiones por impartir" value={upcomingSessions} tone="slate" hint={<Link className="text-blue-700 hover:underline" href="/sesiones?vista=tutor">Ver sesiones</Link>} />
        <Stat
          label="Calificación"
          value={rating.average ? rating.average.toFixed(1) : "—"}
          tone="green"
          hint={`${rating.count} ${rating.count === 1 ? "reseña" : "reseñas"}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-1 text-lg font-semibold">Publicar disponibilidad</h2>
            <p className="mb-4 text-sm text-slate-600">
              Bloques de 30 minutos a 4 horas, hasta {MAX_DAYS_AHEAD} días adelante. No se pueden traslapar.
            </p>
            <BlockForm
              minDate={toZonedDateKey(current)}
              maxDate={toZonedDateKey(addDays(current, MAX_DAYS_AHEAD))}
            />
          </Card>

          <section aria-labelledby="mis-bloques">
            <h2 id="mis-bloques" className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="size-5 text-blue-700" aria-hidden /> Mis próximos bloques ({blocks.length})
            </h2>
            {blocks.length === 0 ? (
              <EmptyState
                icon={<CalendarDays />}
                title="No tienes bloques publicados"
                description="Publica tu primer horario para aparecer con disponibilidad en las búsquedas."
              />
            ) : (
              <ul className="space-y-2">
                {blocks.map((b) => {
                  const minutes = minutesBetween(b.startsAt, b.endsAt);
                  const booking = b.sessions[0];
                  return (
                    <li key={b.id}>
                      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">
                            {formatDay(b.startsAt)} ·{" "}
                            <span className="tabular-nums">{formatTimeRange(b.startsAt, b.endsAt)}</span>
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                            <ModalityBadge modality={b.modality} />
                            <span className="inline-flex items-center gap-1 truncate">
                              {b.modality === "PRESENCIAL" ? (
                                <MapPin className="size-3.5" aria-hidden />
                              ) : (
                                <Video className="size-3.5" aria-hidden />
                              )}
                              {b.location ?? b.meetingUrl}
                            </span>
                            <span>
                              · {formatDuration(minutes)} · {formatMXN(sessionPriceCents(profile.hourlyRateCents, minutes))}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {b.isBooked ? (
                            <Badge tone="green">
                              Reservado{booking ? ` por ${booking.student.name.split(" ")[0]} · ${booking.subject.name}` : ""}
                            </Badge>
                          ) : (
                            <>
                              <Badge tone="blue">Disponible</Badge>
                              <form action={deleteBlockAction}>
                                <input type="hidden" name="blockId" value={b.id} />
                                <SubmitButton variant="ghost" size="sm" pendingText="Borrando…">
                                  <Trash className="size-4" aria-hidden />
                                  <span className="sr-only sm:not-sr-only">Borrar</span>
                                </SubmitButton>
                              </form>
                            </>
                          )}
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <Card className="h-fit p-6">
          <h2 className="mb-4 text-lg font-semibold">Mi perfil de tutor</h2>
          <TutorProfileForm
            subjects={subjects}
            defaults={{
              subjectIds: profile.subjects.map((s) => s.id),
              hourlyRate: String(profile.hourlyRateCents / 100),
              bio: profile.bio,
            }}
          />
        </Card>
      </div>
    </div>
  );
}
