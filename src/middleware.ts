import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

// IMPORTANT: matcher MUST exclude sitemap.xml, robots.txt, feed.xml, manifest, icons,
// and anything containing a dot (static assets). The previous `.*\\..*` clause was
// being shadowed by next-intl's locale routing which captured /sitemap.xml as
// locale="sitemap.xml" and rendered the home in HTML at the sitemap URL.
export const config = {
  matcher: [
    "/((?!api|_next|_vercel|sitemap\\.xml|sitemap/|robots\\.txt|feed\\.xml|manifest|favicon\\.ico|icon|.*\\..*).*)",
  ],
};
