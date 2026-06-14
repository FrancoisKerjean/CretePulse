# Vidéo météo unifiée DA Kalimera + Kriri — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la vidéo météo YouTube (`CreteWeatherMap`) sous la DA unifiée Kalimera + mascotte Kriri + motion court (~15-20 s, 4 villes), en gardant la carte de Crète animée restylée, et corriger au passage le crash récurrent en remplaçant le timing dérivé de la VO par des slots fixes déterministes.

**Architecture:** On crée une couche marque partagée (`src/components/brand.ts`) que le reel et la météo importent. On réécrit le chemin `daily-weather` de `render-daily.mjs` pour capper à 4 villes, raccourcir la VO et calculer un timing de scènes à slots fixes (garantis positifs/croissants → plus de crash). On restyle la composition (`CreteWeatherMap.tsx` + sa carte) à la palette Kalimera, on ajoute Kriri présentateur et des tuiles données lisibles. Schema de composition et id (`CreteWeatherMap`) inchangés ; `Root.tsx`, cron 06:35 et upload YouTube non touchés.

**Tech Stack:** Remotion (React/TSX), `@remotion/google-fonts` (Baloo 2 + Geist), zod, Open-Meteo (4 villes), Kokoro VO + Whisper captions. Vérif : `tsc --noEmit` + `npx remotion still`/`render` sur le VPS (pas de runner de test unitaire).

**Environnements :** édition + commit côté miroir Windows `C:\Users\fkerj\cretepulse-video\src\` (sous le monorepo home `C:\Users\fkerj`, commit depuis la racine, paths explicites, jamais `git add -A`) ; build/render/typecheck sur le VPS `kairos-vps:/opt/cretepulse-video` (seul avec node_modules ; `scp` puis `ssh`). Aucune branche imposée.

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `src/components/brand.ts` | Tokens marque partagés (palette `C` Kalimera, `RATING`, `cardinalDeg`) | Créer |
| `src/compositions/swim/helpers.ts` | Re-exporte `C`/`RATING` depuis `brand.ts` (reel inchangé) | Modifier |
| `scripts/render-daily.mjs` | Chemin `daily-weather` : cap 4 villes + VO courte + timing slots fixes | Modifier |
| `src/compositions/weather/WeatherTile.tsx` | Card ville courte + tuile résumé (Kalimera, animées) | Créer |
| `src/compositions/CreteWeatherMap.tsx` | Restyle Kalimera + Kriri + assemblage 4 beats slots fixes | Modifier |

`Root.tsx`, le schema `creteWeatherMapSchema`, le cron, l'upload YouTube : **non modifiés**. La carte de Crète animée (`DynamicWeatherMap` + `AnimatedWeatherIcon` + `crete-silhouette`) est **restylée en place** (palette), pas réécrite.

**Vérification :** pas de runner de test. Helpers purs (`brand.ts`) testés par `node --test --experimental-strip-types`. Le reste = `tsc --noEmit` + rendus still/MP4 sur VPS + inspection visuelle.

---

### Task 1 : Couche marque partagée `src/components/brand.ts`

**Files:**
- Create: `src/components/brand.ts`
- Modify: `src/compositions/swim/helpers.ts`
- Test: `src/components/brand.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// src/components/brand.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { C, RATING, cardinalDeg } from "./brand.ts";

