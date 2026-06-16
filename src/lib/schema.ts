import type { Beach, Event, NewsItem, FoodPlace, Village, Locale } from "./types";
import { getLocalizedField } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const CARDINAL_REGIONS = new Set(["central", "east", "west", "north", "south", "eastern", "western", "northern", "southern"]);

function formatRegionLabel(region: string | null | undefined): string {
  if (!region) return "Crete";
  const r = region.trim().toLowerCase();
  if (!r) return "Crete";
  const capitalized = r.charAt(0).toUpperCase() + r.slice(1);
  return CARDINAL_REGIONS.has(r) ? `${capitalized} Crete` : `${capitalized}, Crete`;
}

export function breadcrumbSchema(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function beachSchema(beach: Beach, locale: Locale): Record<string, unknown> {
  const name = getLocalizedField(beach, "name", locale);
  const description = getLocalizedField(beach, "description", locale);

  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name,
    description: description?.substring(0, 300) || undefined,
    url: `${BASE_URL}/${locale}/beaches/${beach.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: beach.latitude,
      longitude: beach.longitude,
    },
    address: {
      "@type": "PostalAddress",
      addressRegion: beach.region,
      addressCountry: "GR",
    },
    image: beach.image_url || undefined,
    amenityFeature: [
      beach.parking && { "@type": "LocationFeatureSpecification", name: "Parking", value: true },
      beach.sunbeds && { "@type": "LocationFeatureSpecification", name: "Sunbeds", value: true },
      beach.taverna && { "@type": "LocationFeatureSpecification", name: "Taverna", value: true },
      beach.snorkeling && { "@type": "LocationFeatureSpecification", name: "Snorkeling", value: true },
      beach.kids_friendly && { "@type": "LocationFeatureSpecification", name: "Child-friendly", value: true },
    ].filter(Boolean),
    touristType: "Beach",
  };
}

export function eventSchema(event: Event, locale: Locale): Record<string, unknown> {
  const name = getLocalizedField(event, "title", locale);
  const description = getLocalizedField(event, "description", locale);
  const url = `${BASE_URL}/${locale}/events/${event.slug}`;

  const startDate = event.time_start
    ? `${event.date_start}T${event.time_start}`
    : event.date_start;
  const endDate = event.date_end
    ? (event.time_start ? `${event.date_end}T${event.time_start}` : event.date_end)
    : startDate;

  const locationName = event.location_name?.trim() || formatRegionLabel(event.region);
  const image = `${BASE_URL}/api/og?type=event&title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(locationName)}`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description: description?.substring(0, 300) || undefined,
    url,
    startDate,
    endDate,
    image,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: locationName,
      address: {
        "@type": "PostalAddress",
        addressLocality: locationName,
        addressRegion: formatRegionLabel(event.region),
        addressCountry: "GR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Crete Direct",
      url: BASE_URL,
    },
    performer: {
      "@type": "PerformingGroup",
      name,
    },
    offers: {
      "@type": "Offer",
      url,
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      validFrom: event.date_start,
    },
  };

  if (event.latitude && event.longitude) {
    (schema.location as Record<string, unknown>).geo = {
      "@type": "GeoCoordinates",
      latitude: event.latitude,
      longitude: event.longitude,
    };
  }

  return schema;
}

export function restaurantSchema(place: FoodPlace, locale: Locale): Record<string, unknown> {
  const description = getLocalizedField(place, "description", locale);

  const priceRangeMap: Record<string, string> = {
    budget: "$",
    mid: "$$",
    upscale: "$$$",
  };

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: place.name,
    description: description?.substring(0, 300) || undefined,
    url: `${BASE_URL}/${locale}/food/${place.slug}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: place.address || undefined,
      addressRegion: place.region,
      addressCountry: "GR",
    },
    servesCuisine: place.cuisine || undefined,
    priceRange: place.price_range ? priceRangeMap[place.price_range] : undefined,
    image: place.image_url || undefined,
  };

  if (place.latitude && place.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: place.latitude,
      longitude: place.longitude,
    };
  }

  return schema;
}

