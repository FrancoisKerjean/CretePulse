import { CITIES, MONTHS, MONTH_NAMES, getClimateData, getSwimVerdict } from "@/lib/weather-monthly";
import type { Locale } from "@/lib/types";
import { Sun, Users, Euro, Shirt, Calendar, Waves, Thermometer, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAlternates } from "@/lib/seo";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

interface MonthGuide {
  crowdLevel: "low" | "moderate" | "high" | "peak";
  priceLevel: "budget" | "mid" | "high" | "peak";
  bestFor: Record<string, string[]>;
  packingTips: Record<string, string[]>;
  events: Record<string, string[]>;
  verdict: Record<string, string>;
}

const MONTH_GUIDES: Record<string, MonthGuide> = {
  january: {
    crowdLevel: "low",
    priceLevel: "budget",
    bestFor: {
      en: ["Exploring cities without crowds", "Hiking in mild weather", "Authentic local life", "Low prices on everything"],
      fr: ["Explorer les villes sans foule", "Randonnée par temps doux", "Vie locale authentique", "Prix bas sur tout"],
      de: ["Städte ohne Menschenmassen", "Wandern bei mildem Wetter", "Authentisches Inselleben", "Günstige Preise"],
      el: ["Εξερεύνηση πόλεων χωρίς πλήθη", "Πεζοπορία με ήπιο καιρό", "Αυθεντική τοπική ζωή", "Χαμηλές τιμές"],
    },
    packingTips: {
      en: ["Warm jacket and layers", "Rain jacket", "Comfortable walking shoes", "Umbrella"],
      fr: ["Veste chaude et couches", "Imperméable", "Chaussures de marche", "Parapluie"],
      de: ["Warme Jacke und Schichten", "Regenjacke", "Bequeme Wanderschuhe", "Regenschirm"],
      el: ["Ζεστό μπουφάν", "Αδιάβροχο", "Άνετα παπούτσια", "Ομπρέλα"],
    },
    events: {
      en: ["Epiphany (Jan 6) - cross diving", "Carnival preparations begin"],
      fr: ["Épiphanie (6 jan) - plongeon de la croix", "Préparation du carnaval"],
      de: ["Epiphanias (6. Jan) - Kreuzwerfen", "Karnevalsvorbereitungen"],
      el: ["Θεοφάνεια (6 Ιαν) - ρίψη σταυρού", "Προετοιμασίες καρναβαλιού"],
    },
    verdict: {
      en: "January is perfect for budget travelers who want authentic Crete without tourists. Expect rain, but also mild days ideal for exploring archaeological sites and mountain villages.",
      fr: "Janvier est parfait pour les voyageurs à petit budget qui veulent une Crète authentique sans touristes. Attendez-vous à de la pluie, mais aussi des journées douces idéales pour explorer.",
      de: "Januar ist perfekt für Budgetreisende, die authentisches Kreta ohne Touristen wollen. Erwarten Sie Regen, aber auch milde Tage ideal für Erkundungen.",
      el: "Ο Ιανουάριος είναι ιδανικός για ταξιδιώτες με χαμηλό προϋπολογισμό που θέλουν αυθεντική Κρήτη χωρίς τουρίστες.",
    },
  },
  february: {
    crowdLevel: "low", priceLevel: "budget",
    bestFor: { en: ["Carnival season in Rethymno", "Almond blossoms", "Hiking", "City exploration"], fr: ["Saison du carnaval à Réthymnon", "Floraison des amandiers", "Randonnée", "Exploration urbaine"], de: ["Karnevalssaison in Rethymno", "Mandelblüte", "Wandern", "Stadtbesichtigung"], el: ["Καρναβάλι Ρεθύμνου", "Ανθισμένες αμυγδαλιές", "Πεζοπορία", "Εξερεύνηση πόλεων"] },
    packingTips: { en: ["Layers for variable weather", "Rain gear", "Walking shoes"], fr: ["Couches pour temps variable", "Équipement pluie", "Chaussures de marche"], de: ["Schichten für wechselhaftes Wetter", "Regenkleidung", "Wanderschuhe"], el: ["Στρώσεις ρούχων", "Αδιάβροχο", "Παπούτσια περπατήματος"] },
    events: { en: ["Rethymno Carnival", "Apokries celebrations"], fr: ["Carnaval de Réthymnon", "Fêtes d'Apokries"], de: ["Karneval in Rethymno", "Apokries-Feiern"], el: ["Καρναβάλι Ρεθύμνου", "Απόκριες"] },
    verdict: { en: "February brings Crete's famous carnival season, especially in Rethymno. Still quiet and affordable with almond trees beginning to bloom.", fr: "Février apporte la célèbre saison du carnaval, surtout à Réthymnon. Encore calme et abordable avec les amandiers en fleurs.", de: "Februar bringt Kretas berühmte Karnevalssaison, besonders in Rethymno. Noch ruhig und erschwinglich.", el: "Ο Φεβρουάριος φέρνει την περίφημη καρναβαλική σεζόν της Κρήτης, ειδικά στο Ρέθυμνο." },
  },
  march: {
    crowdLevel: "low", priceLevel: "budget",
    bestFor: { en: ["Wildflower season begins", "Hiking gorges", "Easter celebrations", "Photography"], fr: ["Début des fleurs sauvages", "Randonnée dans les gorges", "Célébrations de Pâques", "Photographie"], de: ["Wildblumenzeit beginnt", "Schluchtwandern", "Osterfeiern", "Fotografie"], el: ["Αρχή εποχής αγριολούλουδων", "Πεζοπορία φαραγγιών", "Πάσχα", "Φωτογραφία"] },
    packingTips: { en: ["Light jacket", "Hiking boots", "Sunscreen (UV rising)", "Layers"], fr: ["Veste légère", "Chaussures de rando", "Crème solaire", "Couches"], de: ["Leichte Jacke", "Wanderstiefel", "Sonnencreme", "Schichten"], el: ["Ελαφρύ μπουφάν", "Μπότες πεζοπορίας", "Αντηλιακό", "Στρώσεις"] },
    events: { en: ["Greek Independence Day (Mar 25)", "Lent traditions", "Early wildflower walks"], fr: ["Fête nationale grecque (25 mars)", "Traditions du Carême"], de: ["Griechischer Nationalfeiertag (25. März)", "Fastentraditionen"], el: ["25η Μαρτίου", "Σαρακοστή", "Πρώιμα αγριολούλουδα"] },
    verdict: { en: "March marks the transition to spring. Wildflowers carpet the hillsides, gorges start opening, and Greek Independence Day on March 25th brings parades and celebrations.", fr: "Mars marque la transition vers le printemps. Les fleurs sauvages tapissent les collines et les gorges commencent à ouvrir.", de: "März markiert den Übergang zum Frühling. Wildblumen bedecken die Hügel und Schluchten öffnen.", el: "Ο Μάρτιος σηματοδοτεί τη μετάβαση στην άνοιξη. Τα αγριολούλουδα σκεπάζουν τους λόφους." },
  },
  april: {
    crowdLevel: "moderate", priceLevel: "mid",
    bestFor: { en: ["Greek Easter (if it falls here)", "Wildflowers at peak", "Beach season starts", "Perfect hiking weather"], fr: ["Pâques grecques", "Fleurs sauvages au sommet", "Début de la saison balnéaire", "Temps parfait pour la rando"], de: ["Griechisches Ostern", "Wildblumen auf dem Höhepunkt", "Strandsaison beginnt", "Perfektes Wanderwetter"], el: ["Ελληνικό Πάσχα", "Αγριολούλουδα στο αποκορύφωμα", "Αρχή θαλάσσιας σεζόν", "Ιδανικός καιρός πεζοπορίας"] },
    packingTips: { en: ["Swimsuit", "Sunscreen", "Light layers", "Hiking gear"], fr: ["Maillot de bain", "Crème solaire", "Couches légères", "Équipement rando"], de: ["Badeanzug", "Sonnencreme", "Leichte Schichten", "Wanderausrüstung"], el: ["Μαγιό", "Αντηλιακό", "Ελαφριές στρώσεις", "Εξοπλισμός πεζοπορίας"] },
    events: { en: ["Greek Easter celebrations", "Samaria Gorge opens (May 1st)", "Spring festivals"], fr: ["Célébrations de Pâques", "Ouverture gorges de Samaria (1er mai)", "Festivals de printemps"], de: ["Griechische Osterfeiern", "Samaria-Schlucht öffnet", "Frühlingsfeste"], el: ["Πάσχα", "Άνοιγμα Φαράγγι Σαμαριάς", "Ανοιξιάτικα πανηγύρια"] },
    verdict: { en: "April is one of the best months to visit Crete. Warm enough for beaches, cool enough for hiking, wildflowers everywhere, and far fewer tourists than summer.", fr: "Avril est l'un des meilleurs mois pour visiter la Crète. Assez chaud pour la plage, assez frais pour la rando.", de: "April ist einer der besten Monate für Kreta. Warm genug für Strände, kühl genug zum Wandern.", el: "Ο Απρίλιος είναι ένας από τους καλύτερους μήνες για επίσκεψη στην Κρήτη." },
  },
  may: {
    crowdLevel: "moderate", priceLevel: "mid",
    bestFor: { en: ["Beach season in full swing", "Samaria Gorge open", "Warm sea for swimming", "Longer days"], fr: ["Pleine saison balnéaire", "Gorges de Samaria ouvertes", "Mer chaude", "Journées plus longues"], de: ["Strandsaison in vollem Gange", "Samaria-Schlucht geöffnet", "Warmes Meer", "Längere Tage"], el: ["Πλήρης θαλάσσια σεζόν", "Φαράγγι Σαμαριάς ανοιχτό", "Ζεστή θάλασσα", "Μεγαλύτερες μέρες"] },
    packingTips: { en: ["Sunscreen SPF50", "Hat", "Swimsuit", "Light clothes", "Water shoes"], fr: ["Crème solaire SPF50", "Chapeau", "Maillot", "Vêtements légers", "Chaussures d'eau"], de: ["Sonnencreme SPF50", "Hut", "Badeanzug", "Leichte Kleidung", "Wasserschuhe"], el: ["Αντηλιακό SPF50", "Καπέλο", "Μαγιό", "Ελαφριά ρούχα"] },
    events: { en: ["Battle of Crete commemoration (May 20-28)", "Samaria Gorge fully open"], fr: ["Commémoration Bataille de Crète (20-28 mai)", "Gorges de Samaria"], de: ["Gedenken an die Schlacht um Kreta (20.-28. Mai)", "Samaria-Schlucht voll geöffnet"], el: ["Μάχη της Κρήτης (20-28 Μαΐου)", "Φαράγγι Σαμαριάς"] },
    verdict: { en: "May is arguably the best month for Crete. Perfect weather, sea warm enough to swim, all gorges open, reasonable prices, and manageable crowds.", fr: "Mai est sans doute le meilleur mois pour la Crète. Temps parfait, mer assez chaude, toutes les gorges ouvertes.", de: "Mai ist wohl der beste Monat für Kreta. Perfektes Wetter, Meer warm genug zum Schwimmen, alle Schluchten offen.", el: "Ο Μάιος είναι ίσως ο καλύτερος μήνας για την Κρήτη. Τέλειος καιρός, θάλασσα αρκετά ζεστή." },
  },
  june: {
    crowdLevel: "high", priceLevel: "high",
    bestFor: { en: ["Beach life", "Water sports", "Long sunny days", "Festivals begin"], fr: ["Vie de plage", "Sports nautiques", "Longues journées ensoleillées", "Début des festivals"], de: ["Strandleben", "Wassersport", "Lange Sonnentage", "Festivals beginnen"], el: ["Παραλία", "Θαλάσσια σπορ", "Μεγάλες ηλιόλουστες μέρες", "Αρχή φεστιβάλ"] },
    packingTips: { en: ["High SPF sunscreen", "Hat", "Multiple swimsuits", "Light evening wear"], fr: ["Crème solaire haute protection", "Chapeau", "Plusieurs maillots", "Tenue légère de soirée"], de: ["Hoher LSF Sonnencreme", "Hut", "Mehrere Badeanzüge", "Leichte Abendkleidung"], el: ["Αντηλιακό υψηλής προστασίας", "Καπέλο", "Πολλά μαγιό", "Ελαφριά βραδινή ένδυση"] },
    events: { en: ["Yakinthia Festival (Heraklion)", "Summer concerts begin", "Saint John's Day (Jun 24)"], fr: ["Festival Yakinthia (Héraklion)", "Concerts d'été", "Saint-Jean (24 juin)"], de: ["Yakinthia-Festival (Heraklion)", "Sommerkonzerte", "Johannistag (24. Juni)"], el: ["Γιακίνθια (Ηράκλειο)", "Καλοκαιρινές συναυλίες", "Αγίου Ιωάννη (24 Ιουν)"] },
    verdict: { en: "June is hot, sunny, and the beaches are calling. Prices start climbing but it's less packed than July-August. Great for beach lovers and water sports.", fr: "Juin est chaud, ensoleillé, et les plages appellent. Les prix montent mais c'est moins bondé que juillet-août.", de: "Juni ist heiß, sonnig und die Strände rufen. Preise steigen, aber weniger voll als Juli-August.", el: "Ο Ιούνιος είναι ζεστός, ηλιόλουστος και οι παραλίες καλούν. Οι τιμές ανεβαίνουν." },
  },
  july: {
    crowdLevel: "peak", priceLevel: "peak",
    bestFor: { en: ["Beach paradise", "Nightlife", "Water sports", "Summer festivals"], fr: ["Paradis balnéaire", "Vie nocturne", "Sports nautiques", "Festivals d'été"], de: ["Strandparadies", "Nachtleben", "Wassersport", "Sommerfestivals"], el: ["Παράδεισος παραλίας", "Νυχτερινή ζωή", "Θαλάσσια σπορ", "Καλοκαιρινά φεστιβάλ"] },
    packingTips: { en: ["SPF50+ reapply often", "Water bottle always", "Light breathable clothes", "Beach gear"], fr: ["SPF50+ réapplication fréquente", "Bouteille d'eau toujours", "Vêtements légers", "Équipement plage"], de: ["SPF50+ oft nachcremen", "Immer Wasserflasche", "Leichte atmungsaktive Kleidung", "Strandausrüstung"], el: ["SPF50+", "Πάντα μπουκάλι νερό", "Ελαφριά ρούχα", "Εξοπλισμός παραλίας"] },
    events: { en: ["Renaissance Festival (Rethymno)", "Summer concerts", "Beach parties"], fr: ["Festival Renaissance (Réthymnon)", "Concerts d'été", "Beach parties"], de: ["Renaissance-Festival (Rethymno)", "Sommerkonzerte", "Strandpartys"], el: ["Φεστιβάλ Αναγέννησης (Ρέθυμνο)", "Καλοκαιρινές συναυλίες", "Beach parties"] },
    verdict: { en: "July is peak season. Expect crowds, high prices, and intense heat (33°C+). But the beaches are spectacular, nightlife is at its best, and the island buzzes with energy.", fr: "Juillet est la haute saison. Attendez-vous aux foules, prix élevés et chaleur intense. Mais les plages sont spectaculaires.", de: "Juli ist Hochsaison. Erwarten Sie Menschenmassen, hohe Preise und intensive Hitze. Aber die Strände sind spektakulär.", el: "Ο Ιούλιος είναι αιχμή σεζόν. Πλήθη, υψηλές τιμές, έντονη ζέστη. Αλλά οι παραλίες είναι εντυπωσιακές." },
  },
  august: {
    crowdLevel: "peak", priceLevel: "peak",
    bestFor: { en: ["Beach life at maximum", "Cultural festivals", "Nightlife", "Warmest sea"], fr: ["Vie de plage au maximum", "Festivals culturels", "Vie nocturne", "Mer la plus chaude"], de: ["Strandleben auf Maximum", "Kulturfestivals", "Nachtleben", "Wärmstes Meer"], el: ["Παραλία στο μέγιστο", "Πολιτιστικά φεστιβάλ", "Νυχτερινή ζωή", "Ζεστότερη θάλασσα"] },
    packingTips: { en: ["Maximum sun protection", "Water shoes for hot sand", "Reusable water bottle", "Evening light layers"], fr: ["Protection solaire maximale", "Chaussures d'eau", "Gourde réutilisable", "Couches légères pour le soir"], de: ["Maximaler Sonnenschutz", "Wasserschuhe für heißen Sand", "Wiederverwendbare Wasserflasche"], el: ["Μέγιστη αντηλιακή προστασία", "Παπούτσια θαλάσσης", "Επαναχρησιμοποιούμενο μπουκάλι νερό"] },
    events: { en: ["Assumption of Mary (Aug 15) - island-wide", "Wine festivals", "Panigýria village feasts"], fr: ["Assomption (15 août) - toute l'île", "Fêtes du vin", "Panigýria (fêtes de village)"], de: ["Mariä Himmelfahrt (15. Aug)", "Weinfeste", "Panigýria Dorffeste"], el: ["Δεκαπενταύγουστος", "Γιορτές κρασιού", "Πανηγύρια"] },
    verdict: { en: "August is the busiest and most expensive month. Book everything months ahead. The sea is at its warmest (26°C), August 15th celebrations are spectacular, and every village hosts panigýria feasts.", fr: "Août est le mois le plus chargé et le plus cher. Réservez des mois à l'avance. La mer est à son plus chaud (26°C).", de: "August ist der geschäftigste und teuerste Monat. Buchen Sie Monate im Voraus. Das Meer ist am wärmsten (26°C).", el: "Ο Αύγουστος είναι ο πιο πολυσύχναστος μήνας. Κλείστε μήνες πριν. Η θάλασσα είναι στο ζεστότερο (26°C)." },
  },
  september: {
    crowdLevel: "high", priceLevel: "high",
    bestFor: { en: ["Best month overall", "Warm sea (25°C)", "Fewer crowds than summer", "Wine harvest"], fr: ["Meilleur mois globalement", "Mer chaude (25°C)", "Moins de monde qu'en été", "Vendanges"], de: ["Bester Monat insgesamt", "Warmes Meer (25°C)", "Weniger Massen als im Sommer", "Weinlese"], el: ["Καλύτερος μήνας συνολικά", "Ζεστή θάλασσα (25°C)", "Λιγότερος κόσμος", "Τρύγος"] },
    packingTips: { en: ["Swimsuit still essential", "Sunscreen", "Light evening jacket", "Good walking shoes"], fr: ["Maillot toujours essentiel", "Crème solaire", "Veste légère pour le soir", "Bonnes chaussures"], de: ["Badeanzug noch wichtig", "Sonnencreme", "Leichte Abendjacke", "Gute Wanderschuhe"], el: ["Μαγιό ακόμα απαραίτητο", "Αντηλιακό", "Ελαφρύ βραδινό μπουφάν"] },
    events: { en: ["Grape harvest festivals", "Tsikoudia distillation begins", "Cultural events continue"], fr: ["Fêtes des vendanges", "Début distillation tsikoudia"], de: ["Weinlesefeste", "Tsikoudia-Destillation beginnt"], el: ["Γιορτές τρύγου", "Αρχή απόσταξης τσικουδιάς"] },
    verdict: { en: "September is many travelers' favorite month for Crete. The sea is still 25°C, crowds thin out, prices drop slightly, and the grape harvest brings wine festivals across the island.", fr: "Septembre est le mois préféré de nombreux voyageurs. La mer est encore à 25°C, les foules diminuent et les vendanges apportent des festivals.", de: "September ist für viele Reisende der Lieblingsmonat. Das Meer hat noch 25°C, die Massen nehmen ab.", el: "Ο Σεπτέμβριος είναι ο αγαπημένος μήνας πολλών ταξιδιωτών. Η θάλασσα έχει ακόμα 25°C." },
  },
  october: {
    crowdLevel: "moderate", priceLevel: "mid",
    bestFor: { en: ["Swimming still possible", "Autumn colors", "Olive harvest begins", "Great hiking"], fr: ["Baignade encore possible", "Couleurs d'automne", "Début de la récolte d'olives", "Super rando"], de: ["Schwimmen noch möglich", "Herbstfarben", "Olivenernte beginnt", "Tolles Wandern"], el: ["Κολύμπι ακόμα δυνατό", "Φθινοπωρινά χρώματα", "Αρχή ελαιοσυλλογής", "Υπέροχη πεζοπορία"] },
    packingTips: { en: ["Layers - warm days, cool evenings", "Rain jacket just in case", "Swimsuit", "Hiking boots"], fr: ["Couches - journées chaudes, soirées fraîches", "Imperméable au cas où", "Maillot", "Chaussures de rando"], de: ["Schichten - warme Tage, kühle Abende", "Regenjacke für alle Fälle", "Badeanzug"], el: ["Στρώσεις - ζεστές μέρες, δροσερά βράδια", "Αδιάβροχο", "Μαγιό"] },
    events: { en: ["Chestnut festivals in mountain villages", "Olive oil harvest festivals", "Ohi Day (Oct 28)"], fr: ["Fêtes des châtaignes", "Fêtes de l'huile d'olive", "Jour du Non (28 oct)"], de: ["Kastanienfeste", "Olivenöl-Erntefeste", "Ohi-Tag (28. Okt)"], el: ["Γιορτές κάστανου", "Γιορτές ελαιόλαδου", "28η Οκτωβρίου"] },
    verdict: { en: "October offers the best of both worlds - still warm enough to swim (sea 23°C), but with autumn atmosphere, olive harvest, and dropping prices. An underrated gem.", fr: "Octobre offre le meilleur des deux mondes - encore assez chaud pour nager (mer 23°C), ambiance automnale et prix en baisse.", de: "Oktober bietet das Beste aus beiden Welten - noch warm genug zum Schwimmen (Meer 23°C), Herbstatmosphäre.", el: "Ο Οκτώβριος προσφέρει τα καλύτερα - ακόμα αρκετά ζεστός για κολύμπι (θάλασσα 23°C)." },
  },
  november: {
    crowdLevel: "low", priceLevel: "budget",
    bestFor: { en: ["Olive harvest season", "Mountain village charm", "Budget travel", "Authentic food festivals"], fr: ["Saison de la récolte d'olives", "Charme des villages de montagne", "Voyage économique", "Festivals gastronomiques"], de: ["Olivenerntesaison", "Bergdorf-Charme", "Budgetreisen", "Authentische Food-Festivals"], el: ["Εποχή ελαιοσυλλογής", "Γοητεία ορεινών χωριών", "Οικονομικό ταξίδι"] },
    packingTips: { en: ["Warm layers", "Rain gear essential", "Comfortable shoes", "Scarf"], fr: ["Couches chaudes", "Équipement pluie indispensable", "Chaussures confortables", "Écharpe"], de: ["Warme Schichten", "Regenkleidung unverzichtbar", "Bequeme Schuhe", "Schal"], el: ["Ζεστές στρώσεις", "Αδιάβροχο απαραίτητο", "Άνετα παπούτσια"] },
    events: { en: ["Tsikoudia festivals", "Olive press season", "Arkadi Monastery anniversary (Nov 8)"], fr: ["Festivals tsikoudia", "Saison des pressoirs", "Anniversaire monastère Arkadi (8 nov)"], de: ["Tsikoudia-Feste", "Olivenpresse-Saison", "Jahrestag Kloster Arkadi (8. Nov)"], el: ["Γιορτές τσικουδιάς", "Εποχή ελαιοτριβείων", "Επέτειος Αρκαδίου (8 Νοε)"] },
    verdict: { en: "November is quiet and rainy but rewarding. The olive harvest is in full swing, villages come alive with pressing season, and you'll have archaeological sites to yourself.", fr: "Novembre est calme et pluvieux mais enrichissant. La récolte d'olives bat son plein.", de: "November ist ruhig und regnerisch, aber lohnend. Die Olivenernte ist in vollem Gange.", el: "Ο Νοέμβριος είναι ήσυχος αλλά ανταποδοτικός. Η ελαιοσυλλογή στο αποκορύφωμα." },
  },
  december: {
    crowdLevel: "low", priceLevel: "budget",
    bestFor: { en: ["Christmas traditions", "Lowest prices of the year", "Mild winter days", "Local food culture"], fr: ["Traditions de Noël", "Prix les plus bas de l'année", "Journées d'hiver douces", "Culture culinaire locale"], de: ["Weihnachtstraditionen", "Niedrigste Preise des Jahres", "Milde Wintertage", "Lokale Esskultur"], el: ["Χριστουγεννιάτικες παραδόσεις", "Χαμηλότερες τιμές", "Ήπιες χειμωνιάτικες μέρες"] },
    packingTips: { en: ["Warm coat", "Rain gear", "Comfortable walking shoes", "Layers"], fr: ["Manteau chaud", "Équipement pluie", "Chaussures de marche", "Couches"], de: ["Warmer Mantel", "Regenkleidung", "Bequeme Wanderschuhe", "Schichten"], el: ["Ζεστό παλτό", "Αδιάβροχο", "Παπούτσια περπατήματος"] },
    events: { en: ["Christmas markets in Heraklion and Chania", "New Year's Eve celebrations", "Vasilopita tradition"], fr: ["Marchés de Noël à Héraklion et La Canée", "Réveillon du Nouvel An", "Tradition vasilopita"], de: ["Weihnachtsmärkte in Heraklion und Chania", "Silvesterfeier", "Vasilopita-Tradition"], el: ["Χριστουγεννιάτικες αγορές", "Πρωτοχρονιά", "Βασιλόπιτα"] },
    verdict: { en: "December offers the cheapest Crete experience. Christmas markets in Heraklion and Chania add festive charm. Mild days (15°C) are perfect for exploring without the crowds.", fr: "Décembre offre la Crète la moins chère. Les marchés de Noël ajoutent du charme festif.", de: "Dezember bietet das günstigste Kreta-Erlebnis. Weihnachtsmärkte in Heraklion und Chania.", el: "Ο Δεκέμβριος προσφέρει την πιο οικονομική εμπειρία στην Κρήτη." },
  },
};

