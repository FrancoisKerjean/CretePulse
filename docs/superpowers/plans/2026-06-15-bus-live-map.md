# Bus Live Map — Implementation Plan (couche carte)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Une page `/[locale]/live` plein écran (MapLibre) où chaque bus en circulation avance en direct estimatif, importée depuis le moteur `@/lib/bus-live`, avec badge honnête « estimé selon l'horaire », légende et compteur de bus.

**Architecture:** Le moteur `busesAt(now, network)` (déjà livré, couche 1) est recalculé toutes les ~2 s ; entre deux recalculs les marqueurs **glissent** via `requestAnimationFrame` (interpolation pure, testable). La carte est un composant `"use client"` qui charge le réseau une fois (`loadLiveNetwork`), instancie MapLibre en lazy-import, trace les lignes (GeoJSON) et gère les marqueurs bus. Aucune infra temps réel, calcul 100 % client.

**Tech Stack:** Next.js 16 (App Router, `params` Promise), React 19, `maplibre-gl@5.21` (déjà installé), next-intl (22 locales), Tailwind v4 tokens charte. Tests logique pure via `node scripts/check-*.mjs`.

**Spec:** `docs/superpowers/specs/2026-06-15-sp4-live-map-design.md` · **Prédécesseur:** moteur `src/lib/bus-live/` (couche 1, livré + validé sur données réelles).

