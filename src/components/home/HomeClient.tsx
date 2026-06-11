"use client";

// Home "la Crete, aujourd'hui" : dashboard donnees live + outils + contenu cure.
// Remplace l'ancienne home agregateur (hero news 80vh + 2 tickers + sidebar).
// Spec : docs/superpowers/specs/2026-06-11-ui-live-data-redesign-design.md
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { CardThumb } from "@/components/CardThumb";
import { WindArrow } from "@/components/WindArrow";
import { Wind, ChevronRight, MapPin, Mail } from "lucide-react";
import {
  CiBus, CiWave, CiSun, CiCompass, CiPlane, CiChart, CiMountain,
  CiFood, CiHike, CiCalendar, CiNews, CiCloud, CiRain, CiBook,
} from "@/components/icons";
import { Link } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";
import { localizeLocation } from "@/lib/localize-location";
import { type Guide, getLocalizedGuideField } from "@/lib/guides";

function WeatherIcon({ code, wind, className }: { code: number; wind: number; className?: string }) {
  const c = className || "w-5 h-5";
  if (wind > 20) return <Wind className={`${c} text-aegean-light`} />;
  if (code <= 1) return <CiSun className={`${c} text-terra`} />;
  if (code <= 3) return <CiCloud className={`${c} text-text-light`} />;
  return <CiRain className={`${c} text-aegean`} />;
}

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

const CATEGORY_STYLES: Record<string, string> = {
  politics: "bg-aegean/10 text-aegean",
  tourism: "bg-terra/10 text-terra",
  culture: "bg-sand text-text-muted",
  environment: "bg-olive/10 text-olive",
  economy: "bg-stone text-text-muted",
  sports: "bg-aegean/10 text-aegean",
  weather: "bg-aegean/10 text-aegean",
  local: "bg-olive/10 text-olive",
};

// Libelles inline 4 langues (pattern du site), fallback EN pour les 18 autres.
type Ui = "en" | "fr" | "de" | "el";
const pickUi = (l: string): Ui => (["en", "fr", "de", "el"].includes(l) ? (l as Ui) : "en");

const T = {
  heroTitle: { en: "Crete, today", fr: "La Crète, aujourd'hui", de: "Kreta, heute", el: "Η Κρήτη σήμερα" },
  swimToday: { en: "Where to swim today", fr: "Où se baigner aujourd'hui", de: "Wo heute baden", el: "Πού για μπάνιο σήμερα" },
  ratings: {
    calm: { en: "calm", fr: "calme", de: "ruhig", el: "ήρεμη" },
    fair: { en: "fair", fr: "correct", de: "passabel", el: "καλή" },
    exposed: { en: "exposed", fr: "exposée", de: "exponiert", el: "εκτεθειμένη" },
  },
  tools: {
    buses: { en: "Bus planner", fr: "Planificateur bus", de: "Busplaner", el: "Δρομολόγια ΚΤΕΛ" },
    busesLine: { en: "KTEL timetables & prices", fr: "Horaires & prix KTEL", de: "KTEL Fahrpläne & Preise", el: "Ώρες & τιμές" },
    swim: { en: "Where to swim", fr: "Où se baigner", de: "Wo baden", el: "Πού για μπάνιο" },
    swimLine: { en: "Live wind × 500+ beaches", fr: "Vent live × 500+ plages", de: "Live-Wind × 500+ Strände", el: "Άνεμος × 500+ παραλίες" },
    explore: { en: "Explore", fr: "Explorer", de: "Erkunden", el: "Εξερεύνηση" },
    exploreLine: { en: "2,296 places, rich filters", fr: "2 296 lieux, filtres riches", de: "2.296 Orte, Filter", el: "2.296 μέρη, φίλτρα" },
    airports: { en: "Airports", fr: "Aéroports", de: "Flughäfen", el: "Αεροδρόμια" },
    airportsLine: { en: "Traffic data & seasonality", fr: "Trafic & saisonnalité", de: "Verkehr & Saison", el: "Κίνηση & εποχικότητα" },
    airbnb: { en: "Airbnb data", fr: "Data Airbnb", de: "Airbnb-Daten", el: "Δεδομένα Airbnb" },
    airbnbLine: { en: "Prices & occupancy by area", fr: "Prix & occupation par zone", de: "Preise & Auslastung", el: "Τιμές ανά περιοχή" },
    weather: { en: "Weather", fr: "Météo", de: "Wetter", el: "Καιρός" },
    weatherLine: { en: "10 stations, sea included", fr: "10 stations, mer incluse", de: "10 Stationen, mit Meer", el: "10 σταθμοί, με θάλασσα" },
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
      <div className="rounded-xl bg-aegean px-4 py-2.5 text-white text-center">
        <p className="text-xs font-medium m-0">{successMsg[locale] || successMsg.en}</p>
      </div>
    );
  }

  return (
    <form className="flex gap-2 w-full max-w-md" onSubmit={handleSubmit}>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        required
        className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-xs text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-aegean/30 focus:border-aegean/40"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-4 py-2 bg-aegean text-white rounded-lg font-bold text-xs hover:bg-aegean-light transition-colors disabled:opacity-60"
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
}

