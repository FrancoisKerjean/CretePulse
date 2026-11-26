// Facture de commission réglée par compensation (spec 2026-11-25, sections 6 et 11).
//
// L'acompte payé en ligne PAR LE CLIENT EST la commission de la plateforme. Le
// jour de la prise, le loueur reçoit donc une facture déjà marquée réglée par
// compensation avec cet acompte : aucune demande de paiement.
//
// ⛔ Une facture est une pièce comptable. Le numéro n'est demandé qu'à la
// création (createInvoiceForRequest réutilise l'existante), et `sent_at` est le
// verrou d'envoi : au plus un e-mail par facture, une facture à moitié faite
// (créée, jamais envoyée) est terminée le lendemain sans second numéro.
import { supabaseAdmin } from "./supabase-admin";
import {
  invoiceForRequest, createInvoiceForRequest, markInvoicePaid, markInvoiceSent,
  rotateInvoiceToken, assertWritten,
} from "./car-invoice-server";
import { partnerBillingIdentity, ratePercentLabel, PARTNER_IDENTITY_COLS } from "./car-invoice";
import { depositMail, type DepositMailData } from "./car-deposit-mail";
import { ensurePortalToken } from "./car-catalogue-db";
import { siteBase } from "./car-quote";
import { carPickupLabel } from "./car-lead";
import { notifyOps, echeance } from "./ops-notify";

const REQUEST_COLS =
  "id, booking_status, date_from, date_to, pickup_slug, quoted_car_model, car_type, quoted_price, deposit_eur, deposit_rate, quoted_by_partner_id, booking_paid_at";

interface DepositRequest {
  id: number;
  booking_status: string;
  date_from: string;
  date_to: string;
  pickup_slug: string | null;
  quoted_car_model: string | null;
  car_type: string | null;
  quoted_price: number | null;
  deposit_eur: number | null;
  deposit_rate: number | null;
  quoted_by_partner_id: number | null;
  booking_paid_at: string | null;
}

// SHORTCUT: au plus 100 demandes par passe, dans une fenêtre de prise de 45 jours
// (la jointure « sans facture ou facture non envoyée » se filtre ici, PostgREST ne
// fait pas d'anti-jointure). Plafond : 100 réservations avec acompte sur 45 jours.
// Déclencheur : 60 réservations par fenêtre, passer le filtre en RPC SQL.
const MAX_PER_RUN = 100;
const WINDOW_DAYS = 45;

/** Jour civil ISO décalé de n jours (calcul en UTC sur une date sans heure). */
const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Champs obligatoires de DepositMailData que ces deux e-mails ne lisent pas. */
const BLANK: Omit<DepositMailData, "partnerName"> = {
  carLabel: "", pickupLabel: "", dateFrom: "", timeFrom: null, dateTo: "", timeTo: null, totalEur: 0, depositEur: 0,
};

async function alertOps(title: string, lines: string[]): Promise<void> {
  try {
    await notifyOps({ title, lines, action: "Vérifier puis relancer le cron", due: echeance(1) });
  } catch (e) {
    console.error("[car/deposit-invoice] notification d'exploitation échouée", e);
  }
}

async function invoiceOne(row: DepositRequest): Promise<"done" | "skipped"> {
  // Reprise : une facture envoyée ou avoirée n'a plus rien à faire ici.
  const existing = await invoiceForRequest(row.id);
  if (existing && (existing.credited_at || existing.sent_at)) return "skipped";

  if (!row.quoted_by_partner_id) throw new Error("loueur inconnu");
  if (row.quoted_price == null || row.deposit_rate == null || row.deposit_eur == null) {
    throw new Error("montants de l'acompte absents");
  }

  const { data: partner, error: pErr } = await supabaseAdmin
    .from("car_partners")
    .select(`name, email, ${PARTNER_IDENTITY_COLS}`)
    .eq("id", row.quoted_by_partner_id)
    .maybeSingle();
  if (pErr) throw new Error(`lecture du loueur refusée: ${pErr.message}`);
  if (!partner?.email) throw new Error("loueur sans e-mail");
  // Avant toute écriture : sans identité complète la page facture ne s'affiche pas,
  // et un numéro serait consommé pour une pièce inenvoyable.
  const billing = partnerBillingIdentity(partner as never);
  if (!billing.ok) throw new Error(`identité légale du loueur incomplète: ${billing.missing.join(", ")}`);

  const created = await createInvoiceForRequest({
    requestId: row.id,
    partnerId: row.quoted_by_partner_id,
    base: row.quoted_price,
    rate: row.deposit_rate,
    amount: row.deposit_eur,
  });
  const invoice = created.invoice;
  if (invoice.credited_at) return "skipped";

  const { error: sErr } = await supabaseAdmin
    .from("car_commission_invoices")
    .update({ settlement: "deposit_compensation" })
    .eq("id", invoice.id)
    .select();
  assertWritten("settlement", invoice.id, sErr);
  await markInvoicePaid(row.id);

  // Le jeton n'est lisible qu'à la création : un lien déjà perdu se refait.
  const token = created.token ?? (await rotateInvoiceToken(invoice.id));

  const mail = depositMail(
    "partner_invoice",
    {
      ...BLANK,
      partnerName: partner.name as string,
      pickupLabel: row.pickup_slug ? carPickupLabel(row.pickup_slug) : "",
      dateFrom: row.date_from,
      dateTo: row.date_to,
      // Montants LUS de la facture, jamais recalculés.
      invoice: {
        number: invoice.number,
        url: `${siteBase()}/en/invoice/${token}`,
        baseEur: Number(invoice.base_amount_eur),
        ratePct: ratePercentLabel(Number(invoice.rate)),
        commissionEur: Number(invoice.amount_eur),
        depositPaidOn: (row.booking_paid_at ?? invoice.issued_at).slice(0, 10),
      },
    },
    "en",
  );
  const sent = await sendMail(partner.email as string, mail);
  // sent_at reste nul : le passage de demain renverra, une seule fois.
  if (!sent) throw new Error("envoi de la facture refusé");
  await markInvoiceSent(invoice.id);
  return "done";
}

