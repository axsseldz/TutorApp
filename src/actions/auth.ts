"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, homeForRole } from "@/lib/auth";
import { echoFields, fieldErrors, type ActionState } from "@/lib/action-state";
import { loginSchema, registerSchema } from "@/lib/validation";

/** Solo permite redirecciones internas (evita open redirects con ?next=). */
function safeNext(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string") return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** Regla 1: registro solo con correo @uabc.edu.mx; todos entran como STUDENT. */
export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = echoFields(formData, ["password", "confirmPassword"]);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), fields };
  }
  const { name, email, career, semester, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) {
    return {
      errors: { email: ["Ya existe una cuenta con este correo. Inicia sesión."] },
      fields,
    };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      career,
      semester,
      passwordHash: await bcrypt.hash(password, 10),
      role: "STUDENT",
    },
  });
  await createSession(user.id);
  redirect(safeNext(formData.get("next")) ?? "/tutores?bienvenida=1");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = echoFields(formData, ["password"]);
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error), fields };
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  // Mismo mensaje para correo inexistente o contraseña incorrecta.
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    return { message: "Correo o contraseña incorrectos.", fields };
  }
  await createSession(user.id);
  redirect(safeNext(formData.get("next")) ?? homeForRole(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
