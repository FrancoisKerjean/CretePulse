// Page facture, PUBLIQUE PAR CONCEPTION : le loueur n a pas de compte. La
// protection est l imprevisibilite du token, comme pour les pages de devis.
//
// Elle tient lieu de facture : aucun PDF n est genere, le loueur imprime la
// page (Ctrl+P). D ou le bloc @media print plus bas, qui retire le chrome du
// site (header, footer, tab bar mobile, bandeaux) pour ne laisser que la
// facture. Sans lui, le PDF sort avec la navigation du site dessus.
//
// ⛔ TOUTES les mentions legales de cette page sont RECOPIEES de la facture
// validee par le comptable, `docs/facture-novai-luxtrans-2026-003.html`
// (NOVAI-2026-003, Lux Trans IKE). Aucune n a ete redigee ici, et aucune ne doit
// l etre : NovAI est francaise, le loueur est grec, la commission est une
// prestation de services intra-UE autoliquidee par le preneur. La mention
// domestique « VAT not applicable, article 293 B » que portait cette page etait
// fausse sur cette operation.
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { invoiceByToken } from "@/lib/car-invoice-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { carPickupLabel } from "@/lib/car-lead";
import { ratePercentLabel, partnerBillingIdentity, PARTNER_IDENTITY_COLS } from "@/lib/car-invoice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Format du gabarit comptable. Un seul format sur toute la piece : « 68.00 EUR »
// a cote de « €0.00 — reverse charge » se lit comme deux devises.
const EUR = (n: number) => `€${Number(n).toFixed(2)}`;
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
    .select(`name, email, ${PARTNER_IDENTITY_COLS}`)
    .eq("id", invoice.partner_id)
    .maybeSingle();

  const billing = partnerBillingIdentity(partner);

  /**
   * Identite du client incomplete : par construction impossible, la garde du
   * cron refuse de facturer un loueur qui n a pas la sienne. Mais une fiche peut
   * etre videe APRES l emission, et une facture privee du nom, de l adresse ou
   * du numero de TVA de son client n est pas une facture — la mention
   * d autoliquidation n a plus de destinataire identifie.
   *
   * Servir le document ampute mettrait une piece fausse chez une vraie
   * entreprise. Un notFound() nu ferait croire a un lien casse et cacherait la
   * cause. La page dit donc exactement ce qui se passe, ne porte aucune mention
   * fiscale (elles seraient invalides), et ne reclame pas d argent : on ne fait
   * pas payer contre un document qu on ne peut pas emettre.
   */
  if (!billing.ok) {
    console.error("[invoice] identite legale du client incomplete, facture non affichable", {
      invoice: invoice.number,
      partnerId: invoice.partner_id,
      missing: billing.missing,
    });
    return (
      <main className="mx-auto max-w-2xl px-5 py-10 text-night">
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
        <p className="text-xs font-bold uppercase tracking-widest text-lagoon-deep">Invoice</p>
        <h1 className="font-heading text-2xl font-extrabold">{invoice.number}</h1>
        <p className="mt-4 rounded-2xl border border-border bg-surface p-5 text-sm">
          This invoice cannot be issued: the customer details it must carry are missing from our
          records. Nothing is payable on this page. Please reply to the invoice email, or write to
          contact@nov-ai.xyz quoting {invoice.number}, and we will reissue it.
        </p>
      </main>
    );
  }

  const client = billing.identity;

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
  const ratePct = ratePercentLabel(Number(invoice.rate));
  // Le nom commercial n a d interet que s il differe de la raison sociale : le
  // loueur signe ses emails « cretecar.rent », la facture est adressee a la
  // personne morale, et le rapprochement doit se lire sans effort.
  const tradingName =
    partner?.name && partner.name.trim() && partner.name.trim() !== client.legalName
      ? partner.name.trim()
      : null;

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

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-muted">
            Supplier
          </p>
          <p className="font-bold">NovAI</p>
          <p>SAS with a share capital of €50</p>
          <p>Trade register: RCS Brest 994 765 857</p>
          <p>SIRET 99476585700010</p>
          <p>15 Rue Berthollet, 29200 Brest, France</p>
          <p>President: François Camille Kerjean</p>
          <p>contact@nov-ai.xyz</p>
          <p className="mt-2 font-data font-bold">VAT ID · FR45994765857</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-muted">
            Customer
          </p>
          <p className="font-bold">{client.legalName}</p>
          {client.legalForm ? <p>{client.legalForm}</p> : null}
          <p>{client.addressLine}</p>
          <p>
            {client.postalCode} {client.city}, {client.country}
          </p>
          {tradingName ? <p>Trading as {tradingName}</p> : null}
          {partner?.email ? <p className="text-text-muted">{partner.email}</p> : null}
          <p className="mt-2 font-data font-bold">VAT ID · {client.vatId}</p>
        </div>
      </section>

      <table className="mb-2 w-full text-sm">
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2">
              Commission on rental {invoice.request_id}
              {req ? ` · ${req.date_from} → ${req.date_to}` : ""}
              {pickup ? ` · ${pickup}` : ""}
              <br />
              <span className="text-text-muted">
                {EUR(invoice.base_amount_eur)} quoted and accepted · {ratePct}%
              </span>
            </td>
            <td className="py-2 text-right font-bold">{EUR(invoice.amount_eur)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">Total excluding VAT</td>
            <td className="py-2 text-right">{EUR(invoice.amount_eur)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-2">VAT</td>
            <td className="py-2 text-right">€0.00 — reverse charge</td>
          </tr>
          <tr>
            <td className="py-2 font-bold">Total due</td>
            <td className="py-2 text-right font-extrabold">{EUR(invoice.amount_eur)}</td>
          </tr>
        </tbody>
      </table>

      {/* Mention d autoliquidation, recopiee du gabarit comptable. */}
      {/* Bordure ET fond : `bg-surface` seul se confond avec le fond de page, la
          mention flottait au milieu de rien (defaut vu sur la planche). */}
      <p className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 text-xs italic leading-relaxed text-text-muted">
        {
          "VAT reverse charge. The supply of services is located in the customer's member state under Article 44 of Council Directive 2006/112/EC; VAT is to be accounted for by the recipient under Article 196 of the same Directive."
        }
        <br />
        <span className="not-italic">
          Autoliquidation par le preneur — article 283-2 du CGI et article 196 de la directive
          2006/112/CE.
        </span>
      </p>

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

      <footer className="space-y-2 text-xs leading-relaxed text-text-muted">
        <p>
          <span className="font-bold">VAT identification.</span>{" "}
          {/* ⛔ La phrase VIES n est imprimee QUE si une verification a
              reellement eu lieu et a ete datee sur la fiche loueur : affirmer une
              verification qui n a pas eu lieu serait un mensonge sur une piece
              comptable. Le reste de la mention, lui, ne depend d aucun controle. */}
          {client.vatVerifiedAt ? (
            <>
              Both VAT numbers shown above were verified against the European Commission VIES
              database on {client.vatVerifiedAt} and returned as valid.{" "}
            </>
          ) : null}
          NovAI applies the French small business VAT exemption (article 293 B of the French Tax
          Code) to its domestic transactions; the present supply is an intra-Community supply of
          services and falls outside the scope of French VAT.
        </p>
        <p>
          <span className="font-bold">Late payment.</span> In accordance with articles L441-10 and
          D441-5 of the French Commercial Code, late payment gives rise to penalties calculated at
          three times the French legal interest rate, plus a fixed recovery indemnity of €40, with
          no reminder required. No discount is granted for early payment.
        </p>
        <p>
          <span className="font-bold">Commission.</span> {ratePct}% of the rental value, payable per
          completed introduction, as set out in the crete.direct partner terms accepted by the
          customer. crete.direct is a trading name operated by SAS NovAI.
        </p>
        <p className="pt-2 text-center italic">
          NovAI SAS — Simplified joint-stock company — RCS Brest 994 765 857 — Share capital €50 —
          Registered office: 15 Rue Berthollet, 29200 Brest, France
        </p>
      </footer>
    </main>
  );
}
