"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Alert, buttonClass, inputClass } from "@/components/ui";

/** Botón de cancelar con confirmación (demo: no cancela nada). */
export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) {
    return (
      <div className="space-y-2">
        {done ? <Alert tone="info">Versión demo: la sesión no se canceló ni se hizo ningún reembolso.</Alert> : null}
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("danger", "sm")}>
          Cancelar sesión
        </button>
      </div>
    );
  }

  return (
    <form
      action={() => {
        setOpen(false);
        setDone(true);
      }}
      className="w-full space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-3"
    >
      <p className="text-sm font-medium text-red-900">
        ¿Seguro que quieres cancelar? Se te reembolsará el pago completo (simulado).
      </p>
      <label htmlFor={`reason-${sessionId}`} className="sr-only">
        Motivo (opcional)
      </label>
      <textarea
        id={`reason-${sessionId}`}
        name="reason"
        rows={2}
        maxLength={300}
        placeholder="Motivo (opcional)"
        className={inputClass}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={buttonClass("danger", "sm")}>
          Sí, cancelar
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "sm")}>
          No, mantener
        </button>
      </div>
    </form>
  );
}

/** "Dejar reseña" (demo: solo muestra un aviso). */
export function ReviewButton() {
  const [clicked, setClicked] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => setClicked(true)} className={buttonClass("accent", "sm")}>
        <Star className="size-4" aria-hidden /> Dejar reseña
      </button>
      {clicked ? <p className="text-sm text-slate-500">Versión demo: aquí no se guardan reseñas.</p> : null}
    </div>
  );
}
