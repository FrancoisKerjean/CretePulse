# Encarts voiture, van et bus dans les articles crete.direct : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chaque article publié montre, dans le HTML rendu par le serveur, un ou deux encarts vers le service crete.direct que l'article fait naître (voiture, van partagé, bus), mesurés par `promo_impression` avec `source: "article"`, d'abord sur 23 articles pilotes puis sur les 374.

**Architecture:** Un module pur `src/lib/article-promo.ts` porte le routage (13 lignes), la détection de lieux (titre EN, mots-clés, slug, 1 500 premiers caractères du contenu EN, mot entier comme `autolinkHtml`), la découpe du HTML avant le 3e `<h2` avec garde-fou d'équilibrage, la variante stable par hash de slug et la constante `PILOT_SLUGS`. Il est testé sans navigateur par `scripts/check-article-promo.mjs` câblé à `npm run check`. Un composant serveur `ArticlePromoSlot` est le seul à connaître les trois services : il lit les textes dans le namespace next-intl `articlePromo` (22 locales) et rend `CarPromo`, `VanPromo` (props `copy`, `slug`, `variant`, cas générique ajoutés) ou le nouveau `BusPromo`. `page.tsx` découpe `linkedContent`, monte l'encart `mid` entre les deux moitiés et l'encart `end` à la place exacte du bloc `KAIROS_CTA`, qui est retiré.

**Tech Stack:** Next.js 16 App Router (ISR 48 h), React 19, TypeScript, Tailwind v4, next-intl 4 (22 locales dans `src/messages/*.json`), lucide-react, Plausible (`window.plausible`), Node 22 `--experimental-strip-types` pour les scripts `check:*`.

**Spec :** `docs/superpowers/specs/2026-09-07-article-service-promos-design.md`
**Branche :** `feat/article-promos` partant de `origin/master`, worktree `C:\Users\fkerj\cp-article-promos`
**Conventions du dépôt (non négociables) :** `docs/WORKFLOW-MULTI-TERMINAL.md`. Jamais `git add -A` ni `git add .`, toujours des chemins explicites. Fin de chantier = `npm run ship` depuis la branche, jamais un push de `main`. Vert = `npm run check` (qui enchaîne tous les `check:*`, `check:da`, `check:i18n` et `tsc --noEmit`). Aucun tiret cadratin dans le code, les JSON, les commentaires ni les messages de commit (`check:da` R11) : séparateurs autorisés = point médian `·`, virgule, point, deux-points. Aucune mention ni lien Kairos ou kairosguest dans le code de crete.direct. Aucune promesse de revenus, de disponibilité ni d'économie dans les textes.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/article-promo.ts` | **Créer.** Routage article vers service, détection de lieux, découpe HTML, variante par hash, `PILOT_SLUGS`, faits van génériques. Pur, imports relatifs en `.ts`. |
| `scripts/check-article-promo.mjs` | **Créer.** Tests purs du module (routage, détection, découpe, pilote) puis parité des textes `articlePromo` (Task 3). |
| `package.json` | **Modifier.** Script `check:article-promo`, ajouté à l'agrégat `check`. |
| `src/components/PromoBox.tsx` | **Modifier.** Exporte le type `PromoCopy` partagé par les trois encarts. Aucun changement visuel. |
| `src/components/car-rental/CarPromo.tsx` | **Modifier.** Props optionnelles `copy`, `slug`, `variant`. Les 20 appelants existants ne changent pas. |
| `src/components/VanPromo.tsx` | **Modifier.** Props optionnelles `copy`, `slug`, `variant`, `generic`, `corridors` devient optionnel. `slug` ajouté à `van_offer_click`. |
| `src/components/buses/BusPromo.tsx` | **Créer.** Encart bus compact (PromoBox sans photo), `promo_impression` block `bus-promo`, clic `bus_promo_click`. |
| `src/components/articles/ArticlePromoSlot.tsx` | **Créer.** Composant serveur : un `ArticlePromo` en entrée, textes via `getTranslations`, rend le bon encart. |
| `scripts/add-article-promo-i18n.mjs` | **Créer.** Injection idempotente du namespace `articlePromo` (33 feuilles) dans les 22 fichiers de messages, avec garde-fous. |
| `src/messages/*.json` (22) | **Modifier** (par le script ci-dessus). Namespace racine `articlePromo`. |
| `src/app/[locale]/articles/[slug]/page.tsx` | **Modifier.** Découpe, deux slots, retrait de `KAIROS_CTA`. |
| `docs/mockups/2026-09-07-article-promos-*.png` | **Créer.** Captures desktop et 390 px avant push (règle mockup avant deploy). |

---

## Préambule : worktree et branche

- [ ] **Étape 0.1 : créer le worktree de chantier depuis `origin/master`**

```bash
git -C ~/cretepulse-build fetch origin master
git -C ~/cretepulse-build worktree add ../cp-article-promos -b feat/article-promos origin/master
cp ~/cretepulse-build/.env.local ~/cp-article-promos/.env.local
cd ~/cp-article-promos && npm install
```

Attendu : `Preparing worktree (new branch 'feat/article-promos')`, puis `npm install` sans erreur. Toutes les commandes suivantes s'exécutent depuis `~/cp-article-promos`.

- [ ] **Étape 0.2 : vérifier le vert de départ**

Run : `npm run check:i18n && npm run check:da && npx tsc --noEmit`
Attendu : `✅ check:i18n : 22 locales en parite (172 cles chacune).`, `check:da` sans nouvelle violation, `tsc` code 0. Si l'un des trois est rouge AVANT toute modification, s'arrêter : le problème vient de `master`, pas de ce chantier.

---

## Task 1 : module pur `article-promo.ts` et `check:article-promo`

**Files:**
- Create: `src/lib/article-promo.ts`
- Create: `scripts/check-article-promo.mjs`
- Modify: `package.json` (scripts `check:article-promo` et `check`)

- [ ] **Étape 1.1 : lire les 23 slugs pilotes dans Plausible (ClickHouse sur le VPS)**

La fenêtre est celle de l'export de la spec : 30 jours au 07/09/2026 inclus, soit `[2026-08-08, 2026-09-08)`. Même accès que `~/.claude/scripts/flux-impact-weekly.mjs` (`ssh kairos-vps`, conteneur `plausible-plausible_events_db-1`, table `plausible_events_db.events_v2`, `site_id = 1`). La requête est passée sur stdin pour éviter tout échappement de guillemets.

```bash
ssh kairos-vps 'docker exec -i plausible-plausible_events_db-1 clickhouse-client --format TabSeparated' <<'SQL'
SELECT extract(pathname, '^/[a-z]{2}/articles/([^/?#]+)') AS slug, uniq(user_id) AS visitors
FROM plausible_events_db.events_v2
WHERE site_id = 1
  AND name = 'pageview'
  AND timestamp >= toDateTime('2026-08-08 00:00:00')
  AND timestamp <  toDateTime('2026-09-08 00:00:00')
  AND match(pathname, '^/[a-z]{2}/articles/[^/]+/?$')
GROUP BY slug
HAVING visitors >= 50
ORDER BY visitors DESC
SQL
```

Attendu : 23 lignes `slug<TAB>visiteurs`, la première au-dessus de 100 visiteurs (`long-term-rentals-crete` faisait 107 dans la spec). Les dix slugs connus de la spec DOIVENT apparaître : `best-beaches-crete`, `balos-lagoon-guide`, `best-areas-to-stay-crete`, `long-term-rentals-crete`, `e4-trail-crete`, `knossos-palace-complete-guide`, `day-trips-from-heraklion`, `best-tavernas-chania`, `elafonisi-vs-balos`, `snorkeling-spots-crete-guide`. Si le compte n'est pas exactement 23 (une visite de plus ou de moins autour du seuil suffit à le faire bouger), garder les 23 premiers par visiteurs décroissants et le noter dans le message de commit. Si un des dix connus manque, s'arrêter et le signaler : la spec ou la requête est fausse, on ne devine pas.

Conserver la sortie dans le scratchpad (`pilot-slugs.tsv`) : elle sert à l'étape 1.5 et au commit.

- [ ] **Étape 1.2 : vérifier en base le format et la catégorie des 23**