**Conventions repo (digest Explore, vérifiées) :**
- MapLibre : `"use client"` + `import("maplibre-gl/dist/maplibre-gl.css")` top-level + `await import("maplibre-gl")` dans un `useEffect`. **Pas** de `next/dynamic`. Style `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`, centre `[25.0, 35.25]`, zoom 8.5, minZoom 7, maxZoom 16.
- Page `[locale]` : `params: Promise<{ locale: string }>` → `await params` ; `setRequestLocale(locale)` ; **pas** de `generateStaticParams` dans la page (la layout couvre) ; `export const dynamic = "force-dynamic"` (page live).
- i18n : les composants carte existants (`MapView`/`ExploreView`) utilisent un objet `T: Record<locale, …>` **inline** plutôt que next-intl → on fait pareil (pas de modif des 22 JSON).
- Charte : `bg-aegean #0B5E78`, `bg-terra #ED7A5C`, `bg-sun #FFC83D`, `bg-night #07374A`, `text-text #0B3954` ; `font-data` (Baloo 2 + tabular-nums) pour codes/ETA/compteur ; `animate-live-pulse` (point LIVE), keyframe `cd-pulse` (halo). Réutiliser `LivePill`, `NumberTicker`, `Badge`.
- Vérif visuelle : `next build` local + **push `feat/bus-live-map` → preview Vercel** (les env `NEXT_PUBLIC_SUPABASE_*` sont sur Vercel ; le worktree n'a pas de `.env.local`). Git author `kerjeanfrancois29`, staging explicite, vert avant push.

---

### Task 1: Étendre `LiveBus` avec un `id` de course stable

**Files:** Modify `src/lib/bus-live/types.ts`, `src/lib/bus-live/position.ts`, `scripts/check-bus-live.mjs`.

Raison : la carte réconcilie les marqueurs entre deux recalculs ; il faut une clé stable par course (déjà calculée en interne pour le dédoublonnage : `${lineId}|${direction}|${H}`).

- [ ] **Step 1: Test (rouge).** Dans `scripts/check-bus-live.mjs`, ajouter `id` à l'import `busesAt` n'est pas nécessaire ; ajouter après le bloc `busesFwd` (Task 7 existant) :

```js
// id de course stable (pour la réconciliation d'animation de la carte)
const idBus = busesAt({ iso: "2026-06-15", minutes: 562 }, netFwd)[0];
assert.equal(idBus.id, "7|fwd|09:00");
// stable d'un tick à l'autre (même course, instant différent)
const idBusLater = busesAt({ iso: "2026-06-15", minutes: 565 }, netFwd)[0];
assert.equal(idBusLater.id, "7|fwd|09:00");
```

- [ ] **Step 2: Rouge.** `node scripts/check-bus-live.mjs` → FAIL (`id` undefined).

- [ ] **Step 3: Implémentation.** Dans `src/lib/bus-live/types.ts`, ajouter en tête de l'interface `LiveBus` :

```ts
export interface LiveBus {
  id: string;                // clé de course stable: `${lineId}|${direction}|${H}`
  lineId: number;
```

Dans `src/lib/bus-live/position.ts`, dans `busesAt`, on a déjà `const key = ...` pour le dédoublonnage. Réutiliser cette clé comme `id` dans l'objet émis :

```ts
      out.push({
        id: key,
        lineId: line.id,
```

(la variable `key` vaut déjà `` `${line.id}|${oriented.reversed ? "rev" : "fwd"}|${H}` `` — c'est exactement l'id voulu.)

- [ ] **Step 4: Vert.** `node scripts/check-bus-live.mjs` → OK. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/bus-live/types.ts src/lib/bus-live/position.ts scripts/check-bus-live.mjs
git commit -m "feat(bus-live): id de course stable sur LiveBus (pour anim carte)"
```

---

### Task 2: Couche d'animation pure `animate.ts` (lerp + cap + réconciliation)

**Files:** Create `src/lib/bus-live/animate.ts`, Create `scripts/check-bus-animate.mjs`.

Logique pure, zéro DOM, testable : interpolation de position, interpolation de cap (par le plus court arc), réconciliation des bus entre deux états (entrants / présents / sortants).

- [ ] **Step 1: Test (rouge).** Créer `scripts/check-bus-animate.mjs` :

```js
// Assertions de la couche d'animation. Run: node scripts/check-bus-animate.mjs
import assert from "node:assert/strict";
import { lerp, lerpAngle, reconcile } from "../src/lib/bus-live/animate.ts";

// lerp linéaire
assert.equal(lerp(0, 10, 0), 0);
assert.equal(lerp(0, 10, 1), 10);
assert.equal(lerp(0, 10, 0.5), 5);

// lerpAngle : plus court chemin (350° -> 10° passe par 0°, pas par 180°)
assert.ok(Math.abs(lerpAngle(350, 10, 0.5) - 0) < 1e-9 || Math.abs(lerpAngle(350, 10, 0.5) - 360) < 1e-9);
assert.equal(lerpAngle(0, 90, 0.5), 45);
assert.ok(Math.abs(lerpAngle(10, 350, 0.5) % 360 - 0) < 1e-9);

// reconcile : 1 présent (bouge), 1 entrant, 1 sortant
const prev = new Map([
  ["A", { id: "A", lat: 1, lng: 1, bearing: 0 }],
  ["C", { id: "C", lat: 9, lng: 9, bearing: 0 }],
]);
const next = [
  { id: "A", lat: 2, lng: 2, bearing: 90 },   // present, nouvelle cible
  { id: "B", lat: 5, lng: 5, bearing: 0 },     // entrant
];
const r = reconcile(prev, next);
assert.deepEqual(r.entering.map((b) => b.id), ["B"]);
assert.deepEqual(r.present.map((p) => p.id), ["A"]);
assert.deepEqual(r.leaving, ["C"]);
// la cible de A est bien la nouvelle position
assert.equal(r.present[0].to.lat, 2);
assert.equal(r.present[0].from.lat, 1);

console.log("OK check-bus-animate: toutes les assertions passent");
```

- [ ] **Step 2: Rouge.** `node scripts/check-bus-animate.mjs` → FAIL.

- [ ] **Step 3: Implémentation.** Créer `src/lib/bus-live/animate.ts` :

```ts
// Interpolation et réconciliation pures pour l'animation des marqueurs bus.
// Zéro DOM, zéro I/O. Testé par scripts/check-bus-animate.mjs.
import type { LiveBus } from "./types";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpole un cap (degrés) par le plus court arc. Sortie 0..360. */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = ((b - a) % 360 + 540) % 360 - 180; // diff signée -180..180
  return ((a + d * t) % 360 + 360) % 360;
}

export interface MarkerPose { lat: number; lng: number; bearing: number; }
export interface PresentBus { id: string; from: MarkerPose; to: LiveBus; }

