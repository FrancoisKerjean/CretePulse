// Facture de commission réglée par compensation (spec 2026-11-25, sections 6 et 11).
//
// L'acompte payé en ligne PAR LE CLIENT EST la commission de la plateforme. Le
// jour de la prise, le loueur reçoit donc une facture déjà marquée réglée par
// compensation avec cet acompte : aucune demande de paiement.
//
// ⛔ Une facture est une pièce comptable. Le numéro n'est demandé qu'à la
// création (createInvoiceForRequest réutilise l'existante). `sent_at` est le
// verrou d'envoi, pris par une écriture conditionnelle AVANT le jeton et l'e-mail :
// au plus un e-mail par facture, même si deux passes se croisent ou si une lecture
// a échoué. Une facture à moitié faite (créée, jamais envoyée) est terminée le
// lendemain sans second numéro.
import { supabaseAdmin } from "./supabase-admin";
import {
  invoiceForRequest, createInvoiceForRequest, markInvoicePaid,
  rotateInvoiceToken, assertWritten,
} from "./car-invoice-server";
import { partnerBillingIdentity, ratePercentLabel, PARTNER_IDENTITY_COLS } from "./car-invoice";
import { depositMail, type DepositMailData } from "./car-deposit-mail";
import { ensurePortalToken } from "./car-catalogue-db";
import { siteBase } from "./car-quote";
import { todayAthens } from "./car-partner-identity";
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
// Déclencheur : la passe rend exactement 100 lignes (alerte ops), ou une ligne
// échoue le dernier jour de la fenêtre (alerte ops) : passer alors le filtre en RPC SQL.
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

async function sendMail(to: string, mail: { subject: string; html: string }): Promise<boolean> {
  const { sendCarDepositMail } = await import("./email");
  return sendCarDepositMail(to, mail);
}

