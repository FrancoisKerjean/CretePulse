import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { CAR_TYPES_DATA } from "@/lib/car-types-data";
import { hashToken } from "@/lib/car-quote";
import { QuoteForm } from "./QuoteForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;

// Page de saisie du prix par le loueur (lien reçu par email, hors login).
export default async function CarQuotePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const { data: row } = await supabase.from("car_requests")
    .select("id, status, pickup_slug, date_from, time_from, date_to, time_to, car_type, pax, note")
    .eq("quote_token_hash", hashToken(token))
    .maybeSingle();

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
  const carTypeLabel = ct?.labels.en ?? row.car_type;

  return (
    <main style={shell}>
      <div style={card}>
        <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
        <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>New rental request</h1>
        <p style={{ margin: "0 0 20px", color: "#5C7886", fontSize: 14, lineHeight: 1.6 }}>
          A customer requested a car through crete.direct. Enter your total price below and it goes straight to them. Referral commission is 10%.
        </p>

        <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "14px 16px", marginBottom: 22, color: "#0B3954", fontSize: 14, lineHeight: 1.8 }}>
          <div><strong>Pickup / drop-off:</strong> {carPickupLabel(row.pickup_slug)}</div>
          <div><strong>Arrival:</strong> {row.date_from}{row.time_from ? ` at ${row.time_from}` : ""}</div>
          <div><strong>Departure:</strong> {row.date_to}{row.time_to ? ` at ${row.time_to}` : ""}</div>
          <div><strong>Car type:</strong> {carTypeLabel}</div>
          <div><strong>People:</strong> {row.pax ?? "-"}</div>
          {row.note ? <div><strong>Note:</strong> {row.note}</div> : null}
        </div>

        {row.status === "quoted" || row.status === "accepted" ? (
          <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#ECFDF5", color: "#065F46", fontSize: 15, lineHeight: 1.6 }}>
            A price was already submitted for this request. Thank you.
          </p>
        ) : (
          <QuoteForm token={token} />
        )}
      </div>
    </main>
  );
}