test("palette Kalimera exporte les tokens clés", () => {
  assert.equal(C.lagoon, "#00C2D4");
  assert.equal(C.night, "#07374A");
  assert.equal(C.sun, "#FFC83D");
  assert.equal(C.terra, "#ED7A5C");
});
test("RATING mappe calm/fair/exposed", () => {
  assert.equal(RATING.calm.label, "CALM");
  assert.equal(RATING.exposed.color, C.terra);
});
test("cardinalDeg mappe + fallback 0", () => {
  assert.equal(cardinalDeg("N"), 0);
  assert.equal(cardinalDeg("SE"), 135);
  assert.equal(cardinalDeg("???"), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /c/Users/fkerj/cretepulse-video && node --test --experimental-strip-types "src/components/brand.test.mjs"`
Expected: FAIL (cannot find `./brand.ts`).

- [ ] **Step 3: Write `src/components/brand.ts`**

```ts
// src/components/brand.ts
// Source unique des tokens de marque (DA Kalimera) — partagée par toutes les
// compositions vidéo (reel swim, météo, news). Évite la divergence de DA.

export const C = {
  lagoon: "#00C2D4",
  lagoonDeep: "#008C9E",
  sky: "#BDEDF5",
  sea: "#0B5E78",
  night: "#07374A",
  sun: "#FFC83D",
  terra: "#ED7A5C",
  olive: "#7C9A53",
  ok: "#14B86B",
  foam: "#F6FBFC",
  sand: "#FFF3D6",
  ink: "#0B3954",
  white: "#FFFFFF",
} as const;

export const RATING: Record<string, { color: string; label: string }> = {
  calm: { color: C.ok, label: "CALM" },
  fair: { color: C.sun, label: "FAIR" },
  exposed: { color: C.terra, label: "EXPOSED" },
};

const CARD_DEG: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};
export function cardinalDeg(cardinal: string): number {
  return CARD_DEG[cardinal] ?? 0;
}
```

- [ ] **Step 4: Re-point the reel helpers to the shared source**

Edit `src/compositions/swim/helpers.ts` — replace the local `C` and `RATING` declarations with a re-export so the reel uses the same tokens (keep the other helpers `seaWord`, `fmtMin`, `moodFromConditions`, `KriMood` unchanged). At the top of the file, replace the `export const C = {...}` block and `export const RATING = {...}` block with:

```ts
export { C, RATING } from "../../components/brand";
```

Keep everything else in `helpers.ts` as-is. (The reel imports `C`/`RATING` from `./helpers` — unchanged for consumers.)

- [ ] **Step 5: Run tests (brand + reel helpers) to verify pass**

Run:
```
cd /c/Users/fkerj/cretepulse-video
node --test --experimental-strip-types "src/components/brand.test.mjs"
node --test --experimental-strip-types "src/compositions/swim/helpers.test.mjs"
```
Expected: brand 3/3 PASS, helpers 4/4 PASS (the reel still resolves C/RATING via the re-export).

- [ ] **Step 6: Deploy + typecheck on VPS**

```
cd /c/Users/fkerj/cretepulse-video
ssh kairos-vps 'mkdir -p /opt/cretepulse-video/src/components'
scp src/components/brand.ts kairos-vps:/opt/cretepulse-video/src/components/
scp src/compositions/swim/helpers.ts kairos-vps:/opt/cretepulse-video/src/compositions/swim/
ssh kairos-vps 'cd /opt/cretepulse-video && npx tsc --noEmit 2>&1 | grep -iE "brand|helpers|swim/" || echo "tsc OK brand layer"'
```
Expected: `tsc OK brand layer`.

- [ ] **Step 7: Commit**

```
cd /c/Users/fkerj
git add cretepulse-video/src/components/brand.ts cretepulse-video/src/components/brand.test.mjs cretepulse-video/src/compositions/swim/helpers.ts
git commit -m "feat(brand): shared Kalimera token module; reel helpers re-export from it"
```

---

### Task 2 : `render-daily.mjs` — cap 4 villes + VO courte + timing slots fixes

**Files:**
- Modify: `scripts/render-daily.mjs` (chemin `daily-weather` uniquement)

Trois changements ciblés, tous dans le bloc `if (payload.category === "daily-weather")`.

- [ ] **Step 1: Cap à 4 villes (Open-Meteo + cityScenes)**

Le fichier déclare `const CITIES = [...6 villes...]`. Ajouter juste après cette déclaration une constante dérivée et l'utiliser partout dans le chemin weather :

```js
// 4 villes fixes pour la vidéo courte (ouest→est) : couvrent l'île d'un coup d'œil.
const WEATHER_CITIES = CITIES.slice(0, 4); // Chania, Rethymno, Heraklion, Agios Nikolaos
```

Dans le chemin `daily-weather`, remplacer les usages de `CITIES` par `WEATHER_CITIES` :
- la construction de l'URL Open-Meteo (`lats`/`lons` à partir de `WEATHER_CITIES`),
- `globalThis.__weatherCities = WEATHER_CITIES.map(...)`.
Laisser `CITIES` (6) intact pour tout autre usage éventuel.

- [ ] **Step 2: VO courte (script ~15-20 s)**

Remplacer la construction de `fullScript` du bloc weather (intro + hook + cityPhrases + outro, verbeux) par une version courte déterministe :

```js
  const cities = globalThis.__weatherCities;
  const hottest = cities.reduce((a, b) => (a.tempMax >= b.tempMax ? a : b));
  const windy = cities.filter(c => c.wind_kmh >= 25);
  const cityLine = cities
    .map(c => `${c.name} ${Math.round(c.tempMax)}`)
    .join(", ");
  const summary = windy.length
    ? `Windy in the ${windy.length > 1 ? "north" : windy[0].name}.`
    : `Calm and warm across the island.`;
  fullScript = [
    `Crete weather today.`,
    `${cityLine} degrees.`,
    `${summary} Warmest in ${hottest.name}.`,
    `Full forecast on crete direct.`,
  ].join(" ");
```

(Court, 1 ligne villes + 1 résumé + CTA. Cible ~15-20 s à la voix `bm_george`.)

- [ ] **Step 3: Timing slots fixes (supprime le matching mentionFrame, source du crash)**

Dans le bloc `if (payload.category === "daily-weather")` qui construit les props, **remplacer tout le calcul de `cityScenes` basé sur `mentionFrame`** (la boucle de matching Whisper, le fallback, et le bloc `Set scene start/end frames` lignes ~261-299) par un calcul déterministe à slots fixes :

```js
  const FPS = 30;
  const cities = globalThis.__weatherCities;
  // totalFrames calé sur la VO réelle (plancher 15 s), VO désormais courte.
  const audioDurSec = parseFloat(execSync(
    `ffprobe -v error -show_entries format=duration -of default=nw=1:nokey=1 public/voice.mp3`,
    { cwd: projectRoot, encoding: "utf8" }
  ).trim());
  const totalFrames = Math.max(15 * FPS, Math.ceil(audioDurSec * FPS) + 30);

  // Slots fixes : intro / 4 villes égales / outro. Toujours positifs et croissants.
  const introEndFrame = Math.round(2.5 * FPS);
  const outroFrames = Math.round(2.5 * FPS);
  const cityWindow = totalFrames - introEndFrame - outroFrames;
  const per = Math.max(FPS, Math.floor(cityWindow / cities.length)); // >= 1 s par ville
  const cityScenes = cities.map((c, i) => ({
    ...c,
    startFrame: introEndFrame + i * per,
    endFrame: introEndFrame + (i + 1) * per - 1,
  }));
  const outroStartFrame = introEndFrame + cities.length * per;

  console.log(`  audio ${audioDurSec.toFixed(1)}s → totalFrames=${totalFrames} (${(totalFrames/FPS).toFixed(1)}s), per-city=${(per/FPS).toFixed(1)}s`);
```

Le `props.json` écrit ensuite doit utiliser ces `cityScenes`, `introEndFrame`,
`outroStartFrame`, `totalFrames` (mêmes noms de champs qu'aujourd'hui → schema inchangé).
Vérifier que le `writeFileSync(... props.json ...)` du bloc weather sérialise bien ces
variables (et plus aucune référence à `mentionFrame`/`_alias_used`).

- [ ] **Step 4: Lint-check the script**

Run: `cd /c/Users/fkerj/cretepulse-video && node --check scripts/render-daily.mjs && echo "syntax OK"`
Expected: `syntax OK`. (Exécution réelle testée en Task 6 sur le VPS avec venv.)

- [ ] **Step 5: Commit**

```
cd /c/Users/fkerj
git add cretepulse-video/scripts/render-daily.mjs
git commit -m "fix(weather): cap 4 cities, short VO, fixed-slot scene timing (kills negative-duration crash)"
```

---

### Task 3 : Composants tuiles `src/compositions/weather/WeatherTile.tsx`

**Files:**
- Create: `src/compositions/weather/WeatherTile.tsx`

Deux composants : `CityTile` (card ville courte animée) et `SummaryTile` (grosse tuile résumé). Palette Kalimera via `brand.ts`.

- [ ] **Step 1: Write `WeatherTile.tsx`**

```tsx
// src/compositions/weather/WeatherTile.tsx
// Tuiles données météo (DA Kalimera) : card ville courte + tuile résumé.
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { loadFont as loadBaloo } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { C } from "../../components/brand";

const BALOO = loadBaloo("normal", { weights: ["600", "700", "800"] }).fontFamily;
const GEIST = loadGeist("normal", { weights: ["500", "600"] }).fontFamily;

export const CityTile: React.FC<{
  name: string; tempMax: number; tempMin?: number; condition: string;
  windKmh?: number; delay?: number;
}> = ({ name, tempMax, tempMin, condition, windKmh, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.7 } });
  return (
    <div style={{
      background: C.white, borderRadius: 28, padding: "28px 34px",
      boxShadow: "0 16px 40px rgba(7,55,74,0.18)",
      transform: `translateY(${(1 - s) * 50}px)`, opacity: s,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 48, color: C.night, lineHeight: 1 }}>{name}</div>
        <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 26, color: C.lagoonDeep, marginTop: 6 }}>
          {condition}{windKmh != null ? ` · wind ${Math.round(windKmh)} km/h` : ""}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 84, color: C.terra, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{Math.round(tempMax)}°</div>
        {tempMin != null && <div style={{ fontFamily: BALOO, fontWeight: 700, fontSize: 40, color: C.lagoonDeep, opacity: 0.7 }}>{Math.round(tempMin)}°</div>}
      </div>
    </div>
  );
};

