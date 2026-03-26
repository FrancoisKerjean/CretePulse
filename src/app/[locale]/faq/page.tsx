import type { Locale } from "@/lib/types";
import Link from "next/link";
import { Plane, Car, Waves, Sun, UtensilsCrossed, Globe, Banknote, Hotel } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Crete FAQ - 30+ Questions Answered About Visiting Crete | Crete Direct",
    desc: "Everything you need to know before visiting Crete: flights, beaches, food, weather, budget, safety and more. 30+ questions answered by locals.",
  },
  fr: {
    title: "FAQ Crète - 30+ Questions sur la Crète | Crete Direct",
    desc: "Tout ce qu'il faut savoir avant de visiter la Crète : vols, plages, cuisine, météo, budget, sécurité et plus. 30+ réponses par des locaux.",
  },
  de: {
    title: "Kreta FAQ - 30+ Fragen über Kreta beantwortet | Crete Direct",
    desc: "Alles was Sie vor Ihrem Kreta-Urlaub wissen müssen: Flüge, Strände, Essen, Wetter, Budget, Sicherheit. 30+ Antworten von Einheimischen.",
  },
  el: {
    title: "Συχνές Ερωτήσεις Κρήτη - 30+ Απαντήσεις | Crete Direct",
    desc: "Όλα όσα πρέπει να γνωρίζετε για την Κρήτη: πτήσεις, παραλίες, φαγητό, καιρός, budget, ασφάλεια. 30+ απαντήσεις.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const m = META[locale] || META.en;
  const url = `${BASE_URL}/${locale}/faq`;
  return {
    title: m.title,
    description: m.desc,
    alternates: { canonical: url },
    openGraph: { title: m.title, description: m.desc, url, type: "website" },
  };
}

interface FaqItem {
  q: string;
  a: string;
  link?: { href: string; label: string };
}

interface FaqSection {
  icon: React.ElementType;
  title: string;
  items: FaqItem[];
}

