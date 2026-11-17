import type { Metadata } from "next";
import { safeInternalPath } from "@/lib/demo-session";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/forms/auth-forms";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/iniciar-sesion">) {
  const { next } = await searchParams;
  const nextPath = safeInternalPath(next) ?? undefined;

  return (
    <AuthShell
      title="Qué bueno verte de nuevo"
      subtitle="Entra con tu correo institucional para reservar sesiones o administrar tus tutorías."
    >
      {nextPath ? (
        <Alert tone="info" className="mb-4">
          Inicia sesión para continuar.
        </Alert>
      ) : null}
      <LoginForm next={nextPath} />
    </AuthShell>
  );
}
