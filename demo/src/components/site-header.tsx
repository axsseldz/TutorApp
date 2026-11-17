import Link from "next/link";
import { Bell } from "lucide-react";
import { DEMO_USER, unreadNotifications } from "@/lib/data";
import { LogoutButton } from "./demo-session";
import { Logo } from "./logo";
import { NavLinks, MobileMenu, type NavItem } from "./nav";
import { buttonClass } from "./ui";

// Encabezado de la app con las dos variantes (con y sin sesión). El CSS muestra
// la que corresponda según el atributo data-demo-sesion de <html>.
export function SiteHeader() {
  const unread = unreadNotifications();
  const items: NavItem[] = [
    { href: "/tutores", label: "Buscar tutores" },
    { href: "/sesiones", label: "Mis sesiones", soloConSesion: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="TutorPar, inicio">
          <Logo />
        </Link>
        <NavLinks items={items} />
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/notificaciones"
            className="solo-con-sesion relative inline-flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
            aria-label={unread ? `Notificaciones: ${unread} sin leer` : "Notificaciones"}
          >
            <Bell className="size-5" aria-hidden />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
          <div className="solo-con-sesion hidden items-center gap-2 md:flex">
            <Link href="/perfil" className={buttonClass("ghost", "sm")}>
              {DEMO_USER.name.split(" ")[0]}
            </Link>
            <LogoutButton className={buttonClass("secondary", "sm")}>Cerrar sesión</LogoutButton>
          </div>
          <div className="solo-sin-sesion hidden items-center gap-2 md:flex">
            <Link href="/iniciar-sesion" className={buttonClass("ghost", "sm")}>
              Iniciar sesión
            </Link>
            <Link href="/registro" className={buttonClass("accent", "sm")}>
              Crear cuenta
            </Link>
          </div>
          <MobileMenu items={items} user={{ name: DEMO_USER.name, email: DEMO_USER.email }} />
        </div>
      </div>
    </header>
  );
}