function getFaqSections(locale: string): FaqSection[] {
  return [
    {
      icon: Plane,
      title: locale === "fr" ? "Comment y aller" : locale === "de" ? "Anreise" : locale === "el" ? "Πώς να φτάσετε" : "Getting There",
      items: [
        {
          q: locale === "fr" ? "Comment se rendre en Crète ?" : locale === "de" ? "Wie komme ich nach Kreta?" : locale === "el" ? "Πώς φτάνω στην Κρήτη;" : "How do I get to Crete?",
          a: locale === "fr"
            ? "La Crète a deux aéroports internationaux : Héraklion (HER) à l'est et La Canée (CHQ) à l'ouest. Des vols directs relient la plupart des capitales européennes de mars à novembre."
            : locale === "de"
            ? "Kreta hat zwei internationale Flughäfen: Heraklion (HER) im Osten und Chania (CHQ) im Westen. Direktflüge gibt es von den meisten europäischen Hauptstädten von März bis November."
            : locale === "el"
            ? "Η Κρήτη έχει δύο διεθνή αεροδρόμια: Ηράκλειο (HER) στα ανατολικά και Χανιά (CHQ) στα δυτικά. Απευθείας πτήσεις από τις περισσότερες ευρωπαϊκές πρωτεύουσες, Μάρτιο-Νοέμβριο."
            : "Crete has two international airports: Heraklion (HER) in the east and Chania (CHQ) in the west. Direct flights connect most European capitals from March to November.",
        },
        {
          q: locale === "fr" ? "Quel aéroport choisir ?" : locale === "de" ? "Welchen Flughafen soll ich wählen?" : locale === "el" ? "Ποιο αεροδρόμιο να επιλέξω;" : "Which airport should I fly into?",
          a: locale === "fr"
            ? "Héraklion pour l'est et le centre de la Crète (Agios Nikolaos, Elounda, Matala). La Canée pour l'ouest (Rethymno, Falassarna, Balos). Les deux sont bien desservis en été."
            : locale === "de"
            ? "Heraklion für Ost- und Zentralkreta (Agios Nikolaos, Elounda, Matala). Chania für den Westen (Rethymno, Falassarna, Balos). Beide sind im Sommer gut angebunden."
            : locale === "el"
            ? "Ηράκλειο για ανατολική και κεντρική Κρήτη (Άγιος Νικόλαος, Ελούντα, Μάταλα). Χανιά για δυτική (Ρέθυμνο, Φαλάσαρνα, Μπάλος)."
            : "Fly into Heraklion for east and central Crete (Agios Nikolaos, Elounda, Matala). Choose Chania for the west (Rethymno, Falassarna, Balos). Both have good summer connections.",
        },
        {
          q: locale === "fr" ? "Peut-on venir en ferry depuis Athènes ?" : locale === "de" ? "Kann ich mit der Fähre von Athen kommen?" : locale === "el" ? "Μπορώ να έρθω με πλοίο από Αθήνα;" : "Can I take a ferry from Athens?",
          a: locale === "fr"
            ? "Oui, des ferries quotidiens relient le Pirée à Héraklion et La Canée (8-9h de nuit). Réservez à l'avance en été. Les cabines sont confortables et c'est une belle expérience."
            : locale === "de"
            ? "Ja, tägliche Fähren verbinden Piräus mit Heraklion und Chania (8-9 Stunden über Nacht). Im Sommer voraus buchen. Kabinen sind komfortabel."
            : locale === "el"
            ? "Ναι, καθημερινά πλοία συνδέουν τον Πειραιά με Ηράκλειο και Χανιά (8-9 ώρες νυχτερινά). Κρατήστε νωρίς το καλοκαίρι."
            : "Yes, daily overnight ferries connect Piraeus to Heraklion and Chania (8-9 hours). Book early in summer. Cabins are comfortable and it is a great experience.",
          link: { href: "/getting-around/athens-crete-ferry", label: locale === "fr" ? "Guide ferry Athènes-Crète" : locale === "de" ? "Fähre Athen-Kreta Guide" : "Athens-Crete ferry guide" },
        },
        {
          q: locale === "fr" ? "Combien coûte un vol vers la Crète ?" : locale === "de" ? "Was kostet ein Flug nach Kreta?" : locale === "el" ? "Πόσο κοστίζει μια πτήση στην Κρήτη;" : "How much does a flight to Crete cost?",
          a: locale === "fr"
            ? "Les vols low-cost démarrent à 30-60 EUR depuis l'Europe (Ryanair, easyJet). En haute saison (juillet-août), comptez 100-200 EUR. Réservez 2-3 mois à l'avance pour les meilleurs tarifs."
            : locale === "de"
            ? "Low-Cost-Flüge ab 30-60 EUR aus Europa (Ryanair, easyJet). In der Hochsaison (Juli-August) 100-200 EUR. 2-3 Monate voraus buchen für die besten Preise."
            : locale === "el"
            ? "Πτήσεις low-cost από 30-60 EUR από Ευρώπη. Υψηλή σεζόν (Ιούλιο-Αύγουστο) 100-200 EUR. Κράτηση 2-3 μήνες νωρίτερα."
            : "Budget flights start at 30-60 EUR from Europe (Ryanair, easyJet). High season (July-August) expect 100-200 EUR. Book 2-3 months ahead for best prices.",
        },
      ],
    },
    {
      icon: Car,
      title: locale === "fr" ? "Se déplacer" : locale === "de" ? "Fortbewegung" : locale === "el" ? "Μετακινήσεις" : "Getting Around",
      items: [
        {
          q: locale === "fr" ? "Ai-je besoin d'une voiture en Crète ?" : locale === "de" ? "Brauche ich ein Auto auf Kreta?" : locale === "el" ? "Χρειάζομαι αυτοκίνητο στην Κρήτη;" : "Do I need a car in Crete?",
          a: locale === "fr"
            ? "Fortement recommandé. La Crète fait 260 km d'est en ouest et les meilleures plages et villages sont souvent isolés. La location coûte 25-50 EUR/jour en saison."
            : locale === "de"
            ? "Sehr empfohlen. Kreta ist 260 km lang und die besten Strände und Dörfer sind oft abgelegen. Mietwagen kosten 25-50 EUR/Tag in der Saison."
            : locale === "el"
            ? "Συστήνεται ανεπιφύλακτα. Η Κρήτη είναι 260 χλμ. και οι καλύτερες παραλίες είναι συχνά απομακρυσμένες. Ενοικίαση 25-50 EUR/ημέρα."
            : "Highly recommended. Crete is 260 km from east to west and the best beaches and villages are often remote. Rental cars cost 25-50 EUR/day in season.",
        },
        {
          q: locale === "fr" ? "Le réseau de bus est-il fiable ?" : locale === "de" ? "Ist das Busnetz zuverlässig?" : locale === "el" ? "Είναι αξιόπιστο το δίκτυο λεωφορείων;" : "Is the bus system reliable?",
          a: locale === "fr"
            ? "KTEL dessert les grandes villes (Héraklion, Réthymno, La Canée, Agios Nikolaos) avec des bus fréquents. Les villages isolés ont moins de connexions. Vérifiez les horaires à l'avance."
            : locale === "de"
            ? "KTEL verbindet die Hauptstädte (Heraklion, Rethymno, Chania, Agios Nikolaos) regelmäßig. Abgelegene Dörfer haben weniger Verbindungen. Fahrpläne vorher prüfen."
            : locale === "el"
            ? "Το ΚΤΕΛ συνδέει τις κύριες πόλεις τακτικά. Τα απομακρυσμένα χωριά έχουν λιγότερα δρομολόγια. Ελέγξτε τα ωράρια εκ των προτέρων."
            : "KTEL buses connect major cities (Heraklion, Rethymno, Chania, Agios Nikolaos) frequently. Remote villages have fewer connections. Check schedules ahead of time.",
          link: { href: "/buses", label: locale === "fr" ? "Horaires des bus" : locale === "de" ? "Busfahrpläne" : "Bus schedules" },
        },
        {
          q: locale === "fr" ? "Combien coûte un taxi ?" : locale === "de" ? "Was kostet ein Taxi?" : locale === "el" ? "Πόσο κοστίζει ένα ταξί;" : "How much do taxis cost?",
          a: locale === "fr"
            ? "Les taxis ont un compteur officiel. Comptez environ 1,20 EUR/km. Héraklion aéroport vers le centre : ~15 EUR. Les trajets longue distance se négocient à l'avance."
            : locale === "de"
            ? "Taxis haben einen offiziellen Taxameter. Etwa 1,20 EUR/km. Flughafen Heraklion ins Zentrum: ~15 EUR. Längere Strecken vorher verhandeln."
            : locale === "el"
            ? "Τα ταξί έχουν ταξίμετρο. Περίπου 1,20 EUR/χλμ. Αεροδρόμιο Ηρακλείου προς κέντρο: ~15 EUR."
            : "Taxis use an official meter. Expect about 1.20 EUR/km. Heraklion airport to city center is around 15 EUR. Negotiate longer distances in advance.",
        },
        {
          q: locale === "fr" ? "Les routes sont-elles en bon état ?" : locale === "de" ? "Sind die Straßen in gutem Zustand?" : locale === "el" ? "Είναι οι δρόμοι σε καλή κατάσταση;" : "Are the roads in good condition?",
          a: locale === "fr"
            ? "Les routes principales (nationale nord) sont bonnes. Les routes de montagne et les pistes vers les plages isolées peuvent être étroites et sinueuses. Un véhicule haut est utile mais pas obligatoire."
            : locale === "de"
            ? "Hauptstraßen (Nordküste) sind gut. Bergstraßen und Wege zu abgelegenen Stränden können eng und kurvig sein. Ein SUV ist hilfreich, aber nicht zwingend."
            : locale === "el"
            ? "Οι κύριοι δρόμοι είναι καλοί. Ορεινοί δρόμοι και μονοπάτια προς απομακρυσμένες παραλίες μπορεί να είναι στενοί. SUV χρήσιμο αλλά όχι απαραίτητο."
            : "Main highways (north coast road) are good. Mountain roads and tracks to remote beaches can be narrow and winding. A high vehicle is helpful but not mandatory.",
        },
      ],
    },
    {
      icon: Waves,
      title: locale === "fr" ? "Plages" : locale === "de" ? "Strände" : locale === "el" ? "Παραλίες" : "Beaches",
      items: [
        {
          q: locale === "fr" ? "Quelles sont les plus belles plages de Crète ?" : locale === "de" ? "Was sind die schönsten Strände auf Kreta?" : locale === "el" ? "Ποιες είναι οι καλύτερες παραλίες της Κρήτης;" : "What are the best beaches in Crete?",
          a: locale === "fr"
            ? "Balos et Elafonissi (ouest) pour le sable rose et les eaux turquoise. Vai (est) pour la palmeraie. Preveli (sud) pour le cadre sauvage. Seitan Limania (nord) pour l'aventure."
            : locale === "de"
            ? "Balos und Elafonissi (Westen) für rosa Sand und türkises Wasser. Vai (Osten) für den Palmenstrand. Preveli (Süden) für wilde Natur. Seitan Limania (Norden) für Abenteuer."
            : locale === "el"
            ? "Μπάλος και Ελαφονήσι (δυτικά) για ροζ άμμο. Βάι (ανατολικά) για φοινικόδασος. Πρέβελη (νότια) για άγρια φύση. Σεϊτάν Λιμάνια (βόρεια) για περιπέτεια."
            : "Balos and Elafonissi (west) for pink sand and turquoise water. Vai (east) for the palm forest beach. Preveli (south) for wild scenery. Seitan Limania (north) for adventure.",
          link: { href: "/beaches", label: locale === "fr" ? "Toutes les plages" : locale === "de" ? "Alle Strände" : "All beaches" },
        },
        {
          q: locale === "fr" ? "Y a-t-il des plages de sable rose en Crète ?" : locale === "de" ? "Gibt es rosa Sandstrände auf Kreta?" : locale === "el" ? "Υπάρχουν παραλίες με ροζ άμμο στην Κρήτη;" : "Are there pink sand beaches in Crete?",
          a: locale === "fr"
            ? "Oui ! Elafonissi et Balos sont célèbres pour leurs reflets roses, créés par des fragments de coquillages. Le rose est plus visible tôt le matin et au coucher du soleil, surtout en mai-juin."
            : locale === "de"
            ? "Ja! Elafonissi und Balos sind berühmt für ihren rosa Schimmer, der von zerkleinerten Muscheln stammt. Am besten sichtbar morgens und bei Sonnenuntergang, besonders Mai-Juni."
            : locale === "el"
            ? "Ναι! Ελαφονήσι και Μπάλος φημίζονται για τη ροζ άμμο τους, από θρυμματισμένα κοχύλια. Πιο ορατό πρωί και ηλιοβασίλεμα, ιδιαίτερα Μάιο-Ιούνιο."
            : "Yes! Elafonissi and Balos are famous for their pink-tinged sand, created by crushed shells. The pink hue is most visible early morning and at sunset, especially in May-June.",
        },
        {
          q: locale === "fr" ? "Y a-t-il des plages nudistes en Crète ?" : locale === "de" ? "Gibt es FKK-Strände auf Kreta?" : locale === "el" ? "Υπάρχουν παραλίες γυμνισμού στην Κρήτη;" : "Are there nudist beaches in Crete?",
          a: locale === "fr"
            ? "Le nudisme est toléré sur de nombreuses plages isolées. Les plages connues incluent Filaki (Loutro), Red Beach (Matala) et Lissos. Respectez les habitudes locales et soyez discret."
            : locale === "de"
            ? "FKK wird an vielen abgelegenen Stränden toleriert. Bekannte Strände: Filaki (Loutro), Red Beach (Matala) und Lissos. Lokale Gewohnheiten respektieren."
            : locale === "el"
            ? "Ο γυμνισμός γίνεται ανεκτός σε πολλές απομακρυσμένες παραλίες. Γνωστές: Φιλακή (Λουτρό), Κόκκινη Άμμος (Μάταλα), Λισσός."
            : "Nudism is tolerated on many secluded beaches. Well-known spots include Filaki (Loutro), Red Beach (Matala) and Lissos. Respect local customs and be discreet.",
        },
        {
          q: locale === "fr" ? "Peut-on se baigner en octobre ?" : locale === "de" ? "Kann man im Oktober schwimmen?" : locale === "el" ? "Μπορώ να κολυμπήσω τον Οκτώβριο;" : "Can you swim in October?",
          a: locale === "fr"
            ? "Oui, la mer reste à 22-24°C en octobre, parfait pour la baignade. La température baisse vers fin novembre. Le sud de la Crète est généralement plus chaud que le nord."
            : locale === "de"
            ? "Ja, das Meer hat im Oktober noch 22-24°C, perfekt zum Schwimmen. Die Temperatur sinkt Ende November. Südkreta ist generell wärmer als der Norden."
            : locale === "el"
            ? "Ναι, η θάλασσα παραμένει 22-24°C τον Οκτώβριο, ιδανική για κολύμβηση. Η νότια Κρήτη είναι γενικά θερμότερη."
            : "Yes, the sea stays at 22-24°C in October, perfect for swimming. Water temperature drops by late November. South Crete is generally warmer than the north.",
          link: { href: "/visit/october", label: locale === "fr" ? "Crète en octobre" : locale === "de" ? "Kreta im Oktober" : "Crete in October" },
        },
      ],
    },
    {
      icon: Sun,
      title: locale === "fr" ? "Météo" : locale === "de" ? "Wetter" : locale === "el" ? "Καιρός" : "Weather",
      items: [
        {
          q: locale === "fr" ? "Quelle est la meilleure période pour visiter la Crète ?" : locale === "de" ? "Wann ist die beste Reisezeit für Kreta?" : locale === "el" ? "Ποια είναι η καλύτερη περίοδος για Κρήτη;" : "When is the best time to visit Crete?",
          a: locale === "fr"
            ? "Mai-juin et septembre-octobre sont idéaux : beau temps, moins de monde, prix modérés. Juillet-août est chaud (35°C+) et très fréquenté. L'hiver est doux (12-16°C) avec de la pluie."
            : locale === "de"
            ? "Mai-Juni und September-Oktober sind ideal: schönes Wetter, weniger Touristen, moderate Preise. Juli-August ist heiß (35°C+). Winter ist mild (12-16°C) mit Regen."
            : locale === "el"
            ? "Μάιος-Ιούνιος και Σεπτέμβριος-Οκτώβριος ιδανικοί: καλός καιρός, λιγότερος κόσμος. Ιούλιος-Αύγουστος ζεστός (35°C+). Χειμώνας ήπιος (12-16°C)."
            : "May-June and September-October are ideal: great weather, fewer crowds, moderate prices. July-August is hot (35°C+) and very busy. Winter is mild (12-16°C) with rain.",
          link: { href: "/weather", label: locale === "fr" ? "Météo en direct" : locale === "de" ? "Live-Wetter" : "Live weather" },
        },
        {
          q: locale === "fr" ? "Quelle chaleur fait-il en été ?" : locale === "de" ? "Wie heiß wird es im Sommer?" : locale === "el" ? "Πόσο ζεστά κάνει το καλοκαίρι;" : "How hot does it get in summer?",
          a: locale === "fr"
            ? "Juillet-août atteignent régulièrement 35-40°C. L'humidité est basse, ce qui rend la chaleur supportable. Le Meltemi (vent du nord) rafraîchit les côtes nord. Emportez crème solaire et chapeau."
            : locale === "de"
            ? "Juli-August erreichen regelmäßig 35-40°C. Niedrige Luftfeuchtigkeit macht es erträglich. Der Meltemi (Nordwind) kühlt die Nordküste. Sonnencreme und Hut mitnehmen."
            : locale === "el"
            ? "Ιούλιος-Αύγουστος φτάνουν τακτικά 35-40°C. Χαμηλή υγρασία. Ο Μελτέμι δροσίζει τις βόρειες ακτές. Αντηλιακό και καπέλο απαραίτητα."
            : "July-August regularly reaches 35-40°C. Low humidity makes it bearable. The Meltemi (north wind) cools the north coast. Pack sunscreen and a hat.",
        },
        {
          q: locale === "fr" ? "Pleut-il en Crète ?" : locale === "de" ? "Regnet es auf Kreta?" : locale === "el" ? "Βρέχει στην Κρήτη;" : "Does it rain in Crete?",
          a: locale === "fr"
            ? "Très peu de mai à septembre (quasi zéro en juillet-août). L'hiver (novembre-mars) apporte des pluies modérées, surtout à l'ouest et en montagne. Les étés sont parmi les plus secs d'Europe."
            : locale === "de"
            ? "Kaum Regen von Mai bis September (fast null im Juli-August). Winter (November-März) bringt moderaten Regen, besonders im Westen. Sommer sind unter den trockensten Europas."
            : locale === "el"
            ? "Ελάχιστη βροχή Μάιο-Σεπτέμβριο. Χειμώνας (Νοέμβριος-Μάρτιος) μέτριες βροχές, κυρίως δυτικά. Τα καλοκαίρια από τα πιο ξηρά της Ευρώπης."
            : "Very little rain from May to September (near zero in July-August). Winter (November-March) brings moderate rain, mainly in the west and mountains. Summers are among the driest in Europe.",
        },
        {
          q: locale === "fr" ? "Peut-on visiter la Crète en hiver ?" : locale === "de" ? "Kann man Kreta im Winter besuchen?" : locale === "el" ? "Μπορώ να επισκεφτώ την Κρήτη τον χειμώνα;" : "Can I visit Crete in winter?",
          a: locale === "fr"
            ? "Absolument. L'hiver est doux (12-16°C), parfait pour la randonnée et les visites culturelles. Les prix sont très bas, les touristes rares. Certaines plages du sud permettent la baignade même en décembre."
            : locale === "de"
            ? "Unbedingt. Winter ist mild (12-16°C), perfekt zum Wandern und für Kultur. Preise sind sehr niedrig, kaum Touristen. Manche Südstrände erlauben Baden sogar im Dezember."
            : locale === "el"
            ? "Απολύτως. Ο χειμώνας είναι ήπιος (12-16°C), ιδανικός για πεζοπορία. Χαμηλές τιμές, λίγοι τουρίστες. Κάποιες νότιες παραλίες επιτρέπουν κολύμβηση."
            : "Absolutely. Winter is mild (12-16°C), perfect for hiking and cultural visits. Prices are very low and tourists are rare. Some south coast beaches allow swimming even in December.",
        },
      ],
    },
    {
      icon: UtensilsCrossed,
      title: locale === "fr" ? "Cuisine" : locale === "de" ? "Essen" : locale === "el" ? "Φαγητό" : "Food",
      items: [
        {
          q: locale === "fr" ? "Qu'est-ce que la cuisine crétoise ?" : locale === "de" ? "Was ist kretische Küche?" : locale === "el" ? "Τι είναι η κρητική κουζίνα;" : "What is Cretan food like?",
          a: locale === "fr"
            ? "La cuisine crétoise est la base du régime méditerranéen : huile d'olive, légumes frais, fromage (graviera, mizithra), agneau, poisson, miel. Simple, fraîche et exceptionnelle."
            : locale === "de"
            ? "Kretische Küche bildet die Basis der Mittelmeerdiät: Olivenöl, frisches Gemüse, Käse (Graviera, Mizithra), Lamm, Fisch, Honig. Einfach, frisch und hervorragend."
            : locale === "el"
            ? "Η κρητική κουζίνα αποτελεί τη βάση της μεσογειακής διατροφής: ελαιόλαδο, φρέσκα λαχανικά, τυρί (γραβιέρα, μυζήθρα), αρνί, ψάρι, μέλι."
            : "Cretan cuisine is the foundation of the Mediterranean diet: olive oil, fresh vegetables, local cheese (graviera, mizithra), lamb, fish, and honey. Simple, fresh and exceptional.",
          link: { href: "/food", label: locale === "fr" ? "Guide culinaire" : locale === "de" ? "Food Guide" : "Food guide" },
        },
        {
          q: locale === "fr" ? "Y a-t-il des options végétariennes ?" : locale === "de" ? "Gibt es vegetarische Optionen?" : locale === "el" ? "Υπάρχουν χορτοφαγικές επιλογές;" : "Are there vegetarian options?",
          a: locale === "fr"
            ? "Oui, la cuisine crétoise offre naturellement beaucoup d'options végétariennes : dakos, boureki, dolmades, gemista (légumes farcis), salades, fromages locaux et légumineuses."
            : locale === "de"
            ? "Ja, kretische Küche bietet viele vegetarische Optionen: Dakos, Boureki, Dolmades, Gemista (gefülltes Gemüse), Salate, lokale Käsesorten und Hülsenfrüchte."
            : locale === "el"
            ? "Ναι, η κρητική κουζίνα προσφέρει πολλές χορτοφαγικές επιλογές: ντάκος, μπουρέκι, ντολμαδάκια, γεμιστά, σαλάτες, τοπικά τυριά."
            : "Yes, Cretan cuisine naturally offers many vegetarian options: dakos, boureki, dolmades, gemista (stuffed vegetables), salads, local cheeses and legumes.",
        },
        {
          q: locale === "fr" ? "Doit-on laisser un pourboire ?" : locale === "de" ? "Gibt man Trinkgeld?" : locale === "el" ? "Πρέπει να αφήσω φιλοδώρημα;" : "Should I tip in restaurants?",
          a: locale === "fr"
            ? "Le pourboire n'est pas obligatoire mais apprécié. 5-10% pour un bon service est la norme. Les tavernes familiales apprécient particulièrement ce geste. Laissez en espèces."
            : locale === "de"
            ? "Trinkgeld ist nicht Pflicht, aber willkommen. 5-10% für guten Service ist üblich. Familientavernen schätzen es besonders. Bar hinterlassen."
            : locale === "el"
            ? "Το φιλοδώρημα δεν είναι υποχρεωτικό αλλά εκτιμάται. 5-10% για καλό σέρβις. Οι οικογενειακές ταβέρνες το εκτιμούν ιδιαίτερα."
            : "Tipping is not mandatory but appreciated. 5-10% for good service is standard. Family-run tavernas especially appreciate the gesture. Leave cash on the table.",
        },
        {
          q: locale === "fr" ? "Combien coûte un repas ?" : locale === "de" ? "Was kostet ein Essen?" : locale === "el" ? "Πόσο κοστίζει ένα γεύμα;" : "How much does a meal cost?",
          a: locale === "fr"
            ? "Un repas complet en taverne coûte 10-18 EUR par personne. Un café frappé : 2-3,50 EUR. Un gyros pita : 3-4 EUR. La Crète est plus abordable que les Cyclades."
            : locale === "de"
            ? "Ein komplettes Tavernenessen kostet 10-18 EUR/Person. Frappé: 2-3,50 EUR. Gyros Pita: 3-4 EUR. Kreta ist günstiger als die Kykladen."
            : locale === "el"
            ? "Ένα πλήρες γεύμα σε ταβέρνα κοστίζει 10-18 EUR/άτομο. Φραπέ: 2-3,50 EUR. Γύρος πίτα: 3-4 EUR."
            : "A full taverna meal costs 10-18 EUR per person. A frappe coffee runs 2-3.50 EUR. A gyros pita is 3-4 EUR. Crete is more affordable than the Cyclades.",
        },
      ],
    },
    {
      icon: Globe,
      title: locale === "fr" ? "Culture et sécurité" : locale === "de" ? "Kultur & Sicherheit" : locale === "el" ? "Πολιτισμός & Ασφάλεια" : "Culture & Safety",
      items: [
        {
          q: locale === "fr" ? "Quelle langue parle-t-on ?" : locale === "de" ? "Welche Sprache wird gesprochen?" : locale === "el" ? "Τι γλώσσα μιλάνε;" : "What language do they speak?",
          a: locale === "fr"
            ? "Le grec est la langue officielle, mais l'anglais est très répandu dans les zones touristiques. L'allemand est aussi courant dans certaines régions. Quelques mots de grec sont toujours appréciés."
            : locale === "de"
            ? "Griechisch ist die Amtssprache, aber Englisch ist in touristischen Gebieten weit verbreitet. Deutsch wird auch in einigen Regionen gesprochen. Ein paar Worte Griechisch werden immer geschätzt."
            : locale === "el"
            ? "Τα ελληνικά είναι η επίσημη γλώσσα. Τα αγγλικά είναι ευρέως διαδεδομένα στις τουριστικές περιοχές. Λίγα λόγια ελληνικά εκτιμούνται πάντα."
            : "Greek is the official language, but English is widely spoken in tourist areas. German is also common in some regions. A few Greek words are always appreciated by locals.",
        },
        {
          q: locale === "fr" ? "La Crète est-elle sûre ?" : locale === "de" ? "Ist Kreta sicher?" : locale === "el" ? "Είναι ασφαλής η Κρήτη;" : "Is Crete safe?",
          a: locale === "fr"
            ? "La Crète est l'une des destinations les plus sûres d'Europe. Le taux de criminalité est très bas. Les Crétois sont réputés pour leur hospitalité. Les précautions habituelles suffisent."
            : locale === "de"
            ? "Kreta ist eines der sichersten Reiseziele Europas. Die Kriminalitätsrate ist sehr niedrig. Kreter sind bekannt für ihre Gastfreundschaft. Normale Vorsichtsmaßnahmen genügen."
            : locale === "el"
            ? "Η Κρήτη είναι από τους ασφαλέστερους προορισμούς στην Ευρώπη. Πολύ χαμηλό ποσοστό εγκληματικότητας. Η κρητική φιλοξενία είναι φημισμένη."
            : "Crete is one of the safest destinations in Europe. Crime rates are very low. Cretans are renowned for their hospitality. Standard travel precautions are sufficient.",
        },
        {
          q: locale === "fr" ? "Peut-on boire l'eau du robinet ?" : locale === "de" ? "Kann man Leitungswasser trinken?" : locale === "el" ? "Μπορώ να πιω νερό βρύσης;" : "Can I drink tap water?",
          a: locale === "fr"
            ? "L'eau du robinet est potable dans les grandes villes mais souvent calcaire. La plupart des visiteurs préfèrent l'eau en bouteille (0,50 EUR la bouteille de 1,5L). Remplissez aux fontaines de village."
            : locale === "de"
            ? "Leitungswasser ist in Städten trinkbar, aber oft kalkhaltig. Die meisten Besucher bevorzugen Flaschenwasser (0,50 EUR/1,5L). An Dorfbrunnen nachfüllen."
            : locale === "el"
            ? "Το νερό βρύσης είναι πόσιμο στις πόλεις αλλά συχνά σκληρό. Οι περισσότεροι προτιμούν εμφιαλωμένο (0,50 EUR/1,5L)."
            : "Tap water is drinkable in cities but often hard. Most visitors prefer bottled water (0.50 EUR for a 1.5L bottle). Village fountains often have excellent spring water.",
        },
        {
          q: locale === "fr" ? "Comment est le système de santé ?" : locale === "de" ? "Wie ist die Gesundheitsversorgung?" : locale === "el" ? "Πώς είναι η υγειονομική περίθαλψη;" : "What about healthcare?",
          a: locale === "fr"
            ? "La Crète a des hôpitaux à Héraklion, La Canée et Réthymno, plus des centres de santé dans les petites villes. La CEAM européenne est acceptée. Une assurance voyage est recommandée."
            : locale === "de"
            ? "Kreta hat Krankenhäuser in Heraklion, Chania und Rethymno sowie Gesundheitszentren in kleinen Städten. EHIC wird akzeptiert. Reiseversicherung empfohlen."
            : locale === "el"
            ? "Η Κρήτη έχει νοσοκομεία σε Ηράκλειο, Χανιά, Ρέθυμνο και κέντρα υγείας σε μικρότερες πόλεις. Η ΕΚΑΑ γίνεται δεκτή."
            : "Crete has hospitals in Heraklion, Chania and Rethymno, plus health centers in smaller towns. European EHIC cards are accepted. Travel insurance is recommended.",
        },
      ],
    },
    {
      icon: Banknote,
      title: locale === "fr" ? "Argent" : locale === "de" ? "Geld" : locale === "el" ? "Χρήματα" : "Money",
      items: [
        {
          q: locale === "fr" ? "Quelle est la monnaie en Crète ?" : locale === "de" ? "Welche Währung gibt es auf Kreta?" : locale === "el" ? "Ποιο είναι το νόμισμα στην Κρήτη;" : "What currency is used in Crete?",
          a: locale === "fr"
            ? "L'euro (EUR). La Grèce fait partie de la zone euro depuis 2001. Pas de change nécessaire pour les visiteurs européens."
            : locale === "de"
            ? "Der Euro (EUR). Griechenland ist seit 2001 in der Eurozone. Kein Geldwechsel nötig für europäische Besucher."
            : locale === "el"
            ? "Το ευρώ (EUR). Η Ελλάδα είναι στην ευρωζώνη από το 2001."
            : "The euro (EUR). Greece has been in the eurozone since 2001. No currency exchange needed for European visitors.",
        },
        {
          q: locale === "fr" ? "Trouve-t-on facilement des distributeurs ?" : locale === "de" ? "Gibt es überall Geldautomaten?" : locale === "el" ? "Υπάρχουν παντού ATM;" : "Are ATMs easy to find?",
          a: locale === "fr"
            ? "Oui, dans toutes les villes et la plupart des villages touristiques. Prévoyez du liquide pour les villages isolés et les petites tavernes qui n'acceptent pas la carte."
            : locale === "de"
            ? "Ja, in allen Städten und den meisten touristischen Dörfern. Bargeld mitnehmen für abgelegene Dörfer und kleine Tavernen ohne Kartenleser."
            : locale === "el"
            ? "Ναι, σε όλες τις πόλεις και τα περισσότερα τουριστικά χωριά. Μετρητά για απομακρυσμένα χωριά."
            : "Yes, in all towns and most tourist villages. Carry cash for remote villages and small tavernas that may not accept cards.",
        },
        {
          q: locale === "fr" ? "Peut-on payer par carte ?" : locale === "de" ? "Kann ich mit Karte zahlen?" : locale === "el" ? "Μπορώ να πληρώσω με κάρτα;" : "Are credit cards widely accepted?",
          a: locale === "fr"
            ? "Oui, dans les hôtels, restaurants et commerces touristiques. Les petites tavernes de village et marchés préfèrent souvent le liquide. Visa et Mastercard sont universellement acceptés."
            : locale === "de"
            ? "Ja, in Hotels, Restaurants und touristischen Geschäften. Kleine Dorftavernen und Märkte bevorzugen oft Bargeld. Visa und Mastercard werden überall akzeptiert."
            : locale === "el"
            ? "Ναι, σε ξενοδοχεία, εστιατόρια και τουριστικά καταστήματα. Μικρές ταβέρνες προτιμούν μετρητά. Visa και Mastercard παντού."
            : "Yes, in hotels, restaurants and tourist shops. Small village tavernas and markets often prefer cash. Visa and Mastercard are universally accepted.",
        },
        {
          q: locale === "fr" ? "Quel budget quotidien prévoir ?" : locale === "de" ? "Wie hoch ist das tägliche Budget?" : locale === "el" ? "Τι ημερήσιο budget χρειάζομαι;" : "What is the average daily budget?",
          a: locale === "fr"
            ? "Budget serré : 50-70 EUR/jour (chambres d'hôtes, tavernes, bus). Confort : 100-150 EUR/jour (hôtel 3*, location voiture, restaurants). Luxe : 200+ EUR/jour (resort, activités, gastronomie)."
            : locale === "de"
            ? "Sparsam: 50-70 EUR/Tag (Pensionen, Tavernen, Bus). Komfort: 100-150 EUR/Tag (3*-Hotel, Mietwagen, Restaurants). Luxus: 200+ EUR/Tag (Resort, Aktivitäten)."
            : locale === "el"
            ? "Οικονομικά: 50-70 EUR/ημέρα. Άνετα: 100-150 EUR/ημέρα (ξενοδοχείο 3*, ενοικίαση αυτοκινήτου). Πολυτέλεια: 200+ EUR/ημέρα."
            : "Budget: 50-70 EUR/day (guesthouses, tavernas, buses). Comfort: 100-150 EUR/day (3-star hotel, rental car, restaurants). Luxury: 200+ EUR/day (resort, activities, fine dining).",
        },
      ],
    },
    {
      icon: Hotel,
      title: locale === "fr" ? "Hébergement" : locale === "de" ? "Unterkunft" : locale === "el" ? "Διαμονή" : "Accommodation",
      items: [
        {
          q: locale === "fr" ? "Où séjourner en Crète ?" : locale === "de" ? "Wo übernachten auf Kreta?" : locale === "el" ? "Πού να μείνω στην Κρήτη;" : "Where should I stay in Crete?",
          a: locale === "fr"
            ? "Héraklion et La Canée pour la vie urbaine et les restaurants. Rethymno pour le charme vénitien. Agios Nikolaos et Elounda pour le luxe. Le sud pour le calme et l'authenticité."
            : locale === "de"
            ? "Heraklion und Chania für Stadtleben. Rethymno für venezianischen Charme. Agios Nikolaos und Elounda für Luxus. Der Süden für Ruhe und Authentizität."
            : locale === "el"
            ? "Ηράκλειο και Χανιά για αστική ζωή. Ρέθυμνο για βενετσιάνικη γοητεία. Άγιος Νικόλαος και Ελούντα για πολυτέλεια. Νότος για ηρεμία."
            : "Heraklion and Chania for city life and dining. Rethymno for Venetian charm. Agios Nikolaos and Elounda for luxury. The south coast for peace and authenticity.",
          link: { href: "/where-to-stay", label: locale === "fr" ? "Guide hébergement" : locale === "de" ? "Unterkunftsguide" : "Accommodation guide" },
        },
        {
          q: locale === "fr" ? "Hôtel ou Airbnb ?" : locale === "de" ? "Hotel oder Airbnb?" : locale === "el" ? "Ξενοδοχείο ή Airbnb;" : "Hotel or Airbnb?",
          a: locale === "fr"
            ? "Les deux sont excellents. Les hôtels offrent le confort et les services. Les Airbnb permettent de vivre comme un local et sont souvent moins chers pour les familles et les longs séjours."
            : locale === "de"
            ? "Beides ist gut. Hotels bieten Komfort und Service. Airbnbs ermöglichen Leben wie Einheimische und sind oft günstiger für Familien und längere Aufenthalte."
            : locale === "el"
            ? "Και τα δύο εξαιρετικά. Τα ξενοδοχεία προσφέρουν άνεση. Τα Airbnb επιτρέπουν να ζήσεις σαν ντόπιος, συχνά πιο οικονομικά για οικογένειες."
            : "Both are excellent options. Hotels offer comfort and services. Airbnbs let you live like a local and are often cheaper for families and longer stays.",
        },
        {
          q: locale === "fr" ? "Combien coûte l'hébergement ?" : locale === "de" ? "Was kostet die Unterkunft?" : locale === "el" ? "Πόσο κοστίζει η διαμονή;" : "What are average accommodation prices?",
          a: locale === "fr"
            ? "Chambre d'hôtes : 30-60 EUR/nuit. Hôtel 3* : 60-120 EUR/nuit. Airbnb entier : 50-150 EUR/nuit. Resort 5* : 200-500 EUR/nuit. Les prix baissent de 30-50% hors saison."
            : locale === "de"
            ? "Pension: 30-60 EUR/Nacht. 3*-Hotel: 60-120 EUR/Nacht. Ganzes Airbnb: 50-150 EUR/Nacht. 5*-Resort: 200-500 EUR/Nacht. Nebensaison 30-50% günstiger."
            : locale === "el"
            ? "Πανσιόν: 30-60 EUR/βράδυ. Ξενοδοχείο 3*: 60-120 EUR. Airbnb: 50-150 EUR. Resort 5*: 200-500 EUR. Εκτός σεζόν 30-50% φθηνότερα."
            : "Guesthouses: 30-60 EUR/night. 3-star hotel: 60-120 EUR/night. Whole Airbnb: 50-150 EUR/night. 5-star resort: 200-500 EUR/night. Off-season prices drop 30-50%.",
        },
        {
          q: locale === "fr" ? "Faut-il réserver à l'avance ?" : locale === "de" ? "Muss ich im Voraus buchen?" : locale === "el" ? "Πρέπει να κλείσω νωρίς;" : "Do I need to book in advance?",
          a: locale === "fr"
            ? "En juillet-août, réservez 2-3 mois à l'avance, surtout pour les logements populaires. En mai-juin et septembre-octobre, 2-4 semaines suffisent. En hiver, vous trouverez facilement sur place."
            : locale === "de"
            ? "Im Juli-August 2-3 Monate voraus buchen, besonders für beliebte Unterkünfte. Mai-Juni und September-Oktober reichen 2-4 Wochen. Im Winter findet man leicht vor Ort."
            : locale === "el"
            ? "Ιούλιο-Αύγουστο κλείστε 2-3 μήνες πριν. Μάιο-Ιούνιο και Σεπτέμβριο-Οκτώβριο αρκούν 2-4 εβδομάδες. Χειμώνα βρίσκετε εύκολα."
            : "In July-August, book 2-3 months ahead, especially for popular properties. In May-June and September-October, 2-4 weeks is fine. In winter, you can easily find accommodation on arrival.",
        },
      ],
    },
  ];
}

