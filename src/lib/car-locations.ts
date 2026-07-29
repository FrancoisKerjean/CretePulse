// SEO location pages for /car-rental/[location].
// Les refs (slug, pickup, kind, code) vivent dans car-landings.ts (module léger
// importé par les CTA client-side) ; ce fichier ne porte que les textes. Le
// Record<CarLandingSlug, ...> force chaque ref à avoir son contenu (tsc échoue
// si une landing est ajoutée dans car-landings.ts sans texte ici, et inversement).

import { CAR_LANDINGS, type CarLandingRef, type CarLandingSlug } from "./car-landings";

export type CarLocLocale = "en" | "fr" | "de" | "el";
export const CAR_LOC_LOCALES: CarLocLocale[] = ["en", "fr", "de", "el"];

export interface CarLocationContent {
  h1: string;
  intro: string;
  deliveryTitle: string;
  delivery: string;
  tips: Array<{ h: string; p: string }>;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
}

export interface CarLocationCopy {
  hub: Record<CarLocLocale, string>;
  meta: Record<CarLocLocale, { title: string; desc: string }>;
  content: Record<CarLocLocale, CarLocationContent>;
}

export type CarLocation = CarLandingRef & CarLocationCopy;

const COPY: Record<CarLandingSlug, CarLocationCopy> = {
  "chania-airport": {
    hub: { en: "Chania Airport (CHQ)", fr: "Aéroport de Chania (CHQ)", de: "Flughafen Chania (CHQ)", el: "Αεροδρόμιο Χανίων (CHQ)" },
    meta: {
      en: {
        title: "Car Rental Chania Airport (CHQ) - local agency, no prepayment",
        desc: "Rent a car at Chania Airport (CHQ) with a local agency. Meet-and-greet delivery, pay on arrival, cash accepted, no online prepayment.",
      },
      fr: {
        title: "Location de voiture aéroport de Chania (CHQ) - agence locale, sans prépaiement",
        desc: "Louez une voiture à l'aéroport de Chania (CHQ) avec une agence locale. Remise en main propre, paiement à l'arrivée, espèces acceptées, aucun prépaiement en ligne.",
      },
      de: {
        title: "Mietwagen Flughafen Chania (CHQ) - lokale Agentur, keine Vorauszahlung",
        desc: "Mietwagen am Flughafen Chania (CHQ) bei einer lokalen Agentur. Persönliche Übergabe, Zahlung bei Ankunft, Barzahlung möglich, keine Online-Vorauszahlung.",
      },
      el: {
        title: "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Χανίων (CHQ) - τοπικό γραφείο, χωρίς προπληρωμή",
        desc: "Νοικιάστε αυτοκίνητο στο αεροδρόμιο Χανίων (CHQ) από τοπικό γραφείο. Παράδοση με προσωπική υποδοχή, πληρωμή κατά την άφιξη, δεκτά μετρητά, καμία προπληρωμή online.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Chania Airport (CHQ)",
        intro: "Chania Airport is a convenient pick-up point for west Crete: Chania town, Kissamos, Falassarna, Balos and Elafonisi. The airport is on the Akrotiri peninsula, about 14 km from the old town.",
        deliveryTitle: "Picking up your car at CHQ",
        delivery: "The local agency brings the car to the airport and meets you after landing. Add your flight number in the request so the handover follows your real arrival time, including delays.",
        tips: [
          { h: "Airport delivery", p: "The car is delivered to Chania Airport and can be returned there before your flight." },
          { h: "No online prepayment", p: "You pay the agency directly on pick-up, by cash or card depending on the confirmed offer." },
        ],
        faqTitle: "Chania Airport car rental FAQ",
        faq: [
          { q: "Can I collect the car at arrivals?", a: "Yes. The local agency uses meet-and-greet delivery, so you avoid a counter queue after the flight." },
          { q: "How far is Chania town from the airport?", a: "Chania Airport is roughly 14 km from the old town, usually 20 to 25 minutes by road." },
          { q: "Can I return the car at the airport?", a: "Yes. Airport return is available and is confirmed with the agency in your offer." },
        ],
      },
      fr: {
        h1: "Location de voiture à l'aéroport de Chania (CHQ)",
        intro: "L'aéroport de Chania est un point de prise en charge pratique pour l'ouest de la Crète : Chania, Kissamos, Falassarna, Balos et Elafonisi. Il se trouve sur la presqu'île d'Akrotiri, à environ 14 km de la vieille ville.",
        deliveryTitle: "Récupérer votre voiture à CHQ",
        delivery: "L'agence locale apporte la voiture à l'aéroport et vous accueille après l'atterrissage. Ajoutez votre numéro de vol dans la demande pour que la remise suive votre vraie heure d'arrivée, retard compris.",
        tips: [
          { h: "Livraison à l'aéroport", p: "La voiture est livrée à l'aéroport de Chania et peut y être rendue avant votre vol." },
          { h: "Sans prépaiement en ligne", p: "Vous payez l'agence directement à la prise en main, en espèces ou par carte selon l'offre confirmée." },
        ],
        faqTitle: "Location de voiture aéroport de Chania FAQ",
        faq: [
          { q: "Puis-je récupérer la voiture aux arrivées ?", a: "Oui. L'agence locale fonctionne en remise en main propre, sans file au comptoir après le vol." },
          { q: "À quelle distance est Chania de l'aéroport ?", a: "L'aéroport de Chania est à environ 14 km de la vieille ville, souvent 20 à 25 minutes de route." },
          { q: "Puis-je rendre la voiture à l'aéroport ?", a: "Oui. Le retour à l'aéroport est possible et confirmé avec l'agence dans votre offre." },
        ],
      },
      de: {
        h1: "Mietwagen am Flughafen Chania (CHQ)",
        intro: "Der Flughafen Chania ist ein praktischer Abholpunkt für Westkreta: Chania, Kissamos, Falassarna, Balos und Elafonisi. Er liegt auf der Halbinsel Akrotiri, etwa 14 km von der Altstadt entfernt.",
        deliveryTitle: "Ihren Wagen am CHQ abholen",
        delivery: "Die lokale Agentur bringt den Wagen zum Flughafen und trifft Sie nach der Landung. Geben Sie Ihre Flugnummer an, damit die Übergabe Ihrer echten Ankunftszeit folgt, auch bei Verspätung.",
        tips: [
          { h: "Lieferung zum Flughafen", p: "Der Wagen wird zum Flughafen Chania gebracht und kann dort vor dem Rückflug zurückgegeben werden." },
          { h: "Keine Online-Vorauszahlung", p: "Sie zahlen die Agentur direkt bei der Übernahme, bar oder mit Karte je nach bestätigtem Angebot." },
        ],
        faqTitle: "Mietwagen Flughafen Chania FAQ",
        faq: [
          { q: "Kann ich den Wagen bei der Ankunft übernehmen?", a: "Ja. Die lokale Agentur nutzt persönliche Übergabe, daher vermeiden Sie die Schlange am Schalter." },
          { q: "Wie weit ist Chania vom Flughafen entfernt?", a: "Der Flughafen Chania liegt etwa 14 km von der Altstadt entfernt, meist 20 bis 25 Minuten mit dem Auto." },
          { q: "Kann ich den Wagen am Flughafen zurückgeben?", a: "Ja. Rückgabe am Flughafen ist möglich und wird im Angebot der Agentur bestätigt." },
        ],
      },
      el: {
        h1: "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Χανίων (CHQ)",
        intro: "Το αεροδρόμιο Χανίων είναι βολικό σημείο παραλαβής για τη δυτική Κρήτη: Χανιά, Κίσσαμο, Φαλάσαρνα, Μπάλο και Ελαφονήσι. Βρίσκεται στη χερσόνησο του Ακρωτηρίου, περίπου 14 χλμ. από την παλιά πόλη.",
        deliveryTitle: "Παραλαβή του αυτοκινήτου στο CHQ",
        delivery: "Το τοπικό γραφείο φέρνει το αυτοκίνητο στο αεροδρόμιο και σας υποδέχεται μετά την προσγείωση. Προσθέστε τον αριθμό πτήσης σας στο αίτημα, ώστε η παράδοση να ακολουθήσει την πραγματική ώρα άφιξής σας, ακόμη και σε περίπτωση καθυστέρησης.",
        tips: [
          { h: "Παράδοση στο αεροδρόμιο", p: "Το αυτοκίνητο παραδίδεται στο αεροδρόμιο Χανίων και μπορεί να επιστραφεί εκεί πριν από την πτήση σας." },
          { h: "Χωρίς προπληρωμή online", p: "Πληρώνετε το γραφείο απευθείας κατά την παραλαβή, με μετρητά ή κάρτα ανάλογα με την επιβεβαιωμένη προσφορά." },
        ],
        faqTitle: "Συχνές ερωτήσεις για ενοικίαση αυτοκινήτου στο αεροδρόμιο Χανίων",
        faq: [
          { q: "Μπορώ να παραλάβω το αυτοκίνητο στις αφίξεις;", a: "Ναι. Το τοπικό γραφείο σας υποδέχεται προσωπικά στις αφίξεις, οπότε αποφεύγετε την ουρά στο γκισέ μετά την πτήση." },
          { q: "Πόσο απέχουν τα Χανιά από το αεροδρόμιο;", a: "Το αεροδρόμιο Χανίων απέχει περίπου 14 χλμ. από την παλιά πόλη, συνήθως 20 με 25 λεπτά οδικώς." },
          { q: "Μπορώ να επιστρέψω το αυτοκίνητο στο αεροδρόμιο;", a: "Ναι. Η επιστροφή στο αεροδρόμιο είναι διαθέσιμη και επιβεβαιώνεται με το γραφείο στην προσφορά σας." },
        ],
      },
    },
  },
  "heraklion-airport": {
    hub: { en: "Heraklion Airport (HER)", fr: "Aéroport d'Héraklion (HER)", de: "Flughafen Heraklion (HER)", el: "Αεροδρόμιο Ηρακλείου (HER)" },
    meta: {
      en: {
        title: "Car Rental Heraklion Airport (HER) - No Prepayment",
        desc: "Rent a car at Heraklion Airport (HER) with a local agency. Meet at arrivals, pay on the spot, no online prepayment.",
      },
      fr: {
        title: "Location de voiture aéroport d'Héraklion (HER) - agence locale, sans prépaiement",
        desc: "Louez une voiture à l'aéroport d'Héraklion (HER) avec une agence locale. Accueil à l'arrivée, paiement sur place, aucun prépaiement en ligne.",
      },
      de: {
        title: "Mietwagen Flughafen Heraklion (HER) - lokale Agentur, keine Vorauszahlung",
        desc: "Mietwagen am Flughafen Heraklion (HER) bei einer lokalen Agentur. Übergabe bei Ankunft, Zahlung vor Ort, keine Online-Vorauszahlung.",
      },
      el: {
        title: "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Ηρακλείου (HER) - τοπικό γραφείο, χωρίς προπληρωμή",
        desc: "Νοικιάστε αυτοκίνητο στο αεροδρόμιο Ηρακλείου (HER) από τοπικό γραφείο. Υποδοχή στις αφίξεις, πληρωμή επί τόπου, καμία προπληρωμή online.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Heraklion Airport (HER)",
        intro: "Heraklion Airport is Crete's busiest arrival point and a practical base for Knossos, the north coast and Lasithi. It sits about 5 km east of the city centre.",
        deliveryTitle: "Picking up your car at HER",
        delivery: "The local agency delivers the car to Heraklion Airport and hands over the keys after you land. Share your flight number so the agency can adjust for delays.",
        tips: [
          { h: "Fast city exit", p: "You can drive straight toward Knossos, Hersonissos, Malia or the east coast without waiting for an airport bus." },
          { h: "Pay on arrival", p: "No online payment is taken by Crete Direct. You settle directly with the agency when the offer is confirmed." },
        ],
        faqTitle: "Heraklion Airport car rental FAQ",
        faq: [
          { q: "Is Heraklion Airport close to the city?", a: "Yes. HER is around 5 km east of the centre, often 10 to 15 minutes by road." },
          { q: "Can I add a flight number?", a: "Yes. The wizard includes an optional flight field so the agency can time the handover." },
          { q: "Can I return the car somewhere else?", a: "Usually yes within the Heraklion area, but any one-way fee is confirmed by the agency." },
        ],
      },
      fr: {
        h1: "Location de voiture à l'aéroport d'Héraklion (HER)",
        intro: "L'aéroport d'Héraklion est le principal point d'arrivée en Crète et une base pratique pour Knossos, la côte nord et le Lassithi. Il se trouve à environ 5 km à l'est du centre-ville.",
        deliveryTitle: "Récupérer votre voiture à HER",
        delivery: "L'agence locale livre la voiture à l'aéroport d'Héraklion et remet les clés après votre atterrissage. Indiquez votre numéro de vol pour que l'agence ajuste la remise en cas de retard.",
        tips: [
          { h: "Sortie rapide de la ville", p: "Vous pouvez partir directement vers Knossos, Hersonissos, Malia ou la côte est sans attendre le bus aéroport." },
          { h: "Paiement à l'arrivée", p: "Crete Direct ne prend aucun paiement en ligne. Vous réglez directement l'agence quand l'offre est confirmée." },
        ],
        faqTitle: "Location de voiture aéroport d'Héraklion FAQ",
        faq: [
          { q: "L'aéroport d'Héraklion est-il proche du centre ?", a: "Oui. HER est à environ 5 km à l'est du centre, souvent 10 à 15 minutes de route." },
          { q: "Puis-je ajouter un numéro de vol ?", a: "Oui. Le formulaire inclut un champ vol facultatif pour aider l'agence à caler la remise." },
          { q: "Puis-je rendre la voiture ailleurs ?", a: "Souvent oui dans la région d'Héraklion, mais d'éventuels frais d'aller simple sont confirmés par l'agence." },
        ],
      },
      de: {
        h1: "Mietwagen am Flughafen Heraklion (HER)",
        intro: "Der Flughafen Heraklion ist Kretas wichtigster Ankunftsort und eine praktische Basis für Knossos, die Nordküste und Lasithi. Er liegt etwa 5 km östlich des Zentrums.",
        deliveryTitle: "Ihren Wagen am HER abholen",
        delivery: "Die lokale Agentur liefert den Wagen zum Flughafen Heraklion und übergibt die Schlüssel nach der Landung. Teilen Sie Ihre Flugnummer mit, damit die Agentur Verspätungen einplanen kann.",
        tips: [
          { h: "Schnell aus der Stadt", p: "Sie fahren direkt nach Knossos, Hersonissos, Malia oder an die Ostküste, ohne auf den Flughafenbus zu warten." },
          { h: "Zahlung bei Ankunft", p: "Crete Direct nimmt keine Online-Zahlung. Sie zahlen direkt an die Agentur, wenn das Angebot bestätigt ist." },
        ],
        faqTitle: "Mietwagen Flughafen Heraklion FAQ",
        faq: [
          { q: "Liegt der Flughafen Heraklion nahe am Zentrum?", a: "Ja. HER liegt etwa 5 km östlich des Zentrums, oft 10 bis 15 Minuten mit dem Auto." },
          { q: "Kann ich eine Flugnummer angeben?", a: "Ja. Das Formular enthält ein optionales Flugfeld, damit die Agentur die Übergabe planen kann." },
          { q: "Kann ich den Wagen anderswo zurückgeben?", a: "Meist ja im Raum Heraklion, aber mögliche Einweggebühren bestätigt die Agentur." },
        ],
      },
      el: {
        h1: "Ενοικίαση αυτοκινήτου στο αεροδρόμιο Ηρακλείου (HER)",
        intro: "Το αεροδρόμιο Ηρακλείου είναι το κύριο σημείο άφιξης στην Κρήτη και πρακτική βάση για την Κνωσό, τη βόρεια ακτή και το Λασίθι. Βρίσκεται περίπου 5 χλμ. ανατολικά του κέντρου της πόλης.",
        deliveryTitle: "Παραλαβή του αυτοκινήτου στο HER",
        delivery: "Το τοπικό γραφείο παραδίδει το αυτοκίνητο στο αεροδρόμιο Ηρακλείου και σας δίνει τα κλειδιά μετά την προσγείωση. Δηλώστε τον αριθμό πτήσης σας, ώστε το γραφείο να προσαρμοστεί σε τυχόν καθυστερήσεις.",
        tips: [
          { h: "Γρήγορη έξοδος από την πόλη", p: "Μπορείτε να ξεκινήσετε αμέσως για την Κνωσό, τη Χερσόνησο, τα Μάλια ή την ανατολική ακτή, χωρίς να περιμένετε το λεωφορείο του αεροδρομίου." },
          { h: "Πληρωμή κατά την άφιξη", p: "Το Crete Direct δεν εισπράττει καμία πληρωμή online. Εξοφλείτε απευθείας το γραφείο όταν επιβεβαιωθεί η προσφορά." },
        ],
        faqTitle: "Συχνές ερωτήσεις για ενοικίαση αυτοκινήτου στο αεροδρόμιο Ηρακλείου",
        faq: [
          { q: "Είναι το αεροδρόμιο Ηρακλείου κοντά στην πόλη;", a: "Ναι. Το HER βρίσκεται περίπου 5 χλμ. ανατολικά του κέντρου, συχνά 10 με 15 λεπτά οδικώς." },
          { q: "Μπορώ να προσθέσω αριθμό πτήσης;", a: "Ναι. Η φόρμα περιλαμβάνει προαιρετικό πεδίο πτήσης, ώστε το γραφείο να συντονίσει την ώρα της παράδοσης." },
          { q: "Μπορώ να επιστρέψω το αυτοκίνητο αλλού;", a: "Συνήθως ναι, εντός της περιοχής του Ηρακλείου, αλλά τυχόν χρέωση μονής διαδρομής επιβεβαιώνεται από το γραφείο." },
        ],
      },
    },
  },
  "souda-port": {
    hub: { en: "Souda Port (Chania)", fr: "Port de Souda (Chania)", de: "Hafen Souda (Chania)", el: "Λιμάνι Σούδας (Χανιά)" },
    meta: {
      en: {
        title: "Car Rental Souda Port, Chania - pick up from the ferry",
        desc: "Rent a car at Souda Port near Chania. A local agency meets you from the ferry, with no online prepayment through Crete Direct.",
      },
      fr: {
        title: "Location de voiture port de Souda, Chania - à la descente du ferry",
        desc: "Louez une voiture au port de Souda près de Chania. Une agence locale vous accueille à la descente du ferry, sans prépaiement en ligne via Crete Direct.",
      },
      de: {
        title: "Mietwagen Hafen Souda, Chania - Abholung an der Fähre",
        desc: "Mietwagen am Hafen Souda bei Chania. Eine lokale Agentur empfängt Sie an der Fähre, ohne Online-Vorauszahlung über Crete Direct.",
      },
      el: {
        title: "Ενοικίαση αυτοκινήτου στο λιμάνι της Σούδας, Χανιά - παραλαβή από το πλοίο",
        desc: "Νοικιάστε αυτοκίνητο στο λιμάνι της Σούδας κοντά στα Χανιά. Τοπικό γραφείο σας υποδέχεται στην άφιξη του πλοίου, χωρίς προπληρωμή online μέσω του Crete Direct.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Souda Port (Chania)",
        intro: "Souda is the ferry port for Chania, about 7 km from the city. A car at the port lets you start west Crete immediately after the overnight ferry from Piraeus.",
        deliveryTitle: "Picking up your car from the ferry",
        delivery: "The local agency meets you at Souda and delivers the car at the port. Add the ferry arrival time in the request so the handover matches the boat schedule.",
        tips: [
          { h: "Meet at the port", p: "No need to travel into Chania first. The agency confirms the exact meeting point before arrival." },
          { h: "Good for west Crete", p: "Souda is convenient for Chania, Kalyves, Georgioupolis, Kissamos and the western beaches." },
        ],
        faqTitle: "Souda Port car rental FAQ",
        faq: [
          { q: "Can I collect a car at Souda port?", a: "Yes. The agency can deliver the car to the port when your ferry arrives." },
          { q: "How far is Souda from Chania?", a: "Souda is about 7 km east of Chania, usually around 15 minutes by road." },
          { q: "Which ferry route uses Souda?", a: "Souda is mainly used by the overnight ferry route between Piraeus and Chania." },
        ],
      },
      fr: {
        h1: "Location de voiture au port de Souda (Chania)",
        intro: "Souda est le port ferry de Chania, à environ 7 km de la ville. Une voiture au port permet de commencer à explorer l'ouest de la Crète dès l'arrivée du ferry de nuit depuis Le Pirée.",
        deliveryTitle: "Récupérer votre voiture à la descente du ferry",
        delivery: "L'agence locale vous accueille à Souda et livre la voiture au port. Ajoutez l'heure d'arrivée du ferry dans la demande pour caler la remise sur le bateau.",
        tips: [
          { h: "Rendez-vous au port", p: "Pas besoin d'aller d'abord à Chania. L'agence confirme le point exact avant l'arrivée." },
          { h: "Pratique pour l'ouest", p: "Souda est bien placé pour Chania, Kalyves, Georgioupolis, Kissamos et les plages de l'ouest." },
        ],
        faqTitle: "Location de voiture port de Souda FAQ",
        faq: [
          { q: "Puis-je récupérer une voiture au port de Souda ?", a: "Oui. L'agence peut livrer la voiture au port à l'arrivée de votre ferry." },
          { q: "À quelle distance est Souda de Chania ?", a: "Souda est à environ 7 km à l'est de Chania, souvent autour de 15 minutes de route." },
          { q: "Quelle ligne de ferry utilise Souda ?", a: "Souda est surtout utilisé par la ligne de nuit entre Le Pirée et Chania." },
        ],
      },
      de: {
        h1: "Mietwagen am Hafen Souda (Chania)",
        intro: "Souda ist der Fährhafen von Chania, etwa 7 km von der Stadt entfernt. Ein Wagen am Hafen lässt Sie nach der Nachtfähre aus Piräus direkt in Westkreta starten.",
        deliveryTitle: "Ihren Wagen an der Fähre abholen",
        delivery: "Die lokale Agentur trifft Sie in Souda und liefert den Wagen am Hafen. Geben Sie die Ankunftszeit der Fähre an, damit die Übergabe zum Fahrplan passt.",
        tips: [
          { h: "Treffen am Hafen", p: "Sie müssen nicht zuerst nach Chania fahren. Die Agentur bestätigt den genauen Treffpunkt vor Ankunft." },
          { h: "Gut für Westkreta", p: "Souda ist praktisch für Chania, Kalyves, Georgioupolis, Kissamos und die Strände im Westen." },
        ],
        faqTitle: "Mietwagen Hafen Souda FAQ",
        faq: [
          { q: "Kann ich einen Wagen am Hafen Souda übernehmen?", a: "Ja. Die Agentur kann den Wagen bei Ankunft Ihrer Fähre zum Hafen liefern." },
          { q: "Wie weit ist Souda von Chania entfernt?", a: "Souda liegt etwa 7 km östlich von Chania, meist rund 15 Minuten mit dem Auto." },
          { q: "Welche Fähre nutzt Souda?", a: "Souda wird vor allem von der Nachtfähre zwischen Piräus und Chania genutzt." },
        ],
      },
      el: {
        h1: "Ενοικίαση αυτοκινήτου στο λιμάνι της Σούδας (Χανιά)",
        intro: "Η Σούδα είναι το ακτοπλοϊκό λιμάνι των Χανίων, περίπου 7 χλμ. από την πόλη. Με αυτοκίνητο στο λιμάνι ξεκινάτε την εξερεύνηση της δυτικής Κρήτης αμέσως μετά το νυχτερινό πλοίο από τον Πειραιά.",
        deliveryTitle: "Παραλαβή του αυτοκινήτου από το πλοίο",
        delivery: "Το τοπικό γραφείο σας συναντά στη Σούδα και παραδίδει το αυτοκίνητο στο λιμάνι. Προσθέστε την ώρα άφιξης του πλοίου στο αίτημα, ώστε η παράδοση να συμπέσει με το δρομολόγιο.",
        tips: [
          { h: "Συνάντηση στο λιμάνι", p: "Δεν χρειάζεται να πάτε πρώτα στα Χανιά. Το γραφείο επιβεβαιώνει το ακριβές σημείο συνάντησης πριν από την άφιξη." },
          { h: "Βολικό για τη δυτική Κρήτη", p: "Η Σούδα εξυπηρετεί άνετα Χανιά, Καλύβες, Γεωργιούπολη, Κίσσαμο και τις δυτικές παραλίες." },
        ],
        faqTitle: "Συχνές ερωτήσεις για ενοικίαση αυτοκινήτου στο λιμάνι της Σούδας",
        faq: [
          { q: "Μπορώ να παραλάβω αυτοκίνητο στο λιμάνι της Σούδας;", a: "Ναι. Το γραφείο μπορεί να παραδώσει το αυτοκίνητο στο λιμάνι όταν φτάσει το πλοίο σας." },
          { q: "Πόσο απέχει η Σούδα από τα Χανιά;", a: "Η Σούδα βρίσκεται περίπου 7 χλμ. ανατολικά των Χανίων, συνήθως γύρω στα 15 λεπτά οδικώς." },
          { q: "Ποια ακτοπλοϊκή γραμμή χρησιμοποιεί τη Σούδα;", a: "Η Σούδα εξυπηρετεί κυρίως τη νυχτερινή γραμμή μεταξύ Πειραιά και Χανίων." },
        ],
      },
    },
  },
  "heraklion-port": {
    hub: { en: "Heraklion Port", fr: "Port d'Héraklion", de: "Hafen Heraklion", el: "Λιμάνι Ηρακλείου" },
    meta: {
      en: {
        title: "Car Rental Heraklion Port - pick up from the ferry",
        desc: "Rent a car at Heraklion ferry port. Local agency handover, pay on arrival, no online prepayment through Crete Direct.",
      },
      fr: {
        title: "Location de voiture port d'Héraklion - à la descente du ferry",
        desc: "Louez une voiture au port ferry d'Héraklion. Remise par une agence locale, paiement à l'arrivée, aucun prépaiement en ligne via Crete Direct.",
      },
      de: {
        title: "Mietwagen Hafen Heraklion - Abholung an der Fähre",
        desc: "Mietwagen am Fährhafen Heraklion. Übergabe durch eine lokale Agentur, Zahlung bei Ankunft, keine Online-Vorauszahlung über Crete Direct.",
      },
      el: {
        title: "Ενοικίαση αυτοκινήτου στο λιμάνι του Ηρακλείου - παραλαβή από το πλοίο",
        desc: "Νοικιάστε αυτοκίνητο στο ακτοπλοϊκό λιμάνι του Ηρακλείου. Παράδοση από τοπικό γραφείο, πληρωμή κατά την άφιξη, καμία προπληρωμή online μέσω του Crete Direct.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Heraklion Port",
        intro: "Heraklion Port is on the edge of the city centre and links Crete with Piraeus and Cyclades islands such as Santorini. It is a strong pick-up point for central and east Crete.",
        deliveryTitle: "Picking up your car at the port",
        delivery: "The local agency meets you at Heraklion Port after disembarkation. Add your ferry arrival time and the agency confirms the meeting point with the offer.",
        tips: [
          { h: "Central location", p: "The port is close to the old harbour, the city centre and the road toward Knossos." },
          { h: "Straight from the ferry", p: "You can leave the port by car without first taking a taxi to a rental office." },
        ],
        faqTitle: "Heraklion Port car rental FAQ",
        faq: [
          { q: "Can I rent a car from Heraklion Port?", a: "Yes. The local agency can meet you at the port and hand over the car after the ferry arrives." },
          { q: "Is the port near Heraklion centre?", a: "Yes. The ferry port sits beside the centre and close to the old harbour." },
          { q: "Can I drive to Knossos from the port?", a: "Yes. Knossos is a short drive south of Heraklion and works well as a first stop." },
        ],
      },
      fr: {
        h1: "Location de voiture au port d'Héraklion",
        intro: "Le port d'Héraklion se trouve au bord du centre-ville et relie la Crète au Pirée et aux Cyclades comme Santorin. C'est un bon point de prise en charge pour le centre et l'est de la Crète.",
        deliveryTitle: "Récupérer votre voiture au port",
        delivery: "L'agence locale vous accueille au port d'Héraklion après le débarquement. Ajoutez l'heure d'arrivée du ferry et l'agence confirme le point de rendez-vous avec l'offre.",
        tips: [
          { h: "Position centrale", p: "Le port est proche du vieux port, du centre-ville et de la route vers Knossos." },
          { h: "Directement depuis le ferry", p: "Vous quittez le port en voiture sans prendre d'abord un taxi vers une agence." },
        ],
        faqTitle: "Location de voiture port d'Héraklion FAQ",
        faq: [
          { q: "Puis-je louer une voiture depuis le port d'Héraklion ?", a: "Oui. L'agence locale peut vous accueillir au port et remettre la voiture après l'arrivée du ferry." },
          { q: "Le port est-il près du centre d'Héraklion ?", a: "Oui. Le port ferry borde le centre et se trouve près du vieux port." },
          { q: "Puis-je aller à Knossos depuis le port ?", a: "Oui. Knossos est à courte distance au sud d'Héraklion et fonctionne bien comme première étape." },
        ],
      },
      de: {
        h1: "Mietwagen am Hafen Heraklion",
        intro: "Der Hafen Heraklion liegt am Rand des Stadtzentrums und verbindet Kreta mit Piräus und Kykladeninseln wie Santorin. Er ist ein guter Abholpunkt für Zentral- und Ostkreta.",
        deliveryTitle: "Ihren Wagen am Hafen abholen",
        delivery: "Die lokale Agentur trifft Sie nach dem Aussteigen am Hafen Heraklion. Geben Sie die Ankunftszeit der Fähre an, und die Agentur bestätigt den Treffpunkt mit dem Angebot.",
        tips: [
          { h: "Zentrale Lage", p: "Der Hafen liegt nahe am alten Hafen, am Zentrum und an der Straße nach Knossos." },
          { h: "Direkt von der Fähre", p: "Sie verlassen den Hafen mit dem Auto, ohne zuerst ein Taxi zu einer Mietstation zu nehmen." },
        ],
        faqTitle: "Mietwagen Hafen Heraklion FAQ",
        faq: [
          { q: "Kann ich am Hafen Heraklion einen Wagen mieten?", a: "Ja. Die lokale Agentur kann Sie am Hafen treffen und den Wagen nach Ankunft der Fähre übergeben." },
          { q: "Liegt der Hafen nahe am Zentrum?", a: "Ja. Der Fährhafen liegt am Rand des Zentrums und nahe am alten Hafen." },
          { q: "Kann ich vom Hafen nach Knossos fahren?", a: "Ja. Knossos liegt eine kurze Fahrt südlich von Heraklion und ist ein guter erster Stopp." },
        ],
      },
      el: {
        h1: "Ενοικίαση αυτοκινήτου στο λιμάνι του Ηρακλείου",
        intro: "Το λιμάνι του Ηρακλείου βρίσκεται δίπλα στο κέντρο της πόλης και συνδέει την Κρήτη με τον Πειραιά και νησιά των Κυκλάδων όπως η Σαντορίνη. Είναι καλό σημείο παραλαβής για την κεντρική και την ανατολική Κρήτη.",
        deliveryTitle: "Παραλαβή του αυτοκινήτου στο λιμάνι",
        delivery: "Το τοπικό γραφείο σας συναντά στο λιμάνι του Ηρακλείου μετά την αποβίβαση. Προσθέστε την ώρα άφιξης του πλοίου και το γραφείο επιβεβαιώνει το σημείο συνάντησης μαζί με την προσφορά.",
        tips: [
          { h: "Κεντρική θέση", p: "Το λιμάνι βρίσκεται κοντά στο παλιό λιμάνι, στο κέντρο της πόλης και στον δρόμο προς την Κνωσό." },
          { h: "Κατευθείαν από το πλοίο", p: "Φεύγετε από το λιμάνι με το αυτοκίνητο, χωρίς να πάρετε πρώτα ταξί για κάποιο γραφείο ενοικίασης." },
        ],
        faqTitle: "Συχνές ερωτήσεις για ενοικίαση αυτοκινήτου στο λιμάνι του Ηρακλείου",
        faq: [
          { q: "Μπορώ να νοικιάσω αυτοκίνητο από το λιμάνι του Ηρακλείου;", a: "Ναι. Το τοπικό γραφείο μπορεί να σας συναντήσει στο λιμάνι και να παραδώσει το αυτοκίνητο μετά την άφιξη του πλοίου." },
          { q: "Είναι το λιμάνι κοντά στο κέντρο του Ηρακλείου;", a: "Ναι. Το ακτοπλοϊκό λιμάνι βρίσκεται δίπλα στο κέντρο και κοντά στο παλιό λιμάνι." },
          { q: "Μπορώ να πάω στην Κνωσό από το λιμάνι;", a: "Ναι. Η Κνωσός απέχει μικρή διαδρομή νότια του Ηρακλείου και είναι καλή πρώτη στάση." },
        ],
      },
    },
  },
  "heraklion": {
      hub: { en: "Heraklion Town", fr: "Héraklion (ville)", de: "Heraklion (Stadt)", el: "Ηράκλειο (πόλη)" },
      meta: {
        en: {
          title: "Car Rental Heraklion Town - local agency, no prepayment",
          desc: "Rent a car in Heraklion town with a local agency. Delivery to your accommodation usually possible, pay at pick-up, no online prepayment.",
        },
        fr: {
          title: "Location de voiture Héraklion (ville) - agence locale, sans prépaiement",
          desc: "Louez une voiture à Héraklion avec une agence locale. Livraison à l'hébergement généralement possible, paiement à la prise en main, aucun prépaiement en ligne.",
        },
        de: {
          title: "Mietwagen Heraklion (Stadt) - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Heraklion bei einer lokalen Agentur. Lieferung zur Unterkunft meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στο Ηράκλειο (πόλη) - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στο Ηράκλειο από τοπικό γραφείο. Παράδοση στο κατάλυμα συνήθως εφικτή, πληρωμή στην παραλαβή, χωρίς online προπληρωμή.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Heraklion",
          intro: "Heraklion is Crete's largest city and a practical base for day trips to Knossos, the Lasithi plateau, Elounda and Spinalonga, or Rethymno. The airport is about 5 km away (10 to 15 minutes, up to 30 in August), Knossos about 5.5 km (15 to 20 minutes), Hersonissos about 25 km and Malia about 34 km.",
          deliveryTitle: "Picking up your car in Heraklion",
          delivery: "The local agency can usually deliver the car to your hotel or apartment in Heraklion; the exact meeting point is confirmed with the offer. You pay the agency at the handover, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Choose a small car", p: "The historic centre has one-way streets, narrow lanes and scarce parking. A compact car makes the city part of your stay much easier." },
            { h: "Park near the port", p: "The port car parks cost around 3 to 4 euros per day and are a 5 to 10 minute walk from the centre. Yellow lines mean no parking; when in doubt, use an enclosed car park." },
          ],
          faqTitle: "Heraklion car rental FAQ",
          faq: [
            { q: "Where can I park in Heraklion?", a: "The port car parks charge around 3 to 4 euros per day, about 5 to 10 minutes on foot from the centre, and there are also covered car parks in the centre itself. Avoid yellow lines, which mean no parking, and prefer an enclosed car park if the street rules are unclear." },
            { q: "How long is the drive to Knossos?", a: "Knossos is about 5.5 km from the centre, usually 15 to 20 minutes by car." },
            { q: "How far is Rethymno from Heraklion?", a: "About 78 to 80 km by the national road, usually 1 hour to 1 hour 30. It is a national road rather than a continental-style motorway: local drivers often ride the hard shoulder to let others overtake, and the shoulder can end abruptly." },
          ],
        },
        fr: {
          h1: "Location de voiture à Héraklion",
          intro: "Héraklion est la plus grande ville de Crète et une base pratique pour Knossos, le plateau du Lassithi, Elounda et Spinalonga, ou Rethymno. L'aéroport est à environ 5 km (10 à 15 minutes, jusqu'à 30 en août), Knossos à environ 5,5 km (15 à 20 minutes), Hersonissos à environ 25 km et Malia à environ 34 km.",
          deliveryTitle: "Récupérer votre voiture à Héraklion",
          delivery: "L'agence locale peut généralement livrer la voiture à votre hôtel ou appartement à Héraklion ; le point de rendez-vous exact est confirmé avec l'offre. Vous réglez l'agence à la remise des clés, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Choisissez une petite voiture", p: "Le centre historique enchaîne sens uniques, rues étroites et stationnement rare. Une petite voiture rend la partie urbaine du séjour bien plus simple." },
            { h: "Garez-vous près du port", p: "Les parkings du port coûtent environ 3 à 4 euros par jour, à 5 à 10 minutes à pied du centre. Les lignes jaunes signifient stationnement interdit ; en cas de doute, préférez un parking fermé." },
          ],
          faqTitle: "Location de voiture à Héraklion FAQ",
          faq: [
            { q: "Où se garer à Héraklion ?", a: "Les parkings du port coûtent environ 3 à 4 euros par jour, à 5 à 10 minutes à pied du centre, et le centre compte aussi des parkings couverts. Évitez les lignes jaunes, qui signifient stationnement interdit, et préférez un parking fermé si les règles de la rue ne sont pas claires." },
            { q: "Combien de temps pour aller à Knossos ?", a: "Knossos est à environ 5,5 km du centre, souvent 15 à 20 minutes en voiture." },
            { q: "À quelle distance est Rethymno d'Héraklion ?", a: "Environ 78 à 80 km par la nationale, souvent 1 h à 1 h 30 de route. C'est une route nationale, pas une autoroute au standard continental : les conducteurs locaux roulent souvent sur la bande d'arrêt d'urgence pour laisser doubler, et cette bande peut s'interrompre brusquement." },
          ],
        },
        de: {
          h1: "Mietwagen in Heraklion",
          intro: "Heraklion ist Kretas größte Stadt und eine praktische Basis für Tagesausflüge nach Knossos, zur Lasithi-Hochebene, nach Elounda und Spinalonga oder nach Rethymno. Der Flughafen liegt etwa 5 km entfernt (10 bis 15 Minuten, im August bis zu 30), Knossos etwa 5,5 km (15 bis 20 Minuten), Hersonissos etwa 25 km und Malia etwa 34 km.",
          deliveryTitle: "Ihren Wagen in Heraklion übernehmen",
          delivery: "Die lokale Agentur liefert den Wagen meist zu Ihrem Hotel oder Apartment in Heraklion; der genaue Treffpunkt wird mit dem Angebot bestätigt. Sie zahlen die Agentur bei der Übergabe, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Kleines Auto wählen", p: "Die Altstadt hat Einbahnstraßen, enge Gassen und wenige Parkplätze. Ein kompakter Wagen macht den Aufenthalt in der Stadt deutlich einfacher." },
            { h: "Am Hafen parken", p: "Die Parkplätze am Hafen kosten etwa 3 bis 4 Euro pro Tag und liegen 5 bis 10 Gehminuten vom Zentrum entfernt. Gelbe Linien bedeuten Parkverbot; im Zweifel nutzen Sie ein geschlossenes Parkhaus." },
          ],
          faqTitle: "Mietwagen Heraklion FAQ",
          faq: [
            { q: "Wo kann ich in Heraklion parken?", a: "Die Parkplätze am Hafen kosten etwa 3 bis 4 Euro pro Tag, rund 5 bis 10 Gehminuten vom Zentrum, und im Zentrum selbst gibt es überdachte Parkhäuser. Meiden Sie gelbe Linien, die Parkverbot bedeuten, und nutzen Sie im Zweifel ein geschlossenes Parkhaus." },
            { q: "Wie lange dauert die Fahrt nach Knossos?", a: "Knossos liegt etwa 5,5 km vom Zentrum entfernt, meist 15 bis 20 Minuten mit dem Auto." },
            { q: "Wie weit ist Rethymno von Heraklion entfernt?", a: "Etwa 78 bis 80 km über die Nationalstraße, meist 1 Stunde bis 1,5 Stunden. Es ist eine Nationalstraße, keine Autobahn nach kontinentalem Standard: Einheimische fahren oft auf dem Seitenstreifen, um das Überholen zu erleichtern, und der Streifen kann abrupt enden." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στο Ηράκλειο",
          intro: "Το Ηράκλειο είναι η μεγαλύτερη πόλη της Κρήτης και πρακτική βάση για εκδρομές στην Κνωσό, στο οροπέδιο Λασιθίου, στην Ελούντα και τη Σπιναλόγκα ή στο Ρέθυμνο. Το αεροδρόμιο απέχει περίπου 5 χλμ. (10 έως 15 λεπτά, έως 30 τον Αύγουστο), η Κνωσός περίπου 5,5 χλμ. (15 έως 20 λεπτά), η Χερσόνησος περίπου 25 χλμ. και τα Μάλια περίπου 34 χλμ.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου σας στο Ηράκλειο",
          delivery: "Το τοπικό γραφείο μπορεί συνήθως να παραδώσει το αυτοκίνητο στο ξενοδοχείο ή το διαμέρισμά σας στο Ηράκλειο· το ακριβές σημείο συνάντησης επιβεβαιώνεται με την προσφορά. Πληρώνετε το γραφείο κατά την παράδοση, χωρίς online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Προτιμήστε μικρό αυτοκίνητο", p: "Το ιστορικό κέντρο έχει μονοδρόμους, στενά δρομάκια και λίγες θέσεις στάθμευσης. Ένα μικρό αυτοκίνητο κάνει το κομμάτι της πόλης πολύ πιο εύκολο." },
            { h: "Παρκάρετε κοντά στο λιμάνι", p: "Τα πάρκινγκ του λιμανιού κοστίζουν περίπου 3 έως 4 ευρώ την ημέρα και απέχουν 5 έως 10 λεπτά με τα πόδια από το κέντρο. Οι κίτρινες γραμμές σημαίνουν απαγόρευση στάθμευσης· σε περίπτωση αμφιβολίας, προτιμήστε κλειστό πάρκινγκ." },
          ],
          faqTitle: "Συχνές ερωτήσεις για την ενοικίαση αυτοκινήτου στο Ηράκλειο",
          faq: [
            { q: "Πού μπορώ να παρκάρω στο Ηράκλειο;", a: "Τα πάρκινγκ του λιμανιού χρεώνουν περίπου 3 έως 4 ευρώ την ημέρα, περίπου 5 έως 10 λεπτά με τα πόδια από το κέντρο, ενώ υπάρχουν και στεγασμένα πάρκινγκ μέσα στο κέντρο. Αποφύγετε τις κίτρινες γραμμές, που σημαίνουν απαγόρευση στάθμευσης, και προτιμήστε κλειστό πάρκινγκ αν οι κανόνες του δρόμου δεν είναι σαφείς." },
            { q: "Πόσο διαρκεί η διαδρομή προς την Κνωσό;", a: "Η Κνωσός απέχει περίπου 5,5 χλμ. από το κέντρο, συνήθως 15 έως 20 λεπτά με το αυτοκίνητο." },
            { q: "Πόσο απέχει το Ρέθυμνο από το Ηράκλειο;", a: "Περίπου 78 έως 80 χλμ. από την εθνική οδό, συνήθως 1 ώρα έως 1 ώρα και 30 λεπτά. Είναι εθνική οδός και όχι αυτοκινητόδρομος ηπειρωτικών προδιαγραφών: οι ντόπιοι συχνά κινούνται στη λωρίδα έκτακτης ανάγκης για να διευκολύνουν την προσπέραση, και η λωρίδα μπορεί να διακοπεί απότομα." },
          ],
        },
      },
    },
    "rethymno": {
      hub: { en: "Rethymno Town", fr: "Rethymno (ville)", de: "Rethymno (Stadt)", el: "Ρέθυμνο (πόλη)" },
      meta: {
        en: {
          title: "Car Rental Rethymno Town - local agency, no prepayment",
          desc: "Rent a car in Rethymno with a local agency. Delivery to your accommodation usually possible, pay on the spot, no online prepayment.",
        },
        fr: {
          title: "Location de voiture Rethymno (ville) - agence locale, sans prépaiement",
          desc: "Louez une voiture à Rethymno avec une agence locale. Livraison à l'hébergement généralement possible, paiement sur place, aucun prépaiement en ligne.",
        },
        de: {
          title: "Mietwagen Rethymno (Stadt) - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Rethymno bei einer lokalen Agentur. Lieferung zur Unterkunft meist möglich, Zahlung vor Ort, keine Online-Vorauszahlung.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στο Ρέθυμνο (πόλη) - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στο Ρέθυμνο από τοπικό γραφείο. Παράδοση στο κατάλυμα συνήθως εφικτή, πληρωμή επί τόπου, χωρίς online προπληρωμή.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Rethymno",
          intro: "Rethymno sits between Chania (about 60 km, 45 minutes to 1 hour) and Heraklion (about 78 to 80 km, 1 hour to 1 hour 30), which makes it a good base for both halves of the island. Arkadi Monastery is about 21 to 23 km away (30 to 40 minutes), Plakias about 33 to 35 km and Preveli about 34 to 35 km on the south coast.",
          deliveryTitle: "Picking up your car in Rethymno",
          delivery: "The local agency can usually deliver the car to your hotel or apartment in Rethymno; the meeting point is confirmed with the offer. You pay the agency at the handover, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Park outside the old town", p: "The old town is largely pedestrian, so plan to park outside and walk in. Free options include the area below the Fortezza walls, near the Sohora stadium and the strip on the right at the marina entrance; in summer, arrive early in the morning." },
            { h: "Plan the Preveli walk", p: "At Preveli you park at the top and reach the beach by a 15 to 20 minute downhill path. The climb back up is steep, so bring water and avoid the midday heat." },
          ],
          faqTitle: "Rethymno car rental FAQ",
          faq: [
            { q: "Where can I park for free in Rethymno?", a: "Below the Fortezza walls, near the Sohora stadium and along the strip on the right at the marina entrance. These fill up fast in summer, so arrive early; paid car parks charge a few euros for a few hours, up to around 10 to 15 euros per day." },
            { q: "How long is the drive to Chania or Heraklion?", a: "Chania is about 60 km away, usually 45 minutes to 1 hour; Heraklion about 78 to 80 km, 1 hour to 1 hour 30. On the national road, a flash of headlights behind you usually means the driver intends to overtake; locals often move onto the hard shoulder to make room, but the shoulder can end abruptly." },
            { q: "How do I visit Arkadi Monastery by car?", a: "Arkadi Monastery is about 21 to 23 km from Rethymno, usually 30 to 40 minutes by car, and works well as a half-day trip." },
          ],
        },
        fr: {
          h1: "Location de voiture à Rethymno",
          intro: "Rethymno se trouve entre Chania (environ 60 km, 45 minutes à 1 h) et Héraklion (environ 78 à 80 km, 1 h à 1 h 30), ce qui en fait une bonne base pour les deux moitiés de l'île. Le monastère d'Arkadi est à environ 21 à 23 km (30 à 40 minutes), Plakias à environ 33 à 35 km et Preveli à environ 34 à 35 km sur la côte sud.",
          deliveryTitle: "Récupérer votre voiture à Rethymno",
          delivery: "L'agence locale peut généralement livrer la voiture à votre hôtel ou appartement à Rethymno ; le point de rendez-vous est confirmé avec l'offre. Vous réglez l'agence à la remise des clés, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Garez-vous hors de la vieille ville", p: "La vieille ville est essentiellement piétonne : prévoyez de vous garer à l'extérieur et de finir à pied. Gratuit : sous les remparts de la Fortezza, près du stade de Sohora et la bande à droite à l'entrée de la marina ; en été, arrivez tôt le matin." },
            { h: "Préparez la marche de Preveli", p: "À Preveli, on se gare en haut et on rejoint la plage par un sentier de 15 à 20 minutes en descente. La remontée est raide : prenez de l'eau et évitez les heures les plus chaudes." },
          ],
          faqTitle: "Location de voiture à Rethymno FAQ",
          faq: [
            { q: "Où se garer gratuitement à Rethymno ?", a: "Sous les remparts de la Fortezza, près du stade de Sohora et sur la bande à droite à l'entrée de la marina. Ces places partent vite en été, donc arrivez tôt ; les parkings payants facturent quelques euros pour quelques heures, jusqu'à environ 10 à 15 euros par jour." },
            { q: "Combien de temps pour rejoindre Chania ou Héraklion ?", a: "Chania est à environ 60 km, souvent 45 minutes à 1 h ; Héraklion à environ 78 à 80 km, 1 h à 1 h 30. Sur la nationale, un appel de phares derrière vous signifie en général que le conducteur va doubler ; les locaux se déportent souvent sur la bande d'arrêt d'urgence pour laisser passer, mais cette bande peut s'interrompre brusquement." },
            { q: "Comment visiter le monastère d'Arkadi en voiture ?", a: "Le monastère d'Arkadi est à environ 21 à 23 km de Rethymno, souvent 30 à 40 minutes de route, et se combine bien en demi-journée." },
          ],
        },
        de: {
          h1: "Mietwagen in Rethymno",
          intro: "Rethymno liegt zwischen Chania (etwa 60 km, 45 Minuten bis 1 Stunde) und Heraklion (etwa 78 bis 80 km, 1 Stunde bis 1,5 Stunden) und ist damit eine gute Basis für beide Inselhälften. Das Kloster Arkadi ist etwa 21 bis 23 km entfernt (30 bis 40 Minuten), Plakias etwa 33 bis 35 km und Preveli etwa 34 bis 35 km an der Südküste.",
          deliveryTitle: "Ihren Wagen in Rethymno übernehmen",
          delivery: "Die lokale Agentur liefert den Wagen meist zu Ihrem Hotel oder Apartment in Rethymno; der Treffpunkt wird mit dem Angebot bestätigt. Sie zahlen die Agentur bei der Übergabe, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Außerhalb der Altstadt parken", p: "Die Altstadt ist weitgehend Fußgängerzone: Planen Sie, außerhalb zu parken und zu Fuß weiterzugehen. Kostenlos: unterhalb der Mauern der Fortezza, nahe dem Stadion in Sohora und der Streifen rechts an der Einfahrt zur Marina; im Sommer früh am Morgen kommen." },
            { h: "Den Weg nach Preveli einplanen", p: "In Preveli parken Sie oben und erreichen den Strand über einen 15 bis 20 Minuten langen Abstiegspfad. Der Rückweg ist steil: Nehmen Sie Wasser mit und meiden Sie die Mittagshitze." },
          ],
          faqTitle: "Mietwagen Rethymno FAQ",
          faq: [
            { q: "Wo kann ich in Rethymno kostenlos parken?", a: "Unterhalb der Mauern der Fortezza, nahe dem Stadion in Sohora und auf dem Streifen rechts an der Einfahrt zur Marina. Im Sommer sind diese Plätze schnell belegt, also früh kommen; bezahlte Parkplätze kosten wenige Euro für einige Stunden, bis etwa 10 bis 15 Euro pro Tag." },
            { q: "Wie lange dauert die Fahrt nach Chania oder Heraklion?", a: "Chania liegt etwa 60 km entfernt, meist 45 Minuten bis 1 Stunde; Heraklion etwa 78 bis 80 km, 1 Stunde bis 1,5 Stunden. Auf der Nationalstraße bedeutet Lichthupe von hinten meist, dass der Fahrer überholen will; Einheimische weichen oft auf den Seitenstreifen aus, aber der Streifen kann abrupt enden." },
            { q: "Wie besuche ich das Kloster Arkadi mit dem Auto?", a: "Das Kloster Arkadi liegt etwa 21 bis 23 km von Rethymno entfernt, meist 30 bis 40 Minuten mit dem Auto, und eignet sich gut als Halbtagesausflug." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στο Ρέθυμνο",
          intro: "Το Ρέθυμνο βρίσκεται ανάμεσα στα Χανιά (περίπου 60 χλμ., 45 λεπτά έως 1 ώρα) και το Ηράκλειο (περίπου 78 έως 80 χλμ., 1 ώρα έως 1 ώρα και 30 λεπτά), κάτι που το κάνει καλή βάση και για τις δύο πλευρές του νησιού. Η Μονή Αρκαδίου απέχει περίπου 21 έως 23 χλμ. (30 έως 40 λεπτά), ο Πλακιάς περίπου 33 έως 35 χλμ. και η Πρέβελη περίπου 34 έως 35 χλμ. στη νότια ακτή.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου σας στο Ρέθυμνο",
          delivery: "Το τοπικό γραφείο μπορεί συνήθως να παραδώσει το αυτοκίνητο στο ξενοδοχείο ή το κατάλυμά σας στο Ρέθυμνο· το σημείο συνάντησης επιβεβαιώνεται με την προσφορά. Πληρώνετε το γραφείο κατά την παράδοση, χωρίς online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Παρκάρετε έξω από την παλιά πόλη", p: "Η παλιά πόλη είναι σε μεγάλο βαθμό πεζόδρομος: σχεδιάστε να παρκάρετε έξω και να συνεχίσετε με τα πόδια. Δωρεάν: κάτω από τα τείχη της Φορτέτζας, κοντά στο γήπεδο στη Σοχώρα και στη λωρίδα δεξιά στην είσοδο της μαρίνας· το καλοκαίρι, ελάτε νωρίς το πρωί." },
            { h: "Υπολογίστε το μονοπάτι της Πρέβελης", p: "Στην Πρέβελη παρκάρετε ψηλά και φτάνετε στην παραλία από κατηφορικό μονοπάτι 15 έως 20 λεπτών. Η επιστροφή είναι απότομη: πάρτε νερό και αποφύγετε τις πιο ζεστές ώρες." },
          ],
          faqTitle: "Συχνές ερωτήσεις για την ενοικίαση αυτοκινήτου στο Ρέθυμνο",
          faq: [
            { q: "Πού μπορώ να παρκάρω δωρεάν στο Ρέθυμνο;", a: "Κάτω από τα τείχη της Φορτέτζας, κοντά στο γήπεδο στη Σοχώρα και στη λωρίδα δεξιά στην είσοδο της μαρίνας. Το καλοκαίρι οι θέσεις γεμίζουν γρήγορα, οπότε ελάτε νωρίς· τα πάρκινγκ με πληρωμή χρεώνουν λίγα ευρώ για μερικές ώρες, έως περίπου 10 έως 15 ευρώ την ημέρα." },
            { q: "Πόσο διαρκεί η διαδρομή προς τα Χανιά ή το Ηράκλειο;", a: "Τα Χανιά απέχουν περίπου 60 χλμ., συνήθως 45 λεπτά έως 1 ώρα· το Ηράκλειο περίπου 78 έως 80 χλμ., 1 ώρα έως 1 ώρα και 30 λεπτά. Στην εθνική οδό, τα φώτα από πίσω σημαίνουν συνήθως ότι ο οδηγός θα προσπεράσει· οι ντόπιοι συχνά κινούνται στη λωρίδα έκτακτης ανάγκης για να διευκολύνουν, αλλά η λωρίδα μπορεί να διακοπεί απότομα." },
            { q: "Πώς επισκέπτομαι τη Μονή Αρκαδίου με αυτοκίνητο;", a: "Η Μονή Αρκαδίου απέχει περίπου 21 έως 23 χλμ. από το Ρέθυμνο, συνήθως 30 έως 40 λεπτά με το αυτοκίνητο, και ταιριάζει καλά ως εκδρομή μισής ημέρας." },
          ],
        },
      },
    },
    "hersonissos": {
      hub: { en: "Hersonissos", fr: "Hersonissos", de: "Hersonissos", el: "Χερσόνησος" },
      meta: {
        en: {
          title: "Car Rental Hersonissos - local agency, no prepayment",
          desc: "Rent a car in Hersonissos with a local agency. Delivery to your hotel usually possible, pay at pick-up, no online prepayment through Crete Direct.",
        },
        fr: {
          title: "Location de voiture Hersonissos - agence locale, sans prépaiement",
          desc: "Louez une voiture à Hersonissos avec une agence locale. Livraison à l'hôtel généralement possible, paiement à la prise en main, aucun prépaiement en ligne via Crete Direct.",
        },
        de: {
          title: "Mietwagen Hersonissos - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Hersonissos bei einer lokalen Agentur. Lieferung zum Hotel meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung über Crete Direct.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στη Χερσόνησο - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στη Χερσόνησο από τοπικό γραφείο. Παράδοση στο ξενοδοχείο συνήθως εφικτή, πληρωμή στην παραλαβή, χωρίς online προπληρωμή.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Hersonissos",
          intro: "Hersonissos is about 25 km east of Heraklion (25 to 35 minutes) and about 10 to 15 km from Malia. A car turns it into a base for the Lasithi plateau and for Elounda, where the Spinalonga boats leave from, about 43 km away.",
          deliveryTitle: "Picking up your car in Hersonissos",
          delivery: "The local agency can usually deliver the car to your hotel or apartment in Hersonissos; the exact meeting point is confirmed with the offer. You pay the agency at the handover, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Drive slowly at night", p: "From mid-June to mid-September the seafront street is lined with clubs, bars and restaurants, and the crowd spills onto the road until dawn. Keep your speed low and expect pedestrians in high season." },
            { h: "Allow real time for Lasithi", p: "The Lasithi plateau is reached by a hairpin climb: count 1 hour to 1 hour 20 of actual driving each way rather than trusting the straight-line distance." },
          ],
          faqTitle: "Hersonissos car rental FAQ",
          faq: [
            { q: "How long does it really take to reach the Lasithi plateau?", a: "Plan 1 hour to 1 hour 20 of driving each way. The road climbs in hairpins, so the trip takes clearly longer than the map distance suggests." },
            { q: "How far are Heraklion and Malia from Hersonissos?", a: "Heraklion is about 25 km away (25 to 35 minutes); Malia about 10 to 15 km, which takes 12 to 25 minutes depending on summer traffic." },
            { q: "How do I get to the Spinalonga boats?", a: "The boats leave from Elounda, about 43 km from Hersonissos, usually 1 hour to 1 hour 15 by car." },
          ],
        },
        fr: {
          h1: "Location de voiture à Hersonissos",
          intro: "Hersonissos est à environ 25 km à l'est d'Héraklion (25 à 35 minutes) et à environ 10 à 15 km de Malia. Une voiture en fait une base pour le plateau du Lassithi et pour Elounda, d'où partent les bateaux pour Spinalonga, à environ 43 km.",
          deliveryTitle: "Récupérer votre voiture à Hersonissos",
          delivery: "L'agence locale peut généralement livrer la voiture à votre hôtel ou appartement à Hersonissos ; le point de rendez-vous exact est confirmé avec l'offre. Vous réglez l'agence à la remise des clés, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Roulez doucement la nuit", p: "De mi-juin à mi-septembre, la rue du bord de mer aligne clubs, bars et restaurants, et la foule déborde sur la chaussée jusqu'à l'aube. Gardez une vitesse basse et attendez-vous à des piétons en haute saison." },
            { h: "Comptez le vrai temps pour le Lassithi", p: "Le plateau du Lassithi se gagne par une montée en lacets : comptez 1 h à 1 h 20 de conduite réelle par trajet plutôt que de vous fier à la distance à vol d'oiseau." },
          ],
          faqTitle: "Location de voiture à Hersonissos FAQ",
          faq: [
            { q: "Combien de temps faut-il vraiment pour le plateau du Lassithi ?", a: "Prévoyez 1 h à 1 h 20 de conduite par trajet. La route monte en lacets, donc le trajet prend nettement plus de temps que la distance sur la carte ne le suggère." },
            { q: "À quelle distance sont Héraklion et Malia de Hersonissos ?", a: "Héraklion est à environ 25 km (25 à 35 minutes) ; Malia à environ 10 à 15 km, soit 12 à 25 minutes selon le trafic estival." },
            { q: "Comment rejoindre les bateaux pour Spinalonga ?", a: "Les bateaux partent d'Elounda, à environ 43 km de Hersonissos, souvent 1 h à 1 h 15 de route." },
          ],
        },
        de: {
          h1: "Mietwagen in Hersonissos",
          intro: "Hersonissos liegt etwa 25 km östlich von Heraklion (25 bis 35 Minuten) und etwa 10 bis 15 km von Malia entfernt. Mit dem Auto wird der Ort zur Basis für die Lasithi-Hochebene und für Elounda, wo die Boote nach Spinalonga ablegen, etwa 43 km entfernt.",
          deliveryTitle: "Ihren Wagen in Hersonissos übernehmen",
          delivery: "Die lokale Agentur liefert den Wagen meist zu Ihrem Hotel oder Apartment in Hersonissos; der genaue Treffpunkt wird mit dem Angebot bestätigt. Sie zahlen die Agentur bei der Übergabe, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Nachts langsam fahren", p: "Von Mitte Juni bis Mitte September reihen sich an der Uferstraße Clubs, Bars und Restaurants, und die Menschenmenge drängt bis zum Morgengrauen auf die Fahrbahn. Fahren Sie langsam und rechnen Sie in der Hochsaison mit Fußgängern." },
            { h: "Reale Zeit für Lasithi einplanen", p: "Die Lasithi-Hochebene erreicht man über eine Serpentinenauffahrt: Rechnen Sie mit 1 Stunde bis 1 Stunde 20 tatsächlicher Fahrzeit pro Strecke statt mit der Luftlinie." },
          ],
          faqTitle: "Mietwagen Hersonissos FAQ",
          faq: [
            { q: "Wie lange dauert die Fahrt zur Lasithi-Hochebene wirklich?", a: "Planen Sie 1 Stunde bis 1 Stunde 20 Fahrzeit pro Strecke. Die Straße steigt in Serpentinen an, daher dauert die Fahrt deutlich länger, als die Entfernung auf der Karte vermuten lässt." },
            { q: "Wie weit sind Heraklion und Malia von Hersonissos entfernt?", a: "Heraklion liegt etwa 25 km entfernt (25 bis 35 Minuten); Malia etwa 10 bis 15 km, je nach Sommerverkehr 12 bis 25 Minuten." },
            { q: "Wie komme ich zu den Booten nach Spinalonga?", a: "Die Boote legen in Elounda ab, etwa 43 km von Hersonissos entfernt, meist 1 Stunde bis 1 Stunde 15 mit dem Auto." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στη Χερσόνησο",
          intro: "Η Χερσόνησος απέχει περίπου 25 χλμ. ανατολικά του Ηρακλείου (25 έως 35 λεπτά) και περίπου 10 έως 15 χλμ. από τα Μάλια. Με αυτοκίνητο γίνεται βάση για το οροπέδιο Λασιθίου και για την Ελούντα, από όπου φεύγουν τα καραβάκια για τη Σπιναλόγκα, σε απόσταση περίπου 43 χλμ.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου σας στη Χερσόνησο",
          delivery: "Το τοπικό γραφείο μπορεί συνήθως να παραδώσει το αυτοκίνητο στο ξενοδοχείο ή το διαμέρισμά σας στη Χερσόνησο· το ακριβές σημείο συνάντησης επιβεβαιώνεται με την προσφορά. Πληρώνετε το γραφείο κατά την παράδοση, χωρίς online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Οδηγείτε αργά τη νύχτα", p: "Από τα μέσα Ιουνίου έως τα μέσα Σεπτεμβρίου, ο παραλιακός δρόμος γεμίζει με κλαμπ, μπαρ και εστιατόρια, και ο κόσμος βγαίνει στο οδόστρωμα μέχρι το ξημέρωμα. Κρατήστε χαμηλή ταχύτητα και περιμένετε πεζούς στην υψηλή σεζόν." },
            { h: "Υπολογίστε πραγματικό χρόνο για το Λασίθι", p: "Το οροπέδιο Λασιθίου ανεβαίνει με συνεχείς στροφές: υπολογίστε 1 ώρα έως 1 ώρα και 20 λεπτά πραγματικής οδήγησης ανά διαδρομή, όχι την απόσταση σε ευθεία γραμμή." },
          ],
          faqTitle: "Συχνές ερωτήσεις για την ενοικίαση αυτοκινήτου στη Χερσόνησο",
          faq: [
            { q: "Πόσο διαρκεί πραγματικά η διαδρομή προς το οροπέδιο Λασιθίου;", a: "Υπολογίστε 1 ώρα έως 1 ώρα και 20 λεπτά οδήγησης ανά διαδρομή. Ο δρόμος ανεβαίνει με συνεχείς στροφές, οπότε το ταξίδι διαρκεί σαφώς περισσότερο από όσο δείχνει η απόσταση στον χάρτη." },
            { q: "Πόσο απέχουν το Ηράκλειο και τα Μάλια από τη Χερσόνησο;", a: "Το Ηράκλειο απέχει περίπου 25 χλμ. (25 έως 35 λεπτά)· τα Μάλια περίπου 10 έως 15 χλμ., δηλαδή 12 έως 25 λεπτά ανάλογα με την καλοκαιρινή κίνηση." },
            { q: "Πώς φτάνω στα καραβάκια για τη Σπιναλόγκα;", a: "Τα καραβάκια φεύγουν από την Ελούντα, περίπου 43 χλμ. από τη Χερσόνησο, συνήθως 1 ώρα έως 1 ώρα και 15 λεπτά με το αυτοκίνητο." },
          ],
        },
      },
    },
    "malia": {
      hub: { en: "Malia", fr: "Malia", de: "Malia", el: "Μάλια" },
      meta: {
        en: {
          title: "Car Rental Malia - local agency, no prepayment",
          desc: "Rent a car in Malia with a local agency. Delivery to your hotel usually possible, pay at pick-up, no online prepayment through Crete Direct.",
        },
        fr: {
          title: "Location de voiture Malia - agence locale, sans prépaiement",
          desc: "Louez une voiture à Malia avec une agence locale. Livraison à l'hôtel généralement possible, paiement à la prise en main, aucun prépaiement en ligne via Crete Direct.",
        },
        de: {
          title: "Mietwagen Malia - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Malia bei einer lokalen Agentur. Lieferung zum Hotel meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung über Crete Direct.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στα Μάλια - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στα Μάλια από τοπικό γραφείο. Παράδοση στο ξενοδοχείο συνήθως εφικτή, πληρωμή στην παραλαβή, χωρίς online προπληρωμή.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Malia",
          intro: "Malia is best known as a party resort, but a car opens up the quieter side of the area: the Minoan palace of Malia is about 3 km east with free parking on site, Hersonissos about 10 to 15 km away and Heraklion about 34 km (30 to 35 minutes). The airport is about 30 km away, roughly 30 minutes without traffic.",
          deliveryTitle: "Picking up your car in Malia",
          delivery: "The local agency can usually deliver the car to your hotel or apartment in Malia; the exact meeting point is confirmed with the offer. You pay the agency at the handover, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Avoid the strip at night", p: "In summer the main street fills with pedestrians after dark. Park away from the strip and walk in rather than driving through it late at night." },
            { h: "Fuel up before a loop", p: "A coastal loop links Malia, Milatos, Plaka (boats to Spinalonga), Elounda and Agios Nikolaos. Most petrol stations have attendant service and take cash and cards, but Sunday hours are reduced and 24-hour stations are the exception, so fill up before you set off." },
          ],
          faqTitle: "Malia car rental FAQ",
          faq: [
            { q: "Is there parking at the Minoan palace of Malia?", a: "Yes. The palace is about 3 km east of the resort and has free parking on site." },
            { q: "How far is Heraklion Airport from Malia?", a: "About 30 km, roughly 30 minutes without traffic. Allow more in the summer peak." },
            { q: "What is a good day trip by car from Malia?", a: "A coastal loop through Milatos, Plaka (boats to Spinalonga), Elounda and Agios Nikolaos fills a day well, with swim and lunch stops along the way." },
          ],
        },
        fr: {
          h1: "Location de voiture à Malia",
          intro: "Malia est surtout connue pour sa vie nocturne, mais une voiture ouvre la face plus calme du secteur : le palais minoen de Malia est à environ 3 km à l'est avec parking gratuit sur place, Hersonissos à environ 10 à 15 km et Héraklion à environ 34 km (30 à 35 minutes). L'aéroport est à environ 30 km, soit environ 30 minutes hors trafic.",
          deliveryTitle: "Récupérer votre voiture à Malia",
          delivery: "L'agence locale peut généralement livrer la voiture à votre hôtel ou appartement à Malia ; le point de rendez-vous exact est confirmé avec l'offre. Vous réglez l'agence à la remise des clés, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Évitez l'artère principale la nuit", p: "En été, la rue principale se remplit de piétons après la tombée de la nuit. Garez-vous à l'écart et finissez à pied plutôt que de la traverser en voiture tard le soir." },
            { h: "Faites le plein avant une boucle", p: "Une boucle côtière relie Malia, Milatos, Plaka (bateaux pour Spinalonga), Elounda et Agios Nikolaos. La plupart des stations-service ont un pompiste et prennent espèces et cartes, mais les horaires du dimanche sont réduits et le 24h/24 reste l'exception : faites le plein avant de partir." },
          ],
          faqTitle: "Location de voiture à Malia FAQ",
          faq: [
            { q: "Y a-t-il un parking au palais minoen de Malia ?", a: "Oui. Le palais est à environ 3 km à l'est de la station et dispose d'un parking gratuit sur place." },
            { q: "À quelle distance est l'aéroport d'Héraklion de Malia ?", a: "Environ 30 km, soit environ 30 minutes hors trafic. Prévoyez davantage en plein été." },
            { q: "Quelle excursion à la journée depuis Malia ?", a: "Une boucle côtière par Milatos, Plaka (bateaux pour Spinalonga), Elounda et Agios Nikolaos remplit bien une journée, avec des pauses baignade et déjeuner en chemin." },
          ],
        },
        de: {
          h1: "Mietwagen in Malia",
          intro: "Malia ist vor allem als Partyort bekannt, aber ein Auto erschließt die ruhigere Seite der Gegend: Der minoische Palast von Malia liegt etwa 3 km östlich mit kostenlosem Parkplatz vor Ort, Hersonissos etwa 10 bis 15 km und Heraklion etwa 34 km entfernt (30 bis 35 Minuten). Der Flughafen ist etwa 30 km entfernt, rund 30 Minuten ohne Verkehr.",
          deliveryTitle: "Ihren Wagen in Malia übernehmen",
          delivery: "Die lokale Agentur liefert den Wagen meist zu Ihrem Hotel oder Apartment in Malia; der genaue Treffpunkt wird mit dem Angebot bestätigt. Sie zahlen die Agentur bei der Übergabe, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Die Partymeile nachts meiden", p: "Im Sommer füllt sich die Hauptstraße nach Einbruch der Dunkelheit mit Fußgängern. Parken Sie abseits und gehen Sie zu Fuß weiter, statt spät abends hindurchzufahren." },
            { h: "Vor einer Rundtour tanken", p: "Eine Küstenrunde verbindet Malia, Milatos, Plaka (Boote nach Spinalonga), Elounda und Agios Nikolaos. Die meisten Tankstellen haben Bedienung und nehmen Bargeld und Karten, aber sonntags gelten verkürzte Zeiten und 24-Stunden-Tankstellen sind die Ausnahme: Tanken Sie vor der Abfahrt." },
          ],
          faqTitle: "Mietwagen Malia FAQ",
          faq: [
            { q: "Gibt es Parkplätze am minoischen Palast von Malia?", a: "Ja. Der Palast liegt etwa 3 km östlich des Ortes und hat einen kostenlosen Parkplatz vor Ort." },
            { q: "Wie weit ist der Flughafen Heraklion von Malia entfernt?", a: "Etwa 30 km, rund 30 Minuten ohne Verkehr. Im Hochsommer mehr Zeit einplanen." },
            { q: "Welcher Tagesausflug lohnt sich ab Malia?", a: "Eine Küstenrunde über Milatos, Plaka (Boote nach Spinalonga), Elounda und Agios Nikolaos füllt gut einen Tag, mit Bade- und Essenspausen unterwegs." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στα Μάλια",
          intro: "Τα Μάλια είναι γνωστά κυρίως ως προορισμός διασκέδασης, αλλά με αυτοκίνητο ανοίγει η πιο ήσυχη πλευρά της περιοχής: το μινωικό ανάκτορο των Μαλίων απέχει περίπου 3 χλμ. ανατολικά με δωρεάν πάρκινγκ στον χώρο, η Χερσόνησος περίπου 10 έως 15 χλμ. και το Ηράκλειο περίπου 34 χλμ. (30 έως 35 λεπτά). Το αεροδρόμιο απέχει περίπου 30 χλμ., περίπου 30 λεπτά χωρίς κίνηση.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου σας στα Μάλια",
          delivery: "Το τοπικό γραφείο μπορεί συνήθως να παραδώσει το αυτοκίνητο στο ξενοδοχείο ή το διαμέρισμά σας στα Μάλια· το ακριβές σημείο συνάντησης επιβεβαιώνεται με την προσφορά. Πληρώνετε το γραφείο κατά την παράδοση, χωρίς online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Αποφύγετε τον κεντρικό δρόμο τη νύχτα", p: "Το καλοκαίρι, ο κεντρικός δρόμος γεμίζει πεζούς μετά τη δύση. Παρκάρετε πιο μακριά και συνεχίστε με τα πόδια, αντί να τον διασχίζετε με το αυτοκίνητο αργά το βράδυ." },
            { h: "Βάλτε καύσιμα πριν από κυκλική διαδρομή", p: "Μια παραλιακή διαδρομή ενώνει Μάλια, Μίλατο, Πλάκα (βάρκες για τη Σπιναλόγκα), Ελούντα και Άγιο Νικόλαο. Τα περισσότερα βενζινάδικα έχουν υπάλληλο και δέχονται μετρητά και κάρτες, αλλά τις Κυριακές τα ωράρια είναι μειωμένα και τα 24ωρα είναι η εξαίρεση: γεμίστε το ρεζερβουάρ πριν ξεκινήσετε." },
          ],
          faqTitle: "Συχνές ερωτήσεις για την ενοικίαση αυτοκινήτου στα Μάλια",
          faq: [
            { q: "Υπάρχει πάρκινγκ στο μινωικό ανάκτορο των Μαλίων;", a: "Ναι. Το ανάκτορο απέχει περίπου 3 χλμ. ανατολικά του οικισμού και διαθέτει δωρεάν πάρκινγκ στον χώρο." },
            { q: "Πόσο απέχει το αεροδρόμιο Ηρακλείου από τα Μάλια;", a: "Περίπου 30 χλμ., περίπου 30 λεπτά χωρίς κίνηση. Το κατακαλόκαιρο υπολογίστε περισσότερο χρόνο." },
            { q: "Ποια ημερήσια εκδρομή αξίζει με αυτοκίνητο από τα Μάλια;", a: "Μια παραλιακή διαδρομή μέσω Μιλάτου, Πλάκας (βάρκες για τη Σπιναλόγκα), Ελούντας και Αγίου Νικολάου γεμίζει όμορφα μια μέρα, με στάσεις για μπάνιο και φαγητό." },
          ],
        },
      },
    },
  "chania": {
      hub: { en: "Chania Town", fr: "Chania (ville)", de: "Chania (Stadt)", el: "Χανιά (πόλη)" },
      meta: {
        en: {
          title: "Car Rental Chania Town - local agency, no prepayment",
          desc: "Rent a car in Chania town with a local agency. Delivery to your accommodation usually possible, pay at pick-up, no online prepayment.",
        },
        fr: {
          title: "Location de voiture Chania (ville) - agence locale, sans prépaiement",
          desc: "Louez une voiture à Chania avec une agence locale. Livraison à l'hébergement généralement possible, paiement à la prise du véhicule, aucun prépaiement en ligne.",
        },
        de: {
          title: "Mietwagen Chania (Stadt) - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in der Stadt Chania bei einer lokalen Agentur. Lieferung zur Unterkunft meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στα Χανιά - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στα Χανιά από τοπικό γραφείο. Παράδοση στο κατάλυμα συνήθως εφικτή, πληρωμή στην παραλαβή, καμία online προπληρωμή.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Chania",
          intro: "Chania is the main town of west Crete and a practical base for Balos, Elafonisi and Falassarna. The airport (CHQ) is about 14 km away, roughly 20 minutes, Souda port is about 7 km to the south-east, and Platanias begins 10 to 12 km to the west.",
          deliveryTitle: "Getting your car in Chania",
          delivery: "Delivery to your hotel or apartment in Chania is usually possible, and the local agency confirms the exact meeting point with the offer. You pay the agency at pick-up; Crete Direct takes no online payment.",
          tips: [
            { h: "Stay out of the old town", p: "The old town and the Venetian harbour are largely pedestrian, protected by automatic bollards and plate-reading cameras. Park outside and walk in." },
            { h: "Where to park", p: "Free: Talos square on the west edge of the old town (about 5 minutes on foot from the harbour, full early in summer), the lot by the East Moat theatre, or the Kladissos Park and Ride with a free electric shuttle every 20 minutes. Paid: the Ermis and Apollo covered garages, blue zone via the iPark Chania app." },
          ],
          faqTitle: "Chania car rental FAQ",
          faq: [
            { q: "Can I drive into Chania old town?", a: "No. The old town and the Venetian harbour form a controlled zone with automatic bollards and plate-reading cameras. Leave the car at Talos square, the East Moat theatre lot or the Kladissos Park and Ride." },
            { q: "Is Chania a good base for Balos and Elafonisi?", a: "Yes. Chania works well for day trips to Balos, Elafonisi and Falassarna. Kissamos, the gateway town for Balos, is 38 to 42 km away, about 35 to 45 minutes on the A90 highway." },
            { q: "How do I avoid traffic in Chania?", a: "During summer rush hours the centre moves slowly. Use the Kladissos Park and Ride when visiting the old town, and take the A90 highway for longer trips." },
          ],
        },
        fr: {
          h1: "Location de voiture à Chania",
          intro: "Chania est la ville principale de l'ouest de la Crète et une base pratique pour Balos, Elafonisi et Falassarna. L'aéroport (CHQ) est à environ 14 km, soit à peu près 20 minutes, le port de Souda à environ 7 km au sud-est, et Platanias commence 10 à 12 km à l'ouest.",
          deliveryTitle: "Récupérer votre voiture à Chania",
          delivery: "La livraison à votre hôtel ou appartement à Chania est généralement possible, et l'agence locale confirme le point de rendez-vous exact avec l'offre. Vous payez l'agence à la prise du véhicule ; Crete Direct ne prend aucun paiement en ligne.",
          tips: [
            { h: "Évitez la vieille ville en voiture", p: "La vieille ville et le port vénitien sont en grande partie piétons, protégés par des bornes automatiques et des caméras de lecture de plaques. Garez-vous à l'extérieur et continuez à pied." },
            { h: "Où se garer", p: "Gratuit : la place Talos en bord ouest de la vieille ville (environ 5 minutes à pied du port, pleine tôt en été), le terrain près du théâtre de la douve Est, ou le Park and Ride de Kladissos avec navette électrique gratuite toutes les 20 minutes. Payant : les garages couverts Ermis et Apollo, zone bleue via l'application iPark Chania." },
          ],
          faqTitle: "Location de voiture à Chania FAQ",
          faq: [
            { q: "Puis-je entrer en voiture dans la vieille ville de Chania ?", a: "Non. La vieille ville et le port vénitien forment une zone contrôlée par bornes automatiques et caméras de lecture de plaques. Laissez la voiture place Talos, au terrain du théâtre de la douve Est ou au Park and Ride de Kladissos." },
            { q: "Chania est-elle une bonne base pour Balos et Elafonisi ?", a: "Oui. Chania convient bien aux excursions à la journée vers Balos, Elafonisi et Falassarna. Kissamos, porte d'entrée de Balos, est à 38 à 42 km, soit 35 à 45 minutes par la voie rapide A90." },
            { q: "Comment éviter les embouteillages à Chania ?", a: "Aux heures de pointe estivales, le centre roule lentement. Pour visiter la vieille ville, utilisez le Park and Ride de Kladissos, et préférez la voie rapide A90 pour les trajets plus longs." },
          ],
        },
        de: {
          h1: "Mietwagen in Chania",
          intro: "Chania ist die wichtigste Stadt Westkretas und eine praktische Basis für Balos, Elafonisi und Falassarna. Der Flughafen (CHQ) liegt etwa 14 km entfernt, rund 20 Minuten, der Hafen Souda etwa 7 km südöstlich, und Platanias beginnt 10 bis 12 km westlich.",
          deliveryTitle: "Ihren Wagen in Chania erhalten",
          delivery: "Die Lieferung zu Ihrem Hotel oder Apartment in Chania ist meist möglich, den genauen Treffpunkt bestätigt die lokale Agentur mit dem Angebot. Sie zahlen die Agentur bei der Übernahme; Crete Direct nimmt keine Online-Zahlung.",
          tips: [
            { h: "Altstadt mit dem Auto meiden", p: "Die Altstadt und der venezianische Hafen sind weitgehend Fußgängerzone, gesichert durch automatische Poller und Kameras mit Kennzeichenerfassung. Parken Sie außerhalb und gehen Sie zu Fuß weiter." },
            { h: "Wo parken", p: "Kostenlos: der Talos-Platz am Westrand der Altstadt (etwa 5 Minuten zu Fuß vom Hafen, im Sommer früh voll), der Platz am Theater des Ostgrabens oder das Park-and-Ride Kladissos mit kostenlosem Elektro-Shuttle alle 20 Minuten. Kostenpflichtig: die Parkhäuser Ermis und Apollo, blaue Zone über die App iPark Chania." },
          ],
          faqTitle: "Mietwagen Chania FAQ",
          faq: [
            { q: "Darf ich mit dem Auto in die Altstadt von Chania fahren?", a: "Nein. Altstadt und venezianischer Hafen sind eine kontrollierte Zone mit automatischen Pollern und Kennzeichenkameras. Stellen Sie den Wagen am Talos-Platz, am Platz beim Theater des Ostgrabens oder am Park-and-Ride Kladissos ab." },
            { q: "Ist Chania eine gute Basis für Balos und Elafonisi?", a: "Ja. Chania eignet sich für Tagesausflüge nach Balos, Elafonisi und Falassarna. Kissamos, das Tor zu Balos, liegt 38 bis 42 km entfernt, etwa 35 bis 45 Minuten über die Schnellstraße A90." },
            { q: "Wie vermeide ich Stau in Chania?", a: "In den sommerlichen Stoßzeiten geht es im Zentrum nur langsam voran. Nutzen Sie für die Altstadt das Park-and-Ride Kladissos und für längere Strecken die Schnellstraße A90." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στα Χανιά",
          intro: "Τα Χανιά είναι η κύρια πόλη της δυτικής Κρήτης και πρακτική βάση για Μπάλο, Ελαφονήσι και Φαλάσαρνα. Το αεροδρόμιο (CHQ) απέχει περίπου 14 χλμ., γύρω στα 20 λεπτά, το λιμάνι της Σούδας περίπου 7 χλμ. νοτιοανατολικά και ο Πλατανιάς αρχίζει 10 με 12 χλμ. δυτικά.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου στα Χανιά",
          delivery: "Η παράδοση στο ξενοδοχείο ή το κατάλυμά σας στα Χανιά είναι συνήθως εφικτή και το τοπικό γραφείο επιβεβαιώνει το ακριβές σημείο συνάντησης με την προσφορά. Πληρώνετε το γραφείο κατά την παραλαβή· το Crete Direct δεν παίρνει καμία online πληρωμή.",
          tips: [
            { h: "Μακριά από την παλιά πόλη με το αυτοκίνητο", p: "Η παλιά πόλη και το ενετικό λιμάνι είναι σε μεγάλο βαθμό πεζοδρομημένα, με βυθιζόμενα κολωνάκια και κάμερες ανάγνωσης πινακίδων. Παρκάρετε έξω και συνεχίστε με τα πόδια." },
            { h: "Πού να παρκάρετε", p: "Δωρεάν: η πλατεία Τάλω στη δυτική άκρη της παλιάς πόλης (περίπου 5 λεπτά με τα πόδια από το λιμάνι, γεμίζει νωρίς το καλοκαίρι), το πάρκινγκ δίπλα στο θέατρο Ανατολικής Τάφρου ή το Park and Ride στον Κλαδισό με δωρεάν ηλεκτρικό λεωφορείο κάθε 20 λεπτά. Επί πληρωμή: τα κλειστά πάρκινγκ Ερμής και Απόλλων, μπλε ζώνη μέσω της εφαρμογής iPark Chania." },
          ],
          faqTitle: "Ενοικίαση αυτοκινήτου στα Χανιά: συχνές ερωτήσεις",
          faq: [
            { q: "Μπορώ να μπω με το αυτοκίνητο στην παλιά πόλη των Χανίων;", a: "Όχι. Η παλιά πόλη και το ενετικό λιμάνι είναι ελεγχόμενη ζώνη με βυθιζόμενα κολωνάκια και κάμερες ανάγνωσης πινακίδων. Αφήστε το αυτοκίνητο στην πλατεία Τάλω, στο πάρκινγκ του θεάτρου Ανατολικής Τάφρου ή στο Park and Ride του Κλαδισού." },
            { q: "Είναι τα Χανιά καλή βάση για Μπάλο και Ελαφονήσι;", a: "Ναι. Τα Χανιά βολεύουν για ημερήσιες εκδρομές σε Μπάλο, Ελαφονήσι και Φαλάσαρνα. Η Κίσσαμος, η πύλη για τον Μπάλο, απέχει 38 με 42 χλμ., περίπου 35 με 45 λεπτά μέσω του ΒΟΑΚ (Α90)." },
            { q: "Πώς αποφεύγω την κίνηση στα Χανιά;", a: "Τις ώρες αιχμής το καλοκαίρι το κέντρο κινείται αργά. Για την παλιά πόλη χρησιμοποιήστε το Park and Ride του Κλαδισού και για μεγαλύτερες αποστάσεις προτιμήστε τον ΒΟΑΚ (Α90)." },
          ],
        },
      },
    },
    "platanias": {
      hub: { en: "Platanias (Chania)", fr: "Platanias (Chania)", de: "Platanias (Chania)", el: "Πλατανιάς (Χανιά)" },
      meta: {
        en: {
          title: "Car Rental Platanias - local agency, no prepayment",
          desc: "Rent a car in Platanias with a local agency. Delivery to your accommodation usually possible, pay at pick-up, no online prepayment.",
        },
        fr: {
          title: "Location de voiture Platanias - agence locale, sans prépaiement",
          desc: "Louez une voiture à Platanias avec une agence locale. Livraison à l'hébergement généralement possible, paiement à la prise du véhicule, aucun prépaiement en ligne.",
        },
        de: {
          title: "Mietwagen Platanias - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Platanias bei einer lokalen Agentur. Lieferung zur Unterkunft meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στον Πλατανιά - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στον Πλατανιά από τοπικό γραφείο. Παράδοση στο κατάλυμα συνήθως εφικτή, πληρωμή στην παραλαβή, καμία online προπληρωμή.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Platanias",
          intro: "Platanias is a resort strip 10 to 12 km west of Chania, about 15 to 20 minutes by road, with Agia Marina 2.5 km away; the two resorts have almost merged. Chania Airport (CHQ) is around 25 km away, usually 30 to 40 minutes via the bypass.",
          deliveryTitle: "Getting your car in Platanias",
          delivery: "Delivery to your hotel or apartment in Platanias is usually possible; the local agency confirms the exact meeting point with the offer. You pay the agency at pick-up, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Watch the coastal road", p: "The old national road through Stalos, Agia Marina and Platanias is one continuous commercial strip. At the summer peak the traffic is heavy and many pedestrians cross between hotels and the beach, so drive slowly." },
            { h: "Use the A90 for longer trips", p: "For Kissamos, Elafonisi or anything beyond the strip, join the A90 highway south of the resort. It is faster than following the coast road." },
          ],
          faqTitle: "Platanias car rental FAQ",
          faq: [
            { q: "How do I get from Chania Airport to Platanias?", a: "The airport is about 25 km away, usually 30 to 40 minutes via the bypass. The agency can also deliver the car directly at the airport; mention it in the request." },
            { q: "Do I need a car in Platanias?", a: "The strip itself is walkable and Agia Marina is only 2.5 km away. A car is mainly useful for Chania, the beaches at Gerani and Maleme further west, and day trips to Balos, Elafonisi and Falassarna." },
            { q: "Is driving in Platanias difficult in summer?", a: "The coastal strip carries heavy traffic at the summer peak and pedestrians cross constantly. Short hops along the strip are slow; for longer distances the A90 south of the resort is quicker." },
          ],
        },
        fr: {
          h1: "Location de voiture à Platanias",
          intro: "Platanias est une station balnéaire à 10 à 12 km à l'ouest de Chania, environ 15 à 20 minutes de route, avec Agia Marina à 2,5 km ; les deux stations ont quasiment fusionné. L'aéroport de Chania (CHQ) est à environ 25 km, souvent 30 à 40 minutes via le contournement.",
          deliveryTitle: "Récupérer votre voiture à Platanias",
          delivery: "La livraison à votre hôtel ou appartement à Platanias est généralement possible ; l'agence locale confirme le point de rendez-vous exact avec l'offre. Vous payez l'agence à la prise du véhicule, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Prudence sur l'axe côtier", p: "L'ancienne route nationale qui traverse Stalos, Agia Marina et Platanias forme une bande commerciale continue. Au pic de l'été, le trafic est chargé et beaucoup de piétons traversent entre hôtels et plage : roulez doucement." },
            { h: "La voie rapide A90 pour les longues distances", p: "Pour Kissamos, Elafonisi ou tout trajet au-delà de la station, rejoignez la voie rapide A90 au sud. Elle est plus rapide que la route côtière." },
          ],
          faqTitle: "Location de voiture à Platanias FAQ",
          faq: [
            { q: "Comment aller de l'aéroport de Chania à Platanias ?", a: "L'aéroport est à environ 25 km, souvent 30 à 40 minutes via le contournement. L'agence peut aussi livrer la voiture directement à l'aéroport : précisez-le dans la demande." },
            { q: "Faut-il une voiture à Platanias ?", a: "La station elle-même se parcourt à pied et Agia Marina n'est qu'à 2,5 km. La voiture sert surtout pour Chania, les plages de Gerani et Maleme plus à l'ouest, et les excursions vers Balos, Elafonisi et Falassarna." },
            { q: "Conduire à Platanias en été est-il difficile ?", a: "L'axe côtier est très fréquenté au pic de l'été et les piétons traversent en continu. Les petits trajets le long de la bande sont lents ; pour les distances plus longues, la voie rapide A90 au sud est plus rapide." },
          ],
        },
        de: {
          h1: "Mietwagen in Platanias",
          intro: "Platanias ist ein Badeort 10 bis 12 km westlich von Chania, etwa 15 bis 20 Minuten Fahrt, mit Agia Marina nur 2,5 km entfernt; beide Orte sind praktisch zusammengewachsen. Der Flughafen Chania (CHQ) liegt rund 25 km entfernt, meist 30 bis 40 Minuten über die Umgehungsstraße.",
          deliveryTitle: "Ihren Wagen in Platanias erhalten",
          delivery: "Die Lieferung zu Ihrem Hotel oder Apartment in Platanias ist meist möglich; den genauen Treffpunkt bestätigt die lokale Agentur mit dem Angebot. Sie zahlen die Agentur bei der Übernahme, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Vorsicht auf der Küstenstraße", p: "Die alte Nationalstraße durch Stalos, Agia Marina und Platanias ist ein durchgehender Geschäftsstreifen. Im Hochsommer ist der Verkehr dicht, und viele Fußgänger queren zwischen Hotels und Strand: langsam fahren." },
            { h: "A90 für längere Strecken", p: "Für Kissamos, Elafonisi oder alles weiter westlich nehmen Sie die Schnellstraße A90 südlich des Ortes. Sie ist schneller als die Küstenstraße." },
          ],
          faqTitle: "Mietwagen Platanias FAQ",
          faq: [
            { q: "Wie komme ich vom Flughafen Chania nach Platanias?", a: "Der Flughafen liegt etwa 25 km entfernt, meist 30 bis 40 Minuten über die Umgehungsstraße. Die Agentur kann den Wagen auch direkt am Flughafen übergeben; erwähnen Sie es in der Anfrage." },
            { q: "Brauche ich in Platanias ein Auto?", a: "Der Ort selbst ist gut zu Fuß machbar, und Agia Marina liegt nur 2,5 km entfernt. Ein Auto lohnt sich vor allem für Chania, die Strände von Gerani und Maleme weiter westlich und Tagesausflüge nach Balos, Elafonisi und Falassarna." },
            { q: "Ist das Fahren in Platanias im Sommer schwierig?", a: "Die Küstenstraße ist im Hochsommer stark befahren, und Fußgänger queren ständig. Kurze Fahrten entlang des Streifens sind langsam; für längere Strecken ist die A90 südlich des Ortes schneller." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στον Πλατανιά",
          intro: "Ο Πλατανιάς είναι παραθεριστικός οικισμός 10 με 12 χλμ. δυτικά των Χανίων, περίπου 15 με 20 λεπτά δρόμος, με την Αγία Μαρίνα μόλις 2,5 χλμ. μακριά, ενώ τα δύο θέρετρα έχουν σχεδόν ενωθεί. Το αεροδρόμιο των Χανίων (CHQ) απέχει περίπου 25 χλμ., συνήθως 30 με 40 λεπτά μέσω της παράκαμψης.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου στον Πλατανιά",
          delivery: "Η παράδοση στο ξενοδοχείο ή το κατάλυμά σας στον Πλατανιά είναι συνήθως εφικτή και το τοπικό γραφείο επιβεβαιώνει το ακριβές σημείο συνάντησης με την προσφορά. Πληρώνετε το γραφείο κατά την παραλαβή, χωρίς καμία online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Προσοχή στον παραλιακό δρόμο", p: "Η παλιά εθνική οδός μέσα από Στάλο, Αγία Μαρίνα και Πλατανιά είναι μια συνεχόμενη εμπορική ζώνη. Στην αιχμή του καλοκαιριού η κίνηση είναι βαριά και πολλοί πεζοί διασχίζουν τον δρόμο ανάμεσα σε ξενοδοχεία και παραλία: οδηγήστε αργά." },
            { h: "ΒΟΑΚ (Α90) για μεγάλες αποστάσεις", p: "Για Κίσσαμο, Ελαφονήσι ή οτιδήποτε πέρα από το θέρετρο, ανεβείτε στον ΒΟΑΚ (Α90) νότια του οικισμού. Είναι πιο γρήγορος από τον παραλιακό δρόμο." },
          ],
          faqTitle: "Ενοικίαση αυτοκινήτου στον Πλατανιά: συχνές ερωτήσεις",
          faq: [
            { q: "Πώς πάω από το αεροδρόμιο των Χανίων στον Πλατανιά;", a: "Το αεροδρόμιο απέχει περίπου 25 χλμ., συνήθως 30 με 40 λεπτά μέσω της παράκαμψης. Το γραφείο μπορεί επίσης να παραδώσει το αυτοκίνητο απευθείας στο αεροδρόμιο, αναφέρετέ το στο αίτημα." },
            { q: "Χρειάζομαι αυτοκίνητο στον Πλατανιά;", a: "Το ίδιο το θέρετρο περπατιέται και η Αγία Μαρίνα απέχει μόλις 2,5 χλμ. Το αυτοκίνητο χρησιμεύει κυρίως για τα Χανιά, τις παραλίες Γεράνι και Μάλεμε πιο δυτικά, και τις εκδρομές σε Μπάλο, Ελαφονήσι και Φαλάσαρνα." },
            { q: "Είναι δύσκολη η οδήγηση στον Πλατανιά το καλοκαίρι;", a: "Ο παραλιακός άξονας έχει βαριά κίνηση στην αιχμή του καλοκαιριού και οι πεζοί διασχίζουν συνεχώς τον δρόμο. Οι μικρές διαδρομές κατά μήκος της ζώνης είναι αργές, ενώ για μεγαλύτερες αποστάσεις ο ΒΟΑΚ (Α90) στα νότια είναι πιο γρήγορος." },
          ],
        },
      },
    },
    "kissamos": {
      hub: { en: "Kissamos (Kastelli)", fr: "Kissamos (Kastelli)", de: "Kissamos (Kastelli)", el: "Κίσσαμος (Καστέλλι)" },
      meta: {
        en: {
          title: "Car Rental Kissamos (Kastelli) - local agency, no prepayment",
          desc: "Rent a car in Kissamos with a local agency. Base for Balos, Falassarna and Elafonisi, pay at pick-up, no online prepayment.",
        },
        fr: {
          title: "Location de voiture Kissamos (Kastelli) - agence locale, sans prépaiement",
          desc: "Louez une voiture à Kissamos avec une agence locale. Base pour Balos, Falassarna et Elafonisi, paiement à la prise du véhicule, aucun prépaiement en ligne.",
        },
        de: {
          title: "Mietwagen Kissamos (Kastelli) - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Kissamos bei einer lokalen Agentur. Basis für Balos, Falassarna und Elafonisi, Zahlung bei Übernahme, keine Online-Vorauszahlung.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στην Κίσσαμο - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στην Κίσσαμο από τοπικό γραφείο. Βάση για Μπάλο, Φαλάσαρνα και Ελαφονήσι, πληρωμή στην παραλαβή, καμία online προπληρωμή.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Kissamos",
          intro: "Kissamos, also called Kastelli, is the last town before Crete's far west: Falassarna is 10 to 11 km away (about 20 minutes), Elafonisi about 40 km (45 to 50 minutes) and Chania 38 to 42 km (35 to 45 minutes). The port, with the Balos and Gramvousa boats and the ferry, is about 3 km west of the centre.",
          deliveryTitle: "Getting your car in Kissamos",
          delivery: "Delivery to your accommodation in Kissamos is usually possible; the local agency confirms the exact meeting point with the offer. You pay the agency at pick-up, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Fill up before excursions", p: "Fuel stations get rarer west of Kissamos and keep shorter hours, with reduced service on Sundays. Fill the tank in town before heading to Falassarna, Elafonisi or the far west." },
            { h: "Beach roads", p: "The Elafonisi road is fully paved but winding and narrow in places; a newer section bypasses the narrow tunnel and some GPS apps do not know it yet, so follow the signs. The final descent to Falassarna is a series of hairpins, so allow time." },
          ],
          faqTitle: "Kissamos car rental FAQ",
          faq: [
            { q: "Can I drive to Balos with the rental car?", a: "Mostly no. Past Kaliviani the last roughly 8 km to Balos are a gravel track, and most rental contracts exclude damage on unpaved roads (underbody, tyres); some forbid this road outright. The honest alternative is the boat from Kissamos port. Either way expect a small entrance fee per person at Balos, plus parking if you come by the track; the amounts change." },
            { q: "How do I get to Elafonisi from Kissamos?", a: "Count on about 40 km, usually 45 to 50 minutes. The road is fully paved but winding and narrow in places; a newer section bypasses the old narrow tunnel and some GPS apps do not know it yet." },
            { q: "Is there a ferry to Kissamos?", a: "Yes. A SeaJets route links Piraeus, Kythira, Kissamos and Gythio. The port is about 3 km west of the centre; add your arrival time in the request so the agency can suggest a suitable handover point." },
          ],
        },
        fr: {
          h1: "Location de voiture à Kissamos",
          intro: "Kissamos, aussi appelée Kastelli, est la dernière ville avant l'extrême ouest de la Crète : Falassarna est à 10 à 11 km (environ 20 minutes), Elafonisi à environ 40 km (45 à 50 minutes) et Chania à 38 à 42 km (35 à 45 minutes). Le port, d'où partent les bateaux pour Balos et Gramvousa ainsi que le ferry, se trouve à environ 3 km à l'ouest du centre.",
          deliveryTitle: "Récupérer votre voiture à Kissamos",
          delivery: "La livraison à votre hébergement à Kissamos est généralement possible ; l'agence locale confirme le point de rendez-vous exact avec l'offre. Vous payez l'agence à la prise du véhicule, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Faites le plein avant les excursions", p: "Les stations-service se raréfient à l'ouest de Kissamos et ferment plus tôt, avec un service réduit le dimanche. Remplissez le réservoir en ville avant de partir vers Falassarna, Elafonisi ou l'extrême ouest." },
            { h: "Routes vers les plages", p: "La route d'Elafonisi est entièrement goudronnée mais sinueuse et étroite par endroits ; un nouveau tronçon contourne le tunnel étroit et certains GPS ne le connaissent pas encore, suivez la signalisation. La descente finale vers Falassarna se fait en lacets, prévoyez du temps." },
          ],
          faqTitle: "Location de voiture à Kissamos FAQ",
          faq: [
            { q: "Puis-je aller à Balos avec la voiture de location ?", a: "En général non. Après Kaliviani, les 8 derniers kilomètres environ vers Balos sont une piste de gravier, et la plupart des contrats de location excluent les dégâts sur routes non goudronnées (bas de caisse, pneus) ; certains interdisent carrément cette route. L'alternative honnête est le bateau depuis le port de Kissamos. Dans tous les cas, comptez un petit droit d'entrée par personne à Balos, plus le parking si vous venez par la piste ; les montants changent." },
            { q: "Comment aller à Elafonisi depuis Kissamos ?", a: "Comptez environ 40 km, soit 45 à 50 minutes. La route est entièrement goudronnée mais sinueuse et étroite par endroits ; un nouveau tronçon contourne l'ancien tunnel étroit et certains GPS ne le connaissent pas encore." },
            { q: "Y a-t-il un ferry à Kissamos ?", a: "Oui. Une ligne SeaJets en service relie Le Pirée, Cythère, Kissamos et Gythio. Le port est à environ 3 km à l'ouest du centre ; indiquez votre heure d'arrivée dans la demande pour que l'agence propose un point de remise adapté." },
          ],
        },
        de: {
          h1: "Mietwagen in Kissamos",
          intro: "Kissamos, auch Kastelli genannt, ist die letzte Stadt vor dem äußersten Westen Kretas: Falassarna liegt 10 bis 11 km entfernt (etwa 20 Minuten), Elafonisi rund 40 km (45 bis 50 Minuten) und Chania 38 bis 42 km (35 bis 45 Minuten). Der Hafen mit den Booten nach Balos und Gramvousa sowie der Fähre liegt etwa 3 km westlich des Zentrums.",
          deliveryTitle: "Ihren Wagen in Kissamos erhalten",
          delivery: "Die Lieferung zu Ihrer Unterkunft in Kissamos ist meist möglich; den genauen Treffpunkt bestätigt die lokale Agentur mit dem Angebot. Sie zahlen die Agentur bei der Übernahme, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Vor Ausflügen volltanken", p: "Westlich von Kissamos werden Tankstellen seltener und haben kürzere Öffnungszeiten, sonntags oft eingeschränkt. Tanken Sie in der Stadt voll, bevor Sie nach Falassarna, Elafonisi oder in den äußersten Westen fahren." },
            { h: "Straßen zu den Stränden", p: "Die Straße nach Elafonisi ist durchgehend asphaltiert, aber stellenweise kurvig und eng; ein neuerer Abschnitt umgeht den engen Tunnel, und manche Navis kennen ihn noch nicht, folgen Sie der Beschilderung. Das letzte Stück hinunter nach Falassarna verläuft in Serpentinen, planen Sie Zeit ein." },
          ],
          faqTitle: "Mietwagen Kissamos FAQ",
          faq: [
            { q: "Kann ich mit dem Mietwagen nach Balos fahren?", a: "Meist nein. Hinter Kaliviani sind die letzten rund 8 km nach Balos eine Schotterpiste, und die meisten Mietverträge schließen Schäden auf unbefestigten Straßen aus (Unterboden, Reifen); manche verbieten diese Strecke ganz. Die ehrliche Alternative ist das Boot vom Hafen Kissamos. In jedem Fall fällt in Balos ein kleiner Eintritt pro Person an, plus Parkgebühr, wenn Sie über die Piste kommen; die Beträge ändern sich." },
            { q: "Wie komme ich von Kissamos nach Elafonisi?", a: "Rechnen Sie mit etwa 40 km, meist 45 bis 50 Minuten. Die Straße ist durchgehend asphaltiert, aber stellenweise kurvig und eng; ein neuerer Abschnitt umgeht den alten engen Tunnel, und manche Navis kennen ihn noch nicht." },
            { q: "Gibt es eine Fähre nach Kissamos?", a: "Ja. Eine SeaJets-Verbindung verbindet Piräus, Kythira, Kissamos und Gythio. Der Hafen liegt etwa 3 km westlich des Zentrums; geben Sie die Ankunftszeit in der Anfrage an, damit die Agentur einen passenden Übergabepunkt vorschlägt." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στην Κίσσαμο",
          intro: "Η Κίσσαμος, γνωστή και ως Καστέλλι, είναι η τελευταία πόλη πριν από το δυτικό άκρο της Κρήτης: τα Φαλάσαρνα απέχουν 10 με 11 χλμ. (περίπου 20 λεπτά), το Ελαφονήσι περίπου 40 χλμ. (45 με 50 λεπτά) και τα Χανιά 38 με 42 χλμ. (35 με 45 λεπτά). Το λιμάνι, από όπου φεύγουν τα καραβάκια για Μπάλο και Γραμβούσα καθώς και το πλοίο της γραμμής, βρίσκεται περίπου 3 χλμ. δυτικά του κέντρου.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου στην Κίσσαμο",
          delivery: "Η παράδοση στο κατάλυμά σας στην Κίσσαμο είναι συνήθως εφικτή και το τοπικό γραφείο επιβεβαιώνει το ακριβές σημείο συνάντησης με την προσφορά. Πληρώνετε το γραφείο κατά την παραλαβή, χωρίς καμία online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Γεμίστε ρεζερβουάρ πριν τις εκδρομές", p: "Δυτικά της Κισσάμου τα βενζινάδικα αραιώνουν και κλείνουν νωρίτερα, με περιορισμένη λειτουργία τις Κυριακές. Γεμίστε στην πόλη πριν ξεκινήσετε για Φαλάσαρνα, Ελαφονήσι ή το δυτικό άκρο." },
            { h: "Δρόμοι προς τις παραλίες", p: "Ο δρόμος για το Ελαφονήσι είναι πλήρως ασφαλτοστρωμένος αλλά με στροφές και στενός σε σημεία. Ένα νεότερο τμήμα παρακάμπτει το στενό τούνελ και ορισμένα GPS δεν το γνωρίζουν ακόμη, ακολουθήστε τις πινακίδες. Η τελική κατάβαση προς τα Φαλάσαρνα έχει απανωτές στροφές, υπολογίστε χρόνο." },
          ],
          faqTitle: "Ενοικίαση αυτοκινήτου στην Κίσσαμο: συχνές ερωτήσεις",
          faq: [
            { q: "Μπορώ να πάω στον Μπάλο με το ενοικιαζόμενο αυτοκίνητο;", a: "Κατά κανόνα όχι. Μετά την Καλυβιανή, τα τελευταία περίπου 8 χλμ. προς τον Μπάλο είναι χωματόδρομος με χαλίκι, και τα περισσότερα συμβόλαια ενοικίασης εξαιρούν ζημιές σε μη ασφαλτοστρωμένους δρόμους (κάτω μέρος αμαξώματος, ελαστικά), ενώ κάποια απαγορεύουν εντελώς τη διαδρομή. Η τίμια εναλλακτική είναι το καραβάκι από το λιμάνι της Κισσάμου. Σε κάθε περίπτωση, υπολογίστε ένα μικρό αντίτιμο εισόδου ανά άτομο στον Μπάλο, συν πάρκινγκ αν έρθετε από τον χωματόδρομο, τα ποσά αλλάζουν." },
            { q: "Πώς πάω στο Ελαφονήσι από την Κίσσαμο;", a: "Υπολογίστε περίπου 40 χλμ., δηλαδή 45 με 50 λεπτά. Ο δρόμος είναι πλήρως ασφαλτοστρωμένος αλλά με στροφές και στενός σε σημεία. Ένα νεότερο τμήμα παρακάμπτει το παλιό στενό τούνελ και ορισμένα GPS δεν το γνωρίζουν ακόμη." },
            { q: "Υπάρχει πλοίο για την Κίσσαμο;", a: "Ναι. Μια γραμμή της SeaJets συνδέει Πειραιά, Κύθηρα, Κίσσαμο και Γύθειο. Το λιμάνι βρίσκεται περίπου 3 χλμ. δυτικά του κέντρου. Αναφέρετε την ώρα άφιξης στο αίτημα ώστε το γραφείο να προτείνει κατάλληλο σημείο παράδοσης." },
          ],
        },
      },
    },
  "agios-nikolaos": {
      hub: { en: "Agios Nikolaos", fr: "Agios Nikolaos", de: "Agios Nikolaos", el: "Άγιος Νικόλαος" },
      meta: {
        en: {
          title: "Car Rental Agios Nikolaos - local agency, no prepayment",
          desc: "Rent a car in Agios Nikolaos with a local agency. Delivery to your accommodation usually possible, pay at pick-up, no online prepayment through Crete Direct.",
        },
        fr: {
          title: "Location de voiture Agios Nikolaos - agence locale, sans prépaiement",
          desc: "Louez une voiture à Agios Nikolaos avec une agence locale. Livraison à l'hébergement généralement possible, paiement à la prise du véhicule, aucun prépaiement en ligne via Crete Direct.",
        },
        de: {
          title: "Mietwagen Agios Nikolaos - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Agios Nikolaos bei einer lokalen Agentur. Lieferung zur Unterkunft meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung über Crete Direct.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στον Άγιο Νικόλαο - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στον Άγιο Νικόλαο από τοπικό γραφείο. Παράδοση στο κατάλυμα συνήθως εφικτή, πληρωμή κατά την παραλαβή, χωρίς online προπληρωμή μέσω του Crete Direct.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Agios Nikolaos",
          intro: "Agios Nikolaos is the main town on Mirabello Bay and a practical base for east Crete. Heraklion Airport is about 60 km away (around 50 minutes without traffic), Elounda 10 to 12 km up the coast, Sitia about 70 km and Ierapetra about 36 km.",
          deliveryTitle: "Getting your car in Agios Nikolaos",
          delivery: "Send the request through the form and a local agency replies with a quote. Delivery to your hotel or apartment in Agios Nikolaos is usually possible, with the exact handover point confirmed by the agency. You pay the agency at pick-up, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Parking in town", p: "The streets around Lake Voulismeni are pedestrian or restricted, so park and walk: the centre is compact. There is a large paid car park at the marina south of the lake, the blue paid zones fill quickly in summer, and free parking is easier near the stadium and the hospital." },
            { h: "Day trips by car", p: "With a car you can combine Kritsa and the Panagia Kera church (about 9 to 10 km), the Lasithi Plateau with the Psychro cave, or the Richtis Gorge on the road to Sitia." },
          ],
          faqTitle: "Agios Nikolaos car rental FAQ",
          faq: [
            { q: "How far is Agios Nikolaos from Heraklion Airport?", a: "About 60 km, usually around 50 minutes without traffic on the north coast road." },
            { q: "Where do the Spinalonga boats leave from?", a: "From the port of Agios Nikolaos, from Elounda or from Plaka. With a car, Elounda is 10 to 12 km away along a coastal corniche road with views over Mirabello Bay." },
            { q: "Can I do a day trip to Ierapetra or Sitia?", a: "Yes. Ierapetra is about 36 km away (35 to 40 minutes) and Sitia about 70 km (1h15 to 1h30), with the Richtis Gorge on the way." },
          ],
        },
        fr: {
          h1: "Location de voiture à Agios Nikolaos",
          intro: "Agios Nikolaos est la principale ville de la baie de Mirabello et une base pratique pour l'est de la Crète. L'aéroport d'Héraklion est à environ 60 km (autour de 50 minutes hors trafic), Elounda à 10 à 12 km le long de la côte, Sitia à environ 70 km et Ierapetra à environ 36 km.",
          deliveryTitle: "Récupérer votre voiture à Agios Nikolaos",
          delivery: "Envoyez la demande via le formulaire et une agence locale répond avec un devis. La livraison à votre hôtel ou hébergement à Agios Nikolaos est généralement possible, le point de remise exact étant confirmé par l'agence. Vous payez l'agence à la prise du véhicule, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Se garer en ville", p: "Les rues au bord du lac Voulismeni sont piétonnes ou à circulation restreinte : garez-vous et finissez à pied, le centre est compact. Un grand parking payant se trouve à la marina au sud du lac, les zones bleues payantes se remplissent vite en été, et le stationnement gratuit est plus facile côté stade et hôpital." },
            { h: "Excursions en voiture", p: "Avec une voiture, vous combinez Kritsa et l'église Panagia Kera (environ 9 à 10 km), le plateau du Lassithi avec la grotte de Psychro, ou la gorge de Richtis sur la route de Sitia." },
          ],
          faqTitle: "Location de voiture Agios Nikolaos FAQ",
          faq: [
            { q: "À quelle distance est Agios Nikolaos de l'aéroport d'Héraklion ?", a: "Environ 60 km, souvent autour de 50 minutes hors trafic par la route de la côte nord." },
            { q: "D'où partent les bateaux pour Spinalonga ?", a: "Du port d'Agios Nikolaos, d'Elounda ou de Plaka. En voiture, Elounda est à 10 à 12 km par une route côtière en corniche, avec vue sur la baie de Mirabello." },
            { q: "Peut-on faire une excursion à la journée vers Ierapetra ou Sitia ?", a: "Oui. Ierapetra est à environ 36 km (35 à 40 minutes) et Sitia à environ 70 km (1 h 15 à 1 h 30), avec la gorge de Richtis sur la route." },
          ],
        },
        de: {
          h1: "Mietwagen in Agios Nikolaos",
          intro: "Agios Nikolaos ist der Hauptort an der Mirabello-Bucht und eine praktische Basis für Ostkreta. Der Flughafen Heraklion liegt etwa 60 km entfernt (rund 50 Minuten ohne Verkehr), Elounda 10 bis 12 km an der Küste entlang, Sitia etwa 70 km und Ierapetra etwa 36 km.",
          deliveryTitle: "Ihren Wagen in Agios Nikolaos übernehmen",
          delivery: "Senden Sie die Anfrage über das Formular, und eine lokale Agentur antwortet mit einem Angebot. Die Lieferung zu Ihrem Hotel oder Ihrer Unterkunft in Agios Nikolaos ist meist möglich, den genauen Übergabepunkt bestätigt die Agentur. Sie zahlen die Agentur bei der Übernahme, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Parken in der Stadt", p: "Die Straßen am See Voulismeni sind Fußgängerzone oder verkehrsberuhigt: parken Sie und gehen Sie zu Fuß weiter, das Zentrum ist kompakt. An der Marina südlich des Sees gibt es einen großen gebührenpflichtigen Parkplatz, die gebührenpflichtigen blauen Zonen füllen sich im Sommer schnell, und kostenlos parkt man leichter beim Stadion und beim Krankenhaus." },
            { h: "Ausflüge mit dem Auto", p: "Mit dem Auto kombinieren Sie Kritsa und die Kirche Panagia Kera (etwa 9 bis 10 km), die Lasithi-Hochebene mit der Höhle von Psychro oder die Richtis-Schlucht an der Straße nach Sitia." },
          ],
          faqTitle: "Mietwagen Agios Nikolaos FAQ",
          faq: [
            { q: "Wie weit ist Agios Nikolaos vom Flughafen Heraklion entfernt?", a: "Etwa 60 km, meist rund 50 Minuten ohne Verkehr über die Straße an der Nordküste." },
            { q: "Wo starten die Boote nach Spinalonga?", a: "Am Hafen von Agios Nikolaos, in Elounda oder in Plaka. Mit dem Auto liegt Elounda 10 bis 12 km entfernt, über eine Küstenstraße am Hang mit Blick auf die Mirabello-Bucht." },
            { q: "Sind Tagesausflüge nach Ierapetra oder Sitia machbar?", a: "Ja. Ierapetra liegt etwa 36 km entfernt (35 bis 40 Minuten), Sitia etwa 70 km (1 Stunde 15 bis 1 Stunde 30), mit der Richtis-Schlucht auf dem Weg." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στον Άγιο Νικόλαο",
          intro: "Ο Άγιος Νικόλαος είναι η κύρια πόλη του κόλπου του Μιραμπέλου και πρακτική βάση για την ανατολική Κρήτη. Το αεροδρόμιο Ηρακλείου απέχει περίπου 60 χλμ. (γύρω στα 50 λεπτά χωρίς κίνηση), η Ελούντα 10 με 12 χλμ. κατά μήκος της ακτής, η Σητεία περίπου 70 χλμ. και η Ιεράπετρα περίπου 36 χλμ.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου στον Άγιο Νικόλαο",
          delivery: "Στέλνετε το αίτημα μέσω της φόρμας και ένα τοπικό γραφείο απαντά με προσφορά. Η παράδοση στο ξενοδοχείο ή το κατάλυμά σας στον Άγιο Νικόλαο είναι συνήθως εφικτή και το ακριβές σημείο παράδοσης επιβεβαιώνεται από το γραφείο. Πληρώνετε το γραφείο κατά την παραλαβή, χωρίς online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Παρκάρισμα στην πόλη", p: "Οι δρόμοι γύρω από τη λίμνη Βουλισμένη είναι πεζόδρομοι ή με περιορισμένη κυκλοφορία: παρκάρετε και συνεχίστε με τα πόδια, το κέντρο είναι μικρό. Υπάρχει μεγάλο πάρκινγκ με πληρωμή στη μαρίνα νότια της λίμνης, οι μπλε θέσεις γεμίζουν γρήγορα το καλοκαίρι και δωρεάν στάθμευση βρίσκετε πιο εύκολα κοντά στο στάδιο και το νοσοκομείο." },
            { h: "Εκδρομές με το αυτοκίνητο", p: "Με αυτοκίνητο συνδυάζετε την Κριτσά και την Παναγία Κερά (περίπου 9 με 10 χλμ.), το οροπέδιο Λασιθίου με το σπήλαιο του Ψυχρού ή το φαράγγι του Ρίχτη στον δρόμο προς τη Σητεία." },
          ],
          faqTitle: "Ενοικίαση αυτοκινήτου Άγιος Νικόλαος: συχνές ερωτήσεις",
          faq: [
            { q: "Πόσο απέχει ο Άγιος Νικόλαος από το αεροδρόμιο Ηρακλείου;", a: "Περίπου 60 χλμ., συνήθως γύρω στα 50 λεπτά χωρίς κίνηση από τον βόρειο οδικό άξονα." },
            { q: "Από πού φεύγουν τα καραβάκια για τη Σπιναλόγκα;", a: "Από το λιμάνι του Αγίου Νικολάου, την Ελούντα ή την Πλάκα. Με αυτοκίνητο, η Ελούντα απέχει 10 με 12 χλμ. από τον παραλιακό δρόμο, με θέα στον κόλπο του Μιραμπέλου." },
            { q: "Γίνεται ημερήσια εκδρομή σε Ιεράπετρα ή Σητεία;", a: "Ναι. Η Ιεράπετρα απέχει περίπου 36 χλμ. (35 με 40 λεπτά) και η Σητεία περίπου 70 χλμ. (1 ώρα και 15 έως 1 ώρα και 30 λεπτά), με το φαράγγι του Ρίχτη στη διαδρομή." },
          ],
        },
      },
    },
    "elounda": {
      hub: { en: "Elounda", fr: "Elounda", de: "Elounda", el: "Ελούντα" },
      meta: {
        en: {
          title: "Car Rental Elounda - local agency, no prepayment",
          desc: "Rent a car in Elounda with a local agency. Delivery to your hotel usually possible, pay at pick-up, no online prepayment through Crete Direct.",
        },
        fr: {
          title: "Location de voiture Elounda - agence locale, sans prépaiement",
          desc: "Louez une voiture à Elounda avec une agence locale. Livraison à l'hôtel généralement possible, paiement à la prise du véhicule, aucun prépaiement en ligne via Crete Direct.",
        },
        de: {
          title: "Mietwagen Elounda - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Elounda bei einer lokalen Agentur. Lieferung zum Hotel meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung über Crete Direct.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στην Ελούντα - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στην Ελούντα από τοπικό γραφείο. Παράδοση στο ξενοδοχείο συνήθως εφικτή, πληρωμή κατά την παραλαβή, χωρίς online προπληρωμή μέσω του Crete Direct.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Elounda",
          intro: "Elounda is a resort village on Mirabello Bay, about 10 to 12 km from Agios Nikolaos (15 to 20 minutes) and around 71 km from Heraklion. Plaka, the closest departure point for Spinalonga, is about 5 km up the coast.",
          deliveryTitle: "Getting your car in Elounda",
          delivery: "Send the request through the form and a local agency replies with a quote. Delivery to your hotel or villa in Elounda is usually possible, and the agency confirms the exact handover point with the offer. You pay the agency at pick-up, with no online prepayment through Crete Direct.",
          tips: [
            { h: "The corniche road", p: "The road between Elounda and Agios Nikolaos is a coastal corniche with views over Mirabello Bay. Allow 15 to 20 minutes and drive at an easy pace." },
            { h: "Spinalonga logistics", p: "Boats leave from Elounda port with a crossing of about 30 minutes and frequent departures in season. From Plaka, about 5 km away (around 10 minutes by car), the crossing takes 5 to 10 minutes." },
          ],
          faqTitle: "Elounda car rental FAQ",
          faq: [
            { q: "How do I get to Spinalonga from Elounda?", a: "By boat from Elounda port, about 30 minutes with frequent departures in season. With the car you can also drive to Plaka, about 5 km away, where the crossing takes 5 to 10 minutes." },
            { q: "How far is Elounda from Heraklion?", a: "About 71 km. The last stretch from Agios Nikolaos is a coastal corniche road of 10 to 12 km along Mirabello Bay." },
            { q: "Where is the car handed over in Elounda?", a: "The agency confirms the exact meeting point with the quote. Delivery to your hotel or villa is usually possible." },
          ],
        },
        fr: {
          h1: "Location de voiture à Elounda",
          intro: "Elounda est un village balnéaire de la baie de Mirabello, à environ 10 à 12 km d'Agios Nikolaos (15 à 20 minutes) et à environ 71 km d'Héraklion. Plaka, le point de départ le plus proche pour Spinalonga, est à environ 5 km le long de la côte.",
          deliveryTitle: "Récupérer votre voiture à Elounda",
          delivery: "Envoyez la demande via le formulaire et une agence locale répond avec un devis. La livraison à votre hôtel ou villa à Elounda est généralement possible, et l'agence confirme le point de remise exact avec l'offre. Vous payez l'agence à la prise du véhicule, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "La route en corniche", p: "La route entre Elounda et Agios Nikolaos est une route côtière en corniche, avec vue sur la baie de Mirabello. Comptez 15 à 20 minutes et roulez tranquillement." },
            { h: "Rejoindre Spinalonga", p: "Les bateaux partent du port d'Elounda avec une traversée d'environ 30 minutes et des départs fréquents en saison. Depuis Plaka, à environ 5 km (autour de 10 minutes en voiture), la traversée dure 5 à 10 minutes." },
          ],
          faqTitle: "Location de voiture Elounda FAQ",
          faq: [
            { q: "Comment aller à Spinalonga depuis Elounda ?", a: "En bateau depuis le port d'Elounda, environ 30 minutes avec des départs fréquents en saison. En voiture, vous pouvez aussi rejoindre Plaka, à environ 5 km, où la traversée dure 5 à 10 minutes." },
            { q: "À quelle distance est Elounda d'Héraklion ?", a: "Environ 71 km. Le dernier tronçon depuis Agios Nikolaos est une route côtière en corniche de 10 à 12 km le long de la baie de Mirabello." },
            { q: "Où la voiture est-elle remise à Elounda ?", a: "L'agence confirme le point de rendez-vous exact avec le devis. La livraison à votre hôtel ou villa est généralement possible." },
          ],
        },
        de: {
          h1: "Mietwagen in Elounda",
          intro: "Elounda ist ein Ferienort an der Mirabello-Bucht, etwa 10 bis 12 km von Agios Nikolaos entfernt (15 bis 20 Minuten) und rund 71 km von Heraklion. Plaka, der nächstgelegene Ablegepunkt für Spinalonga, liegt etwa 5 km weiter an der Küste.",
          deliveryTitle: "Ihren Wagen in Elounda übernehmen",
          delivery: "Senden Sie die Anfrage über das Formular, und eine lokale Agentur antwortet mit einem Angebot. Die Lieferung zu Ihrem Hotel oder Ihrer Villa in Elounda ist meist möglich, den genauen Übergabepunkt bestätigt die Agentur mit dem Angebot. Sie zahlen die Agentur bei der Übernahme, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Die Küstenstraße", p: "Die Straße zwischen Elounda und Agios Nikolaos verläuft als Küstenstraße am Hang, mit Blick auf die Mirabello-Bucht. Rechnen Sie mit 15 bis 20 Minuten und fahren Sie in Ruhe." },
            { h: "Nach Spinalonga", p: "Vom Hafen Elounda dauert die Überfahrt etwa 30 Minuten, in der Saison mit häufigen Abfahrten. Von Plaka, etwa 5 km entfernt (rund 10 Minuten mit dem Auto), dauert die Überfahrt 5 bis 10 Minuten." },
          ],
          faqTitle: "Mietwagen Elounda FAQ",
          faq: [
            { q: "Wie komme ich von Elounda nach Spinalonga?", a: "Mit dem Boot vom Hafen Elounda, etwa 30 Minuten, in der Saison mit häufigen Abfahrten. Mit dem Auto können Sie auch nach Plaka fahren, etwa 5 km entfernt, wo die Überfahrt 5 bis 10 Minuten dauert." },
            { q: "Wie weit ist Elounda von Heraklion entfernt?", a: "Etwa 71 km. Das letzte Stück ab Agios Nikolaos ist eine Küstenstraße am Hang, 10 bis 12 km entlang der Mirabello-Bucht." },
            { q: "Wo wird der Wagen in Elounda übergeben?", a: "Die Agentur bestätigt den genauen Treffpunkt mit dem Angebot. Die Lieferung zu Ihrem Hotel oder Ihrer Villa ist meist möglich." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στην Ελούντα",
          intro: "Η Ελούντα είναι παραθεριστικό χωριό στον κόλπο του Μιραμπέλου, περίπου 10 με 12 χλμ. από τον Άγιο Νικόλαο (15 με 20 λεπτά) και γύρω στα 71 χλμ. από το Ηράκλειο. Η Πλάκα, το κοντινότερο σημείο αναχώρησης για τη Σπιναλόγκα, απέχει περίπου 5 χλμ. κατά μήκος της ακτής.",
          deliveryTitle: "Παραλαβή του αυτοκινήτου στην Ελούντα",
          delivery: "Στέλνετε το αίτημα μέσω της φόρμας και ένα τοπικό γραφείο απαντά με προσφορά. Η παράδοση στο ξενοδοχείο ή τη βίλα σας στην Ελούντα είναι συνήθως εφικτή και το ακριβές σημείο παράδοσης επιβεβαιώνεται από το γραφείο μαζί με την προσφορά. Πληρώνετε το γραφείο κατά την παραλαβή, χωρίς online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Ο παραλιακός δρόμος", p: "Ο δρόμος ανάμεσα στην Ελούντα και τον Άγιο Νικόλαο είναι παραλιακός, πάνω από τη θάλασσα, με θέα στον κόλπο του Μιραμπέλου. Υπολογίστε 15 με 20 λεπτά και οδηγήστε ήρεμα." },
            { h: "Προς τη Σπιναλόγκα", p: "Από το λιμάνι της Ελούντας η διαδρομή με το καραβάκι διαρκεί περίπου 30 λεπτά, με συχνά δρομολόγια τη σεζόν. Από την Πλάκα, περίπου 5 χλμ. μακριά (γύρω στα 10 λεπτά με αυτοκίνητο), το πέρασμα διαρκεί 5 με 10 λεπτά." },
          ],
          faqTitle: "Ενοικίαση αυτοκινήτου Ελούντα: συχνές ερωτήσεις",
          faq: [
            { q: "Πώς πάω στη Σπιναλόγκα από την Ελούντα;", a: "Με καραβάκι από το λιμάνι της Ελούντας, περίπου 30 λεπτά, με συχνά δρομολόγια τη σεζόν. Με το αυτοκίνητο μπορείτε επίσης να πάτε στην Πλάκα, περίπου 5 χλμ. μακριά, όπου το πέρασμα διαρκεί 5 με 10 λεπτά." },
            { q: "Πόσο απέχει η Ελούντα από το Ηράκλειο;", a: "Περίπου 71 χλμ. Το τελευταίο κομμάτι από τον Άγιο Νικόλαο είναι παραλιακός δρόμος 10 με 12 χλμ. κατά μήκος του κόλπου του Μιραμπέλου." },
            { q: "Πού γίνεται η παράδοση του αυτοκινήτου στην Ελούντα;", a: "Το γραφείο επιβεβαιώνει το ακριβές σημείο συνάντησης μαζί με την προσφορά. Η παράδοση στο ξενοδοχείο ή τη βίλα σας είναι συνήθως εφικτή." },
          ],
        },
      },
    },
    "ierapetra": {
      hub: { en: "Ierapetra", fr: "Ierapetra", de: "Ierapetra", el: "Ιεράπετρα" },
      meta: {
        en: {
          title: "Car Rental Ierapetra - local agency, no prepayment",
          desc: "Rent a car in Ierapetra with a local agency. Delivery to your accommodation usually possible, pay at pick-up, no online prepayment through Crete Direct.",
        },
        fr: {
          title: "Location de voiture Ierapetra - agence locale, sans prépaiement",
          desc: "Louez une voiture à Ierapetra avec une agence locale. Livraison à l'hébergement généralement possible, paiement à la prise du véhicule, aucun prépaiement en ligne via Crete Direct.",
        },
        de: {
          title: "Mietwagen Ierapetra - lokale Agentur, keine Vorauszahlung",
          desc: "Mietwagen in Ierapetra bei einer lokalen Agentur. Lieferung zur Unterkunft meist möglich, Zahlung bei Übernahme, keine Online-Vorauszahlung über Crete Direct.",
        },
        el: {
          title: "Ενοικίαση αυτοκινήτου στην Ιεράπετρα - τοπικό γραφείο, χωρίς προπληρωμή",
          desc: "Νοικιάστε αυτοκίνητο στην Ιεράπετρα από τοπικό γραφείο. Παράδοση στο κατάλυμα συνήθως εφικτή, πληρωμή κατά την παραλαβή, χωρίς online προπληρωμή μέσω του Crete Direct.",
        },
      },
      content: {
        en: {
          h1: "Car rental in Ierapetra",
          intro: "Ierapetra is the main town on Crete's south-east coast. Agios Nikolaos is about 36 km away (35 to 40 minutes), Heraklion about 97 km (around 1h30), Makrigialos about 26 km (around 30 minutes) and Myrtos about 15 km (around 20 minutes).",
          deliveryTitle: "Getting your car in Ierapetra",
          delivery: "Send the request through the form and a local agency replies with a quote. Delivery to your hotel or apartment in Ierapetra is usually possible, with the exact handover point confirmed by the agency. You pay the agency at pick-up, with no online prepayment through Crete Direct.",
          tips: [
            { h: "Parking in town", p: "Ierapetra is an easy town by car. On-street parking is free in much of the town, paid near the port and in the newer centre, and free on the outskirts. The seafront gets tight in high season." },
            { h: "Fuel on the south coast", p: "Petrol stations are less frequent on the south coast and inland. Fill up before heading to remote areas and note that many stations keep reduced hours on Sundays." },
          ],
          faqTitle: "Ierapetra car rental FAQ",
          faq: [
            { q: "Can I take a boat to Chrissi Island from Ierapetra?", a: "Cruises run from Ierapetra port in season, roughly May to October, but landing on the island is forbidden from 1 May to 31 October: it is a protected Natura 2000 area, and the measure has been renewed every year since 2022. Boats sail around the island with swimming stops, and the exact arrangements are re-checked each season." },
            { q: "What is the drive from Agios Nikolaos like?", a: "About 36 km and 35 to 40 minutes: E75 to Pachia Ammos, then due south. This is the narrowest point of Crete, about 17 km between the north and south coasts, not a high mountain pass." },
            { q: "Can I reach the Sarakina Gorge with a standard car?", a: "Yes. The gorge is near Mithi, about 21 km west of Ierapetra, with a paved road and parking." },
          ],
        },
        fr: {
          h1: "Location de voiture à Ierapetra",
          intro: "Ierapetra est la principale ville de la côte sud-est de la Crète. Agios Nikolaos est à environ 36 km (35 à 40 minutes), Héraklion à environ 97 km (environ 1 h 30), Makrigialos à environ 26 km (environ 30 minutes) et Myrtos à environ 15 km (environ 20 minutes).",
          deliveryTitle: "Récupérer votre voiture à Ierapetra",
          delivery: "Envoyez la demande via le formulaire et une agence locale répond avec un devis. La livraison à votre hôtel ou hébergement à Ierapetra est généralement possible, le point de remise exact étant confirmé par l'agence. Vous payez l'agence à la prise du véhicule, sans prépaiement en ligne via Crete Direct.",
          tips: [
            { h: "Se garer en ville", p: "Ierapetra est une ville facile en voiture. Le stationnement en bord de rue est gratuit dans une bonne partie de la ville, payant près du port et dans le nouveau centre, et gratuit en périphérie. Le front de mer est tendu en haute saison." },
            { h: "Carburant côté sud", p: "Les stations-service sont moins fréquentes sur la côte sud et dans l'intérieur. Faites le plein avant les zones reculées et notez que beaucoup de stations ont des horaires réduits le dimanche." },
          ],
          faqTitle: "Location de voiture Ierapetra FAQ",
          faq: [
            { q: "Peut-on prendre un bateau pour l'île de Chrissi depuis Ierapetra ?", a: "Des croisières partent du port d'Ierapetra en saison, environ de mai à octobre, mais le débarquement sur l'île est interdit du 1er mai au 31 octobre : c'est une zone protégée Natura 2000, et la mesure est reconduite chaque année depuis 2022. Les bateaux font le tour de l'île avec des pauses baignade, et les modalités sont revérifiées chaque saison." },
            { q: "Comment est la route depuis Agios Nikolaos ?", a: "Environ 36 km et 35 à 40 minutes : E75 jusqu'à Pachia Ammos, puis plein sud. C'est le point le plus étroit de la Crète, environ 17 km entre côte nord et côte sud, pas un grand col de montagne." },
            { q: "Peut-on rejoindre la gorge de Sarakina avec une voiture standard ?", a: "Oui. La gorge se trouve près de Mithi, à environ 21 km à l'ouest d'Ierapetra, avec une route goudronnée et un parking." },
          ],
        },
        de: {
          h1: "Mietwagen in Ierapetra",
          intro: "Ierapetra ist der Hauptort an der Südostküste Kretas. Agios Nikolaos liegt etwa 36 km entfernt (35 bis 40 Minuten), Heraklion etwa 97 km (rund 1 Stunde 30), Makrigialos etwa 26 km (rund 30 Minuten) und Myrtos etwa 15 km (rund 20 Minuten).",
          deliveryTitle: "Ihren Wagen in Ierapetra übernehmen",
          delivery: "Senden Sie die Anfrage über das Formular, und eine lokale Agentur antwortet mit einem Angebot. Die Lieferung zu Ihrem Hotel oder Ihrer Unterkunft in Ierapetra ist meist möglich, den genauen Übergabepunkt bestätigt die Agentur. Sie zahlen die Agentur bei der Übernahme, ohne Online-Vorauszahlung über Crete Direct.",
          tips: [
            { h: "Parken in der Stadt", p: "Ierapetra ist mit dem Auto unkompliziert. Am Straßenrand parkt man in weiten Teilen der Stadt kostenlos, gebührenpflichtig nahe am Hafen und im neueren Zentrum, kostenlos am Stadtrand. An der Uferpromenade wird es in der Hochsaison eng." },
            { h: "Tanken an der Südküste", p: "Tankstellen sind an der Südküste und im Landesinneren seltener. Tanken Sie vor abgelegenen Gegenden voll und beachten Sie, dass viele Tankstellen sonntags verkürzte Öffnungszeiten haben." },
          ],
          faqTitle: "Mietwagen Ierapetra FAQ",
          faq: [
            { q: "Kann ich von Ierapetra mit dem Boot zur Insel Chrissi?", a: "Bootstouren starten in der Saison, etwa Mai bis Oktober, am Hafen von Ierapetra, aber das Anlanden auf der Insel ist vom 1. Mai bis 31. Oktober verboten: Sie ist ein geschütztes Natura-2000-Gebiet, und die Maßnahme wird seit 2022 jedes Jahr verlängert. Die Boote fahren um die Insel mit Badestopps, und die genauen Bedingungen werden jede Saison neu geprüft." },
            { q: "Wie ist die Fahrt von Agios Nikolaos?", a: "Etwa 36 km und 35 bis 40 Minuten: E75 bis Pachia Ammos, dann direkt nach Süden. Das ist die schmalste Stelle Kretas, etwa 17 km zwischen Nord- und Südküste, kein hoher Gebirgspass." },
            { q: "Erreiche ich die Sarakina-Schlucht mit einem normalen Auto?", a: "Ja. Die Schlucht liegt bei Mithi, etwa 21 km westlich von Ierapetra, mit asphaltierter Straße und Parkplatz." },
          ],
        },
        el: {
          h1: "Ενοικίαση αυτοκινήτου στην Ιεράπετρα",
          intro: "Η Ιεράπετρα είναι η κύρια πόλη της νοτιοανατολικής ακτής της Κρήτης. Ο Άγιος Νικόλαος απέχει περίπου 36 χλμ. (35 με 40 λεπτά), το Ηράκλειο περίπου 97 χλμ. (γύρω στη μιάμιση ώρα), ο Μακρύγιαλος περίπου 26 χλμ. (γύρω στα 30 λεπτά) και ο Μύρτος περίπου 15 χλμ. (γύρω στα 20 λεπτά).",
          deliveryTitle: "Παραλαβή του αυτοκινήτου στην Ιεράπετρα",
          delivery: "Στέλνετε το αίτημα μέσω της φόρμας και ένα τοπικό γραφείο απαντά με προσφορά. Η παράδοση στο ξενοδοχείο ή το κατάλυμά σας στην Ιεράπετρα είναι συνήθως εφικτή και το ακριβές σημείο παράδοσης επιβεβαιώνεται από το γραφείο. Πληρώνετε το γραφείο κατά την παραλαβή, χωρίς online προπληρωμή μέσω του Crete Direct.",
          tips: [
            { h: "Παρκάρισμα στην πόλη", p: "Η Ιεράπετρα είναι εύκολη πόλη για αυτοκίνητο. Η στάθμευση στον δρόμο είναι δωρεάν σε μεγάλο μέρος της πόλης, με πληρωμή κοντά στο λιμάνι και στο νεότερο κέντρο, και δωρεάν στις παρυφές. Στην παραλιακή ζώνη το παρκάρισμα δυσκολεύει την υψηλή σεζόν." },
            { h: "Καύσιμα στη νότια ακτή", p: "Τα πρατήρια καυσίμων είναι πιο αραιά στη νότια ακτή και στην ενδοχώρα. Γεμίστε το ρεζερβουάρ πριν από απομακρυσμένες περιοχές και έχετε υπόψη ότι πολλά πρατήρια λειτουργούν με μειωμένο ωράριο τις Κυριακές." },
          ],
          faqTitle: "Ενοικίαση αυτοκινήτου Ιεράπετρα: συχνές ερωτήσεις",
          faq: [
            { q: "Μπορώ να πάω με καραβάκι στο νησί Χρυσή από την Ιεράπετρα;", a: "Κρουαζιέρες ξεκινούν από το λιμάνι της Ιεράπετρας τη σεζόν, περίπου από Μάιο έως Οκτώβριο, αλλά η αποβίβαση στο νησί απαγορεύεται από την 1η Μαΐου έως τις 31 Οκτωβρίου: είναι προστατευόμενη περιοχή Natura 2000 και το μέτρο ανανεώνεται κάθε χρόνο από το 2022. Τα καραβάκια κάνουν τον γύρο του νησιού με στάσεις για μπάνιο και οι λεπτομέρειες επιβεβαιώνονται ξανά κάθε σεζόν." },
            { q: "Πώς είναι η διαδρομή από τον Άγιο Νικόλαο;", a: "Περίπου 36 χλμ. και 35 με 40 λεπτά: Ε75 έως την Παχιά Άμμο και μετά νότια. Είναι το στενότερο σημείο της Κρήτης, περίπου 17 χλμ. από τη βόρεια ώς τη νότια ακτή, όχι μεγάλο ορεινό πέρασμα." },
            { q: "Φτάνω στο φαράγγι της Σαρακίνας με κανονικό αυτοκίνητο;", a: "Ναι. Το φαράγγι βρίσκεται κοντά στους Μύθους, περίπου 21 χλμ. δυτικά της Ιεράπετρας, με ασφαλτοστρωμένο δρόμο και χώρο στάθμευσης." },
          ],
        },
      },
    },
};

export const CAR_LOCATIONS: CarLocation[] = CAR_LANDINGS.map((ref) => ({
  ...ref,
  ...COPY[ref.slug],
}));

export function getCarLocation(slug: string): CarLocation | null {
  return CAR_LOCATIONS.find((location) => location.slug === slug) ?? null;
}

export const CAR_LOCATION_SLUGS = CAR_LOCATIONS.map((location) => location.slug);
