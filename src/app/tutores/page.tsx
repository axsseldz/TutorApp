import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarClock, PartyPopper, SearchX } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatMXN } from "@/lib/money";
import { formatDay, formatTime, now } from "@/lib/dates";
import { ratingsByTutor } from "@/lib/tutoring";
import { Alert, Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, RatingInline, cn } from "@/components/ui";
import type { Modality } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Buscar tutores" };

const MODALITIES: { value: Modality | ""; label: string }[] = [
  { value: "", label: "Cualquier modalidad" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "EN_LINEA", label: "En línea" },
];

function buildHref(materia?: string, modalidad?: string) {
  const params = new URLSearchParams();
  if (materia) params.set("materia", materia);
  if (modalidad) params.set("modalidad", modalidad);
  const qs = params.toString();
  return qs ? `/tutores?${qs}` : "/tutores";
}

export default async function SearchTutorsPage({ searchParams }: PageProps<"/tutores">) {
  const sp = await searchParams;
  const materia = typeof sp.materia === "string" ? sp.materia : undefined;
  const modalidad =
    sp.modalidad === "PRESENCIAL" || sp.modalidad === "EN_LINEA" ? (sp.modalidad as Modality) : undefined;
  const welcome = sp.bienvenida === "1";

  const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
  const selected = subjects.find((s) => s.slug === materia);
  const current = now();

  // Regla 2: solo aparecen tutores aprobados (rol TUTOR con perfil).
  const tutors = await prisma.user.findMany({
    where: {
      role: "TUTOR",
      tutorProfile: { isNot: null, ...(selected ? { is: { subjects: { some: { id: selected.id } } } } : {}) },
      ...(modalidad
        ? { availabilityBlocks: { some: { isBooked: false, startsAt: { gt: current }, modality: modalidad } } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      career: true,
      semester: true,
      tutorProfile: {
        select: { bio: true, hourlyRateCents: true, subjects: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      },
      availabilityBlocks: {
        where: { isBooked: false, startsAt: { gt: current }, ...(modalidad ? { modality: modalidad } : {}) },
        orderBy: { startsAt: "asc" },
        select: { startsAt: true, modality: true },
      },
    },
  });
  const ratings = await ratingsByTutor(tutors.map((t) => t.id));
  const sorted = [...tutors].sort((a, b) => {
    const ra = ratings.get(a.id)?.average ?? 0;
    const rb = ratings.get(b.id)?.average ?? 0;
    if (rb !== ra) return rb - ra;
    return b.availabilityBlocks.length - a.availabilityBlocks.length;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {welcome ? (
        <Alert tone="success" className="mb-6">
          <span className="inline-flex items-center gap-2 font-semibold">
            <PartyPopper className="size-4" aria-hidden /> ¡Bienvenido a TutorPar!
          </span>{" "}
          Elige una materia para encontrar a tu tutor ideal.
        </Alert>
      ) : null}
      <PageHeader
        title={selected ? `Tutores de ${selected.name}` : "Buscar tutores"}
        description="Todos los tutores fueron verificados por un administrador con su kárdex o constancia."
      />

      <div className="mb-3 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 sm:flex-wrap" role="list" aria-label="Filtrar por materia">
          <Link
            role="listitem"
            href={buildHref(undefined, modalidad)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
              !selected ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-400",
            )}
          >
            Todas
          </Link>
          {subjects.map((s) => (
            <Link
              role="listitem"
              key={s.id}
              href={buildHref(s.slug, modalidad)}
              aria-current={selected?.id === s.id ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition",
                selected?.id === s.id
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-400",
              )}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </div>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {MODALITIES.map((m) => (
          <Link
            key={m.label}
            href={buildHref(selected?.slug, m.value || undefined)}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium",
              (modalidad ?? "") === m.value ? "bg-orange-100 text-orange-800" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {m.label}
          </Link>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No encontramos tutores con esos filtros"
          description={
            selected
              ? `Aún no hay tutores disponibles para ${selected.name}${modalidad ? " en esa modalidad" : ""}. Prueba con otra materia o vuelve pronto.`
              : "Todavía no hay tutores aprobados. ¿Vas en semestres avanzados? Solicita ser tutor desde tu perfil."
          }
          action={<ButtonLink href="/tutores" variant="secondary">Quitar filtros</ButtonLink>}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {sorted.length} {sorted.length === 1 ? "tutor encontrado" : "tutores encontrados"}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((t) => {
              const rating = ratings.get(t.id)!;
              const nextBlock = t.availabilityBlocks[0];
              return (
                <Card key={t.id} className="flex flex-col p-5 transition hover:border-blue-300 hover:shadow-md">
                  <div className="flex items-start gap-4">
                    <Avatar name={t.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <Link href={`/tutores/${t.id}`} className="truncate hover:text-blue-700 hover:underline">
                              {t.name}
                            </Link>
                            <BadgeCheck className="size-4 shrink-0 text-blue-700" aria-label="Verificado" />
                          </h2>
                          <p className="truncate text-sm text-slate-500">
                            {[t.career, t.semester ? `${t.semester}.º semestre` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <p className="shrink-0 text-right">
                          <span className="text-lg font-bold text-blue-800">
                            {formatMXN(t.tutorProfile!.hourlyRateCents)}
                          </span>
                          <span className="block text-xs text-slate-500">por hora</span>
                        </p>
                      </div>
                      <div className="mt-1">
                        <RatingInline average={rating.average} count={rating.count} />
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">{t.tutorProfile!.bio}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {t.tutorProfile!.subjects.map((s) => (
                      <Badge key={s.id} tone={s.id === selected?.id ? "orange" : "blue"}>
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-1.5 text-sm text-slate-600">
                      <CalendarClock className="size-4 shrink-0 text-slate-400" aria-hidden />
                      {nextBlock
                        ? `Próximo: ${formatDay(nextBlock.startsAt)}, ${formatTime(nextBlock.startsAt)}`
                        : "Sin horarios disponibles por ahora"}
                    </p>
                    <ButtonLink href={`/tutores/${t.id}`} size="sm" variant={nextBlock ? "primary" : "secondary"}>
                      {nextBlock ? `Ver ${t.availabilityBlocks.length} horarios` : "Ver perfil"}
                    </ButtonLink>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
