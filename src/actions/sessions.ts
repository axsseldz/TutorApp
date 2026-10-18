"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { echoFields, fieldErrors, type ActionState } from "@/lib/action-state";
import { cancelSchema, reviewSchema } from "@/lib/validation";
import { STUDENT_CANCELLATION_HOURS } from "@/lib/config";
import { now } from "@/lib/dates";
import { notify } from "@/lib/notifications";
import { describeSlot, studentCanCancel, tutorCanCancel, tutorCanComplete } from "@/lib/tutoring";

/**
 * Regla 7: el estudiante cancela hasta 24 h antes; el tutor, mientras no haya
 * empezado. El pago se marca REEMBOLSADO y el bloque vuelve a estar libre.
 */
export async function cancelSessionAction(
  sessionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/sesiones");
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const session = await prisma.tutoringSession.findUnique({
    where: { id: sessionId },
    include: {
      student: { select: { name: true } },
      tutor: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  if (!session || (session.studentId !== user.id && session.tutorId !== user.id)) {
    return { message: "No encontramos esta sesión." };
  }
  if (session.status !== "PAGADA") {
    return { message: "Esta sesión ya no se puede cancelar." };
  }
  const byStudent = session.studentId === user.id;
  if (byStudent && !studentCanCancel(session.startsAt)) {
    return {
      message: `Solo puedes cancelar hasta ${STUDENT_CANCELLATION_HOURS} horas antes del inicio. Contacta a tu tutor si tienes un imprevisto.`,
    };
  }
  if (!byStudent && !tutorCanCancel(session.startsAt)) {
    return { message: "La sesión ya empezó; no se puede cancelar." };
  }

  const done = await prisma.$transaction(async (tx) => {
    const { count } = await tx.tutoringSession.updateMany({
      where: { id: session.id, status: "PAGADA" },
      data: {
        status: "CANCELADA",
        cancelledAt: now(),
        cancelledById: user.id,
        cancellationReason: parsed.data.reason,
      },
    });
    if (count === 0) return false;
    await tx.payment.updateMany({
      where: { sessionId: session.id, status: "PAGADO" },
      data: { status: "REEMBOLSADO", refundedAt: now() },
    });
    if (session.blockId) {
      await tx.availabilityBlock.updateMany({
        where: { id: session.blockId },
        data: { isBooked: false },
      });
    }
    const slot = describeSlot(session.startsAt, session.endsAt);
    const reason = parsed.data.reason ? ` Motivo: "${parsed.data.reason}".` : "";
    await notify(
      byStudent
        ? {
            userId: session.tutorId,
            type: "CANCELACION",
            title: "Una sesión fue cancelada",
            message: `${session.student.name} canceló la sesión de ${session.subject.name} del ${slot}. El horario volvió a estar disponible.${reason}`,
            link: "/sesiones?vista=tutor",
          }
        : {
            userId: session.studentId,
            type: "CANCELACION",
            title: "Tu tutor canceló la sesión",
            message: `${session.tutor.name} canceló la sesión de ${session.subject.name} del ${slot}. Se reembolsó tu pago completo.${reason}`,
            link: "/sesiones",
          },
      tx,
    );
    return true;
  });
  if (!done) return { message: "Esta sesión ya no se puede cancelar." };

  revalidatePath("/", "layout");
  redirect(byStudent ? `/sesiones?cancelada=${session.id}` : `/sesiones?vista=tutor&cancelada=${session.id}`);
}

/** Regla 8: el tutor marca la sesión como COMPLETADA (una vez que empezó). */
export async function completeSessionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/sesiones");
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await prisma.tutoringSession.findUnique({
    where: { id: sessionId },
    include: { tutor: { select: { name: true } }, subject: { select: { name: true } } },
  });
  if (!session || session.tutorId !== user.id || session.status !== "PAGADA") return;
  if (!tutorCanComplete(session.startsAt)) return;

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.tutoringSession.updateMany({
      where: { id: session.id, status: "PAGADA" },
      data: { status: "COMPLETADA", completedAt: now() },
    });
    if (count === 0) return;
    await notify(
      {
        userId: session.studentId,
        type: "SESION_COMPLETADA",
        title: "¿Cómo te fue en tu sesión?",
        message: `${session.tutor.name} marcó como completada la sesión de ${session.subject.name}. Deja una reseña para ayudar a otros estudiantes.`,
        link: `/sesiones/${session.id}/resena`,
      },
      tx,
    );
  });
  revalidatePath("/", "layout");
}

/** Regla 9: una reseña (1–5 + comentario) por sesión COMPLETADA, solo del estudiante. */
export async function createReviewAction(
  sessionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(`/sesiones/${sessionId}/resena`);
  const fields = echoFields(formData);
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields };

  const session = await prisma.tutoringSession.findUnique({
    where: { id: sessionId },
    include: { review: { select: { id: true } }, subject: { select: { name: true } } },
  });
  if (!session || session.studentId !== user.id) return { message: "No encontramos esta sesión." };
  if (session.status !== "COMPLETADA") {
    return { message: "Solo puedes reseñar sesiones completadas." };
  }
  if (session.review) return { message: "Ya dejaste una reseña para esta sesión." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          sessionId: session.id,
          studentId: user.id,
          tutorId: session.tutorId,
          rating: parsed.data.rating,
          comment: parsed.data.comment,
        },
      });
      await notify(
        {
          userId: session.tutorId,
          type: "RESENA_NUEVA",
          title: "Recibiste una reseña nueva",
          message: `${user.name} te calificó con ${parsed.data.rating} de 5 estrellas en ${session.subject.name}.`,
          link: `/tutores/${session.tutorId}#resenas`,
        },
        tx,
      );
    });
  } catch {
    // La restricción única de sessionId protege contra envíos dobles.
    return { message: "Ya dejaste una reseña para esta sesión." };
  }

  revalidatePath("/", "layout");
  redirect("/sesiones?resena=1");
}
