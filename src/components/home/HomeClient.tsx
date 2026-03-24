"use client";

import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Sun, Wind, Waves, Calendar, Newspaper, ChevronRight, Mountain,
  UtensilsCrossed, Footprints, Flame, Cloud, CloudRain, Clock, MapPin,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { NewsItem, Event, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";

function WeatherIcon({ code, wind }: { code: number; wind: number }) {
  if (wind > 20) return <Wind className="w-4 h-4 text-aegean" />;
  if (code <= 1) return <Sun className="w-4 h-4 text-amber-400" />;
  if (code <= 3) return <Cloud className="w-4 h-4 text-gray-400" />;
  return <CloudRain className="w-4 h-4 text-blue-400" />;
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

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
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

  return (
    <main className="min-h-screen bg-surface">

      {/* News Ticker - pulls from real news if available */}
      <div className="bg-aegean text-white overflow-hidden">
        <div className="max-w-6xl mx-auto flex items-center h-8">
          <span className="shrink-0 bg-terra px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider">Live</span>
          <div className="overflow-hidden ml-3 flex-1">
            <div className="animate-marquee whitespace-nowrap flex gap-8 text-xs">
              {latestNews.length > 0 ? (
                <>
                  {latestNews.slice(0, 5).map((n) => (
                    <span key={n.slug} className="inline-flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-terra" />
                      {getLocalizedField(n, "title", loc)}
                    </span>
                  ))}
                  {latestNews.slice(0, 5).map((n) => (
                    <span key={n.slug + "-dup"} className="inline-flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-terra" />
                      {getLocalizedField(n, "title", loc)}
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-terra" />
                    Kastelli airport 67% complete, on track for 2028
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-terra" />
                    Sea temperature 17-18°C across south coast
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT: 2-column layout on desktop === */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Updated timestamp */}
        <div className="flex items-center gap-2 text-[11px] text-text-light mb-6">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-olive opacity-60" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-olive" />
          </span>
          Updated at {updateTime} local time
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN: News + Events (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Weather bar compact */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {cities.slice(0, 6).map((city) => (
                <Link
                  key={city.name}
                  href="/weather"
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-border hover:border-aegean/30 transition-all"
                >
                  <WeatherIcon code={city.weatherCode} wind={city.windSpeed} />
                  <span className="text-xs font-medium">{city.name}</span>
                  <span className="text-sm font-bold">{city.temp}°</span>
                  {city.seaTemp !== null && (
                    <span className="text-[10px] text-aegean flex items-center gap-0.5">
                      <Waves className="w-2.5 h-2.5" />{city.seaTemp}°
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Latest News */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-aegean uppercase tracking-wider flex items-center gap-2">
                  <Newspaper className="w-4 h-4" /> {t("latestNews")}
                </h2>
                <Link href="/news" className="text-xs text-aegean hover:underline flex items-center gap-1">
                  All news <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {latestNews.length > 0 ? (
                <div className="space-y-1">
                  {latestNews.map((item, i) => (
                    <BlurFade key={item.slug} delay={0.03 * i}>
                      <Link
                        href={`/news/${item.slug}`}
                        className="flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-lg hover:bg-white transition-colors group"
                      >
                        <span className="text-[10px] text-text-light font-mono mt-0.5 shrink-0 w-8 text-right">
                          {timeAgo(item.published_at)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text group-hover:text-aegean transition-colors leading-snug line-clamp-2">
                            {getLocalizedField(item, "title", loc)}
                          </p>
                          <p className="text-xs text-text-light mt-0.5">{item.source_name}</p>
                        </div>
                      </Link>
                    </BlurFade>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border p-6 text-center">
                  <Newspaper className="w-8 h-8 text-text-light mx-auto mb-2" />
                  <p className="text-sm text-text-muted">News feed loading. Updated every 3 hours.</p>
                </div>
              )}
            </section>

            {/* Events This Week */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-terra uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> {t("eventsThisWeek")}
                </h2>
                <Link href="/events" className="text-xs text-terra hover:underline flex items-center gap-1">
                  All events <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {upcomingEvents.length > 0 ? (
                <div className="space-y-2">
                  {upcomingEvents.map((event, i) => (
                    <BlurFade key={event.slug} delay={0.03 * i}>
                      <Link
                        href={`/events/${event.slug}`}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-terra/30 hover:shadow-sm transition-all group"
                      >
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-terra-faint flex flex-col items-center justify-center">
                          <span className="text-[10px] text-terra font-semibold uppercase">
                            {formatEventDate(event.date_start).split(" ")[0]}
                          </span>
                          <span className="text-lg font-bold text-terra leading-none">
                            {formatEventDate(event.date_start).split(" ")[1]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text group-hover:text-terra transition-colors truncate">
                            {getLocalizedField(event, "title", loc)}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                            {event.location_name && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" /> {event.location_name}
                              </span>
                            )}
                            {event.category && (
                              <span className="px-1.5 py-0.5 bg-terra-faint text-terra rounded text-[10px] font-medium">
                                {event.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </BlurFade>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border p-6 text-center">
                  <Calendar className="w-8 h-8 text-text-light mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No upcoming events. <Link href="/submit-event" className="text-terra hover:underline">Submit one?</Link></p>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">

            {/* Newsletter CTA */}
            <div className="bg-gradient-to-br from-aegean-faint to-white rounded-xl border border-aegean/20 p-5">
              <h3 className="font-bold text-sm text-aegean">{t("newsletter")}</h3>
              <p className="text-xs text-text-muted mt-1">{t("newsletterCta")}</p>
              <form className="mt-3 space-y-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-aegean/30"
                />
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-terra text-white rounded-lg font-semibold text-sm hover:bg-terra-light transition-colors"
                >
                  {t("subscribe")}
                </button>
              </form>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              <Link href="/beaches" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-aegean/30 transition-all group">
                <Waves className="w-5 h-5 text-aegean" />
                <div>
                  <p className="text-sm font-semibold group-hover:text-aegean transition-colors">{t("beachesCount")}</p>
                  <p className="text-[11px] text-text-muted">{t("beachesDesc")}</p>
                </div>
              </Link>

              <Link href="/food" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-terra/30 transition-all group">
                <UtensilsCrossed className="w-5 h-5 text-terra" />
                <div>
                  <p className="text-sm font-semibold group-hover:text-terra transition-colors">{t("foodLabel")}</p>
                  <p className="text-[11px] text-text-muted">{t("foodDesc")}</p>
                </div>
              </Link>

              <Link href="/villages" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-sand-warm transition-all group">
                <Mountain className="w-5 h-5 text-sand-warm" />
                <div>
                  <p className="text-sm font-semibold group-hover:text-terra-light transition-colors">{t("villagesCount")}</p>
                  <p className="text-[11px] text-text-muted">{t("villagesDesc")}</p>
                </div>
              </Link>

              <Link href="/hikes" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-olive/30 transition-all group">
                <Footprints className="w-5 h-5 text-olive" />
                <div>
                  <p className="text-sm font-semibold group-hover:text-olive transition-colors">{t("hikesCount")}</p>
                  <p className="text-[11px] text-text-muted">{t("hikesDesc")}</p>
                </div>
              </Link>

              <Link href="/fire-alerts" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-red-400/30 transition-all group">
                <Flame className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold group-hover:text-red-500 transition-colors">{t("fireLabel")}</p>
                  <p className="text-[11px] text-text-muted">{t("fireDesc")}</p>
                </div>
              </Link>

              <Link href="/articles" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-aegean/30 transition-all group">
                <Newspaper className="w-5 h-5 text-aegean" />
                <div>
                  <p className="text-sm font-semibold group-hover:text-aegean transition-colors">Guides</p>
                  <p className="text-[11px] text-text-muted">10 articles about Crete</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-8 px-4 mt-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-text-light">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-aegean">CRETE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-terra" />
            <span className="font-bold text-terra">PULSE</span>
            <span className="ml-2">Free. Independent. Updated hourly.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-text-muted">About</Link>
            <Link href="/privacy" className="hover:text-text-muted">Privacy</Link>
            <Link href="/buses" className="hover:text-text-muted">Buses</Link>
            <Link href="/submit-event" className="hover:text-text-muted">Submit event</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
