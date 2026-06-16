# Spec — Carte `/live` : sélection interactive d'un bus

Date : 2026-06-16
Statut : design validé (brainstorming + revue adversariale `wf_96ab674e-1d6`, 44 findings confirmés intégrés). En attente relecture Kami avant `writing-plans`.
Spec liée (moteur) : `docs/superpowers/specs/2026-06-15-bus-live-engine-design.md`

## 1. Intention

La page `/live` affiche déjà les bus en mouvement (positions **estimées depuis l'horaire KTEL**, pas de GPS réel — aucun temps réel n'existe côté KTEL). Le moteur `busesAt()` calcule déjà tracé, prochain arrêt, ETA, progression, destination. Mais **rien n'est cliquable** : la carte est inerte.

Cette feature ajoute une **couche d'interaction au clic**. Cliquer un bus :
1. fait **ressortir sa ligne** (tracé en surbrillance ; les autres lignes et bus **estompés**) ;
2. affiche les **arrêts** de la ligne le long du tracé, le **prochain arrêt** mis en avant ;
3. ouvre un **bottom sheet** avec les infos du trajet ;
4. **recentre en douceur** la carte sur le bus.

On ne refait pas le moteur. On l'**enrichit a minima** (le moteur calcule déjà l'info utile mais ne la transmet pas) et on construit la couche d'interaction par-dessus.

Transparence (charte « pas de bullshit ») : toutes les heures sont **estimées** (`~`, `≈`). Le badge « Estimé selon l'horaire » déjà présent reste.

## 2. Décisions verrouillées (brainstorming Kami)

| Sujet | Décision |
|---|---|
| Format panneau | **Bottom sheet** (tiroir bas), cohérent avec le drawer `/explore` |
| Focus | **Estomper** les autres lignes/bus (pas cacher) |
| Arrêts | Afficher les **points** des arrêts, **prochain** mis en avant |
| Contenu | Ligne + opérateur, origine → destination, prochain arrêt + heure, **arrivée terminus**, progression, bouton « Voir la ligne » |
| Arrivée terminus | **Calculée via la vraie durée KTEL** (`route.duration`), libellée « estimé » quand la durée l'est (option B) |
| Mouvement carte | **Recentrer en douceur** sur le bus (zoom inchangé) |

## 3. Les deux pièges de données (corrigés par ce design)

La revue a invalidé deux hypothèses de la v0 du design. Les corrections sont intégrées ci-dessous.

**B1 — L'arrivée terminus n'est PAS dérivable de `progress`/`totalMinutes`.**
`totalMinutes` est la durée de la **ligne géométrique entière** (seq0→N), pas de la **course** du bus, qui ne couvre souvent qu'un sous-segment. Preuve : une ligne de 37 min sert des routes KTEL de 20 et 40 min ; une ligne de 196 min pour une route réelle de 105 min (`position.ts:181`, `:164`, `:168` ; `network.ts:58`). La formule v0 `now + totalMinutes·(1−progress)` est algébriquement `H + totalMinutes` → fin de ligne, faux de ~90 min dans le pire cas.
**Correction :** dériver l'arrivée de la **vraie durée du trajet** `route.duration` : arrivée = `H + parseDurationMin(route.duration)`. Le moteur ignore aujourd'hui `route.duration` (`bus-live-engine-design.md:34`) → on l'expose via un nouveau champ `etaMinTerminus` sur `LiveBus`.

**B2 — L'origine du bus n'est pas dans le contrat `LiveBus`.**
La destination est correcte (`headsign = route.to_place`, `position.ts:184`), mais l'**origine** (`route.from_place`) est jetée à l'émission. De plus `orientRoute` oriente la ligne entière sans la borner à `[from, to]` (`position.ts:57-73`) : on ne peut donc pas dériver origine/destination depuis `stops[0]`/`stops[last]` de la ligne (faux sur ~1 ligne/3 de la fixture, ex. `Plaka→Agios Nikolaos`).
**Correction :** exposer `origin = route.from_place` sur `LiveBus`. La destination reste `headsign`.

