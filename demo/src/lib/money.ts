import { COMMISSION_RATE } from "./config";

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

/** Formatea centavos como pesos mexicanos: 15000 → "$150.00". */
export function formatMXN(cents: number): string {
  return mxn.format(cents / 100);
}

/** Precio de una sesión según la tarifa por hora y la duración. */
export function sessionPriceCents(hourlyRateCents: number, minutes: number): number {
  return Math.round((hourlyRateCents * minutes) / 60);
}

/** Reparte un pago entre la plataforma y el tutor. */
export function splitPayment(amountCents: number, rate: number = COMMISSION_RATE) {
  const commissionCents = Math.round(amountCents * rate);
  return {
    amountCents,
    commissionRate: rate,
    commissionCents,
    tutorPayoutCents: amountCents - commissionCents,
  };
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}
