import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, Star } from "lucide-react";

// Componentes de interfaz sin estado (sirven en servidor y cliente).

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "inverse" | "glass";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" && "h-9 px-3 text-sm",
    size === "md" && "h-11 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-base",
    variant === "primary" && "bg-blue-700 text-white hover:bg-blue-800",
    variant === "accent" && "bg-orange-500 text-white hover:bg-orange-600",
    variant === "secondary" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    variant === "ghost" && "text-slate-700 hover:bg-slate-100",
    variant === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    // Para fondos de color (hero azul, bloque naranja)
    variant === "inverse" && "bg-white text-orange-600 hover:bg-orange-50",
    variant === "glass" && "bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20",
    extra,
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export const inputClass =
  "block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/20";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string[] | string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {message ? (
        <p className="flex items-center gap-1 text-sm text-red-600" role="alert">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {message}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CircleCheck : tone === "info" ? Info : CircleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "info" && "border-blue-200 bg-blue-50 text-blue-900",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
        tone === "error" && "border-red-200 bg-red-50 text-red-900",
        tone === "warning" && "border-orange-200 bg-orange-50 text-orange-900",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-xs", className)}>{children}</div>
  );
}

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: "slate" | "blue" | "orange" | "green" | "red" | "amber";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "blue" && "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
        tone === "orange" && "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
        tone === "green" && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
        tone === "red" && "bg-red-50 text-red-800 ring-1 ring-red-200",
        tone === "amber" && "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-700 [&>svg]:size-6">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={cn(
            size === "sm" ? "size-4" : "size-5",
            i <= rounded ? "fill-orange-400 text-orange-400" : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
    </span>
  );
}

export function RatingInline({ average, count }: { average: number | null; count: number }) {
  if (!count || average === null) {
    return <span className="text-sm text-slate-500">Sin reseñas aún</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Stars value={average} />
      <span className="font-semibold text-slate-900">{average.toFixed(1)}</span>
      <span className="text-slate-500">({count} {count === 1 ? "reseña" : "reseñas"})</span>
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "blue" | "orange" | "green" | "slate";
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "blue" && "text-blue-800",
          tone === "orange" && "text-orange-600",
          tone === "green" && "text-emerald-700",
          tone === "slate" && "text-slate-900",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 font-semibold text-white",
        size === "sm" && "size-8 text-xs",
        size === "md" && "size-12 text-base",
        size === "lg" && "size-20 text-2xl",
      )}
    >
      {initials}
    </span>
  );
}
