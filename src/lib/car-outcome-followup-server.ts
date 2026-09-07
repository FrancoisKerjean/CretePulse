// Passe quotidienne du suivi d'issue (cron car-outcome-followup, 06:20 UTC).
//
// Deux populations, une seule question au loueur :
//   A. issue inconnue : acceptée, outcome NULL, non payée en ligne, loueur
//      connu, date_to passée. Ce sont les lignes que le cron de facturation a
//      écartées (fiche incomplète) ou n'a jamais vues (départ avant le 05/08).
//   B. issue présumée : outcome = rented ET outcome_source = auto, date_to
//      passée. Basculées par le cron au J1, facturées, jamais confirmées.
//
// Compteur et horodatage sont écrits AVANT l'envoi, comme relanced_at dans
// runPartnerNudgePass : un email refusé par Resend n'est pas renvoyé le
// lendemain, il le sera à l'étape suivante, et un double envoi le même jour
// est impossible.
import { supabaseAdmin as supabase } from "./supabase-admin";
import { newToken } from "./car-quote";
import { siteBase } from "./car-commission";
import { invoiceForRequest } from "./car-invoice-server";
import { ratePercentLabel } from "./car-invoice";
import { commissionEur, waHref } from "./car-admin";
import { carPickupLabel } from "./car-lead";
import { todayAthens } from "./car-partner-identity";
import { notifyOps, echeance, type OpsNotice } from "./ops-notify";
import { outcomeFollowupStep, ddmm, type OutcomeQuestionMail } from "./car-outcome-followup";

const COLS =
  "id, status, date_from, date_to, pickup_slug, quoted_car_model, quoted_price, customer_name, quoted_by_partner_id, booking_paid_at, outcome, outcome_source, outcome_token, outcome_followup_count, outcome_followup_sent_at, outcome_followup_escalated_at";

interface FollowupRequest {
  id: number;
  status: string;
  date_from: string;
  date_to: string;
  pickup_slug: string;
  quoted_car_model: string | null;
  quoted_price: number | null;
  customer_name: string;
  quoted_by_partner_id: number | null;
  booking_paid_at: string | null;
  outcome: string | null;
  outcome_source: string | null;
  outcome_token: string | null;
  outcome_followup_count: number | null;
  outcome_followup_sent_at: string | null;
  outcome_followup_escalated_at: string | null;
}

interface PartnerRow {
  id: number;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  phone: string | null;
  commission: number | null;
}

export interface OutcomeFollowupResult {
  /** Emails acceptés par Resend. */
  sent: number;
  /** Emails refusés par Resend : compteur incrémenté quand même, réessai à l'étape suivante. */
  refused: number;
  escalated: number;
  reminded: number;
  withoutEmail: number;
  /** Fiche loueur introuvable ou illisible : la question ne peut pas partir. */
  partnerNotFound: number;
  /** Ecriture du compteur refusée : la ligne reste sur l'email 1 à chaque passage et ne s'escalade jamais seule. */
  writeRefused: number;
}

/**
 * Fiche absente et lecture refusée rendaient toutes deux `null`, et la ligne
 * partait en ops comme « loueur sans email » : deux mains très différentes
 * derrière un seul message. Le motif est désormais rendu, au sens des rejets
 * du cron de facturation (`partner_not_found`).
 */
async function partnerRow(id: number): Promise<{ partner: PartnerRow | null; error: string | null }> {
  const { data, error } = await supabase.from("car_partners")
    .select("id, name, email, whatsapp, phone, commission").eq("id", id).maybeSingle();
  return { partner: (data as PartnerRow) ?? null, error: error?.message ?? null };
}

/** Telegram est un canal de confort : son échec ne doit jamais faire perdre le résultat d'une passe. */
async function ops(n: OpsNotice): Promise<void> {
  try {
    await notifyOps(n);
  } catch (e) {
    console.error("[car/outcome-followup] notification d exploitation echouee", e);
  }
}

const money = (n: number | null): string => Number(n ?? 0).toFixed(2).replace(/\.00$/, "");

