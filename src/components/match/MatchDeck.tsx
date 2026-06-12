"use client";

// Deck de swipe façon Tinder sur les lieux cb_places.
// Spec : docs/superpowers/specs/2026-06-11-match-swipe-design.md
// La logique de scoring est pure (src/lib/match-scoring.ts) ;
// ici : gestes, écrans, persistance localStorage, events Plausible.

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "motion/react";
import { Heart, X, MapPin, Star, RotateCcw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { typeLabel } from "@/lib/cb-type-labels";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { AffiliateBanner } from "@/components/ui/affiliate-banner";
import {
  type MatchPlace,
  type TasteProfile,
  INTEREST_GROUPS,
  emptyProfile,
  interestTypes,
  pickMatch,
  sampleDeck,
  seedProfile,
  updateProfile,
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
    interestsTitle: "What do you like?",
    interestsHint: "Pick your interests, the deck adapts. You can change them anytime.",
    interestsAll: "Everything works for me",
    interestsGo: "Let's go",
    editInterests: "Change my interests",
    finish: "I'm done liking",
    synthTitle: "Your selection",
    synthSub: "Everything you liked, ready to plan:",
    synthTaste: "Your taste:",
    route: "Route",
    sheet: "Details",
    backToDeck: "Back to swiping",
    synthEmpty: "No likes yet. Swipe right on what you love!",
    groupBeaches: "Beaches",
    groupNature: "Nature & hikes",
    groupMonasteries: "Monasteries & churches",
    groupHistory: "History & ruins",
    groupCaves: "Caves",
    groupTowns: "Towns & villages",
    groupMuseums: "Museums",
    groupIslands: "Islands & lighthouses",
    emailTitle: "Get your selection by email",
    emailPlaceholder: "your@email.com",
    emailSend: "Send me my spots",
    emailSent: "Sent! Check your inbox.",
    emailError: "Something went wrong. Try again.",
    emailOptin: "Also send me the weekly Crete briefing",
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
    interestsTitle: "Qu'est-ce qui te plaît ?",
    interestsHint: "Coche tes centres d'intérêt, le paquet s'adapte. Modifiable à tout moment.",
    interestsAll: "Tout me va",
    interestsGo: "C'est parti",
    editInterests: "Modifier mes centres d'intérêt",
    finish: "J'ai fini de liker",
    synthTitle: "Ta sélection",
    synthSub: "Tout ce que tu as liké, prêt à planifier :",
    synthTaste: "Tes goûts :",
    route: "Itinéraire",
    sheet: "Fiche",
    backToDeck: "Reprendre le swipe",
    synthEmpty: "Pas encore de like. Balaie à droite ce qui te plaît !",
    groupBeaches: "Plages",
    groupNature: "Nature & rando",
    groupMonasteries: "Monastères & églises",
    groupHistory: "Histoire & ruines",
    groupCaves: "Grottes",
    groupTowns: "Villes & villages",
    groupMuseums: "Musées",
    groupIslands: "Îles & phares",
    emailTitle: "Reçois ta sélection par email",
    emailPlaceholder: "ton@email.com",
    emailSend: "Envoyer mes spots",
    emailSent: "Envoyé ! Regarde ta boîte mail.",
    emailError: "Un souci est survenu. Réessaie.",
    emailOptin: "Et envoie-moi le briefing hebdo Crète",
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
    interestsTitle: "Was gefällt dir?",
    interestsHint: "Wähle deine Interessen, der Stapel passt sich an. Jederzeit änderbar.",
    interestsAll: "Alles passt für mich",
    interestsGo: "Los geht's",
    editInterests: "Interessen ändern",
    finish: "Fertig mit Liken",
    synthTitle: "Deine Auswahl",
    synthSub: "Alles, was dir gefallen hat, bereit zum Planen:",
    synthTaste: "Dein Geschmack:",
    route: "Route",
    sheet: "Details",
    backToDeck: "Weiter swipen",
    synthEmpty: "Noch keine Likes. Wische nach rechts, was dir gefällt!",
    groupBeaches: "Strände",
    groupNature: "Natur & Wandern",
    groupMonasteries: "Klöster & Kirchen",
    groupHistory: "Geschichte & Ruinen",
    groupCaves: "Höhlen",
    groupTowns: "Städte & Dörfer",
    groupMuseums: "Museen",
    groupIslands: "Inseln & Leuchttürme",
    emailTitle: "Erhalte deine Auswahl per E-Mail",
    emailPlaceholder: "deine@email.com",
    emailSend: "Meine Orte senden",
    emailSent: "Gesendet! Schau in dein Postfach.",
    emailError: "Etwas ist schiefgelaufen. Versuch es nochmal.",
    emailOptin: "Schick mir auch das wöchentliche Kreta-Briefing",
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
    interestsTitle: "Τι σου αρέσει;",
    interestsHint: "Διάλεξε τα ενδιαφέροντά σου, η τράπουλα προσαρμόζεται. Αλλάζουν όποτε θες.",
    interestsAll: "Όλα μου ταιριάζουν",
    interestsGo: "Πάμε",
    editInterests: "Αλλαγή ενδιαφερόντων",
    finish: "Τελείωσα με τα like",
    synthTitle: "Η επιλογή σου",
    synthSub: "Ό,τι σου άρεσε, έτοιμο για σχεδιασμό:",
    synthTaste: "Τα γούστα σου:",
    route: "Διαδρομή",
    sheet: "Λεπτομέρειες",
    backToDeck: "Πίσω στο swipe",
    synthEmpty: "Κανένα like ακόμα. Σύρε δεξιά ό,τι σου αρέσει!",
    groupBeaches: "Παραλίες",
    groupNature: "Φύση & πεζοπορία",
    groupMonasteries: "Μοναστήρια & εκκλησίες",
    groupHistory: "Ιστορία & ερείπια",
    groupCaves: "Σπήλαια",
    groupTowns: "Πόλεις & χωριά",
    groupMuseums: "Μουσεία",
    groupIslands: "Νησιά & φάροι",
    emailTitle: "Λάβε την επιλογή σου με email",
    emailPlaceholder: "to@email.com",
    emailSend: "Στείλε μου τα μέρη μου",
    emailSent: "Στάλθηκε! Δες τα εισερχόμενά σου.",
    emailError: "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
    emailOptin: "Στείλε μου και το εβδομαδιαίο briefing Κρήτης",
  },
};

