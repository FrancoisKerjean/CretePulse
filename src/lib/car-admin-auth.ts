// Auth du back-office /admin/car-rental : secret unique CAR_ADMIN_SECRET
// (env Vercel), accepté en query (?key=) pour l'entrée, puis porté par un
// cookie httpOnly posé par la route auth/. Server-only (next/headers).
// Sans secret configuré → toujours refusé (la page 404, pas de page de login).
import { cookies } from "next/headers";

export const CAR_ADMIN_COOKIE = "car_admin";
export const CAR_ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export async function isCarAdmin(queryKey?: string | null): Promise<boolean> {
  const secret = process.env.CAR_ADMIN_SECRET;
  if (!secret) return false;
  if (queryKey && queryKey === secret) return true;
  const jar = await cookies();
  return jar.get(CAR_ADMIN_COOKIE)?.value === secret;
}
