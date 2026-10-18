import { z } from "zod";
import {
  ALLOWED_EMAIL_DOMAIN,
  MAX_HOURLY_RATE,
  MIN_HOURLY_RATE,
} from "./config";

// Esquemas Zod compartidos por las server actions. Los mensajes van en español.

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Escribe un correo válido."))
  .refine((v) => v.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`), {
    error: `Solo se aceptan correos institucionales @${ALLOWED_EMAIL_DOMAIN}.`,
  });

const nameField = z
  .string()
  .trim()
  .min(3, "Escribe tu nombre completo (mínimo 3 caracteres).")
  .max(80, "El nombre es demasiado largo.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const semesterField = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 14), {
    error: "El semestre debe ser un número entre 1 y 14.",
  });

export const passwordField = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña es demasiado larga.")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
  .regex(/\d/, "La contraseña debe incluir al menos un número.");

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    career: optionalText(80),
    semester: semesterField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    error: "Las contraseñas no coinciden.",
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Escribe tu correo."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export const profileSchema = z.object({
  name: nameField,
  career: optionalText(80),
  semester: semesterField,
  phone: optionalText(20).refine((v) => v === null || /^[\d\s+()-]{7,20}$/.test(v), {
    error: "Escribe un teléfono válido.",
  }),
});

const hourlyRateField = z.coerce
  .number({ error: "Escribe una tarifa válida." })
  .int("La tarifa debe ser un número entero de pesos.")
  .min(MIN_HOURLY_RATE, `La tarifa mínima es de $${MIN_HOURLY_RATE} MXN por hora.`)
  .max(MAX_HOURLY_RATE, `La tarifa máxima es de $${MAX_HOURLY_RATE} MXN por hora.`);

const subjectIdsField = z
  .array(z.string().min(1))
  .min(1, "Elige al menos una materia.")
  .max(6, "Puedes elegir hasta 6 materias.");

const bioField = z
  .string()
  .trim()
  .min(20, "Cuéntales un poco de ti a los estudiantes (mínimo 20 caracteres).")
  .max(600, "La descripción no puede pasar de 600 caracteres.");

export const tutorApplicationSchema = z.object({
  subjectIds: subjectIdsField,
  hourlyRate: hourlyRateField,
  bio: bioField,
});

export const tutorProfileSchema = tutorApplicationSchema;

export const blockSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige una fecha."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora de inicio."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Elige la hora de fin."),
    modality: z.enum(["PRESENCIAL", "EN_LINEA"], { error: "Elige una modalidad." }),
    location: z.string().trim().max(120, "Máximo 120 caracteres."),
    meetingUrl: z.string().trim().max(300, "El enlace es demasiado largo."),
  })
  .superRefine((d, ctx) => {
    if (d.modality === "PRESENCIAL" && d.location.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["location"],
        message: "Indica el lugar en el campus (p. ej. Biblioteca Central, cubículo 3).",
      });
    }
    if (d.modality === "EN_LINEA") {
      const ok = /^https:\/\/([a-z0-9-]+\.)*(meet\.google\.com|zoom\.us|zoom\.com|teams\.microsoft\.com|teams\.live\.com)\/\S+$/i.test(
        d.meetingUrl,
      );
      if (!ok) {
        ctx.addIssue({
          code: "custom",
          path: ["meetingUrl"],
          message: "Pega un enlace válido de Google Meet, Zoom o Teams (https://…).",
        });
      }
    }
  });

export const checkoutSchema = z.object({
  subjectId: z.string().min(1, "Elige la materia de la sesión."),
  notes: optionalText(300),
  cardName: z.string().trim().min(3, "Escribe el nombre como aparece en la tarjeta."),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/\s|-/g, ""))
    .refine((v) => /^\d{16}$/.test(v), { error: "El número de tarjeta debe tener 16 dígitos." }),
  cardExpiry: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Usa el formato MM/AA."),
  cardCvc: z.string().trim().regex(/^\d{3,4}$/, "El CVC tiene 3 o 4 dígitos."),
});

export const reviewSchema = z.object({
  rating: z.coerce
    .number({ error: "Elige una calificación." })
    .int()
    .min(1, "Elige una calificación de 1 a 5 estrellas.")
    .max(5, "Elige una calificación de 1 a 5 estrellas."),
  comment: z
    .string()
    .trim()
    .min(10, "Escribe un comentario de al menos 10 caracteres.")
    .max(500, "El comentario no puede pasar de 500 caracteres."),
});

export const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Explica el motivo del rechazo (mínimo 10 caracteres).")
    .max(500, "Máximo 500 caracteres."),
});

export const cancelSchema = z.object({
  reason: optionalText(300),
});
