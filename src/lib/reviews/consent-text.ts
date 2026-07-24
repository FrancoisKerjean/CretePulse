import { hashToken } from "./sec";

export const CONSENT_VERSION = "v1-20260615";

export const CONSENT_TEXTS = {
  en: "I consent to the publication of my review on crete.direct. My e-mail is used only to confirm and manage my review.",
  fr: "J'accepte la publication de mon avis sur crete.direct. Mon e-mail sert uniquement à confirmer et à gérer mon avis.",
  de: "Ich stimme der Veröffentlichung meiner Bewertung auf crete.direct zu. Meine E-Mail wird ausschließlich zur Bestätigung und Verwaltung verwendet.",
  el: "Συναινώ στη δημοσίευση της κριτικής μου στο crete.direct. Το email μου χρησιμοποιείται μόνο για επιβεβαίωση και διαχείριση.",
} as const;

type SupportedLocale = keyof typeof CONSENT_TEXTS;

export function consentTextFor(locale: string): { text: string; hash: string } {
  const l = (locale in CONSENT_TEXTS ? locale : "en") as SupportedLocale;
  const text = CONSENT_TEXTS[l];
  const hash = hashToken(`${CONSENT_VERSION}:${text}`);
  return { text, hash };
}
