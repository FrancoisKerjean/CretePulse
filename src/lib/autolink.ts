import { cache } from "react";
import { supabase } from "./supabase";

export type LinkEntity = { name: string; href: string };

const BASE_LOCALES = ["en", "fr", "de", "el"];

/**
 * Static entities for the /airport/[slug] data pages (not in the beaches/villages/hikes
 * tables). Names are the forms that actually appear in article prose; matching is
 * case-sensitive, hence the lowercase French/Greek mid-sentence forms and both
 * apostrophe variants in French. Bare "Nikos Kazantzakis" is deliberately NOT included:
 * articles about the writer (museum, tomb) would link to the airport (false positive).
 * The longest-first sort in getAutolinkIndex ensures "Heraklion Airport" is tried
 * before a bare "Heraklion" place entity in the same text segment.
 */
const AIRPORT_ENTITIES: Record<string, { name: string; slug: string }[]> = {
  en: [
    { name: "Heraklion Airport", slug: "heraklion" },
    { name: "Nikos Kazantzakis Airport", slug: "heraklion" },
    { name: "Chania Airport", slug: "chania" },
    { name: "Sitia Airport", slug: "sitia" },
  ],
  fr: [
    { name: "aéroport d’Héraklion", slug: "heraklion" },
    { name: "aéroport d'Héraklion", slug: "heraklion" },
    { name: "aéroport de La Canée", slug: "chania" },
    { name: "aéroport de Chania", slug: "chania" },
    { name: "aéroport de Sitia", slug: "sitia" },
  ],
  de: [
    { name: "Flughafen Heraklion", slug: "heraklion" },
    { name: "Flughafen Chania", slug: "chania" },
    { name: "Flughafen Sitia", slug: "sitia" },
  ],
  el: [
    { name: "αεροδρόμιο Ηρακλείου", slug: "heraklion" },
    { name: "αεροδρόμιο Χανίων", slug: "chania" },
    { name: "αεροδρόμιο Σητείας", slug: "sitia" },
  ],
};

/**
 * Lightweight index of beach/village/hike names -> their entity page, for the current locale.
 * Cached per render. Used to auto-link the first mention of a known place inside article HTML,
 * which adds contextual internal links (best for crawl + the most-clicked link type) to the
 * thousands of auto-generated articles that ship with zero in-body links.
 */
export const getAutolinkIndex = cache(async (locale: string): Promise<LinkEntity[]> => {
  const loc = BASE_LOCALES.includes(locale) ? locale : "en";
  const cols = "slug, name_en, name_fr, name_de, name_el";
  const [beaches, villages, hikes] = await Promise.all([
    supabase.from("beaches").select(cols),
    supabase.from("villages").select(cols),
    supabase.from("hikes").select(cols),
  ]);

  const out: LinkEntity[] = [];
  const push = (rows: Record<string, string>[] | null, type: string) => {
    for (const r of rows || []) {
      const name = (r[`name_${loc}`] || r.name_en || "").trim();
      if (name && name.length >= 4 && r.slug) out.push({ name, href: `/${locale}/${type}/${r.slug}` });
    }
  };
  push(beaches.data as Record<string, string>[], "beaches");
  push(villages.data as Record<string, string>[], "villages");
  push(hikes.data as Record<string, string>[], "hikes");

  // Airport data pages: static entities, added before the sort/de-dupe below so they
  // participate in longest-name-first matching like every other entity.
  for (const a of AIRPORT_ENTITIES[loc] || AIRPORT_ENTITIES.en) {
    out.push({ name: a.name, href: `/${locale}/airport/${a.slug}` });
  }

  // De-dupe by name; longest names first so multi-word places match before their substrings.
  const seen = new Set<string>();
  return out
    .sort((a, b) => b.name.length - a.name.length)
    .filter((e) => {
      const k = e.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Insert internal links for the first mention of known places in an HTML string.
 * Safe by construction: operates only on text between tags, never inside <a> or headings,
 * at most one link per text segment (no nested anchors), capped at maxLinks total, and each
 * destination linked at most once.
 */
export function autolinkHtml(
  html: string,
  index: LinkEntity[],
  { maxLinks = 6 }: { maxLinks?: number } = {}
): string {
  if (!html || index.length === 0) return html;

  const lower = html.toLowerCase();
  const candidates = index.filter((e) => lower.includes(e.name.toLowerCase()));
  if (candidates.length === 0) return html;

  const usedHref = new Set<string>();
  let count = 0;
  let noLinkDepth = 0; // inside <a> or <h1..h6>

  const parts = html.split(/(<[^>]+>)/);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith("<")) {
      const m = /^<\s*(\/?)\s*(a|h[1-6])\b/i.exec(p);
      if (m) {
        if (m[1] === "/") noLinkDepth = Math.max(0, noLinkDepth - 1);
        else if (!p.endsWith("/>")) noLinkDepth += 1;
      }
      continue;
    }
    if (noLinkDepth > 0 || count >= maxLinks) continue;

    // At most one link per text segment -> no nested anchors, links spread across the article.
    for (const e of candidates) {
      if (usedHref.has(e.href)) continue;
      const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escapeRe(e.name)})(?![\\p{L}\\p{N}])`, "u");
      const mm = re.exec(p);
      if (mm) {
        const start = mm.index;
        const matched = mm[1];
        parts[i] =
          p.slice(0, start) +
          `<a href="${e.href}" class="text-aegean hover:underline">${matched}</a>` +
          p.slice(start + matched.length);
        usedHref.add(e.href);
        count += 1;
        break;
      }
    }
    if (count >= maxLinks) break;
  }

  return parts.join("");
}
