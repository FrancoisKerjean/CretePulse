"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Sun, Wind, Waves, Calendar, Newspaper, ChevronRight, Mountain,
  UtensilsCrossed, Footprints, Flame, Cloud, CloudRain, MapPin,
  BookOpen, ExternalLink,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";

function WeatherIcon({ code, wind }: { code: number; wind: number }) {
  if (wind > 20) return <Wind className="w-5 h-5 text-aegean" />;
  if (code <= 1) return <Sun className="w-5 h-5 text-amber-400" />;
  if (code <= 3) return <Cloud className="w-5 h-5 text-gray-400" />;
  return <CloudRain className="w-5 h-5 text-blue-400" />;
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

interface NewsletterFormProps {
  locale: string;
}

function NewsletterForm({ locale }: NewsletterFormProps) {
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
      fr: "Merci ! Vérifiez votre boîte mail.",
      de: "Danke! Prüfen Sie Ihren Posteingang.",
      el: "Ευχαριστούμε! Ελέγξτε τα εισερχόμενά σας.",
    };
    return (
      <div className="rounded-2xl bg-gradient-to-br from-aegean to-aegean-light p-6 text-white">
        <p className="text-sm font-medium">{successMsg[locale] || successMsg.en}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-aegean to-aegean-light p-6 text-white shadow-lg">
      <h3 className="font-bold text-base">{t("newsletter")}</h3>
      <p className="text-sm text-white/75 mt-1">{t("newsletterCta")}</p>
      <form className="mt-4 space-y-2.5" onSubmit={handleSubmit}>
        {/* Honeypot */}
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
          className="w-full px-4 py-2.5 rounded-xl border border-white/20 bg-white/15 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm"
        />
        {status === "error" && (
          <p className="text-xs text-red-200">
            {locale === "fr" ? "Une erreur s'est produite. Réessayez." :
             locale === "de" ? "Ein Fehler ist aufgetreten. Bitte erneut versuchen." :
             locale === "el" ? "Προέκυψε σφάλμα. Δοκιμάστε ξανά." :
             "Something went wrong. Please try again."}
          </p>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full px-4 py-2.5 bg-terra text-white rounded-xl font-bold text-sm hover:bg-terra-light transition-colors disabled:opacity-60 shadow-md"
        >
          {status === "loading" ? "..." : t("subscribe")}
        </button>
      </form>
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

      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-aegean via-[#1a5f82] to-[#7a5230] py-14 px-4">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.07)_0%,_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-terra opacity-70" />
              <span className="relative rounded-full h-2 w-2 bg-terra" />
            </span>
            <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">
              {t("updatedAt", { time: updateTime })}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
            {t("hero")}
          </h1>
          <p className="mt-3 text-white/65 text-base max-w-xl">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Weather bar */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 mb-8">
          {cities.slice(0, 6).map((city) => (
            <Link
              key={city.name}
              href="/weather"
              className="shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white border border-border hover:border-aegean/30 hover:shadow-md card-hover"
            >
              <WeatherIcon code={city.weatherCode} wind={city.windSpeed} />
              <div>
                <p className="text-xs font-semibold text-text-muted leading-none">{city.name}</p>
                <p className="text-lg font-bold text-text leading-tight">{city.temp}°</p>
              </div>
              {city.seaTemp !== null && (
                <span className="text-xs text-aegean flex items-center gap-0.5 font-semibold ml-1">
                  <Waves className="w-3.5 h-3.5" />{city.seaTemp}°
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">

            {/* Latest News */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-bold text-aegean uppercase tracking-widest flex items-center gap-2">
                  <Newspaper className="w-4 h-4" /> {t("latestNews")}
                </h2>
                <Link href="/news" className="text-xs text-aegean hover:underline flex items-center gap-1 font-semibold">
                  {t("allNews")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {latestNews.length > 0 ? (
                <div className="space-y-3">
                  {/* Featured article */}
                  {featuredNews && (
                    <BlurFade delay={0}>
                      <Link
                        href={`/news/${featuredNews.slug}`}
                        className="block group rounded-2xl bg-white border border-border overflow-hidden card-hover"
                      >
                        {/* Photo placeholder with gradient */}
                        <div className="h-40 bg-gradient-to-br from-aegean/80 to-aegean-light/60 relative flex items-end p-5">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="relative z-10">
                            {featuredNews.category && (
                              <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full mb-2 ${CATEGORY_STYLES[featuredNews.category] || "bg-stone text-text-muted"}`}>
                                {featuredNews.category}
                              </span>
                            )}
                            <h3 className="text-lg font-bold text-white leading-snug group-hover:text-sand transition-colors" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
                              {getLocalizedField(featuredNews, "title", loc)}
                            </h3>
                          </div>
                        </div>
                        <div className="px-5 py-3 flex items-center justify-between">
                          <span className="text-xs text-text-muted">{featuredNews.source_name}</span>
                          <span className="text-xs font-mono text-text-light">{timeAgo(featuredNews.published_at)}</span>
                        </div>
                      </Link>
                    </BlurFade>
                  )}

                  {/* Rest of articles */}
                  {restNews.map((item, i) => (
                    <BlurFade key={item.slug} delay={0.04 * (i + 1)}>
                      <Link
                        href={`/news/${item.slug}`}
                        className="flex items-start gap-4 py-3 px-4 -mx-1 rounded-xl hover:bg-white transition-colors group border border-transparent hover:border-border card-hover"
                      >
                        {/* Accent bar */}
                        <div className="shrink-0 w-1 self-stretch rounded-full bg-aegean/20 group-hover:bg-aegean/50 transition-colors mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2">
                            {getLocalizedField(item, "title", loc)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-text-light">{item.source_name}</span>
                            {item.category && (
                              <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${CATEGORY_STYLES[item.category] || "bg-stone text-text-muted"}`}>
                                {item.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-text-light font-mono shrink-0 mt-0.5">{timeAgo(item.published_at)}</span>
                      </Link>
                    </BlurFade>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-border p-8 text-center">
                  <Newspaper className="w-8 h-8 text-text-light mx-auto mb-2" />
                  <p className="text-sm text-text-muted">{t("newsFeedLoading")}</p>
                </div>
              )}
            </section>

            {/* Events */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xs font-bold text-terra uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {t("eventsThisWeek")}
                </h2>
                <Link href="/events" className="text-xs text-terra hover:underline flex items-center gap-1 font-semibold">
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
                          className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-border hover:border-terra/30 hover:shadow-md transition-all group card-hover"
                        >
                          <div className="shrink-0 w-14 h-14 rounded-xl bg-terra/10 flex flex-col items-center justify-center border border-terra/15">
                            <span className="text-[10px] text-terra font-bold uppercase tracking-wider leading-none">
                              {dateParts[0]}
                            </span>
                            <span className="text-2xl font-bold text-terra leading-none mt-0.5">
                              {dateParts[1]}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-text group-hover:text-terra transition-colors leading-snug">
                              {getLocalizedField(event, "title", loc)}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                              {event.location_name && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {event.location_name}
                                </span>
                              )}
                              {event.category && (
                                <span className="px-2 py-0.5 bg-terra/10 text-terra rounded-full text-[10px] font-bold uppercase tracking-wide">
                                  {event.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-text-light group-hover:text-terra shrink-0 transition-colors" />
                        </Link>
                      </BlurFade>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-border p-8 text-center">
                  <Calendar className="w-8 h-8 text-text-light mx-auto mb-2" />
                  <p className="text-sm text-text-muted">
                    {t("noEvents")}{" "}
                    <Link href="/submit-event" className="text-terra hover:underline font-semibold">
                      {t("submitEvent")}
                    </Link>
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-5">

            {/* Newsletter */}
            <NewsletterForm locale={locale} />

            {/* Quick Links */}
            <div className="space-y-2">
              {[
                { href: "/beaches", icon: <Waves className="w-5 h-5 text-aegean" />, title: t("beachesCount"), desc: t("beachesDesc"), accent: "hover:border-aegean/30" },
                { href: "/food", icon: <UtensilsCrossed className="w-5 h-5 text-terra" />, title: t("foodLabel"), desc: t("foodDesc"), accent: "hover:border-terra/30" },
                { href: "/villages", icon: <Mountain className="w-5 h-5 text-sand-warm" />, title: t("villagesCount"), desc: t("villagesDesc"), accent: "hover:border-sand-warm/50" },
                { href: "/hikes", icon: <Footprints className="w-5 h-5 text-olive" />, title: t("hikesCount"), desc: t("hikesDesc"), accent: "hover:border-olive/30" },
                { href: "/fire-alerts", icon: <Flame className="w-5 h-5 text-red-500" />, title: t("fireLabel"), desc: t("fireDesc"), accent: "hover:border-red-400/30" },
                { href: "/articles", icon: <BookOpen className="w-5 h-5 text-aegean" />, title: t("guidesLabel"), desc: t("guidesDesc"), accent: "hover:border-aegean/30" },
              ].map(({ href, icon, title, desc, accent }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 p-3.5 bg-white rounded-xl border border-border ${accent} hover:shadow-md transition-all group card-hover`}
                >
                  <div className="shrink-0">{icon}</div>
                  <div>
                    <p className="text-sm font-bold text-text group-hover:text-aegean transition-colors leading-snug">{title}</p>
                    <p className="text-[11px] text-text-muted leading-snug">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-10 px-4 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-text-light">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-aegean tracking-tight">CRETE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
            <span className="font-extrabold text-sm text-terra tracking-tight">DIRECT</span>
            <span className="ml-2 text-text-light">{tf("tagline")}</span>
          </div>
          <div className="flex gap-5">
            <Link href="/about" className="hover:text-text-muted transition-colors">{tf("about_link")}</Link>
            <Link href="/privacy" className="hover:text-text-muted transition-colors">{tf("privacy")}</Link>
            <Link href="/buses" className="hover:text-text-muted transition-colors">{tf("buses")}</Link>
            <Link href="/submit-event" className="hover:text-text-muted transition-colors">{tf("submitEvent")}</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
