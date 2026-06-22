"use client";

// Home Kalimera : hero lagon + ile carte live + board nuit + tuiles pleines.
// Cahier des charges visuel : docs/design/kalimera/home-v8.html (transpose).
// Spec : docs/superpowers/specs/2026-06-11-brand-da-kalimera-design.md
import { useState } from "react";
import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import Image from "next/image";
import { CardThumb } from "@/components/CardThumb";
import { AbstractFallback } from "@/components/AbstractFallback";
import { CreteMap } from "@/components/CreteMap";
import { DepBoard } from "@/components/DepBoard";
import { WindArrow } from "@/components/WindArrow";
import { Heart, MapPin } from "lucide-react";
import {
  CiBus, CiWave, CiSun, CiCompass, CiPlane, CiChart,
  CiCalendar, CiNews, CiBook,
  CiInstagram, CiFacebook, CiYouTube,
} from "@/components/icons";
import { Link } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { BusRoute } from "@/lib/buses";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";
import { localizeLocation } from "@/lib/localize-location";
import { type Guide, getLocalizedGuideField } from "@/lib/guides";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 60) return mins <= 1 ? "now" : `${mins}m`;
  if (hrs < 24) return `${hrs}h`;
  if (days === 1) return "1d";
  return `${days}d`;
}

function formatEventDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  const lang = locale === "el" ? "el-GR" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-GB";
  const month = d.toLocaleDateString(lang, { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

// Libelles inline 4 langues (pattern du site), fallback EN pour les 18 autres.
type Ui = "en" | "fr" | "de" | "el";
const pickUi = (l: string): Ui => (["en", "fr", "de", "el"].includes(l) ? (l as Ui) : "en");

const T = {
  heroTitle: { en: "Crete, today", fr: "La Crète, aujourd'hui", de: "Kreta, heute", el: "Η Κρήτη σήμερα" },
  matchKicker: { en: "Swipe & match", fr: "Swipe & match", de: "Swipe & match", el: "Swipe & match" },
  matchTitle: { en: "The Tinder of Crete", fr: "Le Tinder de la Crète", de: "Das Tinder Kretas", el: "Το Tinder της Κρήτης" },
  matchSub: {
    en: "Swipe beaches, gorges and villages. Like or pass, and get your match.",
    fr: "Fais défiler plages, gorges et villages. Like ou passe, et trouve ton match.",
    de: "Wische durch Strände, Schluchten und Dörfer. Like oder weiter, und finde dein Match.",
    el: "Κάνε swipe σε παραλίες, φαράγγια και χωριά. Like ή πέρνα, και βρες το match σου.",
  },
  matchCta: { en: "Start swiping", fr: "Commencer", de: "Los geht's", el: "Ξεκίνα" },
  // H1 "enfant de 5 ans" : dire ce que fait le site, en 2 phrases courtes.
  heroMain: {
    en: { pre: "Beaches, buses, weather.", hl: "Crete, live." },
    fr: { pre: "Plages, bus, météo.", hl: "La Crète, en direct." },
    de: { pre: "Strände, Busse, Wetter.", hl: "Kreta, live." },
    el: { pre: "Παραλίες, λεωφορεία, καιρός.", hl: "Η Κρήτη, ζωντανά." },
  },
  // Sous-titre : la donnee du jour + ce qu'on fait pour le lecteur.
  heroToday: {
    en: (rating: string, name: string) => `Today the sea is ${rating} at ${name}. We watch the wind, the sea and the buses for you, all day long.`,
    fr: (rating: string, name: string) => `Aujourd'hui la mer est ${rating} à ${name}. On surveille le vent, la mer et les bus pour toi, toute la journée.`,
    de: (rating: string, name: string) => `Heute ist das Meer ${rating} bei ${name}. Wir behalten Wind, Meer und Busse für dich im Blick, den ganzen Tag.`,
    el: (rating: string, name: string) => `Σήμερα η θάλασσα είναι ${rating} στο ${name}. Παρακολουθούμε τον άνεμο, τη θάλασσα και τα λεωφορεία για σένα, όλη μέρα.`,
  },
  liveFromIsland: { en: "live from the island", fr: "en direct de l'île", de: "live von der Insel", el: "ζωντανά από το νησί" },
  heroSub: {
    en: "Computed live · 10 weather stations × the orientation of 500 beaches.",
    fr: "Calculé en direct · 10 stations météo × l'orientation de 500 plages.",
    de: "Live berechnet · 10 Wetterstationen × die Ausrichtung von 500 Stränden.",
    el: "Υπολογίζεται ζωντανά · 10 μετεωρολογικοί σταθμοί × 500 παραλίες.",
  },
  ctaBeach: { en: "See today's beach", fr: "Voir la plage du jour", de: "Strand des Tages", el: "Η παραλία της ημέρας" },
  air: { en: "air", fr: "air", de: "Luft", el: "αέρας" },
  sea: { en: "sea", fr: "mer", de: "Meer", el: "θάλασσα" },
  islandNow: { en: "The island, right now", fr: "L'île, maintenant", de: "Die Insel, jetzt", el: "Το νησί, τώρα" },
  allStations: { en: "All stations", fr: "Toutes les stations", de: "Alle Stationen", el: "Όλοι οι σταθμοί" },
  swimToday: { en: "Where to swim today", fr: "Où se baigner aujourd'hui", de: "Wo heute baden", el: "Πού για μπάνιο σήμερα" },
  allBeaches: { en: "All 500 beaches", fr: "Les 500 plages", de: "Alle 500 Strände", el: "Οι 500 παραλίες" },
  todaysPick: { en: "today's pick", fr: "la préco du jour", de: "Tipp des Tages", el: "η επιλογή της ημέρας" },
  toolsTitle: { en: "The tools", fr: "Les outils", de: "Die Tools", el: "Τα εργαλεία" },
  ratings: {
    calm: { en: "calm", fr: "calme", de: "ruhig", el: "ήρεμη" },
    fair: { en: "fair", fr: "correct", de: "passabel", el: "καλή" },
    exposed: { en: "exposed", fr: "exposée", de: "exponiert", el: "εκτεθειμένη" },
  },
  seaStates: {
    calm: { en: "calm", fr: "calme", de: "ruhig", el: "ήρεμη" },
    ok: { en: "swim ok", fr: "baignade ok", de: "Baden ok", el: "για μπάνιο" },
    rough: { en: "choppy", fr: "agitée", de: "kabbelig", el: "κυματώδης" },
  },
  regions: {
    south: { en: "South coast", fr: "Côte sud", de: "Südküste", el: "Νότια ακτή" },
    west: { en: "West coast", fr: "Côte ouest", de: "Westküste", el: "Δυτική ακτή" },
    east: { en: "East coast", fr: "Côte est", de: "Ostküste", el: "Ανατολική ακτή" },
    central: { en: "Central coast", fr: "Côte centrale", de: "Zentralküste", el: "Κεντρική ακτή" },
  },
  tools: {
    buses: { en: "Buses", fr: "Bus", de: "Busse", el: "Λεωφορεία" },
    busesLine: { en: "Timetables & prices", fr: "Horaires & prix", de: "Fahrpläne & Preise", el: "Ώρες & τιμές" },
    swim: { en: "Swimming", fr: "Baignade", de: "Baden", el: "Μπάνιο" },
    swimLine: { en: "500 beaches live", fr: "500 plages live", de: "500 Strände live", el: "500 παραλίες live" },
    explore: { en: "Explore", fr: "Explorer", de: "Erkunden", el: "Εξερεύνηση" },
    exploreLine: { en: "2,296 places", fr: "2 296 lieux", de: "2.296 Orte", el: "2.296 μέρη" },
    airports: { en: "Airports", fr: "Aéroports", de: "Flughäfen", el: "Αεροδρόμια" },
    airportsLine: { en: "Traffic & seasons", fr: "Trafic & saisons", de: "Verkehr & Saison", el: "Κίνηση & εποχές" },
    airbnb: { en: "Airbnb data", fr: "Data Airbnb", de: "Airbnb-Daten", el: "Δεδομένα Airbnb" },
    airbnbLine: { en: "Prices by area", fr: "Prix par zone", de: "Preise je Gebiet", el: "Τιμές ανά περιοχή" },
    weather: { en: "Weather", fr: "Météo", de: "Wetter", el: "Καιρός" },
    weatherLine: { en: "10 stations + sea", fr: "10 stations + mer", de: "10 Stationen + Meer", el: "10 σταθμοί + θάλασσα" },
  },
  nextEvents: { en: "Upcoming events", fr: "Prochains événements", de: "Nächste Events", el: "Επόμενες εκδηλώσεις" },
} as const;

function NewsletterFormCompact({ locale }: { locale: string }) {
  const t = useTranslations("home");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setStatus(res.ok ? "success" : "error");
      if (res.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    const successMsg: Record<string, string> = { en: "Thanks!", fr: "Merci !", de: "Danke!", el: "Ευχαριστώ!" };
    return (
      <div className="rounded-full bg-night px-6 py-3 text-white text-center">
        <p className="text-sm font-heading font-bold m-0">{successMsg[locale] || successMsg.en}</p>
      </div>
    );
  }

  return (
    <form className="flex gap-2.5 w-full max-w-md" onSubmit={handleSubmit}>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        required
        className="flex-1 px-5 py-3 rounded-full border-none bg-white text-[13.5px] text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-lagoon/40"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-5 py-3 bg-text text-white rounded-full font-heading font-bold text-sm hover:bg-night transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "..." : t("subscribe")}
      </button>
    </form>
  );
}

export interface SwimPickLite {
  name: string;
  slug: string;
  imageUrl: string | null;
  rating: "calm" | "fair" | "exposed";
  windSpeed: number;
  windCardinal: string;
  windDir: number;
  seaTemp: number | null;
  region: string | null;
  cityName: string;
  lat: number;
  lng: number;
}

export interface SwimSideLite {
  name: string;
  slug: string;
  imageUrl: string | null;
  rating: "calm" | "fair" | "exposed";
}

interface HomeClientProps {
  cities: CityWeather[];
  latestNews: NewsItem[];
  upcomingEvents: Event[];
  latestGuides: Guide[];
  swimPick: SwimPickLite | null;
  swimSides: SwimSideLite[];
  boardRoutes: BusRoute[];
  locale: string;
}

const VERDICT_COLORS: Record<SwimPickLite["rating"], string> = {
  calm: "text-[#0B8A52]",
  fair: "text-[#8A6A14]",
  exposed: "text-terracotta",
};

// Καλημέρα avant 12h Athens, Καλησπέρα après 17h, Γεια σου entre les deux.
function greekGreeting(): string {
  const h = parseInt(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", hour: "2-digit", hour12: false }).format(new Date()),
    10,
  );
  if (h < 12) return "Καλημέρα !";
  if (h >= 17) return "Καλησπέρα !";
  return "Γεια σου !";
}

function seaState(c: CityWeather): { key: "calm" | "ok" | "rough"; warn: boolean } {
  if (c.windSpeed < 12) return { key: "calm", warn: false };
  if (c.windSpeed < 20) return { key: "ok", warn: false };
  return { key: "rough", warn: true };
}

const WTILE_CITIES = ["Heraklion", "Chania", "Ierapetra", "Sitia"];
const TOOL_TINTS = ["bg-[#CFF3F7]", "bg-[#FFE9CF]", "bg-[#E4F0D5]", "bg-[#DCEBFF]", "bg-[#FFE0D6]", "bg-[#FFF1BF]"];

export function HomeClient({ cities, latestNews, upcomingEvents, latestGuides, swimPick, swimSides, boardRoutes, locale }: HomeClientProps) {
  const loc = locale as Locale;
  const ui = pickUi(locale);
  const t = useTranslations("home");

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Athens",
  }).format(new Date());

  const wtileCities = WTILE_CITIES
    .map((n) => cities.find((c) => c.name === n))
    .filter((c): c is CityWeather => Boolean(c));

  const news = latestNews.slice(0, 6);
  const guides = latestGuides.slice(0, 4);
  const events = upcomingEvents.slice(0, 3);
  const heroCity = cities.find((c) => c.name === (swimPick?.cityName ?? "Heraklion")) ?? cities[0];

  const swimPin = swimPick
    ? { name: swimPick.name, lat: swimPick.lat, lng: swimPick.lng }
    : null;

  const TOOLS = [
    { href: "/buses", icon: CiBus, title: T.tools.buses[ui], line: T.tools.busesLine[ui] },
    { href: "/beaches/today", icon: CiWave, title: T.tools.swim[ui], line: T.tools.swimLine[ui] },
    { href: "/explore", icon: CiCompass, title: T.tools.explore[ui], line: T.tools.exploreLine[ui] },
    { href: "/airport", icon: CiPlane, title: T.tools.airports[ui], line: T.tools.airportsLine[ui] },
    { href: "/airbnb", icon: CiChart, title: T.tools.airbnb[ui], line: T.tools.airbnbLine[ui] },
    { href: "/weather", icon: CiSun, title: T.tools.weather[ui], line: T.tools.weatherLine[ui] },
  ] as const;

  return (
    <main className="min-h-screen bg-surface">

      {/* ═══════ HERO lagon : greet + phrase mer + chips + ile carte live ═══════ */}
      <section className="relative -mt-[74px] pt-28 pb-28 bg-gradient-to-b from-sky via-[#8FE0EC] to-lagoon overflow-hidden">
        {/* sunball */}
        <div
          className="absolute top-20 right-[10%] w-[120px] h-[120px] rounded-full shadow-[0_0_76px_22px_rgba(255,200,61,.45)]"
          style={{ background: "radial-gradient(circle at 38% 35%, #FFE08F, #FFC83D 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-11 items-center">
          <div>
            <BlurFade delay={0.05}>
              <span className="inline-flex items-center gap-2 bg-white/72 rounded-full px-4 py-2 text-[13px] font-heading font-semibold text-sea">
                <span className="w-2 h-2 rounded-full bg-ok shadow-[0_0_0_4px_rgba(20,184,107,.25)]" />
                {greekGreeting()} {dateLabel} · {T.liveFromIsland[ui]}
              </span>
              <h1 className="font-heading font-extrabold text-4xl md:text-[54px] leading-[1.06] tracking-tight text-text mt-4 mb-3">
                {T.heroMain[ui].pre}
                <br />
                <span className="text-white [text-shadow:0_2px_18px_rgba(11,94,120,.35)]">{T.heroMain[ui].hl}</span>
              </h1>
              <p className="text-base text-[rgba(11,57,84,.78)] max-w-md leading-relaxed mb-6">
                {swimPick
                  ? T.heroToday[ui](T.ratings[swimPick.rating][ui], swimPick.name)
                  : T.heroSub[ui]}
              </p>
              <div className="flex flex-wrap gap-3 font-data">
                <Link href="/beaches/today" className="bg-sun text-text rounded-[17px] px-4 py-2.5 text-sm font-heading font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)] no-underline hover:brightness-105 transition-all">
                  {T.ctaBeach[ui]}
                </Link>
                {heroCity && (
                  <span className="bg-white rounded-[17px] px-4 py-2.5 text-sm font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)]">
                    ☼ {heroCity.temp}° {T.air[ui]}
                  </span>
                )}
                {swimPick?.seaTemp != null && (
                  <span className="bg-white rounded-[17px] px-4 py-2.5 text-sm font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)]">
                    ≈ {swimPick.seaTemp}° {T.sea[ui]}
                  </span>
                )}
                {swimPick && (
                  <span className="bg-white rounded-[17px] px-4 py-2.5 text-sm font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)] inline-flex items-center gap-1.5">
                    <WindArrow deg={swimPick.windDir} className="w-3.5 h-3.5 text-sea" /> {swimPick.windSpeed} km/h
                  </span>
                )}
              </div>
              {/* Socials Kalimera : chips blancs hover sun, cohérents avec chips météo */}
              <div className="flex flex-wrap gap-2 mt-5">
                <a
                  href="https://www.instagram.com/cretedirect/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Crete Direct on Instagram"
                  className="bg-white/90 hover:bg-sun rounded-full p-2.5 shadow-[0_8px_22px_rgba(11,94,120,.12)] transition-all"
                >
                  <CiInstagram className="w-4 h-4 text-sea" />
                </a>
                <a
                  href="https://www.facebook.com/1098023870060924"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Crete Direct on Facebook"
                  className="bg-white/90 hover:bg-sun rounded-full p-2.5 shadow-[0_8px_22px_rgba(11,94,120,.12)] transition-all"
                >
                  <CiFacebook className="w-4 h-4 text-sea" />
                </a>
                <a
                  href="https://www.youtube.com/@CreteDirect"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Crete Direct on YouTube"
                  className="bg-white/90 hover:bg-sun rounded-full p-2.5 shadow-[0_8px_22px_rgba(11,94,120,.12)] transition-all"
                >
                  <CiYouTube className="w-4 h-4 text-sea" />
                </a>
              </div>
            </BlurFade>
          </div>

          <BlurFade delay={0.15}>
            <Link
              href="/explore"
              aria-label={locale === "fr" ? "Ouvrir l'explorateur interactif de la Crète" : locale === "de" ? "Interaktiven Kreta-Explorer öffnen" : locale === "el" ? "Άνοιγμα διαδραστικού εξερευνητή" : "Open the interactive Crete explorer"}
              className="group relative block focus:outline-none focus-visible:ring-4 focus-visible:ring-sun/60 rounded-[30px]"
            >
              <CreteMap cities={wtileCities} swimPin={swimPin} locale={locale} />
              <span
                className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-sea text-white text-xs font-bold shadow-[0_8px_22px_rgba(11,94,120,.22)] opacity-95 group-hover:opacity-100 group-hover:-translate-y-0.5 transition-all"
                aria-hidden
              >
                <CiCompass className="w-3.5 h-3.5" />
                {locale === "fr" ? "Explorer la carte" : locale === "de" ? "Karte erkunden" : locale === "el" ? "Εξερεύνηση χάρτη" : "Explore the map"}
              </span>
            </Link>
          </BlurFade>
        </div>
        {/* vague separatrice */}
        <svg className="absolute bottom-0 left-0 w-full h-[70px]" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden>
          <path d="M0 40 C180 0 320 70 540 42 C760 14 900 66 1130 40 C1290 22 1380 36 1440 28 L1440 70 L0 70 Z" fill="#F6FBFC" />
        </svg>
      </section>

      <div className="max-w-6xl mx-auto px-4">

        {/* ═══════ BOARD NUIT en chevauchement ═══════ */}
        {boardRoutes.length > 0 && (
          <div className="relative z-[5] -mt-20">
            <DepBoard routes={boardRoutes} locale={locale} />
          </div>
        )}

        {/* ═══════ MATCH : le Tinder de la Crète (photo plein bloc, pattern bandeaux v5) ═══════ */}
        <section className="mt-10">
            <Link
              href="/match"
              className="group relative block overflow-hidden rounded-[30px] no-underline shadow-lg"
            >
              {/* Visuel dédié Gemini (Kami 12/06) : cartes de lieux en éventail face à la mer */}
              <img
                src="/images/match/tinder-hero.jpg"
                alt=""
                loading="lazy"
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[4000ms] ease-out group-hover:scale-105"
              />
              {/* Scrim de lisibilité : dense sur le texte, laisse respirer la photo à droite */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#08263a]/85 via-[#08263a]/50 to-[#08263a]/10" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#08263a]/60 to-transparent md:hidden" aria-hidden />

              <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-x-8 gap-y-6 p-6 md:min-h-[210px] md:p-8">
                <div className="min-w-0 max-w-xl">
                  <p className="m-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 font-heading text-[10.5px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-sm">
                    <Heart size={11} fill="currentColor" aria-hidden /> {T.matchKicker[ui]}
                  </p>
                  <h2 className="m-0 mt-3 font-heading text-[28px] font-extrabold leading-tight text-white [text-wrap:balance] drop-shadow-[0_1px_3px_rgba(8,38,58,0.6)] md:text-[32px]">
                    {T.matchTitle[ui]}
                  </h2>
                  <p className="m-0 mt-1.5 text-[14px] text-white/90 drop-shadow-[0_1px_2px_rgba(8,38,58,0.6)]">
                    {T.matchSub[ui]}
                  </p>
                  <span className="relative mt-5 inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3 font-heading text-[14.5px] font-bold text-terracotta shadow-md transition-transform group-hover:scale-[1.03]">
                    <span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-terracotta/20 to-transparent bg-[length:300%_100%] animate-gradient"
                      aria-hidden
                    />
                    <span className="relative">{T.matchCta[ui]}</span>
                  </span>
                </div>
              </div>
            </Link>
          </section>

        {/* ═══════ L'ILE, MAINTENANT : tuiles couleur pleine ═══════ */}
        {wtileCities.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-10 mb-4">
              <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{T.islandNow[ui]}</h2>
              <Link href="/weather" className="text-[13.5px] font-heading font-bold text-sea bg-white rounded-full px-4 py-2 shadow-[0_8px_20px_rgba(11,94,120,.12)] no-underline">
                {T.allStations[ui]}
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {wtileCities.map((c, i) => {
                const st = seaState(c);
                const sunny = i % 2 === 0;
                return (
                  <Link key={c.name} href="/weather"
                        className={`relative overflow-hidden rounded-[28px] px-5 py-4 no-underline ${sunny ? "bg-lagoon text-night" : "bg-sea text-white"}`}>
                    {sunny && <div className="absolute -top-5 -right-5 w-[66px] h-[66px] rounded-full bg-sun opacity-90" aria-hidden />}
                    <p className="text-[13px] font-heading font-bold uppercase tracking-[0.08em] opacity-70 m-0">{c.name}</p>
                    <p className="font-data text-5xl font-extrabold tracking-tight leading-[1.08] m-0">
                      {c.temp}<sup className="text-xl opacity-75">°</sup>
                    </p>
                    <p className="font-data text-[12.5px] opacity-70 m-0 inline-flex items-center gap-1">
                      <WindArrow deg={c.windDir} className="w-3 h-3" /> {c.windSpeed} km/h
                      {c.seaTemp != null && <> · {T.sea[ui]} {c.seaTemp}°</>}
                    </p>
                    <p className={`mt-2 mb-0 inline-flex text-[12.5px] font-bold rounded-full px-3 py-1.5 font-data ${st.warn ? "bg-white/90 text-[#C2543A]" : "bg-white/85 text-sea"}`}>
                      ≈ {T.seaStates[st.key][ui]}
                    </p>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* ═══════ OU SE BAIGNER AUJOURD'HUI ═══════ */}
        {swimPick && (
          <>
            <div className="flex items-center justify-between mt-10 mb-4">
              <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{T.swimToday[ui]}</h2>
              <Link href="/beaches" className="text-[13.5px] font-heading font-bold text-sea bg-white rounded-full px-4 py-2 shadow-[0_8px_20px_rgba(11,94,120,.12)] no-underline">
                {T.allBeaches[ui]}
              </Link>
            </div>
            <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-4">
              <Link href="/beaches/today" className="relative rounded-[28px] overflow-hidden shadow-[0_18px_44px_rgba(11,94,120,.18)] min-h-[320px] block no-underline group">
                {swimPick.imageUrl ? (
                  <>
                    <Image src={swimPick.imageUrl} alt={swimPick.name} fill sizes="(max-width: 1024px) 100vw, 60vw"
                         className="object-cover saturate-[1.08] group-hover:scale-[1.03] transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-b from-lagoon/5 via-transparent to-night/55 pointer-events-none" />
                    <svg className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay pointer-events-none" aria-hidden>
                      <filter id="kpick"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /></filter>
                      <rect width="100%" height="100%" filter="url(#kpick)" />
                    </svg>
                  </>
                ) : (
                  <AbstractFallback kind="sea" />
                )}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white flex justify-between items-end gap-3">
                  <div>
                    <p className="font-heading text-[27px] font-extrabold m-0 leading-tight">{swimPick.name}</p>
                    <p className="text-[13px] text-white/80 m-0">
                      {swimPick.region && T.regions[swimPick.region as keyof typeof T.regions]
                        ? <>{T.regions[swimPick.region as keyof typeof T.regions][ui]} · </>
                        : null}
                      {swimPick.cityName} · {T.todaysPick[ui]}
                    </p>
                  </div>
                  <span className={`bg-white/92 font-heading font-extrabold rounded-full px-4 py-2 text-sm font-data whitespace-nowrap ${VERDICT_COLORS[swimPick.rating]}`}>
                    ≈ {T.ratings[swimPick.rating][ui]}{swimPick.seaTemp != null ? ` · ${swimPick.seaTemp}°` : ""}
                  </span>
                </div>
              </Link>
              <div className="flex flex-col gap-4">
                {swimSides.map((s) => (
                  <Link key={s.slug} href={`/beaches/${s.slug}`}
                        className="relative rounded-3xl overflow-hidden flex-1 shadow-[0_12px_30px_rgba(11,94,120,.12)] min-h-[150px] block no-underline group">
                    {s.imageUrl ? (
                      <>
                        <Image src={s.imageUrl} alt={s.name} fill sizes="(max-width: 1024px) 100vw, 25vw"
                             className="object-cover saturate-[1.08] group-hover:scale-[1.03] transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-b from-lagoon/5 to-night/50 pointer-events-none" />
                      </>
                    ) : (
                      <AbstractFallback kind="sea" />
                    )}
                    <div className="absolute bottom-3 left-4 right-4 text-white flex justify-between items-center">
                      <span className="font-heading font-bold text-base">{s.name}</span>
                      <span className={`bg-white/90 rounded-full text-[11.5px] font-extrabold px-3 py-1 font-data ${VERDICT_COLORS[s.rating]}`}>
                        ≈ {T.ratings[s.rating][ui]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════ LES OUTILS : tuiles pastel ═══════ */}
        <div className="flex items-center justify-between mt-10 mb-4">
          <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{T.toolsTitle[ui]}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {TOOLS.map(({ href, icon: Icon, title, line }, idx) => (
            <BlurFade key={href} delay={Math.min(0.05 * idx, 0.3)}>
              <Link href={href} className={`block h-full rounded-[22px] p-4 no-underline ${TOOL_TINTS[idx]}`}>
                <span className="bg-white/85 w-[42px] h-[42px] rounded-[15px] flex items-center justify-center text-text mb-2.5">
                  <Icon className="w-[21px] h-[21px]" />
                </span>
                <p className="font-heading font-bold text-[15px] text-text m-0">{title}</p>
                <p className="text-[11.5px] text-[rgba(11,57,84,.65)] mt-0.5 mb-0">{line}</p>
              </Link>
            </BlurFade>
          ))}
        </div>

        {/* ═══════ MAINTENANCE (donnees indisponibles) ═══════ */}
        {latestNews.length === 0 && upcomingEvents.length === 0 && (
          <div className="mt-8">
            <div className="rounded-3xl border border-sun/60 bg-sand px-5 py-4 flex items-center gap-3">
              <span className="text-[#8A6A14] text-lg">&#9888;</span>
              <p className="text-sm text-[#8A6A14] m-0">
                {loc === "fr"
                  ? "Maintenance en cours. La météo est disponible, les actualités et événements reviendront très prochainement."
                  : loc === "de"
                  ? "Wartungsarbeiten. Das Wetter ist verfügbar, Nachrichten und Veranstaltungen kehren in Kürze zurück."
                  : loc === "el"
                  ? "Συντήρηση σε εξέλιξη. Ο καιρός είναι διαθέσιμος, τα νέα και οι εκδηλώσεις θα επιστρέψουν σύντομα."
                  : "Maintenance in progress. Weather is available, news and events will be back shortly."}
              </p>
            </div>
          </div>
        )}

        {/* ═══════ NEWS | GUIDES ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-9 mt-10">

          {/* News curees */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-[28px] font-extrabold text-text m-0 flex items-center gap-2.5">
                <CiNews className="w-6 h-6 text-sea" /> {t("latestNews")}
              </h2>
              <Link href="/news" className="text-[13.5px] font-heading font-bold text-sea bg-white rounded-full px-4 py-2 shadow-[0_8px_20px_rgba(11,94,120,.12)] no-underline">
                {t("allNews")}
              </Link>
            </div>

            {news.length > 0 ? (
              <div className="bg-white rounded-3xl px-6 py-1.5 shadow-[0_12px_32px_rgba(11,94,120,.08)]">
                {news.map((item, i) => (
                  <BlurFade key={item.slug} delay={Math.min(0.04 * i, 0.3)}>
                    <Link href={`/news/${item.slug}`}
                          className={`flex items-baseline gap-3.5 py-3.5 group no-underline ${i > 0 ? "border-t border-text/7" : ""}`}>
                      <span className="font-data text-[12.5px] text-lagoon-deep font-bold min-w-[42px] shrink-0">
                        {timeAgo(item.published_at)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-text group-hover:text-sea transition-colors leading-snug line-clamp-2 m-0">
                          {getLocalizedField(item, "title", loc)}
                        </p>
                        <p className="text-[11.5px] text-text-muted m-0 mt-0.5">
                          {item.category ? `${item.category} · ` : ""}{item.source_name}
                        </p>
                      </div>
                    </Link>
                  </BlurFade>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center shadow-[0_12px_32px_rgba(11,94,120,.08)]">
                <CiNews className="w-8 h-8 text-text-light mx-auto mb-3" />
                <p className="text-sm text-text-muted m-0">{t("newsFeedLoading")}</p>
              </div>
            )}
          </section>

          {/* Guides + events */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-[28px] font-extrabold text-text m-0 flex items-center gap-2.5">
                <CiBook className="w-6 h-6 text-sea" /> {t("editorialGuides")}
              </h2>
              <Link href="/articles" className="text-[13.5px] font-heading font-bold text-sea bg-white rounded-full px-4 py-2 shadow-[0_8px_20px_rgba(11,94,120,.12)] no-underline">
                {t("allGuides")}
              </Link>
            </div>

            {guides.length > 0 ? (
              <div>
                {guides.map((guide, i) => {
                  const gTitle = getLocalizedGuideField(guide, "titles", locale);
                  return (
                    <BlurFade key={guide.slug} delay={Math.min(0.05 * i, 0.3)}>
                      <Link href={`/articles/${guide.slug}`}
                            className="grid grid-cols-[112px_1fr] rounded-3xl overflow-hidden bg-white shadow-[0_12px_30px_rgba(11,94,120,.10)] mb-4 no-underline group">
                        <div className="relative">
                          {guide.image_url ? (
                            <>
                              <Image src={guide.image_url} alt={gTitle} fill sizes="112px"
                                   className="object-cover saturate-[1.08]" />
                              <div className="absolute inset-0 bg-gradient-to-b from-lagoon/5 to-night/35 pointer-events-none" />
                            </>
                          ) : (
                            <AbstractFallback kind="land" />
                          )}
                        </div>
                        <div className="px-4 py-4 font-heading font-bold text-[15px] leading-snug text-text group-hover:text-sea transition-colors">
                          {gTitle}
                          {guide.read_time && (
                            <span className="block font-sans font-medium text-[11.5px] text-text-muted mt-1.5 font-data">{guide.read_time} min</span>
                          )}
                        </div>
                      </Link>
                    </BlurFade>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-10 text-center shadow-[0_12px_32px_rgba(11,94,120,.08)]">
                <CiBook className="w-8 h-8 text-text-light mx-auto mb-3" />
                <p className="text-sm text-text-muted m-0">{t("guidesSectionSubtitle")}</p>
              </div>
            )}

            {events.length > 0 && (
              <div className="mt-7">
                <h3 className="font-heading text-base font-extrabold text-terracotta flex items-center gap-2 mb-3">
                  <CiCalendar className="w-4 h-4" /> {T.nextEvents[ui]}
                </h3>
                <div className="bg-white rounded-3xl px-5 py-1 shadow-[0_12px_32px_rgba(11,94,120,.08)]">
                  {events.map((event, i) => (
                    <Link key={event.slug} href={`/events/${event.slug}`}
                          className={`flex items-center gap-3 py-3 group no-underline ${i > 0 ? "border-t border-text/7" : ""}`}>
                      <span className="font-data text-[11px] text-terracotta font-bold shrink-0 w-14">
                        {formatEventDate(event.date_start, locale)}
                      </span>
                      <span className="text-sm text-text group-hover:text-sea transition-colors line-clamp-1 min-w-0">
                        {getLocalizedField(event, "title", loc)}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-text-light shrink-0">
                        <MapPin className="w-3 h-3" /> {localizeLocation(event.location_name, locale)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ═══════ NEWSLETTER bande sable ═══════ */}
        <section className="rounded-[30px] px-8 py-7 my-10 flex flex-col sm:flex-row items-center justify-between gap-6"
                 style={{ background: "linear-gradient(165deg, #FFF3D6, #FFE9AE)" }}>
          <div>
            <h3 className="font-heading font-extrabold text-[22px] text-text m-0">{t("newsletter")}</h3>
            <p className="text-[13.5px] text-[#8A7340] m-0 mt-0.5">{t("subtitle")}</p>
          </div>
          <NewsletterFormCompact locale={locale} />
        </section>
      </div>
    </main>
  );
}
