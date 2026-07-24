# Kalimera Re-skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skinner tout crete.direct dans la DA Kalimera validée par Kami : Baloo 2 voix unique, wordmark dessiné, palette lagon/nuit/soleil, tout très rond, île carte live, board nuit, photo traitée, kri-kri, zéro flèche et zéro tiret cadratin.

**Architecture:** Le levier principal est le remap des tokens existants (`globals.css @theme`) vers les valeurs Kalimera : tout le site (24K pages) glisse d'un coup, puis les composants signature sont re-skinnés un à un en suivant les mockups archivés `docs/design/kalimera/*.html` qui sont LE cahier des charges (leur CSS se transpose littéralement). Spec : `docs/superpowers/specs/2026-06-11-brand-da-kalimera-design.md`.

**Tech Stack:** Next.js 16, Tailwind v4 (@theme), next/font (Baloo 2 + Geist, Playfair et Geist Mono SUPPRIMÉS), SVG inline (wordmark, île, kri-kri), libs data existantes inchangées.

**Conventions repo:** auteur `kerjeanfrancois29`, stage SÉLECTIF (terminal explore/beaches actif), push master+main en fin de plan, jamais dev+build simultanés, tuer port 3000 après Playwright (pas le 3457). RÈGLES DURES : aucun « → » dans les libellés, aucun « — » nulle part (séparateur : « · »).

---

### Task 1: Tokens Kalimera + Baloo 2 (le grand glissement)

**Files:**
- Modify: `src/app/globals.css` (@theme + utilities)
- Modify: `src/app/layout.tsx` (fonts)
- Modify: `src/app/[locale]/layout.tsx` (variables html)

- [ ] **Step 1: Remap des tokens dans `globals.css`**

Remplacer le bloc de couleurs du `@theme` par (mêmes NOMS pour héritage global, valeurs Kalimera, + nouveaux noms) :

```css
@theme {
  /* Kalimera : remap des roles existants (tout le site glisse) */
  --color-aegean: #0B5E78;        /* ex bleu marine -> mer profonde */
  --color-aegean-light: #2E7DB2;
  --color-aegean-faint: #DFF7FA;
  --color-terra: #ED7A5C;         /* terracotta vive */
  --color-terra-light: #F29A82;
  --color-terra-faint: #FDEEE9;
  --color-olive: #7C9A53;
  --color-olive-light: #9BB573;
  --color-sand: #FFF3D6;
  --color-sand-warm: #F2E7CE;
  --color-stone: #EDF6F8;
  --color-stone-warm: #E2EEF1;
  --color-surface: #F6FBFC;
  --color-text: #0B3954;
  --color-text-muted: #5C7886;
  --color-text-light: #94A3B8;
  --color-border: #DCE9EE;
  /* Nouveaux tokens signature */
  --color-lagoon: #00C2D4;
  --color-lagoon-deep: #008C9E;
  --color-sky: #BDEDF5;
  --color-night: #07374A;
  --color-sun: #FFC83D;
  --color-ok: #14B86B;
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
```
Puis dans les utilities du bas de fichier : `card-base` passe à `border-radius: 1.75rem`
(28px, choix « très rond ») et son ombre devient colorée :
`box-shadow: 0 12px 32px rgb(11 94 120 / 0.10)` au repos n'existe pas (repos = border) ;
le hover devient `box-shadow: 0 14px 36px rgb(11 94 120 / 0.16)`. `font-data` est remappé :

