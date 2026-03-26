import { getBeachBySlug, getNearbyBeaches } from "@/lib/beaches";
import { getLocalizedField, type Locale } from "@/lib/types";
import { beachSchema, breadcrumbSchema } from "@/lib/schema";
import { MapPin, Car, Waves, Fish, Sun, Wind, Baby, UtensilsCrossed, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateCTA } from "@/components/ui/affiliate-cta";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const BEACH_LABELS: Record<Locale, {
  allBeaches: string;
  type: string;
  windExposure: string;
  parking: string;
  kids: string;
  yes: string;
  no: string;
  kidsFriendly: string;
  kidsNotIdeal: string;
  mixed: string;
  moderate: string;
  sunbeds: string;
  taverna: string;
  snorkeling: string;
  openInMaps: string;
  nearbyBeaches: string;
  photo: string;
  crete: string;
}> = {
  en: {
    allBeaches: "All beaches",
    type: "Type",
    windExposure: "Wind exposure",
    parking: "Parking",
    kids: "Kids",
    yes: "Yes",
    no: "No",
    kidsFriendly: "Friendly",
    kidsNotIdeal: "Not ideal",
    mixed: "Mixed",
    moderate: "Moderate",
    sunbeds: "Sunbeds",
    taverna: "Taverna",
    snorkeling: "Snorkeling",
    openInMaps: "Open in Google Maps",
    nearbyBeaches: "Nearby beaches",
    photo: "Photo",
    crete: "Crete",
  },
  fr: {
    allBeaches: "Toutes les plages",
    type: "Type",
    windExposure: "Exposition au vent",
    parking: "Parking",
    kids: "Enfants",
    yes: "Oui",
    no: "Non",
    kidsFriendly: "Adapté",
    kidsNotIdeal: "Déconseillé",
    mixed: "Mixte",
    moderate: "Modéré",
    sunbeds: "Transats",
    taverna: "Taverne",
    snorkeling: "Snorkeling",
    openInMaps: "Ouvrir dans Google Maps",
    nearbyBeaches: "Plages à proximité",
    photo: "Photo",
    crete: "Crète",
  },
  de: {
    allBeaches: "Alle Strände",
    type: "Typ",
    windExposure: "Windexposition",
    parking: "Parkplatz",
    kids: "Kinder",
    yes: "Ja",
    no: "Nein",
    kidsFriendly: "Geeignet",
    kidsNotIdeal: "Nicht ideal",
    mixed: "Gemischt",
    moderate: "Moderat",
    sunbeds: "Liegestühle",
    taverna: "Taverne",
    snorkeling: "Schnorcheln",
    openInMaps: "In Google Maps öffnen",
    nearbyBeaches: "Strände in der Nähe",
    photo: "Foto",
    crete: "Kreta",
  },
  el: {
    allBeaches: "Όλες οι παραλίες",
    type: "Τύπος",
    windExposure: "Έκθεση στον άνεμο",
    parking: "Πάρκινγκ",
    kids: "Παιδιά",
    yes: "Ναι",
    no: "Όχι",
    kidsFriendly: "Κατάλληλο",
    kidsNotIdeal: "Μη ιδανικό",
    mixed: "Μικτό",
    moderate: "Μέτριο",
    sunbeds: "Ξαπλώστρες",
    taverna: "Ταβέρνα",
    snorkeling: "Snorkeling",
    openInMaps: "Άνοιγμα στο Google Maps",
    nearbyBeaches: "Κοντινές παραλίες",
    photo: "Φωτογραφία",
    crete: "Κρήτη",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const beach = await getBeachBySlug(slug);
  if (!beach) return { title: "Beach not found" };

  const name = getLocalizedField(beach, "name", locale as Locale);
  const desc = getLocalizedField(beach, "description", locale as Locale);
  const title = `${name} Beach, Crete - Conditions & Info | Crete Direct`;
  const description = desc?.substring(0, 160) || `${name} beach in Crete, Greece. Water type, parking, snorkeling, kids conditions and nearby beaches.`;
  const url = `${BASE_URL}/${locale}/beaches/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: beach.image_url ? [{ url: beach.image_url, alt: `${name} beach, Crete` }] : [],
    },
  };
}

export default async function BeachDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = locale as Locale;
  const L = BEACH_LABELS[loc];

  const beach = await getBeachBySlug(slug);
  if (!beach) notFound();

  const nearby = await getNearbyBeaches(beach.latitude, beach.longitude, beach.slug);
  const name = getLocalizedField(beach, "name", loc);
  const description = getLocalizedField(beach, "description", loc);

  const jsonLd = beachSchema(beach, loc);
  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: loc === "fr" ? "Plages" : loc === "de" ? "Strände" : loc === "el" ? "Παραλίες" : "Beaches", url: `${BASE_URL}/${locale}/beaches` },
    { name, url: `${BASE_URL}/${locale}/beaches/${beach.slug}` },
  ]);

  // FAQ structured data
  const faqItems = [
    {
      q: loc === "fr" ? `${name} est-elle une plage de sable ?` : loc === "de" ? `Ist ${name} ein Sandstrand?` : loc === "el" ? `Είναι η ${name} αμμώδης παραλία;` : `Is ${name} a sandy beach?`,
      a: loc === "fr" ? `${name} est une plage de type ${beach.type || "mixte"} située dans la région ${beach.region} de la Crète.` : loc === "de" ? `${name} ist ein ${beach.type || "gemischter"} Strand in der Region ${beach.region} auf Kreta.` : loc === "el" ? `Η ${name} είναι παραλία τύπου ${beach.type || "μικτή"} στην περιοχή ${beach.region} της Κρήτης.` : `${name} is a ${beach.type || "mixed"} beach located in the ${beach.region} region of Crete.`,
    },
    {
      q: loc === "fr" ? `${name} est-elle adaptée aux enfants ?` : loc === "de" ? `Ist ${name} kinderfreundlich?` : loc === "el" ? `Είναι η ${name} κατάλληλη για παιδιά;` : `Is ${name} suitable for children?`,
      a: beach.kids_friendly
        ? (loc === "fr" ? `Oui, ${name} est adaptée aux familles avec enfants.` : loc === "de" ? `Ja, ${name} ist kinderfreundlich.` : loc === "el" ? `Ναι, η ${name} είναι κατάλληλη για παιδιά.` : `Yes, ${name} is family-friendly and suitable for children.`)
        : (loc === "fr" ? `${name} n'est pas idéale pour les enfants en raison des conditions.` : loc === "de" ? `${name} ist aufgrund der Bedingungen nicht ideal für Kinder.` : loc === "el" ? `Η ${name} δεν είναι ιδανική για παιδιά.` : `${name} is not ideal for children due to conditions.`),
    },
    {
      q: loc === "fr" ? `Y a-t-il un parking à ${name} ?` : loc === "de" ? `Gibt es einen Parkplatz bei ${name}?` : loc === "el" ? `Υπάρχει πάρκινγκ στην ${name};` : `Is there parking at ${name}?`,
      a: beach.parking
        ? (loc === "fr" ? `Oui, ${name} dispose d'un parking.` : loc === "de" ? `Ja, ${name} hat einen Parkplatz.` : loc === "el" ? `Ναι, η ${name} διαθέτει πάρκινγκ.` : `Yes, ${name} has parking available.`)
        : (loc === "fr" ? `Non, ${name} n'a pas de parking dédié.` : loc === "de" ? `Nein, ${name} hat keinen Parkplatz.` : loc === "el" ? `Όχι, η ${name} δεν έχει πάρκινγκ.` : `No, ${name} does not have dedicated parking.`),
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Hero image */}
      {beach.image_url && (
        <div className="relative h-72 md:h-96 bg-aegean">
          <Image
            src={beach.image_url}
            alt={`${name} beach, Crete`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-6 left-4 right-4 md:left-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>{name}</h1>
            <div className="flex items-center gap-2 text-white/75 text-sm mt-2">
              <MapPin className="w-4 h-4" />
              {beach.region} {L.crete}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/beaches`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {L.allBeaches}
        </Link>

        {!beach.image_url && (
          <h1 className="text-3xl font-bold text-aegean mb-2">{name}</h1>
        )}

        {/* Attributes grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Waves className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.type}</p>
            <p className="font-semibold text-sm capitalize">{beach.type || L.mixed}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Wind className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.windExposure}</p>
            <p className="font-semibold text-sm capitalize">{beach.wind_exposure || L.moderate}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Car className="w-5 h-5 text-aegean mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.parking}</p>
            <p className="font-semibold text-sm">{beach.parking ? L.yes : L.no}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Baby className="w-5 h-5 text-terra mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.kids}</p>
            <p className="font-semibold text-sm">{beach.kids_friendly ? L.kidsFriendly : L.kidsNotIdeal}</p>
          </div>
        </div>

        {/* Facilities */}
        <div className="flex flex-wrap gap-2 mb-8">
          {beach.sunbeds && (
            <span className="inline-flex items-center gap-1 text-sm bg-stone px-3 py-1 rounded-full">
              <Sun className="w-4 h-4 text-amber-500" /> {L.sunbeds}
            </span>
          )}
          {beach.taverna && (
            <span className="inline-flex items-center gap-1 text-sm bg-stone px-3 py-1 rounded-full">
              <UtensilsCrossed className="w-4 h-4 text-terra" /> {L.taverna}
            </span>
          )}
          {beach.snorkeling && (
            <span className="inline-flex items-center gap-1 text-sm bg-stone px-3 py-1 rounded-full">
              <Fish className="w-4 h-4 text-aegean" /> {L.snorkeling}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <div className="prose prose-sm max-w-none mb-8">
            <p className="text-text leading-relaxed">{description}</p>
          </div>
        )}

        {/* Map link */}
        <a
          href={`https://www.google.com/maps?q=${beach.latitude},${beach.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-aegean text-white rounded-lg text-sm font-medium hover:bg-aegean-light transition-colors mb-12"
        >
          <MapPin className="w-4 h-4" /> {L.openInMaps}
        </a>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-aegean mb-4">FAQ</h2>
          <div className="space-y-3">
            {faqItems.map((faq, i) => (
              <div key={i} className="p-4 bg-white rounded-xl border border-border">
                <h3 className="font-semibold text-sm text-text mb-1">{faq.q}</h3>
                <p className="text-sm text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Property management CTA */}
        <div className="mb-12">
          <AffiliateCTA type="propertyManagement" locale={locale} />
        </div>

        {/* Nearby beaches */}
        {nearby.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-aegean mb-4">{L.nearbyBeaches}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {nearby.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${locale}/beaches/${b.slug}`}
                  className="rounded-xl border border-border bg-white p-3 hover:border-aegean/30 transition-all"
                >
                  <p className="font-semibold text-sm">{getLocalizedField(b, "name", loc)}</p>
                  <p className="text-xs text-text-muted capitalize">{b.type} - {b.region}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Image credit */}
        {beach.image_credit && (
          <p className="text-[10px] text-text-light mt-8">{L.photo}: {beach.image_credit}</p>
        )}
      </div>
    </main>
  );
}
