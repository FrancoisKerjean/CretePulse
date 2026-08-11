#!/usr/bin/env node
/**
 * scripts/capture-airbnb-facts.mjs
 *
 * Capture des faits Airbnb d une annonce Stays et ecriture en base.
 *
 * Tourne sur le VPS ou en local, JAMAIS depuis Vercel : Airbnb bloque les IP cloud.
 * Verifie le 11/08/2026 : le VPS obtient bien un HTTP 200 sur une page Airbnb.
 *
 * ⛔ DEPLOIEMENT VPS, a tenir en phase. Le cron quotidien de 05:20 UTC execute une
 * COPIE de ce fichier, dans /opt/cretepulse/stays-capture/, avec les deux modules
 * qu il importe (src/lib/stays/airbnb-facts.ts et patch-sql.ts). Le VPS n a pas le
 * depot. Toute modification ici, ou dans l un de ces deux modules, doit etre
 * recopiee, sinon la prod diverge en silence :
 *   scp scripts/capture-airbnb-facts.mjs kairos-vps:/opt/cretepulse/stays-capture/scripts/
 *   scp src/lib/stays/{airbnb-facts,patch-sql}.ts kairos-vps:/opt/cretepulse/stays-capture/src/lib/stays/
 * SHORTCUT: copie manuelle, declencheur d upgrade = un 3e fichier a synchroniser,
 * ou une divergence constatee entre le depot et le VPS.
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
import { spawnSync } from "node:child_process";
import { parseAirbnbFacts } from "../src/lib/stays/airbnb-facts.ts";
import { buildUpdateSql } from "../src/lib/stays/patch-sql.ts";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

/** Une page toutes les 3 s : on ne martele pas Airbnb. */
const DELAY_MS = 3000;

// --- Arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ALL_MISSING = args.includes("--all-missing");
const HELP = args.includes("--help") || args.includes("-h");
/**
 * Ecriture par psql au lieu de PostgREST. C est le mode du VPS, ou Postgres est
 * en local : il ne demande AUCUNE cle de service.
 *
 * Il existe parce que le poste n a pas de cle pour le PostgREST du VPS et que la
 * seule cle service_role disponible localement appartient a une AUTRE instance
 * Supabase : composer l URL du VPS avec cette cle rend `JWSInvalidSignature`.
 * C est ce qui a empeche ce worker de tourner une seule fois depuis le 01/08.
 */
const VIA_PSQL = args.includes("--via-psql");
const ID_ARG = (() => {
  const i = args.indexOf("--id");
  if (i < 0) return null;
  const n = Number(args[i + 1]);
  return Number.isInteger(n) ? n : NaN;
})();

/**
 * Age au-dela duquel une note deja relevee est reprise, en jours.
 *
 * `--all-missing` ne prend que les annonces jamais relevees : passe une fois, il
 * ne les regarde plus JAMAIS. Un cron quotidien qui ne ferait que ca laisserait
 * les notes se figer et le site affirmerait une note vieille de six mois comme
 * un fait du jour. C est le mode que le cron utilise.
 */
const STALE_DAYS = (() => {
  const i = args.indexOf("--stale");
  if (i < 0) return null;
  const n = Number(args[i + 1]);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
})();

