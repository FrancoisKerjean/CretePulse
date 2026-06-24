import { getBeachBySlug, getNearbyBeaches } from "@/lib/beaches";
import { getCbBeachNear } from "@/lib/cb-beach-match";
import {
  SAND_LABELS, WATER_LABELS, DEPTH_LABELS, CROWD_LABELS, SEA_LABELS,
  FACILITY_LABELS, ACCESS_LABELS, firstLabel, allLabels,
} from "@/lib/cb-beach-labels";
import Breadcrumbs from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { setRequestLocale } from "next-intl/server";
import { getLocalizedField, type Locale } from "@/lib/types";
import DiscoverCrete from "@/components/DiscoverCrete";
import NewsletterCTA from "@/components/NewsletterCTA";
import { beachSchema, breadcrumbSchema } from "@/lib/schema";
import { MapPin, Car, Waves, Fish, Sun, Wind, Baby, UtensilsCrossed, ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateBanner } from "@/components/ui/affiliate-banner";
import { buildAlternates } from "@/lib/seo";
import RentalCTA from "@/components/RentalCTA";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { allPickups } from "@/lib/car-partners";
import { SLUG_COORDS } from "@/lib/taxi-fare";
import { nearestBy } from "@/lib/geo";
import { getBathingWaterQuality } from "@/lib/bathing-water";
import { WaterQualityBadge, wqStatusLabel } from "@/components/WaterQualityBadge";
import { ShareBar } from "@/components/ShareBar";

export const revalidate = 86400;

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

/**
 * Title/description templates by locale.
 * Pattern (CTR-optimised) : "<Beach> Beach Crete 2026: Local Guide (Water, Parking, Family-Friendly)".
 * Year 2026 = freshness, concrete features = curiosity, "Local Guide" = authority.
 */
const BEACH_TITLES: Record<string, (name: string) => string> = {
  en: (name) => `${name} Beach Crete 2026: Local Guide (Water, Parking, Family-Friendly)`,
  fr: (name) => `Plage ${name} en Crète 2026 : Guide local (eau, accès, famille)`,
  de: (name) => `Strand ${name} Kreta 2026: Insider-Guide (Wasser, Parken, Familie)`,
  el: (name) => `Παραλία ${name} Κρήτη 2026: Οδηγός ντόπιου (νερό, πρόσβαση)`,
};
const BEACH_DESCS: Record<string, (name: string, region: string) => string> = {
  en: (name, region) => `${name} beach in ${region}, Crete: water type, parking, snorkeling, family-friendliness, best time to visit and nearby beaches. Honest 2026 local guide, no fluff.`,
  fr: (name, region) => `Plage ${name} dans la région ${region}, Crète : type d'eau, parking, snorkeling, familles, meilleure saison et plages voisines. Guide local 2026 honnête, sans bullshit.`,
  de: (name, region) => `Strand ${name} in der Region ${region}, Kreta: Wassertyp, Parken, Schnorcheln, Familien, beste Reisezeit und nahe Strände. Ehrlicher Insider-Guide 2026.`,
  el: (name, region) => `Παραλία ${name} στην περιοχή ${region}, Κρήτη: τύπος νερού, parking, snorkeling, οικογένειες, καλύτερη εποχή και κοντινές παραλίες. Οδηγός ντόπιου 2026.`,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const beach = await getBeachBySlug(slug);
  if (!beach) return { title: "Beach not found" };

  const name = getLocalizedField(beach, "name", locale as Locale);
  const desc = getLocalizedField(beach, "description", locale as Locale);
  const titleFn = BEACH_TITLES[locale] || BEACH_TITLES.en;
  const descFn = BEACH_DESCS[locale] || BEACH_DESCS.en;
  const title = titleFn(name);
  const description = desc?.substring(0, 160) || descFn(name, beach.region);
  const url = `${BASE_URL}/${locale}/beaches/${slug}`;

  return {
    title,
    description,
    alternates: buildAlternates(locale, `/beaches/${slug}`),
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: beach.image_url ? [{ url: beach.image_url, alt: `${name} beach, Crete` }] : [],
    },
  };
}

