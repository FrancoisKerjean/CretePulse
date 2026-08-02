// Regles de l'espace proprietaire, pures et testees.
//
// Un proprietaire modifie son annonce sans qu'un humain relise : les garde-fous
// sont donc ici, pas dans la vigilance de quelqu'un.

/** Bornes de saisie. Larges, mais elles arretent la faute de frappe. */
export const MAX_PRICE_EUR = 5_000;
export const MAX_MIN_NIGHTS = 30;
/** Plage maximale bloquable en une fois, en nuits. */
export const MAX_BLOCK_NIGHTS = 180;

export interface OwnerUpdate {
  basePriceEur?: number;
  cleaningFeeEur?: number;
  minNights?: number;
  published?: boolean;
}

/** Rend un message d'erreur lisible, ou `null` si la mise a jour est valable. */
export function validateOwnerUpdate(u: OwnerUpdate): string | null {
  if (u.basePriceEur !== undefined) {
    if (!Number.isFinite(u.basePriceEur) || u.basePriceEur <= 0) {
      return "Le prix par nuit doit être supérieur à zéro.";
    }
    // Une annonce a 12000 EUR au lieu de 120 partirait en ligne telle quelle.
    if (u.basePriceEur > MAX_PRICE_EUR) {
      return `Le prix par nuit dépasse ${MAX_PRICE_EUR} EUR, vérifiez la saisie.`;
    }
  }
  if (u.cleaningFeeEur !== undefined) {
    if (!Number.isFinite(u.cleaningFeeEur) || u.cleaningFeeEur < 0) {
      return "Les frais de ménage ne peuvent pas être négatifs.";
    }
  }
  if (u.minNights !== undefined) {
    if (!Number.isInteger(u.minNights) || u.minNights < 1 || u.minNights > MAX_MIN_NIGHTS) {
      return `Le minimum de nuits doit être compris entre 1 et ${MAX_MIN_NIGHTS}.`;
    }
  }
  return null;
}

const DAY_MS = 86_400_000;

/**
 * Nuits couvertes par une plage, depart exclu. Rend une liste vide sur une
 * plage inversee, nulle, ou plus longue que MAX_BLOCK_NIGHTS : une erreur de
 * saisie ne doit pas ecrire des centaines de lignes en base.
 */
export function nightsToBlock(dateFrom: string, dateTo: string): string[] {
  const from = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
  const to = new Date(`${dateTo}T00:00:00.000Z`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  if ((to - from) / DAY_MS > MAX_BLOCK_NIGHTS) return [];
  const out: string[] = [];
  for (let t = from; t < to; t += DAY_MS) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/**
 * Le proprietaire ne libere que ce qu'il a lui-meme pose. Une nuit vendue le
 * laisserait revendre ailleurs une nuit deja payee ; une nuit OTA reviendrait a
 * la synchro suivante.
 */
export function canRelease(status: string): boolean {
  return status === "hold";
}
