// Entree du cockpit Stays : /admin/stays/auth?key=<CAR_ADMIN_SECRET>
// Meme secret et meme cookie que /admin/car-rental et /admin/flux : un seul
// mot de passe pour tout le back-office, cookie httpOnly 30 j sur /admin.
// Mauvaise cle ou secret absent : 404, on ne revele pas l'existence de l'admin.
import { NextRequest, NextResponse } from "next/server";
import {
  CAR_ADMIN_COOKIE,
  CAR_ADMIN_COOKIE_MAX_AGE,
  cookieToken,
  isCarAdmin,
  secretOk,
} from "@/lib/car-admin-auth";

export async function GET(request: NextRequest) {
  const secret = process.env.CAR_ADMIN_SECRET;
  const key = request.nextUrl.searchParams.get("key");
  if (!secretOk(secret) || !(await isCarAdmin(key))) {
    return new NextResponse(null, { status: 404 });
  }
  const res = NextResponse.redirect(new URL("/admin/stays", request.url));
  res.cookies.set(CAR_ADMIN_COOKIE, cookieToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CAR_ADMIN_COOKIE_MAX_AGE,
    path: "/admin",
  });
  return res;
}
