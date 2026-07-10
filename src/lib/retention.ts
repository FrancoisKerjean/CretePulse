// src/lib/retention.ts : calcul PUR des props de rétention (lot 0 app compagnon).
// RGPD : aucune donnée personnelle ; l'état reste dans le localStorage du visiteur,
// seules des props catégorielles plafonnées partent vers Plausible.

export const RETENTION_STORAGE_KEY = "cd_visit";

export type StoredVisit = { f: number; l: number; n: number }; // firstSeen, lastSeen, count
export type RetentionProps = {
  visit_number: string; // "1".."50" puis "50+"
  days_since_first: string; // "0".."30" puis "30+"
  bucket: "new" | "same_day" | "d1" | "d2_7" | "d8_plus";
};

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: number, b: number): number {
  // Jours calendaires UTC : un retour à 23h59 puis 00h01 compte comme J+1.
  return Math.floor(b / DAY) - Math.floor(a / DAY);
}

export function computeRetention(
  raw: string | null,
  now: number,
): { props: RetentionProps; next: StoredVisit } {
  let prev: StoredVisit | null = null;
  if (raw) {
    try {
      const p = JSON.parse(raw) as Partial<StoredVisit>;
      if (typeof p.f === "number" && typeof p.l === "number" && typeof p.n === "number") {
        prev = p as StoredVisit;
      }
    } catch {
      prev = null;
    }
  }

  if (!prev) {
    return {
      props: { visit_number: "1", days_since_first: "0", bucket: "new" },
      next: { f: now, l: now, n: 1 },
    };
  }

  const sinceLast = daysBetween(prev.l, now);
  const sinceFirst = daysBetween(prev.f, now);
  const bucket: RetentionProps["bucket"] =
    sinceLast <= 0 ? "same_day" : sinceLast === 1 ? "d1" : sinceLast <= 7 ? "d2_7" : "d8_plus";
  const count = prev.n + 1;

  return {
    props: {
      visit_number: count > 50 ? "50+" : String(count),
      days_since_first: sinceFirst > 30 ? "30+" : String(Math.max(0, sinceFirst)),
      bucket,
    },
    next: { f: prev.f, l: now, n: count },
  };
}