export const SummaryTile: React.FC<{ headline: string; sub: string; delay?: number }> = ({ headline, sub, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.8 } });
  return (
    <div style={{
      background: C.lagoon, color: C.night, borderRadius: 34, padding: "44px 50px",
      boxShadow: "0 20px 50px rgba(7,55,74,0.22)",
      transform: `scale(${0.85 + s * 0.15})`, opacity: s,
    }}>
      <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 72, lineHeight: 1 }}>{headline}</div>
      <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 32, marginTop: 12, color: C.sea }}>{sub}</div>
    </div>
  );
};
```

- [ ] **Step 2: Deploy + typecheck on VPS**

```
cd /c/Users/fkerj/cretepulse-video
ssh kairos-vps 'mkdir -p /opt/cretepulse-video/src/compositions/weather'
scp src/compositions/weather/WeatherTile.tsx kairos-vps:/opt/cretepulse-video/src/compositions/weather/
ssh kairos-vps 'cd /opt/cretepulse-video && npx tsc --noEmit 2>&1 | grep -iE "WeatherTile|weather/" || echo "tsc OK WeatherTile"'
```
Expected: `tsc OK WeatherTile`.

- [ ] **Step 3: Commit**

```
cd /c/Users/fkerj
git add cretepulse-video/src/compositions/weather/WeatherTile.tsx
git commit -m "feat(weather): Kalimera CityTile + SummaryTile components"
```

---

### Task 4 : Restyle de la carte animée à la palette Kalimera

**Files:**
- Modify: `src/compositions/CreteWeatherMap.tsx` (palette `C` + `DynamicWeatherMap` + bulles temp + `AnimatedWeatherIcon`)

But : la carte reste géométriquement identique (silhouette + positions villes + pan), seuls les **styles** passent en Kalimera. On ne réécrit pas la géométrie.

- [ ] **Step 1: Remplacer la palette locale par les tokens partagés**

Dans `CreteWeatherMap.tsx`, remplacer le bloc `const C = {...}` (palette locale terracotta/aegean/ink, ~ligne 60) par un import en tête de fichier :

```ts
import { C, cardinalDeg } from "../components/brand";
```

Puis adapter les références : l'ancienne palette exposait `C.terra`, `C.aegean`, `C.ink`, `C.white`, `C.sky`… Mapper les noms manquants vers la nouvelle palette `brand.ts` :
- `C.aegean` → `C.sea` (bleu mer profond),
- `C.ink` existe (même rôle, `#0B3954`),
- `C.terra`, `C.sky`, `C.white`, `C.sun`, `C.lagoon`, `C.night` existent.
Faire un remplacement global `C.aegean` → `C.sea` dans le fichier. Si une autre couleur de
l'ancienne palette n'existe pas dans `brand.ts`, la mapper au token Kalimera le plus proche
(documenter le choix en commentaire).

