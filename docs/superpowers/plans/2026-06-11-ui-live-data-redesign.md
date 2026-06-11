# UI Live-Data Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refonte UI « données vivantes » : système unifié (typo 3 voix, carte unique, vignettes teintées, encart unique), barre live trans-site, home dashboard, hub articles hiérarchisé, utilitaire bus magnifié, header 3 univers, OG restylées.

**Architecture:** Fondations d'abord (utilities CSS + 3 composants partagés), puis la LiveBar dans le layout, puis les refontes page par page qui consomment ces fondations. Chaque tâche est committable seule. Spec : `docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md`.

**Tech Stack:** Next.js 16 App Router, Tailwind v4 (`@theme`/`@utility` dans globals.css), next/font (Geist, Playfair, + Geist_Mono à ajouter), MapLibre GL (déjà dépendance), libs data existantes (`weather.ts` fetchAllCitiesWeather/CityWeather, `swim-today.ts` buildSwimToday/SwimToday).

**Conventions repo:** auteur `kerjeanfrancois29`, stage SÉLECTIF (autre terminal actif sur explore/beaches — relire `git status` avant chaque commit), push master+main seulement en fin de plan, jamais dev+build simultanés, tuer les listeners 3000 après Playwright (le dev 3457 d'un autre terminal ne doit PAS être tué). Données réelles uniquement, jamais de valeur météo inventée.

---

### Task 1: Fondations — font-data, card-base, WindArrow

**Files:**
- Modify: `src/app/layout.tsx` (ajouter Geist_Mono)
- Modify: `src/app/globals.css` (utilities)
- Create: `src/components/WindArrow.tsx`

- [ ] **Step 1: Geist_Mono dans le layout racine**

Dans `src/app/layout.tsx`, suivre le pattern Playfair existant :
```tsx
import { Geist_Mono } from "next/font/google";

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-data",
});
```
et ajouter `geistMono.variable` à la className du `<html>` (à côté des variables existantes — lire la ligne réelle et l'étendre).

- [ ] **Step 2: Utilities globals.css**

Ajouter à la fin de `src/app/globals.css` :
```css
@utility font-data {
  font-family: var(--font-data), ui-monospace, monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

@utility card-base {
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl, 0.75rem);
  transition: box-shadow 150ms ease, transform 150ms ease;
}
.card-base:hover {
  box-shadow: 0 4px 16px rgb(27 73 101 / 0.10);
  transform: translateY(-2px);
}

@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@utility animate-live-pulse {
  animation: live-pulse 2.4s ease-in-out infinite;
}
```
Note Tailwind v4 : si `@utility` refuse le bloc `:hover` séparé, garder la règle `.card-base:hover` en CSS global simple (hors `@utility`) — c'est déjà ce que montre le snippet.

- [ ] **Step 3: WindArrow**

`src/components/WindArrow.tsx` :
```tsx
// Fleche orientee selon la direction du vent (meteo). windDir = direction
// D'OU vient le vent (convention meteo) -> la fleche pointe vers ou il VA.
import { Navigation } from "lucide-react";

export function WindArrow({ deg, className = "w-3.5 h-3.5" }: { deg: number; className?: string }) {
  return (
    <Navigation
      className={className}
      style={{ transform: `rotate(${(deg + 180) % 360}deg)` }}
      aria-label={`wind ${Math.round(deg)}°`}
    />
  );
}
```

- [ ] **Step 4: Vérifier + commit**

Run: `npx tsc --noEmit` → 0. `npm run build` n'est PAS requis ici (fin de plan).
```bash
git add src/app/layout.tsx src/app/globals.css src/components/WindArrow.tsx
git commit -m "feat(ui): design system foundations - mono data voice, unified card, wind arrow"
```

---

### Task 2: CardThumb + PromoBox + rebrand des encarts existants

**Files:**
- Create: `src/components/CardThumb.tsx`
- Create: `src/components/PromoBox.tsx`
- Modify: `src/components/ui/affiliate-banner.tsx` (adopter le style PromoBox)
- Modify: `src/app/[locale]/airbnb/[neighbourhood]/page.tsx` (~ligne 793 : bandeau noir/jaune → PromoBox)
- Modify: l'encart « Stay in eastern Crete » (localiser via `grep -rn "Stay in eastern" src/`) → PromoBox

- [ ] **Step 1: CardThumb**

`src/components/CardThumb.tsx` :
```tsx
// Vignette unifiee : ratio fixe + voile teintant aegean qui masque
// l'heterogeneite des photos scrapees + fallback gradient par categorie.
import Image from "next/image";

const FALLBACK_GRADIENTS: Record<string, string> = {
  news: "from-aegean to-aegean-light",
  guide: "from-olive to-olive-light",
  daily: "from-terra to-terra-light",
  default: "from-aegean-light to-olive-light",
};

export function CardThumb({ src, alt, category = "default", className = "" }: {
  src: string | null;
  alt: string;
  category?: string;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden rounded-t-xl ${className}`}>
      {src ? (
        <>
          <Image src={src} alt={alt} fill className="object-cover saturate-[.88]" sizes="(max-width: 768px) 100vw, 33vw" />
          <div className="absolute inset-0 bg-aegean/10 mix-blend-multiply pointer-events-none" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${FALLBACK_GRADIENTS[category] ?? FALLBACK_GRADIENTS.default}`} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: PromoBox**

`src/components/PromoBox.tsx` :
```tsx
// L'unique pattern d'encart cross-sell/funnel du site (remplace le bandeau
// noir/jaune Kairos, le style custom AffiliateBanner, l'encart "Stay in...").
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function PromoBox({ icon: Icon, title, line, ctaLabel, ctaHref, disclosure }: {
  icon: LucideIcon;
  title: string;
  line: string;
  ctaLabel: string;
  ctaHref: string;
  disclosure?: string; // ex "Partner link" — obligatoire pour l'affiliation
}) {
  return (
    <aside className="rounded-xl border border-aegean/15 bg-aegean-faint p-5 my-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-5 h-5 text-aegean shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-text m-0">{title}</p>
            <p className="text-sm text-text-muted m-0">{line}</p>
          </div>
        </div>
        <a href={ctaHref} target="_blank" rel="nofollow noopener sponsored"
           className="inline-flex items-center gap-1.5 rounded-lg bg-aegean text-white text-sm font-semibold px-4 py-2 hover:opacity-90 shrink-0">
          {ctaLabel} <ArrowRight className="w-4 h-4" />
        </a>
      </div>
      {disclosure && (
        <p className="text-[11px] uppercase tracking-wide text-text-light mt-2 mb-0">{disclosure}</p>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Rebrand des 3 encarts existants**

1. `affiliate-banner.tsx` : conserver son API/props et sa logique i18n, remplacer son rendu
   par la structure/classes de PromoBox (ou déléguer à PromoBox si les props s'alignent).
2. Bandeau Kairos airbnb (page.tsx ~793, fond noir + bouton jaune) : remplacer le JSX par
   `<PromoBox icon={Home} title={t.cta} line={...} ctaLabel={...} ctaHref={t.ctaLink} />`
   en réutilisant les chaînes localisées existantes du fichier (lignes ~127/198/267/336).
3. Encart « Stay in eastern Crete » (things-to-do) : même opération.
Lire chaque JSX réel avant remplacement ; ne pas toucher aux textes, seulement au style.

- [ ] **Step 4: Vérifier + commit**

Run: `npx tsc --noEmit` → 0.
```bash
git add src/components/CardThumb.tsx src/components/PromoBox.tsx src/components/ui/affiliate-banner.tsx "src/app/[locale]/airbnb/[neighbourhood]/page.tsx" <fichier things-to-do>
git commit -m "feat(ui): unified CardThumb + PromoBox, rebrand Kairos/affiliate/stay inserts"
```

---

### Task 3: LiveBar trans-site

**Files:**
- Create: `src/components/LiveBar.tsx`
- Modify: `src/app/[locale]/layout.tsx` (monter LiveBar au-dessus du Header)

- [ ] **Step 1: LiveBar (server component)**

`src/components/LiveBar.tsx` :
```tsx
// Barre de donnees live trans-site — la signature "compagnon pratique".
// Server component, cache 30 min, degrade en date seule si data KO.
// Hauteur FIXE (h-8) : zero layout shift.
import { fetchAllCitiesWeather, getWeatherIcon } from "@/lib/weather";
import { WindArrow } from "@/components/WindArrow";
import { Sun, Cloud, CloudRain, Waves } from "lucide-react";

export const revalidate = 1800;

const SEA_LABELS: Record<string, Record<string, string>> = {
  calm: { en: "calm sea", fr: "mer calme", de: "ruhige See", el: "ήρεμη θάλασσα" },
  moderate: { en: "moderate sea", fr: "mer modérée", de: "mäßige See", el: "μέτρια θάλασσα" },
  rough: { en: "rough sea", fr: "mer agitée", de: "raue See", el: "ταραγμένη θάλασσα" },
};
const UPDATED = { en: "updated", fr: "màj", de: "Stand", el: "ενημ." } as const;

function seaState(waveHeights: (number | null)[]): "calm" | "moderate" | "rough" {
  const ws = waveHeights.filter((w): w is number => w != null);
  if (!ws.length) return "calm";
  const max = Math.max(...ws);
  return max < 0.5 ? "calm" : max < 1.2 ? "moderate" : "rough";
}

function CodeIcon({ code }: { code: number }) {
  const icon = getWeatherIcon(code);
  const cls = "w-3.5 h-3.5";
  return icon === "sun" ? <Sun className={cls} /> : icon === "rain" ? <CloudRain className={cls} /> : <Cloud className={cls} />;
}

export async function LiveBar({ locale }: { locale: string }) {
  const ui = ["en", "fr", "de", "el"].includes(locale) ? locale : "en";
  let cities = null;
  try {
    cities = await fetchAllCitiesWeather();
  } catch { /* degrade */ }

  const now = new Date();
  const dateStr = now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Athens" });
  const timeStr = now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Athens" });

  const her = cities?.find((c) => c.name === "Heraklion");
  const cha = cities?.find((c) => c.name === "Chania");
  const sea = cities ? seaState(cities.map((c) => c.waveHeight)) : null;

  return (
    <div className="h-8 bg-[#143A52] text-sand/90 font-data text-[11px] overflow-hidden">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center gap-x-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" /> LIVE
        </span>
        {her && (
          <span className="inline-flex items-center gap-1">
            <CodeIcon code={her.weatherCode} /> {her.temp}° Heraklion
            <WindArrow deg={her.windDir} className="w-3 h-3" /> {her.windSpeed} km/h
          </span>
        )}
        {cha && (
          <span className="hidden sm:inline-flex items-center gap-1">
            <CodeIcon code={cha.weatherCode} /> {cha.temp}° Chania
            <WindArrow deg={cha.windDir} className="w-3 h-3" /> {cha.windSpeed} km/h
          </span>
        )}
        {sea && (
          <span className="hidden md:inline-flex items-center gap-1">
            <Waves className="w-3 h-3" /> {SEA_LABELS[sea][ui]}
          </span>
        )}
        <span className="ml-auto hidden sm:inline text-sand/60">{dateStr}</span>
        <span className="text-sand/60">{UPDATED[ui as keyof typeof UPDATED]} {timeStr}</span>
      </div>
    </div>
  );
}
```
Mode alerte feu : lire la source de `src/app/[locale]/fire-alerts/page.tsx` à l'exécution ;
si elle expose une lib réutilisable avec alertes actives, ajouter : alerte active → fond
`bg-terra` + texte de l'alerte à la place des items météo (même hauteur). Si la source est
inline dans la page (non extractible en <30 min), reporter le mode alerte (noter au commit).

- [ ] **Step 2: Monter dans le layout**

Dans `src/app/[locale]/layout.tsx`, juste avant le `<Header ...>` existant :
```tsx
import { LiveBar } from "@/components/LiveBar";
...
<LiveBar locale={locale} />
```

- [ ] **Step 3: Vérifier + commit**

Run: `npx tsc --noEmit` → 0. Vérif visuelle dans la tâche 10.
```bash
git add src/components/LiveBar.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat(ui): trans-site live data bar (weather, wind, sea state, pulse)"
```

---

### Task 4: Home « la Crète, aujourd'hui »

**Files:**
- Modify: `src/app/[locale]/page.tsx` (101 l. — ajouter buildSwimToday aux données)
- Modify: `src/components/home/HomeClient.tsx` (675 l. — refonte des sections)

Structure actuelle de HomeClient (repères lignes au 11/06) : hero news 80vh (l.145-193),
Marquee breaking (l.198-213), bandeau météo villes (l.218-243), stats NumberTicker
(l.246-269), grille 12 col news+guides+sidebar (l.291-525), Marquee events (l.530-547),
More guides (l.553-632), Explore aplats (l.636-671).

- [ ] **Step 1: Données — page.tsx**

Ajouter `buildSwimToday()` au Promise.all existant de `src/app/[locale]/page.tsx` et passer
`swim` (type `SwimToday | null`) à HomeClient. Conserver les fetchs existants (news, events,
guides, cities).

- [ ] **Step 2: Refonte HomeClient — structure cible**

Réécrire le JSX de `HomeClient` dans cet ordre (conserver les helpers existants
WeatherIcon/timeAgo/formatEventDate/NewsletterFormCompact et les props + `swim` ajouté) :

1. **Hero compact** (~40vh max, fond stone) :
   - Gauche : `<h1>` Playfair « Crete, today » localisé (en: "Crete, today", fr: "La Crète,
     aujourd'hui", de: "Kreta, heute", el: "Η Κρήτη σήμερα") + date longue + stats existantes
     en ligne discrète `font-data` (500+ beaches · 300+ villages · live data) — NumberTicker conservé.
   - Droite (md+) : carte « Where to swim today » : photo `swim.pick.imageUrl` (CardThumb ou
     Image direct avec overlay), nom de la plage, badge rating (calm=emerald/fair=amber/
     exposed=terra), `font-data` vent `swim.pick.windSpeed` km/h + WindArrow + seaTemp si
     présent, lien → `/${locale}/beaches/today`. Si `swim` null → tuile météo Heraklion à la place.
2. **Rangée météo régions** : 3 tuiles card-base compactes — Heraklion, Chania, Ierapetra
   (est/ouest/sud-est depuis `cities`) : temp `font-data` + CodeIcon + WindArrow + vent.
3. **Rangée outils** (grid 2×3 mobile / 6 desktop, card-base, icône lucide + titre + 1 ligne,
   4 langues) : Bus planner→`/buses` (Bus), Where to swim→`/beaches/today` (Waves),
   Explore→`/explore` (Compass), Airports→`/airport` (Plane), Airbnb data→`/airbnb`
   (BarChart3), Weather→`/weather` (Sun).
4. **Contenu 2 colonnes** (lg:grid-cols-2, sans sidebar) : News (8 max, CardThumb
   category="news" + titre + timeAgo) | Guides (6, CardThumb category="guide").
   Supprimer la sidebar ; **Marquee breaking et Marquee events : supprimés** (LiveBar les
   remplace) ; events intégrés : 3 prochains events en liste simple sous Guides.
5. **Newsletter** : bande pleine largeur sobre (bg-aegean-faint, NewsletterFormCompact centré).
6. **Explore** : 4 tuiles card-base (mêmes liens qu'actuellement, texte conservé), zéro aplat
   coloré — icône terra, texte text, fond blanc.
Imports Marquee retirés. Toute couleur hors tokens supprimée de ce fichier.

- [ ] **Step 3: Vérifier + commit**

Run: `npx tsc --noEmit` → 0. `node scripts/check-bus-pairs.mjs` (sanity imports) → OK.
```bash
git add "src/app/[locale]/page.tsx" src/components/home/HomeClient.tsx
git commit -m "feat(home): 'Crete, today' dashboard - swim pick hero, tools row, curated content"
```

---

### Task 5: Hub /articles

**Files:**
- Modify: `src/app/[locale]/articles/page.tsx`
- Create: `src/components/ArticlesHub.tsx` (client — filtres + load more)

- [ ] **Step 1: Lire la page actuelle et extraire les données**

`articles/page.tsx` charge déjà news+guides. La page server passe à `ArticlesHub` :
`{ featured, items, locale }` où featured = dernier guide éditorial avec image, items =
le reste, chaque item `{ slug, title, image_url, category ("news"|"guide"|"daily"), date }`
(mapper les catégories réelles : daily-news/daily-weather → "daily", catégories news → "news",
le reste → "guide" — lire les valeurs réelles dans lib/guides.ts).

- [ ] **Step 2: ArticlesHub client**

`src/components/ArticlesHub.tsx` :
```tsx
"use client";
// Hub articles : 1 a la une + filtres categorie + grille CardThumb + load more.
import { useState } from "react";
import Link from "next/link";
import { CardThumb } from "@/components/CardThumb";

const FILTERS = ["all", "news", "guide", "daily"] as const;
const FILTER_LABELS: Record<string, Record<string, string>> = {
  all: { en: "All", fr: "Tout", de: "Alle", el: "Όλα" },
  news: { en: "News", fr: "Actus", de: "News", el: "Νέα" },
  guide: { en: "Guides", fr: "Guides", de: "Guides", el: "Οδηγοί" },
  daily: { en: "Daily", fr: "Quotidien", de: "Täglich", el: "Καθημερινά" },
};
const PAGE = 24;

export interface HubItem {
  slug: string; title: string; image: string | null;
  category: "news" | "guide" | "daily"; date: string;
}

export function ArticlesHub({ featured, items, locale }: {
  featured: HubItem | null; items: HubItem[]; locale: string;
}) {
  const ui = ["en", "fr", "de", "el"].includes(locale) ? locale : "en";
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [limit, setLimit] = useState(PAGE);
  const filtered = items.filter((i) => filter === "all" || i.category === filter);
  const shown = filtered.slice(0, limit);

  return (
    <div>
      {featured && filter === "all" && (
        <Link href={`/${locale}/articles/${featured.slug}`}
              className="card-base overflow-hidden grid md:grid-cols-2 mb-10 no-underline">
          <CardThumb src={featured.image} alt={featured.title} category={featured.category}
                     className="md:aspect-auto md:h-full md:rounded-none" />
          <div className="p-8 flex flex-col justify-center">
            <p className="text-xs uppercase tracking-wide text-terra font-semibold mb-2">{FILTER_LABELS[featured.category][ui]}</p>
            <h2 className="font-heading text-2xl text-text m-0">{featured.title}</h2>
            <p className="font-data text-xs text-text-muted mt-3 mb-0">{new Date(featured.date).toLocaleDateString(locale)}</p>
          </div>
        </Link>
      )}
      <div className="flex gap-2 mb-6">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => { setFilter(f); setLimit(PAGE); }}
                  className={`px-3 py-1.5 rounded-full text-sm border ${filter === f ? "bg-aegean text-white border-aegean" : "bg-white text-text-muted border-border hover:border-aegean/40"}`}>
            {FILTER_LABELS[f][ui]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {shown.map((i) => (
          <Link key={i.slug} href={`/${locale}/articles/${i.slug}`} className="card-base overflow-hidden no-underline">
            <CardThumb src={i.image} alt={i.title} category={i.category} />
            <div className="p-4">
              <h3 className="text-sm font-semibold text-text m-0 line-clamp-2">{i.title}</h3>
              <p className="font-data text-[11px] text-text-muted mt-2 mb-0">{new Date(i.date).toLocaleDateString(locale)}</p>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length > limit && (
        <div className="text-center mt-8">
          <button onClick={() => setLimit(limit + PAGE)}
                  className="px-5 py-2.5 rounded-lg border border-aegean text-aegean text-sm font-semibold hover:bg-aegean-faint">
            + {Math.min(PAGE, filtered.length - limit)}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Vérifier + commit**

Run: `npx tsc --noEmit` → 0.
```bash
git add "src/app/[locale]/articles/page.tsx" src/components/ArticlesHub.tsx
git commit -m "feat(articles): featured + category filters + load more, tinted thumbs"
```

---

### Task 6: NextDeparture (pages paires + planner)

**Files:**
- Create: `src/components/NextDeparture.tsx`
- Modify: `src/app/[locale]/buses/[pair]/page.tsx` (DirectionSection)
- Modify: `src/app/[locale]/buses/JourneyPlanner.tsx` (JourneyCard/LegRow)

- [ ] **Step 1: NextDeparture client**

`src/components/NextDeparture.tsx` :
```tsx
"use client";
// "Prochain depart HH:MM (dans X min)" en TZ Europe/Athens, calcule client
// depuis departures_by_day (memes donnees que les grilles affichees).
// Logique jour : reutiliser daysMatch de bus-journey (export existant a verifier;
// sinon l'exporter depuis lib/bus-journey.ts — il y est deja implemente).
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { daysMatch } from "@/lib/bus-journey";

const T = {
  next: { en: "Next departure", fr: "Prochain départ", de: "Nächste Abfahrt", el: "Επόμενη αναχώρηση" },
  inMin: { en: (m: number) => `in ${m} min`, fr: (m: number) => `dans ${m} min`, de: (m: number) => `in ${m} Min`, el: (m: number) => `σε ${m} λεπτά` },
  tomorrow: { en: "First bus tomorrow", fr: "Premier bus demain", de: "Erster Bus morgen", el: "Πρώτο λεωφορείο αύριο" },
} as const;
type Ui = keyof typeof T.next;

function athensNow(): { dayIdx: number; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { dayIdx: days.indexOf(get("weekday")), minutes: parseInt(get("hour")) * 60 + parseInt(get("minute")) };
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function NextDeparture({ departuresByDay, locale }: {
  departuresByDay: Array<{ days: string; times: string[] }>;
  locale: string;
}) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as Ui;
  const [state, setState] = useState<{ time: string; inMin: number } | { tomorrow: string } | null>(null);

  useEffect(() => {
    const { dayIdx, minutes } = athensNow();
    const todayTimes = departuresByDay
      .filter((g) => daysMatch(g.days, dayIdx))
      .flatMap((g) => g.times)
      .map((t) => ({ t, m: toMin(t) }))
      .sort((a, b) => a.m - b.m);
    const next = todayTimes.find((x) => x.m >= minutes);
    if (next) setState({ time: next.t, inMin: next.m - minutes });
    else {
      const tomorrowIdx = (dayIdx + 1) % 7;
      const first = departuresByDay
        .filter((g) => daysMatch(g.days, tomorrowIdx))
        .flatMap((g) => g.times)
        .sort((a, b) => toMin(a) - toMin(b))[0];
      if (first) setState({ tomorrow: first });
    }
  }, [departuresByDay]);

  if (!state) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-aegean text-white font-data text-xs px-2 py-1">
      <Clock className="w-3 h-3" />
      {"time" in state
        ? `${T.next[ui]} ${state.time} · ${T.inMin[ui](state.inMin)}`
        : `${T.tomorrow[ui]} ${state.tomorrow}`}
    </span>
  );
}
```
Précondition : vérifier la signature réelle de `daysMatch` dans `lib/bus-journey.ts`
(elle matche un libellé "Mon-Fri"/"EVERY DAY"/ektel contre un jour) et adapter l'appel
(elle prend peut-être un nom de jour, pas un index — lire le code et conformer).

- [ ] **Step 2: Intégrer**

- Page paire : dans `DirectionSection`, sous la ligne prix/durée/fréquence de chaque route,
  `<NextDeparture departuresByDay={r.departures_by_day ?? []} locale={ui} />` (la page est
  server → NextDeparture est client, OK).
- JourneyPlanner : dans `LegRow`, même badge avec les `departures_by_day` de `leg.route`.

- [ ] **Step 3: Vérifier + commit**

Run: `npx tsc --noEmit` → 0 ; `node scripts/check-bus-journey.mjs` → OK.
```bash
git add src/components/NextDeparture.tsx "src/app/[locale]/buses/[pair]/page.tsx" "src/app/[locale]/buses/JourneyPlanner.tsx"
git commit -m "feat(buses): live 'next departure' badge on pair pages and planner"
```

---

### Task 7: Carte réseau bus MapLibre

**Files:**
- Create: `src/components/BusNetworkMap.tsx` (client, dynamic import maplibre)
- Modify: `src/app/[locale]/buses/BusesClient.tsx` (remplacer le SVG spaghetti)

- [ ] **Step 1: Étudier l'intégration MapLibre existante**

Lire le composant carte existant (`grep -rn "maplibre" src/ --include=*.tsx -l`) pour
reprendre le pattern d'import dynamique et le style de fond utilisé (raster OSM ou style
vectoriel déjà configuré).

- [ ] **Step 2: BusNetworkMap**

Structure (adapter au pattern trouvé) : composant client `BusNetworkMap({ routes, locale,
onSelect })` qui :
- construit les segments uniques `[from_place, to_place]` → coords via `SLUG_COORDS` +
  `slugifyPlace` (libs pures existantes) ; segments sans coords ignorés ;
- GeoJSON LineString par segment, `color` aegean `#1B4965` (operator_id "herlas") ou terra
  `#B85C38` (autres), opacity 0.65, width 2 ;
- points = lieux uniques (cercle blanc bord aegean, label au zoom ≥ 9) ; clic sur un point →
  `onSelect(placeName)` qui préremplit le from du planificateur (prop câblée dans BusesClient
  sur `setFromPlace` existant) ;
- bounds fit Crète `[[23.3, 34.8], [26.4, 35.7]]`, interactions scroll-zoom désactivées
  par défaut (cooperative gestures), hauteur 380px desktop.
- Mobile : envelopper dans `<details>` (résumé = titre section actuel), ouvert par défaut
  ≥ md via classe (`open` géré par CSS impossible → rendre `<details open>` desktop avec
  `hidden md:block` + version repliée `md:hidden`).

- [ ] **Step 3: Remplacer dans BusesClient**

Localiser la section « Crete Bus Network » (SVG actuel + légende) dans BusesClient.tsx,
remplacer le SVG par `<BusNetworkMap routes={routes} locale={locale} onSelect={setFromPlace} />`.
Garder le titre de section et la légende textuelle des lignes si elle apporte du contenu SEO
(elle liste les lignes en texte — conserver sous la carte, en `<details>` repliée).

- [ ] **Step 4: Vérifier + commit**

Run: `npx tsc --noEmit` → 0.
```bash
git add src/components/BusNetworkMap.tsx "src/app/[locale]/buses/BusesClient.tsx"
git commit -m "feat(buses): real MapLibre network map replaces spaghetti SVG"
```

---

### Task 8: Header 3 univers

**Files:**
- Modify: `src/components/layout/Header.tsx` (240 l.)

- [ ] **Step 1: Lire le Header actuel** (l'autre terminal y a touché récemment pour Explore —
  partir de l'état HEAD du jour).

- [ ] **Step 2: Restructurer la nav**

Données de nav (4 langues + fallback EN), à définir en tête de fichier :
```ts
const NAV = [
  { key: "plan", label: { en: "Plan", fr: "Planifier", de: "Planen", el: "Σχεδιάστε" },
    items: [
      { href: "/buses", label: { en: "Buses", fr: "Bus", de: "Busse", el: "Λεωφορεία" } },
      { href: "/airport", label: { en: "Airports", fr: "Aéroports", de: "Flughäfen", el: "Αεροδρόμια" } },
      { href: "/weather", label: { en: "Weather", fr: "Météo", de: "Wetter", el: "Καιρός" } },
    ] },
  { key: "discover", label: { en: "Discover", fr: "Découvrir", de: "Entdecken", el: "Ανακαλύψτε" },
    items: [
      { href: "/beaches", label: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" } },
      { href: "/explore", label: { en: "Explore", fr: "Explorer", de: "Erkunden", el: "Εξερεύνηση" } },
      { href: "/villages", label: { en: "Villages", fr: "Villages", de: "Dörfer", el: "Χωριά" } },
      { href: "/food", label: { en: "Food & Drink", fr: "Restaurants", de: "Essen", el: "Φαγητό" } },
      { href: "/hikes", label: { en: "Hikes", fr: "Randonnées", de: "Wanderungen", el: "Πεζοπορίες" } },
    ] },
  { key: "today", label: { en: "Today", fr: "Aujourd'hui", de: "Heute", el: "Σήμερα" },
    items: [
      { href: "/news", label: { en: "News", fr: "Actus", de: "News", el: "Νέα" } },
      { href: "/events", label: { en: "Events", fr: "Événements", de: "Events", el: "Εκδηλώσεις" } },
      { href: "/daily", label: { en: "Daily", fr: "Quotidien", de: "Täglich", el: "Καθημερινά" } },
      { href: "/articles", label: { en: "Guides", fr: "Guides", de: "Guides", el: "Οδηγοί" } },
    ] },
] as const;
```
Desktop : 3 triggers avec dropdown (group-hover CSS pur : `group` + `group-hover:visible`,
pas de JS) + lien direct « Beaches » conservé en top-level si la place le permet — NON,
rester aux 3 univers + recherche + langue (épure). Mobile : le menu burger existant rend les
3 groupes en accordéon (3 `<details>` natifs). Conserver : logo, recherche, sélecteur langue,
mécanique mobile existante (adapter le contenu, pas la mécanique).

- [ ] **Step 3: Vérifier + commit**

Run: `npx tsc --noEmit` → 0.
```bash
git add src/components/layout/Header.tsx
git commit -m "feat(nav): header restructured into Plan / Discover / Today"
```

---

### Task 9: OG template restylé

**Files:**
- Modify: `src/app/api/og/route.tsx` (localiser : `grep -rn "api/og" src/app --include=*.tsx -l`)

- [ ] **Step 1: Restyler le template**

Conserver les params d'entrée (title etc.). Nouveau rendu : fond crème `#F7F4F0`, bandeau
supérieur aegean `#1B4965` avec « CRETE • DIRECT » + pastille verte « LIVE », titre en serif
(charger Playfair via fetch font dans l'edge function si pas déjà fait — sinon serif système),
filet terra en bas. Pas d'image de fond (perf edge).

- [ ] **Step 2: Vérifier + commit**

Run: `npx tsc --noEmit` → 0. Test visuel : `curl -s "http://localhost:3000/api/og?title=Test" -o /tmp/og.png` en tâche 10.
```bash
git add src/app/api/og/route.tsx
git commit -m "feat(og): brand-consistent share images (cream, aegean, serif, live dot)"
```

---

### Task 10: Passe finale + vérifications + push + prod

**Files:** divers (chasse aux couleurs hors tokens), aucun nouveau.

- [ ] **Step 1: Chasse aux couleurs hors tokens**

`grep -rn "bg-\(black\|yellow\|orange\|green\|purple\|pink\)-" src/components src/app --include=*.tsx`
+ `grep -rn "#[0-9a-fA-F]\{6\}" src/components/home src/app/[locale]/page.tsx` → remplacer
par tokens (sauf codes couleurs de données : charts, ratings sémantiques emerald/amber).

- [ ] **Step 2: Build + tests**

```
npx tsc --noEmit
node scripts/check-taxi-fare.mjs && node scripts/check-taxi-partners.mjs && node scripts/check-bus-pairs.mjs && node scripts/check-bus-journey.mjs
$env:SUPABASE_SERVICE_KEY="dummy"; npm run build   # EXIT 0
```

- [ ] **Step 3: Vérification visuelle (next start :3000)**

`npm run start` (background) puis Playwright : re-shooter les 8 pages de l'audit
(`py -3 scripts/audit-ui-screenshots.py` avec BASE=http://localhost:3000 temporairement)
→ examiner chaque capture (LiveBar présente, home dashboard, hub filtres, carte MapLibre,
header 3 univers, zéro aplat hors palette) + assertions rapides :
- 3 pages différentes contiennent « LIVE » (LiveBar trans-site),
- home : `Marquee` absent du HTML,
- /articles : boutons filtres présents,
- page paire : badge NextDeparture rendu (texte « Next departure » ou « First bus tomorrow »).
Puis tuer le serveur : `Get-NetTCPConnection -LocalPort 3000 -State Listen | % { taskkill /PID $_.OwningProcess /F /T }` (PAS le 3457).

- [ ] **Step 4: Push + vérif prod**

`git status` (stage sélectif si l'autre terminal a des fichiers), puis :
```bash
git push origin master && git push origin master:main
```
Au Ready (poll) : curl home (LiveBar), /articles, page paire (NextDeparture présent dans le
HTML initial ? non — client ; vérifier via Playwright prod), OG `curl -s "https://crete.direct/api/og?title=x" -o /tmp/og.png` (200, image/png).

- [ ] **Step 5: Mémoire**

session_log DEPLOY [FACT sources] + `project_crete_direct.md` Phase 12 (refonte UI live-data,
6 chantiers, avant/après ui-audit/) + re-coudre MEMORY.md + captures avant/après envoyées à Kami.

## Self-review du plan

1. **Couverture spec** : système §1→T1+T2, LiveBar §2→T3 (mode alerte = conditionnel assumé),
   home §3→T4, articles §4 hub→T5, NextDeparture→T6, MapLibre→T7, vent→T1 (WindArrow) utilisé
   T3/T4, header→T8, OG→T9, chasse couleurs + tests §6→T10. Dégradations §5 : LiveBar
   date-seule (T3 try/catch), home sans swim (T4 fallback), NextDeparture demain/masqué (T6),
   MapLibre fallback liste (T7 légende conservée). ✓
2. **Placeholders** : T7 et T9 renvoient à la lecture du pattern existant (carte, og) — fichiers
   vivants, structures cibles données. Assumé comme pour le plan taxi.
3. **Cohérence types** : CardThumb(src,alt,category,className) identique T2/T5 ; HubItem défini
   T5 ; NextDeparture(departuresByDay,locale) T6 ; WindArrow(deg,className) T1 utilisé T3/T4 ;
   `daysMatch` import à conformer à la signature réelle (précondition explicite T6). ✓
