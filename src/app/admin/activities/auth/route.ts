// Entrée du back-office : /admin/activities/auth?key=<CAR_ADMIN_SECRET>
// → cookie httpOnly 30 j (jeton dérivé, pas le secret) + redirect vers la
// page. Mauvaise clé ou secret faible/absent → 404 (on ne révèle pas
// l'existence de l'admin). La page redirige ici quand elle reçoit ?key=
// valide, pour sortir la clé de l'URL courante.
import { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_ADMIN_COOKIE, ACTIVITY_ADMIN_COOKIE_MAX_AGE, cookieToken, isActivityAdmin, secretOk } from "@/lib/activity-admin-auth";

export async function GET(request: NextRequest) {
  const secret = process.env.CAR_ADMIN_SECRET;
  const key = request.nextUrl.searchParams.get("key");
  if (!secretOk(secret) || !(await isActivityAdmin(key))) {
    return new NextResponse(null, { status: 404 });
  }
  const res = NextResponse.redirect(new URL("/admin/activities", request.url));
  res.cookies.set(ACTIVITY_ADMIN_COOKIE, cookieToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ACTIVITY_ADMIN_COOKIE_MAX_AGE,
    path: "/admin",
  });
  return res;
}