```css
@utility font-data {
  font-family: var(--font-heading), "Comfortaa", system-ui, sans-serif;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 2: Fonts dans `src/app/layout.tsx`**

Remplacer Playfair_Display et Geist_Mono par Baloo 2 (Geist conservé) :

```tsx
import { Geist } from "next/font/google";
import { Baloo_2 } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});
```
Dans `src/app/[locale]/layout.tsx` : `import { baloo } from "@/app/layout"` et
`className={baloo.variable}` (les imports playfair/geistMono disparaissent partout :
`grep -rn "playfair\|geistMono" src/` doit retourner 0 après).

- [ ] **Step 3: Vérifier + commit**

Run: `npx tsc --noEmit` → 0. Lancer `npm run dev` 30 s OU s'appuyer sur tsc seul (le rendu
sera validé en Task 12).
```bash
git add src/app/globals.css src/app/layout.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat(kalimera): token remap (lagoon palette) + Baloo 2 single voice, Playfair/Mono removed"
```

---

### Task 2: Wordmark (composant + favicon)

**Files:**
- Create: `src/components/Wordmark.tsx`
- Modify: `src/app/icon.svg`

- [ ] **Step 1: Composant Wordmark**

Les paths exacts sont dans `docs/design/kalimera/wordmark.html` (bloc « wordmark dessiné »).

```tsx
// Wordmark "cretedirect" dessine a la main : monoline ronde, c-spirale,
// i-soleil, vague sous "direct". LA "police" de la marque.
// Source des paths : docs/design/kalimera/wordmark.html
const PATHS = (
  <>
    <path d="M38 18 a16 16 0 1 0 14 24 M38 26 a8.5 8.5 0 1 0 6 14" className="text-lagoon-deep" stroke="currentColor" />
    <path d="M64 52 V30 M64 38 q4 -9 13 -9" />
    <path d="M88 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
    <path d="M126 14 V44 a8 8 0 0 0 8 8 M118 28 h16" />
    <path d="M148 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
    <path d="M210 12 V52 M210 41 a11.5 11.5 0 1 1 -11.5 -11.5" />
    <path d="M228 30 V52" />
    <circle cx="228" cy="15.5" r="6" fill="#FFC83D" stroke="none" />
    <path d="M228 5.5 v3 M228 22.5 v3 M218 15.5 h3 M235 15.5 h3" stroke="#FFC83D" strokeWidth="2.6" />
    <path d="M246 52 V30 M246 38 q4 -9 13 -9" />
    <path d="M270 41 h22 a11.5 11.5 0 1 0 -3.4 8" />
    <path d="M324 32 a11.5 11.5 0 1 0 0 17" />
    <path d="M340 14 V44 a8 8 0 0 0 8 8 M332 28 h16" />
    <path d="M196 66 q9 -7 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 t18 0" stroke="#00C2D4" strokeWidth="4.5" />
  </>
);

export function Wordmark({ variant = "light", width = 128 }: {
  /** light = encre sur fond clair ; dark = creme sur fond nuit */
  variant?: "light" | "dark";
  width?: number;
}) {
  return (
    <svg
      width={width}
      height={Math.round(width * 74 / 460)}
      viewBox="0 0 460 74"
      fill="none"
      stroke={variant === "dark" ? "#FAF6EC" : "#0B3954"}
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="cretedirect"
      role="img"
    >
      {PATHS}
    </svg>
  );
}
```
Note : le `className="text-lagoon-deep" stroke="currentColor"` du c-spirale : en variante
dark le c passe lagon clair → gérer par prop : `stroke={variant === "dark" ? "#00C2D4" : "#008C9E"}`
directement sur ce path (pas de className).

- [ ] **Step 2: Favicon**

`src/app/icon.svg` : fond nuit arrondi + c-spirale et point-soleil compacts :
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="9" fill="#07374A"/>
  <path d="M14 8 a9.5 9.5 0 1 0 8.3 14.2 M14 12.8 a5 5 0 1 0 3.6 8.3" stroke="#00C2D4" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="24" cy="9" r="3.2" fill="#FFC83D"/>
</svg>
```

- [ ] **Step 3: tsc + commit**

```bash
git add src/components/Wordmark.tsx src/app/icon.svg
git commit -m "feat(kalimera): hand-drawn wordmark component + spiral-sun favicon"
```

---

### Task 3: Header nav pilule + suppression LiveBar bandeau

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Create: `src/components/LivePill.tsx`
- Modify: `src/app/[locale]/layout.tsx` (retirer `<LiveBar/>`)
- Delete: usage de `src/components/LiveBar.tsx` (fichier conservé, plus monté)

- [ ] **Step 1: LivePill (client)**

```tsx
"use client";
// Pastille LIVE + heure Athens dans la nav (remplace le bandeau LiveBar).
import { useEffect, useState } from "react";

export function LivePill() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens",
    }));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-sun text-text font-heading font-bold text-[13px] px-4 py-2">
      <span className="w-2 h-2 rounded-full bg-[#0E9F5C]" />
      LIVE{time ? ` ${time}` : ""}
    </span>
  );
}
```

- [ ] **Step 2: Header re-skin**

Référence visuelle : `docs/design/kalimera/home-v8.html` bloc `.nav-pill`. Modifications
dans `Header.tsx` (la mécanique NAV_GROUPS/locale/mobile est conservée) :
- Le `<nav>` racine : `sticky top-3.5 z-50 mx-auto max-w-6xl px-4` ; à l'intérieur une
  div `flex items-center justify-between rounded-full bg-white/88 backdrop-blur-xl
  px-3.5 py-2.5 pl-5 shadow-[0_8px_30px_rgba(11,94,120,.14)]` (l'effet `scrolled` actuel
  est supprimé : la pilule est constante).
