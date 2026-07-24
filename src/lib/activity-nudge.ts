// src/lib/activity-nudge.ts
// Logique pure du pop-up "nudge activité" : isolée du composant React pour rester
// lisible et vérifiable. Aucune dépendance React.

export const STORAGE_KEY = "cd_activity_nudge";

/** Masquage après clic "Plus tard" : 7 jours. */
export const LATER_MS = 7 * 24 * 60 * 60 * 1000;
/** Masquage après conversion (clic "Je swipe") : 30 jours. */
export const CONVERTED_MS = 30 * 24 * 60 * 60 * 1000;

/** Délai avant déclenchement automatique : 20 secondes. */
export const DELAY_MS = 20_000;
/** Seuil de scroll alternatif : 60 % de la hauteur scrollable. */
export const SCROLL_THRESHOLD = 0.6;

/**
 * Routes "découverte" où le pop-up est autorisé.
 * NB: `usePathname()` de `@/i18n/navigation` renvoie le chemin SANS préfixe de
 * locale (ex: "/explore", pas "/fr/explore").
 */
export const ELIGIBLE_ROUTES = [
  "/explore",
  "/beaches",
  "/things-to-do",
  "/food",
  "/hikes",
  "/itineraries",
  "/villages",
  "/near-me",
] as const;

export function isEligibleRoute(pathname: string): boolean {
  const clean = (pathname.split("?")[0].replace(/\/+$/, "") || "/");
  return (ELIGIBLE_ROUTES as readonly string[]).includes(clean);
}

function readHideUntil(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    // localStorage indisponible (mode privé) -> on autorise l'affichage
    return 0;
  }
}

function writeHideUntil(until: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(until));
  } catch {
    // écriture impossible (mode privé) : ignoré, le pop-up restera masqué pour la session
  }
}

/** True si un masquage est encore actif à l'instant `now` (ms epoch). */
export function isSuppressed(now: number): boolean {
  return readHideUntil() > now;
}

/** Pose le masquage "Plus tard" (7 jours) à partir de `now`. */
export function suppressLater(now: number): void {
  writeHideUntil(now + LATER_MS);
}

/** Pose le masquage "converti" (30 jours) à partir de `now`. */
export function suppressConverted(now: number): void {
  writeHideUntil(now + CONVERTED_MS);
}