> Limite connue, documentée (hors scope refonte) : le moteur modélise chaque course sur le profil de la **ligne** entière. La position affichée (échelle ligne) et l'arrivée (échelle durée-route) peuvent donc diverger quand `durationRoute ≠ totalMinutes`. Conséquence gérée : si `etaMinTerminus ≤ 0` (course théoriquement finie mais bus encore affiché), on n'affiche pas une heure passée → « Arrivée imminente ». La vraie correction (borner chaque course à son sous-segment avec sa propre durée) est une **amélioration moteur future**, hors scope de cette feature UI.

## 4. Architecture

### 4.1 Enrichissement moteur (minimal, non cassant)

**`src/lib/bus-live/types.ts`** — étendre `LiveBus` de 5 champs :

```ts
export interface LiveBus {
  // ... champs existants ...
  origin: string;              // route.from_place (B2)
  operatorId: string;          // route.operator_id ('herlas'=Est, 'ektel'=Ouest)
  pairSlug: string | null;     // pairSlug(from, to) ; null = pas de page /buses/[pair]
  etaMinTerminus: number | null; // minutes restantes jusqu'au terminus à `now` ; null si durée absente/non parsable (B1)
  durationEstimated: boolean;  // route.duration_estimated ?? false → libellé « estimé »
}
```

**`src/lib/bus-live/duration.ts`** (NOUVEAU, pur) :

```ts
/** Parse une durée KTEL texte ("2h 30min", "1h45", "20min", "1h") en minutes. null si vide/illisible. */
export function parseDurationMin(s: string | null): number | null
```
Doit gérer : `"2h 30min"`, `"2h30"`, `"1h"`, `"45min"`, `"45 min"`, `null`/`""`/non parsable → `null`. Tolère espaces et casse.

**`src/lib/bus-live/position.ts`** — à l'émission du `LiveBus` (`busesAt`, ~l.173-188), remplir les 5 champs. Tout est déjà en main : `route` (donc `from_place`, `to_place`, `operator_id`, `duration`, `duration_estimated`) et `H`.
```ts
const durMin = parseDurationMin(route.duration);
// ... dans out.push({ ... }) :
origin: route.from_place,
operatorId: route.operator_id,
pairSlug: pairSlug(route.from_place, route.to_place),
etaMinTerminus: durMin == null ? null : (toMin(H) + durMin) - now.minutes,
durationEstimated: route.duration_estimated ?? false,
```
Imports ajoutés : `pairSlug` depuis `../bus-pairs.ts` (pur), `parseDurationMin` depuis `./duration.ts`. (Note import : extension `.ts` explicite, cf convention `position.ts:2-4`.)

**`src/lib/athens-time.ts`** — ajouter un formateur inverse pur :
```ts
/** Minutes-depuis-minuit (Athens) → "HH:MM", modulo 24h (arrivée le lendemain). */
export const clockHHMM = (minutes: number): string
```

### 4.2 Dérivation présentation (pure, testable)

