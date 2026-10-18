"use client";

import { useActionState, useState } from "react";
import { Check, X } from "lucide-react";
import { approveApplicationAction, rejectApplicationAction } from "@/actions/admin";
import { initialState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { Alert, buttonClass, inputClass } from "@/components/ui";

export function ReviewApplicationActions({ applicationId }: { applicationId: string }) {
  const [approveState, approve] = useActionState(approveApplicationAction.bind(null, applicationId), initialState);
  const [rejectState, reject] = useActionState(rejectApplicationAction.bind(null, applicationId), initialState);
  const [rejecting, setRejecting] = useState(false);

  if (approveState.ok) return <Alert tone="success">{approveState.message}</Alert>;
  if (rejectState.ok) return <Alert tone="info">{rejectState.message}</Alert>;

  return (
    <div className="space-y-3">
      {approveState.message ? <Alert tone="error">{approveState.message}</Alert> : null}
      {rejectState.message ? <Alert tone="error">{rejectState.message}</Alert> : null}
      {!rejecting ? (
        <div className="flex flex-wrap gap-2">
          <form action={approve}>
            <SubmitButton size="sm" pendingText="Aprobando…">
              <Check className="size-4" aria-hidden /> Aprobar
            </SubmitButton>
          </form>
          <button type="button" onClick={() => setRejecting(true)} className={buttonClass("danger", "sm")}>
            <X className="size-4" aria-hidden /> Rechazar
          </button>
        </div>
      ) : (
        <form action={reject} className="space-y-2 rounded-xl border border-red-200 bg-red-50/50 p-3" noValidate>
          <label htmlFor={`reason-${applicationId}`} className="block text-sm font-medium text-red-900">
            Motivo del rechazo (lo verá el estudiante)
          </label>
          <textarea
            id={`reason-${applicationId}`}
            name="reason"
            rows={3}
            maxLength={500}
            defaultValue={rejectState.fields?.reason}
            aria-invalid={!!rejectState.errors?.reason}
            placeholder="Ej. El documento no es legible; sube un kárdex reciente donde se vea la calificación de la materia."
            className={inputClass}
          />
          {rejectState.errors?.reason ? (
            <p className="text-sm text-red-600" role="alert">
              {rejectState.errors.reason[0]}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="danger" size="sm" pendingText="Rechazando…">
              Confirmar rechazo
            </SubmitButton>
            <button type="button" onClick={() => setRejecting(false)} className={buttonClass("ghost", "sm")}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
