"use client";

import { useRouter } from "next/navigation";
import { CreditCard, Lock } from "lucide-react";
import { setDemoSession } from "@/components/demo-session";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

// Checkout de demo: no cobra ni guarda nada; solo lleva a "Mis sesiones" con el aviso de confirmación.

export function CheckoutForm({
  blockId,
  subjects,
  totalLabel,
  defaultName,
}: {
  blockId: string;
  subjects: { id: string; name: string }[];
  totalLabel: string;
  defaultName: string;
}) {
  const router = useRouter();

  function pay(formData: FormData) {
    setDemoSession(true);
    const params = new URLSearchParams({ reservada: blockId });
    const subjectId = formData.get("subjectId");
    if (typeof subjectId === "string" && subjectId) params.set("materia", subjectId);
    router.push(`/sesiones?${params}`);
  }

  return (
    <form action={pay} className="space-y-5">

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">1. Detalles de la sesión</legend>
        <Field label="Materia" htmlFor="subjectId">
          <select
            id="subjectId"
            name="subjectId"
            defaultValue={subjects.length === 1 ? subjects[0].id : ""}
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
          hint="Ayuda a tu tutor a preparar la sesión."
        >
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={300}
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
          cualquier número de 16 dígitos. En esta demo los datos no se envían a ningún lado.
        </Alert>
        <Field label="Nombre en la tarjeta" htmlFor="cardName">
          <input
            id="cardName"
            name="cardName"
            autoComplete="cc-name"
            defaultValue={defaultName}
            className={inputClass}
          />
        </Field>
        <Field label="Número de tarjeta" htmlFor="cardNumber">
          <input
            id="cardNumber"
            name="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            defaultValue="4242 4242 4242 4242"
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vencimiento" htmlFor="cardExpiry">
            <input
              id="cardExpiry"
              name="cardExpiry"
              placeholder="MM/AA"
              autoComplete="cc-exp"
              defaultValue="12/29"
              className={inputClass}
            />
          </Field>
          <Field label="CVC" htmlFor="cardCvc">
            <input
              id="cardCvc"
              name="cardCvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              defaultValue="123"
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
