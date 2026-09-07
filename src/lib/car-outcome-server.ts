// Écriture d'issue PARTAGÉE. Trois écrivains existent : le back-office
// (setOutcome), le lien loueur (POST /api/car-rental/outcome) et le cron de
// facturation (qui garde son update inline, verrouillé par ses tests, et ne
// fait qu'y ajouter outcome_source: 'auto'). Avant ce module, la logique
// vivait dans setOutcome : snapshot de la commission au taux du jour,
// commission_paid_at remis à null sur « perdue », facturation sur « louée »,
// expiration de la session Stripe sur « perdue ». Elle est ici, une fois.
//
// Ce module n'émet JAMAIS d'avoir : une pièce comptable est une décision de
// l'appelant (creditCommissionInvoice), pas un effet de bord d'un statut.
import { supabaseAdmin as supabase } from "./supabase-admin";
import { commissionEur, type Outcome, type OutcomeSource } from "./car-admin";
import { requestCommission, type CommissionOutcome } from "./car-commission-server";
import { creditCommissionInvoice, expireCommissionSession } from "./car-invoice-credit";
import { outcomeClickDecision, ddmm, type OutcomeChoice } from "./car-outcome-followup";
import { notifyOps, echeance, type OpsNotice } from "./ops-notify";
import { siteBase } from "./car-commission";
import { todayAthens } from "./car-partner-identity";
import { assertWritten, type InvoiceRow } from "./car-invoice-server";

export interface ApplyOutcomeInput {
  id: number;
  outcome: Outcome;
  source: OutcomeSource;
  /** Montant final de la location, requis pour « louée » (snapshot de commission). */
  finalAmountEur?: number | null;
  /**
   * Verrou optimiste du lien loueur : l'update ne touche la ligne QUE si elle
   * est encore dans l'état attendu. Deux clics contradictoires : le premier
   * gagne, le second rend `lost_race` et n'écrit rien. Absent sur le chemin
   * admin, qui corrige une issue déjà posée.
   */
  expect?: "outcome_null" | "source_auto";
}

export type ApplyOutcomeResult =
  | { status: "rented"; commission: CommissionOutcome }
  | { status: "lost" }
  | { status: "lost_race" };

export async function applyOutcome(input: ApplyOutcomeInput): Promise<ApplyOutcomeResult> {
  const finalAmount = input.outcome === "rented" ? (input.finalAmountEur ?? null) : null;

  // Snapshot de la commission au taux du jour (colonne commission_eur) :
  // l'édition ultérieure du taux partenaire ne réécrit pas l'historique
  // facturable.
  let commission: number | null = null;
  if (input.outcome === "rented" && finalAmount != null) {
    const { data: req } = await supabase.from("car_requests")
      .select("quoted_by_partner_id").eq("id", input.id).maybeSingle();
    if (req?.quoted_by_partner_id != null) {
      const { data: p } = await supabase.from("car_partners")
        .select("commission").eq("id", req.quoted_by_partner_id).maybeSingle();
      if (p) commission = commissionEur(finalAmount, p.commission);
    }
  }

  const patch = {
    outcome: input.outcome,
    outcome_source: input.source,
    outcome_at: new Date().toISOString(),
    final_amount_eur: finalAmount,
    commission_eur: commission,
    // une demande reperdue n'a plus de commission encaissable
    ...(input.outcome === "lost" ? { commission_paid_at: null } : {}),
  };

  let query = supabase.from("car_requests").update(patch).eq("id", input.id);
  if (input.expect === "outcome_null") query = query.is("outcome", null);
  if (input.expect === "source_auto") query = query.eq("outcome_source", "auto");
  const { data, error } = await query.select();
  assertWritten("applyOutcome", input.id, error);
  if (input.expect && (!data || data.length === 0)) return { status: "lost_race" };

  // Facturation au passage en « louée » (décision du 29/07/2026).
  // requestCommission porte ses propres gardes ; un refus ne défait pas
  // l'issue, la location EST louée, la facturation se rattrape ensuite.
  if (input.outcome === "rented") {
    return { status: "rented", commission: await requestCommission(input.id) };
  }

  // Location perdue : le lien de paiement encore vivant doit mourir. Une
  // session Checkout ouverte dans un onglet du loueur vit 24 h chez Stripe.
  await expireCommissionSession(input.id);
  return { status: "lost" };
}

// ── Lien loueur ─────────────────────────────────────────────────────────────

export interface OutcomeRequestRow {
  id: number;
  status: string;
  outcome: string | null;
  outcome_source: string | null;
  outcome_at: string | null;
  outcome_token: string | null;
  date_from: string;
  date_to: string;
  pickup_slug: string;
  quoted_car_model: string | null;
  quoted_price: number | null;
  customer_name: string;
  quoted_by_partner_id: number | null;
}

const OUTCOME_COLS =
  "id, status, outcome, outcome_source, outcome_at, outcome_token, date_from, date_to, pickup_slug, quoted_car_model, quoted_price, customer_name, quoted_by_partner_id";

/** Jeton STABLE en clair (même arbitrage que client_token) : lookup par égalité. */
export async function requestByOutcomeToken(token: string): Promise<OutcomeRequestRow | null> {
  const { data } = await supabase.from("car_requests").select(OUTCOME_COLS).eq("outcome_token", token).maybeSingle();
  return (data as OutcomeRequestRow) ?? null;
}