**`src/lib/bus-live/selection.ts`** (NOUVEAU, pur). Une fonction qui transforme un `LiveBus` + l'heure courante en view-model d'affichage. **Pure** (on injecte `nowMinutes`, pas d'appel à `athensNow()` dedans) → testable sans carte.

```ts
export interface BusSheetVM {
  code: string;                 // codeOfficial ?? code
  operatorLabel: string;        // "KTEL Est" / "KTEL Ouest" (i18n)
  origin: string;               // bus.origin (nom brut DB, v1)
  destination: string;          // bus.headsign
  nextStop: { name: string; etaMin: number; clock: string } | null; // null = arrivée imminente
  terminus: { etaMin: number; clock: string; estimated: boolean } | null; // null = durée inconnue ou ≤0
  progressPct: number;          // round(progress*100)
  lineHref: string | null;      // `/buses/${pairSlug}` ; null = bouton masqué
}

export function deriveBusSheet(bus: LiveBus, nowMinutes: number, locale: string): BusSheetVM
```
Règles :
- `nextStop` = `null` si `bus.nextStop == null || bus.etaMinNext == null` → libellé « Arrivée imminente ».
- `terminus` = `null` si `bus.etaMinTerminus == null || bus.etaMinTerminus <= 0` (durée inconnue, ou course théoriquement finie cf §3).
- `clock` = `clockHHMM(nowMinutes + etaMin)`.
- `lineHref` = `bus.pairSlug ? `/buses/${bus.pairSlug}` : null`.
- `operatorLabel` via table i18n (§4.6).

> Note maintenance : `etaMinTerminus` (et `etaMinNext`) sont **relatifs à `now`** (calculés à l'émission `busesAt`). Le rendu fait `clock = clockHHMM(nowMinutes + etaMin)` : le baseline `now` soustrait à l'émission est ré-ajouté au rendu → l'heure d'horloge est correcte tant que les deux `now` viennent du même tick (écart de quelques secondes négligeable). Ne pas « simplifier » en stockant une heure absolue à l'émission sans répercuter le décalage de tick.

### 4.3 Composant bottom sheet (présentation pure)

**`src/components/live/BusSheet.tsx`** (NOUVEAU). Reçoit `{ vm: BusSheetVM; locale: string; onClose: () => void }`. Aucune logique de calcul. Rendu :

```
─────────────────────────────────
 ▁▁▁▁▁ (poignée)               ✕
 Ligne 3  ·  KTEL Est
 Héraklion  →  Ag. Nikolaos
 ───────────────────────────────
 Prochain : Malia   ~7 min (≈14:32)
 Arrivée  : ≈14:58   (· estimé)
 [●●●●○○○○]  48 %
 ───────────────────────────────
 [ Voir la ligne → ]   (masqué si lineHref == null)
─────────────────────────────────
```
- Charte **Kalimera du repo** (PAS la charte Kairos) : Baloo 2 / Geist, tokens `aegean`/`terra`/`sun`, `font-data` pour les heures/%, arrondis. Réutiliser le style du drawer `/explore` (ExploreView) pour la cohérence responsive.
- A11y : `role="dialog"` `aria-modal="true"` `aria-label` ; focus envoyé au sheet à l'ouverture ; **Escape** ferme ; focus rendu au marqueur à la fermeture ; bouton ✕ avec `aria-label`. Une région `aria-live="polite"` annonce le bus sélectionné.
- `prefers-reduced-motion` : slide d'ouverture sans transition.
- Mobile : `100dvh` de référence pour la carte, `padding-bottom: env(safe-area-inset-bottom)` ; hauteur du sheet mesurée au runtime (pour l'offset de recentrage).

### 4.4 Marqueur

**`src/components/live/busMarker.ts`** — ajouts :
- `cursor:pointer` + hit-area ≥ 44px (zone transparente autour de la flèche 26px) ; rôle bouton + `aria-label` (`${code} → ${headsign}`) + `tabindex=0` + activation clavier Enter/Espace.
- `setBusSelected(el, on: boolean)` : agrandit/colore (token `sun`/`terra`) le marqueur sélectionné.
- `setBusDimmed(el, on: boolean)` : réduit l'opacité des marqueurs non sélectionnés.

### 4.5 Orchestration carte

**`src/components/live/LiveMapClient.tsx`** — cœur de l'interaction.

État : `selectedBusId: string | null` (via `useState` **et** un `useRef` miroir lu dans le closure du `tick`).

**Clic** : `createBusEl` reçoit un callback ; `el.addEventListener('click', e => { e.stopPropagation(); setSelected(bus.id); })` (stopPropagation pour ne pas déclencher la désélection du clic-fond). L'écouteur survit tant que le marqueur existe (id stable, non recréé par `reconcile`).

**Surbrillance des lignes** : ajouter `lineId` aux `properties` de `linesGeoJSON` (aujourd'hui `{code}` seul). Deux layers sur la même source `bus-lines` :
- `bus-lines-base` (existant, renommé/conservé) : opacity `0.55` au neutre ; passe à `0.12` (via `setPaintProperty`) quand une sélection est active.
- `bus-lines-highlight` (NOUVEAU) : `filter: ['==', ['get','lineId'], selectedLineId]`, couleur `terra`, width `5`, opacity `1`. Filtre `['==',['get','lineId'],-1]` (= vide) quand pas de sélection.
Pas de `removeSource`/`addSource` dynamique (races) — uniquement `setPaintProperty`/`setFilter`.

**Arrêts** : source `sel-stops` (GeoJSON points) + deux layers (arrêt normal : petit cercle `aegean` ; prochain arrêt : gros cercle `sun`), **créées une fois au `map.load`** avec data vide, puis `setData()` au changement de sélection. Les points proviennent de `netRef.current.lines.get(bus.lineId).stops` (le `LiveBus` ne porte pas ses arrêts). L'ordre des points est **sans effet visuel** (cercles indépendants) → `orientRoute` inutile ici (il ne sert qu'au profil temps/distance du moteur). Le prochain arrêt est marqué `properties.isNext` par **égalité de nom** (`stop.name === bus.nextStop`) : exact par construction (les deux chaînes viennent de la même source `LiveStop.name`, cf `position.ts:147`) ; si 0 match (course finie, `nextStop=null`), ne rien surligner.

**Recentrage** : au select, `map.easeTo({ center:[bus.lng,bus.lat], offset:[0, -sheetHeight/2], duration: reducedMotion ? 0 : 400 })` **une fois** (pas de suivi continu en v1) ; annulé si l'utilisateur `dragstart`. Centre pris sur la position **interpolée** (`markersRef.cur`), pas la cible brute.

**Boucle tick** (toutes les 2 s, existante) : après `busesAt`, pour chaque marqueur appliquer `setBusSelected(el, id===sel)` et `setBusDimmed(el, sel!=null && id!==sel)`. Si `selectedBusId` est non-null : relire le `LiveBus` sélectionné via `targetsRef.current.get(selectedBusId)` (les `LiveBus` filtrés du tick) → MAJ du `BusSheet` (ETA décroît, position bouge). **Si le bus sélectionné a disparu** (`leaving`/absent de `targetsRef`) → fermer le sheet, vider highlight + arrêts, `selectedBusId = null`.

**Switch A→B** (clic d'un autre bus alors qu'un sheet est ouvert) : même code-path, met à jour VM + highlight + arrêts + recentrage, sans démonter le sheet.

**Désélection** : ✕ du sheet, **Escape**, ou clic sur le fond de carte (`map.on('click', …)` qui ne provient pas d'un marqueur). Restaure base 0.55, vide highlight/arrêts, ferme le sheet.

**CTA existants** (« Planifier un trajet » / « Louer une voiture », `bottom-14`) : **masqués (ou translatés) quand le sheet est ouvert** ; z-index du sheet > CTA. Restaurés à la fermeture.

**Cleanup** : à l'unmount, retirer les écouteurs (clic marqueurs, `visibilitychange`, document keydown Escape), comme le cleanup existant.

### 4.6 i18n

Suivre le **pattern i18n du composant hôte** `LiveMapClient` : table `T[locale] ?? T.en` (fallback anglais). On fournit **en / fr / de / el** (en/fr = base actuelle de `/live` ; de = touristes, el = marché local) ; les 18 autres locales du repo (`src/i18n/routing.ts` en déclare 22) **retombent proprement sur l'anglais** via le fallback — pas d'incohérence avec le reste de la page. Les libellés d'opérateur « KTEL Est/Ouest » **n'existent nulle part dans le repo** (`BusesClient` filtre par `operator_id` mais ne les traduit pas) → ils sont **créés ici** :

| clé | en | fr | de | el |
|---|---|---|---|---|
| operator.herlas | KTEL East | KTEL Est | KTEL Ost | ΚΤΕΛ Ανατολής |
| operator.ektel | KTEL West | KTEL Ouest | KTEL West | ΚΤΕΛ Δυτικής |
| next | Next | Prochain | Nächster | Επόμενη |
| arrival | Arrival | Arrivée | Ankunft | Άφιξη |
| imminent | Arriving | Arrivée imminente | Kommt an | Καταφθάνει |
| estimated | estimated | estimé | geschätzt | εκτίμηση |
| viewLine | View line | Voir la ligne | Linie ansehen | Δείτε τη γραμμή |
| close | Close | Fermer | Schließen | Κλείσιμο |

Heures formatées en 24 h, fuseau Athens (déjà garanti par `athensNow`/`clockHHMM`).

## 5. Flux de données

```
busesAt(athensNow(), network)  →  LiveBus[]  (enrichis: origin, operatorId, pairSlug, etaMinTerminus, durationEstimated)
        │
        ├─ tick 2s → marqueurs (entering/leaving, lerp) + états selected/dimmed
        │
        └─ si selectedBusId :
               selBus = buses.find(id === selectedBusId)
               selBus ? deriveBusSheet(selBus, athensNow().minutes, locale) → <BusSheet vm/>   |   sinon → close
```

## 6. Edge cases (couverts)

- **Bus sélectionné qui finit sa course** → disparaît de `busesAt`, `reconcile.leaving` → sheet fermé, layers nettoyés.
- **`nextStop`/`etaMinNext` null** (fin de course) → `nextStop = null` → « Arrivée imminente » (jamais « null ~nullmin »).
- **`etaMinTerminus` null ou ≤ 0** (durée inconnue, ou divergence durée-route/ligne §3) → ligne « Arrivée » masquée / « Arrivée imminente ».
- **`pairSlug` null** (terminus hors whitelist `BUS_PLACE_SLUGS`) → bouton « Voir la ligne » masqué (pas de 404).
- **Onglet repassé visible** (`onVis` tick) → sélection persiste, sheet recalculé.
- **`prefers-reduced-motion`** → recentrage `duration:0`, slide sheet sans transition.
- **Mobile** → `100dvh`, safe-area, hauteur sheet mesurée pour l'offset.
- **Noms bruts** (`Eloynta`, `Plaka(Ag.Nikolaos)`) : affichés tels quels en v1 (nettoyage display = nit hors scope).
- **Dédup multi-terminus** : `origin`/`destination` proviennent de la **même route** que le `headsign` retenu (cohérent par construction dans `busesAt`).

## 7. Tests & gate

- **`scripts/check-bus-live-selection.mjs`** (`node --experimental-strip-types`, pattern repo) :
  - `parseDurationMin` : `"2h 30min"→150`, `"1h45"→105`, `"20min"→20`, `"1h"→60`, `null/"x"→null`.
  - `deriveBusSheet` (injecte `nowMinutes`) : origine/destination/operatorLabel ; `clock` = now+eta ; `lineHref` null si `pairSlug` null ; `terminus` null si `etaMinTerminus` null/≤0 ; `nextStop` null si `etaMinNext` null ; `durationEstimated` propagé.
  - **Câblage** : ajouter à `package.json` le script `"check:bus-select": "node --experimental-strip-types scripts/check-bus-live-selection.mjs"` **et l'insérer dans la chaîne `check`** — qui ne contient aujourd'hui AUCUN test bus (`check:geo && check:car-partners && check:car-lead && tsc --noEmit`). Sans cet ajout, le gate ne s'exécute jamais.
- `tsc --noEmit` = 0 erreur ; `next build` OK.
- **Branche** `feat/live-bus-select` depuis `origin/master` (jamais `main`). Worktree avec `node_modules` jonctionné sur `cretepulse-live` (réel).
- **Preview Vercel** → validation visuelle Kami (clic bus → ligne ressort + sheet ; switch ; désélection ; mobile) → **merge `master:main`** (acte conscient prod).

## 8. Hors scope v1 (YAGNI)

- Clic sur une **ligne** ou un **arrêt** pour sélectionner (seul le clic **bus**).
- **Deep-link** `?bus=…` (partage d'un bus).
- **Suivi continu** du recentrage (recentrage one-shot seulement).
- **Refonte moteur** (borner chaque course à son sous-segment §3) — amélioration future.
- Affichage des bus **degraded** (`source='ktel'`/`partialGeo`) : restent exclus de la carte → non sélectionnables (cohérent avec l'état actuel ; deviendront sélectionnables si SP4 les affiche).
- Prix, durée détaillée, liste déroulante des arrêts à venir.

## 9. Fichiers touchés (récap)

| Fichier | Action |
|---|---|
| `src/lib/bus-live/types.ts` | +5 champs sur `LiveBus` |
| `src/lib/bus-live/duration.ts` | NOUVEAU (pur) — `parseDurationMin` |
| `src/lib/bus-live/position.ts` | remplir les 5 champs à l'émission (+imports `pairSlug`, `parseDurationMin`) |
| `src/lib/bus-live/selection.ts` | NOUVEAU (pur) — `deriveBusSheet` + i18n opérateur |
| `src/lib/athens-time.ts` | +`clockHHMM` |
| `src/components/live/BusSheet.tsx` | NOUVEAU — bottom sheet présentation |
| `src/components/live/busMarker.ts` | clic + `setBusSelected`/`setBusDimmed` + a11y/hit-area |
| `src/components/live/LiveMapClient.tsx` | état sélection, layers highlight/arrêts, recentrage, intégration sheet, désélection, CTA |
| `scripts/check-bus-live-selection.mjs` | NOUVEAU — tests purs, câblé `npm run check` |
