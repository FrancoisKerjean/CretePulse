// Helpers jetons du flux devis voiture. Node-safe (crypto), utilisable côté
// route serveur. Même principe que les tokens d'avis (cb_reviews) : on stocke
// le SHA256 en base, jamais le jeton en clair ; le jeton en clair ne vit que
// dans l'URL envoyée par email.
import { createHash, randomUUID } from "crypto";

export const newToken = (): string => randomUUID();

export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const siteBase = (): string =>
  process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
