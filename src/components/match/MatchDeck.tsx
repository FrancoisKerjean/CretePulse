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
    // Sync depuis localStorage apres hydratation : un lazy initializer creerait
    // un mismatch SSR (le HTML serveur est rendu sans etat client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
