# Position exacte sur l'Explorer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur `/explore`, quand on clique « Autour de moi », poser un marqueur « Vous êtes ici » déplaçable (GPS puis drag), avec un disque de rayon ~10 km, pour voir facilement ce qu'on a à côté — y compris quand le GPS est imprécis, refusé, ou hors de Crète.

**Architecture:** On réutilise toute l'infra géo existante (`useGeoPosition`, `nearestBy`, `isOnCrete`). On ajoute `setPosition(lat,lon)` au hook (statut `"manual"` réutilisé, aucun changement de type). Dans `ExploreView`, un marqueur maplibre draggable (lifecycle séparé de la position), un disque GeoJSON sous les pins, et un effet qui réagit à la résolution GPS via une ref `prevGeoStatus` — **pattern déjà présent dans `MatchDeck.tsx`** (`onCrete`/`geoMode`/`prevGeoStatus`). Le tri par distance et les badges « km » sont déjà câblés sur `geo.pos`, on ne les touche pas.

**Tech Stack:** Next.js (App Router), React 19, maplibre-gl (déjà présent), Tailwind v4 (tokens `@theme` dans `globals.css`), lucide-react / `@/components/icons` (`CiCompass`).

**Note vérification (pas de framework de test) :** le repo n'a aucun harnais de test. On suit le pattern du repo : `npx tsc --noEmit`, `npm run lint`, `npm run build`, + contrôle visuel Playwright. La seule logique « risquée » (génération du polygone du disque) est extraite en fonction pure dans `src/lib/geo.ts` et vérifiée par un one-liner Node.

**Convention repo (NON NÉGOCIABLE) :** branche `feat/explore-exact-location` (worktree dédié déjà créé). **Jamais `git add -A` / `git add .`** — staging explicite des fichiers listés. Git author `kerjeanfrancois29`.

---

## File Structure

- **Modify** `src/components/geo/useGeoPosition.ts` — ajout `setPosition(lat, lon)` (statut `"manual"`, persistance `cd-geo`), exposé dans le retour. Aucun autre changement.
- **Modify** `src/lib/geo.ts` — ajout d'une fonction pure `circlePolygon(center, radiusKm, segments?)` retournant un anneau fermé `[lon, lat][]` pour le disque GeoJSON.
- **Modify** `src/components/explore/ExploreView.tsx` — i18n (3 clés × 4 langues), couches GeoJSON du disque, marqueur draggable, effet de réaction GPS (sur Crète / hors Crète / refusé), indice flottant, bouton non grisé en mode manuel.

Aucun nouveau fichier, aucune nouvelle dépendance.

---

## Task 1: Hook — `setPosition(lat, lon)` dans `useGeoPosition`

**Files:**
- Modify: `src/components/geo/useGeoPosition.ts`

- [ ] **Step 1: Ajouter `setPosition` et l'exposer**

Dans `src/components/geo/useGeoPosition.ts`, ajouter le callback juste **après** `setManual` (avant le `return`), puis l'ajouter à l'objet retourné. Statut `"manual"` réutilisé (un point posé/glissé est une position manuelle) — **ne pas** toucher au type `GeoStatus`.