// Types « excursionnables » : déclenchent le bandeau GetYourGuide en synthèse.
const TOURABLE_TYPES = new Set([
  "gorge", "island", "beach", "cave", "natural-park", "waterfall",
  "archaeological-site", "historical-site",
]);

// Libellé localisé d'un groupe d'intérêts (clé "beaches" → t.groupBeaches).
const GROUP_LABEL_KEYS: Record<string, string> = {
  beaches: "groupBeaches",
  nature: "groupNature",
  monasteries: "groupMonasteries",
  history: "groupHistory",
  caves: "groupCaves",
  towns: "groupTowns",
  museums: "groupMuseums",
  islands: "groupIslands",
};

interface Stored {
  profile: TasteProfile;
  liked: string[];
  seen: string[];
  // null = onboarding jamais répondu ; [] = « tout me va » (pas de pondération).
  interests: string[] | null;
}

function loadStored(): Stored {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Stored;
      if (s && typeof s === "object" && s.profile && Array.isArray(s.liked) && Array.isArray(s.seen)) {
        // Migration V1 → V1.1 : les anciens stockages n'ont pas interests.
        return { ...s, interests: Array.isArray(s.interests) ? s.interests : null };
      }
    }
  } catch {
    // localStorage indisponible ou corrompu : on repart de zéro.
  }
  return { profile: emptyProfile(), liked: [], seen: [], interests: null };
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
    // La carte sortante ne doit plus capter le geste suivant pendant l'exit.
    pointerEvents: "none" as const,
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
        // Vélocité dominante d'abord (fling), sinon offset si le geste final
        // ne repart pas dans l'autre sens.
        const vx = info.velocity.x;
        const ox = info.offset.x;
        let dir = 0;
        if (Math.abs(vx) > SWIPE_VELOCITY) dir = Math.sign(vx);
        else if (Math.abs(ox) > SWIPE_OFFSET && Math.sign(vx || ox) === Math.sign(ox)) dir = Math.sign(ox);
        if (dir === 1) onSwipe(true);
        else if (dir === -1) onSwipe(false);
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
  const [screen, setScreen] = useState<"deck" | "interests" | "synthesis">("deck");
  const [interests, setInterests] = useState<string[] | null>(null);
  const [pendingGroups, setPendingGroups] = useState<string[]>([]);
  const [synthEmail, setSynthEmail] = useState("");
  const [synthEmailStatus, setSynthEmailStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [newsletterOptin, setNewsletterOptin] = useState(false);
  const lastSwipedRef = useRef<string | null>(null);

  // Hydratation au mount uniquement : localStorage + échantillonnage aléatoire
  // (jamais au render serveur, sinon mismatch d'hydratation).
  useEffect(() => {
    const stored = loadStored();
    // Sync depuis localStorage après hydratation : un lazy initializer créerait
    // un mismatch SSR (le HTML serveur est rendu sans état client).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(stored.profile);
    setLikedSlugs(stored.liked);
    setSeenSlugs(stored.seen);
    setInterests(stored.interests);
    setDeck(sampleDeck(pool, DECK_SIZE, new Set(stored.seen), interestTypes(stored.interests || [])));
    if (stored.interests === null) {
      setScreen("interests");
      setPendingGroups([]);
    }
    setReady(true);
    track("match_deck_start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation de l'onboarding (groups = [] pour « tout me va »).
  // Le profil n'est seedé que sur les groupes NOUVELLEMENT cochés
  // (pas de cumul quand on ré-édite ses centres d'intérêt).
  function applyInterests(groups: string[]) {
    const prev = new Set(interests || []);
    const added = groups.filter((g) => !prev.has(g));
    const nextProfile = added.length ? seedProfile(added, profile) : profile;
    setProfile(nextProfile);
    setInterests(groups);
    setDeck(sampleDeck(pool, DECK_SIZE, new Set(seenSlugs), interestTypes(groups)));
    setIndex(0);
    setSwipes(0);
    lastSwipedRef.current = null;
    setScreen("deck");
    saveStored({ profile: nextProfile, liked: likedSlugs, seen: seenSlugs, interests: groups });
    track("interests_set", { groups: groups.length ? groups.join(",") : "all" });
  }

  function handleSwipe(liked: boolean) {
    const place = deck[index];
    if (!place || match || screen !== "deck") return;
    // Garde anti-double-traitement : un même slug ne peut pas être swipé deux fois
    // d'affilée (closure périmée, double event pendant l'exit).
    if (lastSwipedRef.current === place.slug) return;
    lastSwipedRef.current = place.slug;
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
    saveStored({ profile: nextProfile, liked: nextLiked, seen: nextSeen, interests });
  }

  // Le match sort du deck restant et compte comme vu (sinon il revient en carte).
  function closeMatch(replay: boolean) {
    if (!match) return;
    const slug = match.slug;
    const nextSeen = seenSlugs.includes(slug) ? seenSlugs : [...seenSlugs, slug];
    setSeenSlugs(nextSeen);
    setDeck((d) => d.filter((p, i) => i < index || p.slug !== slug));
    setMatch(null);
    saveStored({ profile, liked: likedSlugs, seen: nextSeen, interests });
    if (replay) track("match_replay");
  }

  // Envoi de la sélection par email (+ opt-in newsletter séparé, double opt-in existant).
  async function submitSelectionEmail(e: React.FormEvent) {
    e.preventDefault();
    if (synthEmailStatus === "loading" || likedSlugs.length === 0) return;
    setSynthEmailStatus("loading");
    try {
      const res = await fetch("/api/match/selection-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: synthEmail, locale, slugs: likedSlugs, website: "" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSynthEmailStatus("sent");
      track("synthesis_email_sent", { likes: String(likedSlugs.length) });
      if (newsletterOptin) {
        fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: synthEmail, locale, website: "" }),
        }).catch(() => undefined);
        track("synthesis_email_newsletter_optin");
      }
    } catch {
      setSynthEmailStatus("error");
    }
  }

  function redeal() {
    const seen = new Set(seenSlugs);
    setDeck(sampleDeck(pool, DECK_SIZE, seen, interestTypes(interests || [])));
    setIndex(0);
    setSwipes(0);
    // Nouveau paquet : il peut recommencer par n'importe quel slug, et après
    // reset du pool un slug déjà swipé peut légitimement revenir.
    lastSwipedRef.current = null;
    track("match_deck_start", { redeal: "1" });
  }

  const handleSwipeRef = useRef(handleSwipe);
  // Convention « latest ref » : on stocke la version courante de handleSwipe
  // pour que le listener clavier (bindé une seule fois) ne soit jamais périmé.
  // eslint-disable-next-line react-hooks/refs
  handleSwipeRef.current = handleSwipe;

  // Flèches clavier (desktop). Listener bindé une fois, version courante via ref
  // (un re-bind par render laisse une fenêtre de closure périmée sous auto-repeat).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleSwipeRef.current(true);
      if (e.key === "ArrowLeft") handleSwipeRef.current(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = deck.slice(index, index + 3);
  // Tous les likes, du plus récent au plus ancien (synthèse = liste complète,
  // barre de vignettes = les 12 derniers).
  const likedPlacesAll = likedSlugs
    .map((slug) => pool.find((p) => p.slug === slug))
    .filter((p): p is MatchPlace => Boolean(p))
    .reverse();
  const likedPlaces = likedPlacesAll.slice(0, 12);

  // Top 3 des types likés pour le résumé de goûts de la synthèse.
  const tasteCounts = new Map<string, number>();
  for (const p of likedPlacesAll) tasteCounts.set(p.place_type, (tasteCounts.get(p.place_type) || 0) + 1);
  const topTastes = [...tasteCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // ── Écran onboarding : centres d'intérêt ──
  if (ready && screen === "interests") {
    return (
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-8">
        <h1 className="m-0 text-center font-heading text-[30px] font-extrabold text-text">{t.interestsTitle}</h1>
        <p className="mx-auto mb-7 mt-1.5 max-w-[320px] text-center text-[13.5px] text-text-muted">{t.interestsHint}</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {INTEREST_GROUPS.map((g) => {
            const active = pendingGroups.includes(g.key);
            return (
              <button
                key={g.key}
                onClick={() =>
                  setPendingGroups((prev) =>
                    prev.includes(g.key) ? prev.filter((k) => k !== g.key) : [...prev, g.key],
                  )
                }
                className={`rounded-full border px-4.5 py-2.5 font-heading text-[14px] font-bold transition-colors ${
                  active
                    ? "border-aegean bg-aegean text-white"
                    : "border-border bg-white text-text hover:border-aegean"
                }`}
              >
                {t[GROUP_LABEL_KEYS[g.key]]}
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <button
            onClick={() => applyInterests(pendingGroups)}
            disabled={pendingGroups.length === 0}
            className="w-full max-w-[280px] rounded-full bg-terra px-6 py-3.5 font-heading text-[15px] font-bold text-white shadow-[0_12px_28px_rgba(237,122,92,.4)] disabled:opacity-40 disabled:shadow-none"
          >
            {t.interestsGo}
          </button>
          <button
            onClick={() => applyInterests([])}
            className="rounded-full px-6 py-2.5 font-heading text-[13.5px] font-bold text-text-muted hover:text-aegean"
          >
            {t.interestsAll}
          </button>
        </div>
      </div>
    );
  }

  // ── Écran synthèse : tout ce qui a été liké + itinéraires ──
  if (ready && screen === "synthesis") {
    return (
      <div className="mx-auto w-full max-w-[440px] px-4 pb-16 pt-8">
        <h1 className="m-0 text-center font-heading text-[30px] font-extrabold text-text">{t.synthTitle}</h1>
        <p className="mx-auto mt-1.5 max-w-[320px] text-center text-[13.5px] text-text-muted">{t.synthSub}</p>
        {topTastes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[12.5px] font-medium text-text-muted">{t.synthTaste}</span>
            {topTastes.map(([type, count]) => (
              <span key={type} className="rounded-full bg-stone px-3 py-1 font-heading text-[12.5px] font-bold text-aegean">
                {typeLabel(type, locale)} <span className="font-data text-lagoon-deep">{count}</span>
              </span>
            ))}
          </div>
        )}
        {likedPlacesAll.length === 0 ? (
          <p className="mt-10 text-center text-[14px] text-text-muted">{t.synthEmpty}</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {likedPlacesAll.map((p) => (
              <div key={p.slug} className="card-base flex items-center gap-3.5 p-3">
                <img
                  src={p.photos[0]}
                  alt={p.name}
                  loading="lazy"
                  className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate font-heading text-[15.5px] font-bold text-text">{p.name}</p>
                  <p className="m-0 mt-0.5 text-[12px] text-text-muted">
                    {typeLabel(p.place_type, locale)}
                    {p.prefecture ? ` · ${p.prefecture}` : ""}
                    {p.rating != null && p.rating > 0 ? ` · ${p.rating.toFixed(1)} ★` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Link
                      href={`/explore?place=${p.slug}`}
                      onClick={() => track("synthesis_place_clicked", { slug: p.slug })}
                      className="rounded-full bg-stone px-3 py-1.5 font-heading text-[12px] font-bold text-aegean no-underline"
                    >
                      {t.sheet}
                    </Link>
                    {p.latitude != null && p.longitude != null && (
                      <>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => track("synthesis_route_clicked", { slug: p.slug, app: "gmaps" })}
                          className="inline-flex items-center gap-1 rounded-full bg-aegean px-3 py-1.5 font-heading text-[12px] font-bold text-white no-underline"
                        >
                          <MapPin size={11} /> {t.route}
                        </a>
                        <a
                          href={`https://waze.com/ul?ll=${p.latitude},${p.longitude}&navigate=yes`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => track("synthesis_route_clicked", { slug: p.slug, app: "waze" })}
                          className="rounded-full bg-lagoon-deep px-3 py-1.5 font-heading text-[12px] font-bold text-white no-underline"
                        >
                          Waze
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {likedPlacesAll.length > 0 && (
          <>
            {/* Conversion 1 : voiture (partenaire local), l'intention est routière */}
            <div className="mt-6">
              <CarPromo locale={locale} source="match-synthesis" />
            </div>

            {/* Conversion 2 : tours GYG, seulement si la sélection s'y prête */}
            {likedPlacesAll.some((p) => TOURABLE_TYPES.has(p.place_type)) && (
              <AffiliateBanner type="tours" locale={locale} className="mt-4" />
            )}

            {/* Conversion 3 : la sélection par email */}
            <div className="card-base mt-4 px-6 py-5 !rounded-[24px]">
              <p className="m-0 font-heading text-[15px] font-bold text-text">{t.emailTitle}</p>
              {synthEmailStatus === "sent" ? (
                <p className="m-0 mt-2 text-[13.5px] font-medium text-ok">{t.emailSent}</p>
              ) : (
                <form onSubmit={submitSelectionEmail} className="mt-3">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={synthEmail}
                      onChange={(e) => setSynthEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className="min-w-0 flex-1 rounded-full border border-border bg-white px-4 py-2.5 text-[14px] text-text outline-none focus:border-aegean"
                    />
                    <button
                      type="submit"
                      disabled={synthEmailStatus === "loading"}
                      className="shrink-0 rounded-full bg-aegean px-5 py-2.5 font-heading text-[13px] font-bold text-white disabled:opacity-50"
                    >
                      {synthEmailStatus === "loading" ? "..." : t.emailSend}
                    </button>
                  </div>
                  <label className="mt-2.5 flex cursor-pointer items-center gap-2 text-[12.5px] text-text-muted">
                    <input
                      type="checkbox"
                      checked={newsletterOptin}
                      onChange={(e) => setNewsletterOptin(e.target.checked)}
                      className="h-4 w-4 accent-aegean"
                    />
                    {t.emailOptin}
                  </label>
                  {synthEmailStatus === "error" && (
                    <p className="m-0 mt-2 text-[12.5px] font-medium text-terra">{t.emailError}</p>
                  )}
                </form>
              )}
            </div>
          </>
        )}

        <button
          onClick={() => setScreen("deck")}
          className="mx-auto mt-7 flex items-center gap-2 rounded-full bg-stone px-6 py-3 font-heading text-[14px] font-bold text-aegean"
        >
          <RotateCcw size={15} /> {t.backToDeck}
        </button>
      </div>
    );
  }

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

      {/* J'ai fini de liker → synthèse */}
      {ready && likedSlugs.length > 0 && (
        <button
          onClick={() => {
            setScreen("synthesis");
            track("finish_clicked", { likes: String(likedSlugs.length) });
          }}
          className="mx-auto mt-5 block rounded-full bg-night px-7 py-3 font-heading text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(7,55,74,.35)] transition-transform hover:scale-105"
        >
          {t.finish} <span className="font-data text-sun">{likedSlugs.length}</span>
        </button>
      )}

      {/* Modifier ses centres d'intérêt */}
      {ready && (
        <button
          onClick={() => {
            setPendingGroups(interests || []);
            setScreen("interests");
          }}
          className="mx-auto mt-3 block text-[12.5px] font-medium text-text-muted underline-offset-2 hover:text-aegean hover:underline"
        >
          {t.editInterests}
        </button>
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
                  onClick={() => {
                    track("match_clicked", { slug: match.slug });
                    // Marquer le lieu comme vu avant la navigation, sinon le slug
                    // du match n'est jamais persisté quand on quitte par ce lien.
                    const nextSeen = seenSlugs.includes(match.slug) ? seenSlugs : [...seenSlugs, match.slug];
                    saveStored({ profile, liked: likedSlugs, seen: nextSeen, interests });
                  }}
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
