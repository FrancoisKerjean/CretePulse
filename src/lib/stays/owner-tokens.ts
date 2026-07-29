// Jeton de l'espace proprietaire.
//
// Meme convention que le reste du site : pas de compte, pas de mot de passe, un
// lien a jeton. Seul le SHA256 vit en base, le clair ne passe que par l'URL
// envoyee au proprietaire.
//
// Difference avec les jetons d'acceptation ou de paiement : celui-ci est STABLE.
// Un proprietaire garde son lien dans sa boite mail pendant des mois, on ne le
// regenere jamais tant qu'il existe.
import { supabaseAdmin } from "../supabase-admin";
import { newToken, hashToken, siteBase } from "./tokens";

/**
 * Cree le jeton d'espace du proprietaire s'il n'en a pas encore.
 * Rend le jeton EN CLAIR a la creation, `null` s'il en avait deja un ou si le
 * proprietaire n'existe pas. Le clair n'est jamais relisible ensuite : c'est
 * voulu, il n'existe que le temps de partir dans un email.
 */
export async function ensureOwnerToken(ownerId: number): Promise<string | null> {
  const { data: owner } = await supabaseAdmin
    .from("stay_owners")
    .select("id, owner_token_hash")
    .eq("id", ownerId)
    .maybeSingle();

  if (!owner) return null;
  if (owner.owner_token_hash) return null;

  const token = newToken();
  await supabaseAdmin
    .from("stay_owners")
    .update({ owner_token_hash: hashToken(token) })
    .eq("id", ownerId);
  return token;
}

/** URL de l'espace proprietaire, dans sa langue. */
export function ownerSpaceUrl(token: string, locale = "en"): string {
  return `${siteBase()}/${locale}/stays/owner/${token}`;
}