- [ ] **Step 2: Restyler les bulles température et le badge**

- Le badge « CRETE WEATHER » terracotta : passer le fond en `C.night` (ou `C.lagoon`) avec
  texte `C.white`, coins arrondis 999px (pill), police Baloo.
- Les bulles de température sur la carte (`DynamicWeatherMap`) : fond pastille `C.lagoon`
  (texte `C.night`) ou `C.sea` (texte blanc), chiffre Baloo `tabular-nums`, ombre douce
  colorée `rgba(7,55,74,0.18)`, pop-in via le spring déjà présent. Retirer toute teinte
  terracotta de fond de bulle (réserver `C.terra` aux accents chauds/alertes).
- Arrondis généreux partout (≥ 20px), ombres colorées (jamais grises).

- [ ] **Step 3: Typecheck (déploiement avec Task 5, mais vérifier la compilation isolée)**

```
cd /c/Users/fkerj/cretepulse-video
scp src/compositions/CreteWeatherMap.tsx kairos-vps:/opt/cretepulse-video/src/compositions/
ssh kairos-vps 'cd /opt/cretepulse-video && npx tsc --noEmit 2>&1 | grep -iE "CreteWeatherMap" || echo "tsc OK weather palette"'
```
Expected: `tsc OK weather palette`. Corriger toute référence couleur cassée jusqu'à propre.