- Le logo texte CRETE/CiMark/DIRECT est remplacé par `<Wordmark width={128} />`.
- Les triggers de groupe actifs : `bg-text text-white rounded-full px-4 py-2`.
- À droite : `<LivePill />` remplace le simple lien Search ? NON : Search + LocaleSwitcher
  conservés, LivePill ajoutée avant eux.
- Aucune flèche ni tiret dans les libellés.

- [ ] **Step 3: Retirer le bandeau LiveBar**

`src/app/[locale]/layout.tsx` : supprimer `<LiveBar locale={locale} />` et son import.
(Le fichier LiveBar.tsx reste dans le repo : ses données/format servent de référence,
suppression définitive dans un cleanup futur.)

- [ ] **Step 4: tsc + commit**

```bash
git add src/components/layout/Header.tsx src/components/LivePill.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat(kalimera): pill nav with wordmark + LIVE pill, LiveBar banner retired"
```

---

### Task 4: Système d'images (photo traitée + abstraction)

**Files:**
- Modify: `src/components/CardThumb.tsx`
- Create: `src/components/AbstractFallback.tsx`

- [ ] **Step 1: AbstractFallback**

```tsx
// Fallback "abstraction lumineuse" : gradients organiques par categorie + grain.
// Remplace tous les fallbacks gradient lineaires. Jamais figuratif.
const COMPS: Record<string, string> = {
  sea: `radial-gradient(90px 70px at 78% 22%, rgba(255,200,61,.9), rgba(255,200,61,0) 70%),
        radial-gradient(200px 140px at 20% 85%, rgba(11,94,120,.85), rgba(11,94,120,0) 75%),
        linear-gradient(165deg, #BDEDF5, #00C2D4 70%)`,
  land: `radial-gradient(110px 80px at 24% 20%, rgba(237,122,92,.9), rgba(237,122,92,0) 72%),
         radial-gradient(240px 150px at 75% 80%, rgba(124,154,83,.9), rgba(124,154,83,0) 78%),
         linear-gradient(160deg, #FFF3D6, #F2E0B4 70%)`,
  news: `radial-gradient(90px 70px at 70% 25%, rgba(0,194,212,.85), rgba(0,194,212,0) 70%),
         radial-gradient(200px 130px at 25% 85%, rgba(7,55,74,.8), rgba(7,55,74,0) 75%),
         linear-gradient(165deg, #DFF7FA, #8FE0EC 70%)`,
};

export function AbstractFallback({ kind = "sea", className = "" }: {
  kind?: "sea" | "land" | "news";
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 ${className}`} style={{ background: COMPS[kind] }}>
      <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay" aria-hidden>
        <filter id={`kgrain-${kind}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter={`url(#kgrain-${kind})`} />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: CardThumb → traitement photo signature**

Remplacer le voile « aegean multiply » et les FALLBACK_GRADIENTS :

```tsx
import Image from "next/image";
import { AbstractFallback } from "./AbstractFallback";

const KIND: Record<string, "sea" | "land" | "news"> = {
  news: "news", guide: "land", daily: "sea", default: "sea",
};

export function CardThumb({ src, alt, category = "default", className = "" }: {
  src: string | null;
  alt: string;
  category?: string;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden ${className}`}>
      {src ? (
        <>
          <Image src={src} alt={alt} fill className="object-cover saturate-[1.08]" sizes="(max-width: 768px) 100vw, 33vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-lagoon/5 via-transparent to-night/40 pointer-events-none" />
          <svg className="absolute inset-0 w-full h-full opacity-25 mix-blend-overlay pointer-events-none" aria-hidden>
            <filter id="ktreat"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /></filter>
            <rect width="100%" height="100%" filter="url(#ktreat)" />
          </svg>
        </>
      ) : (
        <AbstractFallback kind={KIND[category] ?? "sea"} />
      )}
    </div>
  );
}
```
Appliquer le même traitement dans `articles-shared.tsx` (GuideCard : remplacer le voile
`bg-aegean/10 mix-blend-multiply` + saturate(.88) par `saturate-[1.08]` + voile lagon→nuit ;
GuideCardFallback → `<AbstractFallback kind="land"/>` en gardant l'icône catégorie par-dessus
si souhaité, sinon la retirer).

- [ ] **Step 3: tsc + commit**

```bash
git add src/components/CardThumb.tsx src/components/AbstractFallback.tsx "src/app/[locale]/articles/articles-shared.tsx"
git commit -m "feat(kalimera): signature photo treatment (lagoon veil + grain) + luminous abstract fallbacks"
```

---

### Task 5: DepBoard (board nuit des départs)

**Files:**
- Create: `src/components/DepBoard.tsx`

- [ ] **Step 1: Composant**

Référence : `docs/design/kalimera/home-v8.html` bloc `.dep-card`. Client (heure locale) :

```tsx
"use client";
// Board nuit des prochains departs : signature "donnees live" (style Flighty).
// Calcule les N prochains departs toutes lignes confondues via timesForDate.
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { timesForDate } from "@/lib/bus-journey";
import type { BusRoute } from "@/lib/buses";
import { CiBus } from "@/components/icons";

