import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { isBlockedCrawler } from "./lib/crawler-policy";

const intlMiddleware = createMiddleware(routing);

// Normalise un pathname vers sa forme ASCII : NFKD deburr des accents (e-aigu -> e)
// puis suppression de tout codepoint > 127 (apostrophe U+2019, lettres grecques,
// emoji...). Meme transform que la migration des slugs cb_places
// (20260712_cb_places_ascii_slugs). Retourne null si deja ASCII ou URL malformee.
// Implementation volontairement sans caractere non-ASCII dans la source.
function toAsciiPath(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // % malforme (scan bot) : laisse next-intl gerer
  }
  let hasNonAscii = false;
  for (let i = 0; i < decoded.length; i++) {
    if (decoded.charCodeAt(i) > 127) {
      hasNonAscii = true;
      break;
    }
  }
  if (!hasNonAscii) return null; // deja ASCII : cout nul

  const ascii = Array.from(decoded.normalize("NFKD"))
    .filter((ch) => ch.charCodeAt(0) <= 127)
    .join("")
    .replace(/-{2,}/g, "-");
  return ascii !== decoded ? ascii : null;
}

// Blocage geo Chine. Une vague de bots datacenter chinois (Direct, Desktop, 0 s
// de duree, pageviews en rafale sur les pages /XX/buses) a pollue Plausible avec
// ~6 400 faux visiteurs sur 30 j depuis le 03/07/2026 (+57 % de bruit) et
// consommait des invocations Vercel. La Chine n'est pas un marche pour un guide
// bus/voiture en Crete : le trafic legitime residuel etait < 10/j avant la vague.
// On coupe a la porte. Header x-vercel-ip-country injecte par Vercel sur chaque
// requete (absent en local/preview sans edge network -> laisse passer). Reversible :
// supprimer ce garde et reexporter createMiddleware(routing) directement.
export default function middleware(request: NextRequest) {
  if (request.headers.get("x-vercel-ip-country") === "CN") {
    return new NextResponse(null, { status: 403 });
  }
  // Blocage des crawlers commerciaux (01/08/2026). Meme logique que le garde CN,
  // sur le critere user-agent : cf src/lib/crawler-policy.ts pour la liste, la
  // mesure et ce qui reste volontairement autorise. C'est ICI que le blocage
  // rapporte, pas dans robots.txt : un 403 rendu par le middleware n'atteint
  // jamais la page, donc ne declenche ni ecriture ISR ni invocation facturee, et
  // vaut aussi pour les agents qui ignorent robots.txt.
  if (isBlockedCrawler(request.headers.get("user-agent"))) {
    return new NextResponse(null, { status: 403 });
  }
  // Un slug non-ASCII casse le header interne x-next-cache-tags de Next -> 500 sur
  // /explore/[slug] et consorts. On redirige 308 vers la forme ASCII (canonique en
  // base). Couvre les URLs deja indexees par Google + tout futur import non normalise.
  const asciiPath = toAsciiPath(request.nextUrl.pathname);
  if (asciiPath) {
    const url = request.nextUrl.clone();
    url.pathname = asciiPath;
    return NextResponse.redirect(url, 308);
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
