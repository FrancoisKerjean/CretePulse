#!/usr/bin/env node
/**
 * scripts/capture-airbnb-facts.mjs
 *
 * Capture des faits Airbnb d une annonce Stays et ecriture en base.
 *
 * Tourne sur le VPS ou en local, JAMAIS depuis Vercel : Airbnb bloque les IP cloud.
 *
 * Regle d ecriture, non negociable :
 *   - Un FAIT (max_guests, lat, lng, description_locale) n est ecrit QUE si la colonne
 *     est nulle en base. Une saisie du proprietaire n est JAMAIS ecrasee par un scrape.
 *   - La NOTE (rating_avg, reviews_count) et sa date de releve (reviews_captured_at)
 *     sont TOUJOURS rafraichies : c est leur raison d etre.
 *   - En cas d echec (pas d URL, HTTP non 200, rien de parsable), RIEN n est ecrit et
 *     une ligne de journal dit pourquoi. Une capture ratee ne doit jamais vider une
 *     note deja en base.
 *   - 3 secondes d attente entre deux pages.
 *
 * Usage :
 *   node --experimental-strip-types scripts/capture-airbnb-facts.mjs --id 12
 *   node --experimental-strip-types scripts/capture-airbnb-facts.mjs --all-missing
 *   node --experimental-strip-types scripts/capture-airbnb-facts.mjs --id 12 --dry-run
 *
 * Le drapeau --experimental-strip-types est OBLIGATOIRE : ce script importe
 * `parseAirbnbFacts` depuis un module TypeScript (src/lib/stays/airbnb-facts.ts), comme
 * le font deja scripts/backfill-owner-tokens.mjs et les scripts check-*.mjs du depot.
 * Le parseur n est PAS duplique ici : une seule implementation, celle qui est testee.
 *
 * Environnement (charge depuis ~/.kairos-keys et .env.local, comme
 * scripts/backfill-affiliate-content.mjs ; process.env est prioritaire) :
 *   URL : SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL
 *   CLE : SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY ou CRETEPULSE_SERVICE_ROLE_KEY
 * Aucune URL n est codee en dur : le script ecrit dans la base que l environnement
 * designe, et il journalise l hote vise au demarrage pour que ce soit verifiable AVANT
 * la premiere ecriture.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseAirbnbFacts } from "../src/lib/stays/airbnb-facts.ts";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

/** Une page toutes les 3 s : on ne martele pas Airbnb. */
const DELAY_MS = 3000;

// --- Arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ALL_MISSING = args.includes("--all-missing");
const HELP = args.includes("--help") || args.includes("-h");
const ID_ARG = (() => {
  const i = args.indexOf("--id");
  if (i < 0) return null;
  const n = Number(args[i + 1]);
  return Number.isInteger(n) ? n : NaN;
})();

function usage() {
  console.log(`capture-airbnb-facts - capture des faits Airbnb d une annonce Stays

Usage :
  node --experimental-strip-types scripts/capture-airbnb-facts.mjs --id <n>
  node --experimental-strip-types scripts/capture-airbnb-facts.mjs --all-missing

Options :
  --id <n>        traite la seule annonce d identifiant <n>
  --all-missing   traite toutes les annonces dont reviews_captured_at est nul
  --dry-run       affiche le patch qui SERAIT applique, n ecrit RIEN en base
  --help, -h      affiche cette aide

Ecriture : les faits (max_guests, lat, lng, description_locale) ne sont ecrits que si la
colonne est nulle. rating_avg, reviews_count et reviews_captured_at sont toujours
rafraichis. Un echec n ecrit rien du tout.`);
}

if (HELP) {
  usage();
  process.exit(0);
}

if (ID_ARG === null && !ALL_MISSING) {
  console.error("ABORT: mode absent. Attendu --id <n> ou --all-missing.\n");
  usage();
  process.exit(1);
}

if (Number.isNaN(ID_ARG)) {
  console.error("ABORT: --id attend un entier.");
  process.exit(1);
}

// --- Environnement ---------------------------------------------------------

/**
 * Charge ~/.kairos-keys puis .env.local, dans cet ordre. process.env reste
 * prioritaire : une variable posee dans le shell ou le cron gagne toujours.
 */
function loadEnv() {
  const env = {};
  const envLocalPath = new URL("../.env.local", import.meta.url).pathname.replace(
    /^\/([A-Za-z]:)/,
    "$1",
  );
  const sources = [join(homedir(), ".kairos-keys"), envLocalPath];
  for (const src of sources) {
    try {
      for (const line of readFileSync(src, "utf8").split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m) env[m[1]] = m[2].trim();
      }
    } catch {
      // fichier absent : on continue, l autre source ou process.env peut suffire
    }
  }
  return { ...env, ...process.env };
}

const ENV = loadEnv();

