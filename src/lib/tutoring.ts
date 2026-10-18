import "server-only";
import { prisma } from "./db";
import { STUDENT_CANCELLATION_HOURS } from "./config";
import { formatDay, formatTime, now } from "./dates";
import { notify } from "./notifications";

/**
 * Regla 8: una sesión PAGADA pasa a COMPLETADA cuando ya pasó su hora de fin.
 * No hay cron en la v1: se ejecuta de forma "perezosa" al cargar las páginas
 * que muestran sesiones, ganancias o métricas.
 */
export async function completeExpiredSessions(): Promise<number> {
  const expired = await prisma.tutoringSession.findMany({
    where: { status: "PAGADA", endsAt: { lte: now() } },
    select: {
      id: true,
      studentId: true,
      startsAt: true,
      tutor: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  for (const s of expired) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.tutoringSession.updateMany({
        where: { id: s.id, status: "PAGADA" },
        data: { status: "COMPLETADA", completedAt: now() },
      });
      if (count === 0) return; // otra petición ya la completó
      await notify(
        {
          userId: s.studentId,
          type: "SESION_COMPLETADA",
          title: "¿Cómo te fue en tu sesión?",
          message: `Tu sesión de ${s.subject.name} con ${s.tutor.name} del ${formatDay(s.startsAt)} terminó. Deja una reseña para ayudar a otros estudiantes.`,
          link: `/sesiones/${s.id}/resena`,
        },
        tx,
      );
    });
  }
  return expired.length;
}

/** Regla 7: el estudiante puede cancelar hasta 24 h antes del inicio. */
export function studentCanCancel(startsAt: Date, at: Date = now()): boolean {
  return startsAt.getTime() - at.getTime() >= STUDENT_CANCELLATION_HOURS * 3600_000;
}

/** El tutor puede cancelar mientras la sesión no haya empezado. */
export function tutorCanCancel(startsAt: Date, at: Date = now()): boolean {
  return startsAt.getTime() > at.getTime();
}

/** El tutor puede marcar como completada una sesión que ya empezó. */
export function tutorCanComplete(startsAt: Date, at: Date = now()): boolean {
  return startsAt.getTime() <= at.getTime();
}

export type RatingSummary = { average: number | null; count: number };

/** Promedio y número de reseñas por tutor (id de usuario). */
export async function ratingsByTutor(tutorIds: string[]): Promise<Map<string, RatingSummary>> {
  const rows = await prisma.review.groupBy({
    by: ["tutorId"],
    where: { tutorId: { in: tutorIds } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const map = new Map<string, RatingSummary>();
  for (const id of tutorIds) map.set(id, { average: null, count: 0 });
  for (const r of rows) {
    map.set(r.tutorId, { average: r._avg.rating ?? null, count: r._count._all });
  }
  return map;
}

export function describeSlot(startsAt: Date, endsAt: Date) {
  return `${formatDay(startsAt)} de ${formatTime(startsAt)} a ${formatTime(endsAt)}`;
}