/** Rend le verrou d'envoi : sent_at redevient nul, le passage de demain réessaie. */
async function releaseSentClaim(invoiceId: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("car_commission_invoices")
    .update({ sent_at: null })
    .eq("id", invoiceId)
    .select("id");
  assertWritten("releaseSentClaim", invoiceId, error);
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
  // invoiceForRequest avale les erreurs de lecture : la facture « réutilisée » peut
  // être une facture déjà envoyée que la lecture du début n'a pas vue.
  if (invoice.credited_at || invoice.sent_at) return "skipped";

  // Un remboursement concurrent (refundConfirmed) a pu passer entre la sélection et ici.
  const { data: fresh, error: fErr } = await supabaseAdmin
    .from("car_requests").select("booking_status").eq("id", row.id).maybeSingle();
  if (fErr) throw new Error(`relecture de la réservation refusée: ${fErr.message}`);
  const status = (fresh as { booking_status: string | null } | null)?.booking_status ?? null;
  if (status !== "confirmed" && status !== "cancelled_kept") {
    throw new Error(
      `facture ${invoice.number} émise sur une réservation remboursée (${status ?? "inconnue"}), avoir à émettre`,
    );
  }

  const { error: sErr } = await supabaseAdmin
    .from("car_commission_invoices")
    .update({ settlement: "deposit_compensation" })
    .eq("id", invoice.id)
    .select();
  assertWritten("settlement", invoice.id, sErr);
  await markInvoicePaid(row.id);

  // Verrou d'envoi : écriture conditionnelle de sent_at AVANT le jeton et l'e-mail.
  // Deux passes qui se croisent ne passent pas toutes les deux (0 ligne = perdu).
  const { data: won, error: cErr } = await supabaseAdmin
    .from("car_commission_invoices")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", invoice.id)
    .is("sent_at", null)
    .select("id");
  assertWritten("claimInvoiceSend", invoice.id, cErr);
  if (!won || won.length !== 1) return "skipped";

  try {
    // Le jeton n'est lisible qu'à la création : un lien déjà perdu se refait, mais
    // seulement une fois le verrou gagné (la rotation tue le lien déjà envoyé).
    const token = created.token ?? (await rotateInvoiceToken(invoice.id));
    const mail = depositMail(
      "partner_invoice",
      {
        ...BLANK,
        partnerName: partner.name as string,
        carLabel: row.quoted_car_model ?? row.car_type ?? "",
        pickupLabel: row.pickup_slug ? carPickupLabel(row.pickup_slug) : "",
        dateFrom: row.date_from,
        dateTo: row.date_to,
        bookingStatus: row.booking_status,
        // Montants LUS de la facture, jamais recalculés.
        invoice: {
          number: invoice.number,
          url: `${siteBase()}/en/invoice/${token}`,
          baseEur: Number(invoice.base_amount_eur),
          ratePct: ratePercentLabel(Number(invoice.rate)),
          commissionEur: Number(invoice.amount_eur),
          // Jour civil d'Athènes de l'acompte, pas la date UTC.
          depositPaidOn: todayAthens(new Date(row.booking_paid_at ?? invoice.issued_at)),
        },
      },
      "en",
    );
    if (!(await sendMail(partner.email as string, mail))) throw new Error("envoi de la facture refusé");
  } catch (e) {
    await releaseSentClaim(invoice.id);
    throw e;
  }
  return "done";
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

  const rows = (data ?? []) as DepositRequest[];
  // Plafond atteint : des réservations peuvent rester hors de la passe (déclencheur du SHORTCUT).
  if (rows.length === MAX_PER_RUN) {
    await alertOps("Facturation des acomptes : plafond de 100 lignes atteint", [
      "Des réservations peuvent rester sans facture : passer le filtre en RPC SQL.",
    ]);
  }
  const lastWindowDay = addDays(todayIso, -WINDOW_DAYS);
  let invoiced = 0;
  const failed: number[] = [];
  const reasons: string[] = [];
  for (const row of rows) {
    try {
      if ((await invoiceOne(row)) === "done") invoiced++;
    } catch (e) {
      failed.push(row.id);
      const msg = e instanceof Error ? e.message : String(e);
      reasons.push(`demande ${row.id} : ${msg}`);
      // Demain la demande sort de la fenêtre : la commission encaissée resterait non facturée.
      if (row.date_from === lastWindowDay) {
        reasons.push(`demande ${row.id} : dernière tentative automatique, à facturer à la main`);
      }
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

  const horizon = addDays(todayIso, REMINDER_DAYS);
  let reminded = 0;
  for (const p of list) {
    let claimed = false;
    try {
      // Une seule ligne par loueur, la plus tardive : aucun plafond de lignes à craindre.
      const { data: latest, error: rErr } = await supabaseAdmin
        .from("car_partner_rates")
        .select("period_to")
        .eq("partner_id", p.id)
        .order("period_to", { ascending: false })
        .limit(1);
      if (rErr) throw new Error(`lecture de la grille refusée: ${rErr.message}`);
      const last = ((latest ?? []) as Array<{ period_to: string }>)[0]?.period_to;
      // Une grille déjà expirée est rappelée aussi (une fois) ; sans ligne, rien à dire.
      if (!last || last > horizon || !p.email) continue;

      // Le lien AVANT la revendication : un échec ici ne consomme aucun rappel.
      const portalUrl = `${siteBase()}/en/car-rates/${await ensurePortalToken(p.id)}`;

      // On revendique AVANT d'envoyer : deux passes qui se croisent n'envoient qu'un e-mail.
      const { data: won, error: cErr } = await supabaseAdmin
        .from("car_partners")
        .update({ rates_expiry_reminded_at: new Date().toISOString() })
        .eq("id", p.id)
        .is("rates_expiry_reminded_at", null)
        .select("id");
      assertWritten("ratesExpiryClaim", p.id, cErr);
      if (!won || won.length !== 1) continue;
      claimed = true;

      const ok = await sendMail(
        p.email,
        depositMail("partner_rates_expiring", { ...BLANK, partnerName: p.name, ratesExpiry: { lastDay: last, portalUrl } }, "en"),
      );
      if (!ok) throw new Error("envoi refusé");
      reminded++;
    } catch (e) {
      if (claimed) {
        // Rend la revendication : le passage de demain réessaie.
        const { error: uErr } = await supabaseAdmin
          .from("car_partners").update({ rates_expiry_reminded_at: null }).eq("id", p.id).select("id");
        if (uErr) console.error("[car/rates-expiry] revendication non rendue", { partnerId: p.id, error: uErr.message });
      }
      console.error("[car/rates-expiry] échec", { partnerId: p.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { reminded };
}
