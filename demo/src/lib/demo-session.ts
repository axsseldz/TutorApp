// Constantes de la "sesión" de demo. Viven fuera del componente cliente para que
// el layout (componente de servidor) pueda leer el script como texto.

export const DEMO_SESSION_KEY = "tutorpar-demo-sesion";

/** Script que corre antes de pintar la página para aplicar el estado guardado. */
export const DEMO_SESSION_SCRIPT = `try{if(localStorage.getItem("${DEMO_SESSION_KEY}")==="1")document.documentElement.setAttribute("data-demo-sesion","1")}catch(e){}`;

/** Acepta solo rutas internas ("/algo"), nunca "//dominio" ni URLs absolutas. */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value;
}
