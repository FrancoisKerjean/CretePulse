export interface ScrapedListing {
  airbnbId: string | null;
  title: string | null;
  description: string | null;
  photos: string[];
}

export function airbnbIdFromUrl(url: string): string | null {
  const m = url.match(/\/rooms\/(\d+)/);
  return m ? m[1] : null;
}

function metaAll(html: string, prop: string): string[] {
  const re = new RegExp(
    `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

export function parseAirbnbListing(html: string): ScrapedListing {
  return {
    airbnbId: null,
    title: metaAll(html, "og:title")[0] ?? null,
    description: metaAll(html, "og:description")[0] ?? null,
    photos: metaAll(html, "og:image"),
  };
}

type FetchLike = (url: string) => Promise<Response>;

export interface ScrapeResult {
  ok: boolean;
  data: ScrapedListing & { airbnbId: string | null };
}

export async function scrapeAirbnbUrl(
  url: string,
  fetchImpl: FetchLike = fetch,
): Promise<ScrapeResult> {
  const airbnbId = airbnbIdFromUrl(url);
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return { ok: false, data: { airbnbId, title: null, description: null, photos: [] } };
    const html = await res.text();
    const parsed = parseAirbnbListing(html);
    return { ok: true, data: { ...parsed, airbnbId } };
  } catch {
    return { ok: false, data: { airbnbId, title: null, description: null, photos: [] } };
  }
}
