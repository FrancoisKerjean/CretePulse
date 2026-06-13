# Redesign vidéo reel `CreteSwimToday` (Kalimera + Kriri, sans immersif photo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la composition Remotion `CreteSwimToday` (reel vertical quotidien « Où se baigner aujourd'hui ») pour passer du fond photo + ken burns à une direction **100% graphique charte Kalimera avec la mascotte Kriri en présentateur** et un motion dynamique (fonds abstraction lumineuse animés, compteurs de stats, transitions punchées, captions mot-à-mot), sans toucher au pipeline (feed → VO Kokoro → Whisper → render → upload IG/FB, cron 09:00 Athens).

**Architecture:** On garde le schema `creteSwimTodaySchema` et le script `render-beach-today.mjs` **inchangés** (props identiques). On ne réécrit que la couche visuelle : on ajoute des composants présentationnels dédiés (`KriKri`, `AbstractBg`, `StatTile`, `GraphicAltCard`) et on remplace le corps de `CreteSwimToday.tsx` par un nouveau timeline de scènes. Les photos (`imageUrl`) ne sont plus rendues (fonds abstraction lumineuse à la place). Édition côté miroir Windows `src/`, déploiement + rendu/vérif sur le VPS (`/opt/cretepulse-video`, seul environnement avec node_modules).

**Tech Stack:** Remotion (React/TSX), `@remotion/google-fonts` (Baloo 2 + Geist, déjà chargés), zod (schema, inchangé), TypeScript (`tsc` pour typecheck — pas de runner de test unitaire dans ce projet). Vérification visuelle via `npx remotion still` / `npx remotion render` sur le VPS.

**Environnements :**
- Édition + commit : `C:\Users\fkerj\cretepulse-video\src\` (miroir Windows, source).
- Build/render/typecheck : VPS `kairos-vps:/opt/cretepulse-video` (node_modules présent). Déploiement d'un fichier = `scp src/... kairos-vps:/opt/cretepulse-video/src/...`.
- Aucune branche git imposée (projet hors monorepo). Le miroir Windows est sous le monorepo home (à committer en fin de chantier, convention).

---

## File Structure

| Fichier | Responsabilité | Action |
|---|---|---|
| `src/components/KriKri.tsx` | Mascotte Kriri en composant Remotion (4 humeurs, entrée animée + bob) | Créer |
| `src/compositions/swim/AbstractBg.tsx` | Fond abstraction lumineuse animé (radial-gradients dérivants + grain) | Créer |
| `src/compositions/swim/StatTile.tsx` | Tuile donnée couleur avec compteur animé (Waze-like) | Créer |
| `src/compositions/swim/GraphicAltCard.tsx` | Carte alternative SANS photo (nom + région + vent + temp), entrée spring | Créer |
| `src/compositions/swim/helpers.ts` | Helpers purs (palette C, cardinal→deg, formatage, mood depuis conditions) | Créer |
| `src/compositions/CreteSwimToday.tsx` | Réécriture du timeline de scènes (assemble les composants ci-dessus) | Modifier (réécrit le corps, garde le schema export) |

`render-beach-today.mjs`, `src/Root.tsx`, le schema `creteSwimTodaySchema` : **NON modifiés**.

**Note vérification :** ce projet n'a pas de runner de test unitaire (que `tsc`). On vérifie chaque task par (a) `tsc --noEmit` sur le VPS, et (b) un rendu de **still** (image fixe d'une frame représentative) via `npx remotion still`, récupéré et inspecté visuellement. Les helpers purs (`helpers.ts`) sont la seule unité testée par assertions (script node ad hoc, pas de framework).

---

### Task 1: Helpers purs + palette (`src/compositions/swim/helpers.ts`)

**Files:**
- Create (Windows): `src/compositions/swim/helpers.ts`
- Test (Windows, ad hoc node): `src/compositions/swim/helpers.test.mjs`

Extrait les fonctions pures (aujourd'hui inline dans `CreteSwimToday.tsx`) + ajoute `moodFromConditions` (pilote l'humeur de Kriri depuis les données réelles, sans inventer d'`avoid`).

- [ ] **Step 1: Write the failing test**

```js
// src/compositions/swim/helpers.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { cardinalDeg, seaWord, fmtMin, moodFromConditions } from "./helpers.ts";

test("cardinalDeg mappe les 8 directions", () => {
  assert.equal(cardinalDeg("N"), 0);
  assert.equal(cardinalDeg("SE"), 135);
  assert.equal(cardinalDeg("NW"), 315);
  assert.equal(cardinalDeg("???"), 0); // fallback
});

