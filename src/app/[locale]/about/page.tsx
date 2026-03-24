import type { Locale } from "@/lib/types";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  const metadata = {
    en: {
      title: "About Crete Direct",
      description: "A free, independent guide to Crete with live weather, events, fire alerts, and practical information.",
    },
    fr: {
      title: "À propos de Crete Direct",
      description: "Un guide gratuit et indépendant de la Crète avec météo en direct, événements, alertes incendies et informations pratiques.",
    },
    de: {
      title: "Über Crete Direct",
      description: "Ein kostenloser, unabhängiger Führer durch Kreta mit Live-Wetter, Ereignissen, Feueralerts und praktischen Informationen.",
    },
    el: {
      title: "Σχετικά με Crete Direct",
      description: "Ένας δωρεάν, ανεξάρτητος οδηγός της Κρήτης με live καιρό, εκδηλώσεις, ειδοποιήσεις πυρκαγιών και πρακτικές πληροφορίες.",
    },
  };

  return {
    title: metadata[loc].title,
    description: metadata[loc].description,
  };
}

const CONTENT: Record<Locale, { title: string; intro: string; dataSection: { heading: string; text: string }; affiliation: string; closing: string; contact: { label: string; email: string } }> = {
  en: {
    title: "About Crete Direct",
    intro: "Crete Direct is a free, independent guide to the island of Crete. We aggregate live data (weather, sea conditions, fire alerts), local events, and practical information for residents and visitors.",
    dataSection: {
      heading: "Data Sources",
      text: "Our data comes from open sources: Open-Meteo (weather), OpenStreetMap (places), EU Copernicus (fire alerts), and Greek news RSS feeds. All data is updated regularly and displayed transparently.",
    },
    affiliation: "Crete Direct is not affiliated with any tourism agency, real estate company, government body, or commercial organization. We are independent and community-focused.",
    closing: "Built with love from Crete.",
    contact: {
      label: "Questions or feedback?",
      email: "hello@crete.direct",
    },
  },
  fr: {
    title: "À propos de Crete Direct",
    intro: "Crete Direct est un guide gratuit et indépendant de l'île de Crète. Nous agrégeons des données en direct (météo, conditions marines, alertes incendies), des événements locaux et des informations pratiques pour les résidents et les visiteurs.",
    dataSection: {
      heading: "Sources de données",
      text: "Nos données proviennent de sources ouvertes : Open-Meteo (météo), OpenStreetMap (lieux), Copernicus de l'UE (alertes incendies) et les flux RSS d'actualités grecques. Toutes les données sont mises à jour régulièrement et affichées de manière transparente.",
    },
    affiliation: "Crete Direct n'est affilié à aucune agence de tourisme, société immobilière, organisme gouvernemental ou organisation commerciale. Nous sommes indépendants et centrés sur la communauté.",
    closing: "Construit avec amour depuis la Crète.",
    contact: {
      label: "Des questions ou des commentaires ?",
      email: "hello@crete.direct",
    },
  },
  de: {
    title: "Über Crete Direct",
    intro: "Crete Direct ist ein kostenloser, unabhängiger Führer durch die Insel Kreta. Wir aggregieren Live-Daten (Wetter, Meeresbedingungen, Feueralerts), lokale Veranstaltungen und praktische Informationen für Einwohner und Besucher.",
    dataSection: {
      heading: "Datenquellen",
      text: "Unsere Daten stammen aus offenen Quellen: Open-Meteo (Wetter), OpenStreetMap (Orte), Copernicus der EU (Feueralerts) und griechische Nachrichten-RSS-Feeds. Alle Daten werden regelmäßig aktualisiert und transparent angezeigt.",
    },
    affiliation: "Crete Direct ist nicht mit Tourismusbehörden, Immobilienunternehmen, Behörden oder kommerziellen Organisationen verbunden. Wir sind unabhängig und gemeinschaftsorientiert.",
    closing: "Mit Liebe aus Kreta gebaut.",
    contact: {
      label: "Fragen oder Feedback?",
      email: "hello@crete.direct",
    },
  },
  el: {
    title: "Σχετικά με Crete Direct",
    intro: "Το Crete Direct είναι ένας δωρεάν και ανεξάρτητος οδηγός του νησιού της Κρήτης. Συγκεντρώνουμε ζωντανά δεδομένα (καιρός, θαλάσσιες συνθήκες, ειδοποιήσεις πυρκαγιών), τοπικές εκδηλώσεις και πρακτικές πληροφορίες για κατοίκους και επισκέπτες.",
    dataSection: {
      heading: "Πηγές Δεδομένων",
      text: "Τα δεδομένα μας προέρχονται από ανοικτές πηγές: Open-Meteo (καιρός), OpenStreetMap (τοποθεσίες), Copernicus της ΕΕ (ειδοποιήσεις πυρκαγιών) και ελληνικές ροές RSS ειδήσεων. Όλα τα δεδομένα ενημερώνονται τακτικά και εμφανίζονται με διαφάνεια.",
    },
    affiliation: "Το Crete Direct δεν συνδέεται με κανένα τουριστικό γραφείο, κτηματομεσιτική εταιρεία, κρατική υπηρεσία ή εμπορική οργάνωση. Είμαστε ανεξάρτητοι και προσανατολισμένοι στην κοινότητα.",
    closing: "Φτιαγμένο με αγάπη από την Κρήτη.",
    contact: {
      label: "Έχετε ερωτήσεις ή σχόλια;",
      email: "hello@crete.direct",
    },
  },
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;
  const content = CONTENT[loc];

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-aegean mb-4">{content.title}</h1>
          <p className="text-lg text-text leading-relaxed">{content.intro}</p>
        </div>

        {/* Data sources section */}
        <section className="mb-12 p-6 bg-white rounded-xl border border-border">
          <h2 className="text-xl font-bold text-aegean mb-3">{content.dataSection.heading}</h2>
          <p className="text-text leading-relaxed">{content.dataSection.text}</p>
        </section>

        {/* Affiliation */}
        <section className="mb-12">
          <p className="text-lg text-text leading-relaxed">{content.affiliation}</p>
        </section>

        {/* Closing statement */}
        <section className="mb-12 text-center">
          <p className="text-xl font-light text-text italic">{content.closing}</p>
        </section>

        {/* Contact */}
        <section className="p-6 bg-aegean/5 rounded-xl border border-aegean/10">
          <p className="text-text mb-2">{content.contact.label}</p>
          <a
            href={`mailto:${content.contact.email}`}
            className="text-aegean font-semibold hover:underline text-lg"
          >
            {content.contact.email}
          </a>
        </section>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-border flex justify-center gap-6 text-sm">
          <Link href={`/${locale}/privacy`} className="text-aegean hover:underline">
            {loc === "en" ? "Privacy" : loc === "fr" ? "Confidentialité" : loc === "de" ? "Datenschutz" : "Ιδιωτικότητα"}
          </Link>
        </div>
      </div>
    </main>
  );
}
