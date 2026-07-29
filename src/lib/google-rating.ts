// Note Google des loueurs : logique PURE, zero I/O (pattern car-admin.ts),
// importable client, serveur et node (scripts/check-google-rating.mjs).
//
// Le seul invariant qui compte ici : ne JAMAIS coller a un loueur la note d un
// autre etablissement. Une note absente est un affichage vide, ce n est pas
// grave ; une note fausse trompe l arbitrage commercial (qui on invite, qui on
// met en avant) et se voit dans le back-office comme une verite.
//
// Les appels HTTP a Places API vivent dans google-rating-server.ts.

export interface PlaceCandidate {
  id: string;
  displayName?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string | null;
  websiteUri?: string | null;
  formattedAddress?: string | null;
}

export interface PartnerIdentity {
  name: string;
  email?: string | null;
  website?: string | null;
}

/** Fenetre par defaut avant de redemander la note a Google. */
export const RATING_MAX_AGE_DAYS = 7;

// Mots qui ne distinguent aucun loueur du roster : tout le monde les porte.
// "auto" en est volontairement ABSENT (Auto Smart et Autochoice sont deux
// partenaires distincts, les raboter les rendrait confondables).
const STOP_WORDS = new Set([
  "rent", "rents", "rental", "rentals", "rentacar", "car", "cars",
  "a", "the", "of", "and", "crete", "kreta", "greece", "hellas",
]);

// Boites grand public : le domaine n identifie pas l entreprise, s en servir
// pour apparier ferait matcher n importe quel etablissement en @gmail.com.
const GENERIC_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.gr", "hotmail.com",
  "hotmail.gr", "outlook.com", "live.com", "icloud.com", "aol.com", "mail.com",
]);

/** Minuscules, sans accents ni ponctuation, mots du metier retires. */
export function normalizeBusinessName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w && !STOP_WORDS.has(w))
    .join(" ");
}

/** Domaine d une URL ou d une adresse email, null si generique ou illisible. */
export function domainOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  let host: string | null = null;

  if (raw.includes("@")) {
    host = raw.split("@").pop() ?? null;
  } else {
    try {
      host = new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname;
    } catch {
      host = null;
    }
  }
  if (!host) return null;
  host = host.replace(/^www\./, "");
  // Un domaine sans point n en est pas un ("pas une adresse" → "adresse").
  if (!host.includes(".") || /\s/.test(host)) return null;
  if (GENERIC_MAIL_DOMAINS.has(host)) return null;
  return host;
}

/** Note dans l echelle Google, adossee a au moins un avis. */
export function ratingIsPlausible(
  rating: number | null | undefined,
  count: number | null | undefined,
): boolean {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return false;
  if (typeof count !== "number" || !Number.isFinite(count)) return false;
  return rating >= 0 && rating <= 5 && count >= 1;
}

/** "4,6 (312 avis)" · null si la note n est pas affichable. */
export function formatRating(
  rating: number | null | undefined,
  count: number | null | undefined,
): string | null {
  if (!ratingIsPlausible(rating, count)) return null;
  return `${rating!.toFixed(1).replace(".", ",")} (${count} avis)`;
}

/** Note absente, illisible ou plus vieille que la fenetre : a redemander. */
export function isStaleRating(
  checkedAt: string | null | undefined,
  now: Date,
  maxAgeDays: number = RATING_MAX_AGE_DAYS,
): boolean {
  if (!checkedAt) return true;
  const at = new Date(checkedAt).getTime();
  if (Number.isNaN(at)) return true;
  return now.getTime() - at > maxAgeDays * 86_400_000;
}

// Un nom qui porte deja le metier n a pas besoin qu on le lui repete.
const TRADE_HINTS = ["rent", "rents", "rental", "rentals", "rentacar", "car", "cars"];

/** Requete Places : le nom, plus ce qui manque pour ancrer en Crete. */
export function searchQueryFor(partner: PartnerIdentity): string {
  const words = new Set(
    partner.name.normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" "),
  );
  const parts = [partner.name];
  if (!TRADE_HINTS.some((w) => words.has(w))) parts.push("car rental");
  if (!words.has("crete") && !words.has("kreta")) parts.push("Crete");
  if (!words.has("greece") && !words.has("hellas")) parts.push("Greece");
  return parts.join(" ");
}

export interface PlaceMatch {
  place: PlaceCandidate;
  /** "domain" : meme site que le loueur · "name" : seul nom qui correspond. */
  reason: "domain" | "name";
}

/**
 * Choisit le lieu Google qui EST ce loueur, ou null si le doute subsiste.
 *
 * Deux voies seulement, du plus sur au moins sur :
 *  1. meme domaine web que le loueur (jamais une boite generique) ;
 *  2. un seul candidat dont le nom contient le noyau du loueur.
 * Deux candidats de meme nom (deux agences du meme loueur) rendent null : on
 * ne sait pas laquelle est le siege, et en choisir une au hasard afficherait
 * une note qui n est pas celle qu on croit lire.
 */
export function matchPlace(
  partner: PartnerIdentity,
  candidates: PlaceCandidate[],
): PlaceMatch | null {
  const rated = candidates.filter((c) => ratingIsPlausible(c.rating, c.userRatingCount));
  if (rated.length === 0) return null;

  const partnerDomain = domainOf(partner.website) ?? domainOf(partner.email);
  if (partnerDomain) {
    const byDomain = rated.filter((c) => {
      const d = domainOf(c.websiteUri);
      return d != null && (d === partnerDomain || d.endsWith(`.${partnerDomain}`));
    });
    if (byDomain.length > 0) {
      // Plusieurs agences du meme site : la fiche la plus notee est le siege
      // dans les faits, et c est la meme entreprise de toute facon.
      const best = byDomain.reduce((a, b) =>
        (b.userRatingCount ?? 0) > (a.userRatingCount ?? 0) ? b : a);
      return { place: best, reason: "domain" };
    }
  }

  const core = normalizeBusinessName(partner.name);
  if (!core) return null;
  const byName = rated.filter((c) => {
    const candidate = normalizeBusinessName(c.displayName ?? "");
    if (!candidate) return false;
    return candidate.includes(core) || core.includes(candidate);
  });
  if (byName.length === 1) return { place: byName[0], reason: "name" };
  return null;
}