// --- Labels ---
const UI: Record<string, Record<string, string>> = {
  en: {
    heroSub: "Your complete travel guide",
    climate: "Climate overview",
    crowds: "Crowds",
    prices: "Prices",
    bestFor: "Best for",
    packing: "What to pack",
    events: "Events & festivals",
    verdict: "Our verdict",
    swim: "Swimming",
    seaTemp: "Sea temperature",
    airTemp: "Air temperature",
    sunHours: "Sun hours/day",
    rainyDays: "Rainy days",
    uvIndex: "UV index",
    weatherIn: "Detailed weather in",
    otherMonths: "Crete in other months",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    low: "Low", moderate: "Moderate", high: "High", peak: "Peak",
    budget: "Budget", mid: "Mid-range",
    faqBestTime: "When is the best time to visit Crete?",
    faqBestTimeA: "The best months to visit Crete are May, June, September and October. You get warm weather, swimmable seas, and fewer crowds than peak summer (July-August).",
    faqSwim: "Can you swim in Crete in",
    faqCrowded: "Is Crete crowded in",
  },
  fr: {
    heroSub: "Votre guide de voyage complet",
    climate: "Aperçu climatique",
    crowds: "Affluence",
    prices: "Prix",
    bestFor: "Idéal pour",
    packing: "Quoi emporter",
    events: "Événements et festivals",
    verdict: "Notre verdict",
    swim: "Baignade",
    seaTemp: "Température de la mer",
    airTemp: "Température de l'air",
    sunHours: "Heures de soleil/jour",
    rainyDays: "Jours de pluie",
    uvIndex: "Indice UV",
    weatherIn: "Météo détaillée à",
    otherMonths: "La Crète les autres mois",
    prevMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    low: "Faible", moderate: "Modérée", high: "Élevée", peak: "Très élevée",
    budget: "Économique", mid: "Moyen",
    faqBestTime: "Quelle est la meilleure période pour visiter la Crète ?",
    faqBestTimeA: "Les meilleurs mois pour visiter la Crète sont mai, juin, septembre et octobre. Temps chaud, mer baignable et moins de monde qu'en haute saison (juillet-août).",
    faqSwim: "Peut-on se baigner en Crète en",
    faqCrowded: "Y a-t-il beaucoup de monde en Crète en",
  },
  de: {
    heroSub: "Ihr kompletter Reiseführer",
    climate: "Klimaübersicht",
    crowds: "Menschenmassen",
    prices: "Preise",
    bestFor: "Am besten für",
    packing: "Packliste",
    events: "Events & Festivals",
    verdict: "Unser Fazit",
    swim: "Schwimmen",
    seaTemp: "Meertemperatur",
    airTemp: "Lufttemperatur",
    sunHours: "Sonnenstunden/Tag",
    rainyDays: "Regentage",
    uvIndex: "UV-Index",
    weatherIn: "Detailliertes Wetter in",
    otherMonths: "Kreta in anderen Monaten",
    prevMonth: "Vorheriger Monat",
    nextMonth: "Nächster Monat",
    low: "Niedrig", moderate: "Mittel", high: "Hoch", peak: "Sehr hoch",
    budget: "Günstig", mid: "Mittelklasse",
    faqBestTime: "Wann ist die beste Reisezeit für Kreta?",
    faqBestTimeA: "Die besten Monate für Kreta sind Mai, Juni, September und Oktober. Warmes Wetter, schwimmbares Meer und weniger Massen als in der Hochsaison (Juli-August).",
    faqSwim: "Kann man auf Kreta im",
    faqCrowded: "Ist Kreta im",
  },
  el: {
    heroSub: "Ο πλήρης ταξιδιωτικός σας οδηγός",
    climate: "Κλιματική επισκόπηση",
    crowds: "Πλήθη",
    prices: "Τιμές",
    bestFor: "Ιδανικό για",
    packing: "Τι να πακετάρετε",
    events: "Εκδηλώσεις και φεστιβάλ",
    verdict: "Η γνώμη μας",
    swim: "Κολύμπι",
    seaTemp: "Θερμοκρασία θάλασσας",
    airTemp: "Θερμοκρασία αέρα",
    sunHours: "Ώρες ηλιοφάνειας/μέρα",
    rainyDays: "Βροχερές μέρες",
    uvIndex: "Δείκτης UV",
    weatherIn: "Αναλυτικός καιρός στ",
    otherMonths: "Κρήτη τους άλλους μήνες",
    prevMonth: "Προηγούμενος μήνας",
    nextMonth: "Επόμενος μήνας",
    low: "Χαμηλά", moderate: "Μέτρια", high: "Υψηλά", peak: "Πολύ υψηλά",
    budget: "Οικονομικά", mid: "Μεσαία",
    faqBestTime: "Πότε είναι η καλύτερη εποχή για Κρήτη;",
    faqBestTimeA: "Οι καλύτεροι μήνες για Κρήτη είναι Μάιος, Ιούνιος, Σεπτέμβριος και Οκτώβριος.",
    faqSwim: "Μπορείτε να κολυμπήσετε στην Κρήτη τον",
    faqCrowded: "Έχει κόσμο η Κρήτη τον",
  },
};

