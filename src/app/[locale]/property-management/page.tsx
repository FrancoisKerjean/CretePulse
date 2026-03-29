import type { Locale } from "@/lib/types";
import { Waves, Key, BarChart3, Shield, Phone, ChevronRight, MapPin, CheckCircle2 } from "lucide-react";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Property Management in Crete - Rental Management Services | Crete Direct",
    desc: "Everything you need to know about property management in Crete. Short-term rental regulations, AMA license, revenue potential, and trusted local management services.",
  },
  fr: {
    title: "Gestion locative en Crète - Services de gestion | Crete Direct",
    desc: "Tout savoir sur la gestion locative en Crète. Réglementation location courte durée, licence AMA, potentiel de revenus et services de gestion locale.",
  },
  de: {
    title: "Immobilienverwaltung auf Kreta - Mietverwaltungsdienste | Crete Direct",
    desc: "Alles über Immobilienverwaltung auf Kreta. Kurzzeitvermietung, AMA-Lizenz, Einnahmepotenzial und lokale Verwaltungsdienste.",
  },
  el: {
    title: "Διαχείριση Ακινήτων στην Κρήτη - Υπηρεσίες Διαχείρισης | Crete Direct",
    desc: "Όλα όσα πρέπει να γνωρίζετε για τη διαχείριση ακινήτων στην Κρήτη. Βραχυχρόνια μίσθωση, άδεια AMA, δυναμικό εσόδων.",
  },
};

