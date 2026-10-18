"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/actions/auth";
import { initialState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, initialState);
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <Field label="Correo institucional" htmlFor="email" error={state.errors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu.nombre@uabc.edu.mx"
          defaultValue={state.fields?.email}
          aria-invalid={!!state.errors?.email}
          className={inputClass}
          required
        />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={state.errors?.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!state.errors?.password}
          className={inputClass}
          required
        />
      </Field>
      <SubmitButton className="w-full" pendingText="Entrando…">
        Iniciar sesión
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <Link
          href={next ? `/registro?next=${encodeURIComponent(next)}` : "/registro"}
          className="font-semibold text-blue-700 hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerAction, initialState);
  const e = state.errors;
  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <Field label="Nombre completo" htmlFor="name" error={e?.name}>
        <input
          id="name"
          name="name"
          autoComplete="name"
          defaultValue={state.fields?.name}
          aria-invalid={!!e?.name}
          className={inputClass}
          required
        />
      </Field>
      <Field
        label="Correo institucional"
        htmlFor="email"
        error={e?.email}
        hint="Solo se aceptan correos @uabc.edu.mx."
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu.nombre@uabc.edu.mx"
          defaultValue={state.fields?.email}
          aria-invalid={!!e?.email}
          className={inputClass}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Carrera (opcional)" htmlFor="career" error={e?.career}>
          <input
            id="career"
            name="career"
            placeholder="Ing. en Computación"
            defaultValue={state.fields?.career}
            aria-invalid={!!e?.career}
            className={inputClass}
          />
        </Field>
        <Field label="Semestre" htmlFor="semester" error={e?.semester}>
          <input
            id="semester"
            name="semester"
            type="number"
            min={1}
            max={14}
            inputMode="numeric"
            defaultValue={state.fields?.semester}
            aria-invalid={!!e?.semester}
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="Contraseña"
        htmlFor="password"
        error={e?.password}
        hint="Mínimo 8 caracteres, con al menos una letra y un número."
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!e?.password}
          className={inputClass}
          required
        />
      </Field>
      <Field label="Confirma tu contraseña" htmlFor="confirmPassword" error={e?.confirmPassword}>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!e?.confirmPassword}
          className={inputClass}
          required
        />
      </Field>
      <SubmitButton className="w-full" variant="accent" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={next ? `/iniciar-sesion?next=${encodeURIComponent(next)}` : "/iniciar-sesion"}
          className="font-semibold text-blue-700 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
