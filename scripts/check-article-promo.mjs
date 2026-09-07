// scripts/check-article-promo.mjs : tests purs du routage article vers service,
// de la détection de lieux, de la découpe HTML et de la liste pilote.
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md
// Lancé par `npm run check:article-promo` et par l'agrégat `npm run check`.
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  planArticlePromo,
  resolveArticlePromo,
  detectPlaces,
  detectionText,
  splitAfterSecondH2,
  variantFor,
  vanGenericFacts,
  PILOT_SLUGS,
  DETECT_WINDOW,
} from "../src/lib/article-promo.ts";
import { landingForPickup } from "../src/lib/car-landings.ts";

let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

// Trois H2 : le minimum pour qu'un encart mid soit autorisé.
const H2x3 = '<p>Intro.</p><h2 id="a">A</h2><p>a</p><h2 id="b">B</h2><p>b</p><h2 id="c">C</h2><p>c</p>';
const H2x2 = '<p>Intro.</p><h2 id="a">A</h2><p>a</p><h2 id="b">B</h2><p>b</p>';

function guide({ slug, format = "long", category, title = "", keywords = [], content = H2x3 }) {
  return { slug, format, category, keywords, titles: { en: title }, contents: { en: content } };
}
const kinds = (plan) => [plan.mid.kind, plan.end.kind];

// ── Routage : les dix slugs connus, catégorie réelle (PostgREST, 07/09/2026), titre représentatif ──

ok("best-beaches-crete (beaches, aucun lieu) : car / none", () => {
  const p = planArticlePromo(guide({ slug: "best-beaches-crete", category: "beaches", title: "The best beaches in Crete" }));
  assert.deepEqual(kinds(p), ["car", "none"]);
  assert.equal(p.mid.pickup, undefined);
});

ok("balos-lagoon-guide (beaches, Kissamos cité) : car pickup kissamos / bus depuis Kissamos", () => {
  const p = planArticlePromo(guide({ slug: "balos-lagoon-guide", category: "beaches", title: "Balos Lagoon guide: how to get there from Kissamos" }));
  assert.deepEqual(kinds(p), ["car", "bus"]);
  assert.equal(p.mid.pickup, "kissamos");
  assert.equal(p.end.busFrom, "Kissamos");
  assert.equal(p.end.busTo, undefined);
});

ok("best-areas-to-stay-crete (travel) : car générique / van générique, jamais stays", () => {
  const p = planArticlePromo(guide({ slug: "best-areas-to-stay-crete", category: "travel", title: "Best areas to stay in Crete" }));
  assert.deepEqual(kinds(p), ["car", "van"]);
  assert.equal(p.mid.pickup, undefined);
  assert.equal(p.end.corridor, undefined);
});

ok("long-term-rentals-crete (real-estate) : car générique / none", () => {
  const p = planArticlePromo(guide({ slug: "long-term-rentals-crete", category: "real-estate", title: "Long-term rentals in Crete" }));
  assert.deepEqual(kinds(p), ["car", "none"]);
  assert.equal(p.mid.pickup, undefined);
});

ok("e4-trail-crete (hikes, Sougia cité) : car / bus depuis Sougia", () => {
  const p = planArticlePromo(guide({ slug: "e4-trail-crete", category: "hikes", title: "The E4 trail in Crete", content: "<p>The coastal leg ends in Sougia.</p>" + H2x3 }));
  assert.deepEqual(kinds(p), ["car", "bus"]);
  assert.equal(p.end.busFrom, "Sougia");
});

ok("knossos-palace-complete-guide (history, Heraklion) : car pickup heraklion / bus depuis Heraklion", () => {
  const p = planArticlePromo(guide({ slug: "knossos-palace-complete-guide", category: "history", title: "Knossos Palace: complete guide from Heraklion" }));
  assert.deepEqual(kinds(p), ["car", "bus"]);
  assert.equal(p.mid.pickup, "heraklion");
  assert.ok(landingForPickup(p.mid.pickup), "heraklion a une landing");
  assert.equal(p.end.busFrom, "Heraklion");
});

