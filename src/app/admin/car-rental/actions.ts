"use server";
// Écritures du back-office. Chaque action revalide le cookie (guard) puis
// valide via la logique pure avant l'update. Erreur → throw : Next affiche
// l'erreur, les données restent intactes (constat a posteriori, pas de
// machine à états à réparer).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { isCarAdmin } from "@/lib/car-admin-auth";
import { OUTCOMES, commissionEur, validatePartnerUpdate, ZONE_IDS } from "@/lib/car-admin";
import { canCancelRequest } from "@/lib/car-quotes";
import { requestCommission } from "@/lib/car-commission-server";
import {
  creditCommissionInvoice,
  resendCommissionInvoice,
  expireCommissionSession,
} from "@/lib/car-invoice-credit";
import { markInvoicePaid, markInvoiceUnpaid, assertWritten } from "@/lib/car-invoice-server";
import { startPartnerOnboarding, refreshPartnerKyc } from "@/lib/car-connect-server";
import { refreshPartnerRating } from "@/lib/google-rating-server";
import { PARTNER_IDENTITY_COLS } from "@/lib/car-invoice";
import {
  buildIdentityPatch, todayAthens, IDENTITY_TEXT_FIELDS, type IdentityTextField,
} from "@/lib/car-partner-identity";
import { commissionOutcomeMessage, missingIdentityLabels } from "@/lib/car-commission-catchup";

const PATH = "/admin/car-rental";

