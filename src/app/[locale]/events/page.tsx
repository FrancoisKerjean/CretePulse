import { getUpcomingEvents, groupEventsByWeek } from "@/lib/events";
import { getLocalizedField, type Locale } from "@/lib/types";
import { localizeLocation } from "@/lib/localize-location";
import { Calendar, MapPin, Clock } from "lucide-react";
import Link from "next/link";

const EVENTS_LABELS: Record<Locale, {
  subtitle: string;
  until: string;
  event: string;
  events: string;
  coming: string;
}> = {
  en: { subtitle: "upcoming events — festivals, markets, concerts, panigýria", until: "Until", event: "event", events: "events", coming: "Upcoming events coming soon." },
  fr: { subtitle: "événements à venir — festivals, marchés, concerts, panigýria", until: "Jusqu'au", event: "événement", events: "événements", coming: "Événements à venir bientôt." },
  de: { subtitle: "bevorstehende Events — Festivals, Märkte, Konzerte, Panigýria", until: "Bis", event: "Event", events: "Events", coming: "Bevorstehende Events demnächst." },
  el: { subtitle: "επερχόμενες εκδηλώσεις — φεστιβάλ, αγορές, συναυλίες, πανηγύρια", until: "Έως", event: "εκδήλωση", events: "εκδηλώσεις", coming: "Επερχόμενες εκδηλώσεις σύντομα." },
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const EVENTS_META: Record<string, { title: string; desc: string }> = {
  en: { title: "Events in Crete - Festivals, Markets & Concerts | Crete Direct", desc: "Upcoming events in Crete: festivals, village markets, concerts, religious panigýria and cultural gatherings. Browse by week across all regions." },
  fr: { title: "Événements en Crète - Festivals, Marchés & Concerts | Crete Direct", desc: "Événements à venir en Crète : festivals, marchés de villages, concerts, panigýria religieux et rassemblements culturels. Par semaine." },
  de: { title: "Veranstaltungen auf Kreta - Festivals, Märkte & Konzerte | Crete Direct", desc: "Kommende Events auf Kreta: Festivals, Dorfmärkte, Konzerte, religiöse Panigýria. Nach Woche durchsuchen." },
  el: { title: "Εκδηλώσεις στην Κρήτη - Φεστιβάλ, Αγορές & Συναυλίες | Crete Direct", desc: "Επερχόμενες εκδηλώσεις στην Κρήτη: φεστιβάλ, αγορές χωριών, συναυλίες, πανηγύρια. Ανά εβδομάδα." },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = EVENTS_META[locale] || EVENTS_META.en;
  const url = `${BASE_URL}/${locale}/events`;
  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  festival: "bg-terra-faint text-terra",
  market: "bg-sand text-text",
  concert: "bg-aegean-faint text-aegean",
  religious: "bg-stone text-text-muted",
  sport: "bg-olive/10 text-olive",
  cultural: "bg-aegean-faint text-aegean",
  food: "bg-terra-faint text-terra",
};

function formatWeekLabel(mondayStr: string, locale: string): string {
  const monday = new Date(mondayStr);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const lang = locale === "el" ? "el-GR" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-GB";

  return `${monday.toLocaleDateString(lang, opts)} – ${sunday.toLocaleDateString(lang, opts)}`;
}

function formatEventDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const lang = locale === "el" ? "el-GR" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-GB";
  return date.toLocaleDateString(lang, { weekday: "short", month: "long", day: "numeric" });
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  let events: Awaited<ReturnType<typeof getUpcomingEvents>> = [];
  try {
    events = await getUpcomingEvents();
  } catch {
    events = [];
  }

  if (events.length === 0) {
    return <EventsPlaceholder locale={loc} />;
  }

  const grouped = groupEventsByWeek(events);
  const weeks = Array.from(grouped.entries());

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">
          {loc === "fr" ? "Événements en Crète" :
           loc === "de" ? "Veranstaltungen auf Kreta" :
           loc === "el" ? "Εκδηλώσεις στην Κρήτη" :
           "Events in Crete"}
        </h1>
        <p className="text-text-muted mt-2">
          {events.length} {EVENTS_LABELS[loc].subtitle}
        </p>

        <div className="mt-8 space-y-10">
          {weeks.map(([mondayStr, weekEvents]) => (
            <section key={mondayStr}>
              {/* Week header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 bg-aegean text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  {formatWeekLabel(mondayStr, locale)}
                </div>
                <span className="text-xs text-text-muted">{weekEvents.length} {weekEvents.length !== 1 ? EVENTS_LABELS[loc].events : EVENTS_LABELS[loc].event}</span>
              </div>

              {/* Events list */}
              <div className="space-y-3">
                {weekEvents.map((event) => (
                  <Link
                    key={event.slug}
                    href={`/${locale}/events/${event.slug}`}
                    className="group flex gap-4 rounded-xl border border-border bg-white p-4 hover:border-aegean/30 hover:shadow-sm transition-all"
                  >
                    {/* Date column */}
                    <div className="shrink-0 w-14 text-center">
                      <div className="text-2xl font-bold text-aegean leading-none">
                        {new Date(event.date_start).getDate()}
                      </div>
                      <div className="text-xs text-text-muted uppercase mt-0.5">
                        {new Date(event.date_start).toLocaleDateString(
                          locale === "el" ? "el-GR" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-GB",
                          { month: "short" }
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-border shrink-0" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h2 className="font-semibold text-base group-hover:text-aegean transition-colors leading-tight">
                          {getLocalizedField(event, "title", loc)}
                        </h2>
                        {event.category && (
                          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[event.category] || "bg-stone text-text-muted"}`}>
                            {event.category}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {localizeLocation(event.location_name, locale)}
                        </span>
                        {event.time_start && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {event.time_start.slice(0, 5)}
                          </span>
                        )}
                        {event.date_end && event.date_end !== event.date_start && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {EVENTS_LABELS[loc].until} {formatEventDate(event.date_end, locale)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function EventsPlaceholder({ locale }: { locale: Locale }) {
  const titles: Record<Locale, string> = {
    en: "Events in Crete",
    fr: "Événements en Crète",
    de: "Veranstaltungen auf Kreta",
    el: "Εκδηλώσεις στην Κρήτη",
  };

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-aegean">{titles[locale]}</h1>
        <p className="text-text-muted mt-2">{EVENTS_LABELS[locale].coming}</p>
        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-4 animate-pulse flex gap-4">
              <div className="w-14 shrink-0">
                <div className="h-8 bg-stone rounded mb-1" />
                <div className="h-3 bg-stone rounded" />
              </div>
              <div className="flex-1">
                <div className="h-5 bg-stone rounded w-3/4 mb-2" />
                <div className="h-3 bg-stone rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
