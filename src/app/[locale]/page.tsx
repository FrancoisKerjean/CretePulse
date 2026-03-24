"use client";

import { useTranslations } from "next-intl";
import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import {
  Sun,
  Wind,
  Waves,
  Calendar,
  Newspaper,
  ChevronRight,
  Palmtree,
  Mountain,
  UtensilsCrossed,
  MapPin,
} from "lucide-react";

const CITIES = [
  { name: "Heraklion", temp: 18, wind: 12, condition: "Sunny", icon: "sun" },
  { name: "Chania", temp: 17, wind: 15, condition: "Partly cloudy", icon: "cloud" },
  { name: "Rethymno", temp: 17, wind: 10, condition: "Sunny", icon: "sun" },
  { name: "Ag. Nikolaos", temp: 16, wind: 8, condition: "Clear", icon: "sun" },
  { name: "Ierapetra", temp: 19, wind: 6, condition: "Sunny", icon: "sun" },
  { name: "Sitia", temp: 16, wind: 14, condition: "Windy", icon: "wind" },
];

export default function HomePage() {
  const t = useTranslations("home");
  const tnav = useTranslations("nav");

  return (
    <main className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold tracking-tight">CRETE</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky" />
            </span>
            <span className="text-lg font-bold tracking-tight text-sky">PULSE</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#weather" className="hover:text-foreground transition-colors">{tnav("weather")}</a>
            <a href="#beaches" className="hover:text-foreground transition-colors">{tnav("beaches")}</a>
            <a href="#events" className="hover:text-foreground transition-colors">{tnav("events")}</a>
            <a href="#explore" className="hover:text-foreground transition-colors">{tnav("explore")}</a>
            <a href="#news" className="hover:text-foreground transition-colors">{tnav("news")}</a>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <button className="px-2 py-1 rounded bg-sky text-white">EN</button>
            <button className="px-2 py-1 rounded hover:bg-muted">FR</button>
            <button className="px-2 py-1 rounded hover:bg-muted">DE</button>
            <button className="px-2 py-1 rounded hover:bg-muted">EL</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky/5 via-background to-background pt-20 pb-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(74,144,217,0.08),transparent_50%)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <BlurFade delay={0.1}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card mb-8">
              <AnimatedShinyText>
                <span className="text-sm">Live data from Crete, updated every hour</span>
              </AnimatedShinyText>
            </div>
          </BlurFade>

          <BlurFade delay={0.2}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              <AuroraText className="inline">
                {t("hero")}
              </AuroraText>
            </h1>
          </BlurFade>

          <BlurFade delay={0.3}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </BlurFade>

          <BlurFade delay={0.4}>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#weather" className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky text-white rounded-lg font-medium text-sm hover:bg-sky/90 transition-colors">
                <Sun className="w-4 h-4" /> {tnav("weather")}
              </a>
              <a href="#beaches" className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border rounded-lg font-medium text-sm hover:bg-muted transition-colors">
                <Waves className="w-4 h-4 text-sky" /> {tnav("beaches")}
              </a>
              <a href="#events" className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border rounded-lg font-medium text-sm hover:bg-muted transition-colors">
                <Calendar className="w-4 h-4 text-terra" /> {tnav("events")}
              </a>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Weather Strip */}
      <section id="weather" className="border-y border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("weatherNow")}
            </h2>
            <a href="/weather" className="text-xs text-sky font-medium flex items-center gap-1 hover:underline">
              5-day forecast <ChevronRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {CITIES.map((city, i) => (
              <BlurFade key={city.name} delay={0.1 + i * 0.05}>
                <div className="rounded-xl bg-background border border-border p-4 text-center hover:border-sky/40 hover:shadow-sm transition-all">
                  <p className="text-xs font-medium text-muted-foreground truncate">{city.name}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {city.icon === "sun" && <Sun className="w-5 h-5 text-amber-400" />}
                    {city.icon === "cloud" && <Sun className="w-5 h-5 text-gray-400" />}
                    {city.icon === "wind" && <Wind className="w-5 h-5 text-sky" />}
                    <span className="text-2xl font-bold">{city.temp}°</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Wind className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{city.wind} km/h</span>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid - Explore */}
      <section id="explore" className="max-w-7xl mx-auto px-4 py-16">
        <BlurFade delay={0.1}>
          <h2 className="text-3xl font-bold mb-2">Explore Crete</h2>
          <p className="text-muted-foreground mb-8">Everything you need, one tap away</p>
        </BlurFade>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BlurFade delay={0.15}>
            <a href="/beaches" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky/10 to-sky/5 border border-sky/20 p-6 h-48 flex flex-col justify-end hover:border-sky/40 hover:shadow-lg transition-all">
              <Waves className="absolute top-4 right-4 w-8 h-8 text-sky/30 group-hover:text-sky/60 transition-colors" />
              <span className="text-3xl font-bold">500+</span>
              <span className="text-sm font-medium text-muted-foreground">Beaches</span>
              <span className="text-xs text-sky mt-1 flex items-center gap-1">
                With live conditions <ChevronRight className="w-3 h-3" />
              </span>
            </a>
          </BlurFade>

          <BlurFade delay={0.2}>
            <a href="/events" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-terra/10 to-terra/5 border border-terra/20 p-6 h-48 flex flex-col justify-end hover:border-terra/40 hover:shadow-lg transition-all">
              <Calendar className="absolute top-4 right-4 w-8 h-8 text-terra/30 group-hover:text-terra/60 transition-colors" />
              <span className="text-3xl font-bold">This week</span>
              <span className="text-sm font-medium text-muted-foreground">Events</span>
              <span className="text-xs text-terra mt-1 flex items-center gap-1">
                Festivals, markets, concerts <ChevronRight className="w-3 h-3" />
              </span>
            </a>
          </BlurFade>

          <BlurFade delay={0.25}>
            <a href="/villages" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-6 h-48 flex flex-col justify-end hover:border-amber-500/40 hover:shadow-lg transition-all">
              <Mountain className="absolute top-4 right-4 w-8 h-8 text-amber-500/30 group-hover:text-amber-500/60 transition-colors" />
              <span className="text-3xl font-bold">300+</span>
              <span className="text-sm font-medium text-muted-foreground">Villages</span>
              <span className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                Minoan to Ottoman <ChevronRight className="w-3 h-3" />
              </span>
            </a>
          </BlurFade>

          <BlurFade delay={0.3}>
            <a href="/hikes" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-6 h-48 flex flex-col justify-end hover:border-emerald-500/40 hover:shadow-lg transition-all">
              <Palmtree className="absolute top-4 right-4 w-8 h-8 text-emerald-500/30 group-hover:text-emerald-500/60 transition-colors" />
              <span className="text-3xl font-bold">80+</span>
              <span className="text-sm font-medium text-muted-foreground">Hiking trails</span>
              <span className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                Gorges, coastal paths <ChevronRight className="w-3 h-3" />
              </span>
            </a>
          </BlurFade>
        </div>

        {/* Secondary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <BlurFade delay={0.35}>
            <a href="/food" className="group rounded-2xl bg-card border border-border p-6 flex items-center gap-4 hover:border-terra/30 hover:shadow-sm transition-all">
              <UtensilsCrossed className="w-10 h-10 text-terra/60" />
              <div>
                <span className="font-semibold">Restaurants & tavernas</span>
                <p className="text-xs text-muted-foreground mt-0.5">Local favorites, not tourist traps</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </a>
          </BlurFade>

          <BlurFade delay={0.4}>
            <a href="/news" className="group rounded-2xl bg-card border border-border p-6 flex items-center gap-4 hover:border-sky/30 hover:shadow-sm transition-all">
              <Newspaper className="w-10 h-10 text-sky/60" />
              <div>
                <span className="font-semibold">Crete news</span>
                <p className="text-xs text-muted-foreground mt-0.5">Updated every 3 hours, 4 languages</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </a>
          </BlurFade>

          <BlurFade delay={0.45}>
            <a href="/fire-alerts" className="group rounded-2xl bg-card border border-border p-6 flex items-center gap-4 hover:border-red-500/30 hover:shadow-sm transition-all">
              <MapPin className="w-10 h-10 text-red-500/60" />
              <div>
                <span className="font-semibold">Fire alerts</span>
                <p className="text-xs text-muted-foreground mt-0.5">Live Copernicus satellite data</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </a>
          </BlurFade>
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-gradient-to-r from-sky/5 via-terra/5 to-sky/5 border-y border-border">
        <div className="max-w-xl mx-auto text-center py-16 px-4">
          <BlurFade delay={0.1}>
            <h2 className="text-2xl font-bold">{t("newsletter")}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{t("newsletterCta")}</p>
            <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-sky/50"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-terra text-white rounded-lg font-semibold text-sm hover:bg-terra/90 transition-colors"
              >
                {t("subscribe")}
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">EN / FR / DE editions. Unsubscribe anytime.</p>
          </BlurFade>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-1 mb-3">
              <span className="text-lg font-bold tracking-tight">CRETE</span>
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky" />
              </span>
              <span className="text-lg font-bold tracking-tight text-sky">PULSE</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Free, independent guide to the island of Crete. Updated daily with live data.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-3">Explore</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/beaches" className="hover:text-foreground transition-colors">Beaches</a></li>
              <li><a href="/villages" className="hover:text-foreground transition-colors">Villages</a></li>
              <li><a href="/hikes" className="hover:text-foreground transition-colors">Hiking trails</a></li>
              <li><a href="/food" className="hover:text-foreground transition-colors">Restaurants</a></li>
              <li><a href="/events" className="hover:text-foreground transition-colors">Events</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-sm mb-3">Live data</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/weather" className="hover:text-foreground transition-colors">Weather & sea</a></li>
              <li><a href="/fire-alerts" className="hover:text-foreground transition-colors">Fire alerts</a></li>
              <li><a href="/news" className="hover:text-foreground transition-colors">News</a></li>
              <li><a href="/buses" className="hover:text-foreground transition-colors">Bus schedules</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-8 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <p>2026 Crete Pulse. Independent. Free. Open.</p>
          <a href="/privacy" className="hover:text-foreground">Privacy</a>
        </div>
      </footer>
    </main>
  );
}
