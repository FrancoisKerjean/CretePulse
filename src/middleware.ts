import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

// IMPORTANT: matcher MUST exclude sitemap.xml, robots.txt, feed.xml, manifest, icons,
// and anything containing a dot (static assets). The previous `.*\\..*` clause was
// being shadowed by next-intl's locale routing which captured /sitemap.xml as
// locale="sitemap.xml" and rendered the home in HTML at the sitemap URL.
// `go` is the non-localized affiliate tracking route (src/app/go/[slug]); without
// this exclusion next-intl rewrites /go/x to /en/go/x, which 404s and breaks every
// affiliate link.
export const config = {
  matcher: [
    "/((?!api|go|_next|_vercel|sitemap\\.xml|sitemap/|robots\\.txt|feed\\.xml|manifest|favicon\\.ico|icon|.*\\..*).*)",
  ],
};
