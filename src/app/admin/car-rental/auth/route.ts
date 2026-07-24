// Entrée du back-office : /admin/car-rental/auth?key=<CAR_ADMIN_SECRET>
// → cookie httpOnly 30 j (jeton dérivé, pas le secret) + redirect vers la
// page. Mauvaise clé ou secret faible/absent → 404 (on ne révèle pas
// l'existence de l'admin). La page redirige ici quand elle reçoit ?key=
// valide, pour sortir la clé de l'URL courante.
import { NextRequest, NextResponse } from "next/server";
import { CAR_ADMIN_COOKIE, CAR_ADMIN_COOKIE_MAX_AGE, cookieToken, isCarAdmin, secretOk } from "@/lib/car-admin-auth";

export async function GET(request: NextRequest) {
  const secret = process.env.CAR_ADMIN_SECRET;
  const key = request.nextUrl.searchParams.get("key");
  if (!secretOk(secret) || !(await isCarAdmin(key))) {
    return new NextResponse(null, { status: 404 });
  }
  const res = NextResponse.redirect(new URL("/admin/car-rental", request.url));
  res.cookies.set(CAR_ADMIN_COOKIE, cookieToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CAR_ADMIN_COOKIE_MAX_AGE,
    path: "/admin",
  });
  return res;
}
