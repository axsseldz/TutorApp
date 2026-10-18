import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/config";
import { verifySessionToken } from "@/lib/session-token";

// Verificación optimista: solo revisa que exista una cookie de sesión válida.
// La autorización por rol se hace en el servidor (layouts, páginas y server
// actions) con requireUser / requireRole, que consultan la base de datos.
// Las páginas de login/registro redirigen por su cuenta si ya hay sesión,
// porque un token válido puede apuntar a un usuario que ya no existe.

const PROTECTED_PREFIXES = [
  "/sesiones",
  "/perfil",
  "/tutor/",
  "/admin",
  "/notificaciones",
  "/reservar",
  "/api/documentos",
];

function isProtected(pathname: string) {
  if (pathname === "/tutor") return true;
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (isProtected(pathname) && !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = new URL("/iniciar-sesion", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
