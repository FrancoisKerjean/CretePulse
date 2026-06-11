// /car-rental : page SEO + wizard lead-gen location de voiture.
// Contenu SSR honnête (transparence partenaire, conduite en Crète, FAQ) autour
// de l'île client CarRentalWizard. Aucun paiement en ligne : l'agence locale
// répond directement avec un devis. Funnel discret, zéro branding Kairos.
// Spec : docs/superpowers/specs/2026-06-12-car-rental-wizard-design.md
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { carRentalPageSchema } from "@/lib/schema";
import { CarRentalWizard } from "@/components/car-rental/CarRentalWizard";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Rent a car in Crete — local agency, fair price, no prepayment",
    desc: "Request a rental car in Crete in four taps. A vetted local agency replies directly with a quote: you pay the agency, cash accepted, no online prepayment, airport pick-up possible.",
  },
  fr: {
    title: "Louer une voiture en Crète — agence locale, prix juste, sans prépaiement",
    desc: "Demandez une voiture de location en Crète en quatre clics. Une agence locale vérifiée vous répond directement avec un devis : vous payez l'agence, espèces acceptées, aucun prépaiement en ligne, prise à l'aéroport possible.",
  },
  de: {
    title: "Mietwagen auf Kreta — lokale Agentur, fairer Preis, keine Vorauszahlung",
    desc: "Fordern Sie in vier Klicks einen Mietwagen auf Kreta an. Eine geprüfte lokale Agentur antwortet direkt mit einem Angebot: Sie zahlen an die Agentur, Barzahlung möglich, keine Online-Vorauszahlung, Abholung am Flughafen möglich.",
  },
  el: {
    title: "Ενοικίαση αυτοκινήτου στην Κρήτη — τοπικό γραφείο, δίκαιη τιμή, χωρίς προπληρωμή",
    desc: "Ζητήστε ενοικιαζόμενο αυτοκίνητο στην Κρήτη με τέσσερα κλικ. Ένα ελεγμένο τοπικό γραφείο απαντά απευθείας με προσφορά: πληρώνετε το γραφείο, δεκτά μετρητά, καμία online προπληρωμή, δυνατή παραλαβή στο αεροδρόμιο.",
  },
};

type PageStrings = {
  h1: string;
  intro: string;
  drivingTitle: string;
  driving: Array<{ h: string; p: string }>;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
  breadcrumbHome: string;
  breadcrumbCarRental: string;
};

