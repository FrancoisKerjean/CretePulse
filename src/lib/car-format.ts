// Formats d'affichage des réservations de voiture (montants, échéances, dates
// murales), partagés par les pages, les e-mails et l'admin. Module pur : rien
// que Intl, utilisable côté client comme côté serveur.

/** Montant en euros dans la langue du client, centimes seulement s'il y en a. */
export function formatEur(eur: number, locale: string): string {
  const cents = Math.round(eur * 100) % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(eur);
}

/** Échéance de confirmation, toujours écrite à l'heure d'Athènes (celle du loueur). */
export function formatAthensDeadline(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Athens",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/**
 * Intertitre d'e-mail en capitales écrites, pas par `text-transform` : en grec,
 * les capitales perdent le tonos (« Η ΚΡΑΤΗΣΗ ΣΑΣ »), ce que la CSS des
 * messageries ne fait pas. Le tréma grec reste ; les accents français aussi.
 */
export function mailCaps(s: string): string {
  return (/[Ͱ-Ͽ]/.test(s) ? s.normalize("NFD").replace(/́/g, "").normalize("NFC") : s).toUpperCase();
}

/** Mot entre la date et l'heure, celui des gabarits d'e-mail. */
const AT_WORD: Record<string, string> = { en: "at", fr: "à", de: "um", el: "στις" };

/**
 * Date murale de prise ou de retour (« mardi 20 juillet 2027 à 10:00 »), à la
 * place de l'ISO. Formatée en UTC sur la date murale : le jour ne glisse jamais
 * avec le fuseau du serveur. Heure absente : la date seule. Date illisible :
 * rendue telle quelle plutôt que de casser la page ou l'e-mail.
 */
export function formatWallDate(date: string, time: string | null | undefined, locale: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d);
  if (!Number.isFinite(ms)) return date;
  const day = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(ms);
  return time ? `${day} ${AT_WORD[locale] ?? AT_WORD.en} ${time.slice(0, 5)}` : day;
}