```ts
  // Position à coordonnées libres (point posé/glissé sur la carte Explorer).
  // Réutilise le statut "manual" : pas de nouvelle valeur dans GeoStatus, donc
  // aucun impact sur les 6 autres consommateurs du hook.
  const setPosition = useCallback((lat: number, lon: number) => {
    const p = { lat, lon };
    setPos(p); setStatus("manual"); save(p, "manual");
  }, []);

  return { status, pos, requestGeo, setManual, setPosition };
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur. (Les autres consommateurs déstructurent un sous-ensemble du retour ; ajouter une clé ne casse rien.)

- [ ] **Step 3: Commit**

```bash
git add src/components/geo/useGeoPosition.ts
git commit -m "feat(geo): setPosition(lat,lon) sur useGeoPosition (coords libres, statut manual)"
```

---

## Task 2: Helper pur — `circlePolygon` dans `geo.ts`

**Files:**
- Modify: `src/lib/geo.ts`

- [ ] **Step 1: Ajouter la fonction pure**

À la fin de `src/lib/geo.ts` (après `isOnCrete`), ajouter :

```ts
/**
 * Anneau fermé approximant un cercle géographique de `radiusKm` autour de `center`,
 * sous forme de coordonnées [lon, lat] (ordre GeoJSON). Premier point = dernier point.
 * Approximation équirectangulaire (suffisante à l'échelle ~10 km en Crète).
 * Usage : géométrie d'un Polygon GeoJSON pour le disque "autour de moi".
 */
export function circlePolygon(
  center: GeoPos,
  radiusKm: number,
  segments = 64,
): Array<[number, number]> {
  const dLat = radiusKm / 111.32;
  const dLon = radiusKm / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  const ring: Array<[number, number]> = [];
  for (let i = 0; i < segments; i++) {
    const theta = (2 * Math.PI * i) / segments;
    ring.push([center.lon + dLon * Math.cos(theta), center.lat + dLat * Math.sin(theta)]);
  }
  ring.push(ring[0]); // fermer l'anneau
  return ring;
}
```

- [ ] **Step 2: Vérifier la logique (one-liner Node)**

Run:
```bash
node --input-type=module -e "import('./src/lib/geo.ts').catch(()=>{}); const dLat=10/111.32; const dLon=10/(111.32*Math.cos(35.2*Math.PI/180)); const c={lat:35.2,lon:25.0}; const p=[c.lon+dLon,c.lat]; const hav=(a,b)=>{const[la1,lo1]=a.map(d=>d*Math.PI/180);const[la2,lo2]=b.map(d=>d*Math.PI/180);const h=Math.sin((la2-la1)/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin((lo2-lo1)/2)**2;return 2*6371*Math.asin(Math.sqrt(h));}; console.log('rayon est-ouest ~', hav([c.lon,c.lat],p).toFixed(2),'km (attendu ~10)')"
```
Expected: `rayon est-ouest ~ 10.0x km (attendu ~10)` (≈ 10, l'approximation équirectangulaire donne ~10 km à cette latitude).

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/lib/geo.ts
git commit -m "feat(geo): circlePolygon(center,radiusKm) pour le disque rayon de l'Explorer"
```

---

## Task 3: i18n — 3 clés dans les tables `T` de `ExploreView`

**Files:**
- Modify: `src/components/explore/ExploreView.tsx`

- [ ] **Step 1: Ajouter les clés aux 4 langues**

Dans `src/components/explore/ExploreView.tsx`, dans la constante `T`, ajouter ces 3 clés à **chaque** bloc de langue (`en`, `fr`, `de`, `el`), à la suite des clés existantes (ex. après `fullList`) :

```ts
// en
youAreHere: "You are here", dragToAdjust: "Drag the dot to your spot",
notOnCrete: "You're not in Crete — drop the dot where you'll be.",
```
```ts
// fr
youAreHere: "Vous êtes ici", dragToAdjust: "Glisse le point sur ta position",
notOnCrete: "Tu n'es pas en Crète, place ton point là où tu seras.",
```
```ts
// de
youAreHere: "Sie sind hier", dragToAdjust: "Punkt auf Ihren Standort ziehen",
notOnCrete: "Sie sind nicht auf Kreta — setzen Sie den Punkt an Ihr Ziel.",
```
```ts
// el
youAreHere: "Είστε εδώ", dragToAdjust: "Σύρε το σημείο στη θέση σου",
notOnCrete: "Δεν είσαι στην Κρήτη — βάλε το σημείο εκεί που θα είσαι.",
```