function getAllFaqItems(locale: string): FaqItem[] {
  return getFaqSections(locale).flatMap((s) => s.items);
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = locale as Locale;
  const sections = getFaqSections(locale);
  const allItems = getAllFaqItems(locale);

  const pageTitle: Record<Locale, string> = {
    en: "Frequently Asked Questions About Crete",
    fr: "Questions Fréquentes sur la Crète",
    de: "Häufige Fragen über Kreta",
    el: "Συχνές Ερωτήσεις για την Κρήτη",
  };

  const pageSubtitle: Record<Locale, string> = {
    en: "Everything you need to know before visiting Crete, answered by locals.",
    fr: "Tout ce qu'il faut savoir avant de visiter la Crète, répondu par des locaux.",
    de: "Alles was Sie vor Ihrem Kreta-Besuch wissen müssen, beantwortet von Einheimischen.",
    el: "Όλα όσα πρέπει να γνωρίζετε πριν επισκεφτείτε την Κρήτη, από ντόπιους.",
  };

  // FAQPage schema.org
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <main className="min-h-screen bg-surface">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-aegean mb-3">
            {pageTitle[loc]}
          </h1>
          <p className="text-text-muted text-lg mb-10">
            {pageSubtitle[loc]}
          </p>

          {/* Quick nav */}
          <nav className="flex flex-wrap gap-2 mb-10">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.title}
                  href={`#${section.title.toLowerCase().replace(/[^a-z0-9]/gi, "-")}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white text-sm font-medium text-aegean hover:bg-aegean hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </a>
              );
            })}
          </nav>

          {/* FAQ sections */}
          {sections.map((section) => {
            const Icon = section.icon;
            const sectionId = section.title.toLowerCase().replace(/[^a-z0-9]/gi, "-");
            return (
              <section key={section.title} id={sectionId} className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-aegean/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-aegean" />
                  </div>
                  <h2 className="text-xl font-bold text-aegean">{section.title}</h2>
                </div>

                <div className="space-y-2">
                  {section.items.map((item) => (
                    <details
                      key={item.q}
                      className="group rounded-xl border border-border bg-white overflow-hidden"
                    >
                      <summary className="cursor-pointer px-5 py-4 font-semibold text-text flex items-center justify-between hover:bg-aegean-faint/50 transition-colors">
                        <span>{item.q}</span>
                        <span className="ml-2 text-text-muted text-lg group-open:rotate-45 transition-transform">+</span>
                      </summary>
                      <div className="px-5 pb-4 text-text-muted leading-relaxed">
                        <p>{item.a}</p>
                        {item.link && (
                          <Link
                            href={`/${locale}${item.link.href}`}
                            className="inline-block mt-2 text-aegean font-medium hover:underline text-sm"
                          >
                            {item.link.label} &rarr;
                          </Link>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
