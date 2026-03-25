import { getTranslations } from "next-intl/server";
import { getEventBySlug } from "@/lib/events";
import { getLocalizedField, type Locale } from "@/lib/types";
import { localizeLocation } from "@/lib/localize-location";
import { eventSchema, breadcrumbSchema } from "@/lib/schema";
import { MapPin, Clock, Calendar, Tag, ExternalLink, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const L: Record<string, Record<string, string>> = {
  en: { until: "Until", date: "Date", time: "Time", location: "Location", allDay: "All day", allEvents: "All events", maps: "Open in Google Maps", official: "Official page", save: "Save this event and check back closer to the date for updates." },
  fr: { until: "Jusqu'au", date: "Date", time: "Horaire", location: "Lieu", allDay: "Toute la journee", allEvents: "Tous les evenements", maps: "Ouvrir dans Google Maps", official: "Page officielle", save: "Enregistrez cet evenement et revenez a l'approche de la date." },
  de: { until: "Bis", date: "Datum", time: "Uhrzeit", location: "Ort", allDay: "Ganztags", allEvents: "Alle Events", maps: "In Google Maps offnen", official: "Offizielle Seite", save: "Speichern Sie dieses Event und prufen Sie naher am Datum nach Updates." },
  el: { until: "\u0388\u03c9\u03c2", date: "\u0397\u03bc\u03b5\u03c1\u03bf\u03bc\u03b7\u03bd\u03af\u03b1", time: "\u038f\u03c1\u03b1", location: "\u03a4\u03bf\u03c0\u03bf\u03b8\u03b5\u03c3\u03af\u03b1", allDay: "\u038c\u03bb\u03b7 \u03bc\u03ad\u03c1\u03b1", allEvents: "\u038c\u03bb\u03b5\u03c2 \u03bf\u03b9 \u03b5\u03ba\u03b4\u03b7\u03bb\u03ce\u03c3\u03b5\u03b9\u03c2", maps: "\u0386\u03bd\u03bf\u03b9\u03b3\u03bc\u03b1 \u03c3\u03c4\u03bf Google Maps", official: "\u0395\u03c0\u03af\u03c3\u03b7\u03bc\u03b7 \u03c3\u03b5\u03bb\u03af\u03b4\u03b1", save: "\u0391\u03c0\u03bf\u03b8\u03b7\u03ba\u03b5\u03cd\u03c3\u03c4\u03b5 \u03b1\u03c5\u03c4\u03ae \u03c4\u03b7\u03bd \u03b5\u03ba\u03b4\u03ae\u03bb\u03c9\u03c3\u03b7." },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Event not found" };

  const eventTitle = getLocalizedField(event, "title", locale as Locale);
  const desc = getLocalizedField(event, "description", locale as Locale);
  const title = `${eventTitle} - Crete Events | Crete Direct`;
  const description = desc?.substring(0, 160) || `${eventTitle} in Crete. Location: ${event.location_name}.`;
  const url = `${BASE_URL}/${locale}/events/${slug}`;

  // Noindex expired events (end date is in the past)
  const endDate = event.date_end || event.date_start;
  const isExpired = new Date(endDate) < new Date();

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: isExpired ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  festival: "bg-terra-faint text-terra border-terra/20",
  market: "bg-sand text-text border-sand-warm",
  concert: "bg-aegean-faint text-aegean border-aegean/20",
  religious: "bg-stone text-text-muted border-border",
  sport: "bg-olive/10 text-olive border-olive/20",
  cultural: "bg-aegean-faint text-aegean border-aegean/20",
  food: "bg-terra-faint text-terra border-terra/20",
};

function formatDate(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  const lang = locale === "el" ? "el-GR" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : "en-GB";
  return date.toLocaleDateString(lang, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const title = getLocalizedField(event, "title", loc);
  const description = getLocalizedField(event, "description", loc);

  const jsonLd = eventSchema(event, loc);
  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: loc === "fr" ? "Événements" : loc === "de" ? "Events" : loc === "el" ? "Εκδηλώσεις" : "Events", url: `${BASE_URL}/${locale}/events` },
    { name: title, url: `${BASE_URL}/${locale}/events/${event.slug}` },
  ]);

  const l = L[locale] || L.en;
  const isMultiDay = event.date_end && event.date_end !== event.date_start;
  const mapsUrl = event.latitude && event.longitude
    ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(event.location_name + " Crete")}`;

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* Header band */}
      <div className="bg-aegean text-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          {event.category && (
            <span className={`inline-block text-xs px-3 py-1 rounded-full border capitalize mb-4 ${CATEGORY_COLORS[event.category] || "bg-stone text-text-muted border-border"}`}>
              <Tag className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              {event.category}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">{title}</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-white/80 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(event.date_start, locale)}
            </span>
            {isMultiDay && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {l.until} {formatDate(event.date_end!, locale)}
              </span>
            )}
            {event.time_start && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {event.time_start.slice(0, 5)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/events`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-8"
        >
          <ChevronLeft className="w-4 h-4" /> {l.allEvents}
        </Link>

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-border p-4">
            <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
              <Calendar className="w-4 h-4" /> {l.date}
            </div>
            <p className="font-semibold text-sm">{formatDate(event.date_start, locale)}</p>
            {isMultiDay && (
              <p className="text-xs text-text-muted mt-0.5">{l.until} {formatDate(event.date_end!, locale)}</p>
            )}
          </div>

          <div className="rounded-lg bg-white border border-border p-4">
            <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
              <Clock className="w-4 h-4" /> {l.time}
            </div>
            <p className="font-semibold text-sm">
              {event.time_start ? event.time_start.slice(0, 5) : l.allDay}
            </p>
          </div>

          <div className="rounded-lg bg-white border border-border p-4">
            <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
              <MapPin className="w-4 h-4" /> {l.location}
            </div>
            <p className="font-semibold text-sm">{localizeLocation(event.location_name, locale)}</p>
            {event.region && (
              <p className="text-xs text-text-muted mt-0.5 capitalize">{event.region}</p>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="prose prose-sm max-w-none mb-8">
            <p className="text-text leading-relaxed">{description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-12">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-aegean text-white rounded-lg text-sm font-medium hover:bg-aegean-light transition-colors"
          >
            <MapPin className="w-4 h-4" /> {l.maps}
          </a>
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border text-text rounded-lg text-sm font-medium hover:border-aegean/40 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> {l.official}
            </a>
          )}
        </div>

        {/* Add to calendar hint */}
        <div className="rounded-xl bg-stone p-4 text-sm text-text-muted">
          <Calendar className="w-4 h-4 inline-block mr-2 -mt-0.5 text-aegean" />
          {l.save}
        </div>
      </div>
    </main>
  );
}
