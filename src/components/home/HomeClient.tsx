"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import {
  Sun, Wind, Waves, Calendar, Newspaper, ChevronRight, Mountain,
  UtensilsCrossed, Footprints, Flame, Cloud, CloudRain, MapPin,
  BookOpen, ArrowDown, Mail,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";
import { localizeLocation } from "@/lib/localize-location";

function WeatherIcon({ code, wind, className }: { code: number; wind: number; className?: string }) {
  const c = className || "w-5 h-5";
  if (wind > 20) return <Wind className={`${c} text-white/80`} />;
  if (code <= 1) return <Sun className={`${c} text-amber-300`} />;
  if (code <= 3) return <Cloud className={`${c} text-white/60`} />;
  return <CloudRain className={`${c} text-blue-300`} />;
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
      setStatus(res.ok ? "success" : "error");
      if (res.ok) setEmail("");
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
      <div className="rounded-2xl bg-aegean p-6 text-white text-center">
        <p className="text-sm font-medium">{successMsg[locale] || successMsg.en}</p>
      </div>
    );
  }

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        required
        className="flex-1 px-4 py-3 rounded-xl border border-border bg-white text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-aegean/30 focus:border-aegean/40"
      />
      {status === "error" && (
        <p className="text-xs text-red-500 absolute -bottom-5">Error</p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-6 py-3 bg-terra text-white rounded-xl font-bold text-sm hover:bg-terra-light transition-colors disabled:opacity-60 shadow-md hover:shadow-lg shrink-0"
      >
        {status === "loading" ? "..." : t("subscribe")}
      </button>
    </form>
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

  const now = new Date();
  const updateTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const featuredNews = latestNews[0] ?? null;
  const secondNews = latestNews[1] ?? null;
  const restNews = latestNews.slice(2);

  return (
    <main className="min-h-screen bg-surface">

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section className="relative h-[80vh] min-h-[560px] max-h-[860px] overflow-hidden">
        <Image
          src="https://images.pexels.com/photos/11401809/pexels-photo-11401809.jpeg"
          alt="Crete coastline"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          quality={85}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="relative h-full flex flex-col justify-end pb-20 px-4">
          <div className="max-w-6xl mx-auto w-full">
            <BlurFade delay={0.1}>
              <div className="flex items-center gap-2.5 mb-5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-terra opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-terra" />
                </span>
                <span className="text-white/40 text-[11px] font-semibold uppercase tracking-[0.25em]">
                  {t("updatedAt", { time: updateTime })}
                </span>
              </div>
            </BlurFade>

            <BlurFade delay={0.2}>
              <h1
                className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-white leading-[0.9] tracking-tight max-w-3xl"
                style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
              >
                {t("hero")}
              </h1>
            </BlurFade>

            <BlurFade delay={0.3}>
              <p className="mt-5 text-white/55 text-lg md:text-xl max-w-lg leading-relaxed">
                {t("subtitle")}
              </p>
            </BlurFade>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
          <ArrowDown className="w-5 h-5 text-white" />
        </div>
      </section>

      {/* ═══════════════════ NEWS TICKER ═══════════════════ */}
      {latestNews.length > 0 && (
        <div className="bg-aegean text-white py-2.5 overflow-hidden">
          <Marquee duration={40} pauseOnHover>
            {latestNews.map((item) => (
              <Link
                key={item.slug}
                href={`/news/${item.slug}`}
                className="flex items-center gap-2.5 px-4 text-sm hover:text-sand transition-colors whitespace-nowrap"
              >
                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-terra/70 font-semibold shrink-0">
                  {item.category || "news"}
                </span>
                <span className="font-medium">{getLocalizedField(item, "title", loc)}</span>
                <span className="text-white/30 text-xs font-mono">{timeAgo(item.published_at)}</span>
                <span className="text-white/20 mx-2">|</span>
              </Link>
            ))}
          </Marquee>
        </div>
      )}

      {/* ═══════════════════ WEATHER STRIP ═══════════════════ */}
      <section className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto scrollbar-none divide-x divide-border">
            {cities.slice(0, 6).map((city) => (
              <Link
                key={city.name}
                href="/weather"
                className="shrink-0 flex items-center gap-3 px-5 py-4 hover:bg-stone/50 transition-colors first:pl-0"
              >
                <WeatherIcon code={city.weatherCode} wind={city.windSpeed} />
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider leading-none">{city.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-text leading-none">{city.temp}°</span>
                    {city.seaTemp !== null && (
                      <span className="text-[11px] text-aegean flex items-center gap-0.5 font-bold">
                        <Waves className="w-3 h-3" />{city.seaTemp}°
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ STATS BAR ═══════════════════ */}
      <section className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: 500, suffix: "+", label: t("beachesCount").replace(/\d+\+?\s*/, ""), icon: <Waves className="w-4 h-4 text-aegean" /> },
              { value: 212, suffix: "", label: t("foodLabel"), icon: <UtensilsCrossed className="w-4 h-4 text-terra" /> },
              { value: 300, suffix: "+", label: t("villagesCount").replace(/\d+\+?\s*/, ""), icon: <Mountain className="w-4 h-4 text-olive" /> },
              { value: 80, suffix: "+", label: t("hikesCount").replace(/\d+\+?\s*/, ""), icon: <Footprints className="w-4 h-4 text-sand-warm" /> },
            ].map(({ value, suffix, label, icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-text leading-none">
                    <NumberTicker value={value} suffix={suffix} />
                  </p>
                  <p className="text-[11px] text-text-muted font-medium mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ MAINTENANCE BANNER ═══════════════════ */}
      {latestNews.length === 0 && upcomingEvents.length === 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-center gap-3">
            <span className="text-amber-600 text-lg">&#9888;</span>
            <p className="text-sm text-amber-800">
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

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* ──── LEFT: News ──── */}
          <div className="lg:col-span-7 space-y-8">

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
                  {/* Top 2 featured articles - side by side on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[featuredNews, secondNews].filter(Boolean).map((item, idx) => (
                      <BlurFade key={item!.slug} delay={idx * 0.1}>
                        <SpotlightCard className="rounded-2xl">
                          <Link
                            href={`/news/${item!.slug}`}
                            className="block group rounded-2xl overflow-hidden relative h-56"
                          >
                            <div className={`absolute inset-0 ${idx === 0 ? "bg-gradient-to-br from-aegean via-[#1a5f82] to-[#2D6A8F]" : "bg-gradient-to-br from-[#3d2b1f] via-terra to-terra-light"}`} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            <div className="relative h-full flex flex-col justify-end p-5">
                              <div className="flex items-center gap-2 mb-2">
                                {item!.category && (
                                  <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm">
                                    {item!.category}
                                  </span>
                                )}
                                <span className="text-[9px] text-white/40 font-mono">{timeAgo(item!.published_at)}</span>
                              </div>
                              <h3
                                className="text-base font-bold text-white leading-snug group-hover:text-sand transition-colors line-clamp-3"
                                style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
                              >
                                {getLocalizedField(item!, "title", loc)}
                              </h3>
                              <p className="text-[10px] text-white/40 mt-2">{item!.source_name}</p>
                            </div>
                          </Link>
                        </SpotlightCard>
                      </BlurFade>
                    ))}
                  </div>

                  {/* Rest of articles */}
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
                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${CATEGORY_STYLES[item.category] || "bg-stone text-text-muted"}`}>
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

          {/* ──── RIGHT: Events + Newsletter ──── */}
          <div className="lg:col-span-5 space-y-8">

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
                <div className="space-y-2">
                  {upcomingEvents.map((event, i) => {
                    const dateParts = formatEventDate(event.date_start, locale).split(" ");
                    return (
                      <BlurFade key={event.slug} delay={0.04 * i}>
                        <Link
                          href={`/events/${event.slug}`}
                          className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-terra/30 hover:shadow-md transition-all group"
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

            {/* Newsletter - clean inline */}
            <section className="rounded-2xl border border-border bg-white p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-aegean/8 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-aegean" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text">{t("newsletter")}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{t("newsletterCta")}</p>
                </div>
              </div>
              <NewsletterForm locale={locale} />
            </section>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/fire-alerts" className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 hover:shadow-md transition-all group">
                <Flame className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-700">{t("fireLabel")}</p>
                  <p className="text-[9px] text-red-400 leading-tight">{t("fireDesc")}</p>
                </div>
              </Link>
              <Link href="/articles" className="flex items-center gap-2 p-3 bg-aegean-faint rounded-xl border border-aegean/10 hover:shadow-md transition-all group">
                <BookOpen className="w-4 h-4 text-aegean shrink-0" />
                <div>
                  <p className="text-xs font-bold text-aegean">{t("guidesLabel")}</p>
                  <p className="text-[9px] text-text-muted leading-tight">{t("guidesDesc")}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ EXPLORE BENTO ═══════════════════ */}
      <section className="border-t border-border bg-white py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <BlurFade delay={0.1}>
            <h2
              className="text-3xl md:text-4xl font-bold text-text mb-2"
              style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
            >
              {t("explore")}
            </h2>
            <p className="text-text-muted text-sm mb-8 max-w-lg">{t("exploreSubtitle")}</p>
          </BlurFade>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/beaches", icon: <Waves className="w-7 h-7" />, title: t("beachesCount"), desc: t("beachesDesc"), bg: "from-aegean to-aegean-light" },
              { href: "/food", icon: <UtensilsCrossed className="w-7 h-7" />, title: t("foodLabel"), desc: t("foodDesc"), bg: "from-terra to-terra-light" },
              { href: "/villages", icon: <Mountain className="w-7 h-7" />, title: t("villagesCount"), desc: t("villagesDesc"), bg: "from-olive to-olive-light" },
              { href: "/hikes", icon: <Footprints className="w-7 h-7" />, title: t("hikesCount"), desc: t("hikesDesc"), bg: "from-[#5a4a3a] to-[#8B7355]" },
            ].map(({ href, icon, title, desc, bg }, idx) => (
              <BlurFade key={href} delay={0.08 * idx}>
                <Link
                  href={href}
                  className={`block rounded-2xl bg-gradient-to-br ${bg} p-6 h-44 flex flex-col justify-between text-white hover:shadow-xl hover:scale-[1.02] transition-all group relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
                  <div className="relative opacity-50 group-hover:opacity-80 transition-opacity">{icon}</div>
                  <div className="relative">
                    <p className="text-base font-bold leading-snug">{title}</p>
                    <p className="text-[11px] text-white/60 leading-snug mt-1">{desc}</p>
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
