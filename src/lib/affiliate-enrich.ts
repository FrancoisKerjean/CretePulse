/**
 * affiliate-enrich.ts
 *
 * Shared logic for enriching affiliates with photo_url.
 * Description generation is intentionally NOT done here: it is delegated to the
 * VPS Haiku worker (`scripts/backfill-affiliate-content.mjs`) which fills rows
 * where `description IS NULL` via `claude -p --model claude-haiku-4-5-20251001`.
 *
 * Used by:
 *   - scripts/backfill-affiliate-content.mjs  (Node CLI, uses claude CLI via child_process)
 *   - src/app/api/affiliate/register/route.ts  (Vercel serverless, photo-only)
 *
 * OG-image extraction is shared.
 * `generateDescriptionViaApi` and `fallbackDescription` are kept exported for
 * the backfill script and tests, but MUST NOT be called on signup.
 */

// ─── OG image extraction ────────────────────────────────────────────────────

/**
 * Returns true if the URL looks like a real content photo.
 * Rejects favicons, icons, sprites, logos, apple-touch images, and .ico files.
 */
export function isLikelyRealPhoto(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    // Reject by extension
    if (path.endsWith(".ico")) return false;
    // Reject by path keywords
    const rejectKeywords = ["favicon", "/icon", "apple-touch", "sprite", "logo"];
    for (const kw of rejectKeywords) {
      if (path.includes(kw)) return false;
    }
    // Must end with a photo-like extension (jpg, jpeg, png, webp, or no extension but not .ico/.svg)
    // Accept paths that end with photo extensions, OR paths that look like CDN photo URLs
    const photoExtRe = /\.(jpe?g|png|webp)(\?.*)?$/i;
    if (photoExtRe.test(path)) return true;
    // Accept URLs without extension but with CDN / upload path segments
    const uploadKeywords = ["/uploads/", "/wp-content/uploads/", "/images/", "/photos/", "/media/", "/gallery/"];
    for (const kw of uploadKeywords) {
      if (path.includes(kw)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Extract the first large content <img> src from HTML.
 * Prefers imgs with width/height >= 400, or whose path suggests a content photo.
 * Never returns a URL that fails isLikelyRealPhoto.
 * Returns an absolute URL or null.
 */
function extractContentImg(html: string, baseUrl: string): string | null {
  // Remove script/style/noscript blocks first to avoid false matches
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  // Match all <img ...> tags
  const imgRe = /<img\s[^>]+>/gi;
  const candidates: { url: string; score: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(cleaned)) !== null) {
    const tag = m[0];

    // Extract src (or data-src for lazy-loading)
    const srcMatch =
      tag.match(/\bsrc=["']([^"']+)["']/i) ??
      tag.match(/\bdata-src=["']([^"']+)["']/i);
    if (!srcMatch?.[1]) continue;

    const resolved = resolveUrl(srcMatch[1].trim(), baseUrl);
    if (!isLikelyRealPhoto(resolved)) continue;

    let score = 0;

    // Bonus if dimensions look large
    const wMatch = tag.match(/\bwidth=["']?(\d+)/i);
    const hMatch = tag.match(/\bheight=["']?(\d+)/i);
    const w = wMatch ? parseInt(wMatch[1], 10) : 0;
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    if (w >= 400 || h >= 400) score += 10;
    if (w >= 800 || h >= 600) score += 5;

    // Bonus for upload/content paths
    const uploadPaths = ["/wp-content/uploads/", "/uploads/", "/photos/", "/gallery/", "/media/"];
    for (const kw of uploadPaths) {
      if (resolved.includes(kw)) { score += 3; break; }
    }

    candidates.push({ url: resolved, score });
  }

  if (!candidates.length) return null;
  // Sort by score descending, return the best
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

/**
 * Parse the best real content photo URL from raw HTML.
 * Selection order: og:image → og:image:secure_url → twitter:image → link[image_src] → first large <img>.
 * NEVER returns a favicon or icon URL — returns null instead.
 */
export function extractOgImage(html: string, baseUrl: string): string | null {
  // 1. og:image (both attribute orders)
  const ogPatterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /property=["']og:image:secure_url["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image:secure_url["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
  ];
  for (const re of ogPatterns) {
    const match = html.match(re);
    if (match?.[1]) {
      const resolved = resolveUrl(match[1].trim(), baseUrl);
      if (isLikelyRealPhoto(resolved)) return resolved;
      // candidate failed isLikelyRealPhoto — try next source
    }
  }

  // 2. <link rel="image_src">
  const imgSrcRe = /rel=["']image_src["'][^>]*href=["']([^"']+)["']/i;
  const imgSrcAlt = /href=["']([^"']+)["'][^>]*rel=["']image_src["']/i;
  for (const re of [imgSrcRe, imgSrcAlt]) {
    const match = html.match(re);
    if (match?.[1]) {
      const resolved = resolveUrl(match[1].trim(), baseUrl);
      if (isLikelyRealPhoto(resolved)) return resolved;
    }
  }

  // 3. First large content <img> in the HTML
  return extractContentImg(html, baseUrl);
}

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

// ─── Site text extraction (for AI prompt) ───────────────────────────────────

/** Extract title + meta description + first ~600 chars of visible text from raw HTML. */
export function extractSiteText(html: string): string {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
  const desc =
    html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() ??
    html.match(/content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1]?.trim() ??
    "";
  // Strip scripts/styles/tags to get visible text
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
  return [title, desc, stripped].filter(Boolean).join("\n").slice(0, 800);
}

// ─── Per-category fallback descriptions (no AI) ─────────────────────────────

export type AffiliateCategory =
  | "hotel"
  | "tour"
  | "beach_club"
  | "car_rental"
  | "restaurant"
  | "activity"
  | "taxi"
  | "other";

export interface LocalizedDescription {
  en: string;
  fr: string;
  de: string;
  el: string;
}

const CATEGORY_TEMPLATES: Record<string, LocalizedDescription> = {
  hotel: {
    en: "A welcoming hotel in Crete offering comfortable stays and local hospitality.",
    fr: "Un hôtel accueillant en Crète proposant des séjours confortables et une hospitalité locale.",
    de: "Ein einladendes Hotel auf Kreta mit komfortablen Zimmern und lokaler Gastfreundschaft.",
    el: "Ένα φιλόξενο ξενοδοχείο στην Κρήτη με άνετες διαμονές και τοπική φιλοξενία.",
  },
  tour: {
    en: "Discover Crete's highlights with guided tours and expert local knowledge.",
    fr: "Découvrez les merveilles de la Crète avec des visites guidées et une expertise locale.",
    de: "Entdecken Sie Kretas Highlights mit geführten Touren und lokalem Expertenwissen.",
    el: "Ανακαλύψτε τα αξιοθέατα της Κρήτης με ξεναγήσεις και τοπική τεχνογνωσία.",
  },
  beach_club: {
    en: "Enjoy the best of Crete's coastline at this beach club.",
    fr: "Profitez du meilleur du littoral crétois dans ce beach club.",
    de: "Genießen Sie das Beste der kretischen Küste in diesem Beach Club.",
    el: "Απολαύστε τα καλύτερα της κρητικής ακτής σε αυτό το beach club.",
  },
  car_rental: {
    en: "Explore Crete at your own pace with quality car rental services.",
    fr: "Explorez la Crète à votre rythme grâce à des services de location de voiture de qualité.",
    de: "Erkunden Sie Kreta in Ihrem eigenen Tempo mit hochwertigen Mietwagen.",
    el: "Εξερευνήστε την Κρήτη με δικό σας ρυθμό με ποιοτικές υπηρεσίες ενοικίασης αυτοκινήτου.",
  },
  restaurant: {
    en: "Savour authentic Cretan flavours and local specialities in a welcoming setting.",
    fr: "Savourez des saveurs crétoises authentiques et des spécialités locales dans un cadre accueillant.",
    de: "Genießen Sie authentische kretische Aromen und lokale Spezialitäten in einladender Atmosphäre.",
    el: "Απολαύστε αυθεντικές κρητικές γεύσεις και τοπικές σπεσιαλιτέ σε φιλόξενο περιβάλλον.",
  },
  activity: {
    en: "Experience thrilling activities and memorable adventures across Crete.",
    fr: "Vivez des activités passionnantes et des aventures mémorables à travers la Crète.",
    de: "Erleben Sie aufregende Aktivitäten und unvergessliche Abenteuer auf Kreta.",
    el: "Ζήστε συναρπαστικές δραστηριότητες και αξέχαστες περιπέτειες στην Κρήτη.",
  },
  taxi: {
    en: "Reliable transfers and taxi services across Crete.",
    fr: "Transferts fiables et services de taxi à travers la Crète.",
    de: "Zuverlässige Transfers und Taxiservices auf ganz Kreta.",
    el: "Αξιόπιστες μεταφορές και υπηρεσίες ταξί σε όλη την Κρήτη.",
  },
  other: {
    en: "A trusted local partner on Crete, ready to enhance your stay.",
    fr: "Un partenaire local de confiance en Crète, prêt à améliorer votre séjour.",
    de: "Ein vertrauenswürdiger lokaler Partner auf Kreta, bereit Ihren Aufenthalt zu bereichern.",
    el: "Ένας αξιόπιστος τοπικός συνεργάτης στην Κρήτη, έτοιμος να εμπλουτίσει τη διαμονή σας.",
  },
};

export function fallbackDescription(category: string): LocalizedDescription {
  return CATEGORY_TEMPLATES[category] ?? CATEGORY_TEMPLATES.other;
}

// ─── Description prompt builder ──────────────────────────────────────────────

export function buildDescriptionPrompt(
  name: string,
  category: string,
  siteText: string,
): string {
  return `You are writing a short partner description for a Crete travel guide website.

Partner name: ${name}
Category: ${category}
Site content (title + meta + text excerpt):
"""
${siteText}
"""

Write a SHORT (25-40 words), engaging-but-factual description for this partner in 4 languages.
Rules:
- Use ONLY facts present in the site content above. No invented claims.
- No superlatives ("best", "amazing", "unique") unless the site says so.
- No hype. Factual, warm, concise.
- Keep the en/fr/de/el descriptions parallel in meaning.
- Return ONLY valid JSON, no markdown fences, no commentary.

Output format (strict JSON):
{"en":"...","fr":"...","de":"...","el":"..."}`;
}

/** Parse the raw AI text to extract a LocalizedDescription JSON object. */
export function parseDescriptionJson(raw: string): LocalizedDescription {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  // Find the first {...} block
  const m = cleaned.match(/\{[\s\S]+\}/);
  if (!m) throw new Error("No JSON object found in AI response");
  const parsed = JSON.parse(m[0]);
  if (
    typeof parsed.en !== "string" ||
    typeof parsed.fr !== "string" ||
    typeof parsed.de !== "string" ||
    typeof parsed.el !== "string"
  ) {
    throw new Error("Invalid description JSON shape: missing en/fr/de/el");
  }
  return { en: parsed.en, fr: parsed.fr, de: parsed.de, el: parsed.el };
}

// ─── Serverless enrichment (Anthropic HTTP API) ──────────────────────────────

/**
 * Generate a description via the Anthropic HTTP API (for use in Vercel serverless).
 * Returns null if ANTHROPIC_API_KEY is absent or the call fails — caller must degrade gracefully.
 */
export async function generateDescriptionViaApi(
  name: string,
  category: string,
  siteText: string,
): Promise<LocalizedDescription | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const prompt = buildDescriptionPrompt(name, category, siteText);
    const body = JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body,
      // Vercel function timeout guard: 8 s max for the AI call
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      console.error("[affiliate-enrich] Anthropic API error:", resp.status);
      return null;
    }
    const data = (await resp.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text ?? "";
    return parseDescriptionJson(text);
  } catch (err) {
    console.error("[affiliate-enrich] generateDescriptionViaApi failed:", err);
    return null;
  }
}

// ─── Serverless: fetch OG image ───────────────────────────────────────────────

/**
 * Fetch the HTML of a URL (with a short timeout) and extract the OG image.
 * Returns null on failure.
 */
export async function fetchOgImage(
  url: string,
  timeoutMs = 8000,
): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CreteDirect/1.0)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    return extractOgImage(html, url);
  } catch {
    return null;
  }
}

/**
 * Serverless signup enrichment: fetch og:image only.
 * Description is intentionally left NULL so the VPS Haiku worker picks it up.
 * Never blocks the signup (always best-effort).
 *
 * Returns { photo_url } — may be null if the fetch fails or no real image is found.
 */
export async function enrichAffiliate(opts: {
  redirectUrl: string;
  name: string;
  category: string;
}): Promise<{ photo_url: string | null }> {
  const { redirectUrl } = opts;

  // Fetch site HTML to extract the OG/content photo only.
  // Description is NOT generated here — it is left NULL for the VPS Haiku worker.
  let photo_url: string | null = null;

  try {
    const resp = await fetch(redirectUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CreteDirect/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const html = await resp.text();
      photo_url = extractOgImage(html, redirectUrl);
    }
  } catch (err) {
    console.error("[affiliate-enrich] fetch failed:", err);
  }

  return { photo_url };
}