/** Compare l'état courant des marqueurs (par id) aux nouvelles positions. */
export function reconcile(
  prev: Map<string, MarkerPose>,
  next: LiveBus[],
): { entering: LiveBus[]; present: PresentBus[]; leaving: string[] } {
  const nextIds = new Set(next.map((b) => b.id));
  const entering: LiveBus[] = [];
  const present: PresentBus[] = [];
  for (const b of next) {
    const cur = prev.get(b.id);
    if (cur) present.push({ id: b.id, from: cur, to: b });
    else entering.push(b);
  }
  const leaving = [...prev.keys()].filter((id) => !nextIds.has(id));
  return { entering, present, leaving };
}
```

- [ ] **Step 4: Vert.** `node scripts/check-bus-animate.mjs` → OK. `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/bus-live/animate.ts scripts/check-bus-animate.mjs
git commit -m "feat(bus-live): couche animation pure (lerp, lerpAngle, reconcile)"
```

---

### Task 3: Page `/[locale]/live` + squelette client + MapLibre plein écran

**Files:** Create `src/app/[locale]/live/page.tsx`, Create `src/components/live/LiveMapClient.tsx`.

- [ ] **Step 1: Page serveur.** Créer `src/app/[locale]/live/page.tsx` :

```tsx
import { setRequestLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo";
import { LiveMapClient } from "@/components/live/LiveMapClient";

export const dynamic = "force-dynamic"; // page live, pas d'ISR

const META: Record<string, { title: string; desc: string }> = {
  en: { title: "Live Crete buses (estimated)", desc: "Watch Crete's buses move in real time, estimated from the timetable. No GPS." },
  fr: { title: "Bus de Crète en direct (estimé)", desc: "Suivez les bus de Crète en direct, estimés d'après l'horaire. Sans GPS." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] ?? META.en;
  return { title: m.title, description: m.desc, alternates: buildAlternates(locale, "/live") };
}

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LiveMapClient locale={locale} />;
}
```

- [ ] **Step 2: Squelette client (carte vide plein écran).** Créer `src/components/live/LiveMapClient.tsx` :

```tsx
"use client";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

type MaplibreMap = import("maplibre-gl").Map;

export function LiveMapClient({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl").then(({ Map, NavigationControl }) => {
      if (cancelled || !containerRef.current) return;
      const map = new Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.25],
        zoom: 8.5,
        minZoom: 7,
        maxZoom: 16,
      });
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return (
    <div className="relative overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      <div className="absolute inset-0"><div ref={containerRef} className="h-full w-full" /></div>
    </div>
  );
}
```

- [ ] **Step 3: Compilation + build.** `npx tsc --noEmit` → clean. `npx next build` → succeeds (la page `/[locale]/live` apparaît dans la sortie). (Le build n'a pas besoin des env Supabase ; la carte se chargera côté client.)

- [ ] **Step 4: Commit.**
```bash
git add "src/app/[locale]/live/page.tsx" src/components/live/LiveMapClient.tsx
git commit -m "feat(live): page /live + carte MapLibre plein écran (squelette)"
```

---

### Task 4: Charger le réseau + tracer les lignes (GeoJSON)

**Files:** Modify `src/components/live/LiveMapClient.tsx`.

- [ ] **Step 1: Charger le réseau et tracer les lignes.** Étendre `LiveMapClient` : importer `loadLiveNetwork` + types, stocker le réseau en `ref`, et au `map.on("load")` ajouter une source GeoJSON `FeatureCollection` (une `LineString` par ligne, `geometry` est déjà `[lng,lat]`) + un layer `line`. Style : OSM en trait plein `#0B5E78` (aegean), KTEL-fallback (`source==='ktel'`) en pointillé `#5C7886`.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { loadLiveNetwork, type LiveNetwork } from "@/lib/bus-live";

type MaplibreMap = import("maplibre-gl").Map;

function linesGeoJSON(net: LiveNetwork) {
  return {
    type: "FeatureCollection" as const,
    features: [...net.lines.values()].map((l) => ({
      type: "Feature" as const,
      properties: { code: l.code, degraded: l.source === "ktel" || l.partialGeo },
      geometry: { type: "LineString" as const, coordinates: l.geometry },
    })),
  };
}