- [ ] **Step 4: Commit**

```
cd /c/Users/fkerj
git add cretepulse-video/src/compositions/CreteWeatherMap.tsx
git commit -m "style(weather): map + bubbles to Kalimera palette (shared brand tokens)"
```

---

### Task 5 : Assemblage 4 beats slots fixes + Kriri présentateur

**Files:**
- Modify: `src/compositions/CreteWeatherMap.tsx` (le composant racine `CreteWeatherMap` + IntroScene/OutroScene + ajout Kriri + tuiles)

But : structurer la vidéo en intro / carte (4 villes) / résumé / outro, ajouter Kriri, et
remplacer les cards verbeuses par `CityTile`/`SummaryTile`. La carte (`DynamicWeatherMap`)
reste rendue au top-level pendant les beats carte+résumé.

- [ ] **Step 1: Importer la couche commune + tuiles + Kriri**

En tête de `CreteWeatherMap.tsx`, ajouter :
```ts
import { KriKri } from "../components/KriKri";
import { CityTile, SummaryTile } from "./weather/WeatherTile";
```

- [ ] **Step 2: Intro — Kriri + Καλημέρα**

Dans `IntroScene`, ajouter Kriri (humeur dérivée de la météo dominante) et la salutation, au-dessus/à côté du titre. Choix d'humeur : si une ville a `wmo` pluvieux dominant ou vent fort → `alert`, sinon `hello`. Code minimal à insérer dans le rendu de `IntroScene` (le composant reçoit déjà `cities`) :
```tsx
const windyIntro = cities.some(c => (c.wind_kmh ?? 0) >= 30);
// ... dans le JSX, en haut :
<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
  <KriKri mood={windyIntro ? "alert" : "hello"} size={200} delay={2} />
  <div style={{ fontFamily: "var(--baloo)", fontWeight: 700, fontSize: 40, color: C.lagoonDeep }}>Καλημέρα !</div>
</div>
```
(Utiliser la constante `BALOO` déjà chargée dans le fichier au lieu de `var(--baloo)` si présente ; sinon charger Baloo comme les autres.)