test("seaWord catégorise la houle", () => {
  assert.equal(seaWord(null), "Calm sea");
  assert.equal(seaWord(0.2), "Calm sea");
  assert.equal(seaWord(0.6), "Light swell");
  assert.equal(seaWord(1.0), "Some swell");
});

test("fmtMin formate minutes/heures", () => {
  assert.equal(fmtMin(45), "45 min");
  assert.equal(fmtMin(90), "1h30");
});

test("moodFromConditions: alert si exposed ou vent fort, sinon hello", () => {
  assert.equal(moodFromConditions("exposed", 10), "alert");
  assert.equal(moodFromConditions("calm", 35), "alert");   // vent fort
  assert.equal(moodFromConditions("calm", 10), "hello");
  assert.equal(moodFromConditions("fair", 18), "hello");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (Windows, bash): `cd /c/Users/fkerj/cretepulse-video && node --test --experimental-strip-types "src/compositions/swim/helpers.test.mjs"`
Expected: FAIL (`Cannot find module './helpers.ts'`). Node v22 strips TS types via `--experimental-strip-types`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/compositions/swim/helpers.ts
// Helpers purs + palette pour le reel CreteSwimToday (DA Kalimera).

export const C = {
  lagoon: "#00C2D4",
  lagoonDeep: "#008C9E",
  sky: "#BDEDF5",
  night: "#07374A",
  sun: "#FFC83D",
  ok: "#14B86B",
  terra: "#ED7A5C",
  sand: "#FFF3D6",
  foam: "#F6FBFC",
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

export function seaWord(m: number | null): string {
  if (m == null || m < 0.4) return "Calm sea";
  if (m < 0.8) return "Light swell";
  return "Some swell";
}

export function fmtMin(m: number): string {
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

export type KriMood = "hello" | "alert" | "empty" | "lost";

/** Humeur de Kriri pilotée par les conditions réelles (pas d'avoid inventé). */
export function moodFromConditions(rating: string, windSpeed: number): KriMood {
  if (rating === "exposed" || windSpeed >= 30) return "alert";
  return "hello";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /c/Users/fkerj/cretepulse-video && node --test --experimental-strip-types "src/compositions/swim/helpers.test.mjs"`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
cd /c/Users/fkerj/cretepulse-video
git add src/compositions/swim/helpers.ts src/compositions/swim/helpers.test.mjs
git commit -m "feat(reel): pure helpers + Kalimera palette + Kriri mood from conditions"
```
(Si `git add` échoue car le dossier est ignoré par le monorepo : voir note en fin de plan « Versioning du miroir ». Ne pas bloquer — continuer, le commit se fait en fin de chantier.)

---

### Task 2: Mascotte Kriri en composant Remotion (`src/components/KriKri.tsx`)

**Files:**
- Create (Windows): `src/components/KriKri.tsx`

Port du SVG (depuis le site `src/components/KriKri.tsx` et `crete-direct-instagram/lib/kriri.mjs`) en composant React/Remotion, attributs en camelCase (JSX), avec une animation d'entrée + léger bob pilotés par `useCurrentFrame`.

- [ ] **Step 1: Write implementation**

```tsx
// src/components/KriKri.tsx
// Mascotte kri-kri de crete.direct, présentateur du reel (DA Kalimera).
// Tracé fidèle au composant du site. Entrée spring + bob continu.
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

type Mood = "hello" | "alert" | "empty" | "lost";

function Base() {
  return (
    <>
      <path d="M44 36 C28 28 22 12 32 4 C33 15 40 24 51 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth={2.6} strokeLinejoin="round" />
      <path d="M76 36 C92 28 98 12 88 4 C87 15 80 24 69 30 Z" fill="#C98A5B" stroke="#0B3954" strokeWidth={2.6} strokeLinejoin="round" />
      <ellipse cx={33} cy={50} rx={9} ry={5.5} transform="rotate(-22 33 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth={2.6} />
      <ellipse cx={87} cy={50} rx={9} ry={5.5} transform="rotate(22 87 50)" fill="#E8D2AE" stroke="#0B3954" strokeWidth={2.6} />
      <ellipse cx={60} cy={58} rx={27} ry={25} fill="#F5E9D2" stroke="#0B3954" strokeWidth={2.8} />
      <ellipse cx={60} cy={67} rx={15} ry={10.5} fill="#FFF9EC" />
      <circle cx={55.5} cy={66.5} r={1.5} fill="#0B3954" />
      <circle cx={64.5} cy={66.5} r={1.5} fill="#0B3954" />
      <path d="M56 82 C57 89 63 89 64 82 C62 84 58 84 56 82 Z" fill="#E8D2AE" stroke="#0B3954" strokeWidth={2.4} strokeLinejoin="round" />
    </>
  );
}

function Face({ mood }: { mood: Mood }) {
  if (mood === "alert") {
    return (
      <>
        <g transform="rotate(-6 60 58)"><Base /></g>
        <circle cx={50} cy={55} r={3.6} fill="#0B3954" /><circle cx={51.4} cy={53.6} r={1.1} fill="#fff" />
        <circle cx={70} cy={55} r={3.6} fill="#0B3954" /><circle cx={71.4} cy={53.6} r={1.1} fill="#fff" />
        <path d="M44 47 l9 -3 M76 47 l-9 -3" stroke="#0B3954" strokeWidth={2.6} strokeLinecap="round" />
        <ellipse cx={60} cy={73} rx={4} ry={5} fill="#0B3954" />
        <g transform="translate(96,14)">
          <circle r={13} fill="#FFC83D" stroke="#0B3954" strokeWidth={2.6} />
          <path d="M0 -6 v7" stroke="#0B3954" strokeWidth={3.4} strokeLinecap="round" />
          <circle cy={5.5} r={1.9} fill="#0B3954" />
        </g>
      </>
    );
  }
  // hello (défaut)
  return (
    <>
      <path d="M14 22 v6 M10 28 h-6 M17 30 l-4 4" stroke="#FFC83D" strokeWidth={3} strokeLinecap="round" fill="none" />
      <circle cx={20} cy={20} r={7} fill="#FFC83D" />
      <Base />
      <circle cx={50} cy={55} r={3.4} fill="#0B3954" /><circle cx={51.2} cy={53.8} r={1.1} fill="#fff" />
      <circle cx={70} cy={55} r={3.4} fill="#0B3954" /><circle cx={71.2} cy={53.8} r={1.1} fill="#fff" />
      <path d="M53 72 q7 5.5 14 0" stroke="#0B3954" strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </>
  );
}

export const KriKri: React.FC<{
  mood?: Mood;
  size?: number;
  delay?: number;
  bob?: boolean;
}> = ({ mood = "hello", size = 360, delay = 0, bob = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.8 } });
  const bobY = bob ? Math.sin((frame / fps) * 2.4) * 8 : 0;
  const scale = interpolate(enter, [0, 1], [0.6, 1]);
  return (
    <svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 120 96"
      role="img"
      aria-label="kri-kri"
      style={{ transform: `translateY(${bobY}px) scale(${scale})`, opacity: enter }}
    >
      <g transform="translate(0,6)"><Face mood={mood} /></g>
    </svg>
  );
};
```

- [ ] **Step 2: Typecheck on VPS**

```bash
cd /c/Users/fkerj/cretepulse-video
scp src/components/KriKri.tsx kairos-vps:/opt/cretepulse-video/src/components/
ssh kairos-vps 'cd /opt/cretepulse-video && npx tsc --noEmit 2>&1 | head -20 || true'
```
Expected: no error mentioning `KriKri.tsx`. (Pre-existing unrelated errors elsewhere, if any, are out of scope — only verify KriKri introduces none.)

- [ ] **Step 3: Commit**

```bash
git add src/components/KriKri.tsx
git commit -m "feat(reel): Kriri mascot as Remotion component (moods + spring entrance + bob)"
```

---

### Task 3: Fond abstraction lumineuse animé + tuile stat + carte alternative

**Files:**
- Create (Windows): `src/compositions/swim/AbstractBg.tsx`
- Create (Windows): `src/compositions/swim/StatTile.tsx`
- Create (Windows): `src/compositions/swim/GraphicAltCard.tsx`

Trois composants présentationnels graphiques (zéro photo), charte Kalimera.

- [ ] **Step 1: Write `AbstractBg.tsx`**

```tsx
// src/compositions/swim/AbstractBg.tsx
// Fond abstraction lumineuse animé (style D de la DA Kalimera) : radial-gradients
// qui dérivent lentement + grain. Aucune photo. Variante mer (frais) / warm (chaud).
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C } from "./helpers";

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export const AbstractBg: React.FC<{ variant?: "sea" | "warm" }> = ({ variant = "sea" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / Math.max(1, durationInFrames);
  // dérive lente des centres de gradients
  const x1 = interpolate(t, [0, 1], [18, 30]);
  const y2 = interpolate(t, [0, 1], [18, 8]);
  const yb = interpolate(t, [0, 1], [112, 104]);

  const bg =
    variant === "warm"
      ? `radial-gradient(120% 90% at 10% 0%, ${C.sand} 0%, transparent 55%),
         radial-gradient(120% 90% at 95% ${y2}%, rgba(255,200,61,.6) 0%, transparent 50%),
         radial-gradient(140% 120% at 50% ${yb}%, rgba(237,122,92,.5) 0%, transparent 75%),
         ${C.foam}`
      : `radial-gradient(120% 90% at ${x1}% 0%, ${C.sky} 0%, transparent 55%),
         radial-gradient(120% 90% at 90% ${y2}%, rgba(0,194,212,.55) 0%, transparent 50%),
         radial-gradient(140% 120% at 50% ${yb}%, ${C.night} 0%, rgba(11,94,120,.65) 45%, transparent 80%),
         ${C.foam}`;

  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: "overlay" }} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Write `StatTile.tsx`**

```tsx
// src/compositions/swim/StatTile.tsx
// Tuile donnée couleur avec compteur animé (chiffres Baloo tabular, façon Waze).
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { loadFont as loadBaloo } from "@remotion/google-fonts/Baloo2";
import { C } from "./helpers";

const BALOO = loadBaloo("normal", { weights: ["600", "700", "800"] }).fontFamily;

export const StatTile: React.FC<{
  label: string;
  value: number;
  unit?: string;
  tone?: "lagoon" | "sea" | "sand";
  delay?: number;
  decimals?: number;
}> = ({ label, value, unit = "", tone = "lagoon", delay = 0, decimals = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, mass: 0.7 } });
  const shown = (value * s).toFixed(decimals);
  const bg = tone === "sea" ? C.sea ?? C.lagoonDeep : tone === "sand" ? C.sand : C.lagoon;
  const fg = tone === "sea" ? C.white : C.night;
  return (
    <div
      style={{
        background: tone === "sea" ? C.lagoonDeep : tone === "sand" ? C.sand : C.lagoon,
        color: fg,
        borderRadius: 30,
        padding: "30px 36px",
        boxShadow: "0 18px 40px rgba(7,55,74,0.22)",
        transform: `translateY(${(1 - s) * 40}px)`,
        opacity: s,
        fontFamily: BALOO,
        minWidth: 240,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 30, opacity: 0.85 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 90, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {shown}
        <span style={{ fontSize: 38, fontWeight: 700 }}>{unit}</span>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Write `GraphicAltCard.tsx`**

```tsx
// src/compositions/swim/GraphicAltCard.tsx
// Carte alternative SANS photo : nom + région + vent + temp, entrée spring.
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont as loadBaloo } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { C, RATING } from "./helpers";

const BALOO = loadBaloo("normal", { weights: ["700", "800"] }).fontFamily;
const GEIST = loadGeist("normal", { weights: ["600"] }).fontFamily;

export const GraphicAltCard: React.FC<{
  name: string;
  region: string;
  windCardinal: string;
  windSpeed: number;
  seaTemp: number | null;
  rating: string;
  delay: number;
}> = ({ name, region, windCardinal, windSpeed, seaTemp, rating, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.7 } });
  const r = RATING[rating] ?? RATING.fair;
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: C.white, borderRadius: 28, padding: "28px 34px",
        boxShadow: "0 16px 38px rgba(7,55,74,0.16)",
        transform: `translateY(${interpolate(s, [0, 1], [60, 0])}px)`, opacity: s,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 46, color: C.night, lineHeight: 1.04 }}>{name}</div>
        <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 26, color: C.lagoonDeep, marginTop: 4 }}>
          {region} · {windCardinal} {Math.round(windSpeed)} kn
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
        {seaTemp != null && (
          <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 60, color: C.lagoonDeep, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(seaTemp)}°
          </div>
        )}
        <span style={{
          background: r.color, color: rating === "fair" ? C.night : C.white,
          borderRadius: 999, padding: "8px 18px", fontFamily: BALOO, fontWeight: 800, fontSize: 24,
        }}>{r.label}</span>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Typecheck on VPS**

```bash
cd /c/Users/fkerj/cretepulse-video
scp src/compositions/swim/AbstractBg.tsx src/compositions/swim/StatTile.tsx src/compositions/swim/GraphicAltCard.tsx kairos-vps:/opt/cretepulse-video/src/compositions/swim/
ssh kairos-vps 'cd /opt/cretepulse-video && npx tsc --noEmit 2>&1 | grep -iE "AbstractBg|StatTile|GraphicAltCard" || echo "no errors in new components"'
```
Expected: `no errors in new components`.

Note: `StatTile.tsx` references `C.sea` which does not exist in the palette — the ternary already falls back to `C.lagoonDeep` for the `sea` tone via the `background` line (the unused `bg`/`C.sea ?? ` expression must be removed). FIX before typecheck: in `StatTile.tsx` delete the dead line `const bg = ...` (it is never used; `background` is computed inline). Keep only `fg`. Re-run typecheck until clean.

- [ ] **Step 5: Commit**

```bash
git add src/compositions/swim/AbstractBg.tsx src/compositions/swim/StatTile.tsx src/compositions/swim/GraphicAltCard.tsx
git commit -m "feat(reel): graphic Kalimera components (animated bg, stat tile, alt card) — no photos"
```

---

### Task 4: Réécriture du timeline `CreteSwimToday.tsx`

**Files:**
- Modify (Windows): `src/compositions/CreteSwimToday.tsx` (réécrit le corps + sous-composants internes ; **garde** les exports `creteSwimTodaySchema` / `CreteSwimTodayProps` et la prop `totalFrames` à l'identique)

Nouveau timeline en 4 beats proportionnels à `durationInFrames` : Hook (Kriri présente) → Plage du jour (compteurs animés + Kriri réagit) → Alternatives (cartes graphiques) → Outro CTA. Captions VO mot-à-mot réactivées en bas. Transitions par fondu/slide entre scènes. **Aucune photo.**

- [ ] **Step 1: Replace the file content**

Remplacer **tout** le contenu de `src/compositions/CreteSwimToday.tsx` par :

```tsx
/**
 * CreteSwimToday — Reel vertical quotidien "Où se baigner aujourd'hui".
 * DA Kalimera, 100% graphique (zéro photo), Kriri présentateur. Source = feed
 * /api/internal/swim-today via render-beach-today.mjs. Schema/pipeline inchangés.
 */
import { z } from "zod";
import {
  AbsoluteFill, Audio, Sequence, staticFile, interpolate, useCurrentFrame, useVideoConfig,
} from "remotion";
import { loadFont as loadBaloo } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { KriKri } from "../components/KriKri";
import { AbstractBg } from "./swim/AbstractBg";
import { StatTile } from "./swim/StatTile";
import { GraphicAltCard } from "./swim/GraphicAltCard";
import { C, RATING, seaWord, moodFromConditions } from "./swim/helpers";

const BALOO = loadBaloo("normal", { weights: ["500", "600", "700", "800"] }).fontFamily;
const GEIST = loadGeist("normal", { weights: ["400", "600", "700"] }).fontFamily;

// Schemas — INCHANGÉS (render-beach-today.mjs construit ces props) -----------
const beachLiteSchema = z.object({
  name: z.string(), slug: z.string(), region: z.string(), imageUrl: z.string().nullable(),
  rating: z.enum(["calm", "fair", "exposed"]), windCardinal: z.string(), windSpeed: z.number(),
  waveHeight: z.number().nullable(), seaTemp: z.number().nullable(),
  bus: z.object({ name: z.string(), km: z.number(), direct: z.boolean() }).nullable(),
  fromCities: z.array(z.object({ name: z.string(), min: z.number() })).default([]),
  lat: z.number(), lng: z.number(),
});
const captionWordSchema = z.object({ text: z.string(), start: z.number(), end: z.number() });
export const creteSwimTodaySchema = z.object({
  dateLabel: z.string(),
  wind: z.object({ cardinal: z.string(), minSpeed: z.number(), maxSpeed: z.number() }),
  pick: beachLiteSchema,
  alternatives: z.array(beachLiteSchema).default([]),
  voiceoverSrc: z.string().optional(),
  captions: z.array(captionWordSchema).default([]),
  totalFrames: z.number().optional(),
});
export type CreteSwimTodayProps = z.infer<typeof creteSwimTodaySchema>;
type CaptionWord = z.infer<typeof captionWordSchema>;

function resolveSrc(src: string): string {
  if (/^(https?:|data:|\/)/.test(src)) return src;
  return staticFile(src);
}

function REGION(r: string): string {
  const m: Record<string, string> = { west: "West", central: "Central", east: "East", south: "South", north: "North" };
  return m[r] || r;
}

// Wordmark monoline (spirale lagon + soleil) ---------------------------------
function Wordmark({ size = 52 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: BALOO, fontWeight: 800, fontSize: size, color: C.night }}>
      <span>crete</span>
      <svg width={size * 0.8} height={size * 0.8} viewBox="0 0 24 24">
        <circle cx={12} cy={12} r={10} fill="none" stroke={C.lagoon} strokeWidth={2.4} />
        <circle cx={12} cy={12} r={3.4} fill={C.sun} />
      </svg>
      <span>direct</span>
    </div>
  );
}

// Captions karaoké mot-à-mot (timestamps Whisper) ----------------------------
function Captions({ words }: { words: CaptionWord[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!words.length) return null;
  const t = frame / fps;
  const phrases: CaptionWord[][] = [];
  let cur: CaptionWord[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i === 0 || words[i].start - words[i - 1].end < 0.5) cur.push(words[i]);
    else { if (cur.length) phrases.push(cur); cur = [words[i]]; }
    if (cur.length >= 5) { phrases.push(cur); cur = []; }
  }
  if (cur.length) phrases.push(cur);
  const phrase = phrases.find(p => t >= p[0].start - 0.05 && t <= p[p.length - 1].end + 0.3);
  if (!phrase) return null;
  return (
    <div style={{ position: "absolute", bottom: 150, left: 60, right: 60, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
      {phrase.map((w, i) => {
        const active = t >= w.start && t < w.end + 0.05;
        return (
          <span key={i} style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 44, color: active ? C.lagoonDeep : C.night, opacity: active ? 1 : 0.75 }}>{w.text}</span>
        );
      })}
    </div>
  );
}

// Transition helper : fondu+slide d'une scène sur ses bornes locales ---------
function useSceneFade(durationInFrames: number) {
  const frame = useCurrentFrame();
  const inOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const outOpacity = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const y = interpolate(frame, [0, 10], [30, 0], { extrapolateRight: "clamp" });
  return { opacity: Math.min(inOpacity, outOpacity), transform: `translateY(${y}px)` };
}

export const CreteSwimToday: React.FC<CreteSwimTodayProps> = ({
  dateLabel, wind, pick, alternatives, voiceoverSrc, captions,
}) => {
  const { durationInFrames } = useVideoConfig();
  const hookEnd = Math.round(durationInFrames * 0.22);
  const pickEnd = Math.round(durationInFrames * 0.50);
  const altEnd = Math.round(durationInFrames * 0.86);
  const pickMood = moodFromConditions(pick.rating, pick.windSpeed);
  const r = RATING[pick.rating] ?? RATING.fair;

  return (
    <AbsoluteFill style={{ fontFamily: BALOO, backgroundColor: C.foam }}>
      {voiceoverSrc && <Audio src={resolveSrc(voiceoverSrc)} />}

      {/* HOOK : Kriri présente */}
      <Sequence durationInFrames={hookEnd}>
        <HookScene dateLabel={dateLabel} wind={wind} />
      </Sequence>

      {/* PLAGE DU JOUR : compteurs animés + Kriri réagit */}
      <Sequence from={hookEnd} durationInFrames={pickEnd - hookEnd}>
        <PickScene pick={pick} mood={pickMood} ratingColor={r.color} />
      </Sequence>

      {/* ALTERNATIVES : cartes graphiques */}
      <Sequence from={pickEnd} durationInFrames={altEnd - pickEnd}>
        <AltScene alternatives={alternatives.slice(0, 3)} />
      </Sequence>

      {/* OUTRO : CTA marque */}
      <Sequence from={altEnd}>
        <OutroScene />
      </Sequence>

      {/* Captions VO mot-à-mot par-dessus toutes les scènes */}
      <Captions words={captions} />
    </AbsoluteFill>
  );
};

function HookScene({ dateLabel, wind }: { dateLabel: string; wind: CreteSwimTodayProps["wind"] }) {
  const { durationInFrames } = useVideoConfig();
  const fade = useSceneFade(durationInFrames);
  return (
    <AbsoluteFill>
      <AbstractBg variant="sea" />
      <AbsoluteFill style={{ padding: 70, justifyContent: "space-between", ...fade }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Wordmark />
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <KriKri mood="hello" size={460} delay={4} />
        </div>
        <div>
          <div style={{ fontFamily: BALOO, fontWeight: 700, fontSize: 44, color: C.lagoonDeep }}>Καλησπέρα !</div>
          <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 30, color: C.night, marginTop: 6 }}>{dateLabel}</div>
          <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 96, lineHeight: 0.98, color: C.night, marginTop: 22 }}>
            Where to swim<br />today?
          </div>
          <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 30, color: C.lagoonDeep, marginTop: 16 }}>
            {wind.cardinal} wind · {Math.round(wind.minSpeed)}–{Math.round(wind.maxSpeed)} kn
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function PickScene({ pick, mood, ratingColor }: { pick: CreteSwimTodayProps["pick"]; mood: "hello" | "alert"; ratingColor: string }) {
  const { durationInFrames } = useVideoConfig();
  const fade = useSceneFade(durationInFrames);
  return (
    <AbsoluteFill>
      <AbstractBg variant="sea" />
      <AbsoluteFill style={{ padding: 70, justifyContent: "space-between", ...fade }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: BALOO, fontWeight: 700, fontSize: 38, color: C.lagoonDeep }}>The beach of the day</div>
          <KriKri mood={mood} size={170} bob delay={2} />
        </div>
        <div>
          <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 110, lineHeight: 0.95, color: C.night }}>{pick.name}</div>
          <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 32, color: C.lagoonDeep, marginTop: 8 }}>
            {REGION(pick.region)} · {seaWord(pick.waveHeight)}
          </div>
          <div style={{ display: "flex", gap: 26, marginTop: 40 }}>
            {pick.seaTemp != null && <StatTile label="Sea" value={Math.round(pick.seaTemp)} unit="°" tone="lagoon" delay={6} />}
            <StatTile label="Wind" value={Math.round(pick.windSpeed)} unit="kn" tone="sea" delay={12} />
          </div>
          <div style={{ marginTop: 28 }}>
            <span style={{ background: ratingColor, color: pick.rating === "fair" ? C.night : C.white, borderRadius: 999, padding: "14px 30px", fontFamily: BALOO, fontWeight: 800, fontSize: 38 }}>
              {(RATING[pick.rating] ?? RATING.fair).label}
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function AltScene({ alternatives }: { alternatives: CreteSwimTodayProps["alternatives"] }) {
  const { durationInFrames } = useVideoConfig();
  const fade = useSceneFade(durationInFrames);
  return (
    <AbsoluteFill>
      <AbstractBg variant="sea" />
      <AbsoluteFill style={{ padding: 60, justifyContent: "center", gap: 24, ...fade }}>
        <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 64, color: C.night, marginBottom: 8 }}>Also good today</div>
        {alternatives.length === 0 && (
          <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 32, color: C.lagoonDeep }}>One clear pick today.</div>
        )}
        {alternatives.map((b, i) => (
          <GraphicAltCard
            key={b.slug}
            name={b.name} region={REGION(b.region)} windCardinal={b.windCardinal}
            windSpeed={b.windSpeed} seaTemp={b.seaTemp} rating={b.rating} delay={6 + i * 8}
          />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function OutroScene() {
  const { durationInFrames } = useVideoConfig();
  const fade = useSceneFade(durationInFrames);
  return (
    <AbsoluteFill>
      <AbstractBg variant="sea" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 26, ...fade }}>
        <KriKri mood="hello" size={420} delay={2} />
        <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 80, color: C.night, textAlign: "center", lineHeight: 0.98 }}>
          All of Crete,<br />live.
        </div>
        <Wordmark size={56} />
        <div style={{ fontFamily: GEIST, fontWeight: 600, fontSize: 30, color: C.lagoonDeep }}>Beaches, weather, buses · independent project</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
```

- [ ] **Step 2: Typecheck on VPS**

```bash
cd /c/Users/fkerj/cretepulse-video
scp src/compositions/CreteSwimToday.tsx kairos-vps:/opt/cretepulse-video/src/compositions/
ssh kairos-vps 'cd /opt/cretepulse-video && npx tsc --noEmit 2>&1 | grep -iE "CreteSwimToday|swim/|KriKri" || echo "no errors in swim reel files"'
```
Expected: `no errors in swim reel files`.

- [ ] **Step 3: Render a muted still + a short preview on the VPS**

Render 3 stills at representative frames (hook, pick, alt) with the default preview props (no VO), and a full muted render for motion check:
```bash
ssh kairos-vps 'cd /opt/cretepulse-video
# stills (uses Root.tsx default props for CreteSwimToday)
npx remotion still src/Root.tsx CreteSwimToday out/still-hook.png --frame=20 2>&1 | tail -3
npx remotion still src/Root.tsx CreteSwimToday out/still-pick.png --frame=160 2>&1 | tail -3
npx remotion still src/Root.tsx CreteSwimToday out/still-alt.png --frame=320 2>&1 | tail -3
ls -la out/still-*.png'
# pull stills for visual review
scp kairos-vps:/opt/cretepulse-video/out/still-hook.png kairos-vps:/opt/cretepulse-video/out/still-pick.png kairos-vps:/opt/cretepulse-video/out/still-alt.png /c/Users/fkerj/Desktop/
```
Expected: 3 PNG produced, each > 30 KB. Open them: verify Kalimera charter, Kriri visible, animated tiles, NO photo, readable. (Default props come from `src/Root.tsx` `defaultProps` for CreteSwimToday — if those are minimal, the stills still prove the layout renders.)

- [ ] **Step 4: Commit**

```bash
git add src/compositions/CreteSwimToday.tsx
git commit -m "feat(reel): redesign CreteSwimToday — Kalimera graphic + Kriri presenter, no photos, animated"
```

---

### Task 5: Vérification bout-en-bout avec vraies données + pipeline/cron

**Files:**
- Test: rendu réel via `render-beach-today.mjs` sur le VPS (script INCHANGÉ)

- [ ] **Step 1: Full pipeline render with today's real feed (no upload)**

```bash
ssh kairos-vps 'cd /opt/cretepulse-video && set -a && . .env.local && set +a && node --env-file=.env.local scripts/render-beach-today.mjs 2>&1 | tail -20'
```
Expected: VO Kokoro generated, Whisper captions, `[6] Render → out/crete-swim-YYYY-MM-DD.mp4`, `Done. X MB`. The render must succeed with the NEW composition fed by real props (proves schema compatibility end-to-end).

- [ ] **Step 2: Pull the MP4 + a still for review**

```bash
D=$(ssh kairos-vps 'TZ=Europe/Athens date +%F')
scp "kairos-vps:/opt/cretepulse-video/out/crete-swim-$D.mp4" /c/Users/fkerj/Desktop/
```
Open the MP4: verify the reel is dynamic (Kriri presenting, animated counters, graphic backgrounds, captions synced to VO, transitions), NO photos, on-brand. This is the human acceptance gate.

- [ ] **Step 3: Confirm the daily cron pipeline is intact**

```bash
ssh kairos-vps 'grep -n render-beach-today /etc/cron.d/cretepulse-daily-video; echo "--- wrapper unchanged ---"; head -5 /opt/cretepulse-video/bin/render-beach-today.sh'
```
Expected: cron `0 6 * * *` (09:00 Athens) still calls `render-beach-today.sh`, wrapper still chains render + upload IG + FB. No change needed (we only swapped the composition the renderer uses).

- [ ] **Step 4: Commit the Windows mirror (convention) + note**

The `.mp4`/`out/` artifacts are not committed. Ensure all source commits (Tasks 1–4) are done. If the home monorepo tracks `cretepulse-video/src`, commit there per convention; otherwise the per-file commits above stand.

---

## Self-Review

**1. Spec coverage (chantier 1 du spec `2026-06-13-meta-editorial-line-design.md`):**
- Garde pipeline feed→VO Kokoro→Whisper→render→IG+FB, cron 09:00 → Task 5 (script inchangé) ✓
- Refonte compo via motion-design-system, fini le slideshow → Task 4 (timeline + transitions + spring/counters) ✓
- Kriri présentateur (hello/alert selon conditions) → Tasks 2 + 4 (moodFromConditions, KriKri dans chaque scène) ✓
- Abstraction lumineuse, PAS de photo plein cadre → Task 3 AbstractBg, Task 4 retire PhotoBg/Img ✓
- Compteurs stats animés (seaTemp, wind) → Task 3 StatTile + Task 4 PickScene ✓
- Captions VO mot-à-mot → Task 4 (Captions réactivé) ✓
- Outro CTA brandée → Task 4 OutroScene ✓
- 1080×1920, durée = VO (totalFrames) → inchangé (Root.tsx + schema gardés) ✓
- Charte Kalimera (palette, Baloo/Geist) → Task 1 helpers C + RATING ✓

**2. Placeholder scan:** aucun TODO/TBD. Tout le code est complet. Note explicite Task 3 Step 4 : retirer la ligne morte `const bg` dans StatTile (signalée, pas un placeholder).

**3. Type consistency:** `creteSwimTodaySchema` / `CreteSwimTodayProps` exportés à l'identique (render-beach-today.mjs construit `{dateLabel, wind, pick, alternatives, voiceoverSrc, captions, totalFrames}` — tous consommés). `KriMood` (helpers) = `"hello"|"alert"|"empty"|"lost"` ; `moodFromConditions` renvoie `hello`/`alert`, et `PickScene` type `mood: "hello"|"alert"` (sous-ensemble, compatible). `C`/`RATING` importés depuis helpers, plus de duplication. `KriKri` prop `mood` accepte les 4 humeurs.

## Versioning du miroir (note)
Le miroir Windows `cretepulse-video` est suivi par le monorepo home (whitelist) OU à committer en convention. Si `git add` dans `cretepulse-video` échoue (dossier ignoré), faire les commits depuis la racine monorepo si whitelisté, sinon livrer par `scp` au VPS (source de rendu) — le versioning suit la convention du projet, ne pas bloquer le chantier dessus. Vérifier `git -C /c/Users/fkerj/cretepulse-video status` au début.

## Restes / hors plan
- Retouches visuelles carrousel (date capitalize, contraste petit texte) signalées par Kami « pour les prochains posts » — même charte, à appliquer au template carrousel séparément (hors ce plan vidéo).
- A/B éventuel durée/rythme, géotag, Short YouTube : itérations futures.
