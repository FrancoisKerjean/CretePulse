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
import {
  CiBus, CiWave, CiSun, CiCompass, CiPlane, CiChart,
  CiNews, CiBook,
  CiInstagram, CiFacebook, CiYouTube,
} from "@/components/icons";
import { Link } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { BusRoute } from "@/lib/buses";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";
import { type Guide, getLocalizedGuideField } from "@/lib/guides";
import { ServiceRail } from "@/components/home/ServiceRail";
import { IslandBarometer } from "@/components/home/IslandBarometer";
import type { HomeService } from "@/lib/home-services";

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
        className="flex-1 min-w-0 px-5 py-3 rounded-full border-none bg-white text-[13.5px] text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-lagoon/40"
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
  services: HomeService[];
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

// Defense-in-depth : si un locale invalide arrive malgre le garde du layout,
// Intl.DateTimeFormat throw RangeError et fait 500 la home. On retombe sur "en".
function safeIntlLocale(locale: string): string {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([locale]).length ? locale : "en";
  } catch {
    return "en";
  }
}

export function HomeClient({ cities, latestNews, upcomingEvents, latestGuides, swimPick, swimSides, boardRoutes, locale, services }: HomeClientProps) {
  const loc = locale as Locale;
  const t = useTranslations("home");

  const dateLabel = new Intl.DateTimeFormat(safeIntlLocale(locale), {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Athens",
  }).format(new Date());

  const wtileCities = WTILE_CITIES
    .map((n) => cities.find((c) => c.name === n))
    .filter((c): c is CityWeather => Boolean(c));

  // Dégonflé le 28/07 : le bloc occupait environ 40 % de la hauteur pour 3,7 % des clics.
  const news = latestNews.slice(0, 4);
  const guides = latestGuides.slice(0, 2);
  const heroCity = cities.find((c) => c.name === (swimPick?.cityName ?? "Heraklion")) ?? cities[0];

  const swimPin = swimPick
    ? { name: swimPick.name, lat: swimPick.lat, lng: swimPick.lng }
    : null;

  const TOOLS = [
    { href: "/buses", icon: CiBus, title: t("tools.buses"), line: t("tools.busesLine") },
    { href: "/beaches/today", icon: CiWave, title: t("tools.swim"), line: t("tools.swimLine") },
    { href: "/explore", icon: CiCompass, title: t("tools.explore"), line: t("tools.exploreLine") },
    { href: "/airport", icon: CiPlane, title: t("tools.airports"), line: t("tools.airportsLine") },
    { href: "/airbnb", icon: CiChart, title: t("tools.airbnb"), line: t("tools.airbnbLine") },
    { href: "/weather", icon: CiSun, title: t("tools.weather"), line: t("tools.weatherLine") },
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
                {greekGreeting()} {dateLabel} · {t("liveFromIsland")}
              </span>
              <h1 className="font-heading font-extrabold text-4xl md:text-[54px] leading-[1.06] tracking-tight text-text mt-4 mb-3">
                {t("heroMain.pre")}
                <br />
                <span className="text-white [text-shadow:0_2px_18px_rgba(11,94,120,.35)]">{t("heroMain.hl")}</span>
              </h1>
              <p className="text-base text-[rgba(11,57,84,.78)] max-w-md leading-relaxed mb-6">
                {swimPick
                  ? t("heroToday", { rating: t(`ratings.${swimPick.rating}`), name: swimPick.name })
                  : t("heroSub")}
              </p>
              <IslandBarometer
                seaTemp={swimPick?.seaTemp ?? null}
                windSpeed={swimPick?.windSpeed ?? null}
                airTemp={heroCity?.temp ?? null}
              />
              <div className="flex flex-wrap gap-3 font-data">
                <Link href="/beaches/today" className="bg-sun text-text rounded-[17px] px-4 py-2.5 text-sm font-heading font-bold shadow-[0_10px_26px_rgba(11,94,120,.16)] no-underline hover:brightness-105 transition-all">
                  {t("ctaBeach")}
                </Link>
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

        <ServiceRail services={services} />

        {/* ═══════ L'ILE, MAINTENANT : tuiles couleur pleine ═══════ */}
        {wtileCities.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-10 mb-4">
              <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{t("islandNow")}</h2>
              <Link href="/weather" className="text-[13.5px] font-heading font-bold text-sea bg-white rounded-full px-4 py-2 shadow-[0_8px_20px_rgba(11,94,120,.12)] no-underline">
                {t("allStations")}
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
                      {c.seaTemp != null && <> · {t("sea")} {c.seaTemp}°</>}
                    </p>
                    <p className={`mt-2 mb-0 inline-flex text-[12.5px] font-bold rounded-full px-3 py-1.5 font-data ${st.warn ? "bg-white/90 text-[#C2543A]" : "bg-white/85 text-sea"}`}>
                      ≈ {t(`seaStates.${st.key}`)}
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
              <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{t("swimToday")}</h2>
              <Link href="/beaches" className="text-[13.5px] font-heading font-bold text-sea bg-white rounded-full px-4 py-2 shadow-[0_8px_20px_rgba(11,94,120,.12)] no-underline">
                {t("allBeaches")}
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
                      {swimPick.region && ["south", "west", "east", "central"].includes(swimPick.region)
                        ? <>{t(`regions.${swimPick.region}`)} · </>
                        : null}
                      {swimPick.cityName} · {t("todaysPick")}
                    </p>
                  </div>
                  <span className={`bg-white/92 font-heading font-extrabold rounded-full px-4 py-2 text-sm font-data whitespace-nowrap ${VERDICT_COLORS[swimPick.rating]}`}>
                    ≈ {t(`ratings.${swimPick.rating}`)}{swimPick.seaTemp != null ? ` · ${swimPick.seaTemp}°` : ""}
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
                        ≈ {t(`ratings.${s.rating}`)}
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
          <h2 className="font-heading text-[28px] font-extrabold text-text m-0">{t("toolsTitle")}</h2>
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