- [ ] **Step 3: City scenes — remplacer les cards par `CityTile`**

Dans le rendu des `cityScenes.map(...)` (les `<Sequence>` par ville), remplacer le contenu de `CityScene` (la grosse card actuelle) par un `<CityTile>` positionné en bas, alimenté par les champs de la ville (`name`, `tempMax`, `tempMin`, condition via `wmoLabel(city.wmo)`, `wind_kmh`). Le `delay` d'entrée = quelques frames après le début du slot. Garder la carte de fond (`DynamicWeatherMap`) inchangée derrière.

- [ ] **Step 4: Résumé — `SummaryTile` avant l'outro (ou fin de carte)**

Ajouter un court beat résumé : soit une `<Sequence>` dédiée entre la dernière ville et l'outro, soit l'intégrer à l'outro. `headline` = température dominante (« 28° today ») ou « Hot today »/« Mild today » selon `hottest.tempMax` ; `sub` = vent (« NW wind » si `windy`, sinon « Calm seas »). Données disponibles via les `cities` passées.

- [ ] **Step 5: Outro — wordmark Kalimera + Kriri**

Restyler `OutroScene` : fond Kalimera (gradient lagon→nuit ou `AbstractBg`), wordmark `crete.direct` (Baloo + soleil), Kriri `hello`, CTA « Full forecast · crete.direct ». Retirer tout reliquat terracotta/ancienne DA.

- [ ] **Step 6: Deploy + typecheck on VPS**

```
cd /c/Users/fkerj/cretepulse-video
scp src/compositions/CreteWeatherMap.tsx kairos-vps:/opt/cretepulse-video/src/compositions/
ssh kairos-vps 'cd /opt/cretepulse-video && npx tsc --noEmit 2>&1 | grep -iE "CreteWeatherMap|weather/|KriKri|brand" || echo "tsc OK weather assembly"'
```
Expected: `tsc OK weather assembly`.

- [ ] **Step 7: Render 3 stills (defaultProps de Root.tsx) + pull**

```
ssh kairos-vps 'cd /opt/cretepulse-video
npx remotion still src/Root.tsx CreteWeatherMap out/wstill-intro.png --frame=30 2>&1 | tail -2
npx remotion still src/Root.tsx CreteWeatherMap out/wstill-city.png --frame=150 2>&1 | tail -2
npx remotion still src/Root.tsx CreteWeatherMap out/wstill-outro.png --frame=400 2>&1 | tail -2
ls -la out/wstill-*.png'
scp kairos-vps:/opt/cretepulse-video/out/wstill-intro.png kairos-vps:/opt/cretepulse-video/out/wstill-city.png kairos-vps:/opt/cretepulse-video/out/wstill-outro.png /c/Users/fkerj/Desktop/
```
Expected: 3 PNG > 30 KB. Ouvrir : DA Kalimera, Kriri visible, carte restylée, tuiles lisibles, plus de terracotta « broadcast ». (Note : les defaultProps de Root.tsx peuvent avoir 6 villes/timing ancien ; les stills valident le STYLE. Le timing réel 4-villes/slots est validé en Task 6 via le vrai pipeline.)

- [ ] **Step 8: Commit**

```
cd /c/Users/fkerj
git add cretepulse-video/src/compositions/CreteWeatherMap.tsx
git commit -m "feat(weather): 4-beat Kalimera assembly with Kriri + data tiles (short, dynamic)"
```

