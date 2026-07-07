// SEO location pages for /car-rental/[location].
// Each entry maps to an existing pickup slug from CAR_ZONES, so the wizard can
// start on the date step while keeping a clean canonical URL.

export type CarLocLocale = "en" | "fr" | "de";
export const CAR_LOC_LOCALES: CarLocLocale[] = ["en", "fr", "de"];

export interface CarLocationContent {
  h1: string;
  intro: string;
  deliveryTitle: string;
  delivery: string;
  tips: Array<{ h: string; p: string }>;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
}

export interface CarLocation {
  slug: string;
  pickup: string;
  kind: "airport" | "port";
  code?: string;
  hub: Record<CarLocLocale, string>;
  meta: Record<CarLocLocale, { title: string; desc: string }>;
  content: Record<CarLocLocale, CarLocationContent>;
}

export const CAR_LOCATIONS: CarLocation[] = [
  {
    slug: "chania-airport",
    pickup: "chania-airport",
    kind: "airport",
    code: "CHQ",
    hub: { en: "Chania Airport (CHQ)", fr: "Aéroport de Chania (CHQ)", de: "Flughafen Chania (CHQ)" },
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
    },
    content: {
      en: {
        h1: "Car rental at Chania Airport (CHQ)",
        intro: "Chania Airport is the easiest pick-up point for west Crete: Chania town, Kissamos, Falassarna, Balos and Elafonisi. The airport is on the Akrotiri peninsula, about 14 km from the old town.",
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
        intro: "L'aéroport de Chania est le point de prise en charge le plus simple pour l'ouest de la Crète : Chania, Kissamos, Falassarna, Balos et Elafonisi. Il se trouve sur la presqu'île d'Akrotiri, à environ 14 km de la vieille ville.",
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
        intro: "Der Flughafen Chania ist der einfachste Abholpunkt für Westkreta: Chania, Kissamos, Falassarna, Balos und Elafonisi. Er liegt auf der Halbinsel Akrotiri, etwa 14 km von der Altstadt entfernt.",
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
    },
  },
  {
    slug: "heraklion-airport",
    pickup: "heraklion",
    kind: "airport",
    code: "HER",
    hub: { en: "Heraklion Airport (HER)", fr: "Aéroport d'Héraklion (HER)", de: "Flughafen Heraklion (HER)" },
    meta: {
      en: {
        title: "Car Rental Heraklion Airport (HER) - local agency, no prepayment",
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
        intro: "L'aéroport d'Héraklion est la principale arrivée en Crète et une base pratique pour Knossos, la côte nord et le Lassithi. Il se trouve à environ 5 km à l'est du centre-ville.",
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
    },
  },
  {
    slug: "souda-port",
    pickup: "chania",
    kind: "port",
    hub: { en: "Souda Port (Chania)", fr: "Port de Souda (Chania)", de: "Hafen Souda (Chania)" },
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
        intro: "Souda est le port ferry de Chania, à environ 7 km de la ville. Une voiture au port permet de commencer l'ouest de la Crète dès l'arrivée du ferry de nuit depuis Le Pirée.",
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
    },
  },
  {
    slug: "heraklion-port",
    pickup: "heraklion",
    kind: "port",
    hub: { en: "Heraklion Port", fr: "Port d'Héraklion", de: "Hafen Heraklion" },
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
    },
  },
];

export function getCarLocation(slug: string): CarLocation | null {
  return CAR_LOCATIONS.find((location) => location.slug === slug) ?? null;
}

export const CAR_LOCATION_SLUGS = CAR_LOCATIONS.map((location) => location.slug);
