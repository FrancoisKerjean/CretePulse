# Match Swipe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deck de swipe façon Tinder sur les 2296 lieux `cb_places`, avec match algorithmique après 8 swipes, page `/[locale]/match`, deep-link `/explore?place=slug` et teaser sur la home.

**Architecture:** Approche client pur (spec `docs/superpowers/specs/2026-06-11-match-swipe-design.md`) : la page serveur construit un pool stratifié de 140 lieux (ISR 24h), le client échantillonne 70 cartes par visiteur, score les goûts localement (localStorage `cd_match_v1`) et mesure via events Plausible. Zéro table, zéro backend.

**Tech Stack:** Next.js 16 App Router, `motion` v12 (`motion/react`) pour le drag, Tailwind v4 (tokens existants : `card-base`, `font-data`, couleurs aegean/terra/lagoon/night/sun), next-intl (`Link` de `@/i18n/navigation`), Supabase via `src/lib/cb-places.ts`.

**Conventions de vérification (IMPORTANT) :** ce repo n'a PAS d'infra de test JS (`tests/` = pytest pour les scripts Python VPS). La convention projet est : `npx tsc --noEmit` (type-check rapide) par tâche, `npm run dev` + vérification manuelle navigateur, `npm run build` complet en fin de chantier. Ne PAS installer Jest/Vitest.

**Règles repo non négociables :** git author `kerjeanfrancois29` (sinon Vercel bloque). Prod = `git push origin master && git push origin master:main` (branche Vercel = main, drift connu). Accents corrects dans toutes les langues. Pas de em dash dans les textes UI.

---

## File Structure

- Create: `src/lib/cb-type-labels.ts` — labels de types de lieux 4 langues, extraits d'ExploreView (partagés deck + explore)
- Create: `src/lib/match-scoring.ts` — logique pure : profil de goûts, scoring, pool stratifié, échantillonnage
- Create: `src/components/match/MatchDeck.tsx` — client component : deck, gestes, écran match, shortlist, localStorage, Plausible
- Create: `src/app/[locale]/match/page.tsx` — server component : metadata 4 langues + pool
- Modify: `src/components/explore/ExploreView.tsx` — import labels partagés + deep-link `?place=`
- Modify: `src/app/sitemap.xml/route.ts` — entrée `/match`
- Modify: `src/lib/cb-places.ts` — `getMatchTeaserPhotos()`
- Modify: `src/app/[locale]/page.tsx` — fetch photos teaser
- Modify: `src/components/home/HomeClient.tsx` — section teaser « Trouve ton spot »

---

### Task 1: Extraire les labels de types dans `src/lib/cb-type-labels.ts`

`ExploreView.tsx` définit `TYPE_LABELS` + `typeLabel()` en local (lignes 72-106). Le deck en a besoin aussi, mais importer ExploreView tirerait maplibre dans le bundle de `/match`. On extrait dans un module partagé.

**Files:**
- Create: `src/lib/cb-type-labels.ts`
- Modify: `src/components/explore/ExploreView.tsx:72-106`

- [ ] **Step 1: Créer le module partagé**

Créer `src/lib/cb-type-labels.ts` avec exactement le contenu actuel d'ExploreView (copie intégrale, en exportant) :

```ts
// Labels localisés des types de lieux cb_places (en/fr/de/el, fallback EN).
// Partagé entre l'explorateur (/explore) et le deck de match (/match).

export const TYPE_LABELS: Record<string, Record<string, string>> = {
  beach: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" },
  gorge: { en: "Gorges", fr: "Gorges", de: "Schluchten", el: "Φαράγγια" },
  cave: { en: "Caves", fr: "Grottes", de: "Höhlen", el: "Σπήλαια" },
  town: { en: "Towns", fr: "Villes", de: "Städte", el: "Πόλεις" },
  island: { en: "Islands", fr: "Îles", de: "Inseln", el: "Νησιά" },
  lake: { en: "Lakes", fr: "Lacs", de: "Seen", el: "Λίμνες" },
  lighthouse: { en: "Lighthouses", fr: "Phares", de: "Leuchttürme", el: "Φάροι" },
  mountain: { en: "Mountains", fr: "Montagnes", de: "Berge", el: "Βουνά" },
  monastery: { en: "Monasteries", fr: "Monastères", de: "Klöster", el: "Μοναστήρια" },
  "historical-site": { en: "History", fr: "Histoire", de: "Geschichte", el: "Ιστορία" },
  plateau: { en: "Plateaus", fr: "Plateaux", de: "Hochebenen", el: "Οροπέδια" },
  "natural-park": { en: "Parks", fr: "Parcs", de: "Parks", el: "Πάρκα" },
  geological: { en: "Geology", fr: "Géologie", de: "Geologie", el: "Γεωλογία" },
  river: { en: "Rivers", fr: "Rivières", de: "Flüsse", el: "Ποτάμια" },
  waterfall: { en: "Waterfalls", fr: "Cascades", de: "Wasserfälle", el: "Καταρράκτες" },
  forest: { en: "Forests", fr: "Forêts", de: "Wälder", el: "Δάση" },
  flora: { en: "Flora", fr: "Flore", de: "Flora", el: "Χλωρίδα" },
  fauna: { en: "Fauna", fr: "Faune", de: "Fauna", el: "Πανίδα" },
  activity: { en: "Activities", fr: "Activités", de: "Aktivitäten", el: "Δραστηριότητες" },
  tradition: { en: "Traditions", fr: "Traditions", de: "Traditionen", el: "Παραδόσεις" },
  nature: { en: "Nature", fr: "Nature", de: "Natur", el: "Φύση" },
  museum: { en: "Museums", fr: "Musées", de: "Museen", el: "Μουσεία" },
  fort: { en: "Forts & Castles", fr: "Forts & Châteaux", de: "Festungen", el: "Φρούρια" },
  "archaeological-site": { en: "Archaeology", fr: "Archéologie", de: "Archäologie", el: "Αρχαιολογία" },
  mythology: { en: "Mythology", fr: "Mythologie", de: "Mythologie", el: "Μυθολογία" },
  church: { en: "Churches", fr: "Églises", de: "Kirchen", el: "Εκκλησίες" },
  other: { en: "Other", fr: "Autres", de: "Sonstiges", el: "Άλλα" },
};

export function typeLabel(type: string, locale: string): string {
  return TYPE_LABELS[type]?.[locale] || TYPE_LABELS[type]?.en || type;
}
```

