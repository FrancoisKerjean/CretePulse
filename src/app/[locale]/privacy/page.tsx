import type { Locale } from "@/lib/types";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;

  const metadata: Record<Locale, { title: string; description: string }> = {
    en: {
      title: "Privacy Policy - Crete Direct",
      description: "GDPR-compliant privacy policy for Crete Direct. We do not track you, sell your data, or use invasive cookies. Newsletter: double opt-in, EU data storage.",
    },
    fr: {
      title: "Politique de Confidentialité - Crete Direct",
      description: "Politique de confidentialité conforme au RGPD pour Crete Direct. Pas de tracking, pas de vente de données, pas de cookies invasifs. Newsletter double opt-in.",
    },
    de: {
      title: "Datenschutzerklärung - Crete Direct",
      description: "DSGVO-konforme Datenschutzerklärung für Crete Direct. Kein Tracking, kein Datenverkauf, keine invasiven Cookies. Newsletter: Double-Opt-In, EU-Datenspeicherung.",
    },
    el: {
      title: "Πολιτική Ιδιωτικότητας - Crete Direct",
      description: "Πολιτική ιδιωτικότητας GDPR για το Crete Direct. Δεν παρακολουθούμε, δεν πουλάμε δεδομένα, δεν χρησιμοποιούμε cookies. Newsletter: διπλή εξουσιοδότηση.",
    },
  };

  const url = `${BASE_URL}/${locale}/privacy`;

  return {
    title: metadata[loc].title,
    description: metadata[loc].description,
    alternates: { canonical: url },
    openGraph: { title: metadata[loc].title, description: metadata[loc].description, url, type: "website" },
    robots: { index: true, follow: true },
  };
}

const CONTENT: Record<
  Locale,
  {
    title: string;
    intro: string;
    sections: Array<{
      heading: string;
      content: string | string[];
    }>;
  }