PostgREST avec les variables de `.env.local` (mêmes que `src/lib/supabase.ts` : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Remplacer la liste `in.(...)` par les 23 slugs de l'étape 1.1, séparés par des virgules, sans espace.

```bash
set -a; . ./.env.local; set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/guides?select=slug,format,category&status=eq.published&slug=in.(best-beaches-crete,balos-lagoon-guide,best-areas-to-stay-crete,long-term-rentals-crete,e4-trail-crete,knossos-palace-complete-guide,day-trips-from-heraklion,best-tavernas-chania,elafonisi-vs-balos,snorkeling-spots-crete-guide)" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Attendu : un tableau JSON de 23 objets. Les catégories connues (spec §2.1) : `best-beaches-crete` beaches · `balos-lagoon-guide` beaches · `best-areas-to-stay-crete` travel · `long-term-rentals-crete` real-estate · `e4-trail-crete` hikes · `knossos-palace-complete-guide` history · `day-trips-from-heraklion` day-trips · `best-tavernas-chania` food · `elafonisi-vs-balos` beaches. La catégorie de `snorkeling-spots-crete-guide` n'est pas dans la spec : le test de l'étape 1.3 la suppose `beaches` [ASSUMED] ; si la base dit autre chose, corriger la fixture `snorkeling` du test avec la valeur réelle et l'attendu de la ligne de routage correspondante (table §2.4). Un slug absent du résultat n'est pas publié : le retirer de `PILOT_SLUGS` et prendre le suivant de la liste ClickHouse.

- [ ] **Étape 1.3 : écrire le test qui échoue**

Créer `scripts/check-article-promo.mjs` :

```js
// scripts/check-article-promo.mjs : tests purs du routage article vers service,
// de la détection de lieux, de la découpe HTML et de la liste pilote.
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md
// Lancé par `npm run check:article-promo` et par l'agrégat `npm run check`.
import assert from "node:assert/strict";
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

// ── Routage : les dix slugs connus, catégorie réelle, titre représentatif ──

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

ok("elafonisi-vs-balos (beaches, Elafonisi est un lieu bus) : car / bus depuis Elafonisi", () => {
  const p = planArticlePromo(guide({ slug: "elafonisi-vs-balos", category: "beaches", title: "Elafonisi vs Balos: which beach to choose" }));
  assert.deepEqual(kinds(p), ["car", "bus"]);
  assert.equal(p.end.busFrom, "Elafonisi");
});

ok("snorkeling-spots-crete-guide (beaches, aucun lieu) : car / none", () => {
  const p = planArticlePromo(guide({ slug: "snorkeling-spots-crete-guide", category: "beaches", title: "Snorkeling spots in Crete" }));
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

ok("news/infrastructure : bus générique en mid, none en end", () => {
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
  for (const known of ["best-beaches-crete", "balos-lagoon-guide", "best-areas-to-stay-crete", "long-term-rentals-crete", "e4-trail-crete", "knossos-palace-complete-guide", "day-trips-from-heraklion", "best-tavernas-chania", "elafonisi-vs-balos", "snorkeling-spots-crete-guide"]) {
    assert.ok(PILOT_SLUGS.includes(known), `slug connu absent : ${known}`);
  }
});

ok("hors pilote : none / none ; dans le pilote : le plan", () => {
  const out = resolveArticlePromo(guide({ slug: "not-in-pilot", category: "food", title: "Best tavernas in Chania" }));
  assert.deepEqual(kinds(out), ["none", "none"]);
  const inn = resolveArticlePromo(guide({ slug: "best-tavernas-chania", category: "food", title: "Best tavernas in Chania" }));
  assert.deepEqual(kinds(inn), ["car", "bus"]);
});

console.log(`check:article-promo OK (${n} tests)`);
```

- [ ] **Étape 1.4 : lancer le test, vérifier qu'il échoue**

Run : `node --experimental-strip-types scripts/check-article-promo.mjs`
Attendu : `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/lib/article-promo.ts'`.

- [ ] **Étape 1.5 : écrire le module**

Créer `src/lib/article-promo.ts`. Dans `PILOT_SLUGS`, les dix premières lignes sont les slugs connus ; les treize suivantes sont les treize autres slugs lus à l'étape 1.1, copiés tels quels dans l'ordre décroissant de visiteurs (aucun n'est inventé : le test `PILOT_SLUGS : 23 entrées` refuse toute liste incomplète).

```ts
// Routage article vers service (voiture, van partagé, bus) et découpe du HTML d'un guide.
// Module PUR : aucun JSX, aucun accès réseau. Testé par scripts/check-article-promo.mjs.
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md
//
// Imports relatifs avec extension .ts : le type-stripping de node (scripts check:*)
// ne résout pas l'alias @/ (même raison que car-partners.ts, activity-lead.ts).
import { VAN_CORRIDORS, normalizeBusSlug, type VanCorridor } from "./van-corridors.ts";
import { CAR_ZONES } from "./car-partners.ts";
import { CAR_LANDINGS } from "./car-landings.ts";
import { BUS_PLACE_SLUGS } from "./bus-pairs.ts";

export type ArticlePromoKind = "car" | "van" | "bus" | "none";

export interface ArticlePromo {
  kind: ArticlePromoKind;
  /** Stable par slug (hash FNV-1a), jamais aléatoire. Toujours 1 pour kind none. */
  variant: 1 | 2 | 3;
  /** Slug CAR_ZONES (car). Indéfini hors zone : le wizard ouvre à l'étape 1. */
  pickup?: string;
  /** Slug CAR_LANDINGS explicite (car, aéroport). */
  landing?: string;
  /** Corridor VAN_CORRIDORS nommé (van). Absent = van générique. */
  corridor?: VanCorridor;
  /** Noms de lieux DB (clés de BUS_PLACE_SLUGS), tels que BusesClient les lit dans ?from=&to=. */
  busFrom?: string;
  busTo?: string;
}

export interface ArticlePromoPlan {
  /** Avant le 3e H2. */
  mid: ArticlePromo;
  /** Après la FAQ, à l'ancienne place du bloc de fin. */
  end: ArticlePromo;
}

/**
 * Le type Guide déclare format "long" | "mid" | "daily" mais la base contient aussi
 * "news" et "short" : on lit format comme une chaîne pour ne pas les perdre en silence.
 */
export interface ArticlePromoInput {
  slug: string;
  format: string;
  category: string;
  keywords: string[] | null;
  titles: Record<string, string> | null;
  contents: Record<string, string> | null;
}

export interface DetectedPlaces {
  corridor: VanCorridor | null;
  pickup: string | null;
  airportLanding: string | null;
  /** Noms DB, dans l'ordre de première apparition dans le texte. */
  busPlaces: string[];
  /** Le texte parle d'arrivée : airport, transfer, arrival, getting to. */
  arrival: boolean;
}

/** Caractères du contenu EN lus pour la détection : chapô et premiers H2, jamais l'article entier. */
export const DETECT_WINDOW = 1500;
/** Sous ce nombre de H2, aucun encart mid : il couperait la lecture au lieu de l'accompagner. */
export const MIN_H2_FOR_MID = 3;

const CAR_VARIANTS = 3;
const VAN_VARIANTS = 2;
const BUS_PAIR_VARIANTS = 2;

const NONE: ArticlePromo = { kind: "none", variant: 1 };

// ── Dictionnaire de lieux, construit une fois au chargement, à partir des listes du dépôt ──

type EntryKind = "corridor" | "pickup" | "airport" | "bus";
interface Entry { name: string; re: RegExp; kind: EntryKind; value: string }

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function wordsOf(slug: string): string {
  return slug.replace(/-/g, " ");
}
/** Mot entier, insensible à la casse : même mécanique que autolinkHtml (src/lib/autolink.ts). */
function wholeWord(name: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(name)}(?![\\p{L}\\p{N}])`, "iu");
}

/** Corridor retenu par ville : le sens aéroport vers ville, premier de la table pour cette ville. */
const CORRIDOR_BY_CITY_SLUG = new Map<string, VanCorridor>();
for (const c of VAN_CORRIDORS) {
  const [from, to] = c.slug.split("--");
  if (from.endsWith("-airport") && !to.endsWith("-airport") && !CORRIDOR_BY_CITY_SLUG.has(to)) {
    CORRIDOR_BY_CITY_SLUG.set(to, c);
  }
}

function buildEntries(): Entry[] {
  const out: Entry[] = [];
  const add = (name: string, kind: EntryKind, value: string) => {
    const key = name.toLowerCase();
    if (!key || out.some((e) => e.kind === kind && e.name.toLowerCase() === key)) return;
    out.push({ name, re: wholeWord(name), kind, value });
  };
  for (const [citySlug, c] of CORRIDOR_BY_CITY_SLUG) {
    add(c.toName, "corridor", citySlug);
    add(wordsOf(citySlug), "corridor", citySlug);
  }
  for (const [busName, busSlug] of Object.entries(BUS_PLACE_SLUGS)) {
    add(busName, "bus", busName);
    add(wordsOf(busSlug), "bus", busName);
    // Alias bus vers corridor (Siteia, Makry Gyalos) via la même map que van-crete-direct.
    const corr = normalizeBusSlug(busSlug);
    if (CORRIDOR_BY_CITY_SLUG.has(corr)) {
      add(busName, "corridor", corr);
      add(wordsOf(busSlug), "corridor", corr);
    }
  }
  for (const z of CAR_ZONES) for (const p of z.pickups) add(wordsOf(p), "pickup", p);
  for (const l of CAR_LANDINGS) {
    if (l.kind === "airport") {
      add(wordsOf(l.slug), "airport", l.slug);
      add(wordsOf(l.slug), "pickup", l.pickup);
    }
  }
  // Plus long nom d'abord : « Chania Airport » est essayé avant « Chania ».
  return out.sort((a, b) => b.name.length - a.name.length);
}
const ENTRIES = buildEntries();

const ARRIVAL_RE = /(?<![\p{L}])(airport|transfers?|arrivals?|getting to)(?![\p{L}])/iu;

/**
 * Lit un texte anglais et en sort le corridor van, le pickup voiture, la landing
 * aéroport et les lieux bus cités. Pour chaque famille, la première occurrence
 * dans le texte gagne ; à position égale, le nom le plus long (ordre des entrées).
 */
export function detectPlaces(text: string): DetectedPlaces {
  const first: Partial<Record<EntryKind, { idx: number; value: string }>> = {};
  const bus: { idx: number; end: number; value: string }[] = [];
  for (const e of ENTRIES) {
    const m = e.re.exec(text);
    if (!m) continue;
    if (e.kind === "bus") {
      const end = m.index + m[0].length;
      // Un nom contenu dans un nom plus long déjà retenu (« Chania » dans « Chania Airport ») ne compte pas.
      if (!bus.some((b) => m.index >= b.idx && end <= b.end)) bus.push({ idx: m.index, end, value: e.value });
      continue;
    }
    const cur = first[e.kind];
    if (!cur || m.index < cur.idx) first[e.kind] = { idx: m.index, value: e.value };
  }
  const busPlaces: string[] = [];
  for (const b of bus.sort((a, c) => a.idx - c.idx)) if (!busPlaces.includes(b.value)) busPlaces.push(b.value);
  return {
    corridor: first.corridor ? CORRIDOR_BY_CITY_SLUG.get(first.corridor.value) ?? null : null,
    pickup: first.pickup?.value ?? null,
    airportLanding: first.airport?.value ?? null,
    busPlaces,
    arrival: ARRIVAL_RE.test(text),
  };
}

/** Titre EN, mots-clés, slug, puis les DETECT_WINDOW premiers caractères du contenu EN, balises retirées. */
export function detectionText(input: ArticlePromoInput): string {
  const html = input.contents?.en ?? "";
  return [
    input.titles?.en ?? "",
    (input.keywords ?? []).join(" "),
    wordsOf(input.slug),
    html.slice(0, DETECT_WINDOW).replace(/<[^>]*>/g, " "),
  ].join("\n");
}

/** FNV-1a 32 bits du slug, réduit à 1..n. Stable d'un rendu à l'autre, réparti à peu près également. */
export function variantFor(slug: string, n: number): 1 | 2 | 3 {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ((h % n) + 1) as 1 | 2 | 3;
}

function car(slug: string, extra: { pickup?: string | null; landing?: string | null } = {}): ArticlePromo {
  const p: ArticlePromo = { kind: "car", variant: variantFor(slug, CAR_VARIANTS) };
  if (extra.pickup) p.pickup = extra.pickup;
  if (extra.landing) p.landing = extra.landing;
  return p;
}
function van(slug: string, corridor: VanCorridor | null): ArticlePromo {
  const p: ArticlePromo = { kind: "van", variant: variantFor(slug, VAN_VARIANTS) };
  if (corridor) p.corridor = corridor;
  return p;
}
function bus(slug: string, places: string[]): ArticlePromo {
  const [from, to] = places;
  if (!from) return { kind: "bus", variant: 1 };
  // La copie bus.pair.v2 nomme {to} : sans destination, seule la v1 est lisible.
  const p: ArticlePromo = { kind: "bus", variant: to ? variantFor(slug, BUS_PAIR_VARIANTS) : 1, busFrom: from };
  if (to) p.busTo = to;
  return p;
}

const CITY_CATEGORIES = new Set(["food", "culture", "history", "nightlife"]);
const TRAVEL_CATEGORIES = new Set(["travel", "tourism", "practical", "data"]);

/** Table de routage de la spec §2.4, première ligne qui matche. */
function route(input: ArticlePromoInput, d: DetectedPlaces): ArticlePromoPlan {
  const slug = input.slug;
  const fmt = (input.format ?? "").toLowerCase();
  const cat = (input.category ?? "").toLowerCase();

  // 1. Bulletin météo : lu sur place, en anglais seul, déjà une vidéo verticale.
  if (fmt === "daily" && cat === "daily-weather") return { mid: NONE, end: NONE };
  // 2. Actu du jour : un seul encart bus, en fin d'article.
  if (fmt === "daily" && cat === "daily-news") return { mid: NONE, end: bus(slug, []) };
  // 3. Article d'aéroport : même choix que la page /airport/[slug].
  if (fmt === "news" && cat === "airport") return { mid: car(slug, { landing: "heraklion-airport" }), end: van(slug, null) };
  // 4. Autres news : lectorat informé, le bus n'engage à rien. Format court : en fin, sinon la découpe avant le 3e H2 ne le montrerait jamais.
  if (fmt === "news") return { mid: NONE, end: bus(slug, []) };
  // 5. Le texte parle d'arrivée : le van passe devant.
  if (d.arrival) return { mid: van(slug, d.corridor), end: car(slug, { landing: d.airportLanding ?? "heraklion-airport" }) };
  // 6. Plages : la voiture reste l'offre principale.
  if (cat === "beaches") {
    return { mid: car(slug, { pickup: d.pickup }), end: d.corridor ? van(slug, d.corridor) : d.busPlaces.length ? bus(slug, d.busPlaces) : NONE };
  }
  // 7. Randonnée et nature.
  if (cat === "hikes" || cat === "nature") return { mid: car(slug, { pickup: d.pickup }), end: d.busPlaces.length ? bus(slug, d.busPlaces) : NONE };
  // 8. Excursions.
  if (cat === "day-trips") return { mid: car(slug, { pickup: d.pickup }), end: d.corridor ? van(slug, d.corridor) : NONE };
  // 9. Article de ville : le bus pour rayonner (générique si aucune ville n'est nommée), la voiture pour sortir.
  if (CITY_CATEGORIES.has(cat)) return { mid: car(slug, { pickup: d.pickup }), end: bus(slug, d.busPlaces) };
  // 10. Voyage, pratique, format court : choisir sa base, puis comment en sortir. Jamais /stays.
  if (TRAVEL_CATEGORIES.has(cat) || fmt === "short") return { mid: car(slug, { pickup: d.pickup }), end: van(slug, null) };
  // 11. Famille, bien-être.
  if (cat === "family" || cat === "wellness") return { mid: car(slug, { pickup: d.pickup }), end: NONE };
  // 12. Expat, immobilier : une voiture, sans plus.
  if (cat === "expat" || cat === "real-estate" || cat === "property") return { mid: car(slug), end: NONE };
  // 13. Défaut.
  return { mid: car(slug), end: NONE };
}

function countH2(html: string): number {
  return (html.match(/<h2\b/gi) ?? []).length;
}

/**
 * Plan complet pour un article, sans la garde pilote. `opts.html` est le HTML
 * réellement rendu (après autolink et dans la locale servie) ; à défaut on compte
 * les H2 de contents.en.
 */
export function planArticlePromo(input: ArticlePromoInput, opts: { html?: string } = {}): ArticlePromoPlan {
  let { mid, end } = route(input, detectPlaces(detectionText(input)));
  if (mid.kind !== "none" && mid.kind === end.kind) end = NONE;
  if (countH2(opts.html ?? input.contents?.en ?? "") < MIN_H2_FOR_MID) mid = NONE;
  return { mid, end };
}

/**
 * Phase 1 (spec §5) : les 23 articles à 50 visiteurs ou plus sur 30 jours au
 * 07/09/2026, export Plausible ClickHouse. Constante et non variable d'environnement :
 * une env var est figée à l'image de déploiement (piège documenté par la spec du rail).
 * Phase 2 = commit qui supprime cette liste et la garde de resolveArticlePromo.
 */
export const PILOT_SLUGS: readonly string[] = [
  "best-beaches-crete",
  "balos-lagoon-guide",
  "best-areas-to-stay-crete",
  "long-term-rentals-crete",
  "e4-trail-crete",
  "knossos-palace-complete-guide",
  "day-trips-from-heraklion",
  "best-tavernas-chania",
  "elafonisi-vs-balos",
  "snorkeling-spots-crete-guide",
  // Les 13 lignes suivantes : slugs 11 à 23 de l'export ClickHouse de l'étape 1.1,
  // ordre décroissant de visiteurs, copiés tels quels.
];

/** Ce que la page appelle : none/none hors pilote tant que PILOT_SLUGS existe. */
export function resolveArticlePromo(input: ArticlePromoInput, opts: { html?: string } = {}): ArticlePromoPlan {
  if (!PILOT_SLUGS.includes(input.slug)) return { mid: NONE, end: NONE };
  return planArticlePromo(input, opts);
}

/** Prix plancher et nombre de paires, lus dans VAN_CORRIDORS pour ne jamais figer un chiffre dans 22 fichiers. */
export function vanGenericFacts(): { price: number; count: number } {
  const pairs = new Set(VAN_CORRIDORS.map((c) => c.slug.split("--").sort().join("|")));
  return { price: Math.min(...VAN_CORRIDORS.map((c) => c.priceEur)), count: pairs.size };
}

/** Balises dont la partie 1 doit être équilibrée : un H2 imbriqué produirait un DOM invalide, donc un vrai CLS. */
const BALANCED_TAGS = ["div", "section", "ul", "ol", "blockquote", "table", "figure", "a", "pre"];

/**
 * Découpe le HTML au début de la 3e occurrence de `<h2` (après la section ouverte par
 * le 2e H2). Retourne null au moindre doute : l'article s'affiche alors entier.
 */
export function splitAfterSecondH2(html: string): [string, string] | null {
  const re = /<h2\b/gi;
  let m: RegExpExecArray | null;
  let seen = 0;
  let cut = -1;
  while ((m = re.exec(html))) {
    seen++;
    if (seen === MIN_H2_FOR_MID) { cut = m.index; break; }
  }
  if (cut < 0) return null;
  const head = html.slice(0, cut);
  for (const tag of BALANCED_TAGS) {
    const opens = (head.match(new RegExp(`<${tag}\\b(?![^>]*/>)`, "gi")) ?? []).length;
    const closes = (head.match(new RegExp(`</${tag}\\s*>`, "gi")) ?? []).length;
    if (opens !== closes) return null;
  }
  return [head, html.slice(cut)];
}
```

Puis compléter `PILOT_SLUGS` avec les 13 slugs de `pilot-slugs.tsv` (étape 1.1), une chaîne par ligne, à la place du commentaire de deux lignes.

- [ ] **Étape 1.6 : lancer le test, vérifier qu'il passe**

Run : `node --experimental-strip-types scripts/check-article-promo.mjs`
Attendu : une ligne `  ok ...` par test, puis `check:article-promo OK (42 tests)`.

Si un test de routage sur un slug connu échoue parce que la catégorie réelle lue à l'étape 1.2 diffère de la spec, c'est la fixture qu'on corrige (catégorie et attendu de la ligne de routage correspondante), jamais la table de routage.

- [ ] **Étape 1.7 : câbler le script dans `package.json`**

Dans `"scripts"`, ajouter après `"check:hero-links"` :

```json
"check:article-promo": "node --experimental-strip-types scripts/check-article-promo.mjs",
```

et dans la valeur de `"check"`, insérer `npm run check:article-promo && ` juste avant `npm run check:da`. La fin de la chaîne devient :

```
... && npm run check:hero-links && npm run check:article-promo && npm run check:da && npm run check:i18n && tsc --noEmit
```

Run : `npm run check:article-promo && npx tsc --noEmit`
Attendu : `check:article-promo OK (42 tests)` puis `tsc` code 0 (le module compile aussi sous le tsconfig du projet : `allowImportingTsExtensions` est actif).

- [ ] **Étape 1.8 : commit**

```bash
git add src/lib/article-promo.ts scripts/check-article-promo.mjs package.json
git commit -m "feat(articles): routage article vers voiture, van ou bus, module pur et 23 slugs pilotes"
```

---

## Task 2 : composants `CarPromo`, `VanPromo`, `BusPromo`, `ArticlePromoSlot`

**Files:**
- Modify: `src/components/PromoBox.tsx` (export du type `PromoCopy`, en tête de fichier)
- Modify: `src/components/car-rental/CarPromo.tsx`
- Modify: `src/components/VanPromo.tsx`
- Create: `src/components/buses/BusPromo.tsx`
- Create: `src/components/articles/ArticlePromoSlot.tsx`

Aucun test navigateur ici : la garantie est `tsc --noEmit` (les nouvelles props sont optionnelles, aucun des 20 appelants de `CarPromo` ni des appelants de `VanPromo` ne change) et le contrôle visuel de la Task 5.

- [ ] **Étape 2.1 : exporter `PromoCopy` depuis `PromoBox.tsx`**

Juste après la ligne `import { ArrowRight, BadgeCheck, ExternalLink } from "lucide-react";`, ajouter :

```ts
/** Textes d'un encart : mêmes quatre champs que les tables COPY de CarPromo et VanPromo. */
export interface PromoCopy {
  title: string;
  line: string;
  cta: string;
  disclosure: string;
}
```

- [ ] **Étape 2.2 : `CarPromo` accepte `copy`, `slug`, `variant`**

Remplacer la fonction `CarPromo` (de `export function CarPromo({` jusqu'à la fin du fichier) par :

```tsx
export function CarPromo({
  locale,
  pickup,
  source,
  landing,
  copy,
  slug,
  variant,
}: {
  locale: string;
  /** Slug de pickup contextuel (doit appartenir à une zone car-partners), sinon étape 1. */
  pickup?: string;
  /** Page d'origine, tracée par le wizard (prop source des events Plausible). */
  source?: string;
  /** Slug de landing /car-rental/[location] explicite quand le contexte la désigne (ex : page aéroport HER). */
  landing?: string;
  /** Textes imposés par l'appelant (articles : namespace i18n articlePromo). Défaut : COPY interne. */
  copy?: PromoCopy;
  /** Slug de la page hôte, ajouté aux props de promo_impression (CTR par article). */
  slug?: string;
  /** Variante de copie (1..3), ajoutée aux props de promo_impression. */
  variant?: number;
}) {
  const c = copy ?? COPY[locale] ?? COPY.en;
  const target = (landing ? getCarLanding(landing) : null) ?? (pickup ? landingForPickup(pickup) : null);
  const params = new URLSearchParams();
  // La landing pré-remplit déjà son propre pickup ; on ne le passe en query que
  // s'il diffère (le wizard fait primer ?pickup= sur la prop de la landing).
  if (pickup && (!target || target.pickup !== pickup)) params.set("pickup", pickup);
  if (source) params.set("source", source);
  const qs = params.toString();
  const base = target ? `/${locale}/car-rental/${target.slug}` : `/${locale}/car-rental`;
  const impression: Record<string, string | number> = { block: "car-promo", source: source ?? "" };
  if (slug) impression.slug = slug;
  if (variant) impression.variant = variant;
  return (
    <>
      {/* Capture décisionnelle : impression du bloc Auto Smart (CTR vs Car
          Wizard Step, pathname attaché par Plausible). */}
      <ImpressionTracker event="promo_impression" props={impression} />
      <PromoBox
        icon={Car}
        title={c.title}
        line={c.line}
        ctaLabel={c.cta}
        ctaHref={`${base}${qs ? `?${qs}` : ""}`}
        disclosure={c.disclosure}
        photo="/images/partners/car-rental.jpg"
      />
    </>
  );
}
```

et changer l'import de `PromoBox` en :

```ts
import { PromoBox, type PromoCopy } from "@/components/PromoBox";
```

- [ ] **Étape 2.3 : `VanPromo` accepte `copy`, `slug`, `variant`, `generic`**

Remplacer la fonction `VanPromo` (de `export function VanPromo({` jusqu'à la fin du fichier) par :

```tsx
export function VanPromo({
  locale,
  corridors = [],
  source,
  copy,
  slug,
  variant,
  generic,
}: {
  locale: string;
  /** Corridors couvrant la paire, sens de la page en premier (vanCorridorsForPair). */
  corridors?: VanCorridor[];
  source: string;
  /** Textes imposés par l'appelant (articles : namespace i18n articlePromo). Défaut : COPY interne. */
  copy?: PromoCopy;
  /** Slug de la page hôte, ajouté aux props de promo_impression et de van_offer_click. */
  slug?: string;
  /** Variante de copie (1..2), ajoutée aux props de promo_impression. */
  variant?: number;
  /** Van sans corridor nommé : lien vers la racine de van.crete.direct. Exige `copy`. */
  generic?: { href: string };
}) {
  const main = corridors[0];
  if (!main && !generic) return null;
  const c = COPY[locale] || COPY.en;
  const title = copy?.title ?? (main ? c.title(main.fromName, main.toName) : null);
  if (!title) return null;
  const line = copy?.line ?? (main ? c.line(main.priceEur) : undefined);
  const href = main
    ? `https://van.crete.direct/${COPY[locale] ? locale : "en"}/${main.slug}?source=${encodeURIComponent(source)}`
    : generic!.href;

  function fireClick() {
    const plausible = (window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
    }).plausible;
    const props: Record<string, string | number> = { corridor: main?.slug ?? "generic", source };
    if (slug) props.slug = slug;
    plausible?.("van_offer_click", { props });
  }

  const impression: Record<string, string | number> = { block: "van-promo", source };
  if (slug) impression.slug = slug;
  if (variant) impression.variant = variant;

  return (
    <div onClickCapture={fireClick}>
      <ImpressionTracker event="promo_impression" props={impression} />
      <PromoBox
        icon={Users}
        title={title}
        line={line}
        ctaLabel={copy?.cta ?? c.cta}
        ctaHref={href}
        disclosure={copy?.disclosure ?? c.disclosure}
      />
    </div>
  );
}
```

et changer l'import de `PromoBox` en :

```ts
import { PromoBox, type PromoCopy } from "@/components/PromoBox";
```

Le commentaire d'en-tête du fichier reçoit une ligne supplémentaire après `van_offer_click (mêmes props que le lien VanInterest du planner).` :

```
// Depuis le 09/2026 : monté aussi dans les articles (ArticlePromoSlot) avec des textes
// i18n imposés par `copy`, et un cas `generic` sans corridor (racine van.crete.direct).
```

- [ ] **Étape 2.4 : créer `BusPromo`**

Créer `src/components/buses/BusPromo.tsx` :

```tsx
"use client";

// Encart bus des articles : PromoBox compacte (sans photo, aucun asset nouveau), le
// plus léger des trois encarts, à la mesure de son poids commercial. Impression via
// ImpressionTracker (block bus-promo), clic tracé bus_promo_click. Cible : le
// planificateur /buses, prérempli par ?from=&to= (BusesClient lit les NOMS de lieux
// DB après hydratation ; from seul : le board de départs suit).
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md §3.4
import { Bus } from "lucide-react";
import { PromoBox, type PromoCopy } from "@/components/PromoBox";
import { ImpressionTracker } from "@/components/ui/ImpressionTracker";

export function BusPromo({
  locale,
  copy,
  source,
  slug,
  variant,
  from,
  to,
}: {
  locale: string;
  copy: PromoCopy;
  source: string;
  /** Slug de la page hôte. */
  slug: string;
  variant: number;
  /** Noms de lieux DB (clés de BUS_PLACE_SLUGS), jamais des slugs. */
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  const href = `/${locale}/buses${qs ? `?${qs}` : ""}`;

  function fireClick() {
    const plausible = (window as unknown as {
      plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
    }).plausible;
    plausible?.("bus_promo_click", { props: { slug, from: from ?? "", to: to ?? "", source } });
  }

  return (
    <div onClickCapture={fireClick}>
      <ImpressionTracker event="promo_impression" props={{ block: "bus-promo", source, slug, variant }} />
      <PromoBox
        icon={Bus}
        title={copy.title}
        line={copy.line}
        ctaLabel={copy.cta}
        ctaHref={href}
        disclosure={copy.disclosure}
      />
    </div>
  );
}
```

- [ ] **Étape 2.5 : créer `ArticlePromoSlot`**

Créer `src/components/articles/ArticlePromoSlot.tsx` :

```tsx
// Seul endroit qui connaît les trois services derrière un ArticlePromo. Composant
// SERVEUR : les textes viennent de getTranslations (namespace articlePromo, 22 locales),
// l'encart est dans le HTML servi par le CDN, aucun fetch client.
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md §3.4
import { getTranslations } from "next-intl/server";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { VanPromo } from "@/components/VanPromo";
import { BusPromo } from "@/components/buses/BusPromo";
import { vanGenericFacts, type ArticlePromo } from "@/lib/article-promo";

/** Valeur de la prop source de tous les events issus d'un article. */
export const ARTICLE_PROMO_SOURCE = "article";

export async function ArticlePromoSlot({ promo, locale, slug }: { promo: ArticlePromo; locale: string; slug: string }) {
  if (promo.kind === "none") return null;
  const t = await getTranslations({ locale, namespace: "articlePromo" });
  const v = promo.variant;

  if (promo.kind === "car") {
    const copy = {
      title: t(`car.v${v}.title`),
      line: t(`car.v${v}.line`),
      cta: t(`car.v${v}.cta`),
      disclosure: t("disclosure.car"),
    };
    return (
      <CarPromo
        locale={locale}
        pickup={promo.pickup}
        landing={promo.landing}
        source={ARTICLE_PROMO_SOURCE}
        slug={slug}
        variant={v}
        copy={copy}
      />
    );
  }

  if (promo.kind === "van") {
    if (promo.corridor) {
      const c = promo.corridor;
      const vars = { from: c.fromName, to: c.toName, price: c.priceEur };
      const copy = {
        title: t(`van.corridor.v${v}.title`, vars),
        line: t(`van.corridor.v${v}.line`, vars),
        cta: t(`van.corridor.v${v}.cta`),
        disclosure: t("disclosure.van"),
      };
      return <VanPromo locale={locale} corridors={[c]} source={ARTICLE_PROMO_SOURCE} slug={slug} variant={v} copy={copy} />;
    }
    const facts = vanGenericFacts();
    const copy = {
      title: t(`van.generic.v${v}.title`, facts),
      line: t(`van.generic.v${v}.line`, facts),
      cta: t(`van.generic.v${v}.cta`),
      disclosure: t("disclosure.van"),
    };
    return (
      <VanPromo
        locale={locale}
        generic={{ href: `https://van.crete.direct/?source=${ARTICLE_PROMO_SOURCE}` }}
        source={ARTICLE_PROMO_SOURCE}
        slug={slug}
        variant={v}
        copy={copy}
      />
    );
  }

  // bus
  const copy = promo.busFrom
    ? {
        title: t(`bus.pair.v${v}.title`, { from: promo.busFrom, to: promo.busTo ?? "" }),
        line: t(`bus.pair.v${v}.line`, { from: promo.busFrom, to: promo.busTo ?? "" }),
        cta: t(`bus.pair.v${v}.cta`),
        disclosure: t("disclosure.bus"),
      }
    : {
        title: t("bus.generic.title"),
        line: t("bus.generic.line"),
        cta: t("bus.generic.cta"),
        disclosure: t("disclosure.bus"),
      };
  return (
    <BusPromo
      locale={locale}
      copy={copy}
      source={ARTICLE_PROMO_SOURCE}
      slug={slug}
      variant={v}
      from={promo.busFrom}
      to={promo.busTo}
    />
  );
}
```

Les clés sont passées en chaînes construites : les messages du dépôt ne sont pas typés (`ServiceRail.tsx` fait déjà `t(k.title)` avec une chaîne), `tsc` l'accepte. Les clés n'existent pas encore dans les JSON : `getMessageFallback` de `src/i18n/request.ts` renverrait le chemin brut à l'écran, ce qui est exactement ce que la Task 3 fait disparaître avant toute intégration dans la page (Task 4).

- [ ] **Étape 2.6 : vérifier la compilation et l'absence de tiret cadratin**

Run : `npx tsc --noEmit && npm run check:da`
Attendu : `tsc` code 0 (aucun appelant existant de `CarPromo` ou `VanPromo` ne casse : toutes les props ajoutées sont optionnelles, `corridors` reste accepté), `check:da` sans nouvelle violation.

- [ ] **Étape 2.7 : commit**

```bash
git add src/components/PromoBox.tsx src/components/car-rental/CarPromo.tsx src/components/VanPromo.tsx src/components/buses/BusPromo.tsx src/components/articles/ArticlePromoSlot.tsx
git commit -m "feat(articles): encarts voiture, van et bus pilotables par texte i18n, slug et variante"
```

---

## Task 3 : 33 clés `articlePromo.*` dans les 22 fichiers de messages

**Files:**
- Create: `scripts/add-article-promo-i18n.mjs`
- Modify: `src/messages/*.json` (22 fichiers, par le script)
- Modify: `scripts/check-article-promo.mjs` (parité des textes)

**Mécanisme réel du dépôt, vérifié :** il n'existe AUCUN script de traduction automatique. `check:i18n` ne vérifie que la parité des clés avec `en.json`. Les 22 locales de `home.serviceRail` (commit `9230489`) et de `activityNudge` (`scripts/add-activity-nudge-i18n.mjs`) ont été écrites par l'agent dans la langue cible, puis injectées textuellement comme première clé racine de chaque fichier pour un diff minimal. On reproduit exactement ce mécanisme : un script d'injection idempotent qui porte les 22 blocs, avec des garde-fous que l'ancien script n'avait pas (locale manquante, feuille manquante, variable ICU perdue, recopie de l'anglais, tiret cadratin). La commande exacte est `node scripts/add-article-promo-i18n.mjs`.

- [ ] **Étape 3.1 : ajouter le test de parité des textes au check (échoue tant que les clés n'existent pas)**

À la fin de `scripts/check-article-promo.mjs`, avant `console.log(\`check:article-promo OK ...\`)`, ajouter :

```js
// ── Textes : 33 feuilles articlePromo.* dans les 22 locales, variables ICU conservées ──
import fs from "node:fs";

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
  const en = leaves(JSON.parse(fs.readFileSync("src/messages/en.json", "utf8")).articlePromo);
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
```

Le `import fs` en milieu de fichier est hissé par ESM : il fonctionne, mais pour la lisibilité le déplacer en tête avec les autres imports.

Run : `npm run check:article-promo`
Attendu : échec sur `articlePromo : 33 feuilles ...` avec `Expected values to be strictly equal: 0 !== 33`.

- [ ] **Étape 3.2 : écrire le script d'injection avec les blocs en, fr, de, el**

Créer `scripts/add-article-promo-i18n.mjs`. Les blocs `en`, `fr` (copie de référence de la spec §4.3, « Huit trajets » et « 20 € » remplacés par `{count}` et `{price}` calculés depuis `VAN_CORRIDORS`), `de` et `el` sont donnés ci-dessous. Les 18 autres locales (`ar, cs, da, es, fi, hu, it, ja, ko, nl, no, pl, pt, ro, ru, sv, tr, zh`) sont écrites dans la même constante `TRANSLATIONS`, par le même exécutant, dans la langue cible, avec les mêmes contraintes que le commit `9230489` : même arborescence, placeholders `{from} {to} {price} {count}` identiques, jamais de recopie de l'anglais, jamais de mélange d'alphabets, symbole `€` conservé, aucun tiret cadratin, aucune promesse de disponibilité ni d'économie, aucun chiffre en dur (les seuls chiffres sont `{price}` et `{count}`). Le script refuse de tourner tant que les 22 blocs ne sont pas complets.

```js
// scripts/add-article-promo-i18n.mjs
// Injecte le namespace "articlePromo" (33 feuilles) comme PREMIÈRE clé racine de chaque
// src/messages/<locale>.json. Insertion textuelle pour un diff minimal, idempotent
// (skip si déjà présent). Même mécanisme que add-activity-nudge-i18n.mjs, avec des
// garde-fous : 22 locales, 33 feuilles, variables ICU conservées, pas d'anglais
// recopié, pas de tiret cadratin.
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md §4
// Lancer : node scripts/add-article-promo-i18n.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/messages";

const TRANSLATIONS = {
  en: {
    disclosure: { car: "Local partner", van: "van.crete.direct", bus: "Official KTEL timetables" },
    car: {
      v1: { title: "A car for this trip?", line: "Local agency, quote in four steps, no prepayment.", cta: "Get a quote" },
      v2: { title: "The bus does not go everywhere here.", line: "Rent from an agency on the island. Price stated upfront, airport pickup available.", cta: "See prices" },
      v3: { title: "You have the guide. The drive is next.", line: "Local rental car, fast reply, cash accepted.", cta: "Request a quote" },
    },
    van: {
      corridor: {
        v1: { title: "Shared van {from} to {to}", line: "From {price} € a seat. Licensed local driver, no payment now.", cta: "Join a group" },
        v2: { title: "{to} from the airport, without renting a car", line: "Shared van from {price} € a seat. Departure confirmed once the group fills.", cta: "See departures" },
      },
      generic: {
        v1: { title: "Airport to your town, by shared van", line: "{count} routes from Heraklion and Chania, from {price} € a seat.", cta: "See routes" },
        v2: { title: "No car? Share a van.", line: "Local driver, no payment at booking.", cta: "See routes" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Getting there by bus from {from}", line: "Today's timetable, journey time and ticket price.", cta: "See timetables" },
        v2: { title: "The {from} to {to} bus, today", line: "Connections and fares, from KTEL timetables.", cta: "Open the planner" },
      },
      generic: { title: "Getting around Crete by bus", line: "Timetables, fares and connections of the KTEL networks.", cta: "See timetables" },
    },
  },
  fr: {
    disclosure: { car: "Partenaire local", van: "van.crete.direct", bus: "Horaires officiels KTEL" },
    car: {
      v1: { title: "Une voiture pour ce trajet ?", line: "Agence locale, devis en quatre étapes, aucun prépaiement.", cta: "Obtenir un devis" },
      v2: { title: "Le bus ne va pas partout ici.", line: "Louez auprès d'une agence de l'île. Prix annoncé, retrait à l'aéroport possible.", cta: "Voir les prix" },
      v3: { title: "Vous avez le guide. Reste le trajet.", line: "Voiture de location locale, réponse rapide, espèces acceptées.", cta: "Demander un devis" },
    },
    van: {
      corridor: {
        v1: { title: "Van partagé {from} vers {to}", line: "Dès {price} € la place. Chauffeur local licencié, aucun paiement maintenant.", cta: "Rejoindre un groupe" },
        v2: { title: "{to} depuis l'aéroport, sans louer de voiture", line: "Van partagé dès {price} € la place. Le départ est confirmé quand le groupe se remplit.", cta: "Voir les départs" },
      },
      generic: {
        v1: { title: "De l'aéroport à votre ville, en van partagé", line: "{count} trajets depuis Héraklion et La Canée, dès {price} € la place.", cta: "Voir les trajets" },
        v2: { title: "Pas de voiture ? Partagez un van.", line: "Chauffeur local, aucun paiement à la réservation.", cta: "Voir les trajets" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Y aller en bus depuis {from}", line: "Horaires du jour, durée et prix du billet.", cta: "Voir les horaires" },
        v2: { title: "Le bus {from} vers {to}, aujourd'hui", line: "Correspondances et prix, d'après les horaires KTEL.", cta: "Ouvrir le planificateur" },
      },
      generic: { title: "Se déplacer en bus en Crète", line: "Horaires, prix et correspondances des réseaux KTEL.", cta: "Voir les horaires" },
    },
  },
  de: {
    disclosure: { car: "Lokaler Partner", van: "van.crete.direct", bus: "Offizielle KTEL-Fahrpläne" },
    car: {
      v1: { title: "Ein Auto für diese Strecke?", line: "Lokale Agentur, Angebot in vier Schritten, keine Vorauszahlung.", cta: "Angebot anfordern" },
      v2: { title: "Der Bus fährt hier nicht überall hin.", line: "Mieten Sie bei einer Agentur der Insel. Preis vorab genannt, Abholung am Flughafen möglich.", cta: "Preise ansehen" },
      v3: { title: "Der Guide ist da. Jetzt der Weg.", line: "Lokaler Mietwagen, schnelle Antwort, Barzahlung möglich.", cta: "Angebot anfragen" },
    },
    van: {
      corridor: {
        v1: { title: "Sammelvan {from} nach {to}", line: "Ab {price} € pro Platz. Lizenzierter lokaler Fahrer, keine Zahlung jetzt.", cta: "Gruppe beitreten" },
        v2: { title: "{to} vom Flughafen aus, ohne Mietwagen", line: "Sammelvan ab {price} € pro Platz. Die Abfahrt wird bestätigt, sobald die Gruppe voll ist.", cta: "Abfahrten ansehen" },
      },
      generic: {
        v1: { title: "Vom Flughafen in Ihren Ort, im Sammelvan", line: "{count} Strecken ab Heraklion und Chania, ab {price} € pro Platz.", cta: "Strecken ansehen" },
        v2: { title: "Kein Auto? Teilen Sie sich einen Van.", line: "Lokaler Fahrer, keine Zahlung bei der Buchung.", cta: "Strecken ansehen" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Mit dem Bus ab {from}", line: "Fahrplan des Tages, Fahrzeit und Ticketpreis.", cta: "Fahrpläne ansehen" },
        v2: { title: "Der Bus {from} nach {to}, heute", line: "Verbindungen und Preise, nach den KTEL-Fahrplänen.", cta: "Planer öffnen" },
      },
      generic: { title: "Mit dem Bus durch Kreta", line: "Fahrpläne, Preise und Verbindungen der KTEL-Netze.", cta: "Fahrpläne ansehen" },
    },
  },
  el: {
    disclosure: { car: "Τοπικός συνεργάτης", van: "van.crete.direct", bus: "Επίσημα δρομολόγια ΚΤΕΛ" },
    car: {
      v1: { title: "Αυτοκίνητο για αυτή τη διαδρομή;", line: "Τοπικό γραφείο, προσφορά σε τέσσερα βήματα, καμία προπληρωμή.", cta: "Ζητήστε προσφορά" },
      v2: { title: "Το λεωφορείο δεν πάει παντού εδώ.", line: "Νοικιάστε από γραφείο του νησιού. Τιμή γνωστή από πριν, παραλαβή στο αεροδρόμιο.", cta: "Δείτε τιμές" },
      v3: { title: "Έχετε τον οδηγό. Μένει η διαδρομή.", line: "Τοπικό ενοικιαζόμενο αυτοκίνητο, γρήγορη απάντηση, δεκτά μετρητά.", cta: "Ζητήστε προσφορά" },
    },
    van: {
      corridor: {
        v1: { title: "Κοινόχρηστο βαν {from} προς {to}", line: "Από {price} € η θέση. Αδειοδοτημένος τοπικός οδηγός, καμία πληρωμή τώρα.", cta: "Συμμετοχή σε ομάδα" },
        v2: { title: "{to} από το αεροδρόμιο, χωρίς ενοικίαση αυτοκινήτου", line: "Κοινόχρηστο βαν από {price} € η θέση. Η αναχώρηση επιβεβαιώνεται όταν γεμίσει η ομάδα.", cta: "Δείτε αναχωρήσεις" },
      },
      generic: {
        v1: { title: "Από το αεροδρόμιο στην πόλη σας, με κοινόχρηστο βαν", line: "{count} διαδρομές από Ηράκλειο και Χανιά, από {price} € η θέση.", cta: "Δείτε διαδρομές" },
        v2: { title: "Χωρίς αυτοκίνητο; Μοιραστείτε ένα βαν.", line: "Τοπικός οδηγός, καμία πληρωμή κατά την κράτηση.", cta: "Δείτε διαδρομές" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Με λεωφορείο από {from}", line: "Σημερινά δρομολόγια, διάρκεια και τιμή εισιτηρίου.", cta: "Δείτε δρομολόγια" },
        v2: { title: "Το λεωφορείο {from} προς {to}, σήμερα", line: "Ανταποκρίσεις και τιμές, σύμφωνα με τα δρομολόγια ΚΤΕΛ.", cta: "Άνοιγμα σχεδιαστή" },
      },
      generic: { title: "Μετακίνηση με λεωφορείο στην Κρήτη", line: "Δρομολόγια, τιμές και ανταποκρίσεις των δικτύων ΚΤΕΛ.", cta: "Δείτε δρομολόγια" },
    },
  },
  // ar, cs, da, es, fi, hu, it, ja, ko, nl, no, pl, pt, ro, ru, sv, tr, zh : même
  // arborescence, écrits dans la langue cible avant de lancer le script. Le garde-fou
  // ci-dessous refuse toute locale manquante, incomplète ou recopiée de l'anglais.
};

// ── Garde-fous ──
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

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const locales = files.map((f) => f.replace(".json", ""));
const en = leaves(TRANSLATIONS.en);
if (Object.keys(en).length !== 33) throw new Error(`en : ${Object.keys(en).length} feuilles, 33 attendues`);
const problems = [];
for (const loc of locales) {
  const block = TRANSLATIONS[loc];
  if (!block) { problems.push(`${loc} : bloc manquant`); continue; }
  const l = leaves(block);
  for (const k of Object.keys(en)) {
    if (!(k in l)) { problems.push(`${loc} : feuille manquante ${k}`); continue; }
    if (icuVars(l[k]) !== icuVars(en[k])) problems.push(`${loc} ${k} : variables ICU ${icuVars(l[k]) || "(aucune)"} vs ${icuVars(en[k]) || "(aucune)"}`);
    if (String(l[k]).includes("\u2014")) problems.push(`${loc} ${k} : tiret cadratin`);
  }
  for (const k of Object.keys(l)) if (!(k in en)) problems.push(`${loc} : feuille en trop ${k}`);
  if (loc !== "en" && l["car.v1.title"] === en["car.v1.title"]) problems.push(`${loc} : anglais recopié`);
}
if (problems.length) {
  console.error(problems.join("\n"));
  throw new Error(`${problems.length} problème(s) dans TRANSLATIONS, rien n'est écrit`);
}

// ── Injection ──
for (const file of files) {
  const locale = file.replace(".json", "");
  const path = join(DIR, file);
  const content = readFileSync(path, "utf8");
  if (content.includes('"articlePromo"')) {
    console.log("skip (déjà présent)", file);
    continue;
  }
  const block = '  "articlePromo": ' + JSON.stringify(TRANSLATIONS[locale], null, 2).replace(/\n/g, "\n  ") + ",\n";
  const out = content.replace(/^\{\r?\n/, (m) => m + block);
  if (out === content) throw new Error("Insertion échouée (format racine inattendu) : " + file);
  writeFileSync(path, out, "utf8");
  console.log("updated", file);
}
```

- [ ] **Étape 3.3 : écrire les 18 locales restantes dans `TRANSLATIONS`**

Dans le même fichier, à la place du commentaire de trois lignes, un bloc par locale `ar, cs, da, es, fi, hu, it, ja, ko, nl, no, pl, pt, ro, ru, sv, tr, zh`, même arborescence que `fr`. Contrôle par le script lui-même : tant qu'un bloc manque ou qu'une variable ICU est perdue, il refuse d'écrire.

Run : `node scripts/add-article-promo-i18n.mjs`
Attendu : `updated ar.json` ... `updated zh.json`, 22 lignes `updated`, aucune ligne d'erreur. Relancer : 22 lignes `skip (déjà présent)`.

- [ ] **Étape 3.4 : vérifier parité des clés, tirets cadratins, mélange d'alphabets**

Run : `npm run check:i18n && npm run check:da && npm run check:article-promo`
Attendu : `✅ check:i18n : 22 locales en parite (205 cles chacune).` (172 + 33), `check:da` sans nouvelle violation, `check:article-promo OK (43 tests)`.

Run (mélange d'alphabets, même contrôle que le plan du rail) :

```bash
node -e "const fs=require('fs');for(const f of fs.readdirSync('src/messages')){const s=JSON.stringify(JSON.parse(fs.readFileSync('src/messages/'+f,'utf8')).articlePromo);const cyr=/[\u0400-\u04FF]/.test(s),grk=/[\u0370-\u03FF]/.test(s),lat=/[A-Za-z]{5}/.test(s.replace(/van\.crete\.direct|KTEL|\{\w+\}/g,''));if(f!=='ru.json'&&cyr)console.log('cyrillique inattendu:',f);if(f!=='el.json'&&grk)console.log('grec inattendu:',f);if(['ru.json','el.json','ja.json','ko.json','zh.json','ar.json'].includes(f)&&lat)console.log('latin suspect dans:',f);}"
```

Attendu : aucune sortie. `van.crete.direct`, `KTEL` et les placeholders sont exclus du test ; les noms de villes (`Heraklion`, `Chania`) dans `van.generic.v1.line` des locales non latines sont attendus en alphabet local (Ηράκλειο, Ираклион, ...). Si le script signale une locale, lire la ligne à la main et corriger dans `TRANSLATIONS`, puis retirer le namespace du JSON concerné et relancer l'injection (ou corriger le JSON directement et reporter dans le script pour qu'il reste la source).

- [ ] **Étape 3.5 : commit**

```bash
git add scripts/add-article-promo-i18n.mjs scripts/check-article-promo.mjs src/messages
git commit -m "i18n(articles): namespace articlePromo, 33 cles dans les 22 locales"
```

---

## Task 4 : intégration dans la page article, retrait de `KAIROS_CTA`

**Files:**
- Modify: `src/app/[locale]/articles/[slug]/page.tsx`

- [ ] **Étape 4.1 : imports**

Après la ligne `import { getAutolinkIndex, autolinkHtml } from "@/lib/autolink";`, ajouter :

```ts
import { resolveArticlePromo, splitAfterSecondH2 } from "@/lib/article-promo";
import { ArticlePromoSlot } from "@/components/articles/ArticlePromoSlot";
```

- [ ] **Étape 4.2 : supprimer la constante `KAIROS_CTA` et sa lecture**

Supprimer intégralement le bloc qui commence par `const KAIROS_CTA: Record<Locale, { intro: string; link: string; href: string }> = {` et se termine par `};` (les quatre locales, lien externe vers un site tiers : contraire au cloisonnement de crete.direct).

Dans `ArticleDetailPage`, supprimer les deux lignes :

```ts
  // Article content has 22 routed locales but Locale type only covers en/fr/de/el.
  // Fallback to en on extended locales to avoid `undefined.intro` crashes.
  const kairosCta = KAIROS_CTA[loc] ?? KAIROS_CTA.en;
```

(garder les lignes `readTimeLabel`, `backLabel`, `moreArticlesLabel` qui suivent, elles servent encore).

- [ ] **Étape 4.3 : calculer le plan et la découpe, côté serveur**

Juste après la ligne `const linkedContent = autolinkHtml(content, await getAutolinkIndex(loc), { maxLinks: 6 });`, ajouter :

```ts
  // Encarts de service (spec 2026-09-07) : plan résolu au rendu, dans le HTML servi par
  // le CDN. La découpe travaille sur le HTML autolinké et dans la locale servie ; au
  // moindre doute elle retourne null et l'article s'affiche entier, avec le seul encart de fin.
  const promoPlan = resolveArticlePromo(guide, { html: linkedContent });
  const split = promoPlan.mid.kind !== "none" ? splitAfterSecondH2(linkedContent) : null;
```

- [ ] **Étape 4.4 : monter l'encart mid entre les deux moitiés**

Remplacer :

```tsx
            <article
              className="article-prose max-w-none"
              dangerouslySetInnerHTML={{ __html: linkedContent }}
            />
```

par :

```tsx
            <article className="article-prose max-w-none">
              {split ? (
                <>
                  <div dangerouslySetInnerHTML={{ __html: split[0] }} />
                  <ArticlePromoSlot promo={promoPlan.mid} locale={locale} slug={slug} />
                  <div dangerouslySetInnerHTML={{ __html: split[1] }} />
                </>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: linkedContent }} />
              )}
            </article>
```

Un seul `<article>` : la sémantique et le schéma `Article` ne bougent pas. Les règles `.article-prose p`, `.article-prose h2` de `globals.css` sont des sélecteurs descendants, elles traversent les `<div>` intermédiaires.

- [ ] **Étape 4.5 : l'encart de fin à la place exacte du bloc retiré**

Remplacer le bloc :

```tsx
            {/* Kairos cross-link (multilingue, discret, vers l'article cible SEO) */}
            <div className="mt-12 p-8 bg-sand rounded-lg border border-sand-warm">
              <p className="font-heading italic text-sea text-xl mb-3">{kairosCta.intro}</p>
              <a
                href={kairosCta.href}
                target="_blank"
                rel="noopener"
                className="inline-block mt-1 px-5 py-2.5 bg-terracotta text-white text-[13px] font-semibold uppercase tracking-wider rounded-md hover:bg-terracotta-light transition-colors"
              >
                {kairosCta.link}
              </a>
            </div>
```

par :

```tsx
            {/* Encart de fin : voiture, van ou bus selon le plan de l'article (spec 2026-09-07) */}
            <div className="mt-4">
              <ArticlePromoSlot promo={promoPlan.end} locale={locale} slug={slug} />
            </div>
```

- [ ] **Étape 4.6 : vérifier qu'il ne reste aucune trace du bloc retiré ni de lien tiers**

Run : `grep -n "KAIROS_CTA\|kairosCta\|kairosguest" "src/app/[locale]/articles/[slug]/page.tsx"; echo "exit=$?"`
Attendu : aucune ligne, `exit=1`.

Run : `grep -rn "kairosguest" src --include=*.tsx --include=*.ts | grep -v "^src/app/\[locale\]/stays" | head`
Attendu : aucune ligne dans le périmètre article (d'autres occurrences hors périmètre, s'il y en a, ne sont pas traitées par ce chantier : les noter dans le rapport de fin, sans y toucher).

- [ ] **Étape 4.7 : `tsc`, checks, build**

Run : `npx tsc --noEmit && npm run check:da && npm run check:article-promo`
Attendu : code 0, aucune nouvelle violation, `check:article-promo OK (43 tests)`.

Run : `npm run build`
Attendu : build terminé sans erreur. La route `/[locale]/articles/[slug]` reste listée en ISR (`revalidate` 172800). Compter le temps de build avant et après n'est pas requis.

- [ ] **Étape 4.8 : commit**

```bash
git add "src/app/[locale]/articles/[slug]/page.tsx"
git commit -m "feat(articles): encart de service avant le 3e H2 et en fin d'article, bloc tiers retire"
```

---

## Task 5 : contrôle visuel, events dans `window.plausible.q`, Lighthouse avant et après

Règle `feedback_mockup_avant_deploy` : le visuel se voit AVANT tout push. Rien n'est lu dans le code, tout est mesuré dans un navigateur sur le build de production servi en local.

**Files:**
- Create: `docs/mockups/2026-09-07-article-promos-desktop.png`
- Create: `docs/mockups/2026-09-07-article-promos-390.png`

- [ ] **Étape 5.1 : mesurer Lighthouse AVANT (sur `master`, même machine, même port)**

Depuis le worktree principal, qui est sur un autre code que ce chantier :

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object LocalPort -eq 3320
```

Attendu : aucune ligne (port libre ; sinon prendre 3321 et l'utiliser partout ci-dessous, sans laisser tourner l'ancien).

```bash
cd ~/cretepulse-build && git stash list >/dev/null && git switch --detach origin/master && npm run build && npx next start -p 3320
```

(lancé avec `run_in_background`). Puis :

```bash
npx lighthouse@12 http://localhost:3320/en/articles/balos-lagoon-guide --only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --output=json --output-path="$SCRATCHPAD/lh-before.json" --chrome-flags="--headless=new" --quiet
node -e "const r=require(process.argv[1]);console.log('LCP avant',r.audits['largest-contentful-paint'].displayValue,'CLS',r.audits['cumulative-layout-shift'].displayValue)" "$SCRATCHPAD/lh-before.json"
```

Attendu : une ligne `LCP avant X s CLS Y`. Noter les valeurs. Arrêter le serveur, remettre `cretepulse-build` sur sa branche d'origine (`git switch -`).

- [ ] **Étape 5.2 : servir le build de ce chantier**

Depuis `~/cp-article-promos` (le `npm run build` de l'étape 4.7 est encore valide si aucun fichier n'a changé depuis) :

```bash
npx next start -p 3320
```

(lancé avec `run_in_background`, après avoir vérifié que 3320 est libre à nouveau).

- [ ] **Étape 5.3 : lecture des events dans un vrai navigateur, 390 px**

Avec le skill `webapp-testing` (Playwright) ou Chrome, sur `http://localhost:3320/en/articles/balos-lagoon-guide` :

1. Bloquer la requête `script.outbound-links.js` (et tout script `plausible.io`), pour que `window.plausible` reste la file d'attente `q` posée par le snippet et ne soit pas écrasée par le vrai script. Espionner `window.plausible` directement donne un faux négatif.
2. Viewport 390 × 844. Défiler lentement jusqu'au pied de page.
3. Lire `window.plausible.q.map(a => [a[0], a[1]?.props])`.

Attendu pour `balos-lagoon-guide` (plan : mid car pickup `kissamos`, end bus depuis `Kissamos`, si l'article réel cite Kissamos dans son titre EN ou ses 1 500 premiers caractères ; sinon le plan est celui que `planArticlePromo` calcule sur le vrai contenu : le lire d'abord avec `node --experimental-strip-types -e` en important le module et en passant le guide lu par PostgREST) :

- deux `promo_impression`, `source: "article"`, `slug: "balos-lagoon-guide"`, `variant` numérique, `block` `car-promo` puis `bus-promo` ;
- l'encart mid est APRÈS le 2e H2 et AVANT le 3e (vérifier dans le DOM : `document.querySelector('aside').compareDocumentPosition(document.querySelectorAll('h2')[2])` renvoie 4, l'aside précède le 3e h2) ;
- l'encart de fin est après la FAQ et avant « More guides » ;
- clic sur le CTA voiture : la page d'arrivée `/en/car-rental/kissamos?source=article` pousse un `Car Wizard Viewed` avec `source: "article"` ;
- retour, clic sur le CTA bus : `bus_promo_click` avec `{ slug, from: "Kissamos", to: "", source: "article" }`, et l'URL d'arrivée est `/en/buses?from=Kissamos` avec le planificateur prérempli.

Faire le même relevé sur `/fr/articles/best-tavernas-chania` (textes français, encart bus avec `from=Chania`) et sur `/en/articles/day-trips-from-heraklion` (van corridor : `van_offer_click` avec `corridor: "heraklion-airport--matala"`, `slug`, `source: "article"`, lien `https://van.crete.direct/en/heraklion-airport--matala?source=article`).

Un article hors pilote (par exemple le premier de `/en/articles` qui n'est pas dans `PILOT_SLUGS`) ne montre AUCUN encart et n'émet aucun `promo_impression`.

- [ ] **Étape 5.4 : contrôle visuel et captures**

À 390 px : l'encart de fin ne passe pas sous `StickyNewsletterBar` quand on est en bas de page ; si chevauchement, ajouter `mb-16 md:mb-0` au `<div className="mt-4">` de l'étape 4.5, rien d'autre. Aucun saut de mise en page à l'arrivée des images (les photos de `PromoBox` sont en `absolute`, hauteur portée par le texte). Desktop 1440 px : l'encart mid respecte la largeur de la colonne article, la TOC latérale reste alignée.

Enregistrer deux captures pleine page :

- `docs/mockups/2026-09-07-article-promos-desktop.png` (1440 px, `balos-lagoon-guide`, EN)
- `docs/mockups/2026-09-07-article-promos-390.png` (390 px, `best-tavernas-chania`, FR)

- [ ] **Étape 5.5 : Lighthouse APRÈS, même page, même port**

```bash
npx lighthouse@12 http://localhost:3320/en/articles/balos-lagoon-guide --only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --output=json --output-path="$SCRATCHPAD/lh-after.json" --chrome-flags="--headless=new" --quiet
node -e "const r=require(process.argv[1]);console.log('LCP apres',r.audits['largest-contentful-paint'].displayValue,'CLS',r.audits['cumulative-layout-shift'].displayValue)" "$SCRATCHPAD/lh-after.json"
```

Attendu : LCP après = LCP avant à ± 0,3 s (bruit de mesure), CLS inchangé. Au-delà : ne pas pousser, chercher la cause (un encart au-dessus du pli ? une image non paresseuse ?) avant de reprendre. Arrêter le serveur.

- [ ] **Étape 5.6 : commit des captures**

```bash
git add docs/mockups/2026-09-07-article-promos-desktop.png docs/mockups/2026-09-07-article-promos-390.png
git commit -m "docs(articles): captures des encarts de service, desktop et 390 px"
```

---

## Task 6 : ship phase 1, lecture J+7, phase 2

- [ ] **Étape 6.1 : ship phase 1**

Working tree propre, depuis `~/cp-article-promos` sur `feat/article-promos` :

```bash
npm run ship
```

Attendu : `npm run check` vert de bout en bout (y compris `check:article-promo`, `check:da`, `check:i18n`, `tsc`), merge de `origin/master`, push fast-forward `HEAD:master`, puis une ligne `N commit(s) en attente sur master -> partiront au deploy de 20h Athens`. Le déploiement prod est fait par l'Action `daily-deploy` à 20 h Athènes ; ne jamais pousser `main`.

Le lendemain, vérifier en prod : `curl -s https://crete.direct/en/articles/balos-lagoon-guide | grep -c 'block'` n'est pas fiable (props côté client) ; vérifier plutôt `curl -s https://crete.direct/en/articles/balos-lagoon-guide | grep -o 'car-rental/[a-z-]*?source=article' | head -1` renvoie `car-rental/kissamos?source=article` (ou la landing calculée), et que `grep -c kairosguest` renvoie 0.

Mémoire : une ligne `DEPLOY` dans `session_log.md`, et dans `project_crete_direct.md` la date de mise en prod phase 1 avec le SHA de `master` poussé.

- [ ] **Étape 6.2 : lecture J+7 (impressions par variante, CTR, routages absurdes)**

Sept jours pleins après le premier déploiement prod. Remplacer `2026-09-09` par la date du déploiement.

```bash
ssh kairos-vps 'docker exec -i plausible-plausible_events_db-1 clickhouse-client --format PrettyCompact' <<'SQL'
SELECT meta.value[indexOf(meta.key,'block')] AS block,
       meta.value[indexOf(meta.key,'variant')] AS variant,
       count() AS impressions, uniq(user_id) AS visiteurs
FROM plausible_events_db.events_v2
WHERE site_id = 1 AND name = 'promo_impression'
  AND meta.value[indexOf(meta.key,'source')] = 'article'
  AND timestamp >= toDateTime('2026-09-09 00:00:00')
GROUP BY block, variant ORDER BY block, variant;

SELECT name, count() AS clics, uniq(user_id) AS visiteurs
FROM plausible_events_db.events_v2
WHERE site_id = 1 AND name IN ('Car Wizard Viewed','van_offer_click','bus_promo_click')
  AND meta.value[indexOf(meta.key,'source')] = 'article'
  AND timestamp >= toDateTime('2026-09-09 00:00:00')
GROUP BY name ORDER BY name;

SELECT meta.value[indexOf(meta.key,'slug')] AS slug,
       meta.value[indexOf(meta.key,'block')] AS block, count() AS impressions
FROM plausible_events_db.events_v2
WHERE site_id = 1 AND name = 'promo_impression'
  AND meta.value[indexOf(meta.key,'source')] = 'article'
  AND timestamp >= toDateTime('2026-09-09 00:00:00')
GROUP BY slug, block ORDER BY impressions DESC LIMIT 60;
SQL
```

Attendu : des impressions sur les trois blocs, chaque variante représentée (une variante à zéro sur un bloc qui a des impressions signale un bug de hash ou de clé), des clics avec `source = article`. Relever pour chacun des 23 slugs le couple `mid/end` réellement servi (troisième requête) et le comparer à la table §2.4 : un routage absurde (corridor voisin sans rapport, bus vers un lieu que l'article ne traite pas) se corrige par la détection ou par la fixture du slug, en commit séparé, jamais en retirant l'encart sur une semaine de données.

Consigner : ligne `AUDIT` dans `session_log.md`, bloc daté dans `project_crete_direct.md` (impressions par bloc et variante, clics, anomalies).

- [ ] **Étape 6.3 : phase 2, retirer la garde pilote**

Dans `src/lib/article-promo.ts`, supprimer la constante `PILOT_SLUGS` (avec son commentaire) et remplacer `resolveArticlePromo` par :

```ts
/** Phase 2 (depuis le retrait de la liste pilote) : le plan s'applique à tous les articles. */
export function resolveArticlePromo(input: ArticlePromoInput, opts: { html?: string } = {}): ArticlePromoPlan {
  return planArticlePromo(input, opts);
}
```

Dans `scripts/check-article-promo.mjs`, retirer `PILOT_SLUGS` de l'import et supprimer les deux tests `PILOT_SLUGS : 23 entrées uniques...` et `hors pilote : none / none ; dans le pilote : le plan`, remplacés par :

```js
ok("phase 2 : resolveArticlePromo et planArticlePromo donnent le même plan pour tout slug", () => {
  for (const slug of ["not-in-pilot", "best-tavernas-chania", "any-article"]) {
    const g = guide({ slug, category: "food", title: "Best tavernas in Chania" });
    assert.deepEqual(resolveArticlePromo(g), planArticlePromo(g));
  }
});
```

Run : `npm run check:article-promo && npx tsc --noEmit`
Attendu : `check:article-promo OK (42 tests)`, `tsc` code 0.

```bash
git add src/lib/article-promo.ts scripts/check-article-promo.mjs
git commit -m "feat(articles): les encarts de service s appliquent aux 374 articles"
npm run ship
```

Les 374 pages sont régénérées au déploiement du soir (`generateStaticParams` prébuilde jusqu'à 500 guides, un déploiement invalide le cache ISR). Mémoire : ligne `DEPLOY` dans `session_log.md`, date de la phase 2 dans `project_crete_direct.md`.

---

## Task 7 : lecture J+30 et décision

- [ ] **Étape 7.1 : requêtes du tableau de bord (spec §6.2), 30 jours après la phase 2**

Remplacer `2026-09-17` par la date de la phase 2.

```bash
ssh kairos-vps 'docker exec -i plausible-plausible_events_db-1 clickhouse-client --format PrettyCompact' <<'SQL'
-- 1. Impressions source = article, par block et variant
SELECT meta.value[indexOf(meta.key,'block')] AS block, meta.value[indexOf(meta.key,'variant')] AS variant, count() AS impressions
FROM plausible_events_db.events_v2
WHERE site_id = 1 AND name = 'promo_impression' AND meta.value[indexOf(meta.key,'source')] = 'article'
  AND timestamp >= toDateTime('2026-09-17 00:00:00') AND timestamp < toDateTime('2026-09-17 00:00:00') + INTERVAL 30 DAY
GROUP BY block, variant ORDER BY block, variant;

-- 2, 3, 4. Clics par service, source = article
SELECT name, count() AS clics
FROM plausible_events_db.events_v2
WHERE site_id = 1 AND name IN ('Car Wizard Viewed','Car Lead Submitted','van_offer_click','bus_promo_click')
  AND meta.value[indexOf(meta.key,'source')] = 'article'
  AND timestamp >= toDateTime('2026-09-17 00:00:00') AND timestamp < toDateTime('2026-09-17 00:00:00') + INTERVAL 30 DAY
GROUP BY name ORDER BY name;

-- 5. Garde-fou : pages par session sur /articles/*, 30 j après vs 30 j avant
SELECT if(timestamp >= toDateTime('2026-09-17 00:00:00'), 'apres', 'avant') AS periode,
       count() / uniq(session_id) AS pages_par_session, uniq(user_id) AS visiteurs
FROM plausible_events_db.events_v2
WHERE site_id = 1 AND name = 'pageview' AND match(pathname, '^/[a-z]{2}/articles/[^/]+/?$')
  AND timestamp >= toDateTime('2026-09-17 00:00:00') - INTERVAL 30 DAY
  AND timestamp <  toDateTime('2026-09-17 00:00:00') + INTERVAL 30 DAY
GROUP BY periode ORDER BY periode;
SQL
```

Réservations van avec `source = article` : lecture dans la table des réservations de `~/van-crete-direct` (champ `source`, `src/lib/types.ts` ligne 103 de ce dépôt), par le même canal que les autres lectures de ce projet, à confirmer au moment de la tâche.

CTR = clics divisés par impressions du bloc correspondant (`Car Wizard Viewed` / `car-promo`, `van_offer_click` / `van-promo`, `bus_promo_click` / `bus-promo`).

- [ ] **Étape 7.2 : décision selon les seuils de la spec §6.3**

| Indicateur | Seuil | Si sous le seuil |
|---|---|---|
| Impressions `source = article` | 3 000 ou plus | vérifier d'abord que les events partent (une semaine à zéro est un bug, pas une décision) |
| `Car Wizard Viewed` `source = article` | 90 ou plus | changer les variantes voiture, pas le placement |
| `van_offer_click` `source = article` | 30 ou plus, et 2 réservations | changer les variantes van, pas le placement |
| `bus_promo_click` | 60 ou plus | changer les variantes bus |
| Pages par session articles | pas de baisse au-delà de 5 % | l'encart mid recule au 3e H2 (`MIN_H2_FOR_MID` passe à 4 et `splitAfterSecondH2` coupe à la 4e occurrence) |
| LCP mobile `balos-lagoon-guide` | valeur de l'étape 5.1 ± 0,3 s | chercher la régression, chantier hero à part |

Rien n'est retiré sur la base d'une semaine. Écrire la décision et les chiffres dans `project_crete_direct.md` (bloc daté, étiquettes `[FACT AAAA-MM-JJ]`), une ligne `AUDIT` dans `session_log.md`, et si une modification en découle, l'ouvrir comme nouveau chantier `feat/*` avec sa propre spec courte.

---

## Auto-revue (faite à l'écriture du plan)

**Couverture de la spec.**
- §1 non-objectifs : aucun lien `/stays` (Task 1, ligne 10 du routage, test `best-areas-to-stay-crete`), bloc `KAIROS_CTA` retiré (Task 4.2, 4.5, grep 4.6), pas d'activités, pas de nouveau composant visuel (`PromoBox` réutilisé, Task 2).
- §2.1 format élargi : `ArticlePromoInput.format: string`, tests `short` et `news` (Task 1).
- §2.2 API du module : `resolveArticlePromo`, `detectPlaces`, `splitAfterSecondH2`, `PILOT_SLUGS`, plus `planArticlePromo`, `detectionText`, `variantFor`, `vanGenericFacts` exposés pour les tests (Task 1).
- §2.3 détection : titre EN, mots-clés, slug, 1 500 caractères, mot entier `(?<![\p{L}\p{N}])...(?![\p{L}\p{N}])u`, dictionnaire construit depuis `VAN_CORRIDORS`, `CAR_ZONES`, `CAR_LANDINGS`, `BUS_PLACE_SLUGS`, alias via `normalizeBusSlug`, sens aéroport vers ville, première ville gagne (Task 1, tests dédiés).
- §2.4 les 13 lignes : fonction `route`, un test par famille ; règles transverses : moins de trois H2, pickup hors zone, pas de cible non prouvée (corridor et lieux bus sortent des listes du dépôt), variante par hash (Task 1).
- §2.5 cibles : voiture via `CarPromo` (landing, `?pickup=`, `?source=article`), van corridor et générique (Task 2.3, 2.5), bus `?from=&to=` en noms DB (Task 2.4, test `busTo: "Siteia"`).
- §3.1 et 3.2 placement et découpe : `splitAfterSecondH2` sur `linkedContent`, garde-fous testés, un seul `<article>` (Task 4.4).
- §3.3 performance : rendu serveur, aucun JS nouveau hors `BusPromo` calqué sur `VanPromo`, Lighthouse avant et après (Task 5.1, 5.5).
- §3.4 composants : `CarPromo` (`copy`, `slug`, `variant`), `VanPromo` (`copy`, `slug`, `variant`, `generic`), `BusPromo`, `ArticlePromoSlot` (Task 2).
- §4 textes : 33 feuilles, namespace `articlePromo`, copie FR de référence, `{price}` et `{count}` calculés (Task 3, `vanGenericFacts`).
- §5 phases : `PILOT_SLUGS` (Task 1.1, 1.5), retrait (Task 6.3).
- §6 mesure : `slug` et `variant` sur `promo_impression`, `slug` sur `van_offer_click`, `bus_promo_click` (Task 2), requêtes J+7 et J+30 (Tasks 6.2, 7.1).
- §7 risques : `StickyNewsletterBar` (5.4), découpe qui casse (retour `null` testé), `rel sponsored` laissé tel quel (comportement existant de `PromoBox`, pas touché).
- §8 tests : tous les cas listés ont un test nommé dans `check-article-promo.mjs` ; `check:i18n`, `check:da`, `tsc` appelés aux étapes 3.4, 4.7 et par `npm run ship`.
- §9 ordre : 1 avant 2 (type `ArticlePromo`), 3 avant 4 (clés avant `getTranslations`), 5 avant 6 (visuel avant push). Respecté.

**Placeholders.** Aucun « TBD », « à compléter », « comme la Task N ». Deux contenus dépendent de données lues à l'exécution et sont explicitement bornés par un test ou un garde-fou : les 13 slugs pilotes (lus à l'étape 1.1, refusés par le test `PILOT_SLUGS : 23 entrées` tant qu'ils manquent) et les 18 blocs de traduction restants (refusés par le script d'injection et par le test de parité tant qu'ils manquent ou recopient l'anglais). La catégorie de `snorkeling-spots-crete-guide` est marquée [ASSUMED] avec la procédure de correction.

**Cohérence des types.** `ArticlePromo` (`kind`, `variant: 1|2|3`, `pickup?`, `landing?`, `corridor?: VanCorridor`, `busFrom?`, `busTo?`) est le même dans le module (Task 1), le slot (Task 2.5) et la page (Task 4). `PromoCopy` (`title`, `line`, `cta`, `disclosure`) est défini une fois dans `PromoBox.tsx` et consommé par `CarPromo`, `VanPromo`, `BusPromo`, `ArticlePromoSlot`. `resolveArticlePromo(input, { html })` a la même signature dans le module, la page (4.3) et la phase 2 (6.3). `vanGenericFacts()` renvoie `{ price, count }`, exactement les deux variables ICU de `van.generic.v1.line`. Les props d'events sont typées `Record<string, string | number>` partout, comme `ImpressionTracker` l'exige.