ok("day-trips-from-heraklion (day-trips, Matala cité) : car pickup heraklion / van corridor Matala", () => {
  const p = planArticlePromo(guide({ slug: "day-trips-from-heraklion", category: "day-trips", title: "Day trips from Heraklion: Matala, Agios Nikolaos and more" }));
  assert.deepEqual(kinds(p), ["car", "van"]);
  assert.equal(p.mid.pickup, "heraklion");
  assert.equal(p.end.corridor?.slug, "heraklion-airport--matala");
});

ok("best-tavernas-chania (food) : car pickup chania / bus depuis Chania", () => {
  const p = planArticlePromo(guide({ slug: "best-tavernas-chania", category: "food", title: "Best tavernas in Chania" }));
  assert.deepEqual(kinds(p), ["car", "bus"]);
  assert.equal(p.mid.pickup, "chania");
  assert.equal(p.end.busFrom, "Chania");
});

ok("elafonisi-vs-balos-which-beach (beaches, Elafonisi est un lieu bus) : car / bus depuis Elafonisi", () => {
  const p = planArticlePromo(guide({ slug: "elafonisi-vs-balos-which-beach", category: "beaches", title: "Elafonisi vs Balos: which beach to choose" }));
  assert.deepEqual(kinds(p), ["car", "bus"]);
  assert.equal(p.end.busFrom, "Elafonisi");
});

ok("snorkeling-spots-crete-guide (nature en base, aucun lieu) : car / none", () => {
  const p = planArticlePromo(guide({ slug: "snorkeling-spots-crete-guide", category: "nature", title: "Snorkeling spots in Crete" }));
  assert.deepEqual(kinds(p), ["car", "none"]);
});

// ── Routage : formats daily et news ──

ok("daily/daily-weather : none / none", () => {
  const p = planArticlePromo(guide({ slug: "weather-2026-09-07", format: "daily", category: "daily-weather", title: "Crete weather, 7 September" }));
  assert.deepEqual(kinds(p), ["none", "none"]);
});

ok("daily/daily-news : none en mid, bus générique en end", () => {
  const p = planArticlePromo(guide({ slug: "news-2026-09-07", format: "daily", category: "daily-news", title: "Crete news, 7 September" }));
  assert.deepEqual(kinds(p), ["none", "bus"]);
  assert.equal(p.end.busFrom, undefined);
  assert.equal(p.end.variant, 1);
});

ok("news/airport : car landing heraklion-airport / van générique", () => {
  const p = planArticlePromo(guide({ slug: "heraklion-airport-works", format: "news", category: "airport", title: "New terminal works" }));
  assert.deepEqual(kinds(p), ["car", "van"]);
  assert.equal(p.mid.landing, "heraklion-airport");
  assert.equal(p.end.corridor, undefined);
});

ok("news/infrastructure : none en mid, bus générique en end", () => {
  const p = planArticlePromo(guide({ slug: "boak-progress", format: "news", category: "infrastructure", title: "BOAK progress" }));
  assert.deepEqual(kinds(p), ["none", "bus"], "news : format court, encart bus en fin comme daily-news");
});

ok("format short et format news ne tombent pas dans le défaut en silence", () => {
  const s = planArticlePromo(guide({ slug: "quick-tip", format: "short", category: "travel", title: "A quick tip" }));
  assert.deepEqual(kinds(s), ["car", "van"], "short/travel suit la ligne voyage (van générique en end)");
  const nw = planArticlePromo(guide({ slug: "permits-2026", format: "news", category: "permits", title: "Permits" }));
  assert.deepEqual(kinds(nw), ["none", "bus"], "news/permits suit la ligne news (bus en fin), pas le défaut car");
});

ok("catégorie inconnue : car générique / none", () => {
  const p = planArticlePromo(guide({ slug: "odd-one", category: "zzz", title: "Odd" }));
  assert.deepEqual(kinds(p), ["car", "none"]);
  assert.equal(p.mid.pickup, undefined);
});

// ── Routage : texte d'arrivée (ligne 5) ──

ok("texte d'arrivée avec Paleochora : van corridor en mid, car landing chania-airport en end", () => {
  const p = planArticlePromo(guide({ slug: "chania-airport-to-paleochora", category: "travel", title: "Getting to Paleochora from Chania Airport" }));
  assert.deepEqual(kinds(p), ["van", "car"]);
  assert.equal(p.mid.corridor?.slug, "chania-airport--paleochora");
  assert.equal(p.end.landing, "chania-airport");
});