/**
 * La présomption du cron devient un fait : seule la source change, l'issue,
 * le montant et la facture ne bougent pas. Conditionnel sur `auto` : si
 * l'admin a repris la main entre l'email et le clic, zéro ligne est touchée.
 */
export async function confirmPresumedOutcome(id: number): Promise<boolean> {
  const { data, error } = await supabase.from("car_requests")
    .update({ outcome_source: "partner_link", outcome_at: new Date().toISOString() })
    .eq("id", id).eq("outcome_source", "auto").select();
  assertWritten("confirmPresumedOutcome", id, error);
  return (data?.length ?? 0) > 0;
}

export type ClickResult =
  | "applied" | "confirmed" | "credited" | "already_paid"
  | "recorded" | "contested" | "cancelled" | "lost_race";

/** Telegram est un canal de confort : son échec ne doit jamais faire perdre un clic loueur. */
async function ops(n: Omit<OpsNotice, "url">): Promise<void> {
  try {
    await notifyOps({ ...n, url: `${siteBase()}/admin/car-rental` });
  } catch (e) {
    console.error("[car/outcome] notification d exploitation echouee", e);
  }
}

async function partnerNameOf(partnerId: number | null): Promise<string | null> {
  if (partnerId == null) return null;
  const { data } = await supabase.from("car_partners").select("name").eq("id", partnerId).maybeSingle();
  return (data?.name as string | undefined) ?? null;
}

/**
 * Ce que le POST du loueur fait, décision par décision (tableau 3.4 de la
 * spec). La décision est pure (outcomeClickDecision), ici on l'exécute.
 */
export async function handleOutcomeClick(
  row: OutcomeRequestRow,
  invoice: InvoiceRow | null,
  choice: OutcomeChoice,
): Promise<ClickResult> {
  const decision = outcomeClickDecision({
    status: row.status,
    outcome: row.outcome,
    outcome_source: row.outcome_source,
    hasInvoice: Boolean(invoice),
    invoicePaid: Boolean(invoice?.paid_at),
    invoiceCredited: Boolean(invoice?.credited_at),
  }, choice);
  if (decision.kind === "cancelled") return "cancelled";
  if (decision.kind === "recorded" && !decision.contested) return "recorded";

  const nom = await partnerNameOf(row.quoted_by_partner_id);
  const qui = `#${row.id}${nom ? ` ${nom}` : ""} · ${ddmm(row.date_from)} → ${ddmm(row.date_to)}`;

  switch (decision.kind) {
    case "recorded":
      await ops({
        title: `Issue contestée par le loueur : ${qui}`,
        lines: [`Issue enregistrée : ${row.outcome} (${row.outcome_source}), le loueur clique « ${choice} »`],
        action: "Vérifier avec le loueur et corriger l'issue dans le back-office si besoin.",
        due: echeance(2),
      });
      return "contested";

    case "confirm":
      return (await confirmPresumedOutcome(row.id)) ? "confirmed" : "lost_race";

    case "already_paid":
      await ops({
        title: `Location déclarée non advenue, facture DÉJÀ PAYÉE : ${qui}`,
        lines: [`Facture ${invoice?.number ?? "?"} réglée, aucun avoir émis (décision du 31/07 : remboursement manuel)`],
        action: "Rembourser via Stripe ou par virement, puis émettre l'avoir à la main.",
        due: echeance(3),
      });
      return "already_paid";

    case "credit": {
      const reason = `Reported by the rental company via the outcome link on ${todayAthens()}`;
      const res = await creditCommissionInvoice(row.id, reason, "partner_link");
      if ("error" in res) {
        await ops({
          title: `Avoir refusé (${res.error}) sur une location déclarée non advenue : ${qui}`,
          lines: [`Facture ${invoice?.number ?? "?"}`],
          action: "Regarder la facture dans le back-office.",
          due: echeance(1),
        });
        return "recorded";
      }
      await ops({
        title: `Location non advenue déclarée par le loueur, avoir ${res.creditNumber} émis : ${qui}`,
        lines: [
          `Facture ${invoice?.number ?? "?"} annulée, ${res.notified ? "loueur prévenu par email" : "loueur NON prévenu (sans email)"}`,
          `Le voyageur reste joignable pour vérification en cas de doute.`,
        ],
        action: "Rien à faire sauf doute sur la déclaration : la mesure anti-fraude est le nombre de « perdue · loueur » par loueur dans le back-office.",
      });
      return "credited";
    }

    case "apply": {
      const res = await applyOutcome({
        id: row.id,
        outcome: decision.outcome,
        source: "partner_link",
        finalAmountEur: decision.outcome === "rented" ? row.quoted_price : null,
        expect: decision.expect,
      });
      if (res.status === "lost_race") return "lost_race";
      if (res.status === "rented" && res.commission.status !== "requested") {
        // L'issue EST posée. La facture, elle, se rattrape dans le back-office
        // (bouton « Émettre la facture » ou fiche loueur à compléter).
        const detail = res.commission.status === "failed" ? res.commission.code : res.commission.status;
        await ops({
          title: `Loueur a confirmé la location, facture NON émise (${detail}) : ${qui}`,
          lines: [`Prix accepté ${Number(row.quoted_price ?? 0).toFixed(2)} €`],
          action: "Émettre la facture depuis le back-office, ou compléter la fiche du loueur puis réémettre.",
          due: echeance(2),
        });
      }
      return "applied";
    }
  }
}
