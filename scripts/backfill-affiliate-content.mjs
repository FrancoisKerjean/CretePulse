#!/usr/bin/env node
/**
 * scripts/backfill-affiliate-content.mjs
 *
 * Backfill photo_url + description (jsonb {en,fr,de,el}) for active affiliates
 * that are missing one or both fields.
 *
 * Usage:
 *   node scripts/backfill-affiliate-content.mjs
 *   node scripts/backfill-affiliate-content.mjs --force   # re-enrich even if already set
 *   node scripts/backfill-affiliate-content.mjs --slug halepa-hotel  # single affiliate
 *
 * AI: uses Anthropic HTTP API via ANTHROPIC_API_KEY from ~/.kairos-keys
 * DB writes: Supabase REST PATCH (SUPABASE_SERVICE_KEY from .kairos-keys or .env.local)
 *
 * The pure utility functions (extractOgImage, extractSiteText, buildDescriptionPrompt,
 * parseDescriptionJson, fallbackDescription) are duplicated here from src/lib/affiliate-enrich.ts
 * because the backfill script is plain Node ESM (.mjs) and cannot import raw TypeScript.
 * The canonical source of truth for these functions is affiliate-enrich.ts.
 */

import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FORCE = args.includes("--force");
/** --photos-only: re-evaluate photo_url only (skip description re-generation) */
const PHOTOS_ONLY = args.includes("--photos-only");
const SINGLE_SLUG = (() => {
  const i = args.indexOf("--slug");
  return i >= 0 ? args[i + 1] : null;
})();
/** --slugs a,b,c: re-evaluate multiple slugs at once */
const MULTI_SLUGS = (() => {
  const i = args.indexOf("--slugs");
  return i >= 0 ? args[i + 1].split(",").map((s) => s.trim()).filter(Boolean) : null;
})();

// ─── Load env (kairos-keys + .env.local) ─────────────────────────────────────
function loadEnv() {
  const env = {};
  const envLocalPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  const sources = [join(homedir(), ".kairos-keys"), envLocalPath];
  for (const src of sources) {
    try {
      for (const line of readFileSync(src, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m) env[m[1]] = m[2].trim();
      }
    } catch {
      // ignore missing files
    }
  }
  return env;
}

const ENV = loadEnv();
// Supabase: always use the self-hosted cretepulse DB (not kairos-n8n's project URL)
const SUPABASE_URL = "https://kairos-n8n.duckdns.org/cretepulse-db";
// Service key for the self-hosted PostgREST (from VPS /opt/cretepulse/.env)
const SUPABASE_KEY =
  ENV.CRETEPULSE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzU2MzczOTEsImV4cCI6MjA5MDk5NzM5MX0.lpMH59cKthLrOA3aPPnxOUf3SJfZMJJgZlciHOAKX0c";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ABORT: SUPABASE_URL or SUPABASE_KEY missing.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── claude CLI detection + model config ─────────────────────────────────────
const CLAUDE_CLI = (() => {
  try {
    execSync("claude --version", { stdio: "ignore" });
    return "claude";
  } catch {}
  return null;
})();

/**
 * Model to use for description generation.
 * Override via env var CLAUDE_MODEL (e.g. in the VPS cron environment).
 * Default: claude-haiku-4-5-20251001 (Haiku — fast + cheap for batch enrichment).
 */
const CLAUDE_MODEL = ENV.CLAUDE_MODEL || process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001";

// ─── Pure utils (mirrors src/lib/affiliate-enrich.ts) ─────────────────────────

function resolveUrl(href, base) {
  try { return new URL(href, base).href; } catch { return href; }
}

/**
 * Returns true if the URL looks like a real content photo.
 * Rejects favicons, icons, sprites, logos, apple-touch images, and .ico files.
 */
function isLikelyRealPhoto(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".ico")) return false;
    const rejectKeywords = ["favicon", "/icon", "apple-touch", "sprite", "logo"];
    for (const kw of rejectKeywords) {
      if (path.includes(kw)) return false;
    }
    const photoExtRe = /\.(jpe?g|png|webp)(\?.*)?$/i;
    if (photoExtRe.test(path)) return true;
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
 */
