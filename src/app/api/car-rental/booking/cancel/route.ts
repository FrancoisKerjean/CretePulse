// Annulation d'une réservation avec acompte par le client (tâche 11).
//
// Deux portes vers la même annulation : le jeton de réservation (page
// /car-booking, `{ token }`) ou le jeton d'offres (page /car-offer, lien des
// e-mails, `{ offerToken }`). Seul le hash du jeton de réservation est stocké :
// un e-mail ne peut renvoyer que vers la page d'offres (R43). Exactement un des
// deux, sinon 400.
//
// La règle (48 h, prise passée) et les écritures vivent dans cancelByClient.
// Plus gardée par CAR_BOOKING_ENABLED (R45) : une réservation avec acompte
// n'existe que si l'interrupteur de l'acompte était allumé.
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/car-quote";
import { cancelByClient } from "@/lib/car-deposit-server";

const nonEmpty = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const fields = body !== null && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  const token = nonEmpty(fields.token);
  const offerToken = nonEmpty(fields.offerToken);
  if ((token === null) === (offerToken === null)) {
    return NextResponse.json({ ok: false, error: "Send exactly one of token or offerToken" }, { status: 400 });
  }

  const { data: row, error } = await supabaseAdmin
    .from("car_requests")
    .select("id")
    .eq(token !== null ? "booking_token_hash" : "accept_token_hash", hashToken(token ?? offerToken ?? ""))
    .maybeSingle();
  if (error) {
    console.error("[car/booking/cancel] lecture refusée par la base", { error: error.message });
    return NextResponse.json({ ok: false, error: "Temporarily unavailable, try again in a few minutes" }, { status: 500 });
  }
  if (!row) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const requestId = (row as { id: number }).id;
  let out: Awaited<ReturnType<typeof cancelByClient>>;
  try {
    out = await cancelByClient(requestId, Date.now());
  } catch (err) {
    console.error("[car/booking/cancel] annulation en échec", { requestId, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ ok: false, error: "Temporarily unavailable, try again in a few minutes" }, { status: 500 });
  }

  if ("error" in out) {
    if (out.error === "not_cancellable") return NextResponse.json({ ok: false, notCancellable: true }, { status: 409 });
    // Stripe a refusé : rien n'est annulé (prise de main défaite), ops est prévenu.
    return NextResponse.json({ ok: false, error: "Refund temporarily unavailable, try again in a few minutes" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, refundedEur: out.refundedEur, status: out.status });
}