const L: Record<string, PageStrings> = {
  en: {
    h1: "Rent a car in Crete",
    intro:
      "This form sends your request to a local rental agency we actually work with — Auto Smart Car Rental in Chania, clearly labelled, nothing hidden. The agency replies directly with a quote; you pay them, on the spot if you like, cash accepted, no online prepayment. We earn a commission from the agency when a rental happens — the price you pay does not change because of it.",
    drivingTitle: "Driving in Crete: what to know before you book",
    driving: [
      {
        h: "Licence and paperwork",
        p: "An EU or EEA driving licence is all you need. If your licence was issued outside the EU/EEA, Greek agencies and police can ask for an International Driving Permit (IDP) alongside your national licence — get one before you fly, it cannot be issued in Greece. Most agencies ask for a minimum age of 21 to 23 and at least one year of driving experience.",
      },
      {
        h: "Insurance, in plain words",
        p: "Quotes normally include the legal third-party liability and a collision damage waiver (CDW) with an excess: if the car is damaged, you pay up to that excess amount, not the full repair. Full coverage reduces the excess to zero or near zero for a few euros more per day. Read what is excluded — tyres, underbody, mirrors and dirt roads often are — and ask the agency directly, they answer.",
      },
      {
        h: "Mountain roads and goats",
        p: "Crete's interior is hairpin country: narrow lanes, blind corners, and goats that consider the asphalt theirs. Honk briefly before tight blind bends, let locals pass, and fill up before heading into the mountains — petrol stations get sparse south of the main road. A small car is genuinely easier on village streets than a big SUV.",
      },
      {
        h: "Parking in the old towns",
        p: "The old towns of Chania, Rethymno and Heraklion are largely pedestrian or residents-only. Do not try to park inside them: use the signed paid car parks and free zones around the edges and walk in — it is ten minutes at most. Blue lines mean paid parking, yellow means no parking, white is free.",
      },
    ],
    faqTitle: "Questions people actually ask",
    faq: [
      {
        q: "Do I have to prepay online?",
        a: "No. This form only sends your request to the local agency. They reply with a quote and you confirm directly with them — there is no online payment on this page, no card required to ask.",
      },
      {
        q: "Can I pay in cash?",
        a: "Yes. The partner agency accepts cash as well as cards. You pay when you pick up the car or as agreed with the agency.",
      },
      {
        q: "What insurance is included?",
        a: "Quotes from the agency include third-party liability as required by Greek law, normally with a collision damage waiver (CDW) with an excess. Full coverage with zero excess is available for an extra daily fee — ask for it in the request notes if you want it quoted.",
      },
      {
        q: "Can I pick the car up at the airport?",
        a: "Yes. Chania airport pick-up and drop-off is standard — add your flight number in the form and the agency tracks delays. Pick-up in Chania town and around the west is also possible.",
      },
    ],
    breadcrumbHome: "Home",
    breadcrumbCarRental: "Rent a car",
  },
  fr: {
    h1: "Louer une voiture en Crète",
    intro:
      "Ce formulaire transmet votre demande à une agence de location locale avec laquelle nous travaillons vraiment — Auto Smart Car Rental à La Canée, clairement étiquetée, rien de caché. L'agence vous répond directement avec un devis ; vous la payez, sur place si vous voulez, espèces acceptées, aucun prépaiement en ligne. Nous touchons une commission de l'agence quand une location se conclut — le prix que vous payez ne change pas pour autant.",
    drivingTitle: "Conduire en Crète : à savoir avant de réserver",
    driving: [
      {
        h: "Permis et papiers",
        p: "Un permis de conduire de l'UE ou de l'EEE suffit. Si votre permis a été délivré hors UE/EEE, les agences grecques et la police peuvent exiger un permis de conduire international (PCI) en plus de votre permis national — faites-le avant de partir, il ne peut pas être délivré en Grèce. La plupart des agences demandent un âge minimum de 21 à 23 ans et au moins un an de conduite.",
      },
      {
        h: "L'assurance, en clair",
        p: "Les devis incluent normalement la responsabilité civile obligatoire et une assurance collision (CDW) avec franchise : en cas de dommage, vous payez au maximum le montant de la franchise, pas toute la réparation. La couverture complète ramène la franchise à zéro ou presque pour quelques euros de plus par jour. Lisez ce qui est exclu — pneus, bas de caisse, rétroviseurs et pistes le sont souvent — et posez la question à l'agence, elle répond.",
      },
      {
        h: "Routes de montagne et chèvres",
        p: "L'intérieur de la Crète, c'est le pays des épingles à cheveux : voies étroites, virages aveugles et chèvres qui considèrent l'asphalte comme leur territoire. Un coup de klaxon bref avant les virages sans visibilité, laissez passer les locaux, et faites le plein avant de monter — les stations-service se raréfient au sud de l'axe principal. Une petite voiture est franchement plus facile dans les ruelles de village qu'un gros SUV.",
      },
      {
        h: "Se garer dans les vieilles villes",
        p: "Les vieilles villes de La Canée, Réthymnon et Héraklion sont largement piétonnes ou réservées aux résidents. N'essayez pas de vous y garer : utilisez les parkings payants signalés et les zones gratuites en périphérie, puis marchez — dix minutes au maximum. Lignes bleues : stationnement payant ; jaunes : interdit ; blanches : gratuit.",
      },
    ],
    faqTitle: "Les questions qu'on nous pose vraiment",
    faq: [
      {
        q: "Dois-je prépayer en ligne ?",
        a: "Non. Ce formulaire transmet seulement votre demande à l'agence locale. Elle vous répond avec un devis et vous confirmez directement avec elle — aucun paiement en ligne sur cette page, aucune carte requise pour demander.",
      },
      {
        q: "Puis-je payer en espèces ?",
        a: "Oui. L'agence partenaire accepte les espèces comme les cartes. Vous payez à la prise du véhicule ou selon ce que vous convenez avec l'agence.",
      },
      {
        q: "Quelle assurance est incluse ?",
        a: "Les devis de l'agence incluent la responsabilité civile exigée par la loi grecque, normalement avec une assurance collision (CDW) à franchise. La couverture complète sans franchise est disponible pour un supplément journalier — demandez-la dans les notes si vous voulez qu'elle soit chiffrée.",
      },
      {
        q: "Puis-je prendre la voiture à l'aéroport ?",
        a: "Oui. La prise et la restitution à l'aéroport de La Canée sont courantes — indiquez votre numéro de vol dans le formulaire et l'agence suit les retards. La prise en ville à La Canée et dans l'ouest est aussi possible.",
      },
    ],
    breadcrumbHome: "Accueil",
    breadcrumbCarRental: "Louer une voiture",
  },
  de: {
    h1: "Mietwagen auf Kreta",
    intro:
      "Dieses Formular sendet Ihre Anfrage an eine lokale Mietwagenagentur, mit der wir wirklich zusammenarbeiten — Auto Smart Car Rental in Chania, klar gekennzeichnet, nichts versteckt. Die Agentur antwortet Ihnen direkt mit einem Angebot; Sie zahlen an die Agentur, gern vor Ort, Barzahlung möglich, keine Online-Vorauszahlung. Wir erhalten von der Agentur eine Provision, wenn eine Vermietung zustande kommt — der Preis, den Sie zahlen, ändert sich dadurch nicht.",
    drivingTitle: "Autofahren auf Kreta: das sollten Sie vorher wissen",
    driving: [
      {
        h: "Führerschein und Papiere",
        p: "Ein Führerschein aus der EU oder dem EWR genügt. Wurde Ihr Führerschein außerhalb der EU/des EWR ausgestellt, können griechische Agenturen und die Polizei zusätzlich einen Internationalen Führerschein (IDP) verlangen — besorgen Sie ihn vor der Reise, in Griechenland wird er nicht ausgestellt. Die meisten Agenturen verlangen ein Mindestalter von 21 bis 23 Jahren und mindestens ein Jahr Fahrpraxis.",
      },
      {
        h: "Versicherung, verständlich erklärt",
        p: "Angebote enthalten üblicherweise die gesetzliche Haftpflicht und eine Vollkaskoversicherung (CDW) mit Selbstbeteiligung: Bei einem Schaden zahlen Sie höchstens die Selbstbeteiligung, nicht die ganze Reparatur. Der Vollschutz senkt die Selbstbeteiligung für ein paar Euro mehr pro Tag auf null oder fast null. Lesen Sie, was ausgeschlossen ist — Reifen, Unterboden, Spiegel und Schotterpisten oft — und fragen Sie die Agentur direkt, sie antwortet.",
      },
      {
        h: "Bergstraßen und Ziegen",
        p: "Kretas Landesinneres ist Serpentinenland: schmale Fahrbahnen, unübersichtliche Kurven und Ziegen, die den Asphalt als ihr Revier betrachten. Hupen Sie kurz vor engen, unübersichtlichen Kurven, lassen Sie Einheimische vorbei und tanken Sie, bevor es in die Berge geht — südlich der Hauptstraße werden Tankstellen rar. Ein kleines Auto ist in Dorfgassen wirklich leichter zu bewegen als ein großer SUV.",
      },
      {
        h: "Parken in den Altstädten",
        p: "Die Altstädte von Chania, Rethymno und Heraklion sind weitgehend Fußgängerzonen oder Anwohnern vorbehalten. Versuchen Sie nicht, dort zu parken: Nutzen Sie die ausgeschilderten Parkplätze und freien Zonen am Rand und gehen Sie zu Fuß hinein — höchstens zehn Minuten. Blaue Linien bedeuten gebührenpflichtig, gelbe Parkverbot, weiße kostenlos.",
      },
    ],
    faqTitle: "Fragen, die wirklich gestellt werden",
    faq: [
      {
        q: "Muss ich online vorauszahlen?",
        a: "Nein. Dieses Formular sendet nur Ihre Anfrage an die lokale Agentur. Sie antwortet mit einem Angebot und Sie bestätigen direkt mit ihr — keine Online-Zahlung auf dieser Seite, keine Karte nötig, um anzufragen.",
      },
      {
        q: "Kann ich bar bezahlen?",
        a: "Ja. Die Partneragentur akzeptiert Bargeld ebenso wie Karten. Sie zahlen bei der Abholung des Wagens oder wie mit der Agentur vereinbart.",
      },
      {
        q: "Welche Versicherung ist enthalten?",
        a: "Die Angebote der Agentur enthalten die nach griechischem Recht vorgeschriebene Haftpflicht, üblicherweise mit einer Kaskoversicherung (CDW) mit Selbstbeteiligung. Vollschutz ohne Selbstbeteiligung gibt es gegen einen täglichen Aufpreis — erwähnen Sie es im Anfragefeld, wenn Sie ein Angebot dafür möchten.",
      },
      {
        q: "Kann ich das Auto am Flughafen abholen?",
        a: "Ja. Abholung und Rückgabe am Flughafen Chania sind Standard — tragen Sie Ihre Flugnummer in das Formular ein, die Agentur verfolgt Verspätungen. Abholung in der Stadt Chania und im Westen ist ebenfalls möglich.",
      },
    ],
    breadcrumbHome: "Startseite",
    breadcrumbCarRental: "Mietwagen",
  },
  el: {
    h1: "Ενοικίαση αυτοκινήτου στην Κρήτη",
    intro:
      "Αυτή η φόρμα στέλνει το αίτημά σας σε ένα τοπικό γραφείο ενοικίασης με το οποίο πραγματικά συνεργαζόμαστε — το Auto Smart Car Rental στα Χανιά, με σαφή επισήμανση, τίποτα κρυφό. Το γραφείο σας απαντά απευθείας με προσφορά· πληρώνετε το γραφείο, και επί τόπου αν θέλετε, δεκτά μετρητά, καμία online προπληρωμή. Λαμβάνουμε προμήθεια από το γραφείο όταν γίνει μια ενοικίαση — η τιμή που πληρώνετε δεν αλλάζει εξαιτίας αυτού.",
    drivingTitle: "Οδήγηση στην Κρήτη: τι να ξέρετε πριν κλείσετε",
    driving: [
      {
        h: "Δίπλωμα και χαρτιά",
        p: "Ένα δίπλωμα οδήγησης ΕΕ ή ΕΟΧ αρκεί. Αν το δίπλωμά σας εκδόθηκε εκτός ΕΕ/ΕΟΧ, τα ελληνικά γραφεία και η αστυνομία μπορούν να ζητήσουν Διεθνή Άδεια Οδήγησης (IDP) μαζί με το εθνικό σας δίπλωμα — βγάλτε την πριν ταξιδέψετε, δεν εκδίδεται στην Ελλάδα. Τα περισσότερα γραφεία ζητούν ελάχιστη ηλικία 21 έως 23 ετών και τουλάχιστον έναν χρόνο οδηγικής εμπειρίας.",
      },
      {
        h: "Η ασφάλεια, με απλά λόγια",
        p: "Οι προσφορές περιλαμβάνουν συνήθως την υποχρεωτική αστική ευθύνη και μικτή ασφάλεια (CDW) με απαλλαγή: σε περίπτωση ζημιάς πληρώνετε έως το ποσό της απαλλαγής, όχι όλη την επισκευή. Η πλήρης κάλυψη μηδενίζει ή σχεδόν μηδενίζει την απαλλαγή για λίγα ευρώ παραπάνω την ημέρα. Διαβάστε τι εξαιρείται — συχνά ελαστικά, κάτω μέρος, καθρέφτες και χωματόδρομοι — και ρωτήστε το γραφείο απευθείας, απαντούν.",
      },
      {
        h: "Ορεινοί δρόμοι και κατσίκες",
        p: "Η ενδοχώρα της Κρήτης είναι χώρα φουρκετών: στενές λωρίδες, τυφλές στροφές και κατσίκες που θεωρούν την άσφαλτο δική τους. Κορνάρετε σύντομα πριν από κλειστές τυφλές στροφές, αφήστε τους ντόπιους να περάσουν και βάλτε καύσιμα πριν ανεβείτε στα βουνά — τα βενζινάδικα αραιώνουν νότια του κεντρικού άξονα. Ένα μικρό αυτοκίνητο είναι ειλικρινά πιο εύκολο στα σοκάκια των χωριών από ένα μεγάλο SUV.",
      },
      {
        h: "Παρκάρισμα στις παλιές πόλεις",
        p: "Οι παλιές πόλεις των Χανίων, του Ρεθύμνου και του Ηρακλείου είναι σε μεγάλο βαθμό πεζόδρομοι ή μόνο για κατοίκους. Μην προσπαθήσετε να παρκάρετε μέσα: χρησιμοποιήστε τα σηματοδοτημένα πληρωμένα πάρκινγκ και τις δωρεάν ζώνες στις παρυφές και περπατήστε — δέκα λεπτά το πολύ. Μπλε γραμμές σημαίνουν πληρωμένη στάθμευση, κίτρινες απαγόρευση, λευκές δωρεάν.",
      },
    ],
    faqTitle: "Ερωτήσεις που πραγματικά γίνονται",
    faq: [
      {
        q: "Πρέπει να προπληρώσω online;",
        a: "Όχι. Αυτή η φόρμα στέλνει μόνο το αίτημά σας στο τοπικό γραφείο. Σας απαντά με προσφορά και επιβεβαιώνετε απευθείας μαζί του — καμία online πληρωμή σε αυτήν τη σελίδα, δεν χρειάζεται κάρτα για να ρωτήσετε.",
      },
      {
        q: "Μπορώ να πληρώσω με μετρητά;",
        a: "Ναι. Το συνεργαζόμενο γραφείο δέχεται μετρητά όπως και κάρτες. Πληρώνετε κατά την παραλαβή του αυτοκινήτου ή όπως συμφωνήσετε με το γραφείο.",
      },
      {
        q: "Ποια ασφάλεια περιλαμβάνεται;",
        a: "Οι προσφορές του γραφείου περιλαμβάνουν την αστική ευθύνη που απαιτεί ο ελληνικός νόμος, συνήθως με μικτή ασφάλεια (CDW) με απαλλαγή. Πλήρης κάλυψη με μηδενική απαλλαγή διατίθεται με μικρή ημερήσια επιβάρυνση — ζητήστε την στις σημειώσεις του αιτήματος αν θέλετε να τιμολογηθεί.",
      },
      {
        q: "Μπορώ να παραλάβω το αυτοκίνητο στο αεροδρόμιο;",
        a: "Ναι. Η παραλαβή και επιστροφή στο αεροδρόμιο των Χανίων είναι στάνταρ — προσθέστε τον αριθμό πτήσης σας στη φόρμα και το γραφείο παρακολουθεί τις καθυστερήσεις. Παραλαβή στην πόλη των Χανίων και στα δυτικά είναι επίσης δυνατή.",
      },
    ],
    breadcrumbHome: "Αρχική",
    breadcrumbCarRental: "Ενοικίαση αυτοκινήτου",
  },
};