function ligneEscalade(row: FollowupRequest, nom: string): string {
  const count = row.outcome_followup_count ?? 0;
  return `#${row.id} ${nom} · ${ddmm(row.date_from)} → ${ddmm(row.date_to)} · ${money(row.quoted_price)} € · ${count} emails sans réponse`;
}

function ligneWhatsApp(row: FollowupRequest, partner: PartnerRow): string | null {
  const numero = partner.whatsapp ?? partner.phone;
  if (!numero) return null;
  const first = (partner.name ?? "").split(" ")[0] || "there";
  const message = `Hi ${first}, quick question from crete.direct: did rental ${row.id} (${ddmm(row.date_from)} to ${ddmm(row.date_to)}) take place? Thanks!`;
  return `   WhatsApp #${row.id} : ${waHref(numero, message)}`;
}

function buildQuestion(
  row: FollowupRequest,
  partner: PartnerRow,
  token: string,
  attempt: 1 | 2 | 3,
  invoice: { number: string; amount_eur: number } | null,
): OutcomeQuestionMail {
  const price = Number(row.quoted_price ?? 0);
  const rate = Number(partner.commission);
  const expected = !invoice && Number.isFinite(rate) && rate > 0
    ? { ratePercent: ratePercentLabel(rate), amountEur: commissionEur(price, rate) }
    : null;
  return {
    requestId: row.id,
    partnerName: partner.name ?? "",
    dateFrom: row.date_from,
    dateTo: row.date_to,
    pickupLabel: carPickupLabel(row.pickup_slug),
    carModel: row.quoted_car_model,
    customerName: row.customer_name,
    priceEur: price,
    outcomeUrl: `${siteBase()}/en/rental-outcome/${token}`,
    attempt,
    invoice: invoice ? { number: invoice.number, amountEur: Number(invoice.amount_eur) } : null,
    expected,
  };
}

/**
 * Une passe. `now` est injecté : la route passe `new Date()`, les tests une
 * date fixe. `today` est la date civile d'Athènes, comme les actions admin.
 */
