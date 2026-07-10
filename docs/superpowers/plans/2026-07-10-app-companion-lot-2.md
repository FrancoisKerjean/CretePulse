# App compagnon — Lot 2 « shell Maintenant » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** /explore devient l'écran d'accueil du compagnon : panneau « Maintenant près de toi » (meilleure plage temps réel + prochain bus live) quand la géoloc est active, et tab bar mobile Carte/Bus/Plages/Devis sur les surfaces outils.

**Architecture:** Réutilisation maximale (cartographie 10/07) : `useGeoPosition()` + `nearestBy()` (lib/geo.ts) + `/api/swim-now` + `/api/buses/citybus-live/[stop]` existent. On ajoute : (1) une lib pure `nearest-stop` + endpoint `/api/buses/nearest-stop` (l'arrêt le plus proche AVEC api_code, absent du stopGraph client), (2) un composant client `NowPanel` inséré en tête du carrousel mobile d'ExploreView quand nearActive, (3) une `MobileTabBar` globale (layout) visible mobile sur les pages outils. Le carrousel existant reste.

**Tech Stack:** Next.js App Router, MapLibre (inchangé), PostgREST bus_stops, pattern i18n inline `const T` (ExploreView) + messages/*.json (tab bar), Plausible events.

**Spec de référence:** `docs/superpowers/specs/2026-07-10-app-companion-design.md` (écran 1 validé en mockup).

**Faits vérifiés (cartographie, ne pas re-déduire):**
- ExploreView.tsx = 1649 lignes ; carrousel mobile lignes ~1350-1404 ; bouton Near me ~1332-1341 ; hook `useGeoPosition()` avec persistance sessionStorage ; i18n inline `const T` (en/fr/de/el).
- `/api/swim-now?locale=` → `{wind, regions:[{region, beaches:[{slug,name,score,rating,...}]}]}`, cache 30 min. Les beaches n'ont PAS de coords → jointure par slug avec les items plages d'ExploreView (qui ont lat/lng).
- `/api/buses/citybus-live/[apiCode]?city=her|cha&lang=en` → `{arrivals:[{lineCode,lineName,etaMin,color,...}]}`, cache 10 s, arrêt sans passage = `{arrivals:[]}`.
- `bus_stops` (PostgREST) : lat/lng + `api_code` + prefecture ; sources citybus (HER/CHA), agncitybus (AgNik), KTEL/OSM. `api_code` seulement pour les urbains HER/CHA.
- Pas de tab bar mobile existante ; InstallBanner (lot 1) est en `fixed bottom-3` → collision à gérer.

---

### Task 1: Lib pure + endpoint « arrêt le plus proche avec live »

**Files:**
- Create: `src/lib/nearest-stop.ts`
- Create: `scripts/check-nearest-stop.mjs`
- Create: `src/app/api/buses/nearest-stop/route.ts`
- Modify: `package.json` (check:nearest-stop + chaîne check)

- [ ] **Step 1: check qui échoue** — `scripts/check-nearest-stop.mjs` :

```js
// scripts/check-nearest-stop.mjs : tests purs du choix d'arrêt (lot 2 app compagnon).
import assert from "node:assert/strict";
import { pickNearestStop, liveCityFor } from "../src/lib/nearest-stop.ts";

const stops = [
  { slug: "hkl-a", name: "Plateia", lat: 35.339, lng: 25.133, api_code: "0122", source: "citybus", prefecture: "Heraklion" },
  { slug: "cha-b", name: "Agora", lat: 35.516, lng: 24.018, api_code: "74003", source: "citybus", prefecture: "Chania" },
  { slug: "ktel-c", name: "Ierapetra KTEL", lat: 35.011, lng: 25.741, api_code: null, source: "ktel", prefecture: "Lasithi" },
];
let n = 0;
function ok(name, fn) { fn(); n++; console.log(`  ok ${name}`); }

ok("liveCityFor citybus Heraklion = her", () => {
  assert.equal(liveCityFor(stops[0]), "her");
});
ok("liveCityFor citybus Chania = cha", () => {
  assert.equal(liveCityFor(stops[1]), "cha");
});
ok("liveCityFor ktel = null (pas de live)", () => {
  assert.equal(liveCityFor(stops[2]), null);
});
ok("arrêt le plus proche à Heraklion centre", () => {
  const r = pickNearestStop(stops, 35.34, 25.13);
  assert.equal(r.slug, "hkl-a");
  assert.ok(r.km < 1);
  assert.equal(r.liveCity, "her");
});
ok("arrêt le plus proche à Ierapetra = KTEL sans live", () => {
  const r = pickNearestStop(stops, 35.01, 25.74);
  assert.equal(r.slug, "ktel-c");
  assert.equal(r.liveCity, null);
});
ok("null si aucun arrêt à moins de maxKm", () => {
  assert.equal(pickNearestStop(stops, 34.0, 24.0, 5), null);
});
console.log(`✅ check:nearest-stop : ${n} tests OK`);
```

- [ ] **Step 2: run, vérifier l'échec** — `node --experimental-strip-types scripts/check-nearest-stop.mjs` → FAIL module absent.

- [ ] **Step 3: implémenter `src/lib/nearest-stop.ts`**

```ts
// src/lib/nearest-stop.ts : choix pur de l'arrêt de bus le plus proche (lot 2).
export type StopRow = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  api_code: string | null;
  source: string | null;
  prefecture: string | null;
};

export type NearestStop = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  km: number;
  apiCode: string | null;
  liveCity: "her" | "cha" | null;
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Le live citybus n'existe que pour les réseaux urbains HER/CHA (api_code + source citybus).
export function liveCityFor(stop: StopRow): "her" | "cha" | null {
  if (!stop.api_code || stop.source !== "citybus") return null;
  if (stop.prefecture === "Heraklion") return "her";
  if (stop.prefecture === "Chania") return "cha";
  return null;
}

export function pickNearestStop(
  stops: StopRow[],
  lat: number,
  lng: number,
  maxKm = 3,
): NearestStop | null {
  let best: NearestStop | null = null;
  for (const s of stops) {
    if (typeof s.lat !== "number" || typeof s.lng !== "number") continue;
    const km = haversineKm(lat, lng, s.lat, s.lng);
    if (km > maxKm) continue;
    if (!best || km < best.km) {
      best = { slug: s.slug, name: s.name, lat: s.lat, lng: s.lng, km, apiCode: s.api_code, liveCity: liveCityFor(s) };
    }
  }
  return best;
}
```

NB : si `lib/geo.ts` exporte déjà `haversineKm` avec la même signature, l'importer au lieu de le redéclarer (vérifier au moment du code : `src/lib/geo.ts`).

- [ ] **Step 4: run, vérifier 6 tests OK**, câbler `"check:nearest-stop"` dans package.json + début de la chaîne `check` (après check:retention).

- [ ] **Step 5: endpoint** — `src/app/api/buses/nearest-stop/route.ts` :

```ts
// /api/buses/nearest-stop?lat=..&lng=.. : l'arrêt le plus proche (≤3 km) avec
// info live éventuelle. Cache CDN 1 h (les arrêts ne bougent pas).
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pickNearestStop, type StopRow } from "@/lib/nearest-stop";

export const revalidate = 0;

let cachedStops: { at: number; rows: StopRow[] } | null = null;

async function loadStops(): Promise<StopRow[]> {
  if (cachedStops && Date.now() - cachedStops.at < 60 * 60 * 1000) return cachedStops.rows;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await supabase
    .from("bus_stops")
    .select("slug,name,lat,lng,api_code,source,prefecture");
  if (error || !data) return cachedStops?.rows ?? [];
  cachedStops = { at: Date.now(), rows: data as StopRow[] };
  return cachedStops.rows;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 34 || lat > 36 || lng < 23 || lng > 27) {
    return NextResponse.json({ stop: null }, { status: 422 });
  }
  const stops = await loadStops();
  const stop = pickNearestStop(stops, lat, lng);
  return NextResponse.json(
    { stop },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
```

NB : suivre le pattern d'accès Supabase RÉEL du repo (si un helper client existe, ex. `src/lib/supabase.ts`, l'utiliser au lieu de createClient direct — vérifier avant de coder).

- [ ] **Step 6: vérifier + commit**

`npx tsc --noEmit` puis test manuel local : `curl "localhost:3123/api/buses/nearest-stop?lat=35.34&lng=25.13"` → arrêt HER avec liveCity her.

```bash
git add src/lib/nearest-stop.ts scripts/check-nearest-stop.mjs src/app/api/buses/nearest-stop/route.ts package.json
git commit -m "feat(app): lib+endpoint nearest-stop avec info live (lot 2)"
```

---

### Task 2: Composant `NowPanel` (client)

**Files:**
- Create: `src/components/explore/NowPanel.tsx`

Comportement : reçoit `pos {lat,lng}`, `locale`, et `beachCoords` (map slug → {lat,lng,name} construite par ExploreView depuis ses items plages). Au mount : fetch parallèle `/api/swim-now?locale=` + `/api/buses/nearest-stop?lat&lng` ; si l'arrêt a `liveCity` : fetch `/api/buses/citybus-live/[apiCode]?city=&lang=` (poll 30 s, pause si tab cachée). Rend 2 cartes compactes (même gabarit visuel que les cartes du carrousel) :
- **Plage maintenant** : parmi les beaches de swim-now jointes par slug à beachCoords, score pondéré distance `score - min(40, km*0.8)` (pattern NearMeClient), lien `/beaches/[slug]`, badge rating + « X km ».
- **Prochain bus** : nom arrêt + km ; si live : 1re arrivée (lineCode coloré + etaMin + point vert) ; sinon lien planner `/buses`. Events Plausible : `now_panel_shown` (props: hasLiveBus true/false), clics `now_panel_click` (props: target beach|bus).

i18n : inline `const T` en/fr/de/el (pattern ExploreView), fallback en. Clés : `nowTitle` (« Maintenant près de toi »), `beachNow`, `nextBus`, `inMin`, `planJourney`, `km`.

- [ ] **Step 1: écrire le composant** (~180 lignes, gabarit ci-dessous ; coller au style des cartes du carrousel ExploreView existant, vérifier les classes exactes au moment du code) :

```tsx
// src/components/explore/NowPanel.tsx : panneau « Maintenant près de toi » (lot 2).
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Pos = { lat: number; lng: number };
type BeachCoord = { lat: number; lng: number; name: string };
type SwimBeach = { slug: string; name: string; score: number; rating: string };
type NearestStop = { slug: string; name: string; km: number; apiCode: string | null; liveCity: "her" | "cha" | null };
type Arrival = { lineCode: string; lineName: string; etaMin: number; color: string };

const T: Record<string, Record<string, string>> = {
  en: { nowTitle: "Right now, near you", beachNow: "Best beach now", nextBus: "Next bus", inMin: "min", planJourney: "Plan a journey", km: "km" },
  fr: { nowTitle: "Maintenant, près de toi", beachNow: "Meilleure plage là", nextBus: "Prochain bus", inMin: "min", planJourney: "Planifier un trajet", km: "km" },
  de: { nowTitle: "Jetzt, in deiner Nähe", beachNow: "Bester Strand jetzt", nextBus: "Nächster Bus", inMin: "Min", planJourney: "Route planen", km: "km" },
  el: { nowTitle: "Τώρα, κοντά σου", beachNow: "Καλύτερη παραλία τώρα", nextBus: "Επόμενο λεωφορείο", inMin: "λεπ", planJourney: "Σχεδίασε διαδρομή", km: "χλμ" },
};

function haversineKm(a: Pos, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function NowPanel({ pos, locale, beachCoords }: { pos: Pos; locale: string; beachCoords: Record<string, BeachCoord> }) {
  const t = T[locale] || T.en;
  const [beach, setBeach] = useState<(SwimBeach & { km: number }) | null>(null);
  const [stop, setStop] = useState<NearestStop | null>(null);
  const [arrival, setArrival] = useState<Arrival | null>(null);
  const shownSent = useRef(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const [swimRes, stopRes] = await Promise.allSettled([
        fetch(`/api/swim-now?locale=${locale}`).then((r) => r.json()),
        fetch(`/api/buses/nearest-stop?lat=${pos.lat}&lng=${pos.lng}`).then((r) => r.json()),
      ]);
      if (dead) return;
      if (swimRes.status === "fulfilled") {
        const all: (SwimBeach & { km: number })[] = [];
        for (const region of swimRes.value.regions ?? []) {
          for (const b of region.beaches ?? []) {
            const c = beachCoords[b.slug];
            if (c) all.push({ ...b, km: haversineKm(pos, c) });
          }
        }
        all.sort((x, y) => (y.score - Math.min(40, y.km * 0.8)) - (x.score - Math.min(40, x.km * 0.8)));
        setBeach(all[0] ?? null);
      }
      if (stopRes.status === "fulfilled") setStop(stopRes.value.stop ?? null);
    })();
    return () => { dead = true; };
  }, [pos.lat, pos.lng, locale, beachCoords, pos]);

  // Live bus : poll 30s, pause si onglet caché.
  useEffect(() => {
    if (!stop?.apiCode || !stop.liveCity) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;
    async function tick() {
      if (dead) return;
      if (!document.hidden) {
        try {
          const r = await fetch(`/api/buses/citybus-live/${stop!.apiCode}?city=${stop!.liveCity}&lang=${locale === "el" ? "el" : "en"}`);
          const j = await r.json();
          if (!dead) setArrival((j.arrivals ?? [])[0] ?? null);
        } catch { /* silencieux */ }
      }
      timer = setTimeout(tick, 30_000);
    }
    tick();
    return () => { dead = true; if (timer) clearTimeout(timer); };
  }, [stop, locale]);

  useEffect(() => {
    if (!shownSent.current && (beach || stop)) {
      shownSent.current = true;
      window.plausible?.("now_panel_shown", { props: { hasLiveBus: String(Boolean(arrival)) } });
    }
  }, [beach, stop, arrival]);

  if (!beach && !stop) return null;
  return (
    <div className="rounded-2xl border-2 border-border bg-white p-3 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
      <p className="m-0 mb-2 font-heading text-sm font-bold text-ink">{t.nowTitle}</p>
      {beach && (
        <Link
          href={`/${locale}/beaches/${beach.slug}`}
          onClick={() => window.plausible?.("now_panel_click", { props: { target: "beach" } })}
          className="flex items-center gap-2 rounded-xl border border-border p-2 no-underline"
        >
          <span aria-hidden>🏖️</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate font-heading text-[13px] text-ink">{beach.name}</b>
            <span className="text-[11px] text-text-muted">{t.beachNow} · {beach.km.toFixed(1)} {t.km}</span>
          </span>
          <span className="rounded-full bg-sea-faint px-2 py-0.5 font-heading text-[11px] font-bold text-sea">{beach.score}</span>
        </Link>
      )}
      {stop && (
        <Link
          href={`/${locale}/buses`}
          onClick={() => window.plausible?.("now_panel_click", { props: { target: "bus" } })}
          className="mt-2 flex items-center gap-2 rounded-xl border border-border p-2 no-underline"
        >
          <span aria-hidden>🚌</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate font-heading text-[13px] text-ink">{stop.name}</b>
            <span className="text-[11px] text-text-muted">{stop.km.toFixed(1)} {t.km} · {arrival ? `${t.nextBus}` : t.planJourney}</span>
          </span>
          {arrival && (
            <span className="inline-flex items-center gap-1 font-heading text-[13px] font-bold" style={{ color: "#0E8A50" }}>
              <span className="rounded px-1.5 py-0.5 text-white" style={{ backgroundColor: arrival.color || "#1D9BF0" }}>{arrival.lineCode}</span>
              {arrival.etaMin} {t.inMin}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: tsc** — `npx tsc --noEmit` → 0 erreur. Commit :

```bash
git add src/components/explore/NowPanel.tsx
git commit -m "feat(app): composant NowPanel plage+bus temps reel (lot 2)"
```

---

### Task 3: Intégration ExploreView

**Files:**
- Modify: `src/components/explore/ExploreView.tsx`

- [ ] **Step 1:** construire `beachCoords` (memo) depuis les items plages d'ExploreView (slug → {lat,lng,name} ; repérer la structure exacte des items au moment du code, elles portent lat/lng pour les markers).
- [ ] **Step 2:** insérer `<NowPanel pos={geo.pos} locale={locale} beachCoords={beachCoords} />` en TÊTE du carrousel mobile (lignes ~1350-1404), rendu uniquement quand `nearActive && geo.pos` (mêmes conditions que le disque « autour de moi »). Le carrousel existant reste intact derrière.
- [ ] **Step 3:** vérification visuelle locale : `npm run dev` (ou `next start` après build), page /fr/explore en émulation mobile, activer « Autour de moi » (position simulée Heraklion 35.34, 25.13 via CDP `setGeolocationOverride`) → panneau visible avec plage + arrêt.
- [ ] **Step 4:** `npx tsc --noEmit` + commit :

```bash
git add src/components/explore/ExploreView.tsx
git commit -m "feat(app): NowPanel integre au carrousel mobile /explore (lot 2)"
```

---

### Task 4: Tab bar mobile globale

**Files:**
- Create: `src/components/MobileTabBar.tsx`
- Modify: `src/app/[locale]/layout.tsx` (montage), `src/components/InstallBanner.tsx` (remonter la bannière au-dessus de la tab bar)
- Modify: `src/messages/*.json` (namespace `tabBar`, 22 locales, script one-shot comme lot 1)

- [ ] **Step 1: i18n one-shot** — script `scripts/oneshot-tabbar-i18n.mjs` (même gabarit que lot 1) : namespace `tabBar` = `{ map, buses, beaches, quote }`. Traductions : en `{Map, Buses, Beaches, Car quote}`, fr `{Carte, Bus, Plages, Devis}`, de `{Karte, Busse, Strände, Angebot}`, el `{Χάρτης, Λεωφορεία, Παραλίες, Προσφορά}`, + 18 locales (générer sur le même modèle : mots courants, PAS de fallback anglais paresseux pour it/es/pt/nl/pl au minimum). Exécuter, `npm run check:i18n` (153 clés), supprimer le script, committer.

- [ ] **Step 2: composant**

```tsx
// src/components/MobileTabBar.tsx : navigation basse mobile des surfaces outils (lot 2).
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

const TOOL_PAGES = /\/(buses|explore|live|beaches|car-rental)(\/|$)/;

const TABS = [
  { key: "map", href: "/explore", icon: "🗺️", match: /\/(explore|live)(\/|$)/ },
  { key: "buses", href: "/buses", icon: "🚌", match: /\/buses(\/|$)/ },
  { key: "beaches", href: "/beaches", icon: "🏖️", match: /\/beaches(\/|$)/ },
  { key: "quote", href: "/car-rental", icon: "🚗", match: /\/car-rental(\/|$)/ },
] as const;

export function MobileTabBar() {
  const t = useTranslations("tabBar");
  const locale = useLocale();
  const pathname = usePathname() ?? "";
  if (!TOOL_PAGES.test(pathname)) return null;
  return (
    <nav
      aria-label="quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match.test(pathname);
        return (
          <Link
            key={tab.key}
            href={`/${locale}${tab.href}`}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 font-heading text-[10.5px] font-bold no-underline ${active ? "text-lagoon-deep" : "text-text-muted"}`}
          >
            <span className="text-lg" aria-hidden>{tab.icon}</span>
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: montage layout** après `<SwRegister />` (dans NextIntlClientProvider ? NON : SwRegister est hors provider — vérifier : MobileTabBar utilise useTranslations donc DANS le provider, après `<ActivityNudge />`).
- [ ] **Step 4: collision InstallBanner** : dans `InstallBanner.tsx`, remplacer `bottom-3` par `bottom-16` (au-dessus de la tab bar sur les pages outils — la bannière n'apparaît QUE sur ces pages, la tab bar y est toujours).
- [ ] **Step 5: padding contenu** : les pages outils mobiles gagnent un `pb-14 md:pb-0`... risque d'oubli global : préférer dans le composant nav un simple overlay fixed (contenu scrollable derrière, MapLibre /explore a ses contrôles bas à vérifier visuellement). Vérification visuelle : /explore (contrôles carte + carrousel au-dessus de la tab bar ?), /buses (footer accessible ?). Ajuster au cas par cas ce qui est masqué (ex : remonter le carrousel explore avec `bottom-16`).
- [ ] **Step 6: e2e + captures** : étendre le script Playwright émulation (tab bar visible sur /buses et /explore mobile, absente desktop et sur la home, lien actif surligné, InstallBanner au-dessus de la tab bar) + 2 captures pour Kami.
- [ ] **Step 7: tsc + check:i18n + commit**

```bash
git add src/components/MobileTabBar.tsx src/components/InstallBanner.tsx "src/app/[locale]/layout.tsx" src/messages/
git commit -m "feat(app): tab bar mobile Carte/Bus/Plages/Devis sur surfaces outils (lot 2)"
```

---

### Task 5: Vert global, captures, preview, prod

- [ ] **Step 1:** `npm run check && npm run build` (worktree cp-app-companion). check:da : 0 violation venant des fichiers du chantier.
- [ ] **Step 2:** e2e complet (retention + bannière + offline + NowPanel + tab bar) → 100% OK.
- [ ] **Step 3:** captures émulation iPhone (explore avec NowPanel actif, tab bar sur /buses) → planche → montrer à Kami (mockup avant deploy).
- [ ] **Step 4:** push branche (preview) ; prod sur GO Kami des captures : `git push origin feat/app-companion:main feat/app-companion:master` (après merge origin/master du moment).
- [ ] **Step 5:** mémoire : fiche projet + session_log + MEMORY.md index sync.
