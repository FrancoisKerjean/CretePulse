"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Sun, Wind, Waves, Calendar, Newspaper, ChevronRight, Mountain,
  UtensilsCrossed, Footprints, Flame, Cloud, CloudRain, MapPin,
  BookOpen, ExternalLink, ArrowDown,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";
import { localizeLocation } from "@/lib/localize-location";

function WeatherIcon({ code, wind }: { code: number; wind: number }) {
  if (wind > 20) return <Wind className="w-5 h-5 text-white/80" />;
  if (code <= 1) return <Sun className="w-5 h-5 text-amber-300" />;
  if (code <= 3) return <Cloud className="w-5 h-5 text-white/60" />;
  return <CloudRain className="w-5 h-5 text-blue-300" />;
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

function NewsletterForm({ locale }: { locale: string }) {
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
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    const successMsg: Record<string, string> = {
      en: "Thanks! Check your inbox.",
      fr: "Merci ! Verifiez votre boite mail.",
      de: "Danke! Prufen Sie Ihren Posteingang.",
      el: "\u0395\u03c5\u03c7\u03b1\u03c1\u03b9\u03c3\u03c4\u03bf\u03cd\u03bc\u03b5! \u0395\u03bb\u03ad\u03b3\u03be\u03c4\u03b5 \u03c4\u03b1 \u03b5\u03b9\u03c3\u03b5\u03c1\u03c7\u03cc\u03bc\u03b5\u03bd\u03ac \u03c3\u03b1\u03c2.",
    };
    return (
      <div className="rounded-2xl bg-gradient-to-br from-aegean to-aegean-light p-6 text-white">
        <p className="text-sm font-medium">{successMsg[locale] || successMsg.en}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-aegean via-aegean to-aegean-light p-6 text-white shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08)_0%,_transparent_60%)]" />
      <div className="relative">
        <h3 className="font-bold text-base">{t("newsletter")}</h3>
        <p className="text-sm text-white/70 mt-1">{t("newsletterCta")}</p>
        <form className="mt-4 space-y-2.5" onSubmit={handleSubmit}>
          <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            required
            className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
          />
          {status === "error" && (
            <p className="text-xs text-red-200">
              {locale === "fr" ? "Une erreur s'est produite. Reessayez." :
               locale === "de" ? "Ein Fehler ist aufgetreten. Bitte erneut versuchen." :
               locale === "el" ? "\u03a0\u03c1\u03bf\u03ad\u03ba\u03c5\u03c8\u03b5 \u03c3\u03c6\u03ac\u03bb\u03bc\u03b1. \u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03be\u03b1\u03bd\u03ac." :
               "Something went wrong. Please try again."}
            </p>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full px-4 py-3 bg-terra text-white rounded-xl font-bold text-sm hover:bg-terra-light transition-colors disabled:opacity-60 shadow-lg hover:shadow-xl"
          >
            {status === "loading" ? "..." : t("subscribe")}
          </button>
        </form>
      </div>
    </div>
  );
}

interface HomeClientProps {
  cities: CityWeather[];
  latestNews: NewsItem[];
  upcomingEvents: Event[];
  locale: string;
}

