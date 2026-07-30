// Politique commune d'annulation et de versement, villa et voiture.
//
// Deux decisions Kami du 29/07/2026, prises ensemble parce que l'une ne tient
// pas sans l'autre :
//
// 1. VERSEMENT DIFFERE. L'argent du voyageur reste sur le compte crete.direct
//    jusqu'a TRANSFER_LEAD_DAYS avant le debut de la prestation, puis part au
//    partenaire, commission deduite. Rembourser ne demande alors de reprendre
//    d'argent a personne. C'est l'inverse du schema « charge de destination »,
//    ou les fonds partent des l'encaissement et ou toute annulation oblige a un
//    `reverse_transfer` qui peut mettre le partenaire en solde negatif.
//    Contrepartie assumee : crete.direct porte les fonds entre l'encaissement et
//    le versement, ce qui est une position d'encaisseur au sens comptable.
//
// 2. ANNULATION PAYANTE. Sans l'option a CANCELLATION_OPTION_EUR, aucune
//    annulation n'est remboursee, quelle que soit la date. Avec l'option, le
//    remboursement est integral jusqu'a 48 h avant le debut, et nul ensuite.
//
// ATTENTION : cette politique vise le tunnel VOITURE, qui n'est pas encore
// lance. Stays annonce publiquement une autre grille dans ses conditions et ses
// emails (100 % au-dela de 14 jours, 50 % entre 2 et 14 jours), tenue par
// src/lib/stays/cancellation.ts. On ne change pas une promesse deja affichee a
// des voyageurs : les deux coexistent tant que les conditions Stays n'ont pas
// ete revues explicitement.

/** Prix de l'option d'annulation, en euros. Ce n'est PAS une assurance : c'est une
 *  condition tarifaire du service. Le mot « assurance » engagerait une activite
 *  reglementee d'intermediation, que crete.direct n'exerce pas. */
export const CANCELLATION_OPTION_EUR = 5;

/** Fenetre de remboursement offerte par l'option, en heures avant le debut. */
export const REFUND_WINDOW_HOURS = 48;

/**
 * Delai, en heures, entre le versement au partenaire et le debut de la
 * prestation. Volontairement EGAL a REFUND_WINDOW_HOURS, pas superieur : le
 * versement a lieu exactement quand le droit au remboursement s'eteint. Un seul
 * seuil, donc aucun intervalle ou l'argent serait deja parti chez le partenaire
 * alors que le voyageur peut encore etre rembourse. Un premier jet plaçait le
 * versement a J-3 et le remboursement a J-2 : il ouvrait 24 h de reprise de
 * fonds, exactement ce que le versement differe existe pour supprimer.
 */
export const TRANSFER_LEAD_HOURS = REFUND_WINDOW_HOURS;

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface RefundInput {
  /** Le voyageur a-t-il paye l'option d'annulation ? */
  hasOption: boolean;
  /** Heures restantes avant le debut. Negatif si la prestation a commence. */
  hoursUntilStart: number;
  /** TOTAL paye par le voyageur, option d'annulation comprise. */
  amountPaidEur: number;
}

export function refundDueEur(input: RefundInput): number {
  if (!input.hasOption) return 0;
  // Borne inclusive : a exactement 48 h, le voyageur est encore rembourse.
  if (input.hoursUntilStart < REFUND_WINDOW_HOURS) return 0;
  return round2(Math.max(0, input.amountPaidEur));
}

/** Instant ou les fonds doivent partir au partenaire, en ISO 8601 UTC. */
export function transferDueAt(dateFrom: string, leadHours: number = TRANSFER_LEAD_HOURS): string {
  const start = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
  return new Date(start - leadHours * 3_600_000).toISOString();
}

export interface TransferInput {
  dateFrom: string;
  /** Instant courant, ISO. Injecte pour rester testable. */
  now: string;
  /** Horodatage d'annulation. Une reservation annulee n'est jamais versee. */
  cancelledAt?: string | null;
  /** Identifiant du transfert deja effectue. Garde d'idempotence. */
  transferId?: string | null;
  leadHours?: number;
}

export function shouldTransferNow(input: TransferInput): boolean {
  if (input.cancelledAt) return false;
  if (input.transferId) return false;
  const due = new Date(transferDueAt(input.dateFrom, input.leadHours ?? TRANSFER_LEAD_HOURS)).getTime();
  // `>=` et non une fenetre : un cron tombe en panne plusieurs jours doit
  // rattraper les versements en retard, pas les perdre.
  return new Date(input.now).getTime() >= due;
}
