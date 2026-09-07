// Le loueur dit si la location a eu lieu. POST uniquement : les liens de
// l'email pointent vers la PAGE /en/rental-outcome/[token], qui affiche et
// dont le seul bouton poste ici. Un GET qui écrirait ferait poser des issues
// par les scanners de liens des messageries (Safe Links, aperçus).
//
// Pas de JavaScript requis côté loueur : formulaire HTML, redirection 303
// vers la même page, comme commission/checkout/route.ts.
import { NextRequest, NextResponse } from "next/server";
import { requestByOutcomeToken, handleOutcomeClick } from "@/lib/car-outcome-server";
import { invoiceForRequest } from "@/lib/car-invoice-server";
import { OUTCOME_CHOICES, type OutcomeChoice } from "@/lib/car-outcome-followup";
import { siteBase } from "@/lib/car-commission";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "").trim();
  const choice = String(form.get("choice") ?? "");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
  if (!(OUTCOME_CHOICES as readonly string[]).includes(choice)) {
    return NextResponse.json({ error: "invalid_choice" }, { status: 400 });
  }

  const row = await requestByOutcomeToken(token);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const invoice = await invoiceForRequest(row.id);
  const result = await handleOutcomeClick(row, invoice, choice as OutcomeChoice);

  return NextResponse.redirect(
    `${siteBase()}/en/rental-outcome/${encodeURIComponent(token)}?result=${result}`,
    303,
  );
}