> = {
  en: {
    title: "Privacy Policy",
    intro: "At Crete Direct, your privacy is important. This policy explains what data we collect, how we use it, and your rights.",
    sections: [
      {
        heading: "What Data We Collect",
        content: [
          "Email addresses: only if you subscribe to our newsletter, with your explicit consent.",
          "No personal information is collected by visiting our website.",
          "No cookies tracking your behavior or preferences.",
          "No analytics data sold to third parties.",
        ],
      },
      {
        heading: "No Tracking",
        content: "Crete Direct does not use Google Analytics, Meta Pixel, or similar tracking tools. We do not build profiles of your browsing behavior.",
      },
      {
        heading: "Newsletter",
        content: [
          "Newsletter subscription requires double opt-in confirmation via email.",
          "You can unsubscribe anytime by clicking the unsubscribe link in any email.",
          "Your email is used only to send you our newsletter.",
          "We do not share your email with third parties.",
        ],
      },
      {
        heading: "Data Storage & Security",
        content: [
          "All data is stored in the EU (Supabase EU region).",
          "We use industry-standard encryption and security practices.",
          "We do not backup email data to third-party cloud services.",
        ],
      },
      {
        heading: "Your Rights (GDPR)",
        content: [
          "Right of access: request a copy of your data.",
          "Right to deletion: request permanent removal of your email.",
          "Right to data portability: request your data in a portable format.",
          "Right to withdraw consent: unsubscribe from our newsletter anytime.",
          "To exercise these rights, email us at hello@crete.direct",
        ],
      },
      {
        heading: "Third-Party Services",
        content: "Our website uses publicly available APIs (Open-Meteo, OpenStreetMap, Copernicus). These services may have their own privacy policies. Crete Direct does not share your email with any third-party service.",
      },
      {
        heading: "Changes to This Policy",
        content: "We may update this privacy policy occasionally. Significant changes will be communicated via our newsletter.",
      },
      {
        heading: "Contact Us",
        content: "If you have questions about this privacy policy or your data, contact us at hello@crete.direct",
      },
    ],
  },
  fr: {
    title: "Politique de Confidentialité",
    intro: "Chez Crete Direct, votre confidentialité est importante. Cette politique explique les données que nous collectons, comment nous les utilisons et vos droits.",
    sections: [
      {
        heading: "Données Que Nous Collectons",
        content: [
          "Adresses e-mail : uniquement si vous vous abonnez à notre infolettre, avec votre consentement explicite.",
          "Aucune information personnelle n'est collectée en visitant notre site Web.",
          "Aucun cookie ne suit votre comportement ou vos préférences.",
          "Aucune donnée analytique n'est vendue à des tiers.",
        ],
      },
      {
        heading: "Pas de Suivi",
        content: "Crete Direct n'utilise pas Google Analytics, Meta Pixel ou des outils de suivi similaires. Nous ne créons pas de profils de votre comportement de navigation.",
      },
      {
        heading: "Infolettre",
        content: [
          "L'inscription à l'infolettre nécessite une confirmation double opt-in par e-mail.",
          "Vous pouvez vous désabonner à tout moment en cliquant sur le lien de désabonnement dans n'importe quel e-mail.",
          "Votre e-mail est utilisé uniquement pour vous envoyer notre infolettre.",
          "Nous ne partageons pas votre e-mail avec des tiers.",
        ],
      },
      {
        heading: "Stockage et Sécurité des Données",
        content: [
          "Toutes les données sont stockées dans l'UE (région Supabase EU).",
          "Nous utilisons des pratiques de cryptage et de sécurité conformes aux normes de l'industrie.",
          "Nous ne sauvegardons pas les données e-mail sur des services cloud tiers.",
        ],
      },
      {
        heading: "Vos Droits (RGPD)",
        content: [
          "Droit d'accès : demander une copie de vos données.",
          "Droit à l'oubli : demander la suppression permanente de votre e-mail.",
          "Droit à la portabilité des données : demander vos données dans un format portable.",
          "Droit de retirer le consentement : vous désabonner de notre infolettre à tout moment.",
          "Pour exercer ces droits, envoyez-nous un e-mail à hello@crete.direct",
        ],
      },
      {
        heading: "Services Tiers",
        content: "Notre site Web utilise des API publiquement disponibles (Open-Meteo, OpenStreetMap, Copernicus). Ces services peuvent avoir leurs propres politiques de confidentialité. Crete Direct ne partage pas votre e-mail avec aucun service tiers.",
      },
      {
        heading: "Modifications de Cette Politique",
        content: "Nous pouvons mettre à jour cette politique de confidentialité occasionnellement. Les modifications importantes seront communiquées via notre infolettre.",
      },
      {
        heading: "Nous Contacter",
        content: "Si vous avez des questions sur cette politique de confidentialité ou vos données, contactez-nous à hello@crete.direct",
      },
    ],
  },
  de: {
    title: "Datenschutzerklärung",
    intro: "Bei Crete Direct ist Ihre Privatsphäre wichtig. Diese Richtlinie erläutert, welche Daten wir sammeln, wie wir sie nutzen und welche Rechte Sie haben.",
    sections: [
      {
        heading: "Welche Daten Wir Sammeln",
        content: [
          "E-Mail-Adressen: nur wenn Sie sich für unseren Newsletter anmelden, mit Ihrer ausdrücklichen Zustimmung.",
          "Beim Besuch unserer Website werden keine persönlichen Daten erfasst.",
          "Keine Cookies, die Ihr Verhalten oder Ihre Vorlieben verfolgen.",
          "Keine Analysedaten werden an Dritte verkauft.",
        ],
      },
      {
        heading: "Keine Nachverfolgung",
        content: "Crete Direct verwendet nicht Google Analytics, Meta Pixel oder ähnliche Tracking-Tools. Wir erstellen keine Profile Ihres Navigationsverhaltens.",
      },
      {
        heading: "Newsletter",
        content: [
          "Die Newsletter-Anmeldung erfordert eine doppelte Opt-in-Bestätigung per E-Mail.",
          "Sie können sich jederzeit abmelden, indem Sie auf den Abmelde-Link in einer E-Mail klicken.",
          "Ihre E-Mail wird nur verwendet, um Ihnen unseren Newsletter zu senden.",
          "Wir geben Ihre E-Mail nicht an Dritte weiter.",
        ],
      },
      {
        heading: "Datenspeicherung und Sicherheit",
        content: [
          "Alle Daten werden in der EU gespeichert (Supabase EU-Region).",
          "Wir verwenden Verschlüsselung und Sicherheitspraktiken nach Industriestandard.",
          "Wir sichern E-Mail-Daten nicht bei externen Cloud-Diensten.",
        ],
      },
      {
        heading: "Ihre Rechte (DSGVO)",
        content: [
          "Auskunftsrecht: Kopie Ihrer Daten anfordern.",
          "Recht auf Vergessenwerden: permanente Entfernung Ihrer E-Mail anfordern.",
          "Datenportabilität: Ihre Daten in einem tragbaren Format anfordern.",
          "Recht, die Zustimmung zu widerrufen: jederzeit von unserem Newsletter abmelden.",
          "Um diese Rechte auszuüben, senden Sie uns eine E-Mail an hello@crete.direct",
        ],
      },
      {
        heading: "Drittanbieter-Dienste",
        content: "Unsere Website verwendet öffentlich verfügbare APIs (Open-Meteo, OpenStreetMap, Copernicus). Diese Dienste können ihre eigenen Datenschutzrichtlinien haben. Crete Direct gibt Ihre E-Mail nicht an externe Dienste weiter.",
      },
      {
        heading: "Änderungen an dieser Richtlinie",
        content: "Wir können diese Datenschutzrichtlinie gelegentlich aktualisieren. Wesentliche Änderungen werden über unseren Newsletter mitgeteilt.",
      },
      {
        heading: "Kontaktieren Sie Uns",
        content: "Wenn Sie Fragen zu dieser Datenschutzrichtlinie oder Ihren Daten haben, kontaktieren Sie uns unter hello@crete.direct",
      },
    ],
  },
  el: {
    title: "Πολιτική Ιδιωτικότητας",
    intro: "Στο Crete Direct, η ιδιωτικότητά σας είναι σημαντική. Αυτή η πολιτική εξηγεί ποια δεδομένα συλλέγουμε, πώς τα χρησιμοποιούμε και ποια είναι τα δικαιώματά σας.",
    sections: [
      {
        heading: "Ποια Δεδομένα Συλλέγουμε",
        content: [
          "Διευθύνσεις ηλεκτρονικού ταχυδρομείου: μόνο εάν εγγραφείτε στο ενημερωτικό μας δελτίο, με τη ρητή σας συγκατάθεση.",
          "Κανένα προσωπικό δεδομένο δεν συλλέγεται κατά την επίσκεψή σας στον ιστότοπό μας.",
          "Κανένα cookie που παρακολουθεί τη συμπεριφορά ή τις προτιμήσεις σας.",
          "Κανένα δεδομένο ανάλυσης δεν πωλείται σε τρίτα μέρη.",
        ],
      },
      {
        heading: "Χωρίς Παρακολούθηση",
        content: "Το Crete Direct δεν χρησιμοποιεί Google Analytics, Meta Pixel ή παρόμοια εργαλεία παρακολούθησης. Δεν δημιουργούμε προφίλ της συμπεριφοράς σας στη περιήγηση.",
      },
      {
        heading: "Ενημερωτικό Δελτίο",
        content: [
          "Η εγγραφή στο ενημερωτικό δελτίο απαιτεί διπλή επιβεβαίωση opt-in μέσω ηλεκτρονικού ταχυδρομείου.",
          "Μπορείτε να καταργήσετε την εγγραφή σας ανά πάσα στιγμή κάνοντας κλικ στο σύνδεσμο κατάργησης εγγραφής σε οποιοδήποτε μήνυμα ηλεκτρονικού ταχυδρομείου.",
          "Το ηλεκτρονικό σας ταχυδρομείο χρησιμοποιείται μόνο για να σας στείλουμε το ενημερωτικό μας δελτίο.",
          "Δεν κοινοποιούμε το ηλεκτρονικό σας ταχυδρομείο σε τρίτα μέρη.",
        ],
      },
      {
        heading: "Αποθήκευση και Ασφάλεια Δεδομένων",
        content: [
          "Όλα τα δεδομένα αποθηκεύονται στην ΕΕ (περιοχή Supabase EU).",
          "Χρησιμοποιούμε κρυπτογράφηση και πρακτικές ασφάλειας κατά τα πρότυπα του κλάδου.",
          "Δεν δημιουργούμε αντίγραφα ασφαλείας δεδομένων ηλεκτρονικού ταχυδρομείου σε υπηρεσίες cloud τρίτων.",
        ],
      },
      {
        heading: "Τα Δικαιώματά Σας (GDPR)",
        content: [
          "Δικαίωμα πρόσβασης: ζητήστε ένα αντίγραφο των δεδομένων σας.",
          "Δικαίωμα στη λήθη: ζητήστε την οριστική αφαίρεση του ηλεκτρονικού σας ταχυδρομείου.",
          "Δικαίωμα φορητότητας δεδομένων: ζητήστε τα δεδομένα σας σε φορητή μορφή.",
          "Δικαίωμα ανάκλησης συγκατάθεσης: καταργήστε την εγγραφή από το ενημερωτικό μας δελτίο ανά πάσα στιγμή.",
          "Για να ασκήσετε αυτά τα δικαιώματα, στείλτε μας ένα μήνυμα ηλεκτρονικού ταχυδρομείου στο hello@crete.direct",
        ],
      },
      {
        heading: "Υπηρεσίες Τρίτων",
        content: "Ο ιστότοπός μας χρησιμοποιεί δημόσια διαθέσιμα API (Open-Meteo, OpenStreetMap, Copernicus). Αυτές οι υπηρεσίες ενδέχεται να έχουν τις δικές τους πολιτικές ιδιωτικότητας. Το Crete Direct δεν κοινοποιεί το ηλεκτρονικό σας ταχυδρομείο σε καμία υπηρεσία τρίτων.",
      },
      {
        heading: "Αλλαγές σε αυτή την Πολιτική",
        content: "Ενδέχεται να ενημερώσουμε περιστασιακά αυτή την πολιτική ιδιωτικότητας. Σημαντικές αλλαγές θα ανακοινωθούν μέσω του ενημερωτικού μας δελτίου.",
      },
      {
        heading: "Επικοινωνήστε μαζί μας",
        content: "Εάν έχετε ερωτήσεις σχετικά με αυτή την πολιτική ιδιωτικότητας ή τα δεδομένα σας, επικοινωνήστε μαζί μας στο hello@crete.direct",
      },
    ],
  },
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
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

        {/* Sections */}
        <div className="space-y-8">
          {content.sections.map((section, idx) => (
            <section
              key={idx}
              className="pb-8 border-b border-border last:border-b-0"
            >
              <h2 className="text-xl font-bold text-aegean mb-3">{section.heading}</h2>
              {typeof section.content === "string" ? (
                <p className="text-text leading-relaxed">{section.content}</p>
              ) : (
                <ul className="space-y-2">
                  {section.content.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-text leading-relaxed flex gap-3">
                      <span className="text-aegean font-bold shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 pt-8 border-t border-border flex justify-center gap-6 text-sm">
          <Link href={`/${locale}/about`} className="text-aegean hover:underline">
            {loc === "en" ? "About" : loc === "fr" ? "À propos" : loc === "de" ? "Über" : "Σχετικά"}
          </Link>
        </div>
      </div>
    </main>
  );
}
