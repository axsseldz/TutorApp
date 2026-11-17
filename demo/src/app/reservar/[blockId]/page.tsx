import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock, CalendarX, MapPin, ShieldCheck, Video } from "lucide-react";
import { COMMISSION_RATE, STUDENT_CANCELLATION_HOURS } from "@/lib/config";
import { DEMO_USER, getFreeBlock, getTutor } from "@/lib/data";
import { formatDay, formatDuration, formatTimeRange, minutesBetween } from "@/lib/dates";
import { formatMXN, formatPercent, sessionPriceCents, splitPayment } from "@/lib/money";
import { ModalityBadge } from "@/components/labels";
import { Avatar, ButtonLink, Card, EmptyState } from "@/components/ui";
import { CheckoutForm } from "@/components/forms/checkout-form";

export const metadata: Metadata = { title: "Confirmar reserva" };

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params }: PageProps<"/reservar/[blockId]">) {
  const { blockId } = await params;
  const found = getFreeBlock(blockId);
  const block = found ? { ...found, tutor: getTutor(found.tutorId)! } : undefined;
  const unavailable = !block;
  if (unavailable) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          icon={<CalendarX />}
          title="Este horario ya no está disponible"
          description="Alguien más lo reservó o el tutor lo retiró. Elige otro horario."
          action={
            <ButtonLink href="/tutores">Ver otros horarios</ButtonLink>
          }
        />
      </div>
    );
  }

  const profile = block.tutor;
  const minutes = minutesBetween(block.startsAt, block.endsAt);
  const price = sessionPriceCents(profile.hourlyRateCents, minutes);
  const split = splitPayment(price);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href={`/tutores/${block.tutorId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-blue-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> Volver al perfil del tutor
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Confirma tu reserva</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Card className="h-fit p-6">
          <div className="flex items-center gap-3">
            <Avatar name={block.tutor.name} />
            <div>
              <p className="font-semibold">{block.tutor.name}</p>
              <p className="text-sm text-slate-500">{block.tutor.career}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-slate-700">
            <li className="flex gap-2">
              <CalendarClock className="size-4 shrink-0 text-blue-700" aria-hidden />
              <span>
                {formatDay(block.startsAt)}
                <br />
                {formatTimeRange(block.startsAt, block.endsAt)} ({formatDuration(minutes)})
              </span>
            </li>
            <li className="flex items-center gap-2">
              <ModalityBadge modality={block.modality} />
            </li>
            {block.modality === "PRESENCIAL" ? (
              <li className="flex gap-2">
                <MapPin className="size-4 shrink-0 text-blue-700" aria-hidden /> {block.location}
              </li>
            ) : (
              <li className="flex gap-2">
                <Video className="size-4 shrink-0 text-blue-700" aria-hidden /> El enlace de la videollamada aparecerá
                en “Mis sesiones” al confirmar.
              </li>
            )}
          </ul>
          <dl className="mt-6 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">
                Tarifa ({formatMXN(profile.hourlyRateCents)}/h × {formatDuration(minutes)})
              </dt>
              <dd className="tabular-nums">{formatMXN(price)}</dd>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <dt>Incluye comisión de TutorPar ({formatPercent(COMMISSION_RATE)})</dt>
              <dd className="tabular-nums">{formatMXN(split.commissionCents)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Total a pagar</dt>
              <dd className="tabular-nums text-blue-800">{formatMXN(price)}</dd>
            </div>
          </dl>
          <p className="mt-4 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" aria-hidden />
            Puedes cancelar sin costo hasta {STUDENT_CANCELLATION_HOURS} horas antes de la sesión y recibir el reembolso
            completo.
          </p>
        </Card>

        <Card className="p-6">
          <CheckoutForm
            blockId={block.id}
            subjects={profile.subjects}
            totalLabel={formatMXN(price)}
            defaultName={DEMO_USER.name}
          />
        </Card>
      </div>
    </div>
  );
}
