// Constantes de la "sesión" de demo. Viven fuera del componente cliente para que
// el layout (componente de servidor) pueda leer el script como texto.

export const DEMO_SESSION_KEY = "tutorpar-demo-sesion";

/** Script que corre antes de pintar la página para aplicar el estado guardado. */
export const DEMO_SESSION_SCRIPT = `try{if(localStorage.getItem("${DEMO_SESSION_KEY}")==="1")document.documentElement.setAttribute("data-demo-sesion","1")}catch(e){}`;

/**
 * Acepta solo rutas internas ("/algo"), nunca "//dominio" ni URLs absolutas.
 * También valida la ruta ya normalizada: el parser de URL quita tabs y saltos de
 * línea, así que "/\t/evil.com" terminaría siendo "//evil.com".
 */
export function safeInternalPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    /[\u0000-\u001F\u007F\\]/.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null;
  }
  try {
    const base = "https://interno.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
