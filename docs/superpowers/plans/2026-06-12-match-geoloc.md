# Match géolocalisé + mode préparation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le deck /match privilégie les lieux proches de la position (pondération douce 65/35, rayon adaptatif) quand l'utilisateur est en Crète, et bascule en « Mode préparation » avec ancrage optionnel sur le futur logement quand il est hors Crète.

**Architecture:** Logique 100 % pure étendue dans `src/lib/match-scoring.ts` (`nearSlugs` + paramètre `near` de `sampleDeck`, refactor `pickWeighted`), UI dans `MatchDeck.tsx` qui réutilise `useGeoPosition`/`isOnCrete`/`PlacePicker` existants. La position ne quitte jamais le navigateur.

**Tech Stack:** Next.js 16, React 19, motion/react, node ≥23 type-stripping pour les checks.

**Spec:** `docs/superpowers/specs/2026-06-12-match-geoloc-design.md`
**Branche:** `feat/match-geoloc` (leçon multi-terminal : JAMAIS de commits retenus sur master partagé). Merge vers master UNIQUEMENT après GO Kami sur captures.

---

### Task 1: Logique pure — `nearSlugs` + `sampleDeck(near)`

**Files:**
- Modify: `src/lib/match-scoring.ts`
- Test: `scripts/check-match-geo.mjs` (pattern `check-bus-journey.mjs`)

- [ ] **Step 1: Écrire le script de check (échouera : exports absents)**

```js
// Assertions sur fixtures synthétiques. Run: node scripts/check-match-geo.mjs
// (Node >= 23 : importe le .ts par type-stripping)
import assert from "node:assert/strict";
import { nearSlugs, sampleDeck, NEAR_RATIO } from "../src/lib/match-scoring.ts";

const P = (slug, lat, lon, type = "beach") => ({
  slug, name: slug, place_type: type, prefecture: null, rating: 4,
  water_color: null, sand_type: null, crowds: null,
  latitude: lat, longitude: lon, photos: ["x.jpg"],
});

// Grappe Makrigialos (35.04, 25.97) : 30 lieux à <5 km, 30 lieux à ~200 km (ouest)
const nearPool = Array.from({ length: 30 }, (_, i) => P(`near-${i}`, 35.04 + i * 0.001, 25.97));
const farPool = Array.from({ length: 30 }, (_, i) => P(`far-${i}`, 35.5, 23.6 + i * 0.001, "gorge"));
const pool = [...nearPool, ...farPool];
const here = { lat: 35.04, lon: 25.97 };

// --- nearSlugs : rayon 40 km suffit (30 lieux >= 25) ------------------------
const near = nearSlugs(pool, here);
assert.equal(near.size, 30);
assert.ok(near.has("near-0") && !near.has("far-0"));

// --- nearSlugs : rayon adaptatif — min introuvable => Set vide ---------------
assert.equal(nearSlugs(farPool, here, [40, 70, 100], 25).size, 0);
// 12 lieux proches, min 10 => premier rayon les couvre
assert.equal(nearSlugs(nearPool.slice(0, 12), here, [40, 70, 100], 10).size, 12);

// --- nearSlugs : lieux sans coordonnées ignorés ------------------------------
const noCoords = [...nearPool, P("nocoord", null, null)];
assert.ok(!nearSlugs(noCoords, here).has("nocoord"));

// --- sampleDeck near : ~65 % du deck vient du set near -----------------------
for (let run = 0; run < 5; run++) {
  const deck = sampleDeck(pool, 40, new Set(), undefined, near);
  assert.equal(deck.length, 40);
  const nearCount = deck.filter((p) => near.has(p.slug)).length;
  assert.equal(nearCount, Math.round(40 * NEAR_RATIO)); // 26
}

// --- sampleDeck near : complétion croisée si far insuffisant -----------------
const tinyFar = [...nearPool, P("lonely-far", 35.5, 23.6, "gorge")];
const deckTiny = sampleDeck(tinyFar, 31, new Set(), undefined, nearSlugs(tinyFar, here));
assert.equal(deckTiny.length, 31); // 30 near + 1 far, complétion par les near

// --- sampleDeck near : seen exclus, pas de doublon ---------------------------
const seen = new Set(["near-0", "far-0"]);
const deckSeen = sampleDeck(pool, 40, seen, undefined, near);
assert.ok(!deckSeen.some((p) => seen.has(p.slug)));
assert.equal(new Set(deckSeen.map((p) => p.slug)).size, deckSeen.length);

// --- sampleDeck near × preferred : la pondération intérêts survit ------------
const deckPref = sampleDeck(pool, 40, new Set(), new Set(["beach"]), near);
// les near sont tous beach => la moitié near reste majoritairement beach
assert.ok(deckPref.filter((p) => p.place_type === "beach").length >= 26);

// --- rétro-compat : sans near, comportement existant intact ------------------
const deckNoGeo = sampleDeck(pool, 40, new Set(), new Set(["beach"]));
assert.equal(deckNoGeo.length, 40);
assert.ok(deckNoGeo.filter((p) => p.place_type === "beach").length >= 28); // ~75 %

console.log("check-match-geo: OK");
```

