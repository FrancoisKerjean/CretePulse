import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/car-quote";
import { canPartnerQuote } from "@/lib/activity-quotes";
import { categoryLabel, cityLabel } from "@/lib/activity-taxonomy";
import { QuoteForm } from "./QuoteForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 480, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;

const TIMESLOT_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  flexible: "Flexible",
};

// Page de saisie du prix par le prestataire activité (lien reçu par email, hors login).
// IMPORTANT anonymat : aucune colonne customer_* n'est sélectionnée ici.
export default async function ActivityQuotePage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  // Le jeton pointe une invitation (une par prestataire) → on charge la demande.
  const { data: invite } = await supabase.from("activity_quote_invites")
    .select("request_id, status")
    .eq("quote_token_hash", hashToken(token))
    .maybeSingle();
  const { data: row } = invite
    ? await supabase.from("activity_requests")
        .select("id, status, locale, category_slug, city, activity_date, timeslot, adults, children, preferred_language, note")
        .eq("id", invite.request_id).maybeSingle()
    : { data: null };

  if (!row) {
    return (
      <main style={shell}>
        <div style={card}>
          <h1 style={{ margin: "0 0 8px", fontSize: 20, color: "#0B3954" }}>Link expired or invalid</h1>
          <p style={{ margin: 0, color: "#5C7886", fontSize: 15, lineHeight: 1.6 }}>
            This price request has already been submitted or is no longer valid.
          </p>
        </div>
      </main>
    );
  }

  const cat = categoryLabel(row.category_slug as string, "en");
  const city = cityLabel(row.city as string, "en");
  const groupParts: string[] = [];
  if (row.adults) groupParts.push(`${row.adults} adult${row.adults > 1 ? "s" : ""}`);
  if (row.children) groupParts.push(`${row.children} child${(row.children as number) > 1 ? "ren" : ""}`);
  const groupLabel = groupParts.join(", ") || "—";

  return (
    <main style={shell}>
      <div style={card}>
        <p style={{ margin: "0 0 4px", color: "#008C9E", fontSize: 13, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>crete · direct</p>
        <h1 style={{ margin: "0 0 6px", fontSize: 21, color: "#0B3954" }}>New activity request</h1>
        <p style={{ margin: "0 0 20px", color: "#5C7886", fontSize: 14, lineHeight: 1.6 }}>
          A customer requested an activity through crete.direct. Enter your total price below and it goes straight to them. Referral commission is 10%.
        </p>

        <div style={{ background: "#F6FBFC", border: "1px solid #DCE9EE", borderRadius: 14, padding: "14px 16px", marginBottom: 22, color: "#0B3954", fontSize: 14, lineHeight: 1.8 }}>
          <div><strong>Category:</strong> {cat}</div>
          <div><strong>City:</strong> {city}</div>
          <div><strong>Date:</strong> {row.activity_date as string}</div>
          {row.timeslot && TIMESLOT_LABELS[row.timeslot as string] ? <div><strong>Timeslot:</strong> {TIMESLOT_LABELS[row.timeslot as string]}</div> : null}
          <div><strong>Group:</strong> {groupLabel}</div>
          {row.preferred_language ? <div><strong>Preferred guide language:</strong> {(row.preferred_language as string).toUpperCase()}</div> : null}
          {row.note ? <div><strong>Note:</strong> {row.note as string}</div> : null}
        </div>

        {row.status === "accepted" || row.status === "declined_by_client" ? (
          <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#F1F5F9", color: "#334155", fontSize: 15, lineHeight: 1.6 }}>
            This request is now closed. Thank you.
          </p>
        ) : !canPartnerQuote(row.status as string) ? (
          <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#F1F5F9", color: "#334155", fontSize: 15, lineHeight: 1.6 }}>
            This request is no longer accepting new quotes.
          </p>
        ) : invite?.status === "quoted" ? (
          <p style={{ margin: 0, padding: "16px 18px", borderRadius: 12, background: "#ECFDF5", color: "#065F46", fontSize: 15, lineHeight: 1.6 }}>
            Your price was submitted for this request. Thank you. We will connect you if the customer chooses your offer.
          </p>
        ) : (
          <QuoteForm token={token} locale={locale} />
        )}
      </div>
    </main>
  );
}
