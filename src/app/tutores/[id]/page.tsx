import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarX, MapPin, MessageSquare, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatMXN, sessionPriceCents } from "@/lib/money";
import {
  formatDay,
  formatDuration,
  formatShortDay,
  formatTimeRange,
  minutesBetween,
  now,
  toZonedDateKey,
} from "@/lib/dates";
import { ratingsByTutor } from "@/lib/tutoring";
import { ModalityBadge } from "@/components/labels";
import {
  Alert,
  Avatar,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  RatingInline,
  Stars,
} from "@/components/ui";

async function getTutor(id: string) {
  return prisma.user.findFirst({
    where: { id, role: "TUTOR", tutorProfile: { isNot: null } },
    select: {
      id: true,
      name: true,
      career: true,
      semester: true,
      tutorProfile: {
        select: {
          bio: true,
          hourlyRateCents: true,
          approvedAt: true,
          subjects: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/tutores/[id]">): Promise<Metadata> {
  const { id } = await params;
  const tutor = await getTutor(id);
  return { title: tutor ? `${tutor.name} · Tutor` : "Tutor no encontrado" };
}

export default async function TutorProfilePage({ params }: PageProps<"/tutores/[id]">) {
  const { id } = await params;
  const tutor = await getTutor(id);
  if (!tutor || !tutor.tutorProfile) notFound();
  const profile = tutor.tutorProfile;

  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === tutor.id;
  const isAdmin = viewer?.role === "ADMIN";

  const [blocks, reviews, ratings, completedCount] = await Promise.all([
    prisma.availabilityBlock.findMany({
      where: { tutorId: tutor.id, isBooked: false, startsAt: { gt: now() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.review.findMany({
      where: { tutorId: tutor.id },
      orderBy: { createdAt: "desc" },
      include: {
        student: { select: { name: true } },
        session: { select: { subject: { select: { name: true } } } },
      },
    }),
    ratingsByTutor([tutor.id]),
    prisma.tutoringSession.count({ where: { tutorId: tutor.id, status: "COMPLETADA" } }),
  ]);
  const rating = ratings.get(tutor.id)!;

  // Agrupa bloques por día (zona horaria de Tijuana).
  const byDay = new Map<string, typeof blocks>();
  for (const b of blocks) {
    const key = toZonedDateKey(b.startsAt);
    byDay.set(key, [...(byDay.get(key) ?? []), b]);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ButtonLink href="/tutores" variant="ghost" size="sm" className="-ml-3 mb-4">
        <ArrowLeft className="size-4" aria-hidden /> Volver a la búsqueda
      </ButtonLink>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Columna de perfil */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={tutor.name} size="lg" />
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                  {tutor.name}
                  <BadgeCheck className="size-6 shrink-0 text-blue-700" aria-label="Tutor verificado" />
                </h1>
                <p className="text-slate-600">
                  {[tutor.career, tutor.semester ? `${tutor.semester}.º semestre` : null].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-1">
                  <RatingInline average={rating.average} count={rating.count} />
                </div>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-blue-50 p-3">
                <dt className="text-xs text-blue-900">Tarifa</dt>
                <dd className="text-xl font-bold text-blue-800">{formatMXN(profile.hourlyRateCents)}</dd>
                <dd className="text-xs text-blue-900">por hora</dd>
              </div>
              <div className="rounded-xl bg-orange-50 p-3">
                <dt className="text-xs text-orange-900">Sesiones impartidas</dt>
                <dd className="text-xl font-bold text-orange-600">{completedCount}</dd>
                <dd className="text-xs text-orange-900">desde {formatShortDay(profile.approvedAt)}</dd>
              </div>
            </dl>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Sobre mí</h2>
            <p className="mt-2 whitespace-pre-line text-slate-700">{profile.bio || "Sin descripción."}</p>
            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Materias</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.subjects.map((s) => (
                <Badge key={s.id} tone="blue">
                  {s.name}
                </Badge>
              ))}
            </div>
          </Card>

          <section id="resenas" className="scroll-mt-24">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="size-5 text-blue-700" aria-hidden /> Reseñas ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <EmptyState
                icon={<MessageSquare />}
                title="Aún no tiene reseñas"
                description="Las reseñas aparecen cuando los estudiantes califican una sesión completada."
              />
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id}>
                    <Card className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Stars value={r.rating} />
                        <span className="text-xs text-slate-500">{formatShortDay(r.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-slate-700">“{r.comment}”</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {r.student.name.split(" ")[0]} · {r.session.subject.name}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Columna de horarios */}
        <section aria-labelledby="horarios">
          <h2 id="horarios" className="mb-3 text-lg font-semibold">
            Horarios disponibles
          </h2>
          {isSelf ? (
            <Alert tone="info" className="mb-4">
              Así ven tu perfil los estudiantes. No puedes reservarte a ti mismo; administra tus horarios
              desde el <Link href="/tutor" className="font-semibold underline">panel del tutor</Link>.
            </Alert>
          ) : null}
          {isAdmin ? (
            <Alert tone="info" className="mb-4">
              Las cuentas de administrador no pueden reservar sesiones.
            </Alert>
          ) : null}
          {blocks.length === 0 ? (
            <EmptyState
              icon={<CalendarX />}
              title="Sin horarios disponibles"
              description="Este tutor no tiene bloques libres por ahora. Vuelve a revisar en unos días."
              action={<ButtonLink href="/tutores" variant="secondary">Buscar otro tutor</ButtonLink>}
            />
          ) : (
            <div className="space-y-5">
              {[...byDay.entries()].map(([day, dayBlocks]) => (
                <div key={day}>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">{formatDay(dayBlocks[0].startsAt)}</h3>
                  <ul className="space-y-2">
                    {dayBlocks.map((b) => {
                      const minutes = minutesBetween(b.startsAt, b.endsAt);
                      const price = sessionPriceCents(profile.hourlyRateCents, minutes);
                      return (
                        <li key={b.id}>
                          <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold tabular-nums">
                                {formatTimeRange(b.startsAt, b.endsAt)}{" "}
                                <span className="font-normal text-slate-500">· {formatDuration(minutes)}</span>
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                                <ModalityBadge modality={b.modality} />
                                {b.modality === "PRESENCIAL" ? (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3.5" aria-hidden /> {b.location}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <Video className="size-3.5" aria-hidden /> Recibes el enlace al reservar
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                              <span className="font-bold text-blue-800">{formatMXN(price)}</span>
                              {isSelf || isAdmin ? null : (
                                <ButtonLink href={`/reservar/${b.id}`} variant="accent" size="sm">
                                  Reservar
                                </ButtonLink>
                              )}
                            </div>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
