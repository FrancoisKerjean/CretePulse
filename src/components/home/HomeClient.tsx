"use client";

import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Sun,
  Wind,
  Waves,
  Calendar,
  Newspaper,
  ChevronRight,
  Mountain,
  UtensilsCrossed,
  Footprints,
  Flame,
  Cloud,
  CloudRain,
  Clock,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { CityWeather } from "@/lib/weather";
import type { NewsItem, Locale } from "@/lib/types";
import { getLocalizedField } from "@/lib/types";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
  { code: "el", label: "EL" },
] as const;

function WeatherIcon({ code, wind }: { code: number; wind: number }) {
  if (wind > 20) return <Wind className="w-4 h-4 text-aegean" />;
  if (code <= 1) return <Sun className="w-4 h-4 text-amber-400" />;
  if (code <= 3) return <Cloud className="w-4 h-4 text-gray-400" />;
  return <CloudRain className="w-4 h-4 text-blue-400" />;
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return diffMins <= 1 ? "just now" : `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

interface HomeClientProps {
  cities: CityWeather[];
  latestNews: NewsItem[];
  locale: string;
}

export function HomeClient({ cities, latestNews, locale }: HomeClientProps) {
  const loc = locale as Locale;
  const t = useTranslations("home");
  const tnav = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <main className="min-h-screen bg-surface">
      {/* News Ticker */}
      <div className="bg-aegean text-white overflow-hidden">
        <div className="max-w-6xl mx-auto flex items-center h-8">
          <span className="shrink-0 bg-terra px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider">Live</span>
          <div className="overflow-hidden ml-3 flex-1">
            <div className="animate-marquee whitespace-nowrap flex gap-8 text-xs">
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-terra" />
                Kastelli airport reaches 67% completion, on track for 2028 opening
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-terra" />
                Sea temperature reaches 18°C in south Crete, earliest in 5 years
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-terra" />
                Heraklion hosts Mediterranean food festival March 28-30
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-terra" />
                New KTEL bus route connects Ierapetra to Sitia via coastal road
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-terra" />
                Kastelli airport reaches 67% completion, on track for 2028 opening
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-terra" />
                Sea temperature reaches 18°C in south Crete, earliest in 5 years
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1580502304784-8985b7eb7260?w=1400&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F7F4F0]/85 via-[#F7F4F0]/75 to-[#F7F4F0]/90" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent" />

        <div className="max-w-4xl mx-auto text-center relative">
          <BlurFade delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-border text-xs text-text-muted mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute h-full w-full rounded-full bg-olive opacity-60" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-olive" />
              </span>
              {t("badge")}
            </div>
          </BlurFade>

          <BlurFade delay={0.2}>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-aegean leading-[1.1]">
              {t("hero")}
            </h1>
          </BlurFade>

          <BlurFade delay={0.3}>
            <p className="mt-4 text-base md:text-lg text-text-muted max-w-xl mx-auto">
              {t("subtitle")}
            </p>
          </BlurFade>

          <BlurFade delay={0.4}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#weather" className="inline-flex items-center gap-2 px-5 py-2.5 bg-aegean text-white rounded-lg font-medium text-sm hover:bg-aegean-light transition-colors shadow-sm">
                <Sun className="w-4 h-4" /> {tnav("weather")}
              </a>
              <a href="#explore" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-border rounded-lg font-medium text-sm hover:bg-stone transition-colors shadow-sm">
                <Waves className="w-4 h-4 text-aegean" /> {tnav("beaches")}
              </a>
              <a href="#events" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-border rounded-lg font-medium text-sm hover:bg-stone transition-colors shadow-sm">
                <Calendar className="w-4 h-4 text-terra" /> {tnav("events")}
              </a>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Weather Strip */}
      <section id="weather" className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              {t("weatherNow")}
            </h2>
            <Link href="/weather" className="text-xs text-aegean font-medium flex items-center gap-1 hover:underline">
              5-day forecast <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {cities.slice(0, 6).map((city, i) => (
              <BlurFade key={city.name} delay={0.05 + i * 0.04}>
                <div className="rounded-xl bg-stone/50 border border-border/60 p-3 text-center hover:border-aegean/30 hover:bg-aegean-faint transition-all cursor-pointer">
                  <p className="text-[11px] font-medium text-text-muted truncate">{city.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-1.5">
                    <WeatherIcon code={city.weatherCode} wind={city.windSpeed} />
                    <span className="text-xl font-bold text-text">{city.temp}°</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-text-muted">
                    {city.seaTemp !== null && (
                      <span className="flex items-center gap-0.5">
                        <Waves className="w-2.5 h-2.5" />{city.seaTemp}°
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Wind className="w-2.5 h-2.5" />{city.windSpeed}
                    </span>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Explore Grid */}
      <section id="explore" className="max-w-6xl mx-auto px-4 py-14">
        <BlurFade delay={0.1}>
          <h2 className="text-2xl md:text-3xl font-bold text-aegean">{t("explore")}</h2>
          <p className="text-text-muted mt-1 text-sm">{t("exploreSubtitle")}</p>
        </BlurFade>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          <BlurFade delay={0.15}>
            <Link href="/beaches" className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-aegean-faint to-white p-5 h-44 flex flex-col justify-end hover:border-aegean/40 hover:shadow-md transition-all">
              <Waves className="absolute top-3 right-3 w-7 h-7 text-aegean/20 group-hover:text-aegean/40 transition-colors" />
              <span className="text-2xl font-bold text-aegean">{t("beachesCount")}</span>
              <span className="text-xs text-text-muted mt-1 leading-tight">{t("beachesDesc")}</span>
            </Link>
          </BlurFade>

          <BlurFade delay={0.2}>
            <Link href="/events" className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-terra-faint to-white p-5 h-44 flex flex-col justify-end hover:border-terra/40 hover:shadow-md transition-all">
              <Calendar className="absolute top-3 right-3 w-7 h-7 text-terra/20 group-hover:text-terra/40 transition-colors" />
              <span className="text-2xl font-bold text-terra">{t("eventsCount")}</span>
              <span className="text-xs text-text-muted mt-1 leading-tight">{t("eventsDesc")}</span>
            </Link>
          </BlurFade>

          <BlurFade delay={0.25}>
            <Link href="/villages" className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sand/40 to-white p-5 h-44 flex flex-col justify-end hover:border-sand-warm hover:shadow-md transition-all">
              <Mountain className="absolute top-3 right-3 w-7 h-7 text-sand-warm/60 group-hover:text-terra-light/60 transition-colors" />
              <span className="text-2xl font-bold text-text">{t("villagesCount")}</span>
              <span className="text-xs text-text-muted mt-1 leading-tight">{t("villagesDesc")}</span>
            </Link>
          </BlurFade>

          <BlurFade delay={0.3}>
            <Link href="/hikes" className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-olive/5 to-white p-5 h-44 flex flex-col justify-end hover:border-olive/30 hover:shadow-md transition-all">
              <Footprints className="absolute top-3 right-3 w-7 h-7 text-olive/20 group-hover:text-olive/40 transition-colors" />
              <span className="text-2xl font-bold text-olive">{t("hikesCount")}</span>
              <span className="text-xs text-text-muted mt-1 leading-tight">{t("hikesDesc")}</span>
            </Link>
          </BlurFade>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <BlurFade delay={0.35}>
            <Link href="/food" className="group rounded-xl bg-white border border-border p-4 flex items-center gap-3 hover:border-terra/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-terra-faint flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-terra" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-sm">{t("foodLabel")}</span>
                <p className="text-xs text-text-muted truncate">{t("foodDesc")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-light ml-auto shrink-0" />
            </Link>
          </BlurFade>

          <BlurFade delay={0.4}>
            <Link href="/news" className="group rounded-xl bg-white border border-border p-4 flex items-center gap-3 hover:border-aegean/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-aegean-faint flex items-center justify-center shrink-0">
                <Newspaper className="w-5 h-5 text-aegean" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-sm">{t("newsLabel")}</span>
                <p className="text-xs text-text-muted truncate">{t("newsDesc")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-light ml-auto shrink-0" />
            </Link>
          </BlurFade>

          <BlurFade delay={0.45}>
            <Link href="/fire-alerts" className="group rounded-xl bg-white border border-border p-4 flex items-center gap-3 hover:border-red-400/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-sm">{t("fireLabel")}</span>
                <p className="text-xs text-text-muted truncate">{t("fireDesc")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-light ml-auto shrink-0" />
            </Link>
          </BlurFade>
        </div>
      </section>

      {/* Latest News */}
      {latestNews.length > 0 && (
        <section id="latest-news" className="border-t border-border bg-white">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <BlurFade delay={0.1}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-aegean" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                    {t("latestNews")}
                  </h2>
                </div>
                <Link
                  href="/news"
                  className="text-xs text-aegean font-medium flex items-center gap-1 hover:underline"
                >
                  {t("newsLabel")} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </BlurFade>

            <div className="divide-y divide-border/60">
              {latestNews.map((item, i) => (
                <BlurFade key={item.slug} delay={0.05 + i * 0.05}>
                  <Link
                    href={`/news/${item.slug}`}
                    className="flex items-start gap-3 py-3 group hover:bg-stone/30 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className="flex items-center gap-1 text-[11px] text-text-light whitespace-nowrap mt-0.5 shrink-0 min-w-[4rem]">
                      <Clock className="w-3 h-3" />
                      {timeAgo(item.published_at)}
                    </span>
                    <span className="text-sm font-medium text-text group-hover:text-aegean transition-colors leading-snug">
                      {getLocalizedField(item, "title", loc)}
                    </span>
                  </Link>
                </BlurFade>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="border-y border-border" style={{
        background: "linear-gradient(135deg, #F5E6D3 0%, #F7F4F0 50%, #E8F1F5 100%)"
      }}>
        <div className="max-w-lg mx-auto text-center py-14 px-4">
          <BlurFade delay={0.1}>
            <h2 className="text-xl md:text-2xl font-bold text-aegean">{t("newsletter")}</h2>
            <p className="text-text-muted mt-2 text-sm">{t("newsletterCta")}</p>
            <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-aegean/30"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-terra text-white rounded-lg font-semibold text-sm hover:bg-terra-light transition-colors shadow-sm"
              >
                {t("subscribe")}
              </button>
            </form>
            <p className="text-[11px] text-text-light mt-3">EN / FR / DE editions. Unsubscribe anytime.</p>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-base font-bold tracking-tight text-aegean">CRETE</span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative rounded-full h-1.5 w-1.5 bg-terra" />
              </span>
              <span className="text-base font-bold tracking-tight text-terra">PULSE</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Free, independent guide to Crete. Live data. No ads (yet). No tracking.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-text-muted mb-3">Explore</h3>
            <ul className="space-y-1.5 text-sm text-text-muted">
              <li><Link href="/beaches" className="hover:text-aegean transition-colors">Beaches</Link></li>
              <li><Link href="/villages" className="hover:text-aegean transition-colors">Villages</Link></li>
              <li><Link href="/hikes" className="hover:text-aegean transition-colors">Hiking trails</Link></li>
              <li><Link href="/food" className="hover:text-aegean transition-colors">Restaurants</Link></li>
              <li><Link href="/events" className="hover:text-aegean transition-colors">Events</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-text-muted mb-3">Live</h3>
            <ul className="space-y-1.5 text-sm text-text-muted">
              <li><Link href="/weather" className="hover:text-aegean transition-colors">Weather &amp; sea</Link></li>
              <li><Link href="/fire-alerts" className="hover:text-aegean transition-colors">Fire alerts</Link></li>
              <li><Link href="/news" className="hover:text-aegean transition-colors">News</Link></li>
              <li><Link href="/buses" className="hover:text-aegean transition-colors">Bus schedules</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-border flex items-center justify-between text-[11px] text-text-light">
          <p>2026 Crete Pulse. Independent. Free. Open.</p>
          <Link href="/privacy" className="hover:text-text-muted">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
