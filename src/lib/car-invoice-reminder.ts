// Relance d'une facture de commission due : rappel email à J+15 (une fois),
// remontée ops à J+30 (chaque passage tant que due). Seconde passe du cron
// car-outcome-followup.
//
// ⛔ sent_at IS NULL n'entre JAMAIS ici : une facture numérotée jamais partie
// est l'état `alert` de invoiceAdminState, rattrapée par « Renvoyer » dans
// l'admin. ⛔ Pas resendCommissionInvoice : son texte dit « starts today ».
import { supabaseAdmin as supabase } from "./supabase-admin";
import { rotateInvoiceToken } from "./car-invoice-server";
import { newToken } from "./car-quote";
import { siteBase, type InvoiceReminderMail } from "./car-commission";
import { waHref } from "./car-admin";
import { notifyOps, echeance, type OpsNotice } from "./ops-notify";
import { ddmm } from "./car-outcome-followup";

export const DAY_MS = 86_400_000;
export const REMINDER_DAYS = 15;
export const OVERDUE_DAYS = 30;

export interface ReminderCandidate {
  sent_at: string | null;
  paid_at: string | null;
  credited_at: string | null;
  reminded_at?: string | null;
}

/** Pur : rappel J+15 une seule fois, retard J+30 tant que due. */
export function invoiceReminderDue(inv: ReminderCandidate, nowMs: number): { remind: boolean; overdue: boolean } {
  if (!inv.sent_at || inv.paid_at || inv.credited_at) return { remind: false, overdue: false };
  const sentMs = new Date(inv.sent_at).getTime();
  return {
    remind: !inv.reminded_at && sentMs + REMINDER_DAYS * DAY_MS <= nowMs,
    overdue: sentMs + OVERDUE_DAYS * DAY_MS <= nowMs,
  };
}

interface ReminderInvoice extends ReminderCandidate {
  id: number;
  number: string;
  request_id: number;
  partner_id: number;
  amount_eur: number;
  issued_at: string;
  sent_at: string;
}

interface ReminderRequest {
  id: number;
  date_from: string;
  date_to: string;
  outcome_token: string | null;
}

interface ReminderPartner {
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
}

export interface InvoiceReminderResult {
  reminded: number;
  overdue: number;
}

async function ops(n: OpsNotice): Promise<void> {
  try {
    await notifyOps(n);
  } catch (e) {
    console.error("[car/invoice-reminder] notification d exploitation echouee", e);
  }
}

const money = (n: number): string => Number(n).toFixed(2).replace(/\.00$/, "");

/**
 * Jeton d'issue STABLE de la demande : réutilisé s'il existe, sinon généré
 * et persisté AVANT l'email, sinon le lien « the invoice will be cancelled »
 * du rappel serait mort.
 */
async function ensureOutcomeToken(req: ReminderRequest): Promise<string | null> {
  if (req.outcome_token) return req.outcome_token;
  const token = newToken();
  const { error } = await supabase.from("car_requests").update({ outcome_token: token }).eq("id", req.id).select();
  if (error) {
    console.error("[car/invoice-reminder] jeton d issue non enregistre", { requestId: req.id, error: error.message });
    return null;
  }
  return token;
}

