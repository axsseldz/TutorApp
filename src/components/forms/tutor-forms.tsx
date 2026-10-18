"use client";

import { useActionState, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { createBlockAction, updateTutorProfileAction } from "@/actions/tutor";
import { initialState } from "@/lib/action-state";
import { COMMISSION_RATE, MAX_HOURLY_RATE, MIN_HOURLY_RATE } from "@/lib/config";
import { formatPercent } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { SubjectCheckboxes } from "@/components/forms/profile-forms";
import { Alert, Field, cn, inputClass } from "@/components/ui";

export function TutorProfileForm({
  subjects,
  defaults,
}: {
  subjects: { id: string; name: string }[];
  defaults: { subjectIds: string[]; hourlyRate: string; bio: string };
}) {
  const [state, action] = useActionState(updateTutorProfileAction, initialState);
  const e = state.errors;
  const f = state.fields;
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <SubjectCheckboxes
        subjects={subjects}
        selected={f?.subjectIds !== undefined ? f.subjectIds.split(",") : defaults.subjectIds}
        error={e?.subjectIds}
      />
      <Field
        label="Tarifa por hora (MXN)"
        htmlFor="hourlyRate"
        error={e?.hourlyRate}
        hint={`Entre $${MIN_HOURLY_RATE} y $${MAX_HOURLY_RATE}. Recibes el ${formatPercent(1 - COMMISSION_RATE)} de cada sesión. El cambio aplica a reservas nuevas.`}
      >
        <div className="relative max-w-48">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">$</span>
          <input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            min={MIN_HOURLY_RATE}
            max={MAX_HOURLY_RATE}
            step={10}
            defaultValue={f?.hourlyRate ?? defaults.hourlyRate}
            aria-invalid={!!e?.hourlyRate}
            className={`${inputClass} pl-7`}
          />
        </div>
      </Field>
      <Field label="Presentación" htmlFor="bio" error={e?.bio}>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={600}
          defaultValue={f?.bio ?? defaults.bio}
          aria-invalid={!!e?.bio}
          className={inputClass}
        />
      </Field>
      <SubmitButton pendingText="Guardando…">Guardar perfil</SubmitButton>
    </form>
  );
}

export function BlockForm({ minDate, maxDate }: { minDate: string; maxDate: string }) {
  const [state, action] = useActionState(createBlockAction, initialState);
  const e = state.errors;
  const f = state.fields;
  const [modality, setModality] = useState(f?.modality ?? "PRESENCIAL");

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      {state.message && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Fecha" htmlFor="date" error={e?.date}>
          <input
            id="date"
            name="date"
            type="date"
            min={minDate}
            max={maxDate}
            defaultValue={f?.date ?? minDate}
            aria-invalid={!!e?.date}
            className={inputClass}
          />
        </Field>
        <Field label="Inicio" htmlFor="startTime" error={e?.startTime}>
          <input
            id="startTime"
            name="startTime"
            type="time"
            step={900}
            defaultValue={f?.startTime ?? "16:00"}
            aria-invalid={!!e?.startTime}
            className={inputClass}
          />
        </Field>
        <Field label="Fin" htmlFor="endTime" error={e?.endTime}>
          <input
            id="endTime"
            name="endTime"
            type="time"
            step={900}
            defaultValue={f?.endTime ?? "17:00"}
            aria-invalid={!!e?.endTime}
            className={inputClass}
          />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-800">Modalidad</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "PRESENCIAL", label: "Presencial" },
            { value: "EN_LINEA", label: "En línea" },
          ].map((m) => (
            <label
              key={m.value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium",
                modality === m.value ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-700",
              )}
            >
              <input
                type="radio"
                name="modality"
                value={m.value}
                checked={modality === m.value}
                onChange={() => setModality(m.value)}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>
      {modality === "PRESENCIAL" ? (
        <Field label="Lugar en el campus" htmlFor="location" error={e?.location}>
          <input
            id="location"
            name="location"
            placeholder="Biblioteca Central, sala de estudio 2"
            defaultValue={f?.location}
            aria-invalid={!!e?.location}
            className={inputClass}
          />
        </Field>
      ) : (
        <input type="hidden" name="location" value="" />
      )}
      {modality === "EN_LINEA" ? (
        <Field label="Enlace de Meet o Zoom" htmlFor="meetingUrl" error={e?.meetingUrl} hint="Solo lo verá el estudiante que reserve.">
          <input
            id="meetingUrl"
            name="meetingUrl"
            type="url"
            placeholder="https://meet.google.com/abc-defg-hij"
            defaultValue={f?.meetingUrl}
            aria-invalid={!!e?.meetingUrl}
            className={inputClass}
          />
        </Field>
      ) : (
        <input type="hidden" name="meetingUrl" value="" />
      )}
      <SubmitButton variant="accent" pendingText="Publicando…">
        <CalendarPlus className="size-4" aria-hidden /> Publicar bloque
      </SubmitButton>
    </form>
  );
}
