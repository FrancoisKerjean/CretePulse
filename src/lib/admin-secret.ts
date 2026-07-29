import { timingSafeEqual } from "node:crypto";

/**
 * Comparaison d'un secret d'admin fournie par le client contre celui de
 * l'environnement.
 *
 * Deux exigences, comme pour `assertCron` (src/lib/cron-auth.ts) :
 *  - echec ferme : pas de secret configure => personne ne passe.
 *  - temps constant : `!==` s'arrete au premier octet different, le temps de
 *    reponse fuit alors la longueur du prefixe correct. La longueur du secret
 *    n'est pas confidentielle, on la controle avant timingSafeEqual, qui leve
 *    sur des tailles inegales.
 */
export function isAdminSecret(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected) return false;
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