- [ ] **Step 2: Remplacer la définition locale dans ExploreView**

Dans `src/components/explore/ExploreView.tsx` :
1. Supprimer le bloc `const TYPE_LABELS: Record<...> = { ... };` (lignes 72-100) ET la fonction `function typeLabel(...) { ... }` (lignes 104-106).
2. Ajouter l'import en haut, après les imports existants :

```ts
import { typeLabel } from "@/lib/cb-type-labels";
```

Attention : ExploreView utilise aussi `TYPE_LABELS` directement quelque part ? Vérifier avec `grep -n "TYPE_LABELS" src/components/explore/ExploreView.tsx`. Si oui, importer aussi `TYPE_LABELS` depuis le module.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 erreur (mêmes erreurs préexistantes éventuelles, aucune nouvelle).

- [ ] **Step 4: Commit**

```bash
git add src/lib/cb-type-labels.ts src/components/explore/ExploreView.tsx
git commit -m "refactor(explore): extract place type labels to shared lib"
```

---

### Task 2: Logique pure de scoring dans `src/lib/match-scoring.ts`

Aucune dépendance React. Tout ce qui est testable mentalement vit ici.

**Files:**
- Create: `src/lib/match-scoring.ts`

- [ ] **Step 1: Écrire le module complet**

```ts
// Logique pure du deck de match (/match) : profil de goûts, scoring,
// pool stratifié côté serveur, échantillonnage côté client.
// Spec : docs/superpowers/specs/2026-06-11-match-swipe-design.md
// Aucune dépendance React ni Supabase : fonctions pures uniquement.

import type { CbPlaceListItem } from "./cb-places";

// Carte légère envoyée au client : ni description (copyright), ni champs lourds.
export interface MatchPlace {
  slug: string;
  name: string;
  place_type: string;
  prefecture: string | null;
  rating: number | null;
  water_color: string | null;
  sand_type: string | null;
  crowds: string | null;
  photos: string[];
}

// Profil de goûts : poids par clé d'attribut ("type:beach", "pref:Lassithi"...).
export type TasteProfile = Record<string, number>;

const LIKE_WEIGHT = 1;
const PASS_WEIGHT = -0.5;
const TYPE_CAP_RATIO = 0.25; // un type ne dépasse jamais ~25 % du pool

export function emptyProfile(): TasteProfile {
  return {};
}

export function attrKeys(p: MatchPlace): string[] {
  const keys = [`type:${p.place_type}`];
  if (p.prefecture) keys.push(`pref:${p.prefecture}`);
  if (p.water_color) keys.push(`water:${p.water_color}`);
  if (p.sand_type) keys.push(`sand:${p.sand_type}`);
  if (p.crowds) keys.push(`crowds:${p.crowds}`);
  return keys;
}

export function updateProfile(profile: TasteProfile, place: MatchPlace, liked: boolean): TasteProfile {
  const w = liked ? LIKE_WEIGHT : PASS_WEIGHT;
  const next = { ...profile };
  for (const k of attrKeys(place)) next[k] = (next[k] || 0) + w;
  return next;
}

// Score moyen par attribut (évite de favoriser les lieux riches en attributs),
// la note départage les ex aequo.
export function scorePlace(profile: TasteProfile, place: MatchPlace): number {
  const keys = attrKeys(place);
  let sum = 0;
  for (const k of keys) sum += profile[k] || 0;
  return sum / keys.length + (place.rating || 0) / 20;
}

export function pickMatch(profile: TasteProfile, candidates: MatchPlace[]): MatchPlace | null {
  let best: MatchPlace | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scorePlace(profile, c);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

// Fisher-Yates en place.
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toMatchPlace(p: CbPlaceListItem): MatchPlace {
  return {
    slug: p.slug,
    name: p.name,
    place_type: p.place_type,
    prefecture: p.prefecture,
    rating: p.rating,
    water_color: p.water_color,
    sand_type: p.sand_type,
    crowds: p.crowds,
    photos: (p.photos || []).slice(0, 3),
  };
}

// Côté serveur (ISR 24h) : pool stratifié de `size` lieux éligibles.
// Éligible = au moins une photo, et note >= 3.5 quand elle existe.
// Chaque type est plafonné (sinon 641 monastères écrasent le deck).
export function buildMatchPool(places: CbPlaceListItem[], size = 140): MatchPlace[] {
  const eligible = places.filter(
    (p) =>
      p.photo_count > 0 &&
      Array.isArray(p.photos) &&
      p.photos.length > 0 &&
      (p.rating == null || p.rating >= 3.5),
  );
  const byType = new Map<string, CbPlaceListItem[]>();
  for (const p of eligible) {
    const arr = byType.get(p.place_type) || [];
    arr.push(p);
    byType.set(p.place_type, arr);
  }
  const cap = Math.ceil(size * TYPE_CAP_RATIO);
  const picked: CbPlaceListItem[] = [];
  for (const arr of byType.values()) {
    arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    picked.push(...arr.slice(0, cap));
  }
  shuffle(picked);
  return picked.slice(0, size).map(toMatchPlace);
}

// Côté client : deck par visiteur, en excluant les lieux déjà vus.
// Si le pool est presque épuisé, on repart de zéro (le visiteur a tout vu).
export function sampleDeck(pool: MatchPlace[], size: number, seen: Set<string>): MatchPlace[] {
  let candidates = pool.filter((p) => !seen.has(p.slug));
  if (candidates.length < Math.min(size, 30)) candidates = [...pool];
  return shuffle([...candidates]).slice(0, size);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 nouvelle erreur.

- [ ] **Step 3: Vérification rapide de la logique en Node**

Run:
```bash
node -e "
const LIKE=1, PASS=-0.5;
// mini-réimplémentation du scoring pour valider le comportement attendu :
// 2 likes plage + 1 pass monastère doit classer une plage devant un monastère.
const profile = { 'type:beach': 2*LIKE, 'type:monastery': PASS };
const score = (keys) => keys.reduce((s,k)=>s+(profile[k]||0),0)/keys.length;
const beach = score(['type:beach']), mon = score(['type:monastery']);
console.log(beach > mon ? 'OK scoring' : 'FAIL scoring', beach, mon);
"
```
Expected: `OK scoring 2 -0.5`

- [ ] **Step 4: Commit**

```bash
git add src/lib/match-scoring.ts
git commit -m "feat(match): pure taste-profile scoring + stratified pool sampling"
```

---

### Task 3: Composant `MatchDeck` (deck, gestes, match, shortlist)

**Files:**
- Create: `src/components/match/MatchDeck.tsx`

- [ ] **Step 1: Écrire le composant complet**

```tsx
"use client";