- [ ] **Step 2: Vérifier l'échec**

Run: `node scripts/check-match-geo.mjs`
Expected: FAIL — `nearSlugs` n'est pas exporté par match-scoring.ts.

- [ ] **Step 3: Implémenter dans `src/lib/match-scoring.ts`**

En tête de fichier, ajouter l'import (geo.ts est pur, déjà importable node) :

```ts
import { haversineKm, type GeoPos } from "./geo";
```

Après les constantes existantes (`TYPE_CAP_RATIO`), ajouter :

```ts
export const NEAR_RATIO = 0.65; // part du deck ancrée localement
const NEAR_RADII_KM = [40, 70, 100]; // rayon adaptatif
const NEAR_MIN_PLACES = 25; // en dessous, on élargit le rayon

// Slugs du pool dans le premier rayon contenant au moins `min` lieux.
// Set vide = pool trop clairsemé autour de pos, pas de pondération.
export function nearSlugs(
  pool: MatchPlace[],
  pos: GeoPos,
  radii: number[] = NEAR_RADII_KM,
  min = NEAR_MIN_PLACES,
): Set<string> {
  const withKm: { slug: string; km: number }[] = [];
  for (const p of pool) {
    if (p.latitude == null || p.longitude == null) continue;
    withKm.push({ slug: p.slug, km: haversineKm([p.latitude, p.longitude], [pos.lat, pos.lon]) });
  }
  for (const r of radii) {
    const inRadius = withKm.filter((x) => x.km <= r);
    if (inRadius.length >= min) return new Set(inRadius.map((x) => x.slug));
  }
  return new Set();
}
```

Remplacer ENTIÈREMENT la fonction `sampleDeck` existante par (le corps actuel
devient le helper `pickWeighted`, comportement identique) :

```ts
// Pondération intérêts (75/25) sur un ensemble de candidats. Logique
// historique de sampleDeck, extraite pour être appliquée par moitié near/far.
function pickWeighted(candidates: MatchPlace[], size: number, preferred?: Set<string>): MatchPlace[] {
  if (!preferred || preferred.size === 0) return shuffle([...candidates]).slice(0, size);
  const wanted = shuffle(candidates.filter((p) => preferred.has(p.place_type)));
  const discovery = shuffle(candidates.filter((p) => !preferred.has(p.place_type)));
  const wantedCount = Math.min(wanted.length, Math.round(size * 0.75));
  const picked = [
    ...wanted.slice(0, wantedCount),
    ...discovery.slice(0, size - wantedCount),
  ];
  if (picked.length < size) picked.push(...wanted.slice(wantedCount, wantedCount + size - picked.length));
  return picked;
}

// Côté client : deck par visiteur, en excluant les lieux déjà vus.
// S'il reste moins de 30 cartes non vues, on repart de zéro.
// `preferred` : ~75 % du deck vient de ces types (intérêts onboarding).
// `near` (slugs proches de la position) : ~65 % du deck vient de ce set,
// le reste = découverte toute l'île ; la pondération intérêts s'applique
// dans chaque moitié. Vide ou absent = pas de pondération géo.
export function sampleDeck(
  pool: MatchPlace[],
  size: number,
  seen: Set<string>,
  preferred?: Set<string>,
  near?: Set<string>,
): MatchPlace[] {
  let candidates = pool.filter((p) => !seen.has(p.slug));
  if (candidates.length < Math.min(size, 30)) candidates = [...pool];
  if (!near || near.size === 0) return shuffle(pickWeighted(candidates, size, preferred));

  const nearC = candidates.filter((p) => near.has(p.slug));
  const farC = candidates.filter((p) => !near.has(p.slug));
  const nearCount = Math.min(nearC.length, Math.round(size * NEAR_RATIO));
  const picked = [
    ...pickWeighted(nearC, nearCount, preferred),
    ...pickWeighted(farC, size - nearCount, preferred),
  ];
  // Complétion croisée : si une moitié n'a pas pu remplir sa part.
  if (picked.length < size) {
    const pickedSlugs = new Set(picked.map((p) => p.slug));
    const rest = shuffle(candidates.filter((p) => !pickedSlugs.has(p.slug)));
    picked.push(...rest.slice(0, size - picked.length));
  }
  return shuffle(picked);
}
```