const CONTENT: Record<string, {
  hero: string;
  heroSub: string;
  whyTitle: string;
  whyItems: { title: string; desc: string }[];
  regulationTitle: string;
  regulationIntro: string;
  regulationSteps: string[];
  revenueTitle: string;
  revenueIntro: string;
  revenueNote: string;
  ctaTitle: string;
  ctaSub: string;
  ctaButton: string;
  ctaNote: string;
}> = {
  en: {
    hero: "Property Management in Crete",
    heroSub: "A practical guide for property owners considering short-term rentals on the island.",
    whyTitle: "Why Crete for short-term rentals?",
    whyItems: [
      { title: "Growing tourism", desc: "Crete welcomes over 5 million visitors annually, with east Crete gaining popularity as travelers seek authentic experiences." },
      { title: "Extended season", desc: "The rental season in Crete runs from April to November, with peak months (July-August) commanding premium rates." },
      { title: "Infrastructure development", desc: "The new Kastelli International Airport (opening 2028, 18M passenger capacity) and the BOAK highway are transforming east Crete." },
      { title: "Strong returns", desc: "Well-managed properties in east Crete can generate competitive yields, especially villas with pools." },
    ],
    regulationTitle: "Short-term rental regulations",
    regulationIntro: "Greece requires property owners to obtain an AMA (Short-Term Rental License) before listing on platforms like Airbnb or Booking.com.",
    regulationSteps: [
      "Register on the AADE (tax authority) platform",
      "Obtain your AMA number",
      "Display the AMA on all listings",
      "Declare rental income (15% tax on first 12,000 EUR)",
      "Pay ENFIA annual property tax (~0.28%)",
    ],
    revenueTitle: "Revenue potential",
    revenueIntro: "Average daily rates in east Crete vary by property type and season. A well-positioned 2-bedroom property can expect:",
    revenueNote: "Actual returns depend on location, property condition, marketing, and management quality. Use our simulator for a personalized estimate.",
    ctaTitle: "Need help managing your property?",
    ctaSub: "Kairos Guest Management offers full-service property management in east Crete. Francophone owner based on-site in Makrigialos.",
    ctaButton: "Visit Kairos Guest Management",
    ctaNote: "Free consultation. No commitment.",
  },
  fr: {
    hero: "Gestion locative en Crète",
    heroSub: "Guide pratique pour les propriétaires qui envisagent la location courte durée sur l'île.",
    whyTitle: "Pourquoi la Crète pour la location courte durée ?",
    whyItems: [
      { title: "Tourisme en croissance", desc: "La Crète accueille plus de 5 millions de visiteurs par an, avec l'est de la Crète qui gagne en popularité." },
      { title: "Saison étendue", desc: "La saison locative en Crète court d'avril à novembre, avec des tarifs premium en juillet-août." },
      { title: "Développement des infrastructures", desc: "Le nouvel aéroport international de Kastelli (ouverture 2028, 18M passagers/an) et l'autoroute BOAK transforment l'est crétois." },
      { title: "Rendements attractifs", desc: "Les propriétés bien gérées dans l'est de la Crète peuvent générer des rendements compétitifs, surtout les villas avec piscine." },
    ],
    regulationTitle: "Réglementation de la location courte durée",
    regulationIntro: "La Grèce exige des propriétaires l'obtention d'une licence AMA avant de publier sur Airbnb ou Booking.com.",
    regulationSteps: [
      "S'inscrire sur la plateforme AADE (administration fiscale)",
      "Obtenir votre numéro AMA",
      "Afficher l'AMA sur toutes les annonces",
      "Déclarer les revenus locatifs (15% sur les premiers 12 000 EUR)",
      "Payer l'ENFIA, taxe foncière annuelle (~0,28%)",
    ],
    revenueTitle: "Potentiel de revenus",
    revenueIntro: "Les tarifs journaliers moyens dans l'est de la Crète varient selon le type de bien et la saison. Un 2 chambres bien situé peut espérer :",
    revenueNote: "Les rendements réels dépendent de l'emplacement, de l'état du bien, du marketing et de la qualité de gestion. Utilisez notre simulateur pour une estimation personnalisée.",
    ctaTitle: "Besoin d'aide pour gérer votre bien ?",
    ctaSub: "Kairos Guest Management propose une gestion locative complète dans l'est de la Crète. Gérant francophone basé sur place à Makrigialos.",
    ctaButton: "Découvrir Kairos Guest Management",
    ctaNote: "Consultation gratuite. Sans engagement.",
  },
  de: {
    hero: "Immobilienverwaltung auf Kreta",
    heroSub: "Ein praktischer Leitfaden für Immobilienbesitzer, die Kurzzeitvermietung auf der Insel in Betracht ziehen.",
    whyTitle: "Warum Kreta für Kurzzeitvermietung?",
    whyItems: [
      { title: "Wachsender Tourismus", desc: "Kreta empfängt jährlich über 5 Millionen Besucher. Ostkreta gewinnt an Beliebtheit." },
      { title: "Verlängerte Saison", desc: "Die Mietsaison auf Kreta läuft von April bis November, mit Spitzenpreisen im Juli-August." },
      { title: "Infrastrukturentwicklung", desc: "Der neue internationale Flughafen Kastelli (Eröffnung 2028, 18M Passagiere/Jahr) und die BOAK-Autobahn transformieren Ostkreta." },
      { title: "Attraktive Renditen", desc: "Gut verwaltete Immobilien in Ostkreta können wettbewerbsfähige Renditen erzielen." },
    ],
    regulationTitle: "Vorschriften für Kurzzeitvermietung",
    regulationIntro: "Griechenland verlangt von Immobilienbesitzern eine AMA-Lizenz vor der Veröffentlichung auf Airbnb oder Booking.com.",
    regulationSteps: [
      "Registrierung auf der AADE-Plattform (Steuerbehörde)",
      "AMA-Nummer erhalten",
      "AMA auf allen Inseraten anzeigen",
      "Mieteinnahmen deklarieren (15% auf die ersten 12.000 EUR)",
      "ENFIA-Grundsteuer zahlen (~0,28% jährlich)",
    ],
    revenueTitle: "Einnahmepotenzial",
    revenueIntro: "Durchschnittliche Tagespreise in Ostkreta variieren nach Immobilientyp und Saison. Eine gut gelegene 2-Zimmer-Immobilie kann erwarten:",
    revenueNote: "Tatsächliche Renditen hängen von Lage, Zustand, Marketing und Verwaltungsqualität ab.",
    ctaTitle: "Brauchen Sie Hilfe bei der Verwaltung?",
    ctaSub: "Kairos Guest Management bietet Full-Service-Immobilienverwaltung in Ostkreta. Vor-Ort-Management in Makrigialos.",
    ctaButton: "Kairos Guest Management besuchen",
    ctaNote: "Kostenlose Beratung. Keine Verpflichtung.",
  },
  el: {
    hero: "Διαχείριση Ακινήτων στην Κρήτη",
    heroSub: "Πρακτικός οδηγός για ιδιοκτήτες που εξετάζουν βραχυχρόνια μίσθωση στο νησί.",
    whyTitle: "Γιατί η Κρήτη για βραχυχρόνια μίσθωση;",
    whyItems: [
      { title: "Αυξανόμενος τουρισμός", desc: "Η Κρήτη υποδέχεται πάνω από 5 εκατομμύρια επισκέπτες ετησίως." },
      { title: "Εκτεταμένη σεζόν", desc: "Η σεζόν ενοικίασης διαρκεί από Απρίλιο έως Νοέμβριο, με premium τιμές τον Ιούλιο-Αύγουστο." },
      { title: "Ανάπτυξη υποδομών", desc: "Το νέο αεροδρόμιο Καστελλίου (2028, 18M επιβάτες/έτος) και ο ΒΟΑΚ μεταμορφώνουν την ανατολική Κρήτη." },
      { title: "Ελκυστικές αποδόσεις", desc: "Τα καλά διαχειριζόμενα ακίνητα στην ανατολική Κρήτη μπορούν να αποδώσουν ανταγωνιστικά." },
    ],
    regulationTitle: "Κανονισμοί βραχυχρόνιας μίσθωσης",
    regulationIntro: "Η Ελλάδα απαιτεί από τους ιδιοκτήτες να αποκτήσουν Αριθμό Μητρώου Ακινήτων (ΑΜΑ) πριν καταχωρήσουν σε πλατφόρμες.",
    regulationSteps: [
      "Εγγραφή στην πλατφόρμα ΑΑΔΕ",
      "Απόκτηση αριθμού ΑΜΑ",
      "Εμφάνιση ΑΜΑ σε όλες τις καταχωρήσεις",
      "Δήλωση εισοδήματος ενοικίων (15% στα πρώτα 12.000 EUR)",
      "Πληρωμή ΕΝΦΙΑ (~0,28% ετησίως)",
    ],
    revenueTitle: "Δυναμικό εσόδων",
    revenueIntro: "Οι μέσες ημερήσιες τιμές στην ανατολική Κρήτη ποικίλλουν ανάλογα με τον τύπο ακινήτου και τη σεζόν.",
    revenueNote: "Οι πραγματικές αποδόσεις εξαρτώνται από τοποθεσία, κατάσταση, marketing και ποιότητα διαχείρισης.",
    ctaTitle: "Χρειάζεστε βοήθεια στη διαχείριση;",
    ctaSub: "Η Kairos Guest Management προσφέρει ολοκληρωμένη διαχείριση ακινήτων στην ανατολική Κρήτη.",
    ctaButton: "Επισκεφθείτε Kairos Guest Management",
    ctaNote: "Δωρεάν συμβουλευτική. Χωρίς δέσμευση.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/property-management`;

  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.desc, url, type: "article" },
  };
}