(Les autres locales du site retombent sur `T.en` via `T[locale] || T.en`, comportement existant de cet écran.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur (les 4 blocs ont les mêmes clés, type homogène).

- [ ] **Step 3: Commit**

```bash
git add "src/components/explore/ExploreView.tsx"
git commit -m "feat(explore): i18n youAreHere/dragToAdjust/notOnCrete (en/fr/de/el)"
```

---

## Task 4: Disque de rayon (couches GeoJSON)

**Files:**
- Modify: `src/components/explore/ExploreView.tsx`

- [ ] **Step 1: Importer le helper**

En haut de `ExploreView.tsx`, étendre l'import existant depuis `@/lib/geo` :

```ts
import { nearestBy, circlePolygon } from "@/lib/geo";
```

- [ ] **Step 2: Ajouter constante de rayon (près de `PHOTO_PIN_ZOOM`)**

```ts
// Rayon du disque "autour de moi" (visuel uniquement, ne filtre pas la liste).
const NEAR_RADIUS_KM = 10;
```

- [ ] **Step 3: Déclarer la source + 2 couches dans le `load` de la carte**

Dans le handler `map.on("load", () => { … })`, **avant** `map.addSource("places", …)`, insérer la source et les couches du disque (ainsi elles sont dessinées **sous** les clusters/points) :

```ts
        map.addSource("user-radius", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "user-radius-fill",
          type: "fill",
          source: "user-radius",
          paint: { "fill-color": "#0B5E78", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "user-radius-line",
          type: "line",
          source: "user-radius",
          paint: { "line-color": "#0B5E78", "line-opacity": 0.5, "line-width": 1.5, "line-dasharray": [2, 2] },
        });
```

- [ ] **Step 4: Effet de synchro du disque**

Ajouter un `useEffect` (près des autres effets de carte, après l'effet « Sync filtered data to map ») qui met le disque à jour quand la position ou l'état proximité change. Comme `geo.pos` ne change qu'au `dragend` (et à la pose initiale), le disque se recalcule au bon moment, pas pendant le drag.

```ts
  // Disque "autour de moi" : suit geo.pos quand le tri proximité est actif, vidé sinon.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const src = map.getSource("user-radius") as import("maplibre-gl").GeoJSONSource | undefined;
    if (!src) return;
    if (nearActive && geo.pos) {
      src.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [circlePolygon(geo.pos, NEAR_RADIUS_KM)] },
        }],
      });
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
    }
  }, [nearActive, geo.pos, mapReady]);
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
git add "src/components/explore/ExploreView.tsx"
git commit -m "feat(explore): disque de rayon GeoJSON sous les pins (visuel, ne filtre pas)"
```

---

## Task 5: Marqueur « Vous êtes ici » draggable

**Files:**
- Modify: `src/components/explore/ExploreView.tsx`

- [ ] **Step 1: Ajouter la ref du marqueur**

Près des refs existantes (`photoMarkersRef`), ajouter :

```ts
  const userMarkerRef = useRef<MaplibreMarker | null>(null);
```

- [ ] **Step 2: Effet « créer une fois / retirer » (lifecycle)**

Le marqueur existe quand `nearActive && mapReady && geo.pos != null`. On dépend du **booléen** `hasPos` (pas de `geo.pos` directement) pour ne pas recréer le marqueur à chaque déplacement.

```ts
  // Marqueur utilisateur : créé une seule fois quand une position existe + tri actif,
  // retiré sinon. La POSITION est mise à jour par un effet séparé (Step 3) pour éviter
  // une recréation (et un re-binding des handlers) à chaque drag.
  const hasPos = geo.pos != null;
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = maplibreRef.current;
    if (!map || !maplibre || !mapReady || !nearActive || !hasPos || !geo.pos) return;

    const el = document.createElement("div");
    el.title = t.youAreHere;
    el.style.cssText =
      "position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:grab;z-index:5";
    const ring = document.createElement("div");
    ring.style.cssText =
      "position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(11,94,120,.16);animation:cd-pulse 2s ease-out infinite";
    const dot = document.createElement("div");
    dot.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:#0B5E78;border:3px solid #fff;box-shadow:0 2px 8px rgba(7,40,52,.45)";
    el.appendChild(ring);
    el.appendChild(dot);

    const marker = new maplibre.Marker({ element: el, anchor: "center", draggable: true })
      .setLngLat([geo.pos.lon, geo.pos.lat])
      .addTo(map);
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      geo.setPosition(ll.lat, ll.lng);
    });
    userMarkerRef.current = marker;

    return () => {
      marker.remove();
      userMarkerRef.current = null;
    };
    // geo.pos lu à la création seulement ; les MAJ de position passent par l'effet Step 3.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearActive, mapReady, hasPos, t.youAreHere]);
```

- [ ] **Step 3: Effet « mettre à jour la position »**

```ts
  // Met à jour la position du marqueur existant sans le recréer.
  useEffect(() => {
    const m = userMarkerRef.current;
    if (m && geo.pos) m.setLngLat([geo.pos.lon, geo.pos.lat]);
  }, [geo.pos]);
```

- [ ] **Step 4: Nettoyage dans le teardown de la carte**

Dans l'effet d'init de la carte, dans la fonction de cleanup (`return () => { … }`), ajouter le retrait du marqueur utilisateur à côté des `photoMarkersRef` :

```ts
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
```

- [ ] **Step 5: Keyframes de pulsation**

Dans `src/app/globals.css`, ajouter (s'il n'existe pas déjà un `@keyframes cd-pulse`) :

```css
@keyframes cd-pulse {
  0%   { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}
```

- [ ] **Step 6: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build OK.

- [ ] **Step 7: Commit**

```bash
git add "src/components/explore/ExploreView.tsx" src/app/globals.css
git commit -m "feat(explore): marqueur 'Vous etes ici' draggable (lifecycle separe de la position)"
```

---

## Task 6: Réaction à la résolution GPS (sur Crète / hors Crète / refusé) + indice + bouton

**Files:**
- Modify: `src/components/explore/ExploreView.tsx`

- [ ] **Step 1: Importer `isOnCrete`**

Étendre l'import depuis `@/lib/geo` :

```ts
import { nearestBy, circlePolygon, isOnCrete } from "@/lib/geo";
```

- [ ] **Step 2: État de l'indice flottant**

Près des autres `useState`, ajouter :

```ts
  const [hint, setHint] = useState<string | null>(null);
```

- [ ] **Step 3: Effet de réaction à la transition de `geo.status`**

Reproduit le pattern de `MatchDeck.tsx` (`prevGeoStatus`). Quand la demande GPS se résout, on décide quoi faire selon le résultat. À insérer après les effets de carte.

```ts
  // Réaction asynchrone à la résolution GPS (le refus/succès arrive dans un callback,
  // pas au moment du clic). Pattern repris de MatchDeck (prevGeoStatus).
  const prevGeoStatus = useRef(geo.status);
  useEffect(() => {
    const map = mapRef.current;
    const prev = prevGeoStatus.current;
    prevGeoStatus.current = geo.status;
    if (!map || !nearActive) return;

    // Succès GPS : recentrer si on est en Crète, sinon garder la carte sur l'île
    // et poser le point déplaçable au centre de la vue (persona "préparation voyage").
    if (prev === "prompting" && geo.status === "granted" && geo.pos) {
      if (isOnCrete(geo.pos)) {
        map.flyTo({ center: [geo.pos.lon, geo.pos.lat], zoom: Math.max(map.getZoom(), 11) });
        setHint(null);
      } else {
        const c = map.getCenter();
        geo.setPosition(c.lat, c.lng);
        setHint(t.notOnCrete);
      }
      return;
    }
    // Refus / indisponible : placement manuel au centre de la vue.
    if ((geo.status === "denied" || geo.status === "unavailable") && !geo.pos) {
      const c = map.getCenter();
      geo.setPosition(c.lat, c.lng);
      setHint(t.dragToAdjust);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status, geo.pos, nearActive]);
```

- [ ] **Step 4: Masquer l'indice au premier drag**

Dans le handler `dragend` du marqueur (Task 5, Step 2), ajouter `setHint(null);` après `geo.setPosition(...)` :

```ts
    marker.on("dragend", () => {
      const ll = marker.getLngLat();
      geo.setPosition(ll.lat, ll.lng);
      setHint(null);
    });
```

- [ ] **Step 5: Réinitialiser l'indice quand on désactive le tri**

Dans `toggleNearMe`, dans la branche de désactivation, vider l'indice :

```ts
  function toggleNearMe() {
    if (nearActive) { setNearActive(false); setHint(null); return; }
    setNearActive(true);
    if (!geo.pos) geo.requestGeo();
  }
```

- [ ] **Step 6: Afficher l'indice flottant**

Dans le JSX, juste à l'intérieur du conteneur racine (après le wrapper `<div ref={mapContainer} … />`), ajouter une bannière conditionnelle :

```tsx
      {hint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none max-w-[90%] md:max-w-md">
          <div className="bg-aegean text-white text-xs font-semibold px-3.5 py-2 rounded-full shadow-[0_8px_22px_rgba(11,94,120,0.35)] text-center">
            {hint}
          </div>
        </div>
      )}
```

- [ ] **Step 7: Ne plus griser le bouton quand le GPS est bloqué**

Le placement manuel reste possible même si le GPS est refusé : le bouton doit rester cliquable. Dans le bouton desktop « Autour de moi », remplacer la classe conditionnelle pour retirer l'état désactivé (`opacity-60 cursor-help`) tout en gardant le `title` d'aide :

```tsx
          <button
            onClick={toggleNearMe}
            title={geoBlocked ? t.geoUnavailable : undefined}
            aria-pressed={nearActive && Boolean(geo.pos)}
            className={`hidden md:flex items-center gap-1.5 text-sm font-semibold py-2.5 px-4 rounded-full shadow-[0_6px_24px_rgba(11,94,120,0.18)] transition-colors shrink-0 ${
              nearActive && geo.pos ? "bg-aegean text-white" : "bg-white text-text hover:text-aegean"
            }`}
          >
            <CiCompass className="w-4 h-4" />
            {t.nearMe}
          </button>
```

(`geoBlocked` reste défini et sert juste au `title`. La branche `opacity-60` disparaît.)

- [ ] **Step 8: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: build OK.

- [ ] **Step 9: Commit**

```bash
git add "src/components/explore/ExploreView.tsx"
git commit -m "feat(explore): reaction GPS (sur/hors Crete, refuse), indice flottant, bouton actif en mode manuel"
```

---

## Task 7: Vérification visuelle & fonctionnelle (Playwright)

**Files:** aucun (vérification manuelle ; skill `webapp-testing` / Playwright avec override de géolocalisation).

- [ ] **Step 1: Lancer le dev server**

Run: `npm run dev`
Ouvrir `http://localhost:3000/fr/explore`.

- [ ] **Step 2: GPS en Crète (cas nominal)**

Override géoloc Playwright sur un point en Crète (ex. `lat 35.20, lon 25.13` — Heraklion). Cliquer « Autour de moi ».
Attendu : marqueur « Vous êtes ici » (pastille bleue pulsante) + disque pointillé ~10 km visibles, carte recentrée/zoomée, liste triée « Au plus près », badges « km » affichés.

- [ ] **Step 3: Drag du marqueur**

Glisser le marqueur ailleurs sur la carte.
Attendu : à la dépose, la liste se réordonne, les badges « km » et le disque suivent le nouveau point. Pas de recréation visible (pas de clignotement).

- [ ] **Step 4: GPS refusé**

Recharger, bloquer la permission de géoloc, cliquer « Autour de moi ».
Attendu : le bouton **n'est pas grisé**, un point est posé au centre de la vue, indice « Glisse le point sur ta position » affiché ; le drag fonctionne ; au premier drag l'indice disparaît.

- [ ] **Step 5: GPS hors Crète (persona préparation)**

Override géoloc sur un point hors Crète (ex. `lat 48.85, lon 2.35` — Paris). Cliquer « Autour de moi ».
Attendu : la carte **reste sur la Crète** (pas de vol vers Paris), point posé au centre, indice « Tu n'es pas en Crète… » ; drag OK, liste/disque cohérents.

- [ ] **Step 6: Toggle off**

Re-cliquer « Autour de moi ».
Attendu : marqueur, disque et indice retirés ; le tri revient sur « Mieux notés ».

- [ ] **Step 7: Mobile**

En viewport mobile, refaire Steps 2-3 via le bouton « Autour de moi » flottant : le marqueur se pose, le drag tactile fonctionne, le carousel du bas reflète l'ordre par distance.

- [ ] **Step 8: Non-régression `/near-me` et `/match`**

Ouvrir `/fr/near-me` et `/fr/match` : la géoloc et le `PlacePicker` fonctionnent comme avant (le `setPosition` ajouté n'a rien changé pour eux). Vérifier qu'une position posée sur Explore est bien reprise (statut `manual` partagé via `cd-geo`) — comportement attendu.

- [ ] **Step 9: Commit final éventuel (ajustements visuels)**

Si des retouches de style ont été nécessaires, staging explicite :

```bash
git add "src/components/explore/ExploreView.tsx" src/app/globals.css
git commit -m "fix(explore): ajustements visuels position exacte apres verification"
```

---

## Self-Review (effectué)

- **Spec coverage :**
  - GPS pose marqueur + recentrage (Comportement 2) → Task 5 (marqueur) + Task 6 Step 3 (flyTo sur Crète) ✓
  - Marqueur glissable, recalcul liste/badges/disque au dragend (Comportement 3) → Task 5 (dragend → setPosition ; `displayed` déjà câblé) + Task 4 (disque) ✓
  - Disque rempli + contour, visuel only, sous les pins, recalcul au dragend (Comportement 4) → Task 4 ✓
  - GPS refusé → point au centre + indice, bouton non grisé → Task 6 Steps 3, 6, 7 ✓
  - Hors Crète → carte sur Crète + point au centre + indice (Problème 3 / Comportement 2) → Task 6 Step 3 ✓
  - Re-clic = toggle off (marqueur + disque + indice) (Comportement 5) → Task 5 cleanup (nearActive) + Task 4 (branche else) + Task 6 Step 5 ✓
  - `setPosition` statut `manual`, pas de changement de `GeoStatus` → Task 1 ✓
  - i18n en/fr/de/el (3 clés) → Task 3 ✓
- **Placeholder scan :** aucun — code complet à chaque step.
- **Type/nom consistency :** `setPosition(lat, lon)` défini Task 1, consommé Task 5/6 à l'identique. `circlePolygon(center, radiusKm)` défini Task 2, appelé Task 4. `userMarkerRef` créé Task 5, nettoyé Task 5 Step 4. `hint`/`setHint` défini Task 6 Step 2, utilisé Steps 3,4,5,6. Sources/couches `user-radius` / `user-radius-fill` / `user-radius-line` cohérentes Task 4. `NEAR_RADIUS_KM` défini Task 4 Step 2, utilisé Step 4.
- **Risque connu :** l'ordre des couches dépend de l'ajout du disque **avant** `places` dans le `load` (Task 4 Step 3) → garanti dessous. Si un `@keyframes cd-pulse` existe déjà dans `globals.css`, ne pas le dupliquer (Task 5 Step 5).
```