// Deck de swipe façon Tinder sur les lieux cb_places.
// Spec : docs/superpowers/specs/2026-06-11-match-swipe-design.md
// La logique de scoring est pure (src/lib/match-scoring.ts) ;
// ici : gestes, écrans, persistance localStorage, events Plausible.

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { Heart, X, MapPin, Star, RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { typeLabel } from "@/lib/cb-type-labels";
import {
  type MatchPlace,
  type TasteProfile,
  emptyProfile,
  updateProfile,
  pickMatch,
  sampleDeck,
} from "@/lib/match-scoring";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

const DECK_SIZE = 70;
const SWIPES_PER_MATCH = 8;
const STORAGE_KEY = "cd_match_v1";
const SWIPE_OFFSET = 90;
const SWIPE_VELOCITY = 600;

const T: Record<string, Record<string, string>> = {
  en: {
    title: "Find your spot",
    hint: "Swipe right if you like it, left to pass. After a few cards, you get your match.",
    like: "Like", pass: "Pass",
    matchTitle: "It's a match!",
    matchSub: "Based on your taste, this is your spot:",
    seeSpot: "See this spot", keepSwiping: "Keep swiping",
    yourSpots: "Your spots",
    empty: "You have seen every place in the deck.",
    replay: "Deal a new deck",
  },
  fr: {
    title: "Trouve ton spot",
    hint: "Balaie à droite si ça te plaît, à gauche pour passer. Après quelques cartes, tu obtiens ton match.",
    like: "J'aime", pass: "Passer",
    matchTitle: "C'est un match !",
    matchSub: "D'après tes goûts, voici ton spot :",
    seeSpot: "Voir ce spot", keepSwiping: "Continuer à swiper",
    yourSpots: "Tes spots",
    empty: "Tu as vu tous les lieux du paquet.",
    replay: "Nouveau paquet",
  },
  de: {
    title: "Finde deinen Ort",
    hint: "Nach rechts wischen, wenn es dir gefällt, nach links zum Weiterblättern. Nach ein paar Karten bekommst du dein Match.",
    like: "Mag ich", pass: "Weiter",
    matchTitle: "Es ist ein Match!",
    matchSub: "Nach deinem Geschmack ist das dein Ort:",
    seeSpot: "Diesen Ort ansehen", keepSwiping: "Weiter swipen",
    yourSpots: "Deine Orte",
    empty: "Du hast alle Orte im Stapel gesehen.",
    replay: "Neuer Stapel",
  },
  el: {
    title: "Βρες το μέρος σου",
    hint: "Σύρε δεξιά αν σου αρέσει, αριστερά για να προσπεράσεις. Μετά από λίγες κάρτες, έχεις το match σου.",
    like: "Μου αρέσει", pass: "Πέρνα",
    matchTitle: "Είναι match!",
    matchSub: "Με βάση τα γούστα σου, αυτό είναι το μέρος σου:",
    seeSpot: "Δες αυτό το μέρος", keepSwiping: "Συνέχισε το swipe",
    yourSpots: "Τα μέρη σου",
    empty: "Είδες όλα τα μέρη της τράπουλας.",
    replay: "Νέα τράπουλα",
  },
};

interface Stored {
  profile: TasteProfile;
  liked: string[];
  seen: string[];
}

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stored;
      if (s && typeof s === "object" && s.profile && Array.isArray(s.liked) && Array.isArray(s.seen)) return s;
    }
  } catch {
    // localStorage indisponible ou corrompu : on repart de zéro.
  }
  return { profile: emptyProfile(), liked: [], seen: [] };
}

