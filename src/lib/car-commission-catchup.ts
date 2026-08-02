// Rattrapage d une facture de commission restee en souffrance. Pur, zero I/O.
//
// ⛔ Pourquoi ce module existe : `setOutcome` bascule la demande en « rented »
// AVANT de facturer, et la facturation peut refuser (fiche loueur incomplete,
// panne d email, refus Stripe). La ligne porte alors `outcome = 'rented'` SANS
// facture, et le cron ne repassera JAMAIS dessus, il ne prend que
// `outcome IS NULL` (cf. isInvoiceable, car-invoice.ts). Sans geste manuel,
// completer la fiche du loueur apres coup ne declenche rien et le travail est
// perdu en silence.
import { shouldRequestCommission, type CommissionCandidate } from "./car-commission";
import { partnerBillingIdentity, type AdminInvoiceRow, type PartnerLegalRow } from "./car-invoice";
import { IDENTITY_FIELD_LABELS } from "./car-partner-identity";
import type { CommissionOutcome } from "./car-commission-server";

export type CommissionCatchUp =
  /** Emission possible : le bouton peut s afficher, l action l acceptera. */
  | { kind: "emit" }
  /** Fiche loueur incomplete : dire quoi remplir, pas offrir un bouton refuse. */
  | { kind: "identity_incomplete"; missing: string[] }
  /** Verrou pose sans facture : aucun clic ne debloque, il faut une main. */
  | { kind: "locked" };

/**
 * Faut-il proposer d emettre la facture sur cette demande, et sous quelle forme ?
 *
 * `null` = rien a proposer. Les conditions de facturation ne sont PAS recopiees
 * ici : elles sont deleguees a `shouldRequestCommission`, la meme fonction que
 * `requestCommission` applique. Un bouton qui s affiche alors que l action le
 * refusera est un mensonge d interface (meme doctrine que `invoiceAdminState`).
 */
export function commissionCatchUp(
  request: CommissionCandidate & { commission_requested_at?: string | null },
  invoice: AdminInvoiceRow | null | undefined,
  winner: PartnerLegalRow | null | undefined,
): CommissionCatchUp | null {
  // Une facture existe deja : ce sont « Renvoyer » et « avoir » qui la
  // rattrapent. Deux gestes concurrents sur la meme ligne mentiraient sur ce
  // qui va se passer.
  if (invoice) return null;
  if (!shouldRequestCommission(request)) return null;
  // Loueur gagnant introuvable au registre (id orphelin) : il n y a personne a
  // facturer, et rien a completer.
  if (!winner) return null;

  // Le verrou prime sur tout le reste. `commission_requested_at` rempli SANS
  // facture veut dire que le verrou a ete pris puis jamais relache (le cas
  // journalise par releaseLock quand la base refuse l ecriture). Tant qu il
  // tient, `requestCommission` rendra `already_requested` quoi qu on remplisse :
  // reclamer « completez la fiche » serait une fausse promesse.
  if (request.commission_requested_at) return { kind: "locked" };

  const identity = partnerBillingIdentity(winner);
  if (!identity.ok) return { kind: "identity_incomplete", missing: identity.missing };
  return { kind: "emit" };
}

/** Les champs manquants, en francais, tels que l ecran les nomme. */
export function missingIdentityLabels(missing: string[]): string[] {
  return missing.map((f) => IDENTITY_FIELD_LABELS[f] ?? f);
}

/**
 * Faut-il proposer le bouton « Commission encaissée » / « Repasser en due » ?
 *
 * Meme doctrine que `commissionCatchUp` / `invoiceAdminState` : un bouton qui
 * s affiche alors que rien ne se passe derriere est un mensonge d interface.
 * Sans facture, cocher « encaissee » ecrirait `commission_paid_at` sans
 * aucune contrepartie facturable (`markInvoicePaid` ne trouve alors aucune
 * ligne, cf. `setCommissionPaid`) : la demande semblerait reglee alors
 * qu elle n a jamais ete facturee. Vu sur la planche
 * `admin-identite-loueur.html`, etats 4 et 5 : fiche loueur incomplete ou
 * verrou orphelin, et le bouton restait pourtant propose juste en dessous.
 *
 * Exception volontaire : une demande dont `commission_paid_at` est DEJA
 * rempli reste visible, meme sans facture. Des commissions anterieures au
 * systeme de facturation ont ete reglees a la main, hors systeme (ex.
 * Luxtrans, juillet 2026) : masquer completement le bouton rendrait ces
 * lignes muettes et interdirait de corriger une saisie faite par erreur.
 */
export function shouldOfferCommissionPaidToggle(
  request: { outcome?: string | null; commission_paid_at?: string | null },
  hasInvoice: boolean,
): boolean {
  if (request.outcome !== "rented") return false;
  return hasInvoice || request.commission_paid_at != null;
}

const FAILURE_MESSAGES: Record<string, string> = {
  partner_without_email:
    "Loueur sans email : sa facture ne peut être envoyée à personne. Renseignez son email, puis réémettez.",
  invoice_creation_failed:
    "La facture n'a pas pu être créée : rien n'a été envoyé, réessayez dans quelques minutes.",
  invoice_without_token:
    "Une facture existe déjà sans lien de paiement exploitable : utilisez « Renvoyer », qui régénère le lien.",
  invoice_mail_refused:
    "Facture créée et numérotée, mais l'email a été refusé : utilisez « Renvoyer la facture », le numéro ne bougera pas.",
  invoice_sent_not_recorded:
    "Facture envoyée au loueur, mais l'envoi n'a pas pu être enregistré : elle restera affichée « jamais envoyée », ne la réémettez pas.",
  lock_write_failed:
    "La base a refusé de poser le verrou de facturation : rien n'a été émis, réessayez dans quelques minutes.",
};

/**
 * Ce que l ecran doit dire du resultat d une emission manuelle. `null` sur un
 * succes : la facture et son numero apparaissent d eux-memes sur la ligne, et
 * un bandeau qui redit ce que l ecran montre deja est du bruit.
 */
export function commissionOutcomeMessage(outcome: CommissionOutcome): string | null {
  switch (outcome.status) {
    case "requested":
      return null;
    case "disabled":
      // Etat NORMAL tant que le systeme n est pas arme : rien n est lu, rien
      // n est ecrit. Sans message, l ecran serait identique avant et apres le
      // clic, et le silence passerait pour une panne.
      return "Facturation de commission désarmée (CAR_COMMISSION_ENABLED) : aucune facture n'a été émise.";
    case "skipped":
      return "Rien à facturer sur cette demande : elle n'est pas louée, la commission est déjà encaissée ou le loueur a déjà ouvert un paiement, ou le montant est sous le minimum encaissable.";
    case "already_requested":
      return "Une demande de commission est déjà partie sur cette location : rien n'a été réémis.";
    case "partner_identity_incomplete":
      return `Facture non émise : fiche loueur incomplète (${missingIdentityLabels(outcome.missing).join(", ")}). Complétez-la dans l'onglet Partenaires, puis réémettez.`;
    case "failed":
      return (
        FAILURE_MESSAGES[outcome.code] ??
        `La facturation a échoué (${outcome.code}) : rien n'a été envoyé au loueur.`
      );
  }
}
