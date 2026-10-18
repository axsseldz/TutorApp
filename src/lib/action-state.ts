import type { z } from "zod";

/** Estado que devuelven las server actions usadas con useActionState. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Valores enviados, para no perder lo capturado si hay un error. */
  fields?: Record<string, string>;
};

export const initialState: ActionState = {};

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Copia los campos de texto del FormData (sin contraseñas ni archivos). */
export function echoFields(formData: FormData, omit: string[] = []): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("$") || omit.includes(k) || typeof v !== "string") continue;
    out[k] = v;
  }
  return out;
}
