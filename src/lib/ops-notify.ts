// Remontée des événements d'exploitation vers le fil Telegram de Kami.
//
// Pourquoi ce fichier existe : `car-rental/quote` et `activities/quote` écrivent
// en base et envoient un email AU CLIENT, mais personne ne prévient Kami. Pour
// savoir qu'un devis est arrivé il faut ouvrir /admin/car-rental. Autrement dit
// l'écosystème à volume était muet là où de l'argent attend une action.
//
// Deux configurations sont acceptées, dans cet ordre :
//   1. le groupe forum unifié — TG_OPS_TOKEN + TG_OPS_CHAT_ID (+ TG_OPS_THREAD_ACTION),
//      qui pose le message dans le sujet ACTION, avec le reste de l'écosystème ;
//   2. l'ancien couple TELEGRAM_BOT_TOKEN + TG_CHAT_ID, déjà en place, pour que
//      la bascule ne casse rien tant que les variables Vercel ne sont pas posées.
//
// Le contrat d'un message qui sonne : dire ce qui s'est passé, ce qu'on attend,
// et pour quand. Sans ça il devient du bruit qu'on apprend à ignorer.

export interface OpsNotice {
  /** Ce qui s'est passé, en une ligne. */
  title: string;
  /** Les faits, une ligne chacun. */
  lines: string[];
  /** Ce qu'on attend de Kami. */
  action?: string;
  /** Échéance de cette action, format court (31/07). */
  due?: string;
  /** Lien pour agir directement. */
  url?: string;
  /** Silencieux : le message arrive mais ne sonne pas. */
  silent?: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveTarget(): { token: string; chatId: string; threadId?: string } | null {
  const opsToken = process.env.TG_OPS_TOKEN;
  const opsChat = process.env.TG_OPS_CHAT_ID;
  if (opsToken && opsChat) {
    return {
      token: opsToken,
      chatId: opsChat,
      threadId: process.env.TG_OPS_THREAD_ACTION || undefined,
    };
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (token && chatId) return { token, chatId };

  return null;
}

/**
 * Envoie une notification d'exploitation. Ne jette JAMAIS : l'appelant est une
 * route qui doit répondre 200 même si Telegram est indisponible.
 *
 * @returns true si le message est parti, false sinon.
 */
export async function notifyOps(n: OpsNotice): Promise<boolean> {
  const cible = resolveTarget();
  if (!cible) {
    console.warn("[ops-notify] aucun bot configuré, notification ignorée:", n.title);
    return false;
  }

  const parts = [`<b>${escapeHtml(n.title)}</b>`];
  const faits = n.lines.filter((l) => l && l.trim()).map(escapeHtml);
  if (faits.length) parts.push("", ...faits);

  const pied: string[] = [];
  if (n.action) pied.push(`➤ <b>À faire :</b> ${escapeHtml(n.action)}`);
  if (n.due) pied.push(`⏱ <b>Avant le</b> ${escapeHtml(n.due)}`);
  if (n.url) pied.push(n.url);
  if (pied.length) parts.push("", ...pied);

  const payload: Record<string, unknown> = {
    chat_id: cible.chatId,
    text: parts.join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    disable_notification: n.silent === true,
  };
  if (cible.threadId) payload.message_thread_id = cible.threadId;

  try {
    const r = await fetch(`https://api.telegram.org/bot${cible.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      console.error("[ops-notify] Telegram a refusé:", r.status, n.title);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[ops-notify] envoi impossible:", e);
    return false;
  }
}

/** Échéance courte au format JJ/MM, décalée de `joursApres` jours. */
export function echeance(joursApres = 1, maintenant = new Date()): string {
  const d = new Date(maintenant.getTime() + joursApres * 86400000);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
