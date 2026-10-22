import { NextRequest, NextResponse } from "next/server";
import { validateProjetLead } from "@/lib/projet-lead";

// Dedup best-effort en memoire (reset au cold start, suffisant contre le double-clic).
const recent = new Map<string, number>();
const TEN_MIN = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const v = validateProjetLead(body);
  if (v.kind === "honeypot") return NextResponse.json({ ok: true });
  if (v.kind === "error") return NextResponse.json({ error: v.error }, { status: v.status });
  const { lead } = v;

  const key = `${lead.kind}:${lead.email}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < TEN_MIN) return NextResponse.json({ ok: true });
  recent.set(key, now);

  try {
    const { sendProjetLeadEmail } = await import("@/lib/email");
    await sendProjetLeadEmail(lead);
    const hook = process.env.CRETEDIRECT_LEAD_WEBHOOK;
    if (hook) {
      // notif best-effort, ne bloque pas la reponse
      fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lead) }).catch(() => {});
    }
  } catch (e) {
    console.error("[projet-lead] email error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
