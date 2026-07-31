// Logique pure de la facturation de commission : aucune I/O, aucun acces base.
// Tout ce qui decide « faut-il facturer cette ligne » vit ici pour etre teste
// sans Supabase ni Stripe.
import { STRIPE_MIN_CHARGE_EUR } from "./car-commission";

export interface InvoiceCandidate {
  id: number;
  accepted_at: string | null;
  outcome: string | null;
  date_from: string;
  booking_paid_at: string | null;
  quoted_by_partner_id: number | null;
  quoted_price: number | null;
}

/**
 * `today` et `start` sont des dates ISO `YYYY-MM-DD`. La comparaison est
 * lexicographique, exacte sur ce format, et sans fuseau : la date de depart est
 * une date civile, pas un instant.
 */
export function isInvoiceable(r: InvoiceCandidate, today: string, start: string): boolean {
  if (!r.accepted_at) return false;
  // Une demande deja tranchee ne se refacture pas, et surtout ne se ressuscite pas.
  if (r.outcome !== null) return false;
  if (r.booking_paid_at) return false;
  if (r.quoted_by_partner_id == null) return false;
  if (r.quoted_price == null || r.quoted_price <= 0) return false;
  if (r.date_from < start) return false;
  // `<=` et non `=` : le cron est son propre rattrapage.
  return r.date_from <= today;
}

export interface InvoiceAmounts {
  base: number;
  rate: number;
  amount: number;
}

/** Rend null quand la commission tombe sous le minimum encaissable par Stripe. */
export function invoiceAmounts(base: number, rate: number): InvoiceAmounts | null {
  const amount = Math.round(base * rate * 100) / 100;
  if (amount < STRIPE_MIN_CHARGE_EUR) return null;
  return { base, rate, amount };
}

/**
 * L avoir porte le numero de sa facture suffixe `-A`. Il ne consomme donc pas
 * la serie : le rapprochement facture/avoir se lit a l oeil, et un trou dans la
 * numerotation des factures ne peut pas apparaitre a cause d un avoir.
 */
export function creditNumberFor(invoiceNumber: string): string {
  return `${invoiceNumber}-A`;
}

/**
 * Taux de commission en pourcentage, tel qu il s imprime sur la facture.
 *
 * ⛔ JAMAIS d arrondi a l entier : `toFixed(0)` transformait 7,5 % en « 8% », et
 * `base × 8 %` ne redonne pas le total imprime juste en dessous. Sur une piece
 * comptable, deux nombres qui ne se recoupent pas, c est une contestation.
 *
 * Un taux entier reste ecrit sans decimale (« 10% »), un taux fractionnaire
 * montre la sienne (« 7.5% »). L arrondi au dix-millieme absorbe le bruit du
 * flottant : `rate` nait d une division (amount / base), et 0.1 × 100 vaut
 * 10.000000000000002 en JS.
 */
export function ratePercentLabel(rate: number): string {
  const pct = Math.round(Number(rate) * 1e6) / 1e4;
  return Number.isFinite(pct) ? String(pct) : "0";
}

/** Colonnes de `car_commission_invoices` dont le back-office a besoin. */
export interface AdminInvoiceRow {
  number: string;
  sent_at: string | null;
  paid_at: string | null;
  credited_at: string | null;
  credit_number: string | null;
}

export interface AdminInvoiceState {
  number: string;
  /** Etat lu d un coup d oeil : ou en est l argent sur cette facture. */
  label: string;
  /**
   * `alert` = envoi jamais parti. C est le SEUL etat qui appelle une action :
   * la facture existe, numerotee, et le cron ne repassera jamais dessus.
   */
  tone: "alert" | "due" | "ok" | "muted";
  canResend: boolean;
  canCredit: boolean;
}

const adminDay = (iso: string): string =>
  new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Athens" });

/**
 * Etat d une facture de commission vu du back-office, et ce qui reste cliquable
 * dessus. Pur, donc teste : un bouton qui s affiche alors que l action le
 * refusera est un mensonge d interface, et un bouton absent alors que l action
 * marcherait est un rattrapage perdu.
 *
 * Les deux gestes ferment sur les MEMES conditions que leurs actions serveur :
 * `resendCommissionInvoice` et `creditCommissionInvoice` refusent toutes deux
 * `already_paid` et `already_credited`.
 */
export function invoiceAdminState(
  invoice: AdminInvoiceRow | null | undefined,
): AdminInvoiceState | null {
  if (!invoice) return null;
  const base = { number: invoice.number, canResend: false, canCredit: false };

  // L etat le plus terminal gagne : une facture avoiree ne se renvoie pas, meme
  // si la base porte aussi un paiement.
  if (invoice.credited_at) {
    return {
      ...base,
      tone: "muted",
      label: `annulée par l'avoir ${invoice.credit_number ?? "(numéro manquant)"}`,
    };
  }
  if (invoice.paid_at) {
    return { ...base, tone: "ok", label: `payée le ${adminDay(invoice.paid_at)}` };
  }
  if (!invoice.sent_at) {
    return { ...base, tone: "alert", label: "jamais envoyée", canResend: true, canCredit: true };
  }
  return {
    ...base,
    tone: "due",
    label: `envoyée le ${adminDay(invoice.sent_at)}`,
    canResend: true,
    canCredit: true,
  };
}

// ── Identite de facturation du loueur ────────────────────────────────────────

