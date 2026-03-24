export type Locale = "en" | "fr" | "de" | "el";

export interface Beach {
  id: number;
  slug: string;
  name_en: string;
  name_fr: string;
  name_de: string;
  name_el: string;
  latitude: number;
  longitude: number;
  region: "east" | "west" | "central" | "south";
  type: "sand" | "pebble" | "rock" | "mixed";
  length_m: number | null;
  parking: boolean;
  sunbeds: boolean;
  taverna: boolean;
  snorkeling: boolean;
  kids_friendly: boolean;
  description_en: string;
  description_fr: string;
  description_de: string;
  description_el: string;
  wind_exposure: "sheltered" | "moderate" | "exposed";
  image_url: string | null;
  image_credit: string | null;
}

export interface Village {
  id: number;
  slug: string;
  name_en: string;
  name_fr: string;
  name_de: string;
  name_el: string;
  population: number | null;
  altitude_m: number | null;
  latitude: number;
  longitude: number;
  region: string;
  municipality: string | null;
  period: "minoan" | "venetian" | "ottoman" | "modern" | "abandoned";
  description_en: string;
  description_fr: string;
  description_de: string;
  description_el: string;
  highlights: string[];
  image_url: string | null;
  image_credit: string | null;
}

export interface Event {
  id: number;
  slug: string;
  title_en: string;
  title_fr: string;
  title_de: string;
  title_el: string;
  description_en: string;
  description_fr: string;
  description_de: string;
  description_el: string;
  date_start: string;
  date_end: string | null;
  time_start: string | null;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  category: string;
  source_url: string | null;
  verified: boolean;
}

export interface NewsItem {
  id: number;
  slug: string;
  title_en: string;
  title_fr: string;
  title_de: string;
  title_el: string;
  summary_en: string;
  summary_fr: string;
  summary_de: string;
  summary_el: string;
  source_url: string;
  source_name: string;
  published_at: string;
  category: string | null;
  image_url: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLocalizedField(item: any, field: string, locale: Locale): string {
  return item[`${field}_${locale}`] || item[`${field}_en`] || "";
}
