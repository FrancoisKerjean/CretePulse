// Paiement de l'acompte d'une offre choisie (catalogue et acompte, spec
// 2026-11-25 sections 7 et 8). Stripe Checkout sur le compte plateforme, sans
// Connect : le client paie l'acompte ici et le reste au comptoir du loueur.
//
// Le montant est celui figé sur la demande par startDeposit (`deposit_eur`),
// JAMAIS recalculé depuis la grille : un loueur qui change ses prix entre le
// choix et le paiement ne change pas ce que paie le client.
//
// Pas d'interrupteur ici : une demande n'a de `deposit_eur` que si startDeposit
// est passé, donc interrupteur allumé. Sans lui, la route refuse (notReady).
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeClient } from "@/lib/stays/stripe-helpers";
import { hashToken } from "@/lib/car-quote";
import { buildDepositCheckoutParams, isDepositBookable } from "@/lib/car-deposit";
import { STRIPE_MIN_CHARGE_EUR } from "@/lib/car-commission";
import { assertWritten } from "@/lib/car-invoice-server";
import { classifyStripeFailure, stripeLogFields } from "@/lib/stripe-errors";

const conflict = (flags: Record<string, unknown>) =>
  NextResponse.json({ ok: false, ...flags }, { status: 409 });

/** URL de la session encore payable, pour que la page propose « reprendre le paiement ». */
async function openCheckoutUrl(sessionId: string | null): Promise<string | null> {
  if (!sessionId) return null;
  try {
    const s = await stripeClient().checkout.sessions.retrieve(sessionId);
    return s.status === "open" && s.url ? s.url : null;
  } catch (err) {
    console.error("[car/deposit] session illisible", { sessionId, ...stripeLogFields(err) });
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  // La locale finit dans les URLs de retour de Stripe : deux lettres ou rien.
  const locale = typeof body.locale === "string" && /^[a-z]{2}$/.test(body.locale) ? body.locale : "en";

  const { data: row, error: readError } = await supabaseAdmin
    .from("car_requests")
    .select(
      "id, status, booking_status, booking_session_id, deposit_eur, partner_name, quoted_car_model, customer_email, date_from, date_to, time_from",
    )
    .eq("booking_token_hash", hashToken(token))
    .maybeSingle();
  if (readError) {
    console.error("[car/deposit] lecture de la demande refusée", { error: readError.message });
    return NextResponse.json({ ok: false, error: "Unavailable" }, { status: 503 });
  }
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const deposit = row.deposit_eur == null ? NaN : Number(row.deposit_eur);
  if (!Number.isFinite(deposit) || deposit < STRIPE_MIN_CHARGE_EUR) return conflict({ notReady: true });

  if (row.booking_status === "pending_payment") {
    const checkoutUrl = await openCheckoutUrl(row.booking_session_id);
    return conflict({ inProgress: true, ...(checkoutUrl ? { checkoutUrl } : {}) });
  }
  // Payé, en attente du loueur, confirmé, remboursé ou acompte gardé : on ne
  // représente jamais de session.
  if (row.booking_status != null) return conflict({ alreadySettled: true });
  if (row.status !== "quoted") return conflict({ notReady: true });

  const nowMs = Date.now();
  // La page peut être rouverte des heures après le choix : on rejuge ici.
  if (!isDepositBookable(nowMs, row.date_from, row.time_from)) return conflict({ tooClose: true });

  // Verrou optimiste AVANT l'appel Stripe : deux clics sur « payer » ne créent
  // pas deux sessions, donc pas deux prélèvements possibles.
  const { data: locked, error: lockError } = await supabaseAdmin
    .from("car_requests")
    .update({ booking_status: "pending_payment" })
    .eq("id", row.id)
    .eq("status", "quoted")
    .is("booking_status", null)
    .select("id");
  if (lockError) {
    console.error("[car/deposit] verrou refusé par la base", { requestId: row.id, error: lockError.message });
    return NextResponse.json({ ok: false, error: "Unavailable" }, { status: 503 });
  }
  if (!locked || locked.length === 0) return conflict({ inProgress: true });

  // Ne relâche que NOTRE verrou : un état posé entre-temps par le webhook reste.
  const releaseLock = async () => {
    const { error } = await supabaseAdmin
      .from("car_requests")
      .update({ booking_status: null })
      .eq("id", row.id)
      .eq("booking_status", "pending_payment")
      .select("id");
    if (error) {
      console.error("[car/deposit] verrou NON relâché, demande bloquée en pending_payment", {
        requestId: row.id,
        error: error.message,
      });
    }
  };

  let session: { id: string; url: string | null };
  try {
    session = await stripeClient().checkout.sessions.create(
      buildDepositCheckoutParams({
        requestId: row.id,
        customerEmail: row.customer_email,
        depositEur: deposit,
        partnerName: row.partner_name ?? "",
        carLabel: row.quoted_car_model ?? "Car rental",
        dateFrom: row.date_from,
        dateTo: row.date_to,
        bookingToken: token,
        locale,
        nowMs,
      }),
    );
  } catch (err) {
    const failure = classifyStripeFailure(err);
    console.error("[car/deposit] session de paiement refusée", {
      requestId: row.id,
      failure: failure.code,
      ...stripeLogFields(err),
    });
    // Le client doit pouvoir réessayer : sans cela sa demande resterait
    // bloquée en pending_payment sans session.
    await releaseLock();
    return NextResponse.json({ ok: false, code: failure.code, error: failure.message }, { status: failure.status });
  }

  try {
    const { error } = await supabaseAdmin
      .from("car_requests")
      .update({ booking_session_id: session.id })
      .eq("id", row.id)
      .select("id");
    assertWritten("booking_session_id", row.id, error);
  } catch (err) {
    // Sans l'identifiant en base, un paiement sur cette session serait pris
    // pour une session étrangère et remboursé : on ne la donne pas au client,
    // on la ferme et on rend la main.
    console.error("[car/deposit] identifiant de session non écrit", {
      requestId: row.id,
      sessionId: session.id,
      error: err instanceof Error ? err.message : String(err),
    });
    try {
      await stripeClient().checkout.sessions.expire(session.id);
    } catch (expireErr) {
      console.error("[car/deposit] session non fermée", { sessionId: session.id, ...stripeLogFields(expireErr) });
    }
    await releaseLock();
    return NextResponse.json(
      { ok: false, code: "payment_provider", error: "Payment temporarily unavailable" },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, url: session.url });
}