/** Colonnes d identite legale de `car_partners`, telles que la base les rend. */
export interface PartnerLegalRow {
  /** Nom commercial, deja present avant l identite legale. Jamais une raison sociale. */
  name?: string | null;
  legal_name?: string | null;
  legal_form?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  vat_id?: string | null;
  /** Date de la verification VIES, quand elle a REELLEMENT eu lieu. */
  vat_verified_at?: string | null;
}

export interface BillingIdentity {
  legalName: string;
  /** Optionnelle : imprimee si connue, tue sinon. */
  legalForm: string | null;
  addressLine: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
  vatVerifiedAt: string | null;
}

export type BillingIdentityResult =
  | { ok: true; identity: BillingIdentity }
  | { ok: false; missing: string[] };

/**
 * Champs SANS lesquels aucune facture ne peut etre emise, dans l ordre ou le
 * bloc client les imprime.
 *
 * ⛔ `vat_id` est le champ pivot : NovAI est francaise, le loueur est grec, donc
 * la commission est une prestation de services intra-UE autoliquidee par le
 * preneur. La mention d autoliquidation n a aucun sens sans le numero de TVA du
 * client, et la declaration europeenne de services ne peut pas etre deposee sans
 * lui.
 *
 * Les quatre lignes d adresse suivent la meme logique : le nom et l adresse
 * COMPLETE du client sont des mentions obligatoires de toute facture. Une
 * adresse amputee de sa ville ou de son code postal n identifie pas le preneur.
 *
 * ⛔ `legal_form` n est PAS dans cette liste, et c est deliberé : la forme
 * juridique est le plus souvent deja portee par la raison sociale (« Lux Trans
 * IKE »), aucune mention obligatoire n en depend, et l exiger bloquerait la
 * facturation d un loueur parfaitement identifie. Meme raisonnement pour
 * `vat_verified_at`, qui date une verification VIES et ne conditionne pas la
 * conformite de la piece.
 */
const REQUIRED_BILLING_FIELDS = [
  "legal_name",
  "address_line",
  "postal_code",
  "city",
  "country",
  "vat_id",
] as const;

const trimmed = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Forme d un identifiant TVA intracommunautaire : deux lettres de pays, puis 6 a
 * 13 caracteres alphanumeriques dont AU MOINS SIX CHIFFRES (EL801122501,
 * FR45994765857, IE1234567FA, NL123456789B01).
 *
 * Le plancher de six chiffres n est pas decoratif : sans lui, « a demander »
 * devient « ADEMANDER » une fois les espaces retires, et passe pour un numero.
 * Aucun identifiant TVA de l Union n a un corps sans chiffres.
 *
 * ⛔ Ce n est PAS une validation VIES, et ca ne pretend pas l etre : le seul but
 * est d ecarter le fourre-tout saisi a la place du numero (« N/A », « - », un
 * numero grec sans son prefixe). Une facture qui PORTE une mention
 * d autoliquidation avec un identifiant inexploitable est pire qu une facture
 * jamais emise. La verification VIES reste un geste humain, trace par
 * `vat_verified_at`.
 */
const VAT_ID_SHAPE = /^[A-Z]{2}(?=(?:[A-Z0-9]*\d){6})[A-Z0-9]{6,13}$/;

const normalizeVatId = (v: unknown): string => trimmed(v).replace(/\s+/g, "").toUpperCase();

/**
 * Identite de facturation d un loueur : soit elle est complete, soit elle dit ce
 * qui manque. Pure, donc verifiable sans base.
 *
 * ⛔ Appelee AVANT toute ecriture par le cron de facturation : une ligne dont le
 * loueur est incomplet doit sortir du lot sans avoir bascule en « rented »,
 * sinon le filtre d idempotence la retire definitivement et la location ne sera
 * jamais facturee, meme une fois la fiche remplie.
 */
export function partnerBillingIdentity(
  partner: PartnerLegalRow | null | undefined,
): BillingIdentityResult {
  const p = partner ?? {};
  const vatId = normalizeVatId(p.vat_id);

  const missing = REQUIRED_BILLING_FIELDS.filter((field) =>
    field === "vat_id" ? !VAT_ID_SHAPE.test(vatId) : !trimmed(p[field]),
  );
  if (missing.length > 0) return { ok: false, missing: [...missing] };

  return {
    ok: true,
    identity: {
      legalName: trimmed(p.legal_name),
      legalForm: trimmed(p.legal_form) || null,
      addressLine: trimmed(p.address_line),
      postalCode: trimmed(p.postal_code),
      city: trimmed(p.city),
      country: trimmed(p.country),
      vatId,
      vatVerifiedAt: trimmed(p.vat_verified_at) || null,
    },
  };
}

/** Colonnes a selectionner partout ou l identite de facturation est requise. */
export const PARTNER_IDENTITY_COLS =
  "legal_name, legal_form, address_line, postal_code, city, country, vat_id, vat_verified_at";

export interface CreditMail {
  creditNumber: string;
  number: string;
  partnerName: string;
  amountEur: number;
  reason: string;
}

export function creditMailBody(m: CreditMail): string {
  return [
    `Hi ${m.partnerName},`,
    ``,
    `Credit note ${m.creditNumber} cancels invoice ${m.number} in full (${m.amountEur.toFixed(2)} EUR).`,
    `Reason: ${m.reason}.`,
    ``,
    `There is nothing to pay for this rental.`,
  ].join("\n");
}