export function HomeClient({ cities, latestNews, upcomingEvents, locale }: HomeClientProps) {
  const loc = locale as Locale;
  const t = useTranslations("home");
  const tf = useTranslations("footer");
  const now = new Date();
  const updateTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const featuredNews = latestNews[0] ?? null;
  const restNews = latestNews.slice(1);

  return (
    <main className="min-h-screen bg-surface">

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative h-[85vh] min-h-[600px] max-h-[900px] overflow-hidden">
        {/* Background image */}
        <Image
          src="https://images.pexels.com/photos/11401809/pexels-photo-11401809.jpeg"
          alt="Crete coastline"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          quality={85}
        />
        {/* Cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end pb-16 px-4">
          <div className="max-w-6xl mx-auto w-full">
            <BlurFade delay={0.1}>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-terra opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-terra" />
                </span>
                <span className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.2em]">
                  {t("updatedAt", { time: updateTime })}
                </span>
              </div>
            </BlurFade>

            <BlurFade delay={0.2}>
              <h1
                className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.9] tracking-tight"
                style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
              >
                {t("hero")}
              </h1>
            </BlurFade>

            <BlurFade delay={0.3}>
              <p className="mt-5 text-white/60 text-lg md:text-xl max-w-xl leading-relaxed">
                {t("subtitle")}
              </p>
            </BlurFade>

            {/* Live headlines ticker */}
            {latestNews.length > 0 && (
              <BlurFade delay={0.4}>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  {latestNews.slice(0, 2).map((item) => (
                    <Link
                      key={item.slug}
                      href={`/news/${item.slug}`}
                      className="flex items-center gap-3 px-4 py-3 bg-white/8 backdrop-blur-md rounded-xl border border-white/10 hover:bg-white/15 transition-all group max-w-md"
                    >
                      <span className="shrink-0 text-[10px] text-white/40 font-mono">{timeAgo(item.published_at)}</span>
                      {item.category && (
                        <span className="shrink-0 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-terra/70 text-white font-semibold">
                          {item.category}
                        </span>
                      )}
                      <span className="text-sm text-white/85 font-medium truncate group-hover:text-white transition-colors">
                        {getLocalizedField(item, "title", loc)}
                      </span>
                    </Link>
                  ))}
                </div>
              </BlurFade>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <ArrowDown className="w-5 h-5 text-white/30" />
        </div>
      </section>

      {/* ═══════════════════ WEATHER STRIP ═══════════════════ */}
      <section className="relative -mt-8 z-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {cities.slice(0, 6).map((city, i) => (
              <BlurFade key={city.name} delay={0.05 * i}>
                <Link
                  href="/weather"
                  className="shrink-0 flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/90 backdrop-blur-xl border border-white/80 shadow-lg hover:shadow-xl hover:bg-white transition-all"
                >
                  <WeatherIcon code={city.weatherCode} wind={city.windSpeed} />
                  <div>
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide leading-none">{city.name}</p>
                    <p className="text-xl font-bold text-text leading-tight mt-0.5">{city.temp}°</p>
                  </div>
                  {city.seaTemp !== null && (
                    <span className="text-xs text-aegean flex items-center gap-1 font-bold ml-1 bg-aegean/8 px-2 py-1 rounded-lg">
                      <Waves className="w-3.5 h-3.5" />{city.seaTemp}°
                    </span>
                  )}
                </Link>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ──── LEFT COLUMN: News ──── */}
          <div className="lg:col-span-2 space-y-10">

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-bold text-aegean uppercase tracking-[0.2em] flex items-center gap-2">
                  <Newspaper className="w-4 h-4" /> {t("latestNews")}
                </h2>
                <Link href="/news" className="text-xs text-aegean hover:text-aegean-light flex items-center gap-1 font-semibold transition-colors">
                  {t("allNews")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {latestNews.length > 0 ? (
                <div className="space-y-4">
                  {/* Featured article - magazine style */}
                  {featuredNews && (
                    <BlurFade delay={0}>
                      <Link
                        href={`/news/${featuredNews.slug}`}
                        className="block group rounded-2xl overflow-hidden relative h-64 md:h-72"
                      >
                        {/* Gradient background since no images yet */}
                        <div className="absolute inset-0 bg-gradient-to-br from-aegean via-[#1a5f82] to-aegean-light" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(184,92,56,0.3)_0%,_transparent_60%)]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
                          <div className="flex items-center gap-2 mb-3">
                            {featuredNews.category && (
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md ${CATEGORY_STYLES[featuredNews.category] || "bg-white/20 text-white"}`}>
                                {featuredNews.category}
                              </span>
                            )}
                            <span className="text-[10px] text-white/50 font-mono">{timeAgo(featuredNews.published_at)}</span>
                          </div>
                          <h3
                            className="text-xl md:text-2xl font-bold text-white leading-snug group-hover:text-sand transition-colors max-w-lg"
                            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
                          >
                            {getLocalizedField(featuredNews, "title", loc)}
                          </h3>
                          <p className="text-xs text-white/50 mt-2">{featuredNews.source_name}</p>
                        </div>
                      </Link>
                    </BlurFade>
                  )}

                  {/* Article list */}
                  <div className="divide-y divide-border">
                    {restNews.map((item, i) => (
                      <BlurFade key={item.slug} delay={0.04 * (i + 1)}>
                        <Link
                          href={`/news/${item.slug}`}
                          className="flex items-start gap-4 py-4 group"
                        >
                          <div className="shrink-0 w-1 self-stretch rounded-full bg-border group-hover:bg-aegean transition-colors mt-1" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-semibold text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2">
                              {getLocalizedField(item, "title", loc)}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[11px] text-text-light">{item.source_name}</span>
                              {item.category && (
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${CATEGORY_STYLES[item.category] || "bg-stone text-text-muted"}`}>
                                  {item.category}
                                </span>
                              )}
                              <span className="text-[10px] text-text-light font-mono ml-auto">{timeAgo(item.published_at)}</span>
                            </div>
                          </div>
                        </Link>
                      </BlurFade>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-border p-10 text-center">
                  <Newspaper className="w-8 h-8 text-text-light mx-auto mb-3" />
                  <p className="text-sm text-text-muted">{t("newsFeedLoading")}</p>
                </div>
              )}
            </section>
          </div>

          {/* ──── RIGHT SIDEBAR ──── */}
          <div className="space-y-6">

            {/* Events */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-terra uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {t("eventsThisWeek")}
                </h2>
                <Link href="/events" className="text-xs text-terra hover:text-terra-light flex items-center gap-1 font-semibold transition-colors">
                  {t("allEvents")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-2.5">
                  {upcomingEvents.map((event, i) => {
                    const dateParts = formatEventDate(event.date_start, locale).split(" ");
                    return (
                      <BlurFade key={event.slug} delay={0.04 * i}>
                        <Link
                          href={`/events/${event.slug}`}
                          className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-border hover:border-terra/30 hover:shadow-md transition-all group"
                        >
                          <div className="shrink-0 w-12 h-12 rounded-lg bg-terra/8 flex flex-col items-center justify-center">
                            <span className="text-[9px] text-terra font-bold uppercase tracking-wider leading-none">
                              {dateParts[0]}
                            </span>
                            <span className="text-lg font-bold text-terra leading-none mt-0.5">
                              {dateParts[1]}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text group-hover:text-terra transition-colors leading-snug line-clamp-1">
                              {getLocalizedField(event, "title", loc)}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{localizeLocation(event.location_name, locale)}</span>
                            </div>
                          </div>
                        </Link>
                      </BlurFade>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-border p-6 text-center">
                  <Calendar className="w-6 h-6 text-text-light mx-auto mb-2" />
                  <p className="text-sm text-text-muted">
                    {t("noEvents")}{" "}
                    <Link href="/submit-event" className="text-terra hover:underline font-semibold">
                      {t("submitEvent")}
                    </Link>
                  </p>
                </div>
              )}
            </section>

            {/* Newsletter */}
            <NewsletterForm locale={locale} />

            {/* Explore grid */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { href: "/beaches", icon: <Waves className="w-5 h-5" />, title: t("beachesCount"), desc: t("beachesDesc"), bg: "from-aegean to-aegean-light", text: "text-white" },
                  { href: "/food", icon: <UtensilsCrossed className="w-5 h-5" />, title: t("foodLabel"), desc: t("foodDesc"), bg: "from-terra to-terra-light", text: "text-white" },
                  { href: "/villages", icon: <Mountain className="w-5 h-5" />, title: t("villagesCount"), desc: t("villagesDesc"), bg: "from-sand-warm to-sand", text: "text-text" },
                  { href: "/hikes", icon: <Footprints className="w-5 h-5" />, title: t("hikesCount"), desc: t("hikesDesc"), bg: "from-olive to-olive-light", text: "text-white" },
                ].map(({ href, icon, title, desc, bg, text }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-xl bg-gradient-to-br ${bg} p-4 h-28 flex flex-col justify-between hover:shadow-lg transition-all group`}
                  >
                    <div className={`${text} opacity-50 group-hover:opacity-70 transition-opacity`}>{icon}</div>
                    <div>
                      <p className={`text-sm font-bold ${text} leading-snug`}>{title}</p>
                      <p className={`text-[10px] ${text} opacity-60 leading-snug mt-0.5`}>{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Link href="/fire-alerts" className="flex items-center gap-2.5 p-3 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-all">
                  <Flame className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-700">{t("fireLabel")}</p>
                    <p className="text-[10px] text-red-500">{t("fireDesc")}</p>
                  </div>
                </Link>
                <Link href="/articles" className="flex items-center gap-2.5 p-3 bg-aegean-faint rounded-xl border border-aegean/10 hover:shadow-md transition-all">
                  <BookOpen className="w-5 h-5 text-aegean shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-aegean">{t("guidesLabel")}</p>
                    <p className="text-[10px] text-text-muted">{t("guidesDesc")}</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-border py-12 px-4 mt-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-text-light">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-aegean tracking-tight">CRETE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
            <span className="font-extrabold text-sm text-terra tracking-tight">DIRECT</span>
            <span className="ml-3 text-text-light">{tf("tagline")}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/about" className="hover:text-text transition-colors">{tf("about_link")}</Link>
            <Link href="/privacy" className="hover:text-text transition-colors">{tf("privacy")}</Link>
            <Link href="/buses" className="hover:text-text transition-colors">{tf("buses")}</Link>
            <Link href="/submit-event" className="hover:text-text transition-colors">{tf("submitEvent")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
