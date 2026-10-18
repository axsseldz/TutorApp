"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { echoFields, fieldErrors, type ActionState } from "@/lib/action-state";
import { blockSchema, tutorProfileSchema } from "@/lib/validation";
import { MAX_BLOCK_MINUTES, MAX_DAYS_AHEAD, MIN_BLOCK_MINUTES } from "@/lib/config";
import { addDays, formatTimeRange, minutesBetween, now, zonedDateTimeToUtc } from "@/lib/dates";

function revalidateTutorPages(tutorId: string) {
  revalidatePath("/tutor");
  revalidatePath("/tutores");
  revalidatePath(`/tutores/${tutorId}`);
}

/** Panel del tutor: materias, tarifa y descripción. */
export async function updateTutorProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["TUTOR"], "/tutor");
  const subjectIds = formData.getAll("subjectIds").map(String);
  const fields = { ...echoFields(formData), subjectIds: subjectIds.join(",") };
  const parsed = tutorProfileSchema.safeParse({
    subjectIds,
    hourlyRate: formData.get("hourlyRate"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields };

  const validSubjects = await prisma.subject.count({ where: { id: { in: parsed.data.subjectIds } } });
  if (validSubjects !== parsed.data.subjectIds.length) {
    return { errors: { subjectIds: ["Alguna de las materias no existe."] }, fields };
  }

  await prisma.tutorProfile.update({
    where: { userId: user.id },
    data: {
      bio: parsed.data.bio,
      hourlyRateCents: parsed.data.hourlyRate * 100,
      subjects: { set: parsed.data.subjectIds.map((id) => ({ id })) },
    },
  });
  revalidateTutorPages(user.id);
  return { ok: true, message: "Tu perfil de tutor se actualizó.", fields };
}

/**
 * Regla 4: el tutor publica bloques (fecha, inicio, fin, modalidad con lugar o
 * enlace). No se permiten traslapes con otros bloques del mismo tutor.
 */
export async function createBlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole(["TUTOR"], "/tutor");
  const fields = echoFields(formData);
  const parsed = blockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields };
  const d = parsed.data;

  const startsAt = zonedDateTimeToUtc(d.date, d.startTime);
  const endsAt = zonedDateTimeToUtc(d.date, d.endTime);
  if (!startsAt || !endsAt) return { errors: { date: ["La fecha u hora no es válida."] }, fields };

  const minutes = minutesBetween(startsAt, endsAt);
  if (minutes <= 0) {
    return { errors: { endTime: ["La hora de fin debe ser posterior a la de inicio."] }, fields };
  }
  if (minutes < MIN_BLOCK_MINUTES || minutes > MAX_BLOCK_MINUTES) {
    return {
      errors: { endTime: [`Cada bloque debe durar entre ${MIN_BLOCK_MINUTES} minutos y ${MAX_BLOCK_MINUTES / 60} horas.`] },
      fields,
    };
  }
  const current = now();
  if (startsAt <= current) {
    return { errors: { startTime: ["El bloque debe empezar en el futuro."] }, fields };
  }
  if (startsAt > addDays(current, MAX_DAYS_AHEAD)) {
    return { errors: { date: [`Solo puedes publicar bloques hasta ${MAX_DAYS_AHEAD} días adelante.`] }, fields };
  }

  const overlap = await prisma.availabilityBlock.findFirst({
    where: { tutorId: user.id, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
    select: { startsAt: true, endsAt: true },
  });
  if (overlap) {
    return {
      errors: {
        startTime: [`Se traslapa con otro de tus bloques (${formatTimeRange(overlap.startsAt, overlap.endsAt)}).`],
      },
      fields,
    };
  }

  await prisma.availabilityBlock.create({
    data: {
      tutorId: user.id,
      startsAt,
      endsAt,
      modality: d.modality,
      location: d.modality === "PRESENCIAL" ? d.location : null,
      meetingUrl: d.modality === "EN_LINEA" ? d.meetingUrl : null,
    },
  });
  revalidateTutorPages(user.id);
  return { ok: true, message: "Bloque publicado. Ya aparece en tu perfil público." };
}

/** Borra un bloque libre. Los bloques reservados se liberan cancelando la sesión. */
export async function deleteBlockAction(formData: FormData): Promise<void> {
  const user = await requireRole(["TUTOR"], "/tutor");
  const blockId = String(formData.get("blockId") ?? "");
  // deleteMany con condiciones = verificación de dueño y de estado en una sola operación.
  await prisma.availabilityBlock.deleteMany({
    where: { id: blockId, tutorId: user.id, isBooked: false },
  });
  revalidateTutorPages(user.id);
}
