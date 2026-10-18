"use client";

import { useActionState } from "react";
import { FileUp } from "lucide-react";
import { applyAsTutorAction, updateProfileAction } from "@/actions/profile";
import { initialState } from "@/lib/action-state";
import { COMMISSION_RATE, MAX_HOURLY_RATE, MIN_HOURLY_RATE } from "@/lib/config";
import { formatPercent } from "@/lib/money";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; email: string; career: string; semester: string; phone: string };
}) {
  const [state, action] = useActionState(updateProfileAction, initialState);
  const e = state.errors;
  const v = state.fields ?? defaults;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Correo institucional" htmlFor="email" hint="El correo no se puede cambiar.">
        <input id="email" value={defaults.email} disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
      </Field>
      <Field label="Nombre completo" htmlFor="name" error={e?.name}>
        <input id="name" name="name" defaultValue={v.name} aria-invalid={!!e?.name} className={inputClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Carrera" htmlFor="career" error={e?.career}>
          <input id="career" name="career" defaultValue={v.career} className={inputClass} />
        </Field>
        <Field label="Semestre" htmlFor="semester" error={e?.semester}>
          <input
            id="semester"
            name="semester"
            type="number"
            min={1}
            max={14}
            defaultValue={v.semester}
            aria-invalid={!!e?.semester}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Teléfono (opcional)" htmlFor="phone" error={e?.phone} hint="No se muestra en tu perfil público.">
        <input id="phone" name="phone" type="tel" defaultValue={v.phone} aria-invalid={!!e?.phone} className={inputClass} />
      </Field>
      <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
    </form>
  );
}

export function SubjectCheckboxes({
  subjects,
  selected,
  error,
}: {
  subjects: { id: string; name: string }[];
  selected: string[];
  error?: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-800">Materias que puedes impartir</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {subjects.map((s) => (
          <label
            key={s.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
          >
            <input
              type="checkbox"
              name="subjectIds"
              value={s.id}
              defaultChecked={selected.includes(s.id)}
              className="size-4 accent-blue-700"
            />
            {s.name}
          </label>
        ))}
      </div>
      {error ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error[0]}
        </p>
      ) : null}
    </fieldset>
  );
}

export function TutorApplicationForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [state, action] = useActionState(applyAsTutorAction, initialState);
  const e = state.errors;
  const f = state.fields;

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <SubjectCheckboxes subjects={subjects} selected={f?.subjectIds?.split(",") ?? []} error={e?.subjectIds} />
      <Field
        label="Tarifa por hora (MXN)"
        htmlFor="hourlyRate"
        error={e?.hourlyRate}
        hint={`Entre $${MIN_HOURLY_RATE} y $${MAX_HOURLY_RATE}. TutorPar se queda con el ${formatPercent(COMMISSION_RATE)} de cada sesión.`}
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
            defaultValue={f?.hourlyRate ?? "150"}
            aria-invalid={!!e?.hourlyRate}
            className={`${inputClass} pl-7`}
          />
        </div>
      </Field>
      <Field label="Preséntate con los estudiantes" htmlFor="bio" error={e?.bio} hint="Tu experiencia, cómo explicas y qué temas dominas.">
        <textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={600}
          defaultValue={f?.bio}
          aria-invalid={!!e?.bio}
          className={inputClass}
          placeholder="Voy en 7.º semestre de Ingeniería en Computación. Aprobé Cálculo Integral con 100 y…"
        />
      </Field>
      <Field
        label="Kárdex o constancia de estudios"
        htmlFor="document"
        error={e?.document}
        hint="PDF, JPG, PNG o WEBP de máximo 5 MB. Solo lo verán los administradores."
      >
        <label
          htmlFor="document"
          className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 hover:border-blue-400"
        >
          <FileUp className="size-5 text-blue-700" aria-hidden />
          <input
            id="document"
            name="document"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-1.5 file:font-semibold file:text-white"
          />
        </label>
      </Field>
      <SubmitButton variant="accent" pendingText="Enviando solicitud…">
        Enviar solicitud
      </SubmitButton>
    </form>
  );
}
