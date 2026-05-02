import { supabase } from "./supabase";
import type { NewsItem } from "./types";

// Greek Unicode range check
function hasGreek(text: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
}

// Heuristic: detect German-only words/diacritics that should NOT appear
// in a French or English title or summary.
function hasGermanOnlyMarkers(text: string): boolean {
  // \u00DF is German-only. Plus common DE function words that very rarely appear in FR/EN.
  if (/[\u00DF]/.test(text)) return true;
  if (/\b(Flughafen|Er\u00F6ffnung|Anreise|Sehensw\u00FCrdigkeiten|\u00DCbersicht|Aktivit\u00E4ten|Bedingungen|Wanderungen|Strandbesuche|Strandaktivit\u00E4ten|Wetterkarte|einschlie\u00DFlich|w\u00E4hrend|zwischen|werden|sollten|k\u00F6nnen|nicht empfohlen)\b/i.test(text)) return true;
  return false;
}

// Heuristic: detect English-only function words / patterns that should NOT
// appear in a French/German title or summary. Conservative — only words
// extremely unlikely to appear in proper FR/DE prose (avoid false positives
// on borrowed English words in legitimate French content).
function hasEnglishOnlyMarkers(text: string): boolean {
  return /\b(after|amid|despite|toward|through|while|among|across|reaches|including|expected|throughout|coastal areas|are likely)\b/i.test(text);
}

export async function getLatestNews(limit = 20, locale = "en"): Promise<NewsItem[]> {
  // Only EN, FR, DE have translations in the DB. All others fall back to EN.
  const TRANSLATED_LOCALES = ["en", "fr", "de"];
  const effectiveLocale = TRANSLATED_LOCALES.includes(locale) ? locale : "en";
  const titleCol = `title_${effectiveLocale}` as keyof NewsItem;

  const query = supabase
    .from("news")
    .select("slug, title_en, title_fr, title_de, title_el, summary_en, summary_fr, summary_de, summary_el, image_url, category, published_at, source_name, source_url")
    .neq("title_en", "")
    .neq("category", "filtered")
    .order("published_at", { ascending: false })
    .limit(limit * 3);

  // For translated locales, also require the locale title to be filled
  if (effectiveLocale !== "en") {
    query.neq(`title_${effectiveLocale}`, "");
  }

  const { data, error } = await query;
  if (error) throw error;
  const items = (data as NewsItem[]) || [];

  // Filter out items where title or summary was not actually translated:
  // - Greek glyphs on non-Greek pages
  // - title or summary equal to the EN/DE version on the wrong locale
  // - language-specific markers (\u00DF, "Flughafen", "Aktivit\u00E4ten", etc) leaking
  const summaryCol = `summary_${effectiveLocale}` as keyof NewsItem;
  const filtered = items.filter((item) => {
    const title = (item[titleCol] as string) || "";
    if (!title) return false;
    const summary = (item[summaryCol] as string) || "";

    if (effectiveLocale !== "el" && (hasGreek(title) || hasGreek(summary))) return false;

    if (effectiveLocale !== "en") {
      if (item.title_en && title.trim() === item.title_en.trim()) return false;
      if (item.summary_en && summary && summary.trim() === item.summary_en.trim()) return false;
    }
    if (effectiveLocale !== "de") {
      if (item.title_de && title.trim() === item.title_de.trim()) return false;
      if (item.summary_de && summary && summary.trim() === item.summary_de.trim()) return false;
      if (hasGermanOnlyMarkers(title)) return false;
      if (hasGermanOnlyMarkers(summary)) return false;
    }
    if (effectiveLocale === "fr" || effectiveLocale === "de") {
      if (hasEnglishOnlyMarkers(title)) return false;
      if (hasEnglishOnlyMarkers(summary)) return false;
    }

    return true;
  });

  // Deduplicate by first 30 chars
  const seen = new Set<string>();
  const deduped: NewsItem[] = [];
  for (const item of filtered) {
    const key = ((item[titleCol] as string) || "").toLowerCase().slice(0, 30).trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
    if (deduped.length >= limit) break;
  }

  return deduped;
}

export async function getNewsBySlug(slug: string): Promise<NewsItem | null> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("slug", slug)
    .neq("title_en", "")
    .neq("category", "filtered")
    .single();

  if (error) return null;
  return data as NewsItem;
}
