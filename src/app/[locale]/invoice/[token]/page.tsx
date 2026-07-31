// Page facture, PUBLIQUE PAR CONCEPTION : le loueur n a pas de compte. La
// protection est l imprevisibilite du token, comme pour les pages de devis.
//
// Elle tient lieu de facture : aucun PDF n est genere, le loueur imprime la
// page (Ctrl+P). D ou le bloc @media print plus bas, qui retire le chrome du
// site (header, footer, tab bar mobile, bandeaux) pour ne laisser que la
// facture. Sans lui, le PDF sort avec la navigation du site dessus.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { invoiceByToken } from "@/lib/car-invoice-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { ratePercentLabel } from "@/lib/car-invoice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const EUR = (n: number) => `${Number(n).toFixed(2)} EUR`;
const day = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/**
 * Coordonnees bancaires, lues de l environnement et de NULLE PART ailleurs :
 * aucun IBAN ne vit dans le depot. Les deux valeurs vont ensemble, un IBAN sans
 * BIC n est pas un virement executable — moitie de coordonnees affichee comme
 * si elle etait complete ferait rater le paiement. Absentes, la page garde son
 * texte de repli et l echange se fait par email.
 */
function bankDetails(): { iban: string; bic: string } | null {
  const iban = (process.env.NOVAI_IBAN ?? "").trim();
  const bic = (process.env.NOVAI_BIC ?? "").trim();
  return iban && bic ? { iban, bic } : null;
}

// Le chrome du site est enfant direct de <body>, la facture est le <main> :
// tout ce qui n est pas le main disparait a l impression.
const PRINT_CSS = `@media print {
  body > *:not(main) { display: none !important; }
  main { max-width: none; padding: 0; }
  a[href]:after { content: none !important; }
}`;

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const invoice = await invoiceByToken(token);
  if (!invoice) notFound();

  const { data: partner } = await supabaseAdmin
    .from("car_partners")
    .select("name, email")
    .eq("id", invoice.partner_id)
    .maybeSingle();

  const { data: req } = await supabaseAdmin
    .from("car_requests")
    .select("date_from, date_to, pickup_slug, outcome")
    .eq("id", invoice.request_id)
    .maybeSingle();

  const pickup = req?.pickup_slug ? carPickupLabel(req.pickup_slug as string) : "";
  // Ordre du plus informe au moins informe : l avoir porte un numero de piece,
  // le paiement une date, la location annulee n a que son motif. Le bouton
  // « Perdu » du back-office n emet aucun avoir, mais il doit couper le
  // paiement : sinon le lien deja parti par email encaisse une location qui n a
  // pas eu lieu.
  const state = invoice.credited_at
    ? "credited"
    : invoice.paid_at
      ? "paid"
      : req?.outcome === "lost"
        ? "lost"
        : "due";
  const bank = bankDetails();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-night">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-lagoon-deep">Invoice</p>
        <h1 className="font-heading text-2xl font-extrabold">{invoice.number}</h1>
        <p className="text-sm text-text-muted">
          Issued {day(invoice.issued_at)} · payment due on receipt
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-border bg-white p-5 text-sm">
        <p className="font-bold">SAS NovAI</p>
        <p>15 rue Berthollet, 29200 Brest, France</p>
        <p>SIREN 994 765 857 · VAT FR45994765857</p>
        <p className="mt-3 text-text-muted">Billed to</p>
        <p className="font-bold">{partner?.name}</p>
        {partner?.email ? <p className="text-text-muted">{partner.email}</p> : null}
      </section>

      <table className="mb-6 w-full text-sm">
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2">
              Commission on rental {invoice.request_id}
              {req ? ` · ${req.date_from} → ${req.date_to}` : ""}
              {pickup ? ` · ${pickup}` : ""}
              <br />
              <span className="text-text-muted">
                {EUR(invoice.base_amount_eur)} quoted and accepted ·{" "}
                {ratePercentLabel(Number(invoice.rate))}%
              </span>
            </td>
            <td className="py-2 text-right font-bold">{EUR(invoice.amount_eur)}</td>
          </tr>
          <tr>
            <td className="py-2 font-bold">Total due</td>
            <td className="py-2 text-right font-extrabold">{EUR(invoice.amount_eur)}</td>
          </tr>
        </tbody>
      </table>

      {state === "due" && (
        <form action="/api/car-rental/commission/checkout" method="post" className="mb-6">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-xl bg-lagoon-deep px-5 py-3 font-bold text-white"
          >
            Pay {EUR(invoice.amount_eur)} by card
          </button>
        </form>
      )}
      {state === "paid" && (
        <p className="mb-6 rounded-xl bg-ok/10 px-5 py-3 font-bold text-ok">
          Paid on {day(invoice.paid_at as string)}. Nothing left to do.
        </p>
      )}
      {state === "lost" && (
        <p className="mb-6 rounded-xl border border-border bg-surface px-5 py-3 font-bold text-text-muted">
          This rental was cancelled. Nothing to pay.
        </p>
      )}
      {state === "credited" && (
        <p className="mb-6 rounded-xl border border-border bg-surface px-5 py-3 font-bold text-text-muted">
          Cancelled by credit note {invoice.credit_number}. Nothing to pay.
        </p>
      )}

      {/* Uniquement quand il reste quelque chose a payer : expliquer le virement
          a un loueur deja regle, ou dont la facture est annulee, c'est du bruit
          qui contredit le bandeau juste au-dessus. Defaut vu sur la planche. */}
      {state === "due" && (
        <section className="mb-6 rounded-2xl border border-border bg-surface p-5 text-sm">
          <p className="mb-2 font-bold">Bank transfer</p>
          {bank ? (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-text-muted">Account holder</dt>
                <dd className="font-bold">SAS NovAI</dd>
                <dt className="text-text-muted">IBAN</dt>
                <dd className="font-data font-bold">{bank.iban}</dd>
                <dt className="text-text-muted">BIC</dt>
                <dd className="font-data font-bold">{bank.bic}</dd>
              </dl>
              <p className="mt-2 text-text-muted">
                Always use the reference {invoice.number}.
              </p>
            </>
          ) : (
            <p className="text-text-muted">
              Prefer a transfer? Reply to the invoice email and we send you the bank details. Always
              use the reference {invoice.number}.
            </p>
          )}
        </section>
      )}

      <footer className="text-xs leading-relaxed text-text-muted">
        <p>VAT not applicable, article 293 B of the French General Tax Code.</p>
        <p>
          Late payment gives rise to penalties at three times the French legal interest rate plus a
          fixed recovery indemnity of 40 EUR, with no reminder required (articles L441-10 and D441-5
          of the French Commercial Code). No discount for early payment.
        </p>
      </footer>
    </main>
  );
}