async function guard() {
  if (!(await isCarAdmin())) throw new Error("Forbidden");
}

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? "").replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Issue d'une demande : bouton rented (avec montant) ou lost. */
export async function setOutcome(id: number, formData: FormData) {
  await guard();
  const outcome = String(formData.get("outcome") ?? "");
  if (!(OUTCOMES as readonly string[]).includes(outcome)) throw new Error("Invalid outcome");
  const finalAmount = outcome === "rented" ? num(formData.get("amount")) : null;
  if (outcome === "rented" && finalAmount == null) {
    redirect(`${PATH}?error=${encodeURIComponent("Montant requis pour marquer une location « louée »")}`);
  }

  // Snapshot de la commission au taux du jour (colonne commission_eur) :
  // l'édition ultérieure du taux partenaire ne réécrit pas l'historique
  // facturable.
  let commission: number | null = null;
  if (outcome === "rented" && finalAmount != null) {
    const { data: req } = await supabase.from("car_requests")
      .select("quoted_by_partner_id").eq("id", id).maybeSingle();
    if (req?.quoted_by_partner_id != null) {
      const { data: p } = await supabase.from("car_partners")
        .select("commission").eq("id", req.quoted_by_partner_id).maybeSingle();
      if (p) commission = commissionEur(finalAmount, p.commission);
    }
  }

  const { error } = await supabase.from("car_requests").update({
    outcome,
    outcome_at: new Date().toISOString(),
    final_amount_eur: finalAmount,
    commission_eur: commission,
    // une demande reperdue n'a plus de commission encaissable
    ...(outcome === "lost" ? { commission_paid_at: null } : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);

  // Facturation automatique de la commission au passage en « louée » (décision
  // Kami 29/07/2026). requestCommission porte ses propres gardes : montant sous
  // le minimum Stripe, demande déjà partie, loueur inconnu. Un échec Stripe est
  // journalisé et relâche son verrou, il ne fait pas échouer le marquage : la
  // location EST louée, c'est un fait, la facturation se rattrape ensuite.
  if (outcome === "rented") {
    const result = await requestCommission(id);
    if (result.status === "failed") {
      console.error("[admin/car-rental] commission non demandée", { id, code: result.code });
    } else if (result.status === "partner_identity_incomplete") {
      // La location EST louée (l'update ci-dessus a déjà eu lieu) : ce refus
      // ne fait pas échouer le marquage, mais l'écran doit dire pourquoi
      // aucune facture n'est partie, au lieu de rester muet ou d'afficher une
      // panne, ce n'en est pas une, c'est un état normal tant que la fiche
      // partenaire n'a pas été complétée.
      const missing = missingIdentityLabels(result.missing).join(", ");
      redirect(
        `${PATH}?error=${encodeURIComponent(
          `Location marquée louée, mais la facturation de la commission est bloquée : fiche loueur incomplète (${missing}). Complétez la fiche partenaire pour permettre l'émission de la facture.`,
        )}`,
      );
    }
  }

  // Location perdue : le lien de paiement encore vivant doit mourir. La page
  // facture et la route de paiement lisent maintenant `outcome`, mais une
  // session Checkout déjà ouverte dans un onglet du loueur ne repasse par
  // aucune des deux, elle vit 24 h chez Stripe. AUCUN avoir n'est émis ici :
  // émettre une pièce comptable est une décision, pas un effet de bord.
  if (outcome === "lost") await expireCommissionSession(id);

  revalidatePath(PATH);
}

/**
 * Annule la facture de commission par un avoir (bouton « avoir »). La location
 * n'a finalement pas eu lieu : la facture ne se supprime pas, elle s'annule, et
 * la demande repasse en « perdue ».
 */
export async function creditInvoiceAction(id: number, formData: FormData) {
  await guard();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!reason) {
    redirect(`${PATH}?error=${encodeURIComponent("Motif requis pour émettre un avoir")}`);
  }
  const res = await creditCommissionInvoice(id, reason);
  if ("error" in res) {
    const message =
      res.error === "no_invoice"
        ? "Aucune facture de commission sur cette demande"
        : res.error === "already_credited"
          ? "Facture déjà annulée par un avoir"
          : "Facture déjà réglée : le remboursement Stripe se fait à la main, aucun avoir n'est émis";
    redirect(`${PATH}?error=${encodeURIComponent(message)}`);
  }
  // L'avoir existe même quand le loueur n'a pas d'email : c'est la
  // notification qui manque, et elle demande alors une main humaine.
  if (!res.notified) {
    redirect(
      `${PATH}?error=${encodeURIComponent(`Avoir ${res.creditNumber} émis, mais le loueur n'a pas été prévenu par email : faites-le à la main`)}`,
    );
  }
  revalidatePath(PATH);
}

/**
 * Émet la facture d'une location restée en souffrance (bouton « Émettre la
 * facture »).
 *
 * ⛔ Sans ce geste, le travail est perdu en silence : `setOutcome` bascule la
 * demande en « rented » AVANT de facturer, et si la facturation refuse (fiche
 * loueur incomplète, loueur sans email, refus Stripe), la ligne porte
 * `outcome = 'rented'` sans facture. Le cron ne la reprendra JAMAIS, il ne
 * filtre que sur `outcome IS NULL`. Compléter la fiche du loueur après coup ne
 * déclenchait donc rien.
 *
 * Aucune garde n'est contournée : l'action rappelle `requestCommission`, qui
 * repose son verrou, revérifie l'identité du loueur et l'armement. Elle ne fait
 * que rendre lisible ce qu'il répond.
 */
export async function emitInvoiceAction(id: number) {
  await guard();
  const message = commissionOutcomeMessage(await requestCommission(id));
  // Succès : aucun bandeau. La facture et son numéro apparaissent d'eux-mêmes
  // sur la ligne, redire à l'écran ce qu'il montre déjà est du bruit.
  if (message) redirect(`${PATH}?error=${encodeURIComponent(message)}`);
  revalidatePath(PATH);
}

/**
 * Renvoie une facture dont l'email a été refusé (bouton « renvoyer »). Le cron
 * ne repassera jamais dessus : il tranche l'issue AVANT de facturer, la ligne
 * sort donc de son filtre dès le lendemain. Le lien de paiement est régénéré,
 * le numéro de facture ne bouge pas.
 */
export async function resendInvoiceAction(id: number) {
  await guard();
  const res = await resendCommissionInvoice(id);
  if ("error" in res) {
    const message =
      res.error === "no_invoice"
        ? "Aucune facture de commission sur cette demande"
        : res.error === "no_request"
          ? "Demande introuvable"
          : res.error === "already_paid"
            ? "Facture déjà réglée, rien à renvoyer"
            : res.error === "already_credited"
              ? "Facture annulée par un avoir, rien à renvoyer"
              : res.error === "partner_without_email"
                ? "Loueur sans email : impossible de lui renvoyer sa facture"
                : res.error === "token_rotation_failed"
                  ? "Le lien de paiement n'a pas pu être régénéré : rien n'a été envoyé, réessayez dans quelques minutes"
                  // L'email EST parti : dire « Resend a refusé » serait faux, et
                  // la facture restera pourtant affichée « jamais envoyée ».
                  : res.error === "sent_not_recorded"
                    ? "Facture renvoyée au loueur, mais l'envoi n'a pas pu être enregistré : elle restera affichée « jamais envoyée », ne la renvoyez pas une troisième fois"
                    : "Resend a refusé l'envoi, réessayez dans quelques minutes";
    redirect(`${PATH}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(PATH);
}

/**
 * Bascule commission encaissée / due.
 *
 * Porte les DEUX états, car ils n'en font qu'un : `car_requests` sert le suivi
 * interne, `car_commission_invoices` sert la page que le loueur a sous les yeux.
 * Ce bouton est la seule réconciliation du virement bancaire, le canal que
 * l'email met en avant, et le seul sans webhook. Sans l'écriture sur la
 * facture, la page garderait son bouton « Pay by card » sur de l'argent déjà
 * reçu, et le loueur paierait une seconde fois.
 *
 * Une demande antérieure au système de facturation n'a pas de facture : les
 * deux marquages ne touchent alors aucune ligne, ce n'est pas une erreur.
 */
export async function setCommissionPaid(id: number, paid: boolean) {
  await guard();
  const { error } = await supabase.from("car_requests")
    .update({ commission_paid_at: paid ? new Date().toISOString() : null })
    .eq("id", id).eq("outcome", "rented");
  if (error) throw new Error(error.message);
  if (paid) await markInvoicePaid(id);
  else await markInvoiceUnpaid(id);
  revalidatePath(PATH);
}

/** Sort une demande du flow (demande erronée/spam) : statut → 'cancelled'. Les
 *  deux passes du cron car-relance l'ignorent alors, le lien client est coupé
 *  (accept_token_hash null) et tout devis loueur tardif est refusé. Idempotent :
 *  refuse une demande déjà terminale (accepted/declined_by_client/cancelled). */
export async function cancelRequest(id: number) {
  await guard();
  const { data: req } = await supabase.from("car_requests").select("status").eq("id", id).maybeSingle();
  if (!req) throw new Error("Request not found");
  if (!canCancelRequest(req.status)) {
    redirect(`${PATH}?error=${encodeURIComponent("Demande déjà close, rien à sortir du flow")}`);
  }
  const { error } = await supabase.from("car_requests")
    .update({ status: "cancelled", accept_token_hash: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function saveNote(id: number, formData: FormData) {
  await guard();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000) || null;
  const { error } = await supabase.from("car_requests").update({ admin_note: note }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

export async function togglePartnerActive(id: number, active: boolean) {
  await guard();
  const { error } = await supabase.from("car_partners").update({ active }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

/** Zones (cases cochées) + taux de commission d'un partenaire. */
export async function updatePartner(id: number, formData: FormData) {
  await guard();
  const zone_ids = ZONE_IDS.filter((z) => formData.get(`zone-${z}`) === "on");
  const pct = num(formData.get("commissionPct"));
  const commission = pct == null ? NaN : Math.round(pct * 100) / 10000; // "12" -> 0.12
  const err = validatePartnerUpdate({ zone_ids, commission });
  if (err) redirect(`${PATH}?tab=partners&error=${encodeURIComponent(err)}`);
  // Place ID corrigé à la main : on efface la note relevée avec l'ancienne
  // fiche, sinon l'écran garderait la note d'un autre établissement jusqu'au
  // prochain relevé.
  const placeId = String(formData.get("googlePlaceId") ?? "").trim() || null;
  const { data: current } = await supabase.from("car_partners")
    .select("google_place_id").eq("id", id).maybeSingle();
  const placeChanged = (current?.google_place_id ?? null) !== placeId;
  const { error } = await supabase.from("car_partners").update({
    zone_ids,
    commission,
    google_place_id: placeId,
    ...(placeChanged
      ? { google_rating: null, google_rating_count: null, google_maps_url: null, google_rating_at: null }
      : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(PATH);
}

/**
 * Identité légale du loueur : raison sociale, adresse complète, numéro de TVA
 * intracommunautaire (formulaire de la fiche partenaire).
 *
 * Ces colonnes existaient sans qu'aucun écran ne les écrive : dix loueurs
 * actifs, un seul renseigné à la main en SQL. La garde `partnerBillingIdentity`
 * refuse de facturer les neuf autres, et c'est ici qu'on les débloque.
 *
 * L'enregistrement PARTIEL est accepté volontairement : une fiche à moitié
 * remplie est un état normal (on connaît l'adresse, on attend le numéro de
 * TVA). C'est la garde, au moment de facturer, qui dit ce qui manque, pas le
 * formulaire, qui refuserait alors d'enregistrer un travail déjà fait.
 *
 * ⛔ `vat_verified_at` n'est PAS écrit comme les autres : voir
 * `resolveVatVerifiedAt`. La page facture imprime, si et seulement si cette
 * colonne est remplie, « verified against the European Commission VIES database
 * on <date> and returned as valid ».
 */
export async function updatePartnerIdentity(id: number, formData: FormData) {
  await guard();
  // Lecture AVANT écriture : sans l'état actuel, une attestation VIES réelle
  // serait re-datée à chaque enregistrement du formulaire, et un changement de
  // numéro de TVA garderait la vérification de l'ancien.
  const { data: current } = await supabase.from("car_partners")
    .select(PARTNER_IDENTITY_COLS).eq("id", id).maybeSingle();

  const values: Partial<Record<IdentityTextField, string>> = {};
  for (const field of IDENTITY_TEXT_FIELDS) values[field] = String(formData.get(field) ?? "").slice(0, 200);

  const patch = buildIdentityPatch({
    values,
    vatVerified: formData.get("vatVerified") === "on",
    current,
    today: todayAthens(),
  });

  const { error } = await supabase.from("car_partners").update(patch).eq("id", id).select();
  // Refusée en silence, la fiche s'afficherait complète alors que rien n'est
  // écrit, et la facturation resterait bloquée sans que personne comprenne.
  assertWritten("updatePartnerIdentity", id, error);
  revalidatePath(PATH);
}

/** Ouvre l'onboarding Stripe Connect d'un loueur et redirige vers Stripe.
 *  Sans compte connecté, le cron de versement garde ses fonds : ce bouton est
 *  le seul chemin pour le débloquer. */
export async function openPartnerOnboarding(id: number) {
  await guard();
  const res = await startPartnerOnboarding(id);
  if (res.status === "ready") redirect(res.url);
  const message =
    res.status === "not_found"
      ? "Loueur introuvable ou sans email"
      : res.code === "payouts_unavailable"
        ? "Les versements ne sont pas encore ouverts côté crete.direct"
        : "Stripe a refusé l'ouverture du compte, réessayez dans quelques minutes";
  redirect(`${PATH}?tab=partners&error=${encodeURIComponent(message)}`);
}

/** Relit l'état du compte du loueur chez Stripe (bouton « rafraîchir »). */
export async function refreshPartnerConnect(id: number) {
  await guard();
  await refreshPartnerKyc(id);
  revalidatePath(PATH);
}

/**
 * Relève la note Google du loueur (bouton « note Google »).
 *
 * Un échec n'écrit rien et le dit dans le bandeau : une note absente doit se
 * lire comme absente, jamais comme « pas encore rafraîchie ».
 */
export async function refreshPartnerRatingAction(id: number) {
  await guard();
  const res = await refreshPartnerRating(id);
  const message =
    res.status === "no_key"
      ? "Clé GOOGLE_PLACES_API_KEY absente : aucune note ne peut être relevée"
      : res.status === "unmatched"
        ? "Aucune fiche Google ne correspond à ce loueur avec certitude. Collez son Place ID pour lever le doute."
        : res.status === "not_found"
          ? "Loueur introuvable"
          : res.status === "failed"
            ? "Google a refusé la requête, réessayez dans quelques minutes"
            : null;
  if (message) redirect(`${PATH}?tab=partners&error=${encodeURIComponent(message)}`);
  revalidatePath(PATH);
}