interface HomeClientProps {
  cities: CityWeather[];
  latestNews: NewsItem[];
  upcomingEvents: Event[];
  latestGuides: Guide[];
  swimPick: SwimPickLite | null;
  locale: string;
}

const RATING_STYLES: Record<SwimPickLite["rating"], string> = {
  calm: "bg-emerald-100 text-emerald-800 border-emerald-200",
  fair: "bg-amber-100 text-amber-800 border-amber-200",
  exposed: "bg-terra-faint text-terra border-terra/30",
};

export function HomeClient({ cities, latestNews, upcomingEvents, latestGuides, swimPick, locale }: HomeClientProps) {
  const loc = locale as Locale;
  const ui = pickUi(locale);
  const t = useTranslations("home");

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Athens",
  }).format(new Date());

  const heroCities = ["Heraklion", "Chania", "Ierapetra"]
    .map((n) => cities.find((c) => c.name === n))
    .filter((c): c is CityWeather => Boolean(c));

  const news = latestNews.slice(0, 8);
  const guides = latestGuides.slice(0, 6);
  const events = upcomingEvents.slice(0, 3);

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

      {/* ═══════ HERO "Crete, today" : titre + date + swim pick + meteo regions ═══════ */}
      <section className="bg-stone border-b border-border">
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-8">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <BlurFade delay={0.05}>
                <p className="font-data text-xs text-text-muted uppercase tracking-wider mb-2">{dateLabel}</p>
                <h1 className="font-heading text-4xl md:text-6xl font-bold text-text leading-[1.02] tracking-tight">
                  {T.heroTitle[ui]}
                </h1>
                <p className="mt-3 text-text-muted text-base md:text-lg max-w-md">{t("subtitle")}</p>
                <p className="font-data text-[11px] text-text-light mt-5">
                  <NumberTicker value={500} suffix="+" /> {t("beachesCount").replace(/\d+\+?\s*/, "")} · {" "}
                  <NumberTicker value={300} suffix="+" /> {t("villagesCount").replace(/\d+\+?\s*/, "")} · {" "}
                  <NumberTicker value={80} suffix="+" /> {t("hikesCount").replace(/\d+\+?\s*/, "")}
                </p>
              </BlurFade>
            </div>

            {swimPick && (
              <BlurFade delay={0.15}>
                <Link href="/beaches/today" className="card-base overflow-hidden block no-underline group">
                  <div className="relative aspect-[16/8] overflow-hidden rounded-t-xl">
                    {swimPick.imageUrl ? (
                      <>
                        <Image src={swimPick.imageUrl} alt={swimPick.name} fill
                               className="object-cover saturate-[.92] group-hover:scale-[1.03] transition-transform duration-500"
                               sizes="(max-width: 1024px) 100vw, 50vw" priority />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-aegean to-aegean-light" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/70 font-semibold m-0">{T.swimToday[ui]}</p>
                        <p className="font-heading text-xl font-bold text-white m-0">{swimPick.name}</p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wide font-bold border rounded px-2 py-0.5 ${RATING_STYLES[swimPick.rating]}`}>
                        {T.ratings[swimPick.rating][ui]}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex items-center gap-4 font-data text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <WindArrow deg={swimPick.windDir} className="w-3 h-3 text-aegean" />
                      {swimPick.windCardinal} {swimPick.windSpeed} km/h
                    </span>
                    {swimPick.seaTemp !== null && (
                      <span className="inline-flex items-center gap-1">
                        <CiWave className="w-3 h-3 text-aegean" /> {swimPick.seaTemp}°
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-aegean" />
                  </div>
                </Link>
              </BlurFade>
            )}
          </div>

          {/* Meteo 3 regions */}
          {heroCities.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mt-8">
              {heroCities.map((city) => (
                <Link key={city.name} href="/weather"
                      className="card-base px-4 py-3 flex items-center gap-3 no-underline">
                  <WeatherIcon code={city.weatherCode} wind={city.windSpeed} />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none m-0 truncate">{city.name}</p>
                    <p className="font-data text-sm text-text mt-1 mb-0 flex items-center gap-1.5">
                      {city.temp}°
                      <WindArrow deg={city.windDir} className="w-3 h-3 text-aegean" />
                      <span className="text-text-muted">{city.windSpeed} km/h</span>
                      {city.seaTemp !== null && (
                        <span className="hidden sm:inline-flex items-center gap-0.5 text-aegean">
                          <CiWave className="w-3 h-3" />{city.seaTemp}°
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════ OUTILS ═══════ */}
      <section className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {TOOLS.map(({ href, icon: Icon, title, line }, idx) => (
              <BlurFade key={href} delay={Math.min(0.05 * idx, 0.3)}>
                <Link href={href} className="card-base p-4 block h-full no-underline">
                  <Icon className="w-5 h-5 text-aegean mb-2" />
                  <p className="text-sm font-semibold text-text m-0">{title}</p>
                  <p className="text-[11px] text-text-muted mt-0.5 mb-0">{line}</p>
                </Link>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ MAINTENANCE (donnees indisponibles) ═══════ */}
      {latestNews.length === 0 && upcomingEvents.length === 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
            <span className="text-amber-600 text-lg">&#9888;</span>
            <p className="text-sm text-amber-800 m-0">
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

      {/* ═══════ CONTENU : News | Guides + events ═══════ */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* News curees */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-aegean uppercase tracking-[0.2em] flex items-center gap-2 m-0">
                <CiNews className="w-4 h-4" /> {t("latestNews")}
              </h2>
              <Link href="/news" className="text-xs text-aegean hover:text-aegean-light flex items-center gap-1 font-semibold transition-colors">
                {t("allNews")} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {news.length > 0 ? (
              <div className="divide-y divide-border card-base px-5">
                {news.map((item, i) => (
                  <BlurFade key={item.slug} delay={Math.min(0.04 * i, 0.3)}>
                    <Link href={`/news/${item.slug}`} className="flex items-start gap-3 py-3.5 group no-underline">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2 m-0">
                          {getLocalizedField(item, "title", loc)}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-text-light">{item.source_name}</span>
                          {item.category && (
                            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${CATEGORY_STYLES[item.category] || "bg-stone text-text-muted"}`}>
                              {item.category}
                            </span>
                          )}
                          <span className="font-data text-[10px] text-text-light ml-auto">{timeAgo(item.published_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </BlurFade>
                ))}
              </div>
            ) : (
              <div className="card-base p-10 text-center">
                <CiNews className="w-8 h-8 text-text-light mx-auto mb-3" />
                <p className="text-sm text-text-muted m-0">{t("newsFeedLoading")}</p>
              </div>
            )}
          </section>

          {/* Guides + events */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-aegean uppercase tracking-[0.2em] flex items-center gap-2 m-0">
                <CiBook className="w-4 h-4" /> {t("editorialGuides")}
              </h2>
              <Link href="/articles" className="text-xs text-aegean hover:text-aegean-light flex items-center gap-1 font-semibold transition-colors">
                {t("allGuides")} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {guides.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {guides.map((guide, i) => {
                  const gTitle = getLocalizedGuideField(guide, "titles", locale);
                  return (
                    <BlurFade key={guide.slug} delay={Math.min(0.05 * i, 0.3)}>
                      <Link href={`/articles/${guide.slug}`} className="card-base overflow-hidden block h-full no-underline group">
                        <CardThumb src={guide.image_url} alt={gTitle} category="guide" />
                        <div className="p-3.5">
                          <p className="text-sm font-semibold text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2 m-0">
                            {gTitle}
                          </p>
                          {guide.read_time && (
                            <p className="font-data text-[10px] text-text-light mt-1.5 mb-0">{guide.read_time} min</p>
                          )}
                        </div>
                      </Link>
                    </BlurFade>
                  );
                })}
              </div>
            ) : (
              <div className="card-base p-10 text-center">
                <CiBook className="w-8 h-8 text-text-light mx-auto mb-3" />
                <p className="text-sm text-text-muted m-0">{t("guidesSectionSubtitle")}</p>
              </div>
            )}

            {events.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xs font-bold text-terra uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                  <CiCalendar className="w-4 h-4" /> {T.nextEvents[ui]}
                </h3>
                <div className="card-base divide-y divide-border px-4">
                  {events.map((event) => (
                    <Link key={event.slug} href={`/events/${event.slug}`}
                          className="flex items-center gap-3 py-3 group no-underline">
                      <span className="font-data text-[11px] text-terra font-bold shrink-0 w-14">
                        {formatEventDate(event.date_start, locale)}
                      </span>
                      <span className="text-sm text-text group-hover:text-aegean transition-colors line-clamp-1 min-w-0">
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
      </div>

      {/* ═══════ NEWSLETTER ═══════ */}
      <section className="bg-aegean-faint border-y border-aegean/10">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-aegean/15 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-aegean" />
            </div>
            <h3 className="font-heading font-bold text-base text-text m-0">{t("newsletter")}</h3>
          </div>
          <NewsletterFormCompact locale={locale} />
        </div>
      </section>

      {/* ═══════ EXPLORE ═══════ */}
      <section className="bg-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <BlurFade delay={0.05}>
            <h2 className="font-heading text-3xl font-bold text-text mb-1">{t("explore")}</h2>
            <p className="text-text-muted text-sm mb-7 max-w-lg">{t("exploreSubtitle")}</p>
          </BlurFade>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/beaches", icon: CiWave, title: t("beachesCount"), desc: t("beachesDesc") },
              { href: "/food", icon: CiFood, title: t("foodLabel"), desc: t("foodDesc") },
              { href: "/villages", icon: CiMountain, title: t("villagesCount"), desc: t("villagesDesc") },
              { href: "/hikes", icon: CiHike, title: t("hikesCount"), desc: t("hikesDesc") },
            ].map(({ href, icon: Icon, title, desc }, idx) => (
              <BlurFade key={href} delay={Math.min(0.06 * idx, 0.3)}>
                <Link href={href} className="card-base p-5 h-40 flex flex-col justify-between no-underline group block">
                  <Icon className="w-6 h-6 text-terra opacity-70 group-hover:opacity-100 transition-opacity" />
                  <div>
                    <p className="text-base font-bold text-text leading-snug m-0">{title}</p>
                    <p className="text-[11px] text-text-muted leading-snug mt-1 mb-0">{desc}</p>
                  </div>
                </Link>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
