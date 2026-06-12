// Fiche detaillee d'un lieu cb_places. La page /explore garde son drawer
// compact ; pour avoir une vue complete (hero, description nettoyee, CTAs,
// URL partageable, SEO), on ouvre cette page via "Voir la fiche".

import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft, Star, MapPin } from "lucide-react";
import { getCbPlaceBySlug } from "@/lib/cb-places";
import { typeLabel } from "@/lib/cb-type-labels";
import { cleanCbDescription } from "@/lib/cb-place-helpers";
import { CbPlaceActions } from "@/components/explore/CbPlaceActions";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 86400;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const T: Record<string, Record<string, string>> = {
  en: {
    backToMap: "Back to map",
    nearby: "Nearby",
    facilities: "Facilities",
    access: "Access",
    sand: "Sand type",
    water: "Water color",
    depth: "Depth",
    seaSurface: "Sea surface",
    crowds: "Crowds",
    photo: "Photo",
    moreSource: "More info on source",
  },
  fr: {
    backToMap: "Retour à la carte",
    nearby: "À proximité",
    facilities: "Équipements",
    access: "Accès",
    sand: "Type de sable",
    water: "Couleur de l'eau",
    depth: "Profondeur",
    seaSurface: "État de la mer",
    crowds: "Affluence",
    photo: "Photo",
    moreSource: "Plus d'infos sur la source",
  },
  de: {
    backToMap: "Zurück zur Karte",
    nearby: "In der Nähe",
    facilities: "Ausstattung",
    access: "Zugang",
    sand: "Sandtyp",
    water: "Wasserfarbe",
    depth: "Tiefe",
    seaSurface: "Meeresoberfläche",
    crowds: "Andrang",
    photo: "Foto",
    moreSource: "Mehr Infos auf der Quelle",
  },
  el: {
    backToMap: "Πίσω στον χάρτη",
    nearby: "Κοντά",
    facilities: "Παροχές",
    access: "Πρόσβαση",
    sand: "Τύπος άμμου",
    water: "Χρώμα νερού",
    depth: "Βάθος",
    seaSurface: "Επιφάνεια",
    crowds: "Κόσμος",
    photo: "Φωτογραφία",
    moreSource: "Περισσότερα στην πηγή",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const place = await getCbPlaceBySlug(slug);
  if (!place) return { title: "Place not found" };
  const type = typeLabel(place.place_type, locale);
  const title = `${place.name} — ${type} · Crete Direct`;
  const description =
    place.meta_description ||
    (place.description ? place.description.slice(0, 160) : `${place.name}, ${type}, Crete.`);
  const url = `${BASE_URL}/${locale}/explore/${place.slug}`;
  const ogImage = place.photos?.[0];
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/explore/${slug}`),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: place.name }] : [],
    },
  };
}

export async function generateStaticParams() {
  // Pas de pre-rendu massif (24K pages) : on laisse l'ISR generer a la demande.
  return [];
}

export default async function CbPlaceFichePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = T[locale] ?? T.en;

  const place = await getCbPlaceBySlug(slug);
  if (!place) notFound();

  const { paragraphs, nearby } = cleanCbDescription(place.description);
  const photos = place.photos ?? [];
  const hero = photos[0];

  const attrs: Array<[string, string | null]> = [
    [t.sand, place.sand_type],
    [t.water, place.water_color],
    [t.depth, place.depth],
    [t.seaSurface, place.sea_surface],
    [t.crowds, place.crowds],
    [t.access, place.accessibility],
  ];

  return (
    <main className="min-h-screen bg-surface">
      {/* Hero */}
      {hero ? (
        <div className="relative h-64 md:h-96 bg-aegean">
          <Image
            src={hero}
            alt={place.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-5 left-4 right-4 md:left-8">
            <p className="text-white/85 text-xs uppercase tracking-wide mb-1">
              {typeLabel(place.place_type, locale)}
              {place.prefecture ? ` · ${place.prefecture}` : ""}
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight"
                style={{ fontFamily: "var(--font-heading, 'Comfortaa', system-ui, sans-serif)" }}>
              {place.name}
            </h1>
            {place.rating != null && place.rating > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-white mt-2 bg-black/35 rounded-full px-3 py-1">
                <Star size={14} fill="currentColor" /> {place.rating.toFixed(1)}/5
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-aegean-faint px-4 py-8">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {typeLabel(place.place_type, locale)}
            {place.prefecture ? ` · ${place.prefecture}` : ""}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-aegean mt-1">{place.name}</h1>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Back to map */}
        <Link
          href={`/${locale}/explore?place=${place.slug}`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-5"
        >
          <ChevronLeft className="w-4 h-4" /> {t.backToMap}
        </Link>

        {/* CTAs sticky-ish en haut */}
        <CbPlaceActions
          slug={place.slug}
          name={place.name}
          latitude={place.latitude}
          longitude={place.longitude}
          locale={locale}
          showSheetLink={false}
        />

        {/* Attributs */}
        {(attrs.some(([, v]) => v) || place.facilities) && (
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mt-7 p-4 rounded-2xl bg-white border border-border text-sm">
            {attrs.filter(([, v]) => v).map(([label, v]) => (
              <div key={label}>
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="font-semibold text-text mt-0.5">{v}</dd>
              </div>
            ))}
            {place.facilities && (
              <div className="col-span-2 md:col-span-3">
                <dt className="text-xs text-text-muted">{t.facilities}</dt>
                <dd className="font-semibold text-text mt-0.5">{place.facilities}</dd>
              </div>
            )}
          </dl>
        )}

        {/* Description nettoyee */}
        {paragraphs.length > 0 && (
          <article className="prose prose-sm md:prose-base mt-7 text-text leading-relaxed space-y-4 max-w-none">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] md:text-base leading-7">{p}</p>
            ))}
          </article>
        )}

        {/* Galerie photo additionnelle */}
        {photos.length > 1 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-8">
            {photos.slice(1, 7).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`${place.name} ${t.photo} ${i + 2}`}
                loading="lazy"
                className="rounded-lg w-full h-32 object-cover"
              />
            ))}
          </div>
        )}

        {/* À proximité */}
        {nearby.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-aegean mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {t.nearby}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
              {nearby.slice(0, 24).map((n, i) => (
                <li key={i} className="flex justify-between gap-3 px-3 py-1.5 rounded-lg bg-white border border-border">
                  <span className="truncate text-text">{n.name}</span>
                  <span className="text-text-muted font-data shrink-0">{n.km < 10 ? n.km.toFixed(1) : Math.round(n.km)} km</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {place.source_url && (
          <p className="text-xs text-text-muted mt-10">
            <a href={place.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {t.moreSource} →
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