const T = {
  title: { en: "Next buses", fr: "Prochains bus", de: "Nächste Busse", el: "Επόμενα λεωφορεία" },
  plan: { en: "Plan a journey", fr: "Planifier un trajet", de: "Fahrt planen", el: "Σχεδιασμός" },
  inMin: { en: (m: number) => `in ${m} min`, fr: (m: number) => `dans ${m} min`, de: (m: number) => `in ${m} Min`, el: (m: number) => `σε ${m}’` },
  last: { en: "last today", fr: "dernier du jour", de: "letzter heute", el: "τελευταίο" },
};

interface NextDep { from: string; to: string; time: string; inMin: number; isLast: boolean; price: number | null }

function athens(): { iso: string; minutes: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { iso: `${g("year")}-${g("month")}-${g("day")}`, minutes: (parseInt(g("hour")) % 24) * 60 + parseInt(g("minute")) };
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

export function DepBoard({ routes, locale, count = 3 }: { routes: BusRoute[]; locale: string; count?: number }) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as keyof typeof T.title;
  const [deps, setDeps] = useState<NextDep[]>([]);

  useEffect(() => {
    const { iso, minutes } = athens();
    const out: NextDep[] = [];
    for (const r of routes) {
      const times = timesForDate(r, iso).map(toMin).sort((a, b) => a - b);
      const idx = times.findIndex((m) => m >= minutes);
      if (idx === -1) continue;
      const m = times[idx];
      out.push({
        from: r.from_place, to: r.to_place,
        time: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
        inMin: m - minutes, isLast: idx === times.length - 1,
        price: r.price_eur ?? null,
      });
    }
    out.sort((a, b) => a.inMin - b.inMin);
    // dedup par paire from->to (garder le plus proche)
    const seen = new Set<string>();
    setDeps(out.filter((d) => { const k = `${d.from}>${d.to}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, count));
  }, [routes, count]);

  if (deps.length === 0) return null;
  return (
    <div className="bg-night text-[#EAF7FA] rounded-[30px] px-7 py-6 pb-4 shadow-[0_24px_60px_rgba(7,55,74,.4)]">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-heading font-bold text-lg inline-flex items-center gap-2.5">
          <span className="bg-lagoon text-night rounded-xl p-2 inline-flex"><CiBus className="w-[19px] h-[19px]" /></span>
          {T.title[ui]}
        </span>
        <Link href="/buses" className="bg-lagoon text-night rounded-full px-4 py-2 text-[13.5px] font-heading font-bold">
          {T.plan[ui]}
        </Link>
      </div>
      <div className="font-data">
        {deps.map((d) => (
          <div key={`${d.from}-${d.to}`} className="grid grid-cols-[1fr_auto_auto_auto] gap-5 items-center py-3 border-t border-[#EAF7FA]/12">
            <span className="font-semibold">{d.from} <span className="text-lagoon mx-1">·</span> {d.to}</span>
            <span className="text-[25px] font-bold">{d.time}</span>
            <span className={`text-[13px] font-bold rounded-full px-3 py-1.5 ${d.isLast ? "bg-sun/16 text-sun" : "bg-ok/18 text-[#43E89D]"}`}>
              {d.isLast ? T.last[ui] : T.inMin[ui](d.inMin)}
            </span>
            <span className="text-right text-[#EAF7FA]/55 text-sm w-16">{d.price != null ? `${d.price.toFixed(2)} €` : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```
La home (Task 8) lui passera les routes des liaisons principales (sélection :
`getBusRoutes()` filtrées sur les paires Heraklion-Chania / Heraklion-Ierapetra /
Chania-Paleochora + autres dignes, le composant gère le tri).

- [ ] **Step 2: tsc + commit**

```bash
git add src/components/DepBoard.tsx
git commit -m "feat(kalimera): night departures board (semantic live statuses)"
```

---

### Task 6: CreteMap (l'île carte live)

**Files:**
- Create: `src/components/CreteMap.tsx`

- [ ] **Step 1: Composant**

Path et pins : `docs/design/kalimera/home-v8.html` bloc `.island-card`. Le path à main
levée du mockup est conservé en v1 (élément semi-décoratif) ; les positions de pins sont
CALIBRÉES sur ce path via un mapping ville→{left%, top%} statique (PAS du lat/lng projeté,
le path n'est pas géoréférencé) :

```tsx
// L'ile de Crete en carte vivante : silhouette + pins live.
// v1 : path stylise (docs/design/kalimera/home-v8.html), positions calibrees.
// v2 future : path genere depuis geojson reel + projection lat/lng.
import type { CityWeather } from "@/lib/weather";

const CITY_POS: Record<string, { left: string; top: string }> = {
  "Chania": { left: "13%", top: "26%" },
  "Rethymno": { left: "27%", top: "28%" },
  "Heraklion": { left: "43%", top: "30%" },
  "Ag. Nikolaos": { left: "63%", top: "34%" },
  "Ierapetra": { left: "66%", top: "62%" },
  "Sitia": { left: "84%", top: "38%" },
};

export function CreteMap({ cities, swimPin, locale, updatedLabel }: {
  cities: CityWeather[];
  /** Pin terracotta de la plage du jour : { name, left, top } calibre cote appelant. */
  swimPin?: { name: string; left: string; top: string } | null;
  locale: string;
  updatedLabel?: string;
}) {
  const shown = cities.filter((c) => CITY_POS[c.name]).slice(0, 4);
  return (
    <div className="relative bg-white/58 backdrop-blur-md rounded-[30px] px-6 py-5 pb-3 shadow-[0_18px_50px_rgba(11,94,120,.22)]">
      <div className="relative">
        <svg viewBox="0 0 460 150" className="w-full block" aria-hidden>
          <defs>
            <linearGradient id="kisland" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#9CCB72" /><stop offset=".55" stopColor="#7C9A53" /><stop offset="1" stopColor="#C9A36A" />
            </linearGradient>
          </defs>
          <path d="M14 84 C18 70 30 62 38 56 C40 44 46 30 54 30 C60 30 60 44 64 50 C70 44 76 32 84 32 C92 32 90 46 96 52 C104 44 112 36 122 38 C132 40 130 50 138 54 C160 48 184 50 204 56 C224 62 244 64 264 60 C272 50 282 44 290 48 C296 51 294 58 300 60 C320 56 342 58 360 64 C380 70 404 72 422 80 C436 86 446 92 444 100 C440 110 420 106 404 108 C380 112 356 118 332 114 C306 110 282 116 258 112 C232 108 206 112 182 106 C158 100 132 104 110 96 C88 90 64 94 44 90 C28 88 10 96 14 84 Z" fill="url(#kisland)" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round" />
        </svg>
        {shown.map((c) => (
          <div key={c.name} className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5" style={CITY_POS[c.name]}>
            <span className="bg-text text-white rounded-[11px] px-2.5 py-1 text-xs font-heading font-bold whitespace-nowrap font-data">{c.name} {c.temp}°</span>
            <span className="w-2.5 h-2.5 rounded-full bg-text border-[2.5px] border-white" />
          </div>
        ))}
        {swimPin && (
          <div className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5" style={{ left: swimPin.left, top: swimPin.top }}>
            <span className="bg-terra text-white rounded-[11px] px-2.5 py-1 text-xs font-heading font-bold whitespace-nowrap">≈ {swimPin.name}</span>
            <span className="w-2.5 h-2.5 rounded-full bg-terra border-[2.5px] border-white" />
          </div>
        )}
      </div>
      {updatedLabel && <p className="text-right text-[11.5px] text-text-muted m-0 pt-1.5">{updatedLabel}</p>}
    </div>
  );
}
```
swimPin côté home : positionnement approximatif par région de la plage du jour
(south → `{left:"40%", top:"80%"}`, west → `{left:"18%", top:"70%"}`, east →
`{left:"72%", top:"70%"}`, central/north → `{left:"45%", top:"55%"}` ; le champ région
vient de `swim.pick.beach.region`).

- [ ] **Step 2: tsc + commit**

```bash
git add src/components/CreteMap.tsx
git commit -m "feat(kalimera): CreteMap live island card with city pins + swim pin"
```

---

### Task 7: KriKri (mascotte, 4 états)

**Files:**
- Create: `src/components/KriKri.tsx`
- Modify: `src/app/[locale]/[...rest]/page.tsx` OU le not-found réel (localiser :
  `grep -rn "notFound\|not-found" src/app --include=*.tsx -l | head`, viser le template 404)

- [ ] **Step 1: Composant**

Paths exacts : `docs/design/kalimera/krikri.html` (def `#kk-base` + variantes d'yeux par
état). Composant : `KriKri({ mood = "hello", className })` avec `mood: "hello" | "alert"
| "empty" | "lost"` ; transposer les 4 `<svg>` du mockup en JSX (un seul composant, le
`<g id="kk-base">` devient un fragment partagé, les yeux/bouche varient par mood).
Reprendre les paths du mockup à l'identique (cornes, oreilles, tête, museau, barbiche ;
yeux spirale pour lost).

- [ ] **Step 2: Intégrer au 404 + état vide du planificateur**

- 404 : ajouter `<KriKri mood="lost" className="w-28 h-24 mx-auto" />` + micro-copy
  « Oups, perdue ! » localisée (en : "Oops, lost!", fr : "Oups, perdue !", de : "Hoppla,
  verlaufen!", el : "Ωχ, χαθήκαμε!") au-dessus du lien retour existant.
- JourneyPlanner : dans le bloc `noJourney`, ajouter `<KriKri mood="empty" className="w-20 h-16" />`
  à gauche du message existant (flex).

- [ ] **Step 3: tsc + commit**

```bash
git add src/components/KriKri.tsx <fichier 404> "src/app/[locale]/buses/JourneyPlanner.tsx"
git commit -m "feat(kalimera): kri-kri mascot (4 moods) on 404 and empty states"
```

---

### Task 8: Home re-skin (cahier des charges home-v8.html)

**Files:**
- Modify: `src/components/home/HomeClient.tsx`
- Modify: `src/app/[locale]/page.tsx` (ajouter routes bus pour DepBoard)

- [ ] **Step 1: Données**

`page.tsx` : ajouter `getBusRoutes()` au Promise.all, filtrer les routes des 6 paires
principales (slugs : heraklion-to-chania, heraklion-to-ierapetra, chania-to-paleochora,
heraklion-to-agios-nikolaos via `pairSlug`) et passer `boardRoutes` à HomeClient.

- [ ] **Step 2: HomeClient → structure home-v8**

Transposer `docs/design/kalimera/home-v8.html` section par section (le CSS du mockup est
la vérité ; classes Tailwind équivalentes) :
1. Hero : gradient `bg-gradient-to-b from-sky via-[#8FE0EC] to-lagoon`, sunball
   (div radial-gradient + shadow), greet pill « Καλημέρα ! {date} · en direct de l'île »
   (Καλημέρα avant 12h Athens, Καλησπέρα après 17h, Γεια σου entre les deux), h1 Baloo
   58px avec `.hl` blanc ombré, sub, chips (CTA `bg-sun text-text`), à droite `<CreteMap/>`,
   vague séparatrice SVG (path du mockup) vers le contenu.
2. `<DepBoard routes={boardRoutes} locale={locale}/>` en chevauchement (-mt-20, z-5).
3. « L'île, maintenant » : tuiles couleur pleine `bg-lagoon text-night` / `bg-aegean text-white`
   alternées (classes du mockup `.wtile.sunny/.seay` v8 = lagon/mer pleins), deg 48px font-data,
   pills mer sur fond blanc translucide, mini-sun.
4. « Où se baigner aujourd'hui » : pick-hero photo traitée (gradient lagon→nuit + grain,
   transposer `.pick-hero`) + 2 pside (1 photo, 1 AbstractFallback sea).
5. Outils : 6 tuiles pastel c1-c6 du mockup (icônes Ci*).
6. News/Guides : news-card blanche ronde avec heures lagon ; guides en gcard 112px
   image traitée/AbstractFallback land.
7. Newsletter bande sable (transposer `.newsletter`).
8. Footer : VOIR Task 10 (composant Footer commun, pas dans HomeClient).
RÈGLES : zéro « → », zéro « — », tout texte séparé par « · ».

- [ ] **Step 3: tsc + commit**

```bash
git add src/components/home/HomeClient.tsx "src/app/[locale]/page.tsx"
git commit -m "feat(kalimera): home reskinned to home-v8 reference (hero island, board, full-color tiles)"
```

---

### Task 9: Pages bus (pair + planner + index)

**Files:**
- Modify: `src/app/[locale]/buses/[pair]/page.tsx`
- Modify: `src/app/[locale]/buses/JourneyPlanner.tsx`
- Modify: `src/app/[locale]/buses/BusesClient.tsx`
- Modify: `src/components/TaxiCompare.tsx`

- [ ] **Step 1: Page paire → bus.html**

Transposer `docs/design/kalimera/bus.html` :
- En-tête : gradient doux `from-sky to-surface`, breadcrumb sans flèche (« Toutes les
  lignes de bus » pill), titre « Heraklion ⇄ Ierapetra » (le ⇄ dans une pastille blanche
  ronde entre les deux noms), NextDeparture devient la next-pill nuit (style `.next-pill`),
  meta-chips (prix · durée · fréquence · opérateur).
- DirectionSection : carte 28px ; les horaires deviennent des `tchip` (passées :
  `opacity-40`, prochaine : `bg-lagoon border-lagoon text-night`) ; la logique passé/prochain
  est CLIENT (heure Athens) : extraire un petit composant client `TimeChips({ route, locale })`
  qui rend la grille de chips avec états (réutilise `timesForDate` + athens() du DepBoard,
  helpers dupliqués acceptables ou exportés d'un `src/lib/athens-time.ts` créé ici :
  `export function athensNow(): { iso: string; minutes: number }` + `export const toMin`).
- TaxiCompare → bande sable `.taxi` du mockup (fond sand, icône bulle sun, CTA pill nuit).
- Onward en opills.
- Disclaimer en `.notice` jaune doux arrondi.

- [ ] **Step 2: Planner + index**

- JourneyPlanner : selects/date stylés pills (rounded-full, border-border), JourneyCard
  arrondie 24px, en-tête de carte `bg-night` au lieu d'aegean.
- BusesClient : titres Baloo (héritent), conserver structure ; remplacer les anciens
  styles d'encadrés par card-base.

- [ ] **Step 3: tsc + checks + commit**

Run: `npx tsc --noEmit` ; `node scripts/check-bus-journey.mjs` ; `node scripts/check-bus-pairs.mjs`.
```bash
git add "src/app/[locale]/buses" src/components/TaxiCompare.tsx src/lib/athens-time.ts
git commit -m "feat(kalimera): bus pages reskinned (time chips with live states, sand taxi band)"
```

---

### Task 10: Footer commun + beach finder + sweep composants

**Files:**
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/app/[locale]/beaches/today/page.tsx`
- Modify: `src/components/PromoBox.tsx`, `src/components/ui/affiliate-banner.tsx`

- [ ] **Step 1: Footer → home-v8 footer**

Transposer le footer du mockup : vague d'entrée SVG, fond night, `<Wordmark variant="dark"/>`,
tagline « Le compagnon pratique de la Crète. Données live, gratuit, indépendant. Fait sur
l'île. » (4 langues, fallback EN), colonnes Planifier/Découvrir/Aujourd'hui (liens existants
regroupés comme la nav), legal « © 2026 Crete Direct · Fait en Crète ☀ ». Conserver les
liens/SEO existants du Footer actuel (ne supprimer aucun lien, seulement regrouper).

- [ ] **Step 2: Beach finder → beach.html**

Transposer : hero gradient + greet + h1 « Où se baigner aujourd'hui ? » (hl blanc),
pick-card photo traitée + pick-stats, vague séparatrice, grille bcard par région avec
pills verdicts (ok/fair/no du mockup), bandeau stations night arrondi (st-grid).
La logique data (buildSwimToday) ne change pas, seul le rendu.

- [ ] **Step 3: PromoBox + AffiliateBanner pills**

- PromoBox : `rounded-[26px] bg-aegean-faint border-lagoon/20`, CTA `bg-sun text-text
  rounded-full` (plus de flèche ArrowRight : la retirer).
- AffiliateBanner (v3 de l'autre terminal, gradient sombre animé) : NE PAS toucher le
  fond animé (son A/B test CTR court) ; seulement arrondir à 26px et vérifier zéro flèche.

- [ ] **Step 4: tsc + commit**

```bash
git add src/components/layout/Footer.tsx "src/app/[locale]/beaches/today/page.tsx" src/components/PromoBox.tsx src/components/ui/affiliate-banner.tsx
git commit -m "feat(kalimera): night wave footer, beach finder reskin, promo pills"
```

---

### Task 11: OG + chasse aux interdits

**Files:**
- Modify: `src/app/api/og/route.tsx`
- Divers (grep)

- [ ] **Step 1: OG Kalimera**

Re-skinner le template : fond `#F6FBFC`, bandeau supérieur `#07374A` avec le wordmark
(les paths SVG inline, stroke crème, c-spirale lagon, i-soleil) + pastille LIVE verte,
titre Baloo-like (sans-serif system bold arrondi faute de fetch font), filet bas `#00C2D4`.
Supprimer le « — » éventuel des sous-titres par défaut (séparateur « · »).

- [ ] **Step 2: Chasse aux interdits**

```
grep -rn "—" src --include=*.tsx --include=*.ts | grep -v "//"   # tirets cadratins
grep -rn "→" src --include=*.tsx | grep -v "icons\|svg\|path"     # flèches dans libellés
grep -rn "#1B4965\|#B85C38\|Playfair\|font-mono" src --include=*.tsx --include=*.css
```
Remplacer chaque occurrence de libellé (les « → » dans les chaînes i18n inline : reformuler ;
les classes `font-mono` des chips horaires → `font-data`). Les anciens hex en dur →
tokens. Documenter les exceptions légitimes (aucune attendue côté libellés).

- [ ] **Step 3: tsc + commit**

```bash
git add -A -- src
git commit -m "feat(kalimera): OG reskin + purge of em dashes, arrows, legacy hex/fonts"
```

---

### Task 12: Vérifications + push + prod + mémoire

- [ ] **Step 1: Tests + build**

```
node scripts/check-taxi-fare.mjs && node scripts/check-taxi-partners.mjs && node scripts/check-bus-pairs.mjs && node scripts/check-bus-journey.mjs
npx tsc --noEmit
$env:SUPABASE_SERVICE_KEY="dummy"; npm run build   # EXIT 0
```

- [ ] **Step 2: Vérification visuelle (next start :3000)**

`AUDIT_BASE=http://localhost:3000 AUDIT_OUT=ui-audit-kalimera py -3 scripts/audit-ui-screenshots.py`
puis EXAMINER chaque capture contre les mockups `docs/design/kalimera/*.html` côte à côte.
Assertions : wordmark dans le header (path spirale présent), zéro « — » dans le HTML rendu
(`curl -s localhost:3000/en | grep -c "—"` = 0), home contient Καλημέρα ou Καλησπέρα,
DepBoard rendu, 404 contient le kri-kri. Tuer le port 3000 après.

- [ ] **Step 3: Push + prod + mémoire**

`git status` (stage sélectif), push master + master:main, poll Ready, vérif prod (home,
page paire, beach, 404), captures prod envoyées à Kami, session_log DEPLOY [FACT],
fiche projet Phase 14 « Re-skin Kalimera », MEMORY.md recousu.

## Self-review du plan

1. **Couverture spec :** tokens/palette → T1 ; Baloo 2 voix unique + suppression Playfair/Mono → T1 ;
   wordmark+favicon → T2 ; nav pilule + LIVE → T3 ; photo traitée + abstraction → T4 ;
   board nuit → T5 ; île carte live → T6 ; kri-kri (états vides/404, discret) → T7 ;
   home-v8 (hero île, CTA soleil, tuiles pleines, sable, aéré) → T8 ; bus chips → T9 ;
   footer vague + beach + promo → T10 ; OG + règles flèches/tirets → T11 ; vérifs → T12.
   Καλημέρα selon l'heure → T8. ✓
2. **Placeholders :** les transpositions référencent les mockups archivés (fichiers du repo,
   CSS exact) : référence concrète, pas TBD. Code complet fourni pour tout composant nouveau. ✓
3. **Cohérence :** `athensNow()` défini T9 (lib athens-time) mais utilisé T5 (DepBoard inline
   en local) : DepBoard a sa propre fonction locale `athens()` (autonome), T9 crée la lib
   pour TimeChips ; pas de conflit. `Wordmark(variant)` T2 utilisé T3/T10/T11 ✓ ;
   `AbstractFallback(kind)` T4 utilisé T8 ✓ ; `CreteMap(cities, swimPin)` T6 utilisé T8 ✓ ;
   `DepBoard(routes, locale)` T5 utilisé T8 ✓ ; `KriKri(mood)` T7 utilisé T7. ✓
