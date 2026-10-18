import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Sin acceso" };

export default function NoAccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<Lock />}
        title="No tienes acceso a esta sección"
        description="Esta página es solo para otro tipo de cuenta (tutores o administradores). Si crees que es un error, cierra sesión y vuelve a entrar."
        action={<ButtonLink href="/">Volver al inicio</ButtonLink>}
      />
    </div>
  );
}
