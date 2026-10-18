"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { echoFields, fieldErrors, type ActionState } from "@/lib/action-state";
import { checkoutSchema } from "@/lib/validation";
import { minutesBetween, now } from "@/lib/dates";
import { formatMXN, sessionPriceCents, splitPayment } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { describeSlot } from "@/lib/tutoring";

class BookingError extends Error {}

/**
 * Reglas 5 y 6: el estudiante reserva un bloque libre y confirma un pago
 * simulado. La sesión queda PAGADA y se guarda el reparto 85/15.
 */
export async function bookBlockAction(
  blockId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser(`/reservar/${blockId}`);
  const fields = echoFields(formData, ["cardNumber", "cardCvc"]);

  if (user.role === "ADMIN") {
    return { message: "Las cuentas de administrador no pueden reservar sesiones." };
  }

  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields };
  const { subjectId, notes, cardNumber } = parsed.data;

  const block = await prisma.availabilityBlock.findUnique({
    where: { id: blockId },
    include: {
      tutor: {
        select: {
          id: true,
          name: true,
          role: true,
          tutorProfile: { select: { hourlyRateCents: true, subjects: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  if (!block || block.tutor.role !== "TUTOR" || !block.tutor.tutorProfile) {
    return { message: "Este horario ya no existe." };
  }
  if (block.tutorId === user.id) {
    return { message: "No puedes reservarte a ti mismo." };
  }
  if (block.isBooked || block.startsAt <= now()) {
    return { message: "Este horario ya no está disponible. Elige otro." };
  }
  const subject = block.tutor.tutorProfile.subjects.find((s) => s.id === subjectId);
  if (!subject) {
    return { errors: { subjectId: ["El tutor no imparte esa materia."] }, fields };
  }

  const clash = await prisma.tutoringSession.findFirst({
    where: {
      studentId: user.id,
      status: "PAGADA",
      startsAt: { lt: block.endsAt },
      endsAt: { gt: block.startsAt },
    },
    select: { id: true },
  });
  if (clash) {
    return { message: "Ya tienes otra sesión reservada en ese horario." };
  }

  const amount = sessionPriceCents(
    block.tutor.tutorProfile.hourlyRateCents,
    minutesBetween(block.startsAt, block.endsAt),
  );
  const split = splitPayment(amount);

  let sessionId: string;
  try {
    sessionId = await prisma.$transaction(async (tx) => {
      // Marca el bloque como reservado solo si sigue libre (evita doble reserva).
      const { count } = await tx.availabilityBlock.updateMany({
        where: { id: block.id, isBooked: false, startsAt: { gt: now() } },
        data: { isBooked: true },
      });
      if (count === 0) throw new BookingError("Este horario acaba de ser reservado por alguien más.");

      const session = await tx.tutoringSession.create({
        data: {
          blockId: block.id,
          studentId: user.id,
          tutorId: block.tutorId,
          subjectId: subject.id,
          status: "PAGADA",
          startsAt: block.startsAt,
          endsAt: block.endsAt,
          modality: block.modality,
          location: block.location,
          meetingUrl: block.meetingUrl,
          notes,
          payment: {
            create: {
              ...split,
              status: "PAGADO",
              reference: `SIM-${randomBytes(4).toString("hex").toUpperCase()}`,
              cardLast4: cardNumber.slice(-4),
            },
          },
        },
      });

      await notify(
        {
          userId: block.tutorId,
          type: "RESERVA_NUEVA",
          title: "Tienes una reserva nueva",
          message: `${user.name} reservó ${subject.name} el ${describeSlot(block.startsAt, block.endsAt)}. Recibirás ${formatMXN(split.tutorPayoutCents)}.`,
          link: "/sesiones?vista=tutor",
        },
        tx,
      );
      return session.id;
    });
  } catch (e) {
    if (e instanceof BookingError) return { message: e.message };
    throw e;
  }

  revalidatePath("/", "layout");
  redirect(`/sesiones?reservada=${sessionId}`);
}
