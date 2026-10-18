import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "./config";

/** Carpeta local (fuera de /public) donde se guardan kárdex y constancias. */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Firmas binarias para no confiar solo en el tipo MIME que manda el navegador.
function sniffType(buf: Buffer): string | null {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return "image/webp";
  }
  return null;
}

export type SavedUpload = { storedName: string; originalName: string; mime: string };

/** Valida y guarda un documento. Devuelve un mensaje de error en español si no es válido. */
export async function saveVerificationDocument(
  file: FormDataEntryValue | null,
): Promise<{ ok: true; file: SavedUpload } | { ok: false; error: string }> {
  if (!file || typeof file === "string" || file.size === 0) {
    return { ok: false, error: "Sube tu kárdex o constancia de estudios (PDF o imagen)." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "El archivo pesa más de 5 MB. Sube una versión más ligera." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniffType(buf);
  if (!mime || !ALLOWED_UPLOAD_TYPES[mime]) {
    return { ok: false, error: "Formato no permitido. Usa PDF, JPG, PNG o WEBP." };
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}.${ALLOWED_UPLOAD_TYPES[mime]}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), buf);
  const originalName = path.basename(file.name || `documento.${ALLOWED_UPLOAD_TYPES[mime]}`).slice(0, 120);
  return { ok: true, file: { storedName, originalName, mime } };
}

export async function readUpload(storedName: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(UPLOAD_DIR, path.basename(storedName)));
  } catch {
    return null;
  }
}
