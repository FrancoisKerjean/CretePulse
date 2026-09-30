// Jeton du lien de désinscription newsletter : `v1.<email en base64url>.<HMAC>`.
// Jusqu'au 30/09/2026 le lien portait l'email seul en base64 : n'importe qui pouvait
// désinscrire n'importe quelle adresse, et l'adresse se lisait dans l'URL.
//
// Clé : SUPABASE_SERVICE_KEY, déjà présente partout où la newsletter s'envoie et se
// résilie, séparée des autres usages par le label. La changer invalide les liens déjà
// envoyés : l'ancien lien renvoie alors une erreur, la lettre suivante porte le bon.
import { createHash, createHmac, timingSafeEqual } from "crypto";

const LABEL = "newsletter-unsubscribe-v1";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultKey = (): string => process.env.SUPABASE_SERVICE_KEY || "";

const sign = (email: string, key: string): string =>
  createHmac("sha256", key).update(`${LABEL}:${email}`).digest("base64url");
const digest = (s: string): Buffer => createHash("sha256").update(s).digest();

export function unsubscribeToken(email: string, key: string = defaultKey()): string {
  if (!key) throw new Error("newsletter : aucune clé pour signer le lien de désinscription");
  const e = email.trim().toLowerCase();
  return `v1.${Buffer.from(e).toString("base64url")}.${sign(e, key)}`;
}

// SHORTCUT: les liens base64 non signés d'avant le 01/10/2026 restent acceptés jusqu'au
// 31/10/2026 (quatre lettres hebdomadaires portent le nouveau lien d'ici là) ; au-delà,
// supprimer cette branche et LEGACY_UNTIL.
const LEGACY_UNTIL = Date.parse("2026-11-01T00:00:00Z");

/** L'adresse à désinscrire, ou null si le jeton n'est pas valide. */
export function emailFromUnsubscribeToken(
  token: string, key: string = defaultKey(), now: number = Date.now(),
): string | null {
  const m = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (m) {
    if (!key) return null;
    const email = Buffer.from(m[1], "base64url").toString("utf-8");
    if (!EMAIL.test(email)) return null;
    return timingSafeEqual(digest(m[2]), digest(sign(email, key))) ? email : null;
  }
  if (now >= LEGACY_UNTIL || token.startsWith("v1.")) return null;
  const email = Buffer.from(token, "base64").toString("utf-8").trim().toLowerCase();
  return EMAIL.test(email) ? email : null;
}