ok("texte d'arrivée sans ville de corridor : van générique en mid, car landing heraklion-airport par défaut", () => {
  const p = planArticlePromo(guide({ slug: "airport-transfer-tips", category: "travel", title: "Airport transfer tips for Crete" }));
  assert.deepEqual(kinds(p), ["van", "car"]);
  assert.equal(p.mid.corridor, undefined);
  assert.equal(p.end.landing, "heraklion-airport");
});

// ── Règles transverses ──

ok("moins de trois H2 : mid none quelle que soit la catégorie", () => {
  for (const category of ["beaches", "hikes", "food", "travel", "day-trips", "family", "zzz"]) {
    const p = planArticlePromo(guide({ slug: `short-${category}`, category, title: "Chania", content: H2x2 }));
    assert.equal(p.mid.kind, "none", category);
  }
});

ok("le HTML rendu prime sur contents.en pour compter les H2", () => {
  const p = planArticlePromo(guide({ slug: "x", category: "beaches", content: H2x2 }), { html: H2x3 });
  assert.equal(p.mid.kind, "car");
});

ok("mid et end ne sont jamais du même kind", () => {
  const cats = ["beaches", "hikes", "nature", "day-trips", "food", "culture", "history", "nightlife", "travel", "tourism", "practical", "data", "family", "wellness", "expat", "real-estate", "property", "zzz", "airport", "infrastructure", "daily-news", "daily-weather"];
  const fmts = ["long", "mid", "short", "news", "daily"];
  const titles = ["", "Chania", "Paleochora", "Heraklion to Sitia by bus", "Airport transfer to Matala", "Kalyves and Rethymno"];
  for (const format of fmts) for (const category of cats) for (const title of titles) {
    const p = planArticlePromo(guide({ slug: `m-${format}-${category}`, format, category, title }));
    if (p.mid.kind !== "none") assert.notEqual(p.mid.kind, p.end.kind, `${format}/${category}/${title}`);
  }
});

ok("pickup hors zone : reste indéfini, on ne devine pas une agence", () => {
  const p = planArticlePromo(guide({ slug: "vai-palm-beach", category: "beaches", title: "Vai palm beach near Palekastro" }));
  assert.equal(p.mid.pickup, undefined);
});

ok("variant : stable pour un même slug, et chaque valeur sort sur 50 slugs", () => {
  assert.equal(variantFor("balos-lagoon-guide", 3), variantFor("balos-lagoon-guide", 3));
  const seen3 = new Set(), seen2 = new Set();
  for (let i = 0; i < 50; i++) { seen3.add(variantFor(`slug-${i}`, 3)); seen2.add(variantFor(`slug-${i}`, 2)); }
  assert.deepEqual([...seen3].sort(), [1, 2, 3]);
  assert.deepEqual([...seen2].sort(), [1, 2]);
  const a = planArticlePromo(guide({ slug: "best-tavernas-chania", category: "food", title: "Best tavernas in Chania" }));
  const b = planArticlePromo(guide({ slug: "best-tavernas-chania", category: "food", title: "Best tavernas in Chania" }));
  assert.equal(a.mid.variant, b.mid.variant);
});

ok("bus avec départ mais sans destination : variante 1 imposée (la v2 nomme {to})", () => {
  for (let i = 0; i < 20; i++) {
    const p = planArticlePromo(guide({ slug: `tav-${i}`, category: "food", title: "Best tavernas in Chania" }));
    assert.equal(p.end.variant, 1);
  }
  const pair = planArticlePromo(guide({ slug: "her-to-sitia", category: "food", title: "Eating in Heraklion and Sitia" }));
  assert.equal(pair.end.busFrom, "Heraklion");
  assert.equal(pair.end.busTo, "Siteia", "nom DB de BUS_PLACE_SLUGS, pas le mot du texte");
});

// ── Détection ──

ok("Paleochora dans le titre : corridor chania-airport--paleochora, sens aéroport vers ville", () => {
  const d = detectPlaces("Paleochora on foot");
  assert.equal(d.corridor?.slug, "chania-airport--paleochora");
  assert.equal(d.corridor?.fromName, "Chania Airport");
});