export function LiveMapClient({ locale }: { locale: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const netRef = useRef<LiveNetwork | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("maplibre-gl"), loadLiveNetwork()]).then(([ml, net]) => {
      if (cancelled || !containerRef.current) return;
      netRef.current = net;
      const map = new ml.Map({
        container: containerRef.current,
        style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
        center: [25.0, 35.25], zoom: 8.5, minZoom: 7, maxZoom: 16,
      });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;
      map.on("load", () => {
        map.addSource("bus-lines", { type: "geojson", data: linesGeoJSON(net) });
        map.addLayer({
          id: "bus-lines-osm", type: "line", source: "bus-lines",
          filter: ["!", ["get", "degraded"]],
          paint: { "line-color": "#0B5E78", "line-width": 3, "line-opacity": 0.55 },
        });
        map.addLayer({
          id: "bus-lines-ktel", type: "line", source: "bus-lines",
          filter: ["get", "degraded"],
          paint: { "line-color": "#5C7886", "line-width": 2, "line-dasharray": [2, 2], "line-opacity": 0.5 },
        });
        setReady(true);
      });
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return (
    <div className="relative overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      <div className="absolute inset-0"><div ref={containerRef} className="h-full w-full" /></div>
    </div>
  );
}
```

- [ ] **Step 2: tsc + build.** `npx tsc --noEmit` clean ; `npx next build` succeeds.

- [ ] **Step 3: Commit.**
```bash
git add src/components/live/LiveMapClient.tsx
git commit -m "feat(live): chargement réseau + tracés lignes (OSM plein / KTEL pointillé)"
```

---

### Task 5: Marqueurs bus + boucle d'animation (tick 2 s + RAF)

**Files:** Modify `src/components/live/LiveMapClient.tsx`, Create `src/components/live/busMarker.ts`.

- [ ] **Step 1: Élément de marqueur.** Créer `src/components/live/busMarker.ts` (fabrique d'un élément DOM : flèche orientée + halo `cd-pulse`, couleur par dégradé) :

```ts
import type { LiveBus } from "@/lib/bus-live";

/** Crée l'élément DOM d'un marqueur bus (flèche + halo). */
export function createBusEl(bus: LiveBus): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:26px;height:26px;will-change:transform";
  const color = bus.degraded ? "#5C7886" : "#0B5E78";
  el.innerHTML =
    `<span style="position:absolute;inset:-8px;border-radius:50%;background:rgba(11,94,120,.16);animation:cd-pulse 2s ease-out infinite"></span>` +
    `<span class="bus-arrow" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;` +
    `width:26px;height:26px;border-radius:50%;background:${color};color:#fff;font:700 11px/1 var(--font-heading),sans-serif;` +
    `box-shadow:0 1px 4px rgba(0,0,0,.3);transform:rotate(${bus.bearing}deg)">▲</span>`;
  el.title = `${bus.codeOfficial ?? bus.code} → ${bus.headsign}`;
  return el;
}

/** Met à jour l'orientation de la flèche d'un élément existant. */
export function setBusArrow(el: HTMLElement, bearingDeg: number): void {
  const arrow = el.querySelector(".bus-arrow") as HTMLElement | null;
  if (arrow) arrow.style.transform = `rotate(${bearingDeg}deg)`;
}
```

- [ ] **Step 2: Boucle d'animation dans LiveMapClient.** Après `setReady(true)`, démarrer : un `setInterval(2000)` qui recalcule `busesAt(athensNow(), net)` → met à jour `targetsRef` (Map id→pose) + `setCount(buses.length)` ; un `requestAnimationFrame` continu qui, pour chaque marqueur présent, `lerp` sa position courante vers la cible (≈2 s) et `setLngLat` + `setBusArrow`. Créer/retirer les `Marker` MapLibre selon `reconcile`. Recalcul complet sur `visibilitychange` (retour de focus). Imports ajoutés : `busesAt`, `athensNow` (`@/lib/athens-time`... attention : valeur → import via `@/lib/bus-live`/`@/lib/athens-time` ; ce composant est compilé par Next, l'alias `@/` est OK ici, ce n'est pas le check node), `reconcile`, `lerp`, `lerpAngle`, `createBusEl`, `setBusArrow`.

```tsx
// (en tête, ajouter aux imports)
import { busesAt, reconcile, lerp, lerpAngle, type LiveBus } from "@/lib/bus-live";
import { athensNow } from "@/lib/athens-time";
import { createBusEl, setBusArrow } from "./busMarker";
type MaplibreMarker = import("maplibre-gl").Marker;

