// Page d'issue de location, PUBLIQUE PAR CONCEPTION : le loueur n'a pas de
// compte, la protection est l'imprévisibilité du jeton (même principe que la
// page devis et la page facture). Servie sous /en uniquement : les loueurs
// sont servis en anglais, un seul canal, une seule langue.
//
// Elle n'écrit RIEN. Le seul bouton poste vers /api/car-rental/outcome, qui
// redirige ici avec ?result=. Sans JavaScript : un <form method="post">.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requestByOutcomeToken } from "@/lib/car-outcome-server";
import { invoiceForRequest } from "@/lib/car-invoice-server";
import { carPickupLabel } from "@/lib/car-lead";
import {
  outcomePageState, shortName, ddmm, OUTCOME_CHOICES, type OutcomeChoice,
} from "@/lib/car-outcome-followup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const shell = { maxWidth: 520, margin: "0 auto", padding: "40px 20px", fontFamily: "'Baloo 2', system-ui, sans-serif", color: "#0B3954" } as const;
const card = { background: "#fff", border: "1px solid #DCE9EE", borderRadius: 20, padding: "26px 24px" } as const;
const notice = { margin: 0, padding: "16px 18px", borderRadius: 12, fontSize: 15, lineHeight: 1.6 } as const;
const option = { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1px solid #DCE9EE", marginBottom: 10, cursor: "pointer" } as const;
const button = { width: "100%", padding: "14px 20px", borderRadius: 999, border: "none", background: "#008C9E", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" } as const;

const day = (iso: string) => new Date(iso).toISOString().slice(0, 10);

export default async function RentalOutcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ choice?: string; result?: string }>;
}) {
  const { locale, token } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const row = await requestByOutcomeToken(token);
  if (!row) notFound();

  const invoice = await invoiceForRequest(row.id);
  const choice = (OUTCOME_CHOICES as readonly string[]).includes(sp.choice ?? "") ? (sp.choice as OutcomeChoice) : null;
  const state = outcomePageState(
    {
      status: row.status,
      outcome: row.outcome,
      outcome_source: row.outcome_source,
      outcome_at: row.outcome_at,
      hasInvoice: Boolean(invoice),
      invoicePaid: Boolean(invoice?.paid_at),
      invoiceCredited: Boolean(invoice?.credited_at),
    },
    sp.result ?? null,
  );
  const openInvoice = invoice && !invoice.paid_at && !invoice.credited_at ? invoice : null;

  return (
    <main style={shell}>
      <h1 style={{ fontSize: 22, margin: "0 0 18px" }}>Did this rental take place?</h1>
      <div style={card}>
        <p style={{ margin: "0 0 4px", fontWeight: 700 }}>
          Rental {row.id} · {ddmm(row.date_from)} to {ddmm(row.date_to)} · {carPickupLabel(row.pickup_slug)}
          {row.quoted_car_model ? ` · ${row.quoted_car_model}` : ""}
        </p>
        <p style={{ margin: "0 0 20px", color: "#5C7886" }}>
          Traveller: {shortName(row.customer_name)} · Price accepted: {Number(row.quoted_price ?? 0).toFixed(2)} EUR
        </p>

        {state.kind === "form" ? (
          <form method="post" action="/api/car-rental/outcome">
            <input type="hidden" name="token" value={token} />
            <label style={option}>
              <input type="radio" name="choice" value="rented" required defaultChecked={choice === "rented"} />
              Yes, it took place
            </label>
            <label style={option}>
              <input type="radio" name="choice" value="lost" required defaultChecked={choice === "lost"} />
              No, it did not happen
            </label>
            {openInvoice ? (
              <p style={{ ...notice, background: "#F6FBFC", marginBottom: 14 }}>
                Invoice {openInvoice.number} ({Number(openInvoice.amount_eur).toFixed(2)} EUR) was issued on the first day of the rental.
                If it did not take place, confirming cancels it by credit note, nothing to pay.
              </p>
            ) : null}
            <button type="submit" style={button}>Confirm</button>
          </form>
        ) : state.kind === "done" ? (
          <p style={{ ...notice, background: "#ECFDF5", color: "#065F46" }}>
            Thank you, recorded: {state.choice === "rented" ? "the rental took place." : "the rental did not take place."}
            {/* Le numéro d'avoir peut manquer (avoir écrit sans numérotation) :
                sans ce garde la phrase se lisait « by credit note , nothing to pay ». */}
            {state.choice === "lost" && invoice?.credited_at
              ? ` Invoice ${invoice.number} is cancelled${invoice.credit_number ? ` by credit note ${invoice.credit_number}` : ""}, nothing to pay.`
              : ""}
            {state.choice === "rented" ? " If a commission is due, the invoice follows by email." : ""}
          </p>
        ) : state.kind === "already_paid" ? (
          <p style={{ ...notice, background: "#FEF9EC", color: "#92400E" }}>
            This invoice is already paid, so it cannot be cancelled here. Reply to hello@crete.direct and we will refund it.
          </p>
        ) : state.kind === "cancelled" ? (
          <p style={{ ...notice, background: "#FEF9EC", color: "#92400E" }}>
            Sorry, this request was cancelled. Nothing to confirm.
          </p>
        ) : (
          <p style={{ ...notice, background: "#F6FBFC" }}>
            Already recorded{state.at ? ` on ${day(state.at)}` : ""}: {state.outcome === "rented" ? "the rental took place." : "the rental did not take place."}
            {state.contested ? " If this is wrong, reply to hello@crete.direct." : ""}
          </p>
        )}
      </div>
    </main>
  );
}
