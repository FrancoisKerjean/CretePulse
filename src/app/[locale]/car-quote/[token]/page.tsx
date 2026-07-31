import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel, carTypeLabelWithExamples } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { hashToken } from "@/lib/car-quote";
import { rentalDays } from "@/lib/car-pricing";
import { childSeatLabels } from "@/lib/car-child-seats";
import { QuoteForm } from "./QuoteForm";

const INSURANCE_LABEL: Record<string, string> = { full: "Full insurance (all-risk)", basic: "Basic insurance" };
const PAYMENT_LABEL: Record<string, string> = { cash: "Cash", card: "Card" };
const GEARBOX_LABEL: Record<string, string> = { automatic: "Automatic", manual: "Manual" };

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;

// Page de saisie du prix par le loueur (lien reçu par email, hors login).
export default async function CarQuotePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  // Le jeton pointe une invitation (un par loueur) → on charge la demande.
  const { data: invite } = await supabase.from("car_quote_invites")
    .select("request_id, status, partner_id")
    .eq("quote_token_hash", hashToken(token))
    .maybeSingle();
  const { data: row } = invite
    ? await supabase.from("car_requests")
        .select("id, status, pickup_slug, date_from, time_from, date_to, time_to, car_type, pax, note, insurance, payment_method, gearbox, child_seats")
        .eq("id", invite.request_id).maybeSingle()
    : { data: null };

  // Défauts d'assurance du loueur → pré-remplissage du formulaire (ex. Panagoula :
  // cdw_excess / 500 €). Il envoie alors son prix en un clic sans re-saisir.
  const { data: partnerDefaults } = invite
    ? await supabase.from("car_partners")
        .select("default_insurance_type, default_excess_eur, default_zero_excess_upsell_eur_day")
        .eq("id", invite.partner_id).maybeSingle()
    : { data: null };

  if (!row) {
    return (
      <main style={shell}>
        <div style={card}>
          <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#0B3954" }}>Link expired</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>
            This price request has already been submitted or is no longer valid.
          </p>
        </div>
      </main>
    );
  }

  const ct = CAR_TYPES_DATA.find((c) => c.id === row.car_type);
  const carTypeLabel = carTypeLabelWithExamples(ct, "en", row.car_type);
  // Les dates etaient affichees, la duree non : le loueur devait la calculer de
  // tete pour convertir son tarif journalier en total. C'est ce calcul implicite
  // qui a produit un devis de 2 jours envoye sur une demande de 7 (30/07/2026).
  const days = rentalDays(row.date_from, row.date_to);

  return (
    <main style={shell}>
      <div style={card}>
        <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
        <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>New rental request</h1>
        <p style={{ margin: "0 0 20px", color: "#5C7886", fontSize: 14, lineHeight: 1.6 }}>
          A customer requested a car through crete.direct. Enter your total price for the whole period below: it goes straight to them as a firm price for these dates, so please check them before sending. Referral commission is 10%.
        </p>

        <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "14px 16px", marginBottom: 22, color: "#0B3954", fontSize: 14, lineHeight: 1.8 }}>
          <div><strong>Pickup / drop-off:</strong> {carPickupLabel(row.pickup_slug)}</div>
          <div><strong>Arrival:</strong> {row.date_from}{row.time_from ? ` at ${row.time_from}` : ""}</div>
          <div><strong>Departure:</strong> {row.date_to}{row.time_to ? ` at ${row.time_to}` : ""}</div>
          <div><strong>Duration:</strong> {days} {days > 1 ? "days" : "day"}</div>
          <div><strong>Car type:</strong> {carTypeLabel}</div>
          <div><strong>People:</strong> {row.pax ?? "-"}</div>
          {row.insurance && INSURANCE_LABEL[row.insurance] ? <div><strong>Insurance:</strong> {INSURANCE_LABEL[row.insurance]}</div> : null}
          {row.payment_method && PAYMENT_LABEL[row.payment_method] ? <div><strong>Payment:</strong> {PAYMENT_LABEL[row.payment_method]}</div> : null}
          {row.gearbox && GEARBOX_LABEL[row.gearbox] ? <div><strong>Gearbox:</strong> {GEARBOX_LABEL[row.gearbox]}</div> : null}
          {Array.isArray(row.child_seats) && row.child_seats.length ? <div><strong>Child seats:</strong> {childSeatLabels(row.child_seats as string[], "en").join(", ")}</div> : null}
          {row.note ? <div><strong>Note:</strong> {row.note}</div> : null}
        </div>

        {row.status === "accepted" || row.status === "declined_by_client" ? (
          <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#F1F5F9", color: "#334155", fontSize: 15, lineHeight: 1.6 }}>
            This request is now closed. Thank you.
          </p>
        ) : (
          <>
            {invite?.status === "quoted" ? (
              <p style={{ margin: "0 0 16px", padding: "12px 16px", borderRadius: 12, background: "#ECFDF5", color: "#065F46", fontSize: 14, lineHeight: 1.6 }}>
                You already sent an offer for this request. You can send more options or update it below · your new submission replaces the previous one.
              </p>
            ) : null}
            <QuoteForm token={token} locale={locale} days={days}
              defaultInsuranceType={partnerDefaults?.default_insurance_type ?? null}
              defaultExcessEur={partnerDefaults?.default_excess_eur ?? null}
              defaultZeroExcessUpsellEurDay={partnerDefaults?.default_zero_excess_upsell_eur_day ?? null}
            />
          </>
        )}
      </div>
    </main>
  );
}