// refs (dans le composant)
const markersRef = useRef(new Map<string, { marker: MaplibreMarker; el: HTMLDivElement; cur: { lat: number; lng: number; bearing: number } }>());
const targetsRef = useRef(new Map<string, LiveBus>());
const [count, setCount] = useState(0);

// après setReady(true) dans map.on("load"):
const tick = () => {
  const net2 = netRef.current; if (!net2) return;
  const buses = busesAt(athensNow(), net2);
  setCount(buses.length);
  const poses = new Map([...markersRef.current].map(([id, m]) => [id, m.cur]));
  const { entering, leaving } = reconcile(poses, buses);
  for (const b of entering) {
    const el = createBusEl(b);
    const marker = new ml.Marker({ element: el }).setLngLat([b.lng, b.lat]).addTo(map);
    markersRef.current.set(b.id, { marker, el, cur: { lat: b.lat, lng: b.lng, bearing: b.bearing } });
  }
  for (const id of leaving) { markersRef.current.get(id)?.marker.remove(); markersRef.current.delete(id); }
  targetsRef.current = new Map(buses.map((b) => [b.id, b]));
};
tick();
const iv = setInterval(tick, 2000);
let raf = 0;
const animate = () => {
  for (const [id, m] of markersRef.current) {
    const t = targetsRef.current.get(id); if (!t) continue;
    m.cur.lat = lerp(m.cur.lat, t.lat, 0.08);
    m.cur.lng = lerp(m.cur.lng, t.lng, 0.08);
    m.cur.bearing = lerpAngle(m.cur.bearing, t.bearing, 0.12);
    m.marker.setLngLat([m.cur.lng, m.cur.lat]);
    setBusArrow(m.el, m.cur.bearing);
  }
  raf = requestAnimationFrame(animate);
};
raf = requestAnimationFrame(animate);
const onVis = () => { if (document.visibilityState === "visible") tick(); };
document.addEventListener("visibilitychange", onVis);
// stocker iv/raf/onVis pour cleanup (les remonter dans un ref dédié à nettoyer au unmount)
```

(Au `cleanup` du `useEffect` : `clearInterval(iv)`, `cancelAnimationFrame(raf)`, `document.removeEventListener("visibilitychange", onVis)`, retirer tous les marqueurs.)

- [ ] **Step 3: tsc + build.** `npx tsc --noEmit` clean ; `npx next build` succeeds.

- [ ] **Step 4: Commit.**
```bash
git add src/components/live/LiveMapClient.tsx src/components/live/busMarker.ts
git commit -m "feat(live): marqueurs bus animés (tick 2s busesAt + RAF interpolation)"
```

---

### Task 6: Overlay — badge « estimé », compteur, légende

**Files:** Modify `src/components/live/LiveMapClient.tsx`.

- [ ] **Step 1: Ajouter l'overlay flottant.** Au-dessus de la carte (dans le `div.relative`, après le conteneur carte), ajouter : une `LivePill` ou un badge « Estimé selon l'horaire » (charte `bg-sun`/`bg-aegean`), un compteur `NumberTicker` « N bus en circulation » (`font-data`), une mini-légende (trait plein = ligne OSM, pointillé = tracé approximatif KTEL). Textes via l'objet `T` inline (en/fr au minimum, fallback en).

```tsx
import { NumberTicker } from "@/components/ui/number-ticker";

const T: Record<string, { estimated: string; circulating: string; osm: string; ktel: string }> = {
  en: { estimated: "Estimated from the timetable", circulating: "buses running", osm: "mapped line", ktel: "approximate route" },
  fr: { estimated: "Estimé selon l'horaire", circulating: "bus en circulation", osm: "ligne tracée", ktel: "tracé approximatif" },
};
const t = T[locale] ?? T.en;

