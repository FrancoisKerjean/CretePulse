/**
 * affiliate-enrich.ts
 *
 * Shared logic for enriching affiliates with photo_url + description.
 *
 * Used by:
 *   - scripts/backfill-affiliate-content.mjs  (Node CLI, uses claude CLI via child_process)
 *   - src/app/api/affiliate/register/route.ts  (Vercel serverless, uses Anthropic HTTP API)
 *
 * OG-image extraction is shared. AI description generation is branched:
 *   - CLI context  → caller passes an `askAi` function wrapping the claude CLI / Python shim
 *   - Serverless   → caller passes an `askAi` function using Anthropic HTTP (ANTHROPIC_API_KEY)
 *   - No key       → caller passes null → fallback per-category templates (4 languages, no AI)
 */

// ─── OG image extraction ────────────────────────────────────────────────────

/**
 * Parse the first og:image / twitter:image / favicon URL from raw HTML.
 * Returns an absolute URL or null.
 */
export function extractOgImage(html: string, baseUrl: string): string | null {
  // og:image (both attribute orders)
  const ogPatterns = [
    /property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
    /name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i,
  ];
  for (const re of ogPatterns) {
    const m = html.match(re);
    if (m?.[1]) return resolveUrl(m[1].trim(), baseUrl);
  }
  // favicon fallback
  const faviconRe = /(?:rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']|href=["']([^"']+)["'][^>]*rel=["'](?:icon|shortcut icon)["'])/i;
  const fm = html.match(faviconRe);
  if (fm) {
    const href = (fm[1] || fm[2] || "").trim();
    if (href) return resolveUrl(href, baseUrl);
  }
  return null;
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
 * Full serverless enrichment: fetch og:image + generate description via Anthropic HTTP API.
 * Degrades gracefully if the API key is absent or calls fail.
 *
 * Returns { photo_url, description } — both may be null if unavailable.
 *
 * TODO [owner: Kami, butoir: 2026-07-31] — add ANTHROPIC_API_KEY to Vercel env vars
 * (https://vercel.com/kerjeanfrancois29/crete-direct/settings/environment-variables)
 * to enable AI-generated descriptions on signup. Without it, description falls back
 * to per-category template (still 4 languages, factual, decent).
 */
export async function enrichAffiliate(opts: {
  redirectUrl: string;
  name: string;
  category: string;
}): Promise<{ photo_url: string | null; description: LocalizedDescription }> {
  const { redirectUrl, name, category } = opts;

  // 1. Fetch site HTML (shared for both photo and AI text)
  let html = "";
  let photo_url: string | null = null;
  let siteText = "";

  try {
    const resp = await fetch(redirectUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CreteDirect/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      html = await resp.text();
      photo_url = extractOgImage(html, redirectUrl);
      siteText = extractSiteText(html);
    }
  } catch (err) {
    console.error("[affiliate-enrich] fetch failed:", err);
  }

  // 2. Generate description
  let description: LocalizedDescription;
  if (siteText) {
    const aiResult = await generateDescriptionViaApi(name, category, siteText);
    description = aiResult ?? fallbackDescription(category);
  } else {
    description = fallbackDescription(category);
  }

  return { photo_url, description };
}
