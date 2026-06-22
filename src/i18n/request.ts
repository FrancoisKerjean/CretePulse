import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import en from "../messages/en.json";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // Validate against ALL routed locales (22), not just 4. The previous cast was
  // narrowing to en|fr|de|el at runtime, sending 18 languages back to defaultLocale.
  const isValid =
    !!requested && (routing.locales as readonly string[]).includes(requested);
  const locale = isValid ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // Resilience i18n : une cle manquante retombe sur la valeur anglaise (jamais le
    // chemin brut a l'ecran), et n'interrompt pas le rendu. La parite des cles reste
    // garantie par `npm run check:i18n`.
    getMessageFallback({ namespace, key }) {
      const path = [namespace, key].filter(Boolean).join(".");
      const enVal = path
        .split(".")
        .reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), en);
      return typeof enVal === "string" ? enVal : path;
    },
    onError() {
      // MISSING_MESSAGE et compagnie sont gerees par getMessageFallback ci-dessus :
      // on ne jette pas (Sentry capte deja les erreurs serveur ailleurs).
    },
  };
});