ok("Sitiaki ne matche pas Sitia ; Agios Nikolaos matche malgré l'espace", () => {
  assert.equal(detectPlaces("The Sitiaki festival").corridor, null);
  assert.equal(detectPlaces("A week in Agios Nikolaos").corridor?.slug, "heraklion-airport--agios-nikolaos");
});

ok("Chania : pickup chania avec landing ; Kalyves : pickup en zone, aucune landing", () => {
  const c = detectPlaces("Weekend in Chania");
  assert.equal(c.pickup, "chania");
  assert.ok(landingForPickup(c.pickup));
  const k = detectPlaces("Quiet days in Kalyves");
  assert.equal(k.pickup, "kalyves");
  assert.equal(landingForPickup(k.pickup), null);
});

ok("Chania Airport : landing chania-airport, pickup chania-airport, un seul lieu bus", () => {
  const d = detectPlaces("Landing at Chania Airport");
  assert.equal(d.airportLanding, "chania-airport");
  assert.equal(d.pickup, "chania-airport");
  assert.deepEqual(d.busPlaces, ["Chania Airport"]);
  assert.equal(d.arrival, true);
});

ok("deux villes citées : la première dans le texte gagne", () => {
  assert.equal(detectPlaces("From Rethymno to Matala").corridor?.slug, "heraklion-airport--rethymno");
  assert.equal(detectPlaces("From Matala to Rethymno").corridor?.slug, "heraklion-airport--matala");
});

ok("texte sans lieu : rien", () => {
  const d = detectPlaces("Olive oil and raki");
  assert.deepEqual(d, { corridor: null, pickup: null, airportLanding: null, busPlaces: [], arrival: false });
});

ok("le contenu au-delà de 1 500 caractères n'est pas lu", () => {
  const far = "<p>" + "lorem ".repeat(300) + "Sitia</p>" + H2x3;
  assert.ok(far.indexOf("Sitia") > DETECT_WINDOW);
  const g = guide({ slug: "x", category: "beaches", title: "Beaches", content: far });
  assert.equal(detectPlaces(detectionText(g)).corridor, null);
  const near = "<p>" + "lorem ".repeat(10) + "Sitia</p>" + H2x3;
  assert.equal(detectPlaces(detectionText(guide({ slug: "x", category: "beaches", title: "Beaches", content: near }))).corridor?.slug, "heraklion-airport--sitia");
});

ok("le slug est lu, tirets compris", () => {
  const g = guide({ slug: "hidden-beaches-agios-nikolaos", category: "beaches" });
  assert.equal(detectPlaces(detectionText(g)).corridor?.slug, "heraklion-airport--agios-nikolaos");
});

ok("les mots-clés sont lus", () => {
  const g = guide({ slug: "x", category: "beaches", keywords: ["Ierapetra beaches"] });
  assert.equal(detectPlaces(detectionText(g)).corridor?.slug, "heraklion-airport--ierapetra");
});

ok("faits van génériques lus dans VAN_CORRIDORS : 20 € et 8 paires", () => {
  assert.deepEqual(vanGenericFacts(), { price: 20, count: 8 });
});

// ── Découpe ──

ok("0, 1, 2 H2 : null", () => {
  assert.equal(splitAfterSecondH2("<p>a</p>"), null);
  assert.equal(splitAfterSecondH2('<h2 id="a">A</h2><p>a</p>'), null);
  assert.equal(splitAfterSecondH2(H2x2), null);
});

ok("3 H2 : deux parties, la seconde commence par <h2", () => {
  const r = splitAfterSecondH2(H2x3);
  assert.ok(r);
  assert.ok(r[1].startsWith("<h2"));
  assert.equal((r[0].match(/<h2\b/g) ?? []).length, 2);
});

ok("H2 dans un div ouvert : null ; H2 dans une ul ouverte : null", () => {
  assert.equal(splitAfterSecondH2('<div><h2>A</h2><h2>B</h2><h2>C</h2></div>'), null);
  assert.equal(splitAfterSecondH2('<h2>A</h2><ul><li><h2>B</h2></li><li><h2>C</h2></li></ul>'), null);
  assert.equal(splitAfterSecondH2('<h2>A</h2><a href="/x"><h2>B</h2><h2>C</h2></a>'), null);
});