function usage() {
  console.log(`capture-airbnb-facts - capture des faits Airbnb d une annonce Stays

Usage :
  node --experimental-strip-types scripts/capture-airbnb-facts.mjs --id <n>
  node --experimental-strip-types scripts/capture-airbnb-facts.mjs --all-missing

Options :
  --id <n>        traite la seule annonce d identifiant <n>
  --all-missing   traite toutes les annonces dont reviews_captured_at est nul
  --stale <j>     y ajoute celles relevees il y a plus de <j> jours (mode du cron :
                  sans lui, une note relevee une fois ne serait jamais rafraichie)
  --via-psql      lit et ecrit par psql au lieu de PostgREST (mode VPS, sans cle)
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

if (ID_ARG === null && !ALL_MISSING && STALE_DAYS === null) {
  console.error("ABORT: mode absent. Attendu --id <n>, --all-missing ou --stale <jours>.\n");
  usage();
  process.exit(1);
}

if (Number.isNaN(ID_ARG)) {
  console.error("ABORT: --id attend un entier.");
  process.exit(1);
}

if (Number.isNaN(STALE_DAYS)) {
  console.error("ABORT: --stale attend un entier positif ou nul (en jours).");
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

const SELECT_COLUMNS = "id,airbnb_url,max_guests,lat,lng,description_locale";

/**
 * Adaptateur psql. Postgres est local sur le VPS : aucune cle, aucun JWT, et le
 * `docker exec` s authentifie par l acces machine. La commande reste
 * configurable, rien n est code en dur.
 *
 * Le SQL d ecriture est construit par `buildUpdateSql`, module pur teste : les
 * valeurs viennent d un scrape, donc la liste des colonnes est fermee et toute
 * valeur du mauvais type leve au lieu de finir dans la requete.
 */
function psqlStore() {
  const argv = (
    ENV.STAYS_PSQL_CMD || "docker exec -i cretepulse-postgres psql -U postgres -d cretepulse"
  ).trim().split(/\s+/);

  function run(sql) {
    const r = spawnSync(argv[0], [...argv.slice(1), "-v", "ON_ERROR_STOP=1", "-t", "-A", "-q"], {
      input: sql,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (r.error) throw new Error(`psql injoignable : ${r.error.message}`);
    if (r.status !== 0) throw new Error(`psql a echoue : ${(r.stderr || "").trim()}`);
    return (r.stdout || "").trim();
  }

  return {
    label: argv.join(" "),
    async read(idArg) {
      // `idArg` et STALE_DAYS sont deja valides entiers par le parsing des arguments.
      const where =
        idArg !== null
          ? `id = ${idArg}`
          : STALE_DAYS !== null
            ? `reviews_captured_at is null or reviews_captured_at < now() - interval '${STALE_DAYS} days'`
            : "reviews_captured_at is null";
      const out = run(
        `select coalesce(json_agg(t order by t.id), '[]'::json) from ` +
          `(select ${SELECT_COLUMNS} from stay_listings where ${where}) t;`,
      );
      return JSON.parse(out || "[]");
    },
    async write(id, patch) {
      run(buildUpdateSql(id, patch));
    },
  };
}

/**
 * Adaptateur PostgREST, celui du poste et de tout ce qui a une cle de service.
 *
 * `@supabase/supabase-js` est importe ICI et pas en tete de fichier : en mode
 * --via-psql le worker tourne sur le VPS, hors du depot et donc sans
 * node_modules. Un import statique le ferait echouer au chargement alors qu il
 * n a besoin d aucune dependance npm dans ce mode.
 */
async function supabaseStore() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = ENV.SUPABASE_URL || ENV.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    ENV.SUPABASE_SERVICE_KEY ||
    ENV.SUPABASE_SERVICE_ROLE_KEY ||
    ENV.CRETEPULSE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "ABORT: base introuvable. Il faut une URL (SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL) " +
        "et une cle de service (SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY ou " +
        "CRETEPULSE_SERVICE_ROLE_KEY), dans ~/.kairos-keys, .env.local ou l environnement. " +
        "Aucune valeur n est codee en dur ici. Sur une machine ou Postgres est local, " +
        "utiliser --via-psql plutot qu une cle.",
    );
    process.exit(1);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    label: new URL(url).host,
    async read(idArg) {
      let q = db.from("stay_listings").select(SELECT_COLUMNS).order("id");
      if (idArg !== null) q = q.eq("id", idArg);
      else if (STALE_DAYS !== null) {
        const cutoff = new Date(Date.now() - STALE_DAYS * 86400000).toISOString();
        q = q.or(`reviews_captured_at.is.null,reviews_captured_at.lt.${cutoff}`);
      } else q = q.is("reviews_captured_at", null);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async write(id, patch) {
      const { error } = await db.from("stay_listings").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

const store = VIA_PSQL ? psqlStore() : await supabaseStore();

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
    // Une annonce sans URL Airbnb n est pas une PANNE, c est un etat : elle est
    // hors du perimetre de ce worker. La compter comme un echec ferait sortir le
    // cron en erreur tous les matins pour une situation normale et stable, et ce
    // bruit finirait par masquer une vraie panne.
    return { id: listing.id, ok: false, skipped: true, why: "no airbnb_url" };
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

  try {
    await store.write(listing.id, patch);
  } catch (e) {
    return { id: listing.id, ok: false, why: `db: ${e.message}` };
  }
  return { id: listing.id, ok: true, patch };
}

// --- Main ------------------------------------------------------------------

const mode =
  ID_ARG !== null
    ? `id=${ID_ARG}`
    : STALE_DAYS !== null
      ? `stale>${STALE_DAYS}j`
      : "all-missing";
console.log("--- capture-airbnb-facts ---");
console.log(`mode=${mode} dry-run=${DRY_RUN} via=${VIA_PSQL ? "psql" : "postgrest"} db=${store.label}`);
if (DRY_RUN) console.log("DRY RUN : aucune ecriture en base, le patch est seulement affiche.");
console.log("");

let listings;
try {
  listings = await store.read(ID_ARG);
} catch (e) {
  console.error(`ABORT: lecture des annonces impossible : ${e.message}`);
  process.exit(1);
}
if (!listings.length) {
  console.log("Aucune annonce a traiter.");
  process.exit(0);
}

console.log(`${listings.length} annonce(s) a traiter.\n`);

let ok = 0;
let failed = 0;
let skipped = 0;

for (const [i, listing] of listings.entries()) {
  const r = await captureOne(listing);
  console.log(JSON.stringify(r));
  if (r.ok) ok++;
  else if (r.skipped) skipped++;
  else failed++;

  // 3 s entre deux pages, sauf apres la derniere.
  if (i < listings.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }
}

console.log(
  `\n--- Termine. ok=${ok} skipped=${skipped} failed=${failed}` +
    `${DRY_RUN ? " (dry run, rien d ecrit)" : ""} ---`,
);

// Sortie 1 seulement si TOUTES les annonces REELLEMENT tentees ont echoue : une
// panne generale (Airbnb qui bloque l IP, base injoignable) doit se voir. Les
// annonces sautees faute d URL ne comptent pas : sinon le cron sortirait en
// erreur chaque matin sur un etat parfaitement normal.
const attempted = ok + failed;
process.exit(attempted > 0 && failed === attempted ? 1 : 0);
