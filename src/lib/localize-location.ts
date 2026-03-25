/**
 * Translates known location names for events.
 * Falls through to the original name if no translation exists.
 */
const LOCATION_TRANSLATIONS: Record<string, Record<string, string>> = {
  "Island-wide, Crete": {
    en: "Island-wide, Crete",
    fr: "Toute la Crete",
    de: "Kretaweit",
    el: "\u03a3\u03b5 \u03cc\u03bb\u03b7 \u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7",
  },
  "All over Crete": {
    en: "All over Crete",
    fr: "Partout en Crete",
    de: "Uberall auf Kreta",
    el: "\u03a3\u03b5 \u03cc\u03bb\u03b7 \u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7",
  },
};

export function localizeLocation(name: string, locale: string): string {
  return LOCATION_TRANSLATIONS[name]?.[locale] || name;
}