function extractContentImg(html, baseUrl) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

  const imgRe = /<img\s[^>]+>/gi;
  const candidates = [];

  let m;
  while ((m = imgRe.exec(cleaned)) !== null) {
    const tag = m[0];
    const srcMatch =
      tag.match(/\bsrc=["']([^"']+)["']/i) ??
      tag.match(/\bdata-src=["']([^"']+)["']/i);
    if (!srcMatch?.[1]) continue;

    const resolved = resolveUrl(srcMatch[1].trim(), baseUrl);
    if (!isLikelyRealPhoto(resolved)) continue;

    let score = 0;
    const wMatch = tag.match(/\bwidth=["']?(\d+)/i);
    const hMatch = tag.match(/\bheight=["']?(\d+)/i);
    const w = wMatch ? parseInt(wMatch[1], 10) : 0;
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    if (w >= 400 || h >= 400) score += 10;
    if (w >= 800 || h >= 600) score += 5;

    const uploadPaths = ["/wp-content/uploads/", "/uploads/", "/photos/", "/gallery/", "/media/"];
    for (const kw of uploadPaths) {
      if (resolved.includes(kw)) { score += 3; break; }
    }

    candidates.push({ url: resolved, score });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
}

/**
 * Parse the best real content photo URL from raw HTML.
 * Selection order: og:image → og:image:secure_url → twitter:image → link[image_src] → first large <img>.
 * NEVER returns a favicon or icon URL — returns null instead.
 */
function extractOgImage(html, baseUrl) {
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
    }
  }

  // <link rel="image_src">
  for (const re of [
    /rel=["']image_src["'][^>]*href=["']([^"']+)["']/i,
    /href=["']([^"']+)["'][^>]*rel=["']image_src["']/i,
  ]) {
    const match = html.match(re);
    if (match?.[1]) {
      const resolved = resolveUrl(match[1].trim(), baseUrl);
      if (isLikelyRealPhoto(resolved)) return resolved;
    }
  }

  // First large content <img>
  return extractContentImg(html, baseUrl);
}

function extractSiteText(html) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
  const desc =
    html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]?.trim() ??
    html.match(/content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1]?.trim() ??
    "";
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
  return [title, desc, stripped].filter(Boolean).join("\n").slice(0, 800);
}

function buildDescriptionPrompt(name, category, siteText) {
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

function parseDescriptionJson(raw) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
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

const CATEGORY_TEMPLATES = {
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

function fallbackDescription(category) {
  return CATEGORY_TEMPLATES[category] ?? CATEGORY_TEMPLATES.other;
}

// ─── AI call via `claude -p` CLI ─────────────────────────────────────────────
function callClaudeCli(prompt) {
  if (!CLAUDE_CLI) return null;
  try {
    // Pipe prompt via stdin to avoid shell-escaping issues with special chars.
    // --model forces Haiku (configurable via CLAUDE_MODEL env var, default claude-haiku-4-5-20251001).
    const result = execSync(`claude -p --model ${CLAUDE_MODEL}`, {
      input: prompt,
      timeout: 90000,
      // capture both stdout and stderr; let stderr show for debug
      stdio: ["pipe", "pipe", "inherit"],
    });
    return result.toString("utf8").trim();
  } catch (e) {
    const stderr = e.stderr?.toString() ?? "";
    console.error("  claude CLI failed:", stderr.slice(0, 300));
    return null;
  }
}

// ─── Fetch site HTML ───────────────────────────────────────────────────────────
async function fetchSiteHtml(url) {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) {
      console.warn(`  HTTP ${resp.status} for ${url}`);
      return null;
    }
    return await resp.text();
  } catch (e) {
    console.warn(`  Fetch failed for ${url}: ${e.message}`);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log(`--- backfill-affiliate-content ---`);
  console.log(`force=${FORCE} photos-only=${PHOTOS_ONLY} slug=${SINGLE_SLUG ?? MULTI_SLUGS?.join(",") ?? "all active"} claude-cli=${!!CLAUDE_CLI} model=${CLAUDE_MODEL}\n`);

  let q = supabase
    .from("affiliates")
    .select("id, slug, category, redirect_url, photo_url, description")
    .eq("status", "active");

  if (SINGLE_SLUG) {
    q = q.eq("slug", SINGLE_SLUG);
  } else if (MULTI_SLUGS?.length) {
    q = q.in("slug", MULTI_SLUGS);
  } else if (!FORCE && !PHOTOS_ONLY) {
    q = q.or("photo_url.is.null,description.is.null");
  }
  // --photos-only with no slug filter: process all active (re-evaluate photos)

  const { data: affiliates, error } = await q;
  if (error) {
    console.error("DB fetch error:", error.message);
    process.exit(1);
  }
  if (!affiliates?.length) {
    console.log("Nothing to enrich (all fields populated, use --force to re-enrich).");
    return;
  }

  console.log(`${affiliates.length} affiliate(s) to enrich:\n`);

  let ok = 0;
  let failed = 0;

  for (const aff of affiliates) {
    const { id, slug, category, redirect_url } = aff;
    console.log(`[${slug}] category=${category} url=${redirect_url}`);

    // 1. Fetch site HTML
    const html = await fetchSiteHtml(redirect_url);
    if (!html) {
      console.warn(`  Could not fetch HTML — skipping.\n`);
      failed++;
      continue;
    }

    // 2. Extract photo URL
    // Always re-evaluate if FORCE or PHOTOS_ONLY, otherwise keep existing non-null value
    const photo_url = (!FORCE && !PHOTOS_ONLY && aff.photo_url)
      ? aff.photo_url
      : extractOgImage(html, redirect_url);

    if (photo_url) {
      console.log(`  photo_url: ${photo_url}`);
    } else {
      console.log(`  photo_url: null (no real content photo found — will set to NULL)`);
    }

    // 3. Generate description (skip if --photos-only)
    let description;
    const needDesc = !PHOTOS_ONLY && (FORCE || !aff.description);

    if (needDesc && CLAUDE_CLI) {
      const siteText = extractSiteText(html);
      console.log(`  siteText snippet: ${siteText.slice(0, 120).replace(/\n/g, " ")}…`);

      const prompt = buildDescriptionPrompt(slug, category, siteText);
      console.log(`  Calling claude CLI…`);
      const rawAi = callClaudeCli(prompt);

      if (rawAi) {
        try {
          description = parseDescriptionJson(rawAi);
          console.log(`  description (AI ✓): "${description.en.slice(0, 80)}…"`);
        } catch (e) {
          console.warn(`  AI JSON parse failed (${e.message}), using fallback template.`);
          description = fallbackDescription(category);
          console.log(`  description (fallback): "${description.en.slice(0, 80)}…"`);
        }
      } else {
        description = fallbackDescription(category);
        console.log(`  description (fallback): "${description.en.slice(0, 80)}…"`);
      }
    } else if (needDesc && !CLAUDE_CLI) {
      description = fallbackDescription(category);
      console.log(`  description (fallback template, no claude CLI): "${description.en.slice(0, 80)}…"`);
    } else {
      description = aff.description;
      console.log(`  description: kept existing.`);
    }

    // 4. Build update payload
    const update = {};
    // Update photo if forced, photos-only mode, or previously null
    if (FORCE || PHOTOS_ONLY || !aff.photo_url) update.photo_url = photo_url;
    if (!PHOTOS_ONLY && (FORCE || !aff.description)) update.description = description;

    if (!Object.keys(update).length) {
      console.log(`  Nothing to update (all fields already set).\n`);
      ok++;
      continue;
    }

    // 5. Write to DB
    const { error: uErr } = await supabase.from("affiliates").update(update).eq("id", id);
    if (uErr) {
      console.error(`  DB update error: ${uErr.message}`);
      failed++;
    } else {
      console.log(`  ✓ updated.\n`);
      ok++;
    }
  }

  console.log(`\n--- Done. ok=${ok} failed=${failed} ---`);

  // 6. Verify: read back from DB
  console.log("\n--- Verification (REST read-back) ---");
  const { data: verify, error: vErr } = await supabase
    .from("affiliates")
    .select("slug, status, photo_url, description")
    .eq("status", "active")
    .order("slug");

  if (vErr) {
    console.error("Verify error:", vErr.message);
  } else {
    console.log(JSON.stringify(verify, null, 2));
  }
}

run().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