ok("un div fermé avant la coupe ne bloque pas", () => {
  const html = '<div class="box"><p>x</p></div><h2>A</h2><p>a</p><h2>B</h2><p>b</p><h2>C</h2>';
  assert.ok(splitAfterSecondH2(html));
});

ok("les liens posés par autolinkHtml en partie 1 sont conservés octet pour octet", () => {
  const link = '<a href="/en/beaches/balos" class="text-sea hover:underline">Balos</a>';
  const html = `<p>See ${link} first.</p><h2>A</h2><p>a</p><h2>B</h2><p>b</p><h2>C</h2><p>c</p>`;
  const r = splitAfterSecondH2(html);
  assert.ok(r[0].includes(link));
});

ok("la concaténation des deux parties est égale à l'entrée", () => {
  const html = '<p>Intro</p><h2 id="a">A</h2><ul><li>x</li></ul><h2 id="b">B</h2><blockquote>q</blockquote><h2 id="c">C</h2><p>c</p>';
  const r = splitAfterSecondH2(html);
  assert.equal(r[0] + r[1], html);
});

// ── Pilote ──

ok("PILOT_SLUGS : 23 entrées uniques, minuscules, sans slash", () => {
  assert.equal(PILOT_SLUGS.length, 23);
  assert.equal(new Set(PILOT_SLUGS).size, 23);
  for (const s of PILOT_SLUGS) {
    assert.equal(s, s.toLowerCase(), s);
    assert.ok(!s.includes("/"), s);
    assert.ok(s.length > 0);
  }
  // Slug réel en base : elafonisi-vs-balos-which-beach (la spec l'abrégeait en elafonisi-vs-balos, qui n'existe pas).
  for (const known of ["best-beaches-crete", "balos-lagoon-guide", "best-areas-to-stay-crete", "long-term-rentals-crete", "e4-trail-crete", "knossos-palace-complete-guide", "day-trips-from-heraklion", "best-tavernas-chania", "elafonisi-vs-balos-which-beach", "snorkeling-spots-crete-guide"]) {
    assert.ok(PILOT_SLUGS.includes(known), `slug connu absent : ${known}`);
  }
});

ok("hors pilote : none / none ; dans le pilote : le plan", () => {
  const out = resolveArticlePromo(guide({ slug: "not-in-pilot", category: "food", title: "Best tavernas in Chania" }));
  assert.deepEqual(kinds(out), ["none", "none"]);
  const inn = resolveArticlePromo(guide({ slug: "best-tavernas-chania", category: "food", title: "Best tavernas in Chania" }));
  assert.deepEqual(kinds(inn), ["car", "bus"]);
});

// ── Textes : 33 feuilles articlePromo.* dans les 22 locales, variables ICU conservées ──

function leaves(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, leaves(v, p));
    else out[p] = v;
  }
  return out;
}
const icuVars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

ok("articlePromo : 33 feuilles dans chacune des 22 locales, mêmes variables ICU qu'en anglais", () => {
  const files = fs.readdirSync("src/messages").filter((f) => f.endsWith(".json"));
  assert.equal(files.length, 22);
  const en = leaves(JSON.parse(fs.readFileSync("src/messages/en.json", "utf8")).articlePromo ?? {});
  assert.equal(Object.keys(en).length, 33);
  for (const f of files) {
    const loc = leaves(JSON.parse(fs.readFileSync(`src/messages/${f}`, "utf8")).articlePromo ?? {});
    assert.deepEqual(Object.keys(loc).sort(), Object.keys(en).sort(), `${f} : jeu de clés`);
    for (const k of Object.keys(en)) {
      assert.equal(icuVars(loc[k]), icuVars(en[k]), `${f} ${k} : variables ICU`);
      assert.ok(!String(loc[k]).includes("\u2014"), `${f} ${k} : tiret cadratin`);
      assert.ok(String(loc[k]).trim().length > 0, `${f} ${k} : vide`);
    }
    // disclosure.van vaut « van.crete.direct » partout, c'est un nom de domaine ; le reste est traduit.
    if (f !== "en.json") assert.notEqual(loc["car.v1.title"], en["car.v1.title"], `${f} : anglais recopié`);
  }
});

console.log(`check:article-promo OK (${n} tests)`);
