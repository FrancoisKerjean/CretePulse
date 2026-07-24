// Best-effort Telegram ping on a new affiliate signup. Outbound sendMessage only.
// Falls back silently if no bot token/chat is configured (signup still succeeds).

export interface SignupNotice {
  name: string;
  category: string;
  area: string | null;
  email: string;
  link: string;
}

export async function notifyNewAffiliate(n: SignupNotice): Promise<void> {
  const token = process.env.AFFILIATE_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.AFFILIATE_CHAT_ID || process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[affiliate-notify] no bot token/chat configured; skipping notification");
    return;
  }
  const text =
    `🤝 New affiliate signup\n` +
    `${n.name} · ${n.category}${n.area ? " · " + n.area : ""}\n` +
    `${n.email}\n${n.link}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("[affiliate-notify] sendMessage failed:", e);
  }
}
