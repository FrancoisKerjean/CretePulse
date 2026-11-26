// Fenêtre de remboursement de l'acompte voiture, partagée par le parcours d'acompte
// (car-deposit.ts). L'ancien tunnel de paiement total (option d'annulation à 5 €,
// versement différé au loueur) a été retiré : il n'a jamais été activé.

/** Fenêtre de remboursement, en heures avant le début de la location. */
export const REFUND_WINDOW_HOURS = 48;
