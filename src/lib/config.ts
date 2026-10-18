// Constantes de negocio de TutorPar. Cambiar aquí afecta a toda la app.

/** Comisión de la plataforma por sesión (15%). Se guarda una copia en cada pago. */
export const COMMISSION_RATE = 0.15;

/** Horas mínimas de anticipación para que un estudiante cancele una sesión. */
export const STUDENT_CANCELLATION_HOURS = 24;

/** Único dominio de correo aceptado en el registro. */
export const ALLOWED_EMAIL_DOMAIN = "uabc.edu.mx";

/** Zona horaria de UABC Ensenada; todas las fechas se muestran en esta zona. */
export const TIMEZONE = "America/Tijuana";

/** Límites de la tarifa por hora del tutor (en pesos MXN). */
export const MIN_HOURLY_RATE = 50;
export const MAX_HOURLY_RATE = 1000;

/** Límites de duración de un bloque de disponibilidad (minutos). */
export const MIN_BLOCK_MINUTES = 30;
export const MAX_BLOCK_MINUTES = 240;
/** Qué tan adelante se pueden publicar bloques (días). */
export const MAX_DAYS_AHEAD = 90;

/** Documentos de verificación (kárdex o constancia). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Duración de la sesión de inicio de sesión (días). */
export const SESSION_DAYS = 7;
export const SESSION_COOKIE = "tutorpar_session";
