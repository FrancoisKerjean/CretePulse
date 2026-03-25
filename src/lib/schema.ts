import type { Beach, Event, NewsItem, FoodPlace, Locale } from "./types";
import { getLocalizedField } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

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

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description: description?.substring(0, 300) || undefined,
    url: `${BASE_URL}/${locale}/events/${event.slug}`,
    startDate: event.time_start
      ? `${event.date_start}T${event.time_start}`
      : event.date_start,
    endDate: event.date_end || undefined,
    location: {
      "@type": "Place",
      name: event.location_name,
      address: {
        "@type": "PostalAddress",
        addressRegion: event.region || "Crete",
        addressCountry: "GR",
      },
    },
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: "Crete Direct",
      url: BASE_URL,
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

  if (place.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: place.rating,
      reviewCount: place.review_count || undefined,
      bestRating: 5,
    };
  }

  return schema;
}

export function newsSchema(news: NewsItem, locale: Locale): Record<string, unknown> {
  const headline = getLocalizedField(news, "title", locale);
  const description = getLocalizedField(news, "summary", locale);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline,
    description: description?.substring(0, 300) || undefined,
    url: `${BASE_URL}/${locale}/news/${news.slug}`,
    datePublished: news.published_at,
    image: news.image_url || undefined,
    publisher: {
      "@type": "Organization",
      name: "Crete Direct",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
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
