import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fr", "de", "el", "it", "nl", "pl", "es", "pt", "ru", "ja", "ko", "zh", "tr", "sv", "da", "no", "fi", "cs", "hu", "ro", "ar"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: true,
  alternateLinks: true,
});