// dans le rendu, à l'intérieur du div.relative :
<div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
  <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-night/90 px-3 py-1.5 text-xs font-medium text-sand backdrop-blur">
    <span className="h-1.5 w-1.5 rounded-full bg-sun animate-live-pulse" />
    {t.estimated}
  </span>
  <span className="pointer-events-auto inline-flex items-baseline gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-sm text-text shadow backdrop-blur">
    <NumberTicker value={count} className="font-data font-bold text-aegean" /> {t.circulating}
  </span>
</div>
<div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1 rounded-lg bg-surface/90 px-3 py-2 text-[11px] text-text-muted shadow backdrop-blur">
  <span className="flex items-center gap-2"><span className="inline-block h-0.5 w-5 bg-aegean" /> {t.osm}</span>
  <span className="flex items-center gap-2"><span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-text-muted" /> {t.ktel}</span>
</div>
```

- [ ] **Step 2: tsc + build.** `npx tsc --noEmit` clean ; `npx next build` succeeds.

- [ ] **Step 3: Commit.**
```bash
git add src/components/live/LiveMapClient.tsx
git commit -m "feat(live): overlay badge estimé + compteur + légende (charte)"
```

---

### Task 7: Lien de navigation + vérification visuelle (preview Vercel)

**Files:** Modify the nav/header component (find where `/buses` is linked), then push for preview.

- [ ] **Step 1: Ajouter le lien `/live`** dans le header/nav à côté de `/buses` (chercher `href={...buses}` dans `src/components/`), libellé « Live » (réutiliser le pattern d'item de nav existant). Garder discret (le funnel Kairos n'est pas concerné ici).

- [ ] **Step 2: Vert local.** `npx tsc --noEmit` clean ; `npx next build` succeeds.

- [ ] **Step 3: Commit + push preview.**
```bash
git add <nav-file>
git commit -m "feat(live): lien nav vers /live"
git push origin feat/bus-live-map
```

- [ ] **Step 4: Vérification visuelle (owner Kami + Claude).** Ouvrir l'URL preview Vercel `/fr/live` et `/en/live`. Vérifier : la carte se charge, les tracés OSM (plein) + KTEL (pointillé) s'affichent, des marqueurs bus avancent et tournent, le compteur bouge, le badge « estimé » est visible. Capturer un screenshot. (Le dev local échouerait sans `.env.local` anon ; la preview Vercel a les env.)

---

## Self-Review Checklist (après implémentation)

1. **Couverture spec** : page `/live` (Task 3), carte MapLibre + tracés (Task 4), moteur d'estimation **importé** (Task 1+5, pas réécrit), couche bus animée RAF (Task 5), badge « estimé » + compteur + légende (Task 6), `visibilitychange` (Task 5). KTEL-fallback affiché marqué (Task 4 pointillé + Task 5 couleur dégradée). ✅
2. **Pas de placeholder** : composants complets fournis.
3. **Cohérence** : `LiveBus.id` (Task 1) consommé par `reconcile` (Task 2) et la boucle (Task 5) ; `busesAt`/`loadLiveNetwork`/`reconcile`/`lerp` importés de `@/lib/bus-live` (barrel — ajouter `reconcile`/`lerp`/`lerpAngle` à `index.ts` en Task 2).
4. **Toolchain** : la carte (compilée par Next) peut utiliser l'alias `@/` (≠ le check node du moteur). `position.ts` reste en imports relatifs `.ts`.
5. **Pas d'infra temps réel** : tout client, zéro endpoint, zéro WebSocket. ✅

## Note d'intégration importante

Mettre à jour le **barrel** `src/lib/bus-live/index.ts` en Task 2 pour ré-exporter `reconcile`, `lerp`, `lerpAngle`, `type MarkerPose`, `type PresentBus` depuis `./animate`, afin que la carte importe tout depuis `@/lib/bus-live`.

## Hors-scope (futur, cf spec)

GPS réel, app native, style « EN DIRECT », IA d'affinage des retards, notifications, i18n complet des libellés carte au-delà de en/fr (objet `T` extensible).