- [ ] **Step 4: Vérifier le pass + non-régression**

Run: `node scripts/check-match-geo.mjs` → `check-match-geo: OK`
Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-scoring.ts scripts/check-match-geo.mjs
git commit -m "feat(match): nearSlugs adaptive radius + proximity-weighted sampleDeck (pure logic)"
```

---

### Task 2: MatchDeck — câblage géoloc (hook, modes, re-deal, pill, events)

**Files:**
- Modify: `src/components/match/MatchDeck.tsx`

- [ ] **Step 1: Imports + i18n**

Ajouter aux imports de MatchDeck.tsx :

```ts
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import { PlacePicker } from "@/components/geo/PlacePicker";
import { haversineKm, isOnCrete, type GeoPos } from "@/lib/geo";
import { SLUG_COORDS } from "@/lib/taxi-fare";
import { nearSlugs } from "@/lib/match-scoring"; // ajouter à l'import existant
```

Ajouter les clés i18n dans `T` (4 langues) :

```ts
// en
geoNearMe: "Around me",
geoActive: "Nearby first",
geoOff: "Disable",
geoPick: "Choose a place",
prepTitle: "Trip-prep mode",
prepSub: "You're not in Crete yet. Where will you stay?",
prepFrom: "Distances from your stay",
synthSubPrep: "Everything you liked, ready for your trip:",
// fr
geoNearMe: "Autour de moi",
geoActive: "Proche d'abord",
geoOff: "Désactiver",
geoPick: "Choisis un lieu",
prepTitle: "Mode préparation",
prepSub: "Tu n'es pas encore sur place. Où vas-tu loger ?",
prepFrom: "Distances depuis ton logement",
synthSubPrep: "Tout ce que tu as liké, prêt pour ton voyage :",
// de
geoNearMe: "In meiner Nähe",
geoActive: "Nahes zuerst",
geoOff: "Deaktivieren",
geoPick: "Ort wählen",
prepTitle: "Reiseplanungs-Modus",
prepSub: "Du bist noch nicht auf Kreta. Wo wirst du wohnen?",
prepFrom: "Entfernungen von deiner Unterkunft",
synthSubPrep: "Alles, was dir gefallen hat, bereit für deine Reise:",
// el
geoNearMe: "Κοντά μου",
geoActive: "Κοντινά πρώτα",
geoOff: "Απενεργοποίηση",
geoPick: "Διάλεξε μέρος",
prepTitle: "Λειτουργία προετοιμασίας",
prepSub: "Δεν είσαι ακόμα στην Κρήτη. Πού θα μείνεις;",
prepFrom: "Αποστάσεις από το κατάλυμά σου",
synthSubPrep: "Ό,τι σου άρεσε, έτοιμο για το ταξίδι σου:",
```

- [ ] **Step 2: États + mode dérivé**

Dans le corps de `MatchDeck`, après les useState existants :

```ts
const { status: geoStatus, pos, requestGeo, setManual } = useGeoPosition();
const [geoOff, setGeoOff] = useState(false); // opt-out utilisateur (session courante)
const [prepPos, setPrepPos] = useState<GeoPos | null>(null); // futur logement (mode prépa)
const [prepSlug, setPrepSlug] = useState<string | null>(null);

// Mode dérivé : off (pas de position / désactivé), near (sur l'île),
// prep (position hors Crète => on prépare le voyage).
const onCrete = pos != null && isOnCrete(pos);
const geoMode: "off" | "near" | "prep" = geoOff || !pos ? "off" : onCrete ? "near" : "prep";
// Point d'ancrage des distances et de la pondération du deck.
const anchor: GeoPos | null = geoMode === "near" ? pos : geoMode === "prep" ? prepPos : null;
```

- [ ] **Step 3: Re-deal quand l'ancrage change**

Le deck est ré-échantillonné quand l'ancrage apparaît/change/disparaît, en
conservant profil/likes/seen (même mécanique qu'`applyInterests`). DÉPLACER le
`setDeck(...)` du useEffect de mount dans cet effet (sinon double échantillonnage) ;
le mount effect garde localStorage + screen + ready + track.

```ts
// Clé stable de l'ancrage (évite de re-sampler sur chaque render).
const anchorKey = anchor ? `${anchor.lat.toFixed(3)},${anchor.lon.toFixed(3)}` : "none";

