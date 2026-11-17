import { TIMEZONE } from "./config";

// Todas las fechas se guardan en UTC y se muestran en America/Tijuana,
// sin importar la zona horaria del servidor o del navegador.

const dayFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDayFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const monthFmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  month: "long",
  year: "numeric",
});
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Lunes, 20 de octubre" */
export function formatDay(d: Date): string {
  return capitalize(dayFmt.format(d));
}

/** "lun, 20 oct 2026" */
export function formatShortDay(d: Date): string {
  return shortDayFmt.format(d);
}

/** "16:00" */
export function formatTime(d: Date): string {
  return timeFmt.format(d);
}

/** "16:00 – 17:30" */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** "20 oct 2026, 16:00" */
export function formatDateTime(d: Date): string {
  return dateTimeFmt.format(d);
}

/** "Octubre de 2026" */
export function formatMonth(d: Date): string {
  return capitalize(monthFmt.format(d));
}

function zonedParts(d: Date) {
  const parts = Object.fromEntries(
    partsFmt.formatToParts(d).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Diferencia (ms) entre la hora local de Tijuana y UTC en un instante dado. */
function tzOffsetMs(utcMs: number): number {
  const p = zonedParts(new Date(utcMs));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (utcMs - (utcMs % 1000));
}

/**
 * Convierte una fecha "YYYY-MM-DD" y hora "HH:MM" capturadas en Tijuana a un Date (UTC).
 * Devuelve null si el formato es inválido.
 */
export function zonedDateTimeToUtc(date: string, time: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dm || !tm) return null;
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const [h, mi] = [Number(tm[1]), Number(tm[2])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let result = guess - tzOffsetMs(guess);
  // Segundo ajuste por si el cambio de horario cae entre la estimación y el resultado.
  const second = guess - tzOffsetMs(result);
  if (second !== result) result = second;
  const check = zonedParts(new Date(result));
  if (check.year !== y || check.month !== mo || check.day !== d) return null;
  return new Date(result);
}

/** "2026-10-20" en Tijuana (para inputs type=date y agrupar por día). */
export function toZonedDateKey(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "2026-10" en Tijuana (para agrupar por mes). */
export function toZonedMonthKey(d: Date): string {
  return toZonedDateKey(d).slice(0, 7);
}

export function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Hora actual. Centralizado para que las páginas no llamen Date.now() al renderizar. */
export function now(): Date {
  return new Date();
}

export function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 3600_000);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
