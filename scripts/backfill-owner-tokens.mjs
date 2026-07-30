// scripts/backfill-owner-tokens.mjs
//
// Jeton d'espace pour les proprietaires qui n'en ont pas.
//
// Le lien d'espace n'est cree qu'a la publication (api/stays/publish). Les
// annonces importees avant la livraison du lot B n'ont donc pas de jeton, et
// leur proprietaire n'a aucun moyen d'atteindre son espace : pas de compte, pas
// de mot de passe, le lien EST l'acces.
//
// Le script appelle `ensureOwnerToken`, la meme fonction que la publication :
// une seule implementation du hachage, donc aucun risque qu'un jeton fabrique
// ici soit invalide a la lecture. `ensureOwnerToken` ne rend un jeton que s'il
// n'y en avait pas, et le clair n'est jamais relisible ensuite : il n'existe que
// dans la sortie de ce script. Le noter.
//
// A executer sur la base de PROD :
//   SUPABASE_SERVICE_KEY=... node --experimental-strip-types scripts/backfill-owner-tokens.mjs
//
// Options :
//   --dry-run   liste les proprietaires sans jeton, n'ecrit rien
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { ensureOwnerToken, ownerSpaceUrl } from "../src/lib/stays/owner-tokens.ts";

const dryRun = process.argv.includes("--dry-run");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis (base de prod).",
  );
  process.exit(1);
}

// `ensureOwnerToken` ecrit par supabaseAdmin, qui ne connait que
// NEXT_PUBLIC_SUPABASE_URL. Sans cette normalisation, un environnement qui ne
// declare que SUPABASE_URL fait tomber supabaseAdmin sur son client degrade :
// la lecture echoue, ensureOwnerToken rend null, et le script conclurait a tort
// que le proprietaire avait deja un jeton. Le premier passage du 30/07 est
// tombe exactement la.
process.env.NEXT_PUBLIC_SUPABASE_URL = url;

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: owners, error } = await sb
  .from("stay_owners")
  .select("id, email, name, locale, owner_token_hash")
  .order("id");

if (error) {
  console.error("Lecture des proprietaires impossible :", error.message);
  process.exit(1);
}

const missing = (owners ?? []).filter((o) => !o.owner_token_hash);

console.log(`${owners?.length ?? 0} proprietaire(s), ${missing.length} sans jeton d espace.`);

if (!missing.length) {
  console.log("Rien a faire.");
  process.exit(0);
}

let failures = 0;

for (const owner of missing) {
  const label = `#${owner.id} ${owner.email}`;
  if (dryRun) {
    console.log(`[dry-run] ${label}`);
    continue;
  }
  const token = await ensureOwnerToken(owner.id);
  if (!token) {
    // `ensureOwnerToken` rend null pour deux raisons opposees : le jeton existe
    // deja, ou la lecture a echoue. On releve l'etat reel plutot que de deviner,
    // sinon une panne d'ecriture se lit comme un succes.
    const { data: after } = await sb
      .from("stay_owners")
      .select("owner_token_hash")
      .eq("id", owner.id)
      .maybeSingle();
    if (after?.owner_token_hash) {
      console.log(`${label} : jeton pose entre temps, son clair n est pas recuperable.`);
    } else {
      console.error(`${label} : ECHEC, aucun jeton ecrit. Verifier l acces a la base.`);
      failures++;
    }
    continue;
  }
  // La locale du proprietaire, pour qu'il tombe sur son espace dans sa langue.
  console.log(`${label} : ${ownerSpaceUrl(token, owner.locale || "en")}`);
}

// Le clair ne se relit pas : ces liens n'existent que dans cette sortie.
console.log("\nConserver ces liens : le jeton en clair n est plus lisible ensuite.");

if (failures) {
  console.error(`${failures} proprietaire(s) sans jeton apres passage.`);
  process.exit(1);
}
