import type { Metadata } from "next";
import { BadgeCheck, CalendarCheck, Wallet } from "lucide-react";
import { safeInternalPath } from "@/lib/demo-session";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  const { next } = await searchParams;
  const nextPath = safeInternalPath(next) ?? undefined;

  return (
    <AuthShell
      title="Crea tu cuenta de TutorPar"
      subtitle="Todos empiezan como estudiantes. Si vas en semestres avanzados, después puedes solicitar ser tutor desde tu perfil."
      aside={
        <ul className="mt-8 space-y-4 text-slate-700">
          <li className="flex gap-3">
            <BadgeCheck className="size-5 shrink-0 text-blue-700" aria-hidden /> Tutores verificados con kárdex
          </li>
          <li className="flex gap-3">
            <CalendarCheck className="size-5 shrink-0 text-blue-700" aria-hidden /> Sesiones presenciales o en línea
          </li>
          <li className="flex gap-3">
            <Wallet className="size-5 shrink-0 text-blue-700" aria-hidden /> Pagas solo por sesión, sin suscripciones
          </li>
        </ul>
      }
    >
      <RegisterForm next={nextPath} />
    </AuthShell>
  );
}