function saveStored(s: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // quota plein ou navigation privée : tant pis, la session reste en mémoire.
  }
}

function track(event: string, props?: Record<string, string>) {
  window.plausible?.(event, props ? { props } : undefined);
}

const cardVariants = {
  enter: { scale: 0.95, y: 14, opacity: 0 },
  visible: { scale: 1, y: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir * 560,
    rotate: dir * 18,
    opacity: 0,
    transition: { duration: 0.3 },
  }),
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-medium text-white/90">
      {children}
    </span>
  );
}

function SwipeCard({
  place,
  top,
  stackPos,
  exitDir,
  locale,
  t,
  onSwipe,
}: {
  place: MatchPlace;
  top: boolean;
  stackPos: number; // 0 = carte du dessus, 1 = derrière, 2 = encore derrière
  exitDir: number;
  locale: string;
  t: Record<string, string>;
  onSwipe: (liked: boolean) => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [30, 110], [0, 1]);
  const passOpacity = useTransform(x, [-110, -30], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 select-none"
      style={{ x, rotate, touchAction: "pan-y", zIndex: 10 - stackPos }}
      custom={exitDir}
      variants={cardVariants}
      initial="enter"
      animate={{ scale: 1 - stackPos * 0.04, y: stackPos * 12, opacity: 1 }}
      exit="exit"
      drag={top ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.9}
      whileDrag={{ cursor: "grabbing" }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY) onSwipe(true);
        else if (info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY) onSwipe(false);
      }}
    >
      <div className="relative h-full w-full cursor-grab overflow-hidden rounded-[28px] border border-border bg-night shadow-[0_18px_48px_rgba(11,94,120,.25)]">
        <img
          src={place.photos[0]}
          alt={place.name}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          loading={stackPos === 0 ? "eager" : "lazy"}
        />
        {/* Badges de direction pendant le drag */}
        {top && (
          <>
            <motion.span
              style={{ opacity: likeOpacity }}
              className="absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-ok px-3 py-1 font-heading text-xl font-extrabold uppercase text-ok"
            >
              {t.like}
            </motion.span>
            <motion.span
              style={{ opacity: passOpacity }}
              className="absolute right-5 top-6 rotate-12 rounded-xl border-4 border-terra px-3 py-1 font-heading text-xl font-extrabold uppercase text-terra"
            >
              {t.pass}
            </motion.span>
          </>
        )}
        {/* Bandeau infos */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/90 via-night/45 to-transparent px-5 pb-5 pt-20 text-white">
          <div className="flex items-center gap-2.5">
            <h2 className="m-0 font-heading text-[24px] font-extrabold leading-tight">{place.name}</h2>
            {place.rating != null && place.rating > 0 && (
              <span className="font-data inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[13px] font-bold">
                <Star size={12} fill="currentColor" /> {place.rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="m-0 mt-1 flex items-center gap-1.5 text-[13.5px] text-white/85">
            <MapPin size={13} /> {typeLabel(place.place_type, locale)}
            {place.prefecture ? ` · ${place.prefecture}` : ""}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {[place.water_color, place.sand_type, place.crowds].filter(Boolean).map((v) => (
              <Chip key={v as string}>{v}</Chip>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function MatchDeck({ pool, locale }: { pool: MatchPlace[]; locale: string }) {
  const t = T[locale] || T.en;
  const [ready, setReady] = useState(false);
  const [deck, setDeck] = useState<MatchPlace[]>([]);
  const [index, setIndex] = useState(0);
  const [profile, setProfile] = useState<TasteProfile>(emptyProfile());
  const [likedSlugs, setLikedSlugs] = useState<string[]>([]);
  const [seenSlugs, setSeenSlugs] = useState<string[]>([]);
  const [swipes, setSwipes] = useState(0);
  const [match, setMatch] = useState<MatchPlace | null>(null);
  const [exitDir, setExitDir] = useState(1);

  // Hydratation au mount uniquement : localStorage + échantillonnage aléatoire
  // (jamais au render serveur, sinon mismatch d'hydratation).
  useEffect(() => {
    const stored = loadStored();
    setProfile(stored.profile);
    setLikedSlugs(stored.liked);
    setSeenSlugs(stored.seen);
    setDeck(sampleDeck(pool, DECK_SIZE, new Set(stored.seen)));
    setReady(true);
    track("match_deck_start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSwipe(liked: boolean) {
    const place = deck[index];
    if (!place || match) return;
    setExitDir(liked ? 1 : -1);
    const nextProfile = updateProfile(profile, place, liked);
    const nextLiked = liked && !likedSlugs.includes(place.slug) ? [...likedSlugs, place.slug] : likedSlugs;
    const nextSeen = seenSlugs.includes(place.slug) ? seenSlugs : [...seenSlugs, place.slug];
    setProfile(nextProfile);
    setLikedSlugs(nextLiked);
    setSeenSlugs(nextSeen);
    track(liked ? "swipe_like" : "swipe_pass", { type: place.place_type });

    const nextSwipes = swipes + 1;
    if (nextSwipes >= SWIPES_PER_MATCH) {
      const m = pickMatch(nextProfile, deck.slice(index + 1));
      if (m) {
        setMatch(m);
        setSwipes(0);
        track("match_shown", { slug: m.slug, type: m.place_type });
      } else {
        setSwipes(nextSwipes);
      }
    } else {
      setSwipes(nextSwipes);
    }
    setIndex(index + 1);
    saveStored({ profile: nextProfile, liked: nextLiked, seen: nextSeen });
  }

  // Le match sort du deck restant et compte comme vu (sinon il revient en carte).
  function closeMatch(replay: boolean) {
    if (!match) return;
    const slug = match.slug;
    setSeenSlugs((s) => (s.includes(slug) ? s : [...s, slug]));
    setDeck((d) => d.filter((p, i) => i < index || p.slug !== slug));
    setMatch(null);
    if (replay) track("match_replay");
  }

  function redeal() {
    const seen = new Set(seenSlugs);
    setDeck(sampleDeck(pool, DECK_SIZE, seen));
    setIndex(0);
    setSwipes(0);
    track("match_deck_start", { redeal: "1" });
  }

  // Flèches clavier (desktop). Pas de deps : closure fraîche à chaque render.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleSwipe(true);
      if (e.key === "ArrowLeft") handleSwipe(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const visible = deck.slice(index, index + 3);
  const likedPlaces = likedSlugs
    .map((slug) => pool.find((p) => p.slug === slug))
    .filter((p): p is MatchPlace => Boolean(p))
    .slice(-12)
    .reverse();

  return (
    <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-8">
      <h1 className="m-0 text-center font-heading text-[30px] font-extrabold text-text">{t.title}</h1>
      <p className="mx-auto mb-6 mt-1.5 max-w-[320px] text-center text-[13.5px] text-text-muted">{t.hint}</p>

      {/* Deck */}
      <div className="relative h-[520px] w-full">
        {!ready ? (
          <div className="card-base h-full w-full animate-pulse !rounded-[28px]" />
        ) : visible.length > 0 ? (
          <AnimatePresence custom={exitDir}>
            {visible
              .map((place, i) => (
                <SwipeCard
                  key={place.slug}
                  place={place}
                  top={i === 0}
                  stackPos={i}
                  exitDir={exitDir}
                  locale={locale}
                  t={t}
                  onSwipe={handleSwipe}
                />
              ))
              .reverse()}
          </AnimatePresence>
        ) : (
          <div className="card-base flex h-full w-full flex-col items-center justify-center gap-4 !rounded-[28px] px-8 text-center">
            <p className="m-0 text-[15px] text-text-muted">{t.empty}</p>
            <button
              onClick={redeal}
              className="inline-flex items-center gap-2 rounded-full bg-aegean px-6 py-3 font-heading text-[14px] font-bold text-white"
            >
              <RotateCcw size={15} /> {t.replay}
            </button>
          </div>
        )}
      </div>

      {/* Boutons pass / like */}
      {ready && visible.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-8">
          <button
            onClick={() => handleSwipe(false)}
            aria-label={t.pass}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white text-terra shadow-[0_10px_26px_rgba(237,122,92,.25)] transition-transform hover:scale-105 active:scale-95"
          >
            <X size={28} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => handleSwipe(true)}
            aria-label={t.like}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-terra text-white shadow-[0_12px_30px_rgba(237,122,92,.45)] transition-transform hover:scale-105 active:scale-95"
          >
            <Heart size={28} strokeWidth={2.5} fill="currentColor" />
          </button>
        </div>
      )}

      {/* Shortlist des likes */}
      {likedPlaces.length > 0 && (
        <div className="mt-8">
          <p className="m-0 mb-2.5 font-heading text-[14px] font-bold text-text">
            {t.yourSpots} <span className="font-data text-lagoon-deep">{likedSlugs.length}</span>
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {likedPlaces.map((p) => (
              <Link
                key={p.slug}
                href={`/explore?place=${p.slug}`}
                className="block shrink-0 no-underline"
                title={p.name}
              >
                <img
                  src={p.photos[0]}
                  alt={p.name}
                  loading="lazy"
                  className="h-16 w-16 rounded-2xl border-2 border-white object-cover shadow-[0_6px_16px_rgba(11,94,120,.18)]"
                />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Écran match */}
      <AnimatePresence>
        {match && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-night/80 p-5 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-full max-w-sm overflow-hidden rounded-[32px] bg-white text-center shadow-2xl"
            >
              <div className="relative h-60">
                <img src={match.photos[0]} alt={match.name} className="absolute inset-0 h-full w-full object-cover" />
                {/* Éclat sobre : deux anneaux qui s'évanouissent */}
                {[0, 0.15].map((delay) => (
                  <motion.span
                    key={delay}
                    className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-sun"
                    initial={{ scale: 0.4, opacity: 0.9 }}
                    animate={{ scale: 2.4, opacity: 0 }}
                    transition={{ duration: 1.1, delay, ease: "easeOut" }}
                  />
                ))}
              </div>
              <div className="px-7 py-6">
                <p className="m-0 font-heading text-[30px] font-extrabold text-terra">{t.matchTitle}</p>
                <p className="mb-1 mt-1.5 text-[14px] text-text-muted">{t.matchSub}</p>
                <p className="m-0 font-heading text-[20px] font-bold text-text">{match.name}</p>
                <p className="m-0 mt-0.5 text-[13px] text-text-muted">
                  {typeLabel(match.place_type, locale)}
                  {match.prefecture ? ` · ${match.prefecture}` : ""}
                  {match.rating != null && match.rating > 0 ? ` · ${match.rating.toFixed(1)} ★` : ""}
                </p>
                <Link
                  href={`/explore?place=${match.slug}`}
                  onClick={() => track("match_clicked", { slug: match.slug })}
                  className="mt-5 block rounded-full bg-terra px-6 py-3.5 font-heading text-[15px] font-bold text-white no-underline shadow-[0_12px_28px_rgba(237,122,92,.4)]"
                >
                  {t.seeSpot}
                </Link>
                <button
                  onClick={() => closeMatch(true)}
                  className="mt-2.5 w-full rounded-full bg-stone px-6 py-3 font-heading text-[14px] font-bold text-aegean"
                >
                  {t.keepSwiping}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 nouvelle erreur. Si `motion/react` remonte des erreurs de types sur `variants`/`custom`, typer `cardVariants` avec `import type { Variants } from "motion/react"` et `const cardVariants: Variants = {...}`.

- [ ] **Step 3: Commit**

```bash
git add src/components/match/MatchDeck.tsx
git commit -m "feat(match): swipe deck component with taste scoring, match screen, shortlist"
```

---

### Task 4: Page `/[locale]/match` + sitemap

**Files:**
- Create: `src/app/[locale]/match/page.tsx`
- Modify: `src/app/sitemap.xml/route.ts:166` (bloc « Utility pages »)

- [ ] **Step 1: Créer la page (pattern copié de `explore/page.tsx`)**

```tsx
import { setRequestLocale } from "next-intl/server";
import { getAllCbPlaces } from "@/lib/cb-places";
import { buildAlternates } from "@/lib/seo";
import { buildMatchPool } from "@/lib/match-scoring";
import { MatchDeck } from "@/components/match/MatchDeck";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Find Your Perfect Spot in Crete - Swipe & Match",
    desc: "Swipe through beaches, gorges, monasteries and villages of Crete. Like or pass, and get matched with the spot that fits your taste.",
  },
  fr: {
    title: "Trouve Ton Spot Idéal en Crète - Swipe & Match",
    desc: "Fais défiler plages, gorges, monastères et villages de Crète. Like ou passe, et obtiens le spot qui correspond à tes goûts.",
  },
  de: {
    title: "Finde Deinen Perfekten Ort auf Kreta - Swipe & Match",
    desc: "Wische durch Strände, Schluchten, Klöster und Dörfer Kretas. Like oder weiter, und finde den Ort, der zu dir passt.",
  },
  el: {
    title: "Βρες το Ιδανικό σου Μέρος στην Κρήτη - Swipe & Match",
    desc: "Κάνε swipe σε παραλίες, φαράγγια, μοναστήρια και χωριά της Κρήτης. Like ή πέρνα, και βρες το μέρος που σου ταιριάζει.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/match"),
    openGraph: { title: m.title, description: m.desc, url: `${BASE_URL}/${locale}/match` },
  };
}

export default async function MatchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const places = await getAllCbPlaces().catch(() => []);
  const pool = buildMatchPool(places, 140);

  return (
    <main className="min-h-screen bg-surface">
      <MatchDeck pool={pool} locale={locale} />
    </main>
  );
}
```

- [ ] **Step 2: Ajouter `/match` au sitemap**

Dans `src/app/sitemap.xml/route.ts`, bloc « Utility pages » (après `push("/search", "monthly", 0.4);`), ajouter :

```ts
  push("/match", "monthly", 0.6);
```

- [ ] **Step 3: Vérifier en dev**

Run: `npm run dev` puis ouvrir `http://localhost:3000/en/match` et `http://localhost:3000/fr/match`.
Expected:
- Le deck s'affiche avec une photo plein format, nom, type, note, chips.
- Drag à droite : badge LIKE apparaît, la carte part à droite, la suivante monte.
- Drag à gauche : badge PASS, carte part à gauche.
- Boutons ❌/❤️ et flèches clavier ← → fonctionnent.
- Au 8e swipe : overlay « C'est un match ! » avec photo, anneaux animés, 2 CTA.
- « Continuer à swiper » ferme l'overlay, le deck continue.
- Recharger la page : les lieux déjà vus ne reviennent pas (localStorage).
- `curl -s http://localhost:3000/sitemap.xml | grep -c "/match"` retourne au moins 22 (22 locales).

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/match/page.tsx" src/app/sitemap.xml/route.ts
git commit -m "feat(match): /match page with 4-locale metadata + sitemap entry"
```

---

### Task 5: Deep-link `/explore?place=slug`

Destination du CTA « Voir ce spot » : le drawer de l'explorateur s'ouvre tout seul à l'arrivée.

**Files:**
- Modify: `src/components/explore/ExploreView.tsx` (après la définition de `selectPlace`, ~ligne 253)

- [ ] **Step 1: Ajouter l'effet de deep-link**

Dans `ExploreView`, juste après la fonction `selectPlace(slug)`, ajouter :

```tsx
  // Deep-link ?place=slug : ouvre le drawer à l'arrivée (utilisé par /match).
  // Lecture window au mount plutôt que useSearchParams() : évite le bailout
  // Suspense de Next sur une page ISR.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("place");
    if (slug && places.some((p) => p.slug === slug)) selectPlace(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Note : `selectPlace` fait un `flyTo` sur `mapRef.current?` qui peut être null au mount ; le `?.` couvre déjà ce cas (la carte s'ouvrira sans recentrage si la map n'est pas prête, comportement acceptable).

- [ ] **Step 2: Vérifier en dev**

Run: ouvrir `http://localhost:3000/en/explore?place=<un-slug-du-deck>` (prendre un slug visible dans l'onglet réseau de `/en/match` ou via la liste explore).
Expected: le drawer du lieu s'ouvre automatiquement avec photos et détails.

- [ ] **Step 3: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: 0 nouvelle erreur.

```bash
git add src/components/explore/ExploreView.tsx
git commit -m "feat(explore): open place drawer from ?place= deep link"
```

---

### Task 6: Teaser « Trouve ton spot » sur la home

**Files:**
- Modify: `src/lib/cb-places.ts` (fin de fichier)
- Modify: `src/app/[locale]/page.tsx:83` (Promise.all) + props HomeClient
- Modify: `src/components/home/HomeClient.tsx` (interface props ~ligne 595, objet `T` ~ligne 52, section avant `{/* ═══════ NEWSLETTER bande sable ═══════ */}`)

- [ ] **Step 1: Helper photos teaser dans `cb-places.ts`**

Ajouter en fin de `src/lib/cb-places.ts` :

```ts
// 3 photos de plages très bien notées pour le teaser /match de la home.
export async function getMatchTeaserPhotos(): Promise<string[]> {
  const { data, error } = await supabase
    .from("cb_places")
    .select("photos")
    .eq("place_type", "beach")
    .gt("photo_count", 0)
    .gte("rating", 4.5)
    .order("rating", { ascending: false })
    .limit(3);
  if (error) return [];
  return ((data as { photos: string[] | null }[]) || [])
    .map((r) => r.photos?.[0])
    .filter((u): u is string => Boolean(u));
}
```

- [ ] **Step 2: Brancher le fetch dans la home**

Dans `src/app/[locale]/page.tsx` :

1. Ajouter l'import :
```ts
import { getMatchTeaserPhotos } from "@/lib/cb-places";
```

2. Modifier le `Promise.all` (ligne 83) :
```ts
  const [cities, latestNews, upcomingEvents, latestGuides, swim, busRoutes, matchTeaserPhotos] = await Promise.all([
    fetchAllCitiesWeather(),
    getLatestNews(8, locale).catch((): NewsItem[] => []),
    getUpcomingEvents(5).catch((): Event[] => []),
    getEditorialGuides(12).catch((): Guide[] => []),
    buildSwimToday().catch(() => null),
    getBusRoutes().catch((): BusRoute[] => []),
    getMatchTeaserPhotos().catch((): string[] => []),
  ]);
```

3. Passer la prop dans le rendu `<HomeClient ... />` :
```tsx
        matchTeaserPhotos={matchTeaserPhotos}
```

- [ ] **Step 3: Props + libellés + section dans HomeClient**

Dans `src/components/home/HomeClient.tsx` :

1. Interface `HomeClientProps` : ajouter
```ts
  matchTeaserPhotos: string[];
```

2. Signature du composant : ajouter `matchTeaserPhotos` à la destructuration :
```ts
export function HomeClient({ cities, latestNews, upcomingEvents, latestGuides, swimPick, swimSides, boardRoutes, matchTeaserPhotos, locale }: HomeClientProps) {
```

3. Objet `T` inline (en haut du fichier, après `liveFromIsland`) : ajouter
```ts
  matchTitle: { en: "Find your perfect spot", fr: "Trouve ton spot idéal", de: "Finde deinen perfekten Ort", el: "Βρες το ιδανικό σου μέρος" },
  matchSub: {
    en: "Swipe beaches, gorges and villages. Like or pass, and get your match.",
    fr: "Fais défiler plages, gorges et villages. Like ou passe, et trouve ton match.",
    de: "Wische durch Strände, Schluchten und Dörfer. Like oder weiter, und finde dein Match.",
    el: "Κάνε swipe σε παραλίες, φαράγγια και χωριά. Like ή πέρνα, και βρες το match σου.",
  },
  matchCta: { en: "Start swiping", fr: "Commencer", de: "Los geht's", el: "Ξεκίνα" },
```

4. Insérer la section juste AVANT `{/* ═══════ NEWSLETTER bande sable ═══════ */}` :

```tsx
        {/* ═══════ MATCH : trouve ton spot ═══════ */}
        {matchTeaserPhotos.length > 0 && (
          <section className="my-10">
            <Link
              href="/match"
              className="card-base group flex flex-col items-center gap-7 overflow-hidden px-8 py-7 no-underline !rounded-[30px] sm:flex-row"
            >
              <div className="relative h-[120px] w-[180px] shrink-0">
                {matchTeaserPhotos.slice(0, 3).map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="absolute left-1/2 top-1/2 h-[104px] w-[78px] rounded-2xl border-4 border-white object-cover shadow-[0_10px_24px_rgba(11,94,120,.22)] transition-transform duration-300 group-hover:scale-105"
                    style={{ transform: `translate(-50%,-50%) rotate(${(i - 1) * 12}deg) translateX(${(i - 1) * 34}px)` }}
                  />
                ))}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="m-0 font-heading text-[22px] font-extrabold text-text">{T.matchTitle[ui]}</h3>
                <p className="m-0 mt-0.5 text-[13.5px] text-text-muted">{T.matchSub[ui]}</p>
              </div>
              <span className="rounded-full bg-terra px-6 py-3 font-heading text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(237,122,92,.35)] transition-transform group-hover:scale-105">
                {T.matchCta[ui]}
              </span>
            </Link>
          </section>
        )}
```

Note : si l'objet `T` du fichier a une structure différente (sous-objets comme `heroSea`), suivre le pattern des clés plates (`T.matchTitle[ui]`).

- [ ] **Step 4: Vérifier en dev**

Run: ouvrir `http://localhost:3000/fr`.
Expected: avant la bande newsletter sable, une carte blanche avec 3 photos en éventail, titre « Trouve ton spot idéal », bouton terracotta « Commencer ». Le clic mène à `/fr/match`.

- [ ] **Step 5: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: 0 nouvelle erreur.

```bash
git add src/lib/cb-places.ts "src/app/[locale]/page.tsx" src/components/home/HomeClient.tsx
git commit -m "feat(home): match swipe teaser card with fanned beach photos"
```

---

### Task 7: QA finale, build complet, push prod

**Files:** aucun nouveau.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: 0 nouvelle erreur (warnings préexistants tolérés).

- [ ] **Step 2: Build complet**

Run: `npm run build`
Expected: build OK, la route `/[locale]/match` apparaît dans le manifest de build (ISR 1d). Le build est long (24K+ pages), prévoir plusieurs minutes.

- [ ] **Step 3: QA navigateur (mobile + desktop)**

Avec le serveur (`npm run start` ou dev), vérifier :
1. `/en/match` en viewport mobile (375px) : deck plein écran utilisable au doigt (drag tactile), boutons accessibles, pas de scroll horizontal parasite.
2. Cycle complet : 8 swipes → match → « Voir ce spot » → drawer explore ouvert sur le bon lieu.
3. Shortlist : liker 3 lieux, vérifier les 3 vignettes cliquables.
4. Recharger `/en/match` : pas de cartes déjà vues, compteur shortlist conservé.
5. Console navigateur : zéro erreur (les warnings Sentry/maplibre préexistants tolérés).
6. Vérifier qu'AUCUNE description scrapée n'apparaît dans le HTML de `/match` (contrainte copyright) : `curl -s http://localhost:3000/en/match | grep -ci "cretanbeaches"` doit retourner `0`.

- [ ] **Step 4: Push prod (master + main)**

```bash
git push origin master && git push origin master:main
```

Expected: déploiement Vercel auto. Vérifier ensuite `https://crete.direct/en/match` en prod.

- [ ] **Step 5: Mémoire Kairos**

Ajouter une ligne `session_log.md` (catégorie DEPLOY) + mettre à jour `project_crete_direct.md` et sa ligne d'index `MEMORY.md` (règle index sync). Mentionner le critère de succès : `match_clicked` / `match_deck_start` > 25 % à J+14 dans Plausible (owner Kami, relecture vers le 25/06/2026).

---

## Self-Review (fait à la rédaction)

- **Spec coverage** : deck lieux ✔ (T2-T4), teaser home ✔ (T6), match algorithmique 8 swipes ✔ (T3), deep-link explore ✔ (T5), localStorage ✔ (T3), Plausible 6 events ✔ (T3 : `match_deck_start`, `swipe_like`, `swipe_pass`, `match_shown`, `match_clicked`, `match_replay`), i18n 4 langues fallback EN ✔, sitemap/metadata ✔ (T4), pas de descriptions scrapées exposées ✔ (MatchPlace ne porte pas `description`, vérifié en QA T7).
- **Pas de placeholders** : chaque étape porte son code complet.
- **Cohérence des types** : `MatchPlace`/`TasteProfile` définis en T2, consommés tels quels en T3/T4 ; `typeLabel` défini en T1, importé en T3 ; `matchTeaserPhotos: string[]` cohérent T6 étapes 1-3.
