// La session Stripe naît ICI, au clic du loueur sur sa facture, et jamais dans
// le cron : une session Checkout expire en 24 h.
import { NextRequest, NextResponse } from "next/server";
import { ensureCommissionCheckout } from "@/lib/car-commission-server";

export const dynamic = "force-dynamic";

// Les codes que le loueur peut provoquer lui-même. Tout le reste (Stripe en
// panne, session sans url, loueur sans email) tombe en 502 : ce n'est pas sa
// faute et il peut réessayer plus tard.
const STATUS: Record<string, number> = {
  not_found: 404,
  already_paid: 409,
  credited: 409,
};

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const res = await ensureCommissionCheckout(token);
  if ("url" in res) return NextResponse.redirect(res.url, 303);
  return NextResponse.json({ error: res.error }, { status: STATUS[res.error] ?? 502 });
}
