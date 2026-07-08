import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Blocage géo Chine. Une vague de bots datacenter chinois (Direct, Desktop, 0 s
// de durée, pageviews en rafale sur les pages /XX/buses) a pollué Plausible avec
// ~6 400 faux visiteurs sur 30 j depuis le 03/07/2026 (+57 % de bruit) et
// consommait des invocations Vercel. La Chine n'est pas un marché pour un guide
// bus/voiture en Crète : le trafic légitime résiduel était < 10/j avant la vague.
// On coupe à la porte. Header x-vercel-ip-country injecté par Vercel sur chaque
// requête (absent en local/preview sans edge network → laisse passer). Réversible :
// supprimer ce garde et réexporter createMiddleware(routing) directement.
export default function middleware(request: NextRequest) {
  if (request.headers.get("x-vercel-ip-country") === "CN") {
    return new NextResponse(null, { status: 403 });
  }
  return intlMiddleware(request);
}

// IMPORTANT: matcher MUST exclude sitemap.xml, robots.txt, feed.xml, manifest, icons,
// and anything containing a dot (static assets). The previous `.*\\..*` clause was
// being shadowed by next-intl's locale routing which captured /sitemap.xml as
// locale="sitemap.xml" and rendered the home in HTML at the sitemap URL.
// `go` is the non-localized affiliate tracking route (src/app/go/[slug]); without
// this exclusion next-intl rewrites /go/x to /en/go/x, which 404s and breaks every
// affiliate link.
export const config = {
  matcher: [
    "/((?!api|admin|go|_next|_vercel|sitemap\\.xml|sitemap/|robots\\.txt|feed\\.xml|manifest|favicon\\.ico|icon|.*\\..*).*)",
  ],
};
