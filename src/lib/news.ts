import { supabase } from "./supabase";
import type { NewsItem } from "./types";

// Greek Unicode range check
function hasGreek(text: string): boolean {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(text);
}

// Heuristic: detect German-only words/diacritics that should NOT appear
// in a French or English title.
function hasGermanOnlyMarkers(text: string): boolean {
  // \u00DF is German-only. Common German prefix/suffix that almost never occur in FR/EN.
  if (/[\u00DF]/.test(text)) return true;
  if (/\b(Flughafen|Er\u00F6ffnung|Anreise|Sehensw\u00FCrdigkeiten|Tipps|\u00DCbersicht|Aktivit\u00E4ten|Nachrichten)\b/.test(text)) return true;
  return false;
}

// Heuristic: detect English-only function words / patterns that should NOT
// appear in a French/German title (catches untranslated EN headlines).
function hasEnglishOnlyMarkers(text: string): boolean {
  // Common English headline glue words that are very rare in FR/DE.
  // Use word boundaries to avoid matching cognates.
  return /\b(after|with|amid|despite|toward|through|while|among|across|reach|reaches)\b/i.test(text);
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

  // Filter out items where title was not actually translated:
  // - Greek glyphs on non-Greek pages
  // - title_<loc> equal to title_en on a non-EN page (translation failed silently)
  // - language-specific markers (\u00DF, "Flughafen", etc) leaking into other locales
  const filtered = items.filter((item) => {
    const title = (item[titleCol] as string) || "";
    if (!title) return false;
    if (effectiveLocale !== "el" && hasGreek(title)) return false;

    if (effectiveLocale !== "en") {
      // Untranslated: title for this locale is identical to the English version
      if (item.title_en && title.trim() === item.title_en.trim()) return false;
    }

    if (effectiveLocale !== "de") {
      if (hasGermanOnlyMarkers(title)) return false;
    }

    if (effectiveLocale === "fr" || effectiveLocale === "de") {
      if (hasEnglishOnlyMarkers(title)) return false;
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
