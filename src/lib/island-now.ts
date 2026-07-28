// Baromètre de l'île (hero home v2) : règles pures de sélection et d'affichage.
// AUCUNE estimation ici, uniquement des faits observés ou planifiés.
// Testé par scripts/check-island-now.mjs.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
export interface CruiseCallRow {
  call_date: string;
  port: string;
  ship_name: string;
  pax_capacity: number | null;
  eta: string | null;
  etd: string | null;
}

export interface CruiseLine {
  port: string;
  /** Somme des capacités des navires à quai ce jour. C'est une CAPACITÉ, pas un comptage. */
  paxCapacity: number;
  ships: { name: string; eta: string | null; etd: string | null }[];
}

/** Fenêtre de fraîcheur du GPS bus, en minutes. */
export const BUS_MAX_AGE_MIN = 15;

/** Date du jour à Athènes au format YYYY-MM-DD (en-CA rend l'ISO court). */
export function athensDate(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(new Date(now));
}

export function pickTodayCruise(calls: CruiseCallRow[], today: string): CruiseLine | null {
  const todays = calls
    .filter((c) => c.call_date === today && typeof c.pax_capacity === "number" && c.pax_capacity > 0)
    .sort((a, b) => (b.pax_capacity as number) - (a.pax_capacity as number));
  if (todays.length === 0) return null;
  return {
    port: todays[0].port,
    paxCapacity: todays.reduce((sum, c) => sum + (c.pax_capacity as number), 0),
    ships: todays.map((c) => ({ name: c.ship_name, eta: c.eta, etd: c.etd })),
  };
}

export function countTrackedVehicles(rows: { vehicle_key: string }[]): number {
  return new Set(rows.map((r) => r.vehicle_key)).size;
}

/**
 * Les réseaux urbains ne roulent pas la nuit et les crons GPS tournent de 4h à
 * 20h UTC : on masque la ligne au lieu d'afficher zéro.
 */
export function shouldShowBuses(tracked: number, asOf: string | null, now: number, maxAgeMin = BUS_MAX_AGE_MIN): boolean {
  if (tracked <= 0 || !asOf) return false;
  const t = Date.parse(asOf);
  if (Number.isNaN(t)) return false;
  return now - t <= maxAgeMin * 60_000;
}
