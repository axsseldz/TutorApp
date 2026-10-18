"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState, buttonClass } from "@/components/ui";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<TriangleAlert />}
        title="Algo salió mal"
        description={
          <>
            Ocurrió un error inesperado al cargar esta página. Intenta de nuevo; si el problema sigue, avísanos.
            {error.digest ? <span className="mt-2 block text-xs text-slate-400">Código: {error.digest}</span> : null}
          </>
        }
        action={
          <button type="button" onClick={() => retry()} className={buttonClass("primary")}>
            Reintentar
          </button>
        }
      />
    </div>
  );
}
