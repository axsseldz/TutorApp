"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_USER } from "@/lib/data";
import { setDemoSession } from "@/components/demo-session";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, inputClass } from "@/components/ui";

// Formularios de demo: no envían ni guardan nada. Solo "inician sesión" de forma
// visual y llevan a la vista de estudiante.

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  return (
    <form
      action={() => {
        setDemoSession(true);
        router.push(next ?? "/tutores");
      }}
      className="space-y-4"
      noValidate
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Alert tone="info">
        Versión demo: cualquier correo y contraseña te dejan entrar como {DEMO_USER.name}, el estudiante de
        ejemplo. No se envía ningún dato.
      </Alert>
      <Field label="Correo institucional" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu.nombre@uabc.edu.mx"
          className={inputClass}
        />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" className={inputClass} />
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
  const router = useRouter();
  return (
    <form
      action={() => {
        setDemoSession(true);
        router.push(next ?? "/tutores?bienvenida=1");
      }}
      className="space-y-4"
      noValidate
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Alert tone="info">
        Versión demo: la cuenta no se crea. Al continuar entrarás como el estudiante de ejemplo.
      </Alert>
      <Field label="Nombre completo" htmlFor="name">
        <input id="name" name="name" autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Correo institucional" htmlFor="email" hint="Solo se aceptan correos @uabc.edu.mx.">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu.nombre@uabc.edu.mx"
          className={inputClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Carrera (opcional)" htmlFor="career">
          <input id="career" name="career" placeholder="Ing. en Computación" className={inputClass} />
        </Field>
        <Field label="Semestre" htmlFor="semester">
          <input
            id="semester"
            name="semester"
            type="number"
            min={1}
            max={14}
            inputMode="numeric"
            className={inputClass}
          />
        </Field>
      </div>
      <Field
        label="Contraseña"
        htmlFor="password"
        hint="Mínimo 8 caracteres, con al menos una letra y un número."
      >
        <input id="password" name="password" type="password" autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="Confirma tu contraseña" htmlFor="confirmPassword">
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass}
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
