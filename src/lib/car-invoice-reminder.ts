// Relance de facture de commission : J+15 email, J+30 ops. Implémentée en
// tâche 7 du plan 2026-09-07-car-outcome-followup ; ce stub tient tsc.
export interface InvoiceReminderResult {
  reminded: number;
  overdue: number;
}

export async function runInvoiceReminderPass(_now: Date): Promise<InvoiceReminderResult> {
  return { reminded: 0, overdue: 0 };
}
