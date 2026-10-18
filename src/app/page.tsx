import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  GraduationCap,
  MapPin,
  CalendarX,
  Search,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import { COMMISSION_RATE } from "@/lib/config";
import { formatPercent } from "@/lib/money";
import { ButtonLink, Card } from "@/components/ui";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const [subjects, tutorCount, sessionCount, ratingAgg] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tutors: { where: { user: { role: "TUTOR" } } } } } },
    }),
    prisma.user.count({ where: { role: "TUTOR" } }),
    prisma.tutoringSession.count({ where: { status: "COMPLETADA" } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
  ]);
  const tutorShare = formatPercent(1 - COMMISSION_RATE);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-800 to-blue-950 text-white">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-96 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-blue-100 ring-1 ring-white/20">
              <GraduationCap className="size-4" aria-hidden /> Hecho para la UABC Ensenada
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Pasa Cálculo con ayuda de alguien que{" "}
              <span className="text-orange-400">ya lo aprobó</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-blue-100">
              TutorPar te conecta con estudiantes avanzados de tu misma facultad, verificados con su
              kárdex, para tutorías presenciales en el campus o en línea. Reserva en minutos y paga
              solo por la sesión.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <>
                  <ButtonLink href="/tutores" variant="accent" size="lg">
                    <Search className="size-5" aria-hidden /> Buscar tutores
                  </ButtonLink>
                  <ButtonLink
                    href={homeForRole(user.role)}
                    size="lg"
                    variant="glass"
                  >
                    Ir a mi panel <ArrowRight className="size-5" aria-hidden />
                  </ButtonLink>
                </>
              ) : (
                <>
                  <ButtonLink href="/registro" variant="accent" size="lg">
                    Crear cuenta gratis <ArrowRight className="size-5" aria-hidden />
                  </ButtonLink>
                  <ButtonLink
                    href="/iniciar-sesion"
                    size="lg"
                    variant="glass"
                  >
                    Iniciar sesión
                  </ButtonLink>
                </>
              )}
            </div>
            <p className="mt-4 text-sm text-blue-200">Solo necesitas tu correo @uabc.edu.mx.</p>
          </div>

          <div className="grid content-center gap-4">
            <Card className="border-white/10 bg-white p-5 text-slate-900 shadow-2xl">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-800">
                  MC
                </span>
                <div>
                  <p className="font-semibold">María C. · 7.º semestre</p>
                  <p className="text-sm text-slate-500">Ing. en Computación</p>
                </div>
                <BadgeCheck className="ml-auto size-6 text-blue-700" aria-label="Tutor verificado" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">Cálculo Integral</span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-800">Álgebra Lineal</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Star className="size-4 fill-orange-400 text-orange-400" aria-hidden /> 4.9
                </span>
                <span className="font-bold text-blue-800">$180 / hora</span>
              </div>
            </Card>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { value: tutorCount, label: "tutores verificados" },
                { value: subjects.length, label: "materias" },
                {
                  value: ratingAgg._avg.rating ? ratingAgg._avg.rating.toFixed(1) : "—",
                  label: "calificación promedio",
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/10 px-2 py-3 ring-1 ring-white/15">
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-blue-100">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight">¿Cómo funciona?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">
          Tres pasos para dejar de sufrir con las materias de tronco común.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Search,
              title: "1. Busca por materia",
              text: "Filtra tutores por la materia que se te complica y compara calificaciones, reseñas y tarifas.",
            },
            {
              icon: CalendarCheck,
              title: "2. Reserva un horario",
              text: "Elige un bloque libre, presencial en el campus o en línea por Meet o Zoom, y confirma el pago.",
            },
            {
              icon: Star,
              title: "3. Aprende y califica",
              text: "Toma tu sesión y deja una reseña para que otros estudiantes encuentren a los mejores tutores.",
            },
          ].map((step) => (
            <Card key={step.title} className="p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <step.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 text-slate-600">{step.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Materias */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Materias disponibles</h2>
              <p className="mt-2 text-slate-600">Las materias básicas con más índice de reprobación.</p>
            </div>
            <Link href="/tutores" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
              Ver todos los tutores <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <Link
                key={s.id}
                href={`/tutores?materia=${s.slug}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 px-5 py-4 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="font-semibold text-slate-900">{s.name}</span>
                <span className="text-sm text-slate-500 group-hover:text-blue-700">
                  {s._count.tutors} {s._count.tutors === 1 ? "tutor" : "tutores"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Confianza y modalidad */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-3">
        {[
          {
            icon: ShieldCheck,
            title: "Tutores verificados",
            text: "Cada tutor sube su kárdex o constancia y un administrador lo revisa antes de publicarlo.",
          },
          {
            icon: MapPin,
            title: "En el campus o en línea",
            text: "Reúnete en la biblioteca o en tu facultad, o conéctate por videollamada desde casa.",
          },
          {
            icon: CalendarX,
            title: "Cancelación flexible",
            text: "¿Cambio de planes? Cancela hasta 24 horas antes y recibes el reembolso completo.",
          },
        ].map((f) => (
          <div key={f.title} className="flex gap-4">
            <f.icon className="mt-1 size-6 shrink-0 text-blue-700" aria-hidden />
            <div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-slate-600">{f.text}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Para tutores */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 rounded-3xl bg-orange-500 p-8 text-white md:grid-cols-[1.5fr_1fr] md:p-12">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">¿Vas en semestres avanzados? Gana dinero enseñando.</h2>
            <p className="mt-3 max-w-xl text-orange-50">
              Tú pones tu tarifa y tus horarios. Recibes el {tutorShare} de cada sesión; TutorPar solo
              cobra una comisión del {formatPercent(COMMISSION_RATE)} por conectar, cobrar y darte visibilidad.
              {sessionCount > 0 ? ` Ya se han impartido ${sessionCount} sesiones.` : ""}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3">
            <div className="flex items-center gap-3 rounded-xl bg-white/15 p-4">
              <Wallet className="size-6 shrink-0" aria-hidden />
              <p className="text-sm">Panel de ganancias con ingresos brutos, comisión e ingreso neto por mes.</p>
            </div>
            <ButtonLink href={user ? "/perfil#ser-tutor" : "/registro"} variant="inverse" size="lg">
              Quiero ser tutor
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
