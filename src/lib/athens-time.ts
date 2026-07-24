// Heure locale Europe/Athens (lib pure, client/server).
// Utilise par TimeChips, DepBoard (copie locale autonome) et NextDeparture.

/** Date ISO (YYYY-MM-DD) et minutes ecoulees depuis minuit, en TZ Athens. */
export function athensNow(): { iso: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    iso: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (parseInt(get("hour")) % 24) * 60 + parseInt(get("minute")),
  };
}

/** "HH:MM" en minutes depuis minuit. */
export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Minutes-depuis-minuit (Athens) → "HH:MM", modulo 24h (gère l'arrivée le lendemain). */
export const clockHHMM = (minutes: number): string => {
  const m = (((Math.round(minutes) % 1440) + 1440) % 1440);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Jour suivant (YYYY-MM-DD) d'une date ISO. Déterministe (entrée datée),
 * donc utilisable en render React sans violer la règle de pureté (≠ Date.now()). */
export const nextDayIso = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
