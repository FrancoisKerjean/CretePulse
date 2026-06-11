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
