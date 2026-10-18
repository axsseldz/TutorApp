/**
 * Devuelve `next` solo si es una ruta interna de la app (evita open redirects
 * con ?next=). Se normaliza con URL para atrapar trucos como "/\t/evil.com".
 */
export function safeInternalPath(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/")) return null;
  if (/[\x00-\x1f\\]/.test(next)) return null;
  try {
    const base = "http://tutorpar.local";
    const url = new URL(next, base);
    if (url.origin !== base) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
