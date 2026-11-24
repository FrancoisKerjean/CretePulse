// Décision d'envoi du mail de confirmation newsletter : pure, sans I/O.
//
// Du 17 au 24/11/2026, des robots ont inscrit ~150 adresses d'inconnus
// (« subscription bombing » : noyer la boîte d'une victime sous des mails de
// confirmation). Chaque inscription partait en mail depuis hello@crete.direct,
// sur le compte Resend partagé avec Race Care : 10 rejets et 2 plaintes pour
// spam en une semaine. Le contrôle anti-robot (BotID) est la première ligne ;
// ces deux règles bornent les dégâts s'il laisse passer un robot.

/** Une même adresse ne reçoit pas deux mails de confirmation en 7 jours. */
export const CONFIRMATION_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// SHORTCUT: plafond global de 8 mails de confirmation par 24 h glissantes (record
// réel avant l'attaque : 4 inscriptions en un jour). Au-delà, l'inscription est
// ignorée en silence, humain compris. À relever si les vraies inscriptions
// dépassent 4 par jour plusieurs jours d'affilée (saison, campagne).
export const DAILY_CONFIRMATION_CAP = 8;

export interface ExistingSubscriber {
  confirmed: boolean;
  unsubscribed_at: string | null;
  subscribed_at: string | null;
}

export type SignupDecision =
  | "already_subscribed" // abonné actif : rien à faire
  | "recently_sent" // confirmation déjà envoyée il y a moins de 7 jours
  | "daily_cap" // plafond global atteint
  | "send"; // (ré)inscrire et envoyer la confirmation

export function signupDecision(opts: {
  existing: ExistingSubscriber | null;
  sentLast24h: number;
  now?: number;
}): SignupDecision {
  const { existing, sentLast24h, now = Date.now() } = opts;
  if (existing) {
    if (existing.confirmed && !existing.unsubscribed_at) return "already_subscribed";
    const at = existing.subscribed_at ? Date.parse(existing.subscribed_at) : NaN;
    if (!existing.confirmed && !existing.unsubscribed_at && now - at < CONFIRMATION_COOLDOWN_MS) {
      return "recently_sent";
    }
  }
  if (sentLast24h >= DAILY_CONFIRMATION_CAP) return "daily_cap";
  return "send";
}
