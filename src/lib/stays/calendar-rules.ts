// Bornes du calendrier de la fiche. Convention [) : la borne de sortie est exclue.
// Consequence NON INTUITIVE et deja gravee en base par la contrainte GIST :
// une nuit prise D interdit l ARRIVEE le D, jamais le DEPART le D. Deux sejours
// qui se touchent ne se chevauchent pas. Griser D en depart rendrait invendable
// tout trou adjacent a une reservation.
import { eachNight } from "./availability";

/** Une nuit prise ne peut pas etre une date d arrivee. */
export function canCheckIn(takenNights: string[], day: string): boolean {
  return !takenNights.includes(day);
}

/**
 * Depart valide : strictement apres l arrivee, et aucune nuit prise entre les
 * deux. Le jour de depart lui-meme n est PAS une nuit dormie, il peut etre pris.
 */
export function canCheckOut(takenNights: string[], from: string, to: string): boolean {
  const nights = eachNight(from, to);
  if (nights.length === 0) return false;
  return !nights.some((n) => takenNights.includes(n));
}

/**
 * Premiere nuit prise apres l arrivee : c est le dernier depart atteignable.
 * null si plus rien n est pris ensuite, l interface laisse alors courir.
 */
export function maxCheckOut(takenNights: string[], from: string): string | null {
  const after = takenNights.filter((n) => n > from).sort();
  return after[0] ?? null;
}
