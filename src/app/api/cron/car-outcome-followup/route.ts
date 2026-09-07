// Suivi d'issue après la fin de location et relance de facture de commission.
//
// 06:20 UTC = 09:20 Athènes : après le cron de facturation de 05:00 (une
// ligne facturée au J1 le matin même ne reçoit pas de question d'issue le
// même jour), heure ouvrable côté loueur, même jour civil UTC et Athènes.
// Route mince, pattern car-partner-nudge : assertCron, module serveur, JSON.
import { NextRequest, NextResponse } from "next/server";
import { assertCron } from "@/lib/cron-auth";
import { runOutcomeFollowupPass } from "@/lib/car-outcome-followup-server";
import { runInvoiceReminderPass } from "@/lib/car-invoice-reminder";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = assertCron(request);
  if (denied) return denied;

  const now = new Date();
  const outcome = await runOutcomeFollowupPass(now);
  const invoices = await runInvoiceReminderPass(now);
  return NextResponse.json({ ok: true, outcome, invoices });
}