function getCrowdLabel(level: string, locale: string): string {
  const L = UI[locale] || UI.en;
  return L[level] || L[level] || level;
}

function getPriceLabel(level: string, locale: string): string {
  const L = UI[locale] || UI.en;
  if (level === "peak") return L.peak;
  return L[level] || level;
}

function getCrowdColor(level: string): string {
  switch (level) {
    case "low": return "bg-green-100 text-green-800";
    case "moderate": return "bg-yellow-100 text-yellow-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "peak": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getPriceColor(level: string): string {
  switch (level) {
    case "budget": return "bg-green-100 text-green-800";
    case "mid": return "bg-yellow-100 text-yellow-800";
    case "high": return "bg-orange-100 text-orange-800";
    case "peak": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

// --- Static params ---
export function generateStaticParams() {
  return MONTHS.map((month) => ({ month }));
}

// --- Metadata ---
export async function generateMetadata({ params }: { params: Promise<{ locale: string; month: string }> }) {
  const { locale, month } = await params;
  const monthName = MONTH_NAMES[locale]?.[month] || MONTH_NAMES.en[month];
  if (!monthName) return { title: "Not found" };

  const climate = getClimateData("heraklion", month);

  const titles: Record<string, string> = {
    en: `Crete in ${monthName} - Travel Guide, Weather & Tips | Crete Direct`,
    fr: `La Crète en ${monthName} - Guide de voyage, météo et conseils | Crete Direct`,
    de: `Kreta im ${monthName} - Reiseführer, Wetter & Tipps | Crete Direct`,
    el: `Κρήτη τον ${monthName} - Ταξιδιωτικός οδηγός | Crete Direct`,
  };

  const descs: Record<string, string> = {
    en: `Complete travel guide for Crete in ${monthName}. ${climate.avgHigh}°C, sea ${climate.seaTemp}°C. What to do, what to pack, events, crowds and prices.`,
    fr: `Guide complet pour la Crète en ${monthName}. ${climate.avgHigh}°C, mer ${climate.seaTemp}°C. Activités, bagages, événements, affluence et prix.`,
    de: `Kompletter Reiseführer für Kreta im ${monthName}. ${climate.avgHigh}°C, Meer ${climate.seaTemp}°C. Aktivitäten, Packliste, Events, Massen und Preise.`,
    el: `Πλήρης ταξιδιωτικός οδηγός για Κρήτη τον ${monthName}. ${climate.avgHigh}°C, θάλασσα ${climate.seaTemp}°C.`,
  };

  const url = `${BASE_URL}/${locale}/visit/${month}`;

  return {
    title: titles[locale] || titles.en,
    description: descs[locale] || descs.en,
    alternates: buildAlternates(locale, `/visit/${month}`),
    openGraph: { title: titles[locale] || titles.en, description: descs[locale] || descs.en, url },
  };
}

// --- Page component ---
export default async function VisitMonthPage({ params }: { params: Promise<{ locale: string; month: string }> }) {
  const { locale, month } = await params;
  const monthName = MONTH_NAMES[locale]?.[month] || MONTH_NAMES.en[month];

  if (!monthName || !MONTHS.includes(month as typeof MONTHS[number])) notFound();

  const guide = MONTH_GUIDES[month];
  if (!guide) notFound();

  const climate = getClimateData("heraklion", month);
  const swimVerdict = getSwimVerdict(climate.seaTemp, locale);
  const L = UI[locale] || UI.en;

  // Previous / next month navigation
  const monthIdx = MONTHS.indexOf(month as typeof MONTHS[number]);
  const prevMonth = MONTHS[(monthIdx - 1 + 12) % 12];
  const nextMonth = MONTHS[(monthIdx + 1) % 12];
  const prevName = MONTH_NAMES[locale]?.[prevMonth] || MONTH_NAMES.en[prevMonth];
  const nextName = MONTH_NAMES[locale]?.[nextMonth] || MONTH_NAMES.en[nextMonth];

  // Localized content
  const bestFor = guide.bestFor[locale] || guide.bestFor.en;
  const packingTips = guide.packingTips[locale] || guide.packingTips.en;
  const events = guide.events[locale] || guide.events.en;
  const verdict = guide.verdict[locale] || guide.verdict.en;

  // FAQ schema
  const faqSwimQ = locale === "fr" ? `${L.faqSwim} ${monthName} ?` : locale === "de" ? `${L.faqSwim} ${monthName} schwimmen?` : locale === "el" ? `${L.faqSwim} ${monthName};` : `${L.faqSwim} ${monthName}?`;
  const faqSwimA = locale === "fr"
    ? `La température de la mer en Crète en ${monthName} est d'environ ${climate.seaTemp}°C. ${swimVerdict}.`
    : locale === "de"
    ? `Die Meertemperatur auf Kreta im ${monthName} beträgt etwa ${climate.seaTemp}°C. ${swimVerdict}.`
    : `The sea temperature in Crete in ${monthName} is around ${climate.seaTemp}°C. ${swimVerdict}.`;

  const crowdLabel = getCrowdLabel(guide.crowdLevel, locale);
  const faqCrowdQ = locale === "fr" ? `${L.faqCrowded} ${monthName} ?` : locale === "de" ? `${L.faqCrowded} ${monthName} überfüllt?` : locale === "el" ? `${L.faqCrowded} ${monthName};` : `${L.faqCrowded} ${monthName}?`;
  const faqCrowdA = locale === "fr"
    ? `L'affluence en Crète en ${monthName} est ${crowdLabel.toLowerCase()}. ${verdict}`
    : locale === "de"
    ? `Die Besucherzahl auf Kreta im ${monthName} ist ${crowdLabel.toLowerCase()}. ${verdict}`
    : `Crowd levels in Crete in ${monthName} are ${crowdLabel.toLowerCase()}. ${verdict}`;

  const faqItems = [
    { q: L.faqBestTime, a: L.faqBestTimeA },
    { q: faqSwimQ, a: faqSwimA },
    { q: faqCrowdQ, a: faqCrowdA },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Hero */}
        <section className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {locale === "fr" ? `La Crète en ${monthName}` : locale === "de" ? `Kreta im ${monthName}` : locale === "el" ? `Κρήτη τον ${monthName}` : `Crete in ${monthName}`}
          </h1>
          <p className="mt-3 text-lg text-gray-500">{L.heroSub}</p>
          {/* Crowd & price badges */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getCrowdColor(guide.crowdLevel)}`}>
              <Users className="h-4 w-4" />
              {L.crowds}: {crowdLabel}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getPriceColor(guide.priceLevel)}`}>
              <Euro className="h-4 w-4" />
              {L.prices}: {getPriceLabel(guide.priceLevel, locale)}
            </span>
          </div>
        </section>

        {/* Climate stats */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">{L.climate}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <Thermometer className="mx-auto mb-2 h-6 w-6 text-red-500" />
              <p className="text-2xl font-bold text-gray-900">{climate.avgHigh}°C</p>
              <p className="text-xs text-gray-500">{L.airTemp}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <Waves className="mx-auto mb-2 h-6 w-6 text-blue-500" />
              <p className="text-2xl font-bold text-gray-900">{climate.seaTemp}°C</p>
              <p className="text-xs text-gray-500">{L.seaTemp}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <Sun className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
              <p className="text-2xl font-bold text-gray-900">{climate.sunHours}h</p>
              <p className="text-xs text-gray-500">{L.sunHours}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <svg className="mx-auto mb-2 h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17h1m16 0h1M5.6 10.6l.7.7m12.1-.7-.7.7M8 17a4 4 0 018 0M12 3v2" /></svg>
              <p className="text-2xl font-bold text-gray-900">{climate.rainyDays}</p>
              <p className="text-xs text-gray-500">{L.rainyDays}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <Sun className="mx-auto mb-2 h-6 w-6 text-orange-500" />
              <p className="text-2xl font-bold text-gray-900">{climate.uvIndex}</p>
              <p className="text-xs text-gray-500">{L.uvIndex}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <Waves className="mx-auto mb-2 h-6 w-6 text-cyan-500" />
              <p className="text-sm font-semibold text-gray-900">{swimVerdict}</p>
              <p className="text-xs text-gray-500">{L.swim}</p>
            </div>
          </div>
        </section>

        {/* Best for */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Sun className="h-6 w-6 text-yellow-500" /> {L.bestFor}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {bestFor.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Packing tips */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Shirt className="h-6 w-6 text-purple-500" /> {L.packing}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {packingTips.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500" />
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Events */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900">
            <Calendar className="h-6 w-6 text-pink-500" /> {L.events}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {events.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
                <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-pink-500" />
                <span className="text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Verdict */}
        <section className="mb-10 rounded-2xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="mb-3 text-2xl font-semibold text-gray-900">{L.verdict}</h2>
          <p className="text-lg leading-relaxed text-gray-700">{verdict}</p>
        </section>

        {/* Weather links per city */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">
            {L.weatherIn} {monthName}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CITIES.map((city) => {
              const c = getClimateData(city.slug, month);
              return (
                <Link
                  key={city.slug}
                  href={`/${locale}/weather/${city.slug}/${month}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-800">{city.name}</span>
                  <span className="text-sm text-gray-500">{c.avgHigh}°C / {c.seaTemp}°C</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Previous / Next month nav */}
        <nav className="mb-10 flex items-center justify-between">
          <Link
            href={`/${locale}/visit/${prevMonth}`}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
            {prevName}
          </Link>
          <Link
            href={`/${locale}/visit/${nextMonth}`}
            className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {nextName}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>

        {/* All months grid */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">{L.otherMonths}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {MONTHS.map((m) => {
              const mName = MONTH_NAMES[locale]?.[m] || MONTH_NAMES.en[m];
              const isCurrent = m === month;
              return (
                <Link
                  key={m}
                  href={`/${locale}/visit/${m}`}
                  className={`rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                    isCurrent
                      ? "border-blue-300 bg-blue-100 text-blue-800"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {mName}
                </Link>
              );
            })}
          </div>
        </section>

        {/* FAQ section (visible) */}
        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">FAQ</h2>
          <div className="space-y-4">
            {faqItems.map((faq) => (
              <details key={faq.q} className="rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer px-5 py-4 font-medium text-gray-900">{faq.q}</summary>
                <p className="px-5 pb-4 text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