export async function runInvoiceReminderPass(now: Date): Promise<InvoiceReminderResult> {
  const nowMs = now.getTime();
  const { sendInvoiceReminder } = await import("./email");
  const cutoff = new Date(nowMs - REMINDER_DAYS * DAY_MS).toISOString();

  const { data } = await supabase.from("car_commission_invoices")
    .select("id, number, request_id, partner_id, amount_eur, issued_at, sent_at, paid_at, credited_at, reminded_at")
    .not("sent_at", "is", null)
    .is("paid_at", null)
    .is("credited_at", null)
    .lte("sent_at", cutoff);

  const result: InvoiceReminderResult = { reminded: 0, overdue: 0 };
  const overdueLines: string[] = [];
  let overdueTitle = "";

  for (const inv of (data ?? []) as ReminderInvoice[]) {
    const due = invoiceReminderDue(inv, nowMs);
    if (!due.remind && !due.overdue) continue;

    const { data: partner } = await supabase.from("car_partners")
      .select("name, email, whatsapp, phone").eq("id", inv.partner_id).maybeSingle();
    const p = (partner as ReminderPartner | null) ?? null;
    const nom = p?.name ?? `loueur ${inv.partner_id}`;

    if (due.remind) {
      const { data: request } = await supabase.from("car_requests")
        .select("id, date_from, date_to, outcome_token").eq("id", inv.request_id).maybeSingle();
      const req = (request as ReminderRequest | null) ?? null;
      if (!p?.email || !req) {
        console.error("[car/invoice-reminder] rappel impossible", { invoice: inv.number, partnerWithoutEmail: !p?.email, requestMissing: !req });
      } else {
        await remind(inv, req, p.email, nom, now, sendInvoiceReminder, result);
      }
    }

    if (due.overdue) {
      result.overdue += 1;
      overdueTitle = `Facture ${inv.number} due depuis ${OVERDUE_DAYS} j · ${nom} · ${money(inv.amount_eur)} €`;
      overdueLines.push(`${inv.number} · ${nom} · ${money(inv.amount_eur)} € · envoyée le ${ddmm(inv.sent_at.slice(0, 10))}`);
      const numero = p?.whatsapp ?? p?.phone;
      if (numero) {
        const first = (p?.name ?? "").split(" ")[0] || "there";
        overdueLines.push(`   WhatsApp : ${waHref(numero, `Hi ${first}, crete.direct here. Invoice ${inv.number} (${inv.amount_eur} EUR) is still open, can you have a look? Thanks!`)}`);
      }
    }
  }

  // Volontairement répété chaque passage tant que due : la ligne se tait dès
  // que la facture est payée ou avoirée, la sortie du bruit est évidente.
  if (overdueLines.length > 0) {
    await ops({
      title: result.overdue === 1 ? overdueTitle : `${result.overdue} facture(s) de commission due(s) depuis ${OVERDUE_DAYS} j`,
      lines: overdueLines,
      action: "Appeler ou WhatsApp le loueur, lien ci-dessus. Marquer « commission encaissée » dans le back-office dès réception du virement.",
      due: echeance(3),
      url: `${siteBase()}/admin/car-rental`,
    });
  }
  return result;
}

async function remind(
  inv: ReminderInvoice,
  req: ReminderRequest,
  email: string,
  nom: string,
  now: Date,
  send: (email: string, m: InvoiceReminderMail) => Promise<boolean>,
  result: InvoiceReminderResult,
): Promise<void> {
  // ⛔ AVANT l'email, et le refus arrête tout : le clair n'est pas relisible
  // (car-invoice-server.ts), un jeton non enregistré est un lien mort.
  let token: string;
  try {
    token = await rotateInvoiceToken(inv.id);
  } catch (err) {
    console.error("[car/invoice-reminder] rotation du jeton refusee, aucun rappel", { invoice: inv.number, err });
    return;
  }
  const outcomeToken = await ensureOutcomeToken(req);
  if (!outcomeToken) return;

  // reminded_at AVANT l'envoi : un refus Resend ne provoque pas un second
  // rappel le lendemain, la facture passera à J+30 chez les ops.
  const { error } = await supabase.from("car_commission_invoices")
    .update({ reminded_at: now.toISOString() }).eq("id", inv.id).select();
  if (error) {
    console.error("[car/invoice-reminder] reminded_at refuse par la base, aucun rappel", { invoice: inv.number, error: error.message });
    return;
  }

  const ok = await send(email, {
    invoiceNumber: inv.number,
    partnerName: nom,
    requestId: req.id,
    dateFrom: req.date_from,
    dateTo: req.date_to,
    issuedOn: inv.issued_at.slice(0, 10),
    amountEur: Number(inv.amount_eur),
    invoiceUrl: `${siteBase()}/en/invoice/${token}`,
    outcomeUrl: `${siteBase()}/en/rental-outcome/${outcomeToken}`,
  });
  if (ok) result.reminded += 1;
  else console.error("[car/invoice-reminder] rappel refuse par Resend", { invoice: inv.number });
}
