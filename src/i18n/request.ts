import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

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
  };
});
