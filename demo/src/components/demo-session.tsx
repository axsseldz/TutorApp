"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { DEMO_SESSION_KEY } from "@/lib/demo-session";

// "Sesión" puramente visual: un indicador en localStorage y un atributo en <html>.
// El CSS de globals.css muestra u oculta los elementos .solo-con-sesion / .solo-sin-sesion,
// así el encabezado no parpadea al cargar la página.

export function setDemoSession(active: boolean) {
  try {
    if (active) localStorage.setItem(DEMO_SESSION_KEY, "1");
    else localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    // Sin almacenamiento (modo privado, cookies bloqueadas): solo dura en esta pestaña.
  }
  if (active) document.documentElement.setAttribute("data-demo-sesion", "1");
  else document.documentElement.removeAttribute("data-demo-sesion");
}

export function LogoutButton({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        setDemoSession(false);
        router.push("/");
      }}
    >
      {children}
    </button>
  );
}
