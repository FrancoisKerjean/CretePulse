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
import { expireCommissionSession } from "./car-invoice-credit";
import { assertWritten } from "./car-invoice-server";

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
