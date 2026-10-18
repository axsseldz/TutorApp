"use client";

import { useActionState } from "react";
import { CreditCard, Lock } from "lucide-react";
import { bookBlockAction } from "@/actions/booking";
import { initialState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

export function CheckoutForm({
  blockId,
  subjects,
  totalLabel,
  defaultName,
  blockedReason,
}: {
  blockId: string;
  subjects: { id: string; name: string }[];
  totalLabel: string;
  defaultName: string;
  blockedReason?: string;
}) {
  const [state, action] = useActionState(bookBlockAction.bind(null, blockId), initialState);
  const e = state.errors;
  const f = state.fields;

  if (blockedReason) return <Alert tone="warning">{blockedReason}</Alert>;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">1. Detalles de la sesión</legend>
        <Field label="Materia" htmlFor="subjectId" error={e?.subjectId}>
          <select
            id="subjectId"
            name="subjectId"
            defaultValue={f?.subjectId ?? (subjects.length === 1 ? subjects[0].id : "")}
            aria-invalid={!!e?.subjectId}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Elige una materia…
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="¿Qué temas quieres repasar? (opcional)"
          htmlFor="notes"
          error={e?.notes}
          hint="Ayuda a tu tutor a preparar la sesión."
        >
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={300}
            defaultValue={f?.notes}
            placeholder="Ej. integrales por partes y fracciones parciales para el segundo parcial"
            className={inputClass}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 flex items-center gap-2 text-lg font-semibold">
          2. Pago <CreditCard className="size-5 text-slate-400" aria-hidden />
        </legend>
        <Alert tone="warning">
          <strong>Pago simulado.</strong> No se realiza ningún cargo real. Usa la tarjeta de prueba ya capturada o
          cualquier número de 16 dígitos.
        </Alert>
        <Field label="Nombre en la tarjeta" htmlFor="cardName" error={e?.cardName}>
          <input
            id="cardName"
            name="cardName"
            autoComplete="cc-name"
            defaultValue={f?.cardName ?? defaultName}
            aria-invalid={!!e?.cardName}
            className={inputClass}
          />
        </Field>
        <Field label="Número de tarjeta" htmlFor="cardNumber" error={e?.cardNumber}>
          <input
            id="cardNumber"
            name="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            defaultValue="4242 4242 4242 4242"
            aria-invalid={!!e?.cardNumber}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vencimiento" htmlFor="cardExpiry" error={e?.cardExpiry}>
            <input
              id="cardExpiry"
              name="cardExpiry"
              placeholder="MM/AA"
              autoComplete="cc-exp"
              defaultValue={f?.cardExpiry ?? "12/29"}
              aria-invalid={!!e?.cardExpiry}
              className={inputClass}
            />
          </Field>
          <Field label="CVC" htmlFor="cardCvc" error={e?.cardCvc}>
            <input
              id="cardCvc"
              name="cardCvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              defaultValue="123"
              aria-invalid={!!e?.cardCvc}
              className={inputClass}
            />
          </Field>
        </div>
      </fieldset>

      <SubmitButton variant="accent" size="lg" className="w-full" pendingText="Procesando pago…">
        <Lock className="size-4" aria-hidden /> Pagar {totalLabel} y reservar
      </SubmitButton>
    </form>
  );
}
