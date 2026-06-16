// Apparie beaches <-> cb_places et produit le SQL + les rapports de revue.
// Run (PowerShell, depuis la racine du repo, avec .env.local présent) :
//   node --experimental-strip-types scripts/match-beaches-cb.ts
// Lecture seule en base. Sorties dans scripts/out/.
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { matchBeachToCb, type GeoPoint } from "../src/lib/cb-link.ts";

// Charge .env.local si les variables ne sont pas déjà dans l'environnement.
function loadEnvLocal() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnvLocal();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) throw new Error("Missing Supabase env vars");
const supabase = createClient(URL, KEY);

interface BeachRow { slug: string; name_en: string; latitude: number | null; longitude: number | null; }
interface CbRow extends GeoPoint { name: string; }

async function main() {
  const { data: beaches, error: be } = await supabase
    .from("beaches")
    .select("slug, name_en, latitude, longitude")
    .order("name_en");
  if (be) throw be;

  // cb_places peut dépasser 1000 lignes de plages : pagination.
  const cb: CbRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cb_places")
      .select("slug, name, latitude, longitude")
      .eq("place_type", "beach")
      .not("latitude", "is", null)
      .order("slug")
      .range(from, from + 999);
    if (error) throw error;
    const batch = (data as CbRow[]) || [];
    cb.push(...batch);
    if (batch.length < 1000) break;
  }

  const cbName = new Map(cb.map((c) => [c.slug, c.name]));
  const high: string[] = [];
  const review: string[] = [];
  const none: string[] = [];

  for (const b of (beaches as BeachRow[]) || []) {
    // préfiltre bbox ~±2km pour limiter le coût haversine
    const cands = cb.filter(
      (c) =>
        c.latitude != null && c.longitude != null && b.latitude != null && b.longitude != null &&
        Math.abs(c.latitude - b.latitude) < 0.02 && Math.abs(c.longitude - b.longitude) < 0.02,
    );
    const r = matchBeachToCb(b, cands);
    if (r.confidence === "high" && r.cbSlug) {
      high.push(`UPDATE beaches SET cb_slug='${r.cbSlug}', cb_match_m=${r.distanceM} WHERE slug='${b.slug}';`);
    } else if (r.confidence === "review") {
      const near = cands
        .map((c) => ({ slug: c.slug, name: cbName.get(c.slug) ?? c.slug,
          m: Math.round(matchBeachToCb(b, [c]).distanceM ?? 0) }))
        .filter((c) => c.m > 0 && c.m <= 1500)
        .sort((a, c) => a.m - c.m)
        .slice(0, 4)
        .map((c) => `\`${c.slug}\` (${c.name}, ${c.m} m)`)
        .join(" · ");
      review.push(`| ${b.slug} | ${b.name_en} | ${near || "—"} |`);
    } else {
      none.push(`- ${b.slug} (${b.name_en})`);
    }
  }

  const outDir = path.join(process.cwd(), "scripts", "out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "match-beaches-cb.high.sql"),
    `-- ${high.length} liens auto (confiance haute). Appliquer sur le VPS.\n` +
      high.join("\n") + "\nnotify pgrst, 'reload schema';\n",
  );
  fs.writeFileSync(
    path.join(outDir, "match-beaches-cb.review.md"),
    `# Cas à valider (${review.length})\n\nChoisis le bon cb_slug (ou raye la ligne si aucun).\n\n` +
      `| beach_slug | nom | candidats (slug, nom, distance) |\n|---|---|---|\n` +
      review.join("\n") + "\n",
  );
  fs.writeFileSync(
    path.join(outDir, "match-beaches-cb.none.md"),
    `# Sans candidat à <=1500m (${none.length})\n\n` + none.join("\n") + "\n",
  );

  console.log(`high=${high.length} review=${review.length} none=${none.length} -> scripts/out/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
