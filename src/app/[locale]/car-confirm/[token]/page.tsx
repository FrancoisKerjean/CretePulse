import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { bookingByConfirmToken } from "@/lib/car-deposit-server";
import { partnerViewState } from "@/lib/car-deposit";
import { carPickupLabel, carTypeLabelWithExamples } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { insuranceSummary } from "@/lib/car-inclusions";
import { formatEur, formatAthensDeadline, formatWallDate } from "@/lib/car-format";
import { ConfirmButtons, StateNotice, type StateTexts } from "./ConfirmButtons";

// Lien privé du loueur : jamais mis en cache (aucune écriture ISR), jamais indexé.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 520, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;
const recap = {
  background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "14px 16px",
  margin: "0 0 22px", color: "#0B3954", fontSize: 14, lineHeight: 1.8,
} as const;

const STATES: StateTexts = {
  confirmed: { title: "Booking confirmed", body: "Thank you. We sent you the customer's details by email." },
  declined: { title: "Booking declined", body: "You declined this booking. The customer was refunded." },
  expired: { title: "Booking expired", body: "This booking was not confirmed in time, and the customer was refunded." },
  cancelled: { title: "Booking cancelled", body: "This booking was cancelled. There is nothing to do on your side." },
  closed: { title: "Link no longer valid", body: "This link is no longer valid." },
};


/** Échéance passée ? Page rendue à chaque requête (force-dynamic) : l'horloge est lue une fois par rendu. */
const deadlinePassed = (iso: string | null) => (iso ? Date.parse(iso) < Date.now() : false);

// Page du loueur : récapitulatif de la réservation payée et deux boutons.
// ⛔ Elle ne fait que LIRE : seuls les boutons postent vers /api/car-rental/confirm
// (les antivirus de messagerie ouvrent les liens). ⛔ Aucune coordonnée du
// client ici : elles partent par e-mail à la confirmation.
export default async function CarConfirmPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  // Anglais seulement : les loueurs sont des pros locaux, une seule version à tenir.
  if (locale !== "en") redirect(`/en/car-confirm/${token}`);
  setRequestLocale(locale);

  const booking = await bookingByConfirmToken(token);
  const state = booking ? partnerViewState(booking.booking_status, booking.refund_reason) : "closed";

  if (!booking || state === "closed") {
    return (
      <main style={shell}>
        <div style={card}><StateNotice text={STATES.closed} /></div>
      </main>
    );
  }

  const total = Number(booking.quoted_price);
  const deposit = Number(booking.deposit_eur);
  const rest = Math.round((total - deposit) * 100) / 100;
  const ct = CAR_TYPES_DATA.find((c) => c.id === booking.car_type);
  const car = booking.quoted_car_model || carTypeLabelWithExamples(ct, "en", booking.car_type ?? "");
  const insurance = insuranceSummary(
    booking.quoted_insurance_type, booking.quoted_excess_eur, booking.quoted_zero_excess_upsell_eur_day, "en",
  );
  const deadline = booking.confirm_deadline_at ? formatAthensDeadline(booking.confirm_deadline_at, "en") : null;
  // Échéance passée mais réservation encore ouverte (le cron passe toutes les
  // 15 min) : la confirmation est encore acceptée, on le dit.
  const late = deadlinePassed(booking.confirm_deadline_at);

  return (
    <main style={shell}>
      <div style={card}>
        <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
        <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>
          {state === "awaiting" ? "Booking to confirm" : STATES[state].title}
        </h1>
        {state === "awaiting" ? (
          <p style={{ margin: "0 0 20px", color: "#5C7886", fontSize: 14, lineHeight: 1.6 }}>
            A customer booked your offer on crete.direct and paid the deposit online.{" "}
            {deadline
              ? late
                ? `The deadline (${deadline}, Greek time) has passed, but the booking is still open: you can still confirm it.`
                : `Please answer before ${deadline} (Greek time). Without an answer, the booking is released and the customer is refunded.`
              : null}
          </p>
        ) : null}

        <div style={recap}>
          <div><strong>Pick-up:</strong> {booking.pickup_slug ? carPickupLabel(booking.pickup_slug) : "-"}, {formatWallDate(booking.date_from, booking.time_from, "en")}</div>
          <div><strong>Return:</strong> {formatWallDate(booking.date_to, booking.time_to, "en")}</div>
          <div><strong>Car:</strong> {car}</div>
          {insurance.length ? <div><strong>Insurance:</strong> {insurance.join(" · ")}</div> : null}
          <div><strong>Total price:</strong> {formatEur(total, "en")}</div>
          <div><strong>Deposit paid online, kept by crete.direct as its commission:</strong> {formatEur(deposit, "en")}</div>
          <div><strong>To collect at the counter:</strong> {formatEur(rest, "en")}</div>
        </div>

        {state === "awaiting" ? (
          <>
            <ConfirmButtons token={token} states={STATES} />
            <p style={{ margin: "18px 0 0", color: "#5C7886", fontSize: 13, lineHeight: 1.6 }}>
              You receive the customer&apos;s name and phone number by email as soon as you confirm.
            </p>
          </>
        ) : (
          <StateNotice text={STATES[state]} />
        )}
      </div>
    </main>
  );
}
