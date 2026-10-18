"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./ui";

export function AdminTabs({ pending }: { pending: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "Resumen" },
    { href: "/admin/solicitudes", label: "Solicitudes", count: pending },
    { href: "/admin/usuarios", label: "Usuarios" },
    { href: "/admin/sesiones", label: "Sesiones" },
  ];
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0" aria-label="Secciones de administración">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold",
                  active ? "border-blue-700 text-blue-800" : "border-transparent text-slate-600 hover:text-slate-900",
                )}
              >
                {t.label}
                {t.count ? (
                  <span className="rounded-full bg-orange-500 px-1.5 text-xs leading-5 text-white">{t.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
