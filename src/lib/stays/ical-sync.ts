// Diff entre le flux iCal d'un propriétaire (Airbnb, Booking) et l'etat de
// disponibilite en base.
//
// Sans cette synchronisation, la publication lisait le flux puis le jetait : un
// proprietaire reste sur Airbnb louait deux fois les memes nuits. Le surbooking
// n'etait pas un risque, il etait garanti.
//
// INVARIANT CENTRAL : le flux OTA n'a autorite que sur les nuits qu'il a lui-meme
// bloquees. Une nuit vendue par crete.direct (`booked`) ou posee a la main par le
// proprietaire (`hold`) n'est JAMAIS liberee par une synchronisation, quoi que
// dise le flux. Un flux tronque ou une panne de lecture ne doit pas rouvrir a la
// vente une nuit deja payee.
import type { DateRange } from "./ical";

/** Statut d'une nuit en base. Seul `blocked_ota` appartient au flux. */
export interface NightState {
  date: string;
  status: string;
}

export interface OtaDiff {
  /** Nuits a marquer `blocked_ota`. */
  toBlock: string[];
  /** Nuits `blocked_ota` disparues du flux, a liberer. */
  toRelease: string[];
}

const DAY_MS = 86_400_000;

/** Nuits occupees par une plage iCal. DTEND est exclusif : la nuit de depart est libre. */
function nightsOf(range: DateRange): string[] {
  const from = new Date(`${range.dateFrom}T00:00:00.000Z`).getTime();
  const to = new Date(`${range.dateTo}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  const out: string[] = [];
  for (let t = from; t < to; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function diffOtaNights(feed: DateRange[], current: NightState[]): OtaDiff {
  const feedNights = new Set<string>();
  for (const range of feed) for (const night of nightsOf(range)) feedNights.add(night);

  const known = new Map(current.map((n) => [n.date, n.status]));

  const toBlock = [...feedNights]
    // Deja bloquee, vendue ou retenue : on ne touche pas.
    .filter((date) => !known.has(date))
    .sort();

  const toRelease = current
    .filter((n) => n.status === "blocked_ota" && !feedNights.has(n.date))
    .map((n) => n.date)
    .sort();

  return { toBlock, toRelease };
}