async function sendMail(to: string, mail: { subject: string; html: string }): Promise<boolean> {
  const { sendCarDepositMail } = await import("./email");
  return sendCarDepositMail(to, mail);
}

export async function runDepositInvoicePass(todayIso: string): Promise<{ invoiced: number; failed: number[] }> {
  const { data, error } = await supabaseAdmin
    .from("car_requests")
    .select(REQUEST_COLS)
    .in("booking_status", ["confirmed", "cancelled_kept"])
    .lte("date_from", todayIso)
    .gte("date_from", addDays(todayIso, -WINDOW_DAYS))
    .order("date_from", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) {
    console.error("[car/deposit-invoice] lecture refusée", { error: error.message });
    await alertOps("Facturation des acomptes : lecture refusée", [error.message]);
    return { invoiced: 0, failed: [] };
  }

  let invoiced = 0;
  const failed: number[] = [];
  const reasons: string[] = [];
  for (const row of (data ?? []) as DepositRequest[]) {
    try {
      if ((await invoiceOne(row)) === "done") invoiced++;
    } catch (e) {
      failed.push(row.id);
      const msg = e instanceof Error ? e.message : String(e);
      reasons.push(`demande ${row.id} : ${msg}`);
      console.error("[car/deposit-invoice] échec", { requestId: row.id, error: msg });
    }
  }
  if (failed.length > 0) {
    await alertOps(`Facture de commission non terminée (${failed.length})`, reasons);
  }
  return { invoiced, failed };
}

// ── Rappel d'échéance de grille (spec section 6) ────────────────────────────

const REMINDER_DAYS = 30;

export async function runRatesExpiryReminderPass(todayIso: string): Promise<{ reminded: number }> {
  const { data: partners, error } = await supabaseAdmin
    .from("car_partners")
    .select("id, name, email")
    .eq("rates_status", "live")
    .is("rates_expiry_reminded_at", null);
  if (error) {
    console.error("[car/rates-expiry] lecture refusée", { error: error.message });
    await alertOps("Rappel d'échéance des grilles : lecture refusée", [error.message]);
    return { reminded: 0 };
  }
  const list = (partners ?? []) as Array<{ id: number; name: string; email: string | null }>;
  if (list.length === 0) return { reminded: 0 };

  const { data: rates, error: rErr } = await supabaseAdmin
    .from("car_partner_rates")
    .select("partner_id, period_to")
    .in("partner_id", list.map((p) => p.id));
  if (rErr) {
    console.error("[car/rates-expiry] lecture des grilles refusée", { error: rErr.message });
    await alertOps("Rappel d'échéance des grilles : lecture refusée", [rErr.message]);
    return { reminded: 0 };
  }
  const lastDay = new Map<number, string>();
  for (const r of (rates ?? []) as Array<{ partner_id: number; period_to: string }>) {
    if (!lastDay.get(r.partner_id) || r.period_to > (lastDay.get(r.partner_id) as string)) {
      lastDay.set(r.partner_id, r.period_to);
    }
  }

  const horizon = addDays(todayIso, REMINDER_DAYS);
  let reminded = 0;
  for (const p of list) {
    const last = lastDay.get(p.id);
    // Une grille déjà expirée est rappelée aussi (une fois) ; sans ligne, rien à dire.
    if (!last || last > horizon || !p.email) continue;
    try {
      // On revendique AVANT d'envoyer : deux passes qui se croisent n'envoient qu'un e-mail.
      const { data: won, error: cErr } = await supabaseAdmin
        .from("car_partners")
        .update({ rates_expiry_reminded_at: new Date().toISOString() })
        .eq("id", p.id)
        .is("rates_expiry_reminded_at", null)
        .select("id");
      assertWritten("ratesExpiryClaim", p.id, cErr);
      if (!won || won.length !== 1) continue;

      const portalUrl = `${siteBase()}/en/car-rates/${await ensurePortalToken(p.id)}`;
      const ok = await sendMail(
        p.email,
        depositMail("partner_rates_expiring", { ...BLANK, partnerName: p.name, ratesExpiry: { lastDay: last, portalUrl } }, "en"),
      );
      if (ok) {
        reminded++;
      } else {
        // Rend la revendication : le passage de demain réessaie.
        const { error: uErr } = await supabaseAdmin
          .from("car_partners").update({ rates_expiry_reminded_at: null }).eq("id", p.id).select("id");
        assertWritten("ratesExpiryRelease", p.id, uErr);
        console.error("[car/rates-expiry] envoi refusé", { partnerId: p.id });
      }
    } catch (e) {
      console.error("[car/rates-expiry] échec", { partnerId: p.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { reminded };
}