export async function runOutcomeFollowupPass(now: Date): Promise<OutcomeFollowupResult> {
  const today = todayAthens(now);
  const { sendPartnerOutcomeQuestion } = await import("./email");

  // A. Issue inconnue.
  const { data: unknown, error: errA } = await supabase.from("car_requests").select(COLS)
    .eq("status", "accepted")
    .is("outcome", null)
    .is("booking_paid_at", null)
    .not("quoted_by_partner_id", "is", null)
    .lt("date_to", today);
  // B. Issue présumée, non confirmée.
  const { data: presumed, error: errB } = await supabase.from("car_requests").select(COLS)
    .eq("outcome", "rented")
    .eq("outcome_source", "auto")
    .lt("date_to", today);
  // PostgREST ne lève pas : une lecture refusée (colonnes absentes tant que la
  // migration n'est pas appliquée, droits) rend `data` null, et la passe
  // répondrait « 0 envoi » comme un jour calme, route comprise. Elle journalise
  // au lieu de se taire, sans lever : l'autre population doit tourner.
  if (errA) console.error("[car/outcome-followup] lecture population A refusee", { error: errA.message });
  if (errB) console.error("[car/outcome-followup] lecture population B refusee", { error: errB.message });

  const rows = [...((unknown ?? []) as FollowupRequest[]), ...((presumed ?? []) as FollowupRequest[])];
  const result: OutcomeFollowupResult = { sent: 0, refused: 0, escalated: 0, reminded: 0, withoutEmail: 0, partnerNotFound: 0, writeRefused: 0 };
  const escalations: string[] = [];
  // Trois motifs, une seule notification : dans les trois cas la question ne
  // peut pas partir et il faut une main. Chaque ligne porte le sien, comme les
  // rejets du cron de facturation.
  const bloquees: string[] = [];

  for (const row of rows) {
    // Exclusions communes, redites en code : la requête B ne filtre ni le
    // statut ni le paiement en ligne.
    if (row.status === "cancelled" || row.booking_paid_at || row.quoted_by_partner_id == null) continue;

    const step = outcomeFollowupStep(row, today);
    if (step === "none") continue;

    const { partner, error: partnerError } = await partnerRow(row.quoted_by_partner_id);
    if (!partner) {
      // Fiche introuvable ou illisible : l'onglet Partenaires n'a aucun email à
      // remplir, la main à faire n'est pas la même. Motif et ligne distincts.
      if (partnerError) {
        console.error("[car/outcome-followup] lecture du loueur refusee", { requestId: row.id, partnerId: row.quoted_by_partner_id, error: partnerError });
      }
      bloquees.push(`#${row.id} loueur ${row.quoted_by_partner_id} : fiche loueur illisible (partner_not_found)`);
      result.partnerNotFound += 1;
      continue;
    }
    const nom = partner.name ?? `loueur ${row.quoted_by_partner_id}`;
    if (!partner.email) {
      // Pas d'attente J+10 : sans email, rien ne partira jamais, il faut une
      // main tout de suite. La ligne reste chaque jour jusqu'à saisie admin.
      bloquees.push(`#${row.id} ${nom} : loueur sans email (partner_without_email)`);
      result.withoutEmail += 1;
      continue;
    }

    if (step === "send") {
      // Jeton STABLE : réutilisé s'il existe, le lien de l'email précédent
      // reste vivant (même arbitrage que client_token, migration 20260712).
      const token = row.outcome_token || newToken();
      const count = Math.min((row.outcome_followup_count ?? 0) + 1, 3) as 1 | 2 | 3;
      const { error } = await supabase.from("car_requests").update({
        outcome_token: token,
        outcome_followup_count: count,
        outcome_followup_sent_at: now.toISOString(),
      }).eq("id", row.id).select();
      if (error) {
        // Refusée en silence, l'email partirait avec un jeton qui n'existe
        // pas en base : lien mort chez le loueur. On journalise et on saute.
        // Et sans ligne ops elle resterait sur l'email 1 à chaque passage, sans
        // jamais atteindre l'escalade : un blocage muet pour toujours.
        console.error("[car/outcome-followup] ecriture du compteur refusee, aucun envoi", { requestId: row.id, error: error.message });
        bloquees.push(`#${row.id} ${nom} : écriture du compteur refusée par la base, aucun email (db_write_refused)`);
        result.writeRefused += 1;
        continue;
      }
      const invoice = row.outcome === "rented" ? await invoiceForRequest(row.id) : null;
      const mail = buildQuestion(row, partner, token, count, invoice);
      const ok = await sendPartnerOutcomeQuestion(partner.email, mail);
      if (ok) result.sent += 1;
      else result.refused += 1;
      continue;
    }

    if (step === "escalate") {
      const { error } = await supabase.from("car_requests")
        .update({ outcome_followup_escalated_at: now.toISOString() }).eq("id", row.id).select();
      if (error) console.error("[car/outcome-followup] escalated_at refuse par la base", { requestId: row.id, error: error.message });
      result.escalated += 1;
    } else {
      result.reminded += 1;
    }
    escalations.push(ligneEscalade(row, nom));
    const wa = ligneWhatsApp(row, partner);
    if (wa) escalations.push(wa);
  }

  // Le rappel est VOLONTAIREMENT quotidien tant que l'issue est inconnue :
  // la ligne se tait dès qu'un clic ou l'admin pose l'issue, la sortie du
  // bruit est évidente. Rien à dire = silence total.
  if (escalations.length > 0) {
    await ops({
      title: `Issue de location inconnue à J+10 : ${result.escalated + result.reminded} demande(s)`,
      lines: escalations,
      action: "Poser l'issue dans le back-office (Loué / Perdu) ou appeler le loueur, lien WhatsApp ci-dessus.",
      due: echeance(2),
      url: `${siteBase()}/admin/car-rental`,
    });
  }
  if (bloquees.length > 0) {
    await ops({
      title: `Issue de location : ${bloquees.length} question(s) impossible(s) à poser`,
      lines: bloquees,
      action: "Renseigner l'email ou retrouver la fiche du loueur dans l'onglet Partenaires, ou poser l'issue à la main. Une écriture refusée est une migration ou un droit manquant.",
      due: echeance(1),
      url: `${siteBase()}/admin/car-rental?tab=partners`,
    });
  }
  return result;
}
