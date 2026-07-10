// Auth du back-office /admin/activities : secret unique CAR_ADMIN_SECRET
// (env Vercel, ≥ 24 caractères sinon tout est refusé : la route auth est un
// oracle non throttlé, la force du secret est le seul rempart), accepté en
// query (?key=) pour l'entrée, puis porté par un cookie httpOnly posé par la
// route auth/. Le cookie contient un jeton DÉRIVÉ (HMAC), jamais le secret :
// un cookie volé ne révèle pas la clé d'entrée, et bumper le label v1 révoque
// tous les cookies sans changer le secret. Server-only (next/headers).
//
// CONVENTION : pas de garde middleware sur /admin/*, CHAQUE page et server
// action sous src/app/admin/ DOIT appeler isActivityAdmin() et refuser sinon.
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ACTIVITY_ADMIN_COOKIE = "activity_admin";
export const ACTIVITY_ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours
const MIN_SECRET_LENGTH = 24;

export const secretOk = (s: string | undefined): s is string =>
  typeof s === "string" && s.length >= MIN_SECRET_LENGTH;

/** Jeton porté par le cookie : HMAC du label par le secret. */
export const cookieToken = (secret: string): string =>
  createHmac("sha256", secret).update("activity-admin-cookie-v1").digest("hex");

// Comparaison constant-time via digests (longueurs égales garanties).
const digest = (s: string): Buffer => createHash("sha256").update(s).digest();
const safeEq = (a: string, b: string): boolean => timingSafeEqual(digest(a), digest(b));

export async function isActivityAdmin(queryKey?: string | null): Promise<boolean> {
  const secret = process.env.CAR_ADMIN_SECRET;
  if (!secretOk(secret)) return false;
  // ?key= valide = ENTRÉE seulement : la page doit rediriger vers auth/
  // (qui pose le cookie), jamais rendre, sinon le secret reste dans
  // l'historique/le bookmark à chaque visite.
  if (queryKey && safeEq(queryKey, secret)) return true;
  const v = (await cookies()).get(ACTIVITY_ADMIN_COOKIE)?.value;
  return !!v && safeEq(v, cookieToken(secret));
}
