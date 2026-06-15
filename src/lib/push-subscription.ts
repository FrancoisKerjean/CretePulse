// src/lib/push-subscription.ts
// Fonctions pures de validation/normalisation d'un abonnement web push.
// Utilisées par les API routes /api/push/* (côté serveur). Testées par
// scripts/check-push-subscription.mjs (Node >= 23, type-stripping).

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export type PushTopic = "bus_alerts" | "urgent_news";
const VALID_TOPICS: PushTopic[] = ["bus_alerts", "urgent_news"];
const TRANSLATED_LOCALES = ["en", "fr", "de", "el"];

/** Valide la forme brute reçue du navigateur. Renvoie null si invalide. */
export function parseSubscription(raw: unknown): PushSubscriptionJSON | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const endpoint = o.endpoint;
  const keys = o.keys as Record<string, unknown> | undefined;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2048) return null;
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return null;
  // Rejet des chaines vides + bornage : evite le bloat de table et les cles invalides.
  if (!keys.p256dh || !keys.auth || keys.p256dh.length > 512 || keys.auth.length > 512) return null;
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

/** Ne garde que les topics connus ; défaut = les deux. */
export function normaliseTopics(raw: unknown): PushTopic[] {
  if (!Array.isArray(raw)) return [...VALID_TOPICS];
  const t = raw.filter((x): x is PushTopic => VALID_TOPICS.includes(x as PushTopic));
  return t.length ? t : [...VALID_TOPICS];
}

/** Normalise vers une des 4 langues traduites, sinon "en". */
export function normaliseLocale(raw: unknown): string {
  return typeof raw === "string" && TRANSLATED_LOCALES.includes(raw) ? raw : "en";
}
