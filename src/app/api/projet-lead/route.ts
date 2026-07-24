import { NextRequest, NextResponse } from "next/server";
import { validateProjetLead } from "@/lib/projet-lead";

// Dedup best-effort en memoire (reset au cold start, suffisant contre le double-clic).
const recent = new Map<string, number>();
const TEN_MIN = 10 * 60 * 1000;

// Notif Telegram best-effort vers le bot crete.direct (meme bot/canal que les crons VPS).
// Message court et actionnable ; le detail complet part par email (Resend).
function notifyTelegram(lead: {
  kind: string; name: string; email: string;
  org: string | null; company: string | null; message: string | null;
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return;
  const who = lead.org ?? lead.company ?? "";
  const text = [
    `🔔 Nouveau lead /projet (${lead.kind})`,
    `${lead.name}${who ? ` · ${who}` : ""}`,
    lead.email,
    lead.message ? lead.message.slice(0, 300) : "",
    `Detail complet dans l'email contact@kairosguest.com`,
  ].filter(Boolean).join("\n");
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch(() => {});
}

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
    notifyTelegram(lead);
  } catch (e) {
    console.error("[projet-lead] email error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
