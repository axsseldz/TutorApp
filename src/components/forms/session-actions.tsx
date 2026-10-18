"use client";

import { useActionState, useState } from "react";
import { cancelSessionAction } from "@/actions/sessions";
import { initialState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { Alert, buttonClass, inputClass } from "@/components/ui";

/** Botón de cancelar con confirmación y motivo opcional. */
export function CancelSessionButton({ sessionId, asTutor }: { sessionId: string; asTutor: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(cancelSessionAction.bind(null, sessionId), initialState);

  if (!open) {
    return (
      <div className="space-y-2">
        {state.message ? <Alert tone="error">{state.message}</Alert> : null}
        <button type="button" onClick={() => setOpen(true)} className={buttonClass("danger", "sm")}>
          Cancelar sesión
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="w-full space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-3">
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <p className="text-sm font-medium text-red-900">
        {asTutor
          ? "¿Seguro que quieres cancelar? Se reembolsará el pago completo al estudiante."
          : "¿Seguro que quieres cancelar? Se te reembolsará el pago completo (simulado)."}
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
        <SubmitButton variant="danger" size="sm" pendingText="Cancelando…">
          Sí, cancelar
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost", "sm")}>
          No, mantener
        </button>
      </div>
    </form>
  );
}
