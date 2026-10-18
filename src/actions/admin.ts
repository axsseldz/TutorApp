"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fieldErrors, type ActionState } from "@/lib/action-state";
import { rejectSchema } from "@/lib/validation";
import { now } from "@/lib/dates";
import { notify } from "@/lib/notifications";

function revalidateAdmin() {
  revalidatePath("/", "layout");
}

/** Regla 2: el admin aprueba la solicitud → el usuario pasa a TUTOR con perfil público. */
export async function approveApplicationAction(applicationId: string, _prev: ActionState): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"], "/admin/solicitudes");
  const app = await prisma.tutorApplication.findUnique({
    where: { id: applicationId },
    include: { subjects: { select: { id: true } }, user: { select: { id: true, role: true } } },
  });
  if (!app) return { message: "La solicitud no existe." };
  if (app.status !== "PENDING") return { message: "Esta solicitud ya fue revisada." };
  if (app.user.role === "ADMIN") return { message: "Un administrador no puede ser tutor." };

  await prisma.$transaction(async (tx) => {
    await tx.tutorApplication.update({
      where: { id: app.id },
      data: { status: "APPROVED", reviewedById: admin.id, reviewedAt: now(), rejectionReason: null },
    });
    await tx.user.update({ where: { id: app.userId }, data: { role: "TUTOR" } });
    const subjects = app.subjects.map((s) => ({ id: s.id }));
    await tx.tutorProfile.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId,
        bio: app.bio,
        hourlyRateCents: app.hourlyRateCents,
        subjects: { connect: subjects },
      },
      update: {
        bio: app.bio,
        hourlyRateCents: app.hourlyRateCents,
        approvedAt: now(),
        subjects: { set: subjects },
      },
    });
    await notify(
      {
        userId: app.userId,
        type: "TUTOR_APROBADO",
        title: "¡Ya eres tutor de TutorPar!",
        message: "Un administrador aprobó tu solicitud. Publica tus horarios disponibles para empezar a recibir reservas.",
        link: "/tutor",
      },
      tx,
    );
  });
  revalidateAdmin();
  return { ok: true, message: "Solicitud aprobada. El usuario ya es tutor." };
}

/** Regla 2: el admin rechaza con un motivo que ve el solicitante. */
export async function rejectApplicationAction(
  applicationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole(["ADMIN"], "/admin/solicitudes");
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields: { reason: String(formData.get("reason") ?? "") } };

  const app = await prisma.tutorApplication.findUnique({ where: { id: applicationId } });
  if (!app) return { message: "La solicitud no existe." };
  if (app.status !== "PENDING") return { message: "Esta solicitud ya fue revisada." };

  await prisma.$transaction(async (tx) => {
    await tx.tutorApplication.update({
      where: { id: app.id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.reason,
        reviewedById: admin.id,
        reviewedAt: now(),
      },
    });
    await notify(
      {
        userId: app.userId,
        type: "TUTOR_RECHAZADO",
        title: "Tu solicitud de tutor fue rechazada",
        message: `Motivo: ${parsed.data.reason} Puedes corregirlo y enviar una nueva solicitud desde tu perfil.`,
        link: "/perfil",
      },
      tx,
    );
  });
  revalidateAdmin();
  return { ok: true, message: "Solicitud rechazada. Se notificó al estudiante." };
}