export function villageSchema(village: Village, locale: Locale): Record<string, unknown> {
  const name = getLocalizedField(village, "name", locale);
  const description = getLocalizedField(village, "description", locale);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    description: description?.substring(0, 300) || undefined,
    url: `${BASE_URL}/${locale}/villages/${village.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: village.latitude,
      longitude: village.longitude,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: name,
      addressRegion: village.region,
      addressCountry: "GR",
    },
    image: village.image_url || undefined,
    ...(typeof village.altitude_m === "number"
      ? { elevation: `${village.altitude_m} m` }
      : {}),
    ...(typeof village.population === "number"
      ? {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Population",
              value: village.population,
            },
          ],
        }
      : {}),
  };

  return schema;
}

export function itemListSchema(
  items: Array<{ url: string; name: string; image?: string | null }>,
  listName: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: it.url,
      name: it.name,
      ...(it.image ? { image: it.image } : {}),
    })),
  };
}

export function weatherPageSchema(params: {
  locale: string;
  city: { slug: string; name: string; nameEl: string; lat: number; lng: number };
  monthSlug: string;
  monthName: string;
  climate: {
    avgHigh: number;
    avgLow: number;
    seaTemp: number;
    rainyDays: number;
    sunHours: number;
    uvIndex: number;
  };
  pageTitle: string;
  description: string;
  faqItems: Array<{ q: string; a: string }>;
  breadcrumbLabels: { home: string; weather: string };
}): Record<string, unknown> {
  const url = `${BASE_URL}/${params.locale}/weather/${params.city.slug}/${params.monthSlug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: params.pageTitle,
        description: params.description,
        inLanguage: params.locale,
        isPartOf: {
          "@type": "WebSite",
          name: "Crete Direct",
          url: BASE_URL,
        },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        about: { "@id": `${url}#place` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: params.breadcrumbLabels.home,
            item: `${BASE_URL}/${params.locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: params.breadcrumbLabels.weather,
            item: `${BASE_URL}/${params.locale}/weather`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `${params.city.name} - ${params.monthName}`,
            item: url,
          },
        ],
      },
      {
        "@type": "Place",
        "@id": `${url}#place`,
        name: params.city.name,
        alternateName: params.city.nameEl,
        url: `${BASE_URL}/${params.locale}/things-to-do/${params.city.slug}`,
        geo: {
          "@type": "GeoCoordinates",
          latitude: params.city.lat,
          longitude: params.city.lng,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: params.city.name,
          addressRegion: "Crete",
          addressCountry: "GR",
        },
        additionalProperty: [
          { "@type": "PropertyValue", name: `Average high in ${params.monthName} (°C)`, value: params.climate.avgHigh },
          { "@type": "PropertyValue", name: `Average low in ${params.monthName} (°C)`, value: params.climate.avgLow },
          { "@type": "PropertyValue", name: `Sea temperature in ${params.monthName} (°C)`, value: params.climate.seaTemp },
          { "@type": "PropertyValue", name: `Rainy days in ${params.monthName}`, value: params.climate.rainyDays },
          { "@type": "PropertyValue", name: `Daily sunshine in ${params.monthName} (h)`, value: params.climate.sunHours },
          { "@type": "PropertyValue", name: `UV index in ${params.monthName}`, value: params.climate.uvIndex },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: params.locale,
        mainEntity: params.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export function cityThingsToDoSchema(params: {
  locale: string;
  city: { slug: string; name: string; nameEl: string; lat: number; lng: number };
  description: string;
  pageTitle: string;
  highlights: string[];
  faqItems: Array<{ q: string; a: string }>;
  breadcrumbLabels: { home: string; thingsToDo: string };
}): Record<string, unknown> {
  const url = `${BASE_URL}/${params.locale}/things-to-do/${params.city.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: params.pageTitle,
        description: params.description,
        inLanguage: params.locale,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        about: { "@id": `${url}#place` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: params.breadcrumbLabels.home, item: `${BASE_URL}/${params.locale}` },
          { "@type": "ListItem", position: 2, name: params.breadcrumbLabels.thingsToDo, item: `${BASE_URL}/${params.locale}/things-to-do` },
          { "@type": "ListItem", position: 3, name: params.city.name, item: url },
        ],
      },
      {
        "@type": "TouristDestination",
        "@id": `${url}#place`,
        name: params.city.name,
        alternateName: params.city.nameEl,
        description: params.description,
        url,
        geo: {
          "@type": "GeoCoordinates",
          latitude: params.city.lat,
          longitude: params.city.lng,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: params.city.name,
          addressRegion: "Crete",
          addressCountry: "GR",
        },
        includesAttraction: params.highlights.map((h) => ({
          "@type": "TouristAttraction",
          name: h,
          touristType: "Sightseer",
        })),
      },
      {
        "@type": "ItemList",
        "@id": `${url}#highlights`,
        name: `Top highlights in ${params.city.name}`,
        numberOfItems: params.highlights.length,
        itemListElement: params.highlights.map((h, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: { "@type": "TouristAttraction", name: h },
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: params.locale,
        mainEntity: params.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export function compareSchema(params: {
  locale: string;
  slug: string;
  a: string;
  b: string;
  pageTitle: string;
  description: string;
  categories: Array<{ label: string; a: string; b: string; winner?: "a" | "b" | "tie" }>;
  verdictA: string;
  verdictB: string;
  faqItems: Array<{ q: string; a: string }>;
  breadcrumbLabels: { home: string; compare: string };
}): Record<string, unknown> {
  const url = `${BASE_URL}/${params.locale}/compare/${params.slug}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: params.pageTitle,
        description: params.description,
        inLanguage: params.locale,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: params.breadcrumbLabels.home, item: `${BASE_URL}/${params.locale}` },
          { "@type": "ListItem", position: 2, name: params.breadcrumbLabels.compare, item: `${BASE_URL}/${params.locale}/compare` },
          { "@type": "ListItem", position: 3, name: `${params.a} vs ${params.b}`, item: url },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${url}#comparison`,
        name: `${params.a} vs ${params.b} comparison`,
        numberOfItems: 2,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            item: {
              "@type": "Place",
              name: params.a,
              description: params.verdictA,
              additionalProperty: params.categories.map((c) => ({
                "@type": "PropertyValue",
                name: c.label,
                value: c.a,
              })),
            },
          },
          {
            "@type": "ListItem",
            position: 2,
            item: {
              "@type": "Place",
              name: params.b,
              description: params.verdictB,
              additionalProperty: params.categories.map((c) => ({
                "@type": "PropertyValue",
                name: c.label,
                value: c.b,
              })),
            },
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: params.locale,
        mainEntity: params.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export function newsSchema(news: NewsItem, locale: Locale): Record<string, unknown> {
  const headline = getLocalizedField(news, "title", locale);
  const description = getLocalizedField(news, "summary", locale);
  const url = `${BASE_URL}/${locale}/news/${news.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    description: description?.substring(0, 300) || undefined,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished: news.published_at,
    dateModified: news.published_at,
    articleSection: news.category || "News",
    image: news.image_url
      ? { "@type": "ImageObject", url: news.image_url, width: 1200, height: 630 }
      : undefined,
    author: {
      "@type": "Organization",
      name: "Crete Direct",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Crete Direct",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icon.svg`,
      },
    },
    isBasedOn: {
      "@type": "CreativeWork",
      url: news.source_url,
      name: news.source_name,
    },
    inLanguage: locale,
  };
}

export function nearMePageSchema(params: {
  locale: string;
  pageTitle: string;
  description: string;
  faqItems: Array<{ q: string; a: string }>;
  breadcrumbLabels: { home: string; nearMe: string };
}): Record<string, unknown> {
  const url = `${BASE_URL}/${params.locale}/near-me`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: params.pageTitle,
        description: params.description,
        inLanguage: params.locale,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: params.breadcrumbLabels.home, item: `${BASE_URL}/${params.locale}` },
          { "@type": "ListItem", position: 2, name: params.breadcrumbLabels.nearMe, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: params.locale,
        mainEntity: params.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export function busesPageSchema(params: {
  locale: string;
  pageTitle: string;
  description: string;
  routes: Array<{ from: string; to: string; slug?: string }>;
  dateModified: string | null;
  faqItems: Array<{ q: string; a: string }>;
  breadcrumbLabels: { home: string; buses: string };
}): Record<string, unknown> {
  const url = `${BASE_URL}/${params.locale}/buses`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: params.pageTitle,
        description: params.description,
        inLanguage: params.locale,
        ...(params.dateModified ? { dateModified: params.dateModified } : {}),
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: params.breadcrumbLabels.home, item: `${BASE_URL}/${params.locale}` },
          { "@type": "ListItem", position: 2, name: params.breadcrumbLabels.buses, item: url },
        ],
      },
      {
        "@type": "ItemList",
        "@id": `${url}#routes`,
        numberOfItems: params.routes.length,
        itemListElement: params.routes.map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${r.from} to ${r.to} by bus`,
          ...(r.slug ? { url: `${BASE_URL}/${params.locale}/buses/${r.slug}` } : {}),
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: params.locale,
        mainEntity: params.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

export function carRentalPageSchema(params: {
  locale: string;
  pageTitle: string;
  description: string;
  faqItems: Array<{ q: string; a: string }>;
  breadcrumbLabels: { home: string; carRental: string };
}): Record<string, unknown> {
  const url = `${BASE_URL}/${params.locale}/car-rental`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: params.pageTitle,
        description: params.description,
        inLanguage: params.locale,
        isPartOf: { "@type": "WebSite", name: "Crete Direct", url: BASE_URL },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: { "@id": `${url}#faq` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: params.breadcrumbLabels.home, item: `${BASE_URL}/${params.locale}` },
          { "@type": "ListItem", position: 2, name: params.breadcrumbLabels.carRental, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        inLanguage: params.locale,
        mainEntity: params.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "Service",
        "@id": `${url}#service`,
        name: params.pageTitle,
        description: params.description,
        serviceType: "Car rental",
        inLanguage: params.locale,
        provider: { "@type": "Organization", name: "Crete Direct", url: BASE_URL },
        areaServed: { "@type": "Place", name: "Crete, Greece" },
        url,
      },
    ],
  };
}