export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/car-rental"),
    openGraph: {
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/car-rental`,
      type: "website",
    },
  };
}

export default async function CarRentalPage(
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = L[locale] || L.en;
  const m = META[locale] || META.en;

  const schema = carRentalPageSchema({
    locale,
    pageTitle: m.title,
    description: m.desc,
    faqItems: t.faq,
    breadcrumbLabels: { home: t.breadcrumbHome, carRental: t.breadcrumbCarRental },
  });

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="mx-auto max-w-3xl px-4 pt-10 pb-14">
        {/* Contenu statique SSR : la page n'est jamais vide pour Google */}
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {t.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed m-0">
            {t.intro}
          </p>
        </header>

        {/* Île client : useSearchParams() exige un boundary Suspense (Next 16) */}
        <Suspense fallback={null}>
          <CarRentalWizard locale={locale} />
        </Suspense>

        {/* Section éditoriale : conduire en Crète, rédigée honnête */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">
            {t.drivingTitle}
          </h2>
          <div className="space-y-6">
            {t.driving.map((d) => (
              <div key={d.h}>
                <h3 className="font-heading font-bold text-lg text-text mb-1.5">{d.h}</h3>
                <p className="text-[15px] text-text-muted leading-relaxed m-0">{d.p}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ visible, miroir du JSON-LD FAQPage */}
        <section className="mt-12">
          <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">
            {t.faqTitle}
          </h2>
          <div className="space-y-3">
            {t.faq.map((f) => (
              <details key={f.q} className="card-base p-5">
                <summary className="font-heading font-bold text-text cursor-pointer">{f.q}</summary>
                <p className="mt-2 text-text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