// (Ré)échantillonne le deck à l'init et à chaque changement d'ancrage.
// Profil, likes et seen sont conservés ; l'index repart à zéro.
useEffect(() => {
  if (!ready) return;
  const near = anchor ? nearSlugs(pool, anchor) : undefined;
  setDeck(sampleDeck(pool, DECK_SIZE, new Set(seenSlugs), interestTypes(interests || []), near));
  setIndex(0);
  setSwipes(0);
  lastSwipedRef.current = null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [anchorKey, ready]);
```

Dans le useEffect de mount : supprimer la ligne `setDeck(sampleDeck(...))`
(reprise par l'effet ci-dessus quand `ready` passe à true).

Dans `applyInterests` et `redeal` : passer le set near courant en 5e argument :

```ts
const near = anchor ? nearSlugs(pool, anchor) : undefined;
setDeck(sampleDeck(pool, DECK_SIZE, new Set(seenSlugs), interestTypes(groups), near));
```

(dans `redeal`, `interestTypes(interests || [])` comme aujourd'hui).

- [ ] **Step 4: Event Plausible à l'activation réelle (transition prompting→granted)**

```ts
// match_geo_enabled : uniquement sur une activation par clic (transition
// prompting→granted), pas sur une restauration sessionStorage.
const prevGeoStatus = useRef(geoStatus);
useEffect(() => {
  if (prevGeoStatus.current === "prompting" && geoStatus === "granted" && pos) {
    track("match_geo_enabled", { on_crete: isOnCrete(pos) ? "yes" : "no" });
  }
  prevGeoStatus.current = geoStatus;
}, [geoStatus, pos]);
```

- [ ] **Step 5: Pill « Autour de moi » sous le hint du deck**

Juste après le `<p>` du hint (écran deck), insérer :

```tsx
{/* Géoloc opt-in : pill état idle/actif, PlacePicker si refusée */}
{ready && (
  <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
    {geoMode === "off" && geoStatus !== "denied" && geoStatus !== "unavailable" && (
      <button
        onClick={() => {
          if (pos) setGeoOff(false); // position déjà connue : réactiver
          else requestGeo();
        }}
        disabled={geoStatus === "prompting"}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 font-heading text-[13px] font-bold text-aegean transition-colors hover:border-aegean disabled:opacity-50"
      >
        <MapPin size={13} /> {geoStatus === "prompting" ? "..." : t.geoNearMe}
      </button>
    )}
    {(geoStatus === "denied" || geoStatus === "unavailable") && geoMode === "off" && (
      <PlacePicker value={null} onChange={(slug) => setManual(slug)} label={t.geoPick} />
    )}
    {geoMode !== "off" && (
      <>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-aegean px-4 py-2 font-heading text-[13px] font-bold text-white">
          <MapPin size={13} /> {t.geoActive}
        </span>
        <button
          onClick={() => setGeoOff(true)}
          className="rounded-full px-3 py-2 text-[12px] font-medium text-text-muted underline-offset-2 hover:text-aegean hover:underline"
        >
          {t.geoOff}
        </button>
      </>
    )}
  </div>
)}
```

Note : le `PlacePicker` rendu ici donne un lieu de Crète → `setManual` →
`pos` sur l'île → `geoMode === "near"`. C'est le fallback « refusée/indispo ».

- [ ] **Step 6: tsc**

Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 7: Commit**

```bash
git add src/components/match/MatchDeck.tsx
git commit -m "feat(match): geo opt-in pill, anchor-driven re-deal, geo events"
```

---

### Task 3: Bandeau préparation + badges km sur les cartes

**Files:**
- Modify: `src/components/match/MatchDeck.tsx`

- [ ] **Step 1: Bandeau « Mode préparation » (geoMode === "prep")**

Sous le bloc pill de la Task 2, ajouter :

```tsx
{/* Hors Crète : mode préparation, ancrage optionnel sur le futur logement */}
{ready && geoMode === "prep" && (
  <div className="mb-5 rounded-2xl border border-border bg-sand px-4 py-3">
    <p className="m-0 font-heading text-[13.5px] font-bold text-text">{t.prepTitle}</p>
    <p className="m-0 mt-0.5 text-[12.5px] text-text-muted">
      {prepSlug ? t.prepFrom : t.prepSub}
    </p>
    <div className="mt-2 flex">
      <PlacePicker
        value={prepSlug}
        onChange={(slug) => {
          const c = SLUG_COORDS[slug];
          if (!c) return;
          setPrepSlug(slug);
          setPrepPos({ lat: c[0], lon: c[1] });
          track("match_prep_place_set", { slug });
        }}
        label={t.geoPick}
      />
    </div>
  </div>
)}
```

Important : on ne passe PAS par `setManual` ici — `pos` doit rester la vraie
position (hors île) pour que `geoMode` reste "prep" ; l'ancrage logement vit
dans `prepPos` (état local, jamais persisté).

- [ ] **Step 2: Badge km sur les cartes**

Étendre `SwipeCard` avec une prop `km?: number | null` et l'afficher dans le
bandeau infos, à côté du type :

```tsx
// signature
function SwipeCard({ place, top, stackPos, exitDir, locale, t, km, onSwipe }: {
  // ...props existantes
  km?: number | null;
  // ...
})
```

Dans le `<p>` type/préfecture du bandeau infos, après la préfecture :

```tsx
<p className="m-0 mt-1 flex items-center gap-1.5 text-[13.5px] text-white/85">
  <MapPin size={13} /> {typeLabel(place.place_type, locale)}
  {place.prefecture ? ` · ${place.prefecture}` : ""}
  {km != null && (
    <span className="font-data ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[12px] font-bold">
      {Math.max(1, Math.round(km))} km
    </span>
  )}
</p>
```

Au rendu des cartes visibles (parent), calculer la distance quand un ancrage existe :

```tsx
<SwipeCard
  key={place.slug}
  // ...props existantes
  km={
    anchor && place.latitude != null && place.longitude != null
      ? haversineKm([place.latitude, place.longitude], [anchor.lat, anchor.lon])
      : null
  }
  onSwipe={handleSwipe}
/>
```

- [ ] **Step 3: tsc + vérif visuelle locale**

Run: `npx tsc --noEmit` → 0 erreur.
Run: `npm run dev` puis http://localhost:3000/fr/match — vérifier : pill
visible, clic « Autour de moi » → prompt navigateur ; via DevTools
`sessionStorage.setItem("cd-geo", JSON.stringify({lat:48.85,lon:2.35,status:"granted"}))`
+ reload → bandeau préparation visible, choix d'un lieu → badges km.

- [ ] **Step 4: Commit**

```bash
git add src/components/match/MatchDeck.tsx
git commit -m "feat(match): trip-prep banner with stay anchor + km badges on cards"
```

---

### Task 4: Synthèse — tri distance, km, variante prépa, ordre conversions

**Files:**
- Modify: `src/components/match/MatchDeck.tsx`

- [ ] **Step 1: Tri + km dans la liste des likes**

Remplacer le calcul `likedPlacesAll` existant par :

```tsx
// Tous les likes, du plus récent au plus ancien ; si un ancrage existe,
// tri par distance croissante + km affiché (itinéraires actionnables).
const likedPlacesAll = likedSlugs
  .map((slug) => pool.find((p) => p.slug === slug))
  .filter((p): p is MatchPlace => Boolean(p))
  .reverse()
  .map((p) => ({
    ...p,
    km:
      anchor && p.latitude != null && p.longitude != null
        ? haversineKm([p.latitude, p.longitude], [anchor.lat, anchor.lon])
        : null,
  }));
if (anchor) likedPlacesAll.sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
```

Dans la carte de synthèse, la ligne meta devient :

```tsx
<p className="m-0 mt-0.5 text-[12px] text-text-muted">
  {typeLabel(p.place_type, locale)}
  {p.prefecture ? ` · ${p.prefecture}` : ""}
  {p.rating != null && p.rating > 0 ? ` · ${p.rating.toFixed(1)} ★` : ""}
  {p.km != null ? ` · ${Math.max(1, Math.round(p.km))} km` : ""}
</p>
```

- [ ] **Step 2: Sous-titre prépa + email en premier en mode prépa**

Sous-titre :

```tsx
<p className="mx-auto mt-1.5 max-w-[320px] text-center text-[13.5px] text-text-muted">
  {geoMode === "prep" ? t.synthSubPrep : t.synthSub}
</p>
```

Ordre des conversions : extraire le bloc email (le `<div className="card-base mt-4...">`
complet, formulaire inclus) dans une variable locale `emailBlock` juste avant le
`return` de l'écran synthèse, puis :

```tsx
{geoMode === "prep" && emailBlock}
<div className={geoMode === "prep" ? "mt-4" : "mt-6"}>
  <CarPromo locale={locale} source="match-synthesis" />
</div>
{likedPlacesAll.some((p) => TOURABLE_TYPES.has(p.place_type)) && (
  <AffiliateBanner type="tours" locale={locale} className="mt-4" />
)}
{geoMode !== "prep" && emailBlock}
```

(`emailBlock` garde son markup actuel à l'identique, y compris `mt-4`.)

- [ ] **Step 3: tsc**

Run: `npx tsc --noEmit` → 0 erreur.

- [ ] **Step 4: Commit**

```bash
git add src/components/match/MatchDeck.tsx
git commit -m "feat(match): synthesis sorted by distance, prep-mode email-first ordering"
```

---

### Task 5: Vérifications complètes + captures pour Kami

**Files:**
- Create: `scripts/capture-match-geo.mjs` (jetable, non commité ou commité au choix)

- [ ] **Step 1: Checks logiques + types + build**

```bash
node scripts/check-match-geo.mjs        # OK
node scripts/check-bus-journey.mjs      # non-régression imports partagés
npx tsc --noEmit                        # 0 erreur
SUPABASE_SERVICE_KEY=dummy npm run build  # EXIT 0 (clé dummy = workaround connu)
```

⚠️ Multi-terminal : `tasklist | findstr node` avant le build (un build concurrent
d'un autre terminal écrase `.next`).

- [ ] **Step 2: Captures Playwright (3 scénarios)**

`scripts/capture-match-geo.mjs` :

```js
// Captures /fr/match : idle, mode proche (Makrigialos), mode prépa (Paris).
// Préalable : npm run dev sur :3000. Run: node scripts/capture-match-geo.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3000/fr/match";
const shots = [
  { name: "match-geo-idle", geo: null },
  { name: "match-geo-near", geo: { lat: 35.04, lon: 25.97, status: "granted" } },
  { name: "match-geo-prep", geo: { lat: 48.85, lon: 2.35, status: "granted" } },
];

const browser = await chromium.launch();
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  if (s.geo) {
    const geo = s.geo;
    await ctx.addInitScript((g) => sessionStorage.setItem("cd-geo", JSON.stringify(g)), geo);
  }
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  // passer l'onboarding intérêts si présent
  const all = page.getByText(/Tout me va/);
  if (await all.isVisible().catch(() => false)) await all.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `.playwright-tmp/${s.name}.png`, fullPage: false });
  await ctx.close();
}
await browser.close();
console.log("captures OK dans .playwright-tmp/");
```

Vérifier sur les captures : pill idle (scénario 1), pill active + badges km
(scénario 2), bandeau préparation + PlacePicker (scénario 3). Pour le
scénario 2, choisir un lieu dans la synthèse demanderait des swipes — la
capture du deck suffit.

- [ ] **Step 3: Envoyer les captures à Kami — STOP avant merge**

Montrer les 3 captures. NE PAS merger vers master ni pousser master:main sans
GO explicite (règle mockup-avant-deploy). La branche `feat/match-geoloc` peut
être poussée sur origin (backup) sans déclencher de deploy (Vercel = main).

- [ ] **Step 4 (après GO Kami): merge + deploy + vérif prod**

```bash
git checkout master && git pull --ff-only origin master
git merge --no-ff feat/match-geoloc -m "feat(match): geolocation — proximity deck + trip-prep mode"
git push origin master && git push origin master:main
```

Vérifier le deploy Vercel Ready puis en prod : `https://crete.direct/fr/match`
(pill présente dans le HTML servi). Mettre à jour `project_crete_direct.md`
(addendum Phase 15) + `MEMORY.md` + `session_log.md`.

---

## Self-review

- Spec coverage : pill/états (T2), 3 états deck + rayon adaptatif + croisement
  intérêts (T1+T2), badges km (T3), mode prépa + PlacePicker + setManual évité
  (T3), synthèse tri/km/variante/ordre (T4), events (T2+T3), re-deal préservant
  profil (T2), captures avant deploy (T5). ✓
- Pas de placeholder, code complet à chaque étape. ✓
- Types cohérents : `nearSlugs(pool, pos, radii?, min?)`, `sampleDeck(pool,
  size, seen, preferred?, near?)`, `GeoPos {lat, lon}`, `km?: number | null`. ✓
