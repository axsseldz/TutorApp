"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { buttonClass, cn } from "./ui";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/tutor") return pathname === "/tutor";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, item.href)
              ? "bg-blue-50 text-blue-800"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileMenu({
  items,
  user,
  logout,
}: {
  items: NavItem[];
  user: { name: string; email: string } | null;
  logout: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex size-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
        aria-expanded={open}
        aria-controls="menu-movil"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <div
          id="menu-movil"
          className="absolute inset-x-0 top-16 border-b border-slate-200 bg-white px-4 pb-5 pt-2 shadow-lg"
        >
          {user ? (
            <div className="border-b border-slate-100 py-3">
              <p className="font-semibold text-slate-900">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email}</p>
            </div>
          ) : null}
          <nav className="flex flex-col py-2" aria-label="Menú móvil">
            {[...items, ...(user ? [{ href: "/perfil", label: "Mi perfil" }, { href: "/notificaciones", label: "Notificaciones" }] : [])].map(
              (item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "rounded-lg px-3 py-3 text-base font-medium",
                    isActive(pathname, item.href) ? "bg-blue-50 text-blue-800" : "text-slate-700",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>
          {user ? (
            <div onClick={close}>{logout}</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/iniciar-sesion" onClick={close} className={buttonClass("secondary")}>
                Iniciar sesión
              </Link>
              <Link href="/registro" onClick={close} className={buttonClass("accent")}>
                Crear cuenta
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