---

### Task 6 : Rendu bout-en-bout sur le VPS (vraies données, pipeline complet)

**Files:** aucun (vérification via `render-daily.mjs`, inchangé hors Task 2).

- [ ] **Step 1: Full weather render with real data (venv requis, no upload needed)**

```
ssh kairos-vps 'cd /opt/cretepulse-video && source venv/bin/activate && export PATH="$(pwd)/venv/bin:$PATH" && node --env-file=.env.local scripts/render-daily.mjs "crete-weather-$(date -u +%F)" 2>&1 | tail -20'
```
Expected : VO courte générée, Whisper captions, log `audio Xs → totalFrames=... (~15-20s), per-city=...`, 4 villes listées, `Output: out/crete-weather-<date>.mp4`, **aucun crash** (ni « durationInFrames must be positive » ni « monotonically increasing »). Le MP4 doit faire ~15-20 s.

- [ ] **Step 2: Pull MP4 for human acceptance**

```
D=$(ssh kairos-vps 'date -u +%F')
scp "kairos-vps:/opt/cretepulse-video/out/crete-weather-$D.mp4" /c/Users/fkerj/Desktop/
```
Ouvrir le MP4 : ~15-20 s, DA Kalimera, Kriri présente, carte animée restylée, 4 villes en tuiles lisibles, résumé, captions synchro, plus de terracotta « broadcast ». **Point de validation Kami.**

- [ ] **Step 3: Confirm cron + upload path intact (pas de changement)**

```
ssh kairos-vps 'grep -n render-weather-today /etc/cron.d/cretepulse-daily-video; head -12 /opt/cretepulse-video/bin/render-weather-today.sh'
```
Expected : cron 06:35 inchangé appelant `render-weather-today.sh` (render + upload YouTube). NB : l'upload YouTube reste bloqué par le **token expiré** (problème séparé, action Kami) — hors périmètre de ce chantier.

---

## Self-Review

**1. Spec coverage :**
- DA unifiée Kalimera + Kriri + motion → Tasks 1 (brand), 4 (palette), 5 (Kriri + tuiles) ✓
- Couche marque partagée (brand.ts, reel re-exporte) → Task 1 ✓
- Carte de Crète gardée, restylée → Task 4 (restyle en place, géométrie inchangée) ✓
- Court ~15-20 s → Task 2 (VO courte + slots) + Task 6 (vérif durée) ✓
- 4 villes fixes → Task 2 (`CITIES.slice(0,4)`) ✓
- Infos courtes/faciles → Task 3 (tuiles lisibles) + Task 5 (résumé) ✓
- Fix crash root cause (timing) → Task 2 (slots fixes, suppression mentionFrame) ✓
- Pipeline/cron/upload inchangés → Tasks 2/6 (schema fields identiques, cron non touché) ✓
- News = hors scope → noté ✓

**2. Placeholder scan :** Tasks 1-3 et 6 ont du code/commandes complets. Tasks 4-5 sont des **modifications ciblées d'un gros fichier existant** (restyle + assemblage) : décrites par changements précis + snippets clés (pattern « Modify » légitime), pas des « TODO ». Aucun « TBD ».

**3. Type consistency :** `brand.ts` exporte `C`/`RATING`/`cardinalDeg` ; `swim/helpers` les re-exporte (reel inchangé) ; `WeatherTile` + `CreteWeatherMap` importent `C` depuis `brand`. Champs props (`cityScenes{startFrame,endFrame}`, `introEndFrame`, `outroStartFrame`, `totalFrames`) identiques entre Task 2 (producteur) et le schema/compo (consommateur). `KriKri` `mood` ∈ hello/alert. Cohérent.

## Restes / hors plan
- **News video** : même DA, chantier + plan séparés ensuite.
- **YouTube token expiré** : ré-auth Google (action Kami) — débloque la publication, indépendant.
- **Polish** : variété fonds, micro-lisibilité — itérations post-validation.
