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

  const { data, error: readError } = await supabase.from("car_commission_invoices")
    .select("id, number, request_id, partner_id, amount_eur, issued_at, sent_at, paid_at, credited_at, reminded_at")
    .not("sent_at", "is", null)
    .is("paid_at", null)
    .is("credited_at", null)
    .lte("sent_at", cutoff);
  // Sans ce garde, une colonne absente (migration non appliquee) rend `data`
  // nul et la passe se lit comme une journee sans facture due : muette, verte,
  // et fausse. On journalise sans lever, le cron reste vert pour sa passe 1.
  if (readError) {
    console.error("[car/invoice-reminder] lecture refusee", { error: readError.message });
  }

  const result: InvoiceReminderResult = { reminded: 0, overdue: 0 };
  const overdueLines: string[] = [];
  let overdueTitle = "";

  for (const inv of (data ?? []) as ReminderInvoice[]) {
    const due = invoiceReminderDue(inv, nowMs);
    if (!due.remind && !due.overdue) continue;

    const { data: partner } = await supabase.from("car_partners")
      .select("name, email, whatsapp, phone").eq("id", inv.partner_id).maybeSingle();
    const p = (partner as ReminderPartner | null) ?? null;
    // Libelle d'exploitation, francais, jamais expedie au loueur : le mail est
    // en anglais et repart de `p.name` (voir `remind`).
    const nom = p?.name ?? `loueur ${inv.partner_id}`;

    if (due.remind) {
      const { data: request } = await supabase.from("car_requests")
        .select("id, date_from, date_to, outcome_token").eq("id", inv.request_id).maybeSingle();
      const req = (request as ReminderRequest | null) ?? null;
      if (!p?.email || !req) {
        console.error("[car/invoice-reminder] rappel impossible", { invoice: inv.number, partnerWithoutEmail: !p?.email, requestMissing: !req });
      } else {
        await remind(inv, req, p, p.email, now, sendInvoiceReminder, result);
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
  p: ReminderPartner,
  email: string,
  now: Date,
  send: (email: string, m: InvoiceReminderMail) => Promise<boolean>,
  result: InvoiceReminderResult,
): Promise<void> {
  const nom = p.name ?? `loueur ${inv.partner_id}`;

  // Verrou optimiste AVANT tout, meme forme que car-commission-server.ts :
  // `reminded_at` passe de NULL a maintenant et seule la passe qui remporte
  // l'update continue. Le cron Vercel est at-least-once et le GET se rejoue
  // avec CRON_SECRET : sans le verrou, deux passes chevauchees lisent toutes
  // deux `reminded_at: null` et envoient deux rappels. `paid_at` et
  // `credited_at` referment la fenetre entre le select et l'update, une
  // facture reglee entre les deux ne recoit plus rien.
  const { data: locked, error } = await supabase.from("car_commission_invoices")
    .update({ reminded_at: now.toISOString() })
    .eq("id", inv.id)
    .is("reminded_at", null)
    .is("paid_at", null)
    .is("credited_at", null)
    .select();
  if (error) {
    console.error("[car/invoice-reminder] reminded_at refuse par la base, aucun rappel", { invoice: inv.number, error: error.message });
    return;
  }
  // PostgREST ne leve pas et rend `data: []` quand aucune ligne ne matche :
  // verrou deja pris par une passe concurrente, ou facture reglee entre le
  // select et ici. Sortir AVANT la rotation, sinon la passe perdante tuerait
  // le lien que la gagnante vient d'envoyer.
  if (!locked || locked.length === 0) return;

  const outcomeToken = await ensureOutcomeToken(req);
  if (!outcomeToken) return;

  // ⛔ Le plus tard possible, et jamais avant le verrou : la rotation tue le
  // lien de l'email de facture, le clair n'etant pas relisible
  // (car-invoice-server.ts). Un refus laisse l'ancien lien vivant.
  let token: string;
  try {
    token = await rotateInvoiceToken(inv.id);
  } catch (err) {
    // Le verrou est deja pris : aucun rappel ne repartira tout seul et, sans
    // cette ligne, le loueur ne serait relance qu a J+30. L ancien lien de
    // l email de facture est intact, il reste a le renvoyer a la main.
    console.error("[car/invoice-reminder] rotation du jeton refusee, aucun rappel", { invoice: inv.number, err });
    await ops({
      title: `Rappel de facture ${inv.number} non parti (jeton)`,
      lines: [`${nom} · l'ancien lien reste vivant, rappel à envoyer à la main`],
      action: "Renvoyer la facture depuis le back-office",
      due: echeance(1),
      url: `${siteBase()}/admin/car-rental`,
    });
    return;
  }

  const ok = await send(email, {
    invoiceNumber: inv.number,
    // Anglais : `p.name` ou « there », jamais le libelle d'exploitation.
    partnerName: p.name || "there",
    requestId: req.id,
    dateFrom: req.date_from,
    dateTo: req.date_to,
    issuedOn: inv.issued_at.slice(0, 10),
    amountEur: Number(inv.amount_eur),
    invoiceUrl: `${siteBase()}/en/invoice/${token}`,
    outcomeUrl: `${siteBase()}/en/rental-outcome/${outcomeToken}`,
  });
  if (ok) {
    result.reminded += 1;
    return;
  }

  // Le jeton est tourne et `reminded_at` pose : l'ancien lien de l'email de
  // facture est mort et aucun rappel ne repartira tout seul. Un console.error
  // ne se voit nulle part (Sentry ne capture pas la console) : les ops doivent
  // renvoyer la facture a la main, tout de suite.
  console.error("[car/invoice-reminder] rappel refuse par Resend", { invoice: inv.number });
  await ops({
    title: `Rappel de facture ${inv.number} non parti (Resend)`,
    lines: [`${nom} · jeton régénéré, l'ancien lien est mort`],
    action: "Renvoyer la facture depuis le back-office",
    due: echeance(1),
    url: `${siteBase()}/admin/car-rental`,
  });
}