const SUPABASE_URL = ENV.SUPABASE_URL || ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  ENV.SUPABASE_SERVICE_KEY ||
  ENV.SUPABASE_SERVICE_ROLE_KEY ||
  ENV.CRETEPULSE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "ABORT: base introuvable. Il faut une URL (SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL) " +
      "et une cle de service (SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY ou " +
      "CRETEPULSE_SERVICE_ROLE_KEY), dans ~/.kairos-keys, .env.local ou l environnement. " +
      "Aucune valeur n est codee en dur ici.",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- Capture ---------------------------------------------------------------

/**
 * Construit le patch a appliquer a partir de l annonce en base et des faits parses.
 * Rend null si rien n est exploitable : dans ce cas RIEN ne doit etre ecrit, surtout
 * pas reviews_captured_at seul, qui ferait passer l annonce pour relevee.
 */
function buildPatch(listing, facts) {
  // Rien de parsable : on refuse d ecrire. Ecrire une date de releve sans note
  // reviendrait a certifier une capture qui n a rien capture.
  if (facts.ratingAvg == null && facts.maxGuests == null) return null;

  const patch = { reviews_captured_at: new Date().toISOString() };

  // Note et nombre d avis : toujours rafraichis.
  if (facts.ratingAvg != null) patch.rating_avg = facts.ratingAvg;
  if (facts.reviewsCount != null) patch.reviews_count = facts.reviewsCount;

  // Faits : seulement si la colonne est vide en base. Une saisie du proprietaire
  // n est jamais ecrasee par un scrape.
  if (listing.max_guests == null && facts.maxGuests != null) patch.max_guests = facts.maxGuests;
  if (listing.lat == null && facts.lat != null) patch.lat = facts.lat;
  if (listing.lng == null && facts.lng != null) patch.lng = facts.lng;
  if (listing.description_locale == null && facts.descriptionLocale != null) {
    patch.description_locale = facts.descriptionLocale;
  }

  return patch;
}

async function captureOne(listing) {
  if (!listing.airbnb_url) {
    return { id: listing.id, ok: false, why: "no airbnb_url" };
  }

  let html;
  try {
    const res = await fetch(listing.airbnb_url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    // HTTP non 200 : information, pas bug a forcer. Un 403 veut dire qu Airbnb
    // bloque cette IP. On n ecrit rien.
    if (!res.ok) return { id: listing.id, ok: false, why: `http ${res.status}` };
    html = await res.text();
  } catch (e) {
    return { id: listing.id, ok: false, why: `fetch: ${e.message}` };
  }

  const facts = parseAirbnbFacts(html);
  const patch = buildPatch(listing, facts);
  if (!patch) {
    return { id: listing.id, ok: false, why: "rien de parsable" };
  }

  if (DRY_RUN) {
    return { id: listing.id, ok: true, dryRun: true, patch };
  }

  const { error } = await db.from("stay_listings").update(patch).eq("id", listing.id);
  if (error) return { id: listing.id, ok: false, why: `db: ${error.message}` };
  return { id: listing.id, ok: true, patch };
}

// --- Main ------------------------------------------------------------------

const mode = ID_ARG !== null ? `id=${ID_ARG}` : "all-missing";
console.log("--- capture-airbnb-facts ---");
console.log(`mode=${mode} dry-run=${DRY_RUN} db=${new URL(SUPABASE_URL).host}`);
if (DRY_RUN) console.log("DRY RUN : aucune ecriture en base, le patch est seulement affiche.");
console.log("");

let q = db
  .from("stay_listings")
  .select("id,airbnb_url,max_guests,lat,lng,description_locale")
  .order("id");

if (ID_ARG !== null) q = q.eq("id", ID_ARG);
else q = q.is("reviews_captured_at", null);

const { data, error } = await q;
if (error) {
  console.error(`ABORT: lecture des annonces impossible : ${error.message}`);
  process.exit(1);
}

const listings = data ?? [];
if (!listings.length) {
  console.log("Aucune annonce a traiter.");
  process.exit(0);
}

console.log(`${listings.length} annonce(s) a traiter.\n`);

let ok = 0;
let failed = 0;

for (const [i, listing] of listings.entries()) {
  const r = await captureOne(listing);
  console.log(JSON.stringify(r));
  if (r.ok) ok++;
  else failed++;

  // 3 s entre deux pages, sauf apres la derniere.
  if (i < listings.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }
}

console.log(`\n--- Termine. ok=${ok} failed=${failed}${DRY_RUN ? " (dry run, rien d ecrit)" : ""} ---`);

// Sortie 1 seulement si TOUT a echoue : un echec isole (une annonce sans URL) ne doit
// pas faire echouer un passage complet en cron.
process.exit(failed > 0 && failed === listings.length ? 1 : 0);
