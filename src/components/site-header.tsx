import Link from "next/link";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";
import { logoutAction } from "@/actions/auth";
import { Logo } from "./logo";
import { NavLinks, MobileMenu, type NavItem } from "./nav";
import { buttonClass } from "./ui";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user ? await unreadCount(user.id) : 0;

  const items: NavItem[] = [{ href: "/tutores", label: "Buscar tutores" }];
  if (user) {
    if (user.role !== "ADMIN") items.push({ href: "/sesiones", label: "Mis sesiones" });
    if (user.role === "TUTOR") {
      items.push({ href: "/tutor", label: "Panel tutor" }, { href: "/tutor/ganancias", label: "Ganancias" });
    }
    if (user.role === "ADMIN") items.push({ href: "/admin", label: "Administración" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="TutorPar, inicio">
          <Logo />
        </Link>
        <NavLinks items={items} />
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/notificaciones"
                className="relative inline-flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                aria-label={unread ? `Notificaciones: ${unread} sin leer` : "Notificaciones"}
              >
                <Bell className="size-5" aria-hidden />
                {unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
              <div className="hidden items-center gap-2 md:flex">
                <Link href="/perfil" className={buttonClass("ghost", "sm")}>
                  {user.name.split(" ")[0]}
                </Link>
                <form action={logoutAction}>
                  <button type="submit" className={buttonClass("secondary", "sm")}>
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/iniciar-sesion" className={buttonClass("ghost", "sm")}>
                Iniciar sesión
              </Link>
              <Link href="/registro" className={buttonClass("accent", "sm")}>
                Crear cuenta
              </Link>
            </div>
          )}
          <MobileMenu
            items={items}
            user={user ? { name: user.name, email: user.email } : null}
            logout={
              <form action={logoutAction}>
                <button type="submit" className={buttonClass("secondary", "md", "w-full")}>
                  Cerrar sesión
                </button>
              </form>
            }
          />
        </div>
      </div>
    </header>
  );
}