/**
 * Renders the lightweight markdown stored in beaches.description_* without
 * any dependency: "# " title (dropped, the page already has the H1),
 * "## " sections, "**bold**", paragraphs. Some generated descriptions are
 * truncated mid-sentence in DB: anything after the last sentence-ending
 * punctuation is dropped so the page never ends on a dangling clause.
 */
function BeachDescription({ text }: { text: string }) {
  // Cut cleanly at the last complete sentence.
  let clean = text.trim();
  if (!/[.!?…»")]$/.test(clean)) {
    const lastStop = Math.max(
      clean.lastIndexOf("."), clean.lastIndexOf("!"), clean.lastIndexOf("?"),
    );
    if (lastStop > clean.length * 0.5) clean = clean.slice(0, lastStop + 1);
  }

  const renderInline = (s: string) =>
    s.split(/\*\*([^*]+)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
    );

  // Markdown headings may arrive inline ("... text ## Heading text ...")
  // or on their own lines; normalize to line-based blocks first.
  const normalized = clean
    .replace(/\s*##\s+/g, "\n## ")
    .replace(/^\s*#\s+[^\n]*\n?/, "");

  const blocks: React.ReactNode[] = [];
  for (const [i, rawBlock] of normalized.split(/\n/).entries()) {
    const block = rawBlock.trim();
    if (!block) continue;
    if (block.startsWith("## ")) {
      const rest = block.slice(3);
      // Heading text runs until the next sentence would start: keep the
      // short title (<= 8 words) as the heading, the remainder as a paragraph.
      const words = rest.split(" ");
      const headLen = Math.min(words.length, 8);
      let cut = headLen;
      for (let w = 1; w <= headLen; w++) {
        if (/[.!?:]$/.test(words[w - 1])) { cut = w; break; }
      }
      const isShortTitle = words.length <= 8;
      const title = isShortTitle ? rest : words.slice(0, cut).join(" ");
      const tail = isShortTitle ? "" : words.slice(cut).join(" ");
      blocks.push(
        <h2 key={`h${i}`} className="text-lg font-semibold text-text mt-6 mb-2">
          {renderInline(title.replace(/[.:]$/, ""))}
        </h2>,
      );
      if (tail) {
        blocks.push(
          <p key={`hp${i}`} className="text-text leading-relaxed mt-2">
            {renderInline(tail)}
          </p>,
        );
      }
    } else {
      blocks.push(
        <p key={`p${i}`} className="text-text leading-relaxed mt-3 first:mt-0">
          {renderInline(block)}
        </p>,
      );
    }
  }
  return <>{blocks}</>;
}

export default async function BeachDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  // Fallback to en on extended locales to avoid `undefined.x` crashes.
  const L = BEACH_LABELS[loc] ?? BEACH_LABELS.en;

  const beach = await getBeachBySlug(slug);
  if (!beach) notFound();

  const [nearby, cb] = await Promise.all([
    getNearbyBeaches(beach.latitude, beach.longitude, beach.slug),
    getCbBeachNear(beach.latitude, beach.longitude),
  ]);
  const name = getLocalizedField(beach, "name", loc);
  const description = getLocalizedField(beach, "description", loc);

  // Classement EU de l'eau de baignade (saison 2025) si la plage a une zone de
  // baignade EEA proche. name_en = meilleur recoupement avec les noms EEA (latin).
  const waterQuality = getBathingWaterQuality(beach.latitude, beach.longitude, beach.name_en);

  const jsonLd = beachSchema(beach, loc);
  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: loc === "fr" ? "Plages" : loc === "de" ? "Strände" : loc === "el" ? "Παραλίες" : "Beaches", url: `${BASE_URL}/${locale}/beaches` },
    { name, url: `${BASE_URL}/${locale}/beaches/${beach.slug}` },
  ]);

  // FAQ: data-driven answers from field-observed attributes (cb match) where
  // available, generic fallbacks otherwise. Visible FAQ mirrors the JSON-LD.
  const uiLoc: Locale = (["en", "fr", "de", "el"] as const).includes(loc as "en") ? (loc as Locale) : "en";
  const sand = firstLabel(cb?.sand_type, SAND_LABELS[uiLoc]);
  const water = firstLabel(cb?.water_color, WATER_LABELS[uiLoc]);
  const depthL = firstLabel(cb?.depth, DEPTH_LABELS[uiLoc]);
  const crowdsL = firstLabel(cb?.crowds, CROWD_LABELS[uiLoc]);
  const seaL = cb?.sea_surface ? SEA_LABELS[uiLoc][cb.sea_surface.split(",")[0].trim()] ?? null : null;
  const facilities = allLabels(cb?.facilities, FACILITY_LABELS[uiLoc]);
  const access = allLabels(cb?.accessibility ?? null, ACCESS_LABELS[uiLoc]);
  const hasLifeguard = (cb?.facilities ?? "").includes("Lifeguard");

  // Qualite de l'eau de baignade (classement UE/EEA saison 2025) pour la FAQ.
  const wqWord = waterQuality ? wqStatusLabel(waterQuality.status, uiLoc) : null;
  const wqTop = waterQuality?.status === "excellent";

  const F = {
    en: {
      sandyQ: `Is ${name} a sandy beach?`,
      sandyA: sand
        ? `${name} is a ${sand} beach${water ? ` with ${water} water` : ""}, in the ${beach.region} region of Crete.`
        : `${name} is a ${beach.type || "mixed"} beach located in the ${beach.region} region of Crete.`,
      waterQ: `Is the water clean at ${name}?`,
      waterA: waterQuality
        ? `${name} holds the EU bathing-water rating "${wqWord}"${wqTop ? ", the highest of the four EU categories," : ""} for the 2025 season, under the European Bathing Water Directive (source: European Environment Agency).`
        : null,
      seaQ: `Is the sea calm at ${name}?`,
      seaA: seaL ? `The sea at ${name} is ${seaL}. For today's live wind and wave conditions, see our "where to swim today" page.` : null,
      kidsQ: `Is ${name} suitable for children?`,
      kidsA: depthL
        ? `The water at ${name} is ${depthL}${depthL === "shallow" ? ", which suits children well" : ""}.${hasLifeguard ? " A lifeguard operates in season." : ""}`
        : beach.kids_friendly
          ? `Yes, ${name} is family-friendly and suitable for children.`
          : `${name} is not ideal for children due to conditions.`,
      crowdQ: `Is ${name} crowded?`,
      crowdA: crowdsL ? `${name} is ${crowdsL}.` : null,
      facQ: `Are there sunbeds and facilities at ${name}?`,
      facA: facilities.length ? `At ${name} you will find: ${facilities.join(", ")}.` : null,
      parkQ: `Is there parking at ${name}?`,
      parkA: (beach.parking
        ? `Yes, ${name} has parking available.`
        : `No, ${name} does not have dedicated parking.`) + (access.length ? ` Access: ${access.join(", ")}.` : ""),
    },
    fr: {
      sandyQ: `${name} est-elle une plage de sable ?`,
      sandyA: sand
        ? `${name} est une plage de ${sand}${water ? `, à l'eau ${water}` : ""}, dans la région ${beach.region} de la Crète.`
        : `${name} est une plage de type ${beach.type || "mixte"} située dans la région ${beach.region} de la Crète.`,
      waterQ: `L'eau de baignade est-elle de bonne qualité à ${name} ?`,
      waterA: waterQuality
        ? `${name} est classée « ${wqWord} »${wqTop ? ", la meilleure des quatre catégories de l'UE," : ""} pour la qualité de l'eau de baignade (saison 2025), au titre de la directive européenne sur les eaux de baignade (source : Agence européenne pour l'environnement).`
        : null,
      seaQ: `La mer est-elle calme à ${name} ?`,
      seaA: seaL ? `La mer à ${name} est ${seaL}. Pour les conditions de vent et de houle du jour, voir notre page « où se baigner aujourd'hui ».` : null,
      kidsQ: `${name} est-elle adaptée aux enfants ?`,
      kidsA: depthL
        ? `L'eau à ${name} est ${depthL}${depthL === "peu profonde" ? ", ce qui convient bien aux enfants" : ""}.${hasLifeguard ? " Un maître-nageur est présent en saison." : ""}`
        : beach.kids_friendly
          ? `Oui, ${name} est adaptée aux familles avec enfants.`
          : `${name} n'est pas idéale pour les enfants en raison des conditions.`,
      crowdQ: `${name} est-elle fréquentée ?`,
      crowdA: crowdsL ? `${name} est ${crowdsL}.` : null,
      facQ: `Y a-t-il des transats et des services à ${name} ?`,
      facA: facilities.length ? `À ${name}, on trouve : ${facilities.join(", ")}.` : null,
      parkQ: `Y a-t-il un parking à ${name} ?`,
      parkA: (beach.parking
        ? `Oui, ${name} dispose d'un parking.`
        : `Non, ${name} n'a pas de parking dédié.`) + (access.length ? ` Accès : ${access.join(", ")}.` : ""),
    },
    de: {
      sandyQ: `Ist ${name} ein Sandstrand?`,
      sandyA: sand
        ? `${name} ist ein Strand mit ${sand}${water ? ` und ${water}em Wasser` : ""}, in der Region ${beach.region} auf Kreta.`
        : `${name} ist ein ${beach.type || "gemischter"} Strand in der Region ${beach.region} auf Kreta.`,
      waterQ: `Ist das Wasser bei ${name} sauber?`,
      waterA: waterQuality
        ? `Für die Saison 2025 ist die Badegewässerqualität bei ${name} als "${wqWord}"${wqTop ? " eingestuft (die beste der vier EU-Kategorien)" : " eingestuft"}, gemäß der EU-Badegewässerrichtlinie (Quelle: Europäische Umweltagentur).`
        : null,
      seaQ: `Ist das Meer bei ${name} ruhig?`,
      seaA: seaL ? `Das Meer bei ${name} ist ${seaL}. Live-Wind und Wellen für heute: siehe unsere Seite "Wo heute baden".` : null,
      kidsQ: `Ist ${name} kinderfreundlich?`,
      kidsA: depthL
        ? `Das Wasser bei ${name} ist ${depthL}${depthL === "flach" ? ", gut geeignet für Kinder" : ""}.${hasLifeguard ? " In der Saison gibt es einen Rettungsschwimmer." : ""}`
        : beach.kids_friendly
          ? `Ja, ${name} ist kinderfreundlich.`
          : `${name} ist aufgrund der Bedingungen nicht ideal für Kinder.`,
      crowdQ: `Ist ${name} überlaufen?`,
      crowdA: crowdsL ? `${name} ist ${crowdsL}.` : null,
      facQ: `Gibt es Liegen und Infrastruktur bei ${name}?`,
      facA: facilities.length ? `Bei ${name} gibt es: ${facilities.join(", ")}.` : null,
      parkQ: `Gibt es einen Parkplatz bei ${name}?`,
      parkA: (beach.parking
        ? `Ja, ${name} hat einen Parkplatz.`
        : `Nein, ${name} hat keinen Parkplatz.`) + (access.length ? ` Zugang: ${access.join(", ")}.` : ""),
    },
    el: {
      sandyQ: `Είναι η ${name} αμμώδης παραλία;`,
      sandyA: sand
        ? `Η ${name} είναι παραλία με ${sand}${water ? ` και ${water} νερά` : ""}, στην περιοχή ${beach.region} της Κρήτης.`
        : `Η ${name} είναι παραλία τύπου ${beach.type || "μικτή"} στην περιοχή ${beach.region} της Κρήτης.`,
      waterQ: `Είναι καθαρά τα νερά κολύμβησης στην ${name};`,
      waterA: waterQuality
        ? `Η ${name} έχει ταξινομηθεί ως «${wqWord}»${wqTop ? ", η υψηλότερη από τις τέσσερις κατηγορίες της ΕΕ," : ""} για την ποιότητα των νερών κολύμβησης (σεζόν 2025), βάσει της ευρωπαϊκής οδηγίας για τα νερά κολύμβησης (πηγή: Ευρωπαϊκός Οργανισμός Περιβάλλοντος).`
        : null,
      seaQ: `Είναι ήρεμη η θάλασσα στην ${name};`,
      seaA: seaL ? `Η θάλασσα στην ${name} είναι ${seaL}. Για τις σημερινές συνθήκες ανέμου και κύματος, δείτε τη σελίδα «πού για μπάνιο σήμερα».` : null,
      kidsQ: `Είναι η ${name} κατάλληλη για παιδιά;`,
      kidsA: depthL
        ? `Τα νερά στην ${name} είναι ${depthL}${depthL === "ρηχά" ? ", κατάλληλα για παιδιά" : ""}.${hasLifeguard ? " Τη σεζόν υπάρχει ναυαγοσώστης." : ""}`
        : beach.kids_friendly
          ? `Ναι, η ${name} είναι κατάλληλη για παιδιά.`
          : `Η ${name} δεν είναι ιδανική για παιδιά.`,
      crowdQ: `Έχει κόσμο η ${name};`,
      crowdA: crowdsL ? `Η ${name} είναι ${crowdsL}.` : null,
      facQ: `Υπάρχουν ξαπλώστρες και παροχές στην ${name};`,
      facA: facilities.length ? `Στην ${name} θα βρείτε: ${facilities.join(", ")}.` : null,
      parkQ: `Υπάρχει πάρκινγκ στην ${name};`,
      parkA: (beach.parking
        ? `Ναι, η ${name} διαθέτει πάρκινγκ.`
        : `Όχι, η ${name} δεν έχει πάρκινγκ.`) + (access.length ? ` Πρόσβαση: ${access.join(", ")}.` : ""),
    },
  }[uiLoc];

  const faqItems = [
    { q: F.sandyQ, a: F.sandyA },
    ...(F.waterA ? [{ q: F.waterQ, a: F.waterA }] : []),
    ...(F.seaA ? [{ q: F.seaQ, a: F.seaA }] : []),
    { q: F.kidsQ, a: F.kidsA },
    ...(F.crowdA ? [{ q: F.crowdQ, a: F.crowdA }] : []),
    ...(F.facA ? [{ q: F.facQ, a: F.facA }] : []),
    { q: F.parkQ, a: F.parkA },
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
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumb} />
      <Breadcrumbs schema={breadcrumb} />
      <JsonLd data={faqSchema} />
      {/* Hero image */}
      {beach.image_url && (
        <div className="relative h-72 md:h-96 bg-sea">
          <Image
            src={beach.image_url}
            alt={`${name} beach in ${beach.region} Crete${beach.type ? `, ${beach.type}` : ""}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-6 left-4 right-4 md:left-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white" style={{ fontFamily: "var(--font-heading, 'Comfortaa', system-ui, sans-serif)" }}>{name}</h1>
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
          className="inline-flex items-center gap-1 text-sm text-sea hover:underline mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {L.allBeaches}
        </Link>

        {!beach.image_url && (
          <h1 className="text-3xl font-bold text-sea mb-2">{name}</h1>
        )}

        {/* Attributes grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Waves className="w-5 h-5 text-sea mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.type}</p>
            <p className="font-semibold text-sm capitalize">{beach.type || L.mixed}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Wind className="w-5 h-5 text-sea mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.windExposure}</p>
            <p className="font-semibold text-sm capitalize">{beach.wind_exposure || L.moderate}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Car className="w-5 h-5 text-sea mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.parking}</p>
            <p className="font-semibold text-sm">{beach.parking ? L.yes : L.no}</p>
          </div>
          <div className="rounded-lg bg-white border border-border p-3 text-center">
            <Baby className="w-5 h-5 text-terracotta mx-auto" />
            <p className="text-xs text-text-muted mt-1">{L.kids}</p>
            <p className="font-semibold text-sm">{beach.kids_friendly ? L.kidsFriendly : L.kidsNotIdeal}</p>
          </div>
        </div>

        {/* Qualité de l'eau de baignade (UE, source AEE) */}
        {waterQuality && (
          <div className="mb-8 max-w-sm">
            <WaterQualityBadge wq={waterQuality} locale={locale} />
          </div>
        )}

        {/* Facilities */}
        <div className="flex flex-wrap gap-2 mb-8">
          {beach.sunbeds && (
            <span className="inline-flex items-center gap-1 text-sm bg-surface px-3 py-1 rounded-full">
              <Sun className="w-4 h-4 text-amber-500" /> {L.sunbeds}
            </span>
          )}
          {beach.taverna && (
            <span className="inline-flex items-center gap-1 text-sm bg-surface px-3 py-1 rounded-full">
              <UtensilsCrossed className="w-4 h-4 text-terracotta" /> {L.taverna}
            </span>
          )}
          {beach.snorkeling && (
            <span className="inline-flex items-center gap-1 text-sm bg-surface px-3 py-1 rounded-full">
              <Fish className="w-4 h-4 text-sea" /> {L.snorkeling}
            </span>
          )}
          {seaL && (
            <span className="inline-flex items-center gap-1 text-sm bg-sea-faint text-sea px-3 py-1 rounded-full">
              <Waves className="w-4 h-4" /> {seaL}
            </span>
          )}
          {crowdsL && (
            <span className="inline-flex items-center gap-1 text-sm bg-surface px-3 py-1 rounded-full">
              {crowdsL}
            </span>
          )}
          {cb?.rating != null && cb.rating > 0 && (
            <span className="inline-flex items-center gap-1 text-sm bg-amber-50 text-amber-800 px-3 py-1 rounded-full font-medium">
              ★ {cb.rating.toFixed(1)}/5
            </span>
          )}
        </div>

        {/* Description (DB content is lightweight markdown; some generated
            rows are truncated mid-sentence, the renderer cuts cleanly) */}
        {description && (
          <div className="max-w-none mb-8">
            <BeachDescription text={description} />
          </div>
        )}

        {/* Map link */}
        <a
          href={`https://www.google.com/maps?q=${beach.latitude},${beach.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sea text-white rounded-lg text-sm font-medium hover:bg-sea-light transition-colors mb-12"
        >
          <MapPin className="w-4 h-4" /> {L.openInMaps}
        </a>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-sea mb-4">FAQ</h2>
          <div className="space-y-3">
            {faqItems.map((faq, i) => (
              <div key={i} className="p-4 bg-white rounded-xl border border-border">
                <h3 className="font-semibold text-sm text-text mb-1">{faq.q}</h3>
                <p className="text-sm text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Car rental (audit 13/06, Vague B) : Auto Smart primaire partout où
            il couvre réellement. On route vers le wizard quand le pickup le plus
            proche de la plage est dans une zone servie (chania-ouest, rethymno,
            heraklion-centre), sinon repli affilié DiscoverCars (lasithi-est non
            couvert). Remplace l'ancien `region === "west"` qui envoyait à tort
            les plages du centre/rethymno vers DiscoverCars. */}
        {(() => {
          const nearestPickup = nearestBy(
            allPickups(),
            (p) => SLUG_COORDS[p.slug] ?? null,
            { lat: beach.latitude, lon: beach.longitude },
            1,
          )[0];
          return nearestPickup?.served ? (
            <CarPromo locale={locale} pickup={nearestPickup.slug} source="beach" />
          ) : (
            <AffiliateBanner type="carRental" locale={locale} placeName={name} className="mb-4" />
          );
        })()}

        {/* Nearby beaches */}
        {nearby.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-sea mb-4">{L.nearbyBeaches}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {nearby.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${locale}/beaches/${b.slug}`}
                  className="rounded-xl border border-border bg-white p-3 hover:border-sea/30 transition-all"
                >
                  <p className="font-semibold text-sm">{getLocalizedField(b, "name", loc)}</p>
                  <p className="text-xs text-text-muted capitalize">{b.type} - {b.region}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <ShareBar url={`${BASE_URL}/${locale}/beaches/${beach.slug}`} title={getLocalizedField(beach, "name", loc)} locale={locale} className="my-8" />

        {/* Cross-link rental funnel (kairosguest.com), UTM-tracked */}
        <RentalCTA locale={locale} contentSlug={beach.slug} contentType="beach" />

        {/* Internal linking + retention: editorial discovery grid + newsletter capture */}
        <DiscoverCrete category={null} locale={locale} />
        <NewsletterCTA locale={locale} />

        {/* Image credit */}
        {beach.image_credit && (
          <p className="text-[10px] text-text-light mt-8">{L.photo}: {beach.image_credit}</p>
        )}
      </div>
    </main>
  );
}
