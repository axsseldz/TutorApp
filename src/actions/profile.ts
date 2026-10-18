"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { echoFields, fieldErrors, type ActionState } from "@/lib/action-state";
import { profileSchema, tutorApplicationSchema } from "@/lib/validation";
import { saveVerificationDocument } from "@/lib/uploads";

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/perfil");
  const fields = echoFields(formData);
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields };

  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Tus datos se guardaron correctamente.", fields };
}

/**
 * Regla 2: un estudiante solicita ser tutor subiendo su kárdex o constancia,
 * eligiendo materias y tarifa. La solicitud queda PENDING hasta que un admin
 * la revise.
 */
export async function applyAsTutorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/perfil");
  const fields = echoFields(formData);
  const subjectIds = formData.getAll("subjectIds").map(String);
  fields.subjectIds = subjectIds.join(",");

  if (user.role !== "STUDENT") {
    return { message: user.role === "TUTOR" ? "Ya eres tutor verificado." : "Los administradores no pueden ser tutores." };
  }
  const pending = await prisma.tutorApplication.findFirst({
    where: { userId: user.id, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return { message: "Ya tienes una solicitud en revisión." };

  const parsed = tutorApplicationSchema.safeParse({
    subjectIds,
    hourlyRate: formData.get("hourlyRate"),
    bio: formData.get("bio"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), fields };

  const validSubjects = await prisma.subject.count({ where: { id: { in: parsed.data.subjectIds } } });
  if (validSubjects !== parsed.data.subjectIds.length) {
    return { errors: { subjectIds: ["Alguna de las materias no existe."] }, fields };
  }

  const upload = await saveVerificationDocument(formData.get("document"));
  if (!upload.ok) return { errors: { document: [upload.error] }, fields };

  await prisma.tutorApplication.create({
    data: {
      userId: user.id,
      status: "PENDING",
      documentPath: upload.file.storedName,
      documentName: upload.file.originalName,
      documentMime: upload.file.mime,
      hourlyRateCents: parsed.data.hourlyRate * 100,
      bio: parsed.data.bio,
      subjects: { connect: parsed.data.subjectIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/perfil");
  revalidatePath("/admin", "layout");
  redirect("/perfil?solicitud=enviada#ser-tutor");
}
