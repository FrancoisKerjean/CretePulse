// Réponse du loueur à une réservation payée : « Confirm » ou « Not available »,
// depuis les boutons de /car-confirm/{jeton}.
//
// ⛔ POST seulement. La page ne fait que lire : les antivirus de messagerie
// ouvrent les liens des e-mails, une action en GET confirmerait ou refuserait à
// la place du loueur.
//
// La réponse donne toujours l'état RELU après l'action, jamais celui que le clic
// visait : un « Confirm » arrivé après le remboursement automatique, un double
// clic, ou « Confirm » puis « Not available » ne bougent rien, et le loueur voit
// ce qui est vrai.
import { NextRequest, NextResponse } from "next/server";
import { bookingByConfirmToken, confirmBooking, releaseBooking } from "@/lib/car-deposit-server";
import { partnerViewState } from "@/lib/car-deposit";

const unavailable = () =>
  NextResponse.json({ ok: false, error: "Temporarily unavailable, please try again in a few minutes." }, { status: 503 });

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  // null, tableau, nombre ou chaîne : JSON valide, mais pas une requête.
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const { token: rawToken, decision } = body as Record<string, unknown>;
  const token = typeof rawToken === "string" ? rawToken : "";
  if (!token || (decision !== "confirm" && decision !== "decline")) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  try {
    const booking = await bookingByConfirmToken(token);
    if (!booking) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    if (decision === "confirm") {
      await confirmBooking(booking.id, "partner");
    } else if ((await releaseBooking(booking.id, "partner_declined", Date.now())) === "refund_failed") {
      // Remboursement refusé par Stripe : la réservation est remise en attente
      // et ops est prévenu. Le loueur peut réessayer.
      return unavailable();
    }

    const after = await bookingByConfirmToken(token);
    return NextResponse.json({
      ok: true,
      state: partnerViewState(after?.booking_status ?? null, after?.refund_reason ?? null),
    });
  } catch (err) {
    console.error("[car/confirm] réponse du loueur non traitée", {
      decision,
      error: err instanceof Error ? err.message : String(err),
    });
    return unavailable();
  }
}
