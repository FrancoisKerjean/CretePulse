import { getAllBeaches } from "@/lib/beaches";
import { getLocalizedField, type Locale, type Beach } from "@/lib/types";
import { Waves, Fish, Baby, Shield, Sun, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

interface Activity {
  slug: string;
  en: string; fr: string; de: string; el: string;
  descEn: string; descFr: string; descDe: string; descEl: string;
  icon: React.ReactNode;
  filter: (b: Beach) => boolean;
}

const ACTIVITIES: Activity[] = [
  {
    slug: "snorkeling",
    en: "Snorkeling", fr: "Snorkeling", de: "Schnorcheln", el: "Snorkeling",
    descEn: "Crystal clear waters, rocky coves, and abundant marine life make these Crete beaches perfect for snorkeling.",
    descFr: "Eaux cristallines, criques rocheuses et vie marine abondante font de ces plages crétoises des spots parfaits pour le snorkeling.",
    descDe: "Kristallklares Wasser, felsige Buchten und reichhaltiges Meeresleben machen diese kretischen Strände perfekt zum Schnorcheln.",
    descEl: "Κρυστάλλινα νερά, βραχώδεις κόλποι και πλούσια θαλάσσια ζωή κάνουν αυτές τις παραλίες ιδανικές για snorkeling.",
    icon: <Fish className="w-6 h-6 text-aegean" />,
    filter: (b: Beach) => b.snorkeling,
  },
  {
    slug: "kids",
    en: "Kids & Families", fr: "Enfants & Familles", de: "Kinder & Familien", el: "Παιδιά & Οικογένειες",
    descEn: "Shallow waters, sandy shores, and nearby facilities make these beaches ideal for families with children visiting Crete.",
    descFr: "Eaux peu profondes, rivages de sable et équipements à proximité font de ces plages des lieux idéaux pour les familles avec enfants en Crète.",
    descDe: "Flaches Wasser, Sandstrände und nahe Einrichtungen machen diese Strände ideal für Familien mit Kindern auf Kreta.",
    descEl: "Ρηχά νερά, αμμώδεις ακτές και κοντινές εγκαταστάσεις κάνουν αυτές τις παραλίες ιδανικές για οικογένειες με παιδιά.",
    icon: <Baby className="w-6 h-6 text-terra" />,
    filter: (b: Beach) => b.kids_friendly,
  },
  {
    slug: "swimming",
    en: "Swimming", fr: "Baignade", de: "Schwimmen", el: "Κολύμβηση",
    descEn: "Sheltered from wind and waves, these calm Crete beaches offer the best conditions for comfortable swimming.",
    descFr: "Protégées du vent et des vagues, ces plages crétoises calmes offrent les meilleures conditions pour une baignade confortable.",
    descDe: "Vor Wind und Wellen geschützt, bieten diese ruhigen kretischen Strände die besten Bedingungen zum Schwimmen.",
    descEl: "Προφυλαγμένες από τον αέρα και τα κύματα, αυτές οι ήρεμες παραλίες προσφέρουν τις καλύτερες συνθήκες για κολύμβηση.",
    icon: <Waves className="w-6 h-6 text-aegean" />,
    filter: (b: Beach) => b.wind_exposure === "sheltered",
  },
  {
    slug: "secluded",
    en: "Secluded & Quiet", fr: "Isolées & Calmes", de: "Abgelegen & Ruhig", el: "Απομονωμένες",
    descEn: "No sunbeds, no tavernas, just pristine nature. These secluded Crete beaches are perfect for peace and quiet.",
    descFr: "Pas de transats, pas de tavernes, juste une nature préservée. Ces plages isolées de Crète sont parfaites pour la tranquillité.",
    descDe: "Keine Liegestühle, keine Tavernen, nur unberührte Natur. Diese abgelegenen kretischen Strände bieten Ruhe und Erholung.",
    descEl: "Χωρίς ξαπλώστρες, χωρίς ταβέρνες, μόνο ανέγγιχτη φύση. Αυτές οι απομονωμένες παραλίες είναι ιδανικές για ηρεμία.",
    icon: <Shield className="w-6 h-6 text-olive" />,
    filter: (b: Beach) => !b.sunbeds && !b.taverna,
  },
  {
    slug: "sandy",
    en: "Sandy Beaches", fr: "Plages de Sable", de: "Sandstrände", el: "Αμμώδεις Παραλίες",
    descEn: "Golden sand between your toes. These are Crete's finest sandy beaches for sunbathing and relaxation.",
    descFr: "Du sable doré entre les orteils. Voici les plus belles plages de sable de Crète pour le bronzage et la détente.",
    descDe: "Goldener Sand zwischen den Zehen. Dies sind Kretas schönste Sandstrände zum Sonnenbaden und Entspannen.",
    descEl: "Χρυσή άμμος στα δάχτυλα. Αυτές είναι οι ωραιότερες αμμώδεις παραλίες της Κρήτης για ηλιοθεραπεία.",
    icon: <Sun className="w-6 h-6 text-amber-500" />,
    filter: (b: Beach) => b.type === "sand",
  },
  {
    slug: "pebble",
    en: "Pebble Beaches", fr: "Plages de Galets", de: "Kiesstrände", el: "Βοτσαλωτές Παραλίες",
    descEn: "Turquoise waters meet smooth pebbles. These Crete pebble beaches often have the clearest water for swimming and snorkeling.",
    descFr: "Eaux turquoise et galets lisses. Ces plages de galets crétoises offrent souvent l'eau la plus claire pour la baignade et le snorkeling.",
    descDe: "Türkisfarbenes Wasser trifft auf glatte Kieselsteine. Diese kretischen Kiesstrände haben oft das klarste Wasser.",
    descEl: "Τιρκουάζ νερά και λεία βότσαλα. Αυτές οι βοτσαλωτές παραλίες έχουν συχνά τα πιο καθαρά νερά.",
    icon: <Waves className="w-6 h-6 text-text-muted" />,
    filter: (b: Beach) => b.type === "pebble",
  },
];

const LABELS: Record<string, {
  bestFor: string; beachesFound: string; allBeaches: string;
  otherCategories: string; faq: string; type: string; wind: string;
  parking: string; kids: string; sunbeds: string; taverna: string;
  snorkeling: string; yes: string; no: string;
}> = {
  en: {
    bestFor: "Best beaches for",
    beachesFound: "beaches found",
    allBeaches: "All beaches",
    otherCategories: "Other beach categories",
    faq: "Frequently asked questions",
    type: "Type", wind: "Wind", parking: "Parking", kids: "Kids",
    sunbeds: "Sunbeds", taverna: "Taverna", snorkeling: "Snorkeling",
    yes: "Yes", no: "No",
  },
  fr: {
    bestFor: "Les meilleures plages pour",
    beachesFound: "plages trouvées",
    allBeaches: "Toutes les plages",
    otherCategories: "Autres catégories de plages",
    faq: "Questions fréquentes",
    type: "Type", wind: "Vent", parking: "Parking", kids: "Enfants",
    sunbeds: "Transats", taverna: "Taverne", snorkeling: "Snorkeling",
    yes: "Oui", no: "Non",
  },
  de: {
    bestFor: "Die besten Strände zum",
    beachesFound: "Strände gefunden",
    allBeaches: "Alle Strände",
    otherCategories: "Andere Strandkategorien",
    faq: "Häufig gestellte Fragen",
    type: "Typ", wind: "Wind", parking: "Parkplatz", kids: "Kinder",
    sunbeds: "Liegen", taverna: "Taverne", snorkeling: "Schnorcheln",
    yes: "Ja", no: "Nein",
  },
  el: {
    bestFor: "Οι καλύτερες παραλίες για",
    beachesFound: "παραλίες βρέθηκαν",
    allBeaches: "Όλες οι παραλίες",
    otherCategories: "Άλλες κατηγορίες παραλιών",
    faq: "Συχνές ερωτήσεις",
    type: "Τύπος", wind: "Άνεμος", parking: "Πάρκινγκ", kids: "Παιδιά",
    sunbeds: "Ξαπλώστρες", taverna: "Ταβέρνα", snorkeling: "Snorkeling",
    yes: "Ναι", no: "Όχι",
  },
};

function getActivity(slug: string): Activity | undefined {
  return ACTIVITIES.find(a => a.slug === slug);
}

function getActivityName(activity: Activity, locale: string): string {
  return (activity as unknown as Record<string, string>)[locale] || activity.en;
}

function getActivityDesc(activity: Activity, locale: string): string {
  const key = `desc${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof Activity;
  return (activity[key] as string) || activity.descEn;
}

export function generateStaticParams() {
  return ACTIVITIES.map(a => ({ activity: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; activity: string }> }) {
  const { locale, activity: activitySlug } = await params;
  const activity = getActivity(activitySlug);
  if (!activity) return { title: "Not found" };

  const name = getActivityName(activity, locale);
  const desc = getActivityDesc(activity, locale);

  const titles: Record<string, string> = {
    en: `Best Beaches for ${name} in Crete - Guide & Map | Crete Direct`,
    fr: `Meilleures plages pour ${name} en Crète - Guide & Carte | Crete Direct`,
    de: `Beste Strände zum ${name} auf Kreta - Reiseführer & Karte | Crete Direct`,
    el: `Οι καλύτερες παραλίες για ${name} στην Κρήτη | Crete Direct`,
  };

  const url = `${BASE_URL}/${locale}/beaches/best-for/${activitySlug}`;

  return {
    title: titles[locale] || titles.en,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: titles[locale] || titles.en, description: desc, url },
  };
}

export default async function BestBeachesForPage({ params }: { params: Promise<{ locale: string; activity: string }> }) {
  const { locale, activity: activitySlug } = await params;
  const loc = locale as Locale;
  const activity = getActivity(activitySlug);

  if (!activity) notFound();

  const L = LABELS[locale] || LABELS.en;
  const activityName = getActivityName(activity, locale);
  const activityDesc = getActivityDesc(activity, locale);

  let beaches: Beach[] = [];
  try {
    const allBeaches = await getAllBeaches();
    beaches = allBeaches.filter(activity.filter);
  } catch {
    // Supabase unreachable - show empty state
  }

  // FAQ items
  const faqItems = [
    {
      q: locale === "fr"
        ? `Quelles sont les meilleures plages pour ${activityName.toLowerCase()} en Crète ?`
        : locale === "de"
        ? `Welche sind die besten Strände zum ${activityName} auf Kreta?`
        : locale === "el"
        ? `Ποιες είναι οι καλύτερες παραλίες για ${activityName} στην Κρήτη;`
        : `What are the best beaches for ${activityName.toLowerCase()} in Crete?`,
      a: locale === "fr"
        ? `Nous avons sélectionné ${beaches.length} plages idéales pour ${activityName.toLowerCase()} en Crète, réparties dans toute l'île.`
        : locale === "de"
        ? `Wir haben ${beaches.length} ideale Strände zum ${activityName} auf Kreta ausgewählt, verteilt über die ganze Insel.`
        : locale === "el"
        ? `Επιλέξαμε ${beaches.length} ιδανικές παραλίες για ${activityName} στην Κρήτη, σε όλο το νησί.`
        : `We have selected ${beaches.length} ideal beaches for ${activityName.toLowerCase()} in Crete, spread across the island.`,
    },
    {
      q: locale === "fr"
        ? `Quelle est la meilleure saison pour ${activityName.toLowerCase()} en Crète ?`
        : locale === "de"
        ? `Wann ist die beste Jahreszeit zum ${activityName} auf Kreta?`
        : locale === "el"
        ? `Ποια είναι η καλύτερη εποχή για ${activityName} στην Κρήτη;`
        : `When is the best season for ${activityName.toLowerCase()} in Crete?`,
      a: locale === "fr"
        ? `La meilleure période est de mai à octobre, avec des conditions optimales en juin et septembre. L'eau est chaude et le temps stable.`
        : locale === "de"
        ? `Die beste Zeit ist von Mai bis Oktober, mit optimalen Bedingungen im Juni und September. Das Wasser ist warm und das Wetter stabil.`
        : locale === "el"
        ? `Η καλύτερη περίοδος είναι από Μάιο έως Οκτώβριο, με ιδανικές συνθήκες τον Ιούνιο και τον Σεπτέμβριο.`
        : `The best period is from May to October, with optimal conditions in June and September. The water is warm and the weather stable.`,
    },
    {
      q: locale === "fr"
        ? `Les plages pour ${activityName.toLowerCase()} sont-elles gratuites en Crète ?`
        : locale === "de"
        ? `Sind die Strände zum ${activityName} auf Kreta kostenlos?`
        : locale === "el"
        ? `Είναι δωρεάν οι παραλίες για ${activityName} στην Κρήτη;`
        : `Are the beaches for ${activityName.toLowerCase()} free in Crete?`,
      a: locale === "fr"
        ? `Oui, toutes les plages en Crète sont publiques et gratuites. Seuls les transats et parasols sont parfois payants.`
        : locale === "de"
        ? `Ja, alle Strände auf Kreta sind öffentlich und kostenlos. Nur Liegestühle und Sonnenschirme sind manchmal kostenpflichtig.`
        : locale === "el"
        ? `Ναι, όλες οι παραλίες στην Κρήτη είναι δημόσιες και δωρεάν. Μόνο οι ξαπλώστρες και οι ομπρέλες χρεώνονται.`
        : `Yes, all beaches in Crete are public and free. Only sunbeds and umbrellas may have a fee.`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero */}
      <section className="bg-aegean text-white py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href={`/${locale}/beaches`} className="inline-flex items-center gap-1 text-white/50 text-sm hover:text-white/80 mb-4">
            <ChevronLeft className="w-4 h-4" /> {L.allBeaches}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              {activity.icon}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
              {L.bestFor} {activityName}
            </h1>
          </div>
          <p className="text-white/80 text-lg mt-4 max-w-2xl leading-relaxed">{activityDesc}</p>
          <p className="text-white/50 text-sm mt-2">{beaches.length} {L.beachesFound}</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Beach grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {beaches.map(beach => {
            const name = getLocalizedField(beach, "name", loc);
            const desc = getLocalizedField(beach, "description", loc);
            return (
              <Link
                key={beach.slug}
                href={`/${locale}/beaches/${beach.slug}`}
                className="group rounded-xl bg-white border border-border overflow-hidden hover:border-aegean/30 hover:shadow-sm transition-all"
              >
                {beach.image_url && (
                  <div className="relative h-40 bg-aegean/5">
                    <Image
                      src={beach.image_url}
                      alt={`${name} beach, Crete`}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-bold text-text group-hover:text-aegean transition-colors">{name}</h2>
                      <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                        <MapPin className="w-3 h-3" /> {beach.region}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-1" />
                  </div>
                  {desc && (
                    <p className="text-sm text-text-muted mt-2 line-clamp-2">{desc}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-text-muted capitalize">{beach.type}</span>
                    <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-text-muted capitalize">{beach.wind_exposure}</span>
                    {beach.parking && <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-text-muted">{L.parking}</span>}
                    {beach.sunbeds && <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-text-muted">{L.sunbeds}</span>}
                    {beach.taverna && <span className="text-xs px-2 py-0.5 bg-surface rounded-full text-text-muted">{L.taverna}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {beaches.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-muted">
              {locale === "fr" ? "Aucune plage trouvée pour cette catégorie." : locale === "de" ? "Keine Strände in dieser Kategorie gefunden." : "No beaches found for this category."}
            </p>
          </div>
        )}

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-bold text-aegean mb-4">{L.faq}</h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <div key={i} className="p-5 bg-white rounded-xl border border-border">
                <h3 className="font-semibold text-text mb-2">{faq.q}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Other activity categories */}
        <section>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">{L.otherCategories}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {ACTIVITIES.filter(a => a.slug !== activitySlug).map(a => (
              <Link
                key={a.slug}
                href={`/${locale}/beaches/best-for/${a.slug}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border hover:border-aegean/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center flex-shrink-0">
                  {a.icon}
                </div>
                <span className="text-sm font-medium text-text">{getActivityName(a, locale)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
