"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { createReviewAction } from "@/actions/sessions";
import { initialState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, cn, inputClass } from "@/components/ui";

const LABELS = ["", "Muy mala", "Mala", "Regular", "Buena", "Excelente"];

export function ReviewForm({ sessionId }: { sessionId: string }) {
  const [state, action] = useActionState(createReviewAction.bind(null, sessionId), initialState);
  const [rating, setRating] = useState(Number(state.fields?.rating ?? 0));
  const [hover, setHover] = useState(0);
  const shown = hover || rating;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-800">Calificación</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
              <Star
                aria-hidden
                className={cn(
                  "size-9 transition peer-focus-visible:rounded peer-focus-visible:outline-2 peer-focus-visible:outline-blue-600",
                  n <= shown ? "fill-orange-400 text-orange-400" : "fill-slate-100 text-slate-300",
                )}
              />
            </label>
          ))}
          <span className="ml-3 text-sm font-medium text-slate-700">{LABELS[shown]}</span>
        </div>
        {state.errors?.rating ? (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {state.errors.rating[0]}
          </p>
        ) : null}
      </fieldset>
      <Field label="Comentario" htmlFor="comment" error={state.errors?.comment} hint="¿Qué tal explicó? ¿Lo recomendarías?">
        <textarea
          id="comment"
          name="comment"
          rows={4}
          maxLength={500}
          defaultValue={state.fields?.comment}
          aria-invalid={!!state.errors?.comment}
          className={inputClass}
        />
      </Field>
      <SubmitButton variant="accent" pendingText="Enviando…">
        Publicar reseña
      </SubmitButton>
    </form>
  );
}