export default async function PropertyManagementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = CONTENT[locale as keyof typeof CONTENT] || CONTENT.en;

  const seasonData = [
    { season: locale === "fr" ? "Haute saison (juil-août)" : locale === "de" ? "Hochsaison (Jul-Aug)" : locale === "el" ? "Υψηλή σεζόν (Ιούλ-Αύγ)" : "Peak (Jul-Aug)", rate: "85-150 EUR", occ: "85-95%" },
    { season: locale === "fr" ? "Moyenne saison (mai-juin, sept-oct)" : locale === "de" ? "Nebensaison (Mai-Jun, Sep-Okt)" : locale === "el" ? "Μέση σεζόν (Μάι-Ιούν, Σεπ-Οκτ)" : "Shoulder (May-Jun, Sep-Oct)", rate: "60-110 EUR", occ: "60-80%" },
    { season: locale === "fr" ? "Basse saison (nov-avr)" : locale === "de" ? "Nebensaison (Nov-Apr)" : locale === "el" ? "Χαμηλή σεζόν (Νοέ-Απρ)" : "Low (Nov-Apr)", rate: "35-70 EUR", occ: "15-35%" },
  ];

  return (
    <main className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-aegean text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-sand" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
              {locale === "fr" ? "Guide pratique" : locale === "de" ? "Praktischer Leitfaden" : locale === "el" ? "Πρακτικός οδηγός" : "Practical guide"}
            </span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold leading-tight mb-4"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {c.hero}
          </h1>
          <p className="text-lg text-white/70 max-w-xl">{c.heroSub}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        {/* Why Crete */}
        <section>
          <h2 className="text-2xl font-bold text-aegean mb-6" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
            {c.whyTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {c.whyItems.map((item, i) => (
              <div key={i} className="p-5 bg-white rounded-xl border border-border">
                <h3 className="font-bold text-text mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-olive shrink-0" />
                  {item.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Regulations */}
        <section className="p-6 bg-aegean-faint rounded-2xl border border-aegean/10">
          <h2 className="text-xl font-bold text-aegean mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {c.regulationTitle}
          </h2>
          <p className="text-sm text-text-muted mb-4">{c.regulationIntro}</p>
          <ol className="space-y-2">
            {c.regulationSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-text">
                <span className="shrink-0 w-6 h-6 rounded-full bg-aegean text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        {/* Revenue potential */}
        <section>
          <h2 className="text-xl font-bold text-aegean mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {c.revenueTitle}
          </h2>
          <p className="text-sm text-text-muted mb-4">{c.revenueIntro}</p>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-stone text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">
                    {locale === "fr" ? "Saison" : locale === "de" ? "Saison" : locale === "el" ? "Σεζόν" : "Season"}
                  </th>
                  <th className="text-left px-4 py-3 font-bold">ADR</th>
                  <th className="text-left px-4 py-3 font-bold">
                    {locale === "fr" ? "Occupation" : locale === "de" ? "Auslastung" : locale === "el" ? "Πληρότητα" : "Occupancy"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {seasonData.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-text">{row.season}</td>
                    <td className="px-4 py-3 text-terra font-bold">{row.rate}</td>
                    <td className="px-4 py-3 text-text-muted">{row.occ}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-light mt-3 italic">{c.revenueNote}</p>
        </section>

        {/* CTA to Kairos */}
        <section className="p-8 bg-gradient-to-br from-aegean to-aegean-light rounded-2xl text-white text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
            {c.ctaTitle}
          </h2>
          <p className="text-white/70 text-sm mb-6 max-w-md mx-auto">{c.ctaSub}</p>
          <a
            href="https://kairosguest.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-terra text-white rounded-xl font-bold text-sm hover:bg-terra-light transition-colors shadow-lg hover:shadow-xl"
          >
            {c.ctaButton}
            <ChevronRight className="w-4 h-4" />
          </a>
          <p className="text-[11px] text-white/40 mt-4">{c.ctaNote}</p>
        </section>
      </div>
    </main>
  );
}
