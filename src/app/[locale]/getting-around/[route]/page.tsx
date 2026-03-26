import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Bus, Car, Ship, Plane, Clock, Euro, RefreshCw, Lightbulb, ArrowRight } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Route {
  slug: string;
  from: string;
  to: string;
  type: "inter-city" | "airport" | "inter-island" | "international";
  options: {
    mode: string;
    duration: string;
    price: string;
    frequency: string;
    notes: Record<string, string>;
  }[];
  tips: Record<string, string[]>;
}

const ROUTES: Route[] = [
  {
    slug: "heraklion-to-chania",
    from: "Heraklion", to: "Chania", type: "inter-city",
    options: [
      { mode: "bus", duration: "2h 30min", price: "\u20ac15", frequency: "14/day", notes: { en: "KTEL bus from Heraklion bus station. Direct service along the north coast highway.", fr: "Bus KTEL depuis la gare routi\u00e8re d\u2019H\u00e9raklion. Service direct le long de l\u2019autoroute c\u00f4ti\u00e8re.", de: "KTEL Bus vom Busbahnhof Heraklion. Direktverbindung entlang der K\u00fcstenautobahn.", el: "\u039a\u03a4\u0395\u039b \u03b1\u03c0\u03cc \u03c3\u03c4\u03b1\u03b8\u03bc\u03cc \u0397\u03c1\u03b1\u03ba\u03bb\u03b5\u03af\u03bf\u03c5. \u0391\u03c0\u03b5\u03c5\u03b8\u03b5\u03af\u03b1\u03c2 \u03b3\u03c1\u03b1\u03bc\u03bc\u03ae." } },
      { mode: "car", duration: "2h", price: "\u20ac30-50/day rental", frequency: "Anytime", notes: { en: "Scenic drive along the E75/A90 highway. Well-maintained road.", fr: "Route panoramique le long de l\u2019autoroute E75/A90.", de: "Malerische Fahrt entlang der E75/A90.", el: "\u0393\u03c1\u03b1\u03c6\u03b9\u03ba\u03ae \u03b4\u03b9\u03b1\u03b4\u03c1\u03bf\u03bc\u03ae \u03ba\u03b1\u03c4\u03ac \u03bc\u03ae\u03ba\u03bf\u03c2 \u03c4\u03b7\u03c2 \u039595/\u039190." } },
      { mode: "taxi", duration: "2h", price: "\u20ac150-180", frequency: "On demand", notes: { en: "Private transfer. Book in advance for fixed price.", fr: "Transfert priv\u00e9. R\u00e9servez \u00e0 l\u2019avance.", de: "Privattransfer. Im Voraus buchen.", el: "\u0399\u03b4\u03b9\u03c9\u03c4\u03b9\u03ba\u03ae \u03bc\u03b5\u03c4\u03b1\u03c6\u03bf\u03c1\u03ac. \u039a\u03bb\u03b5\u03af\u03c3\u03c4\u03b5 \u03b5\u03ba \u03c4\u03c9\u03bd \u03c0\u03c1\u03bf\u03c4\u03ad\u03c1\u03c9\u03bd." } },
    ],
    tips: { en: ["Book KTEL tickets online at e-ktel.com", "The bus stops in Rethymno (15 min break)", "Car rental is the most flexible option", "Drive time is shorter than the bus"], fr: ["R\u00e9servez les billets KTEL en ligne sur e-ktel.com", "Le bus s\u2019arr\u00eate \u00e0 R\u00e9thymnon (15 min pause)", "La location de voiture est la plus flexible"], de: ["Buchen Sie KTEL-Tickets online auf e-ktel.com", "Der Bus h\u00e4lt in Rethymno (15 Min Pause)", "Mietwagen ist am flexibelsten"], el: ["\u039a\u03bb\u03b5\u03af\u03c3\u03c4\u03b5 \u03b5\u03b9\u03c3\u03b9\u03c4\u03ae\u03c1\u03b9\u03b1 \u039a\u03a4\u0395\u039b online", "\u03a4\u03bf \u03bb\u03b5\u03c9\u03c6\u03bf\u03c1\u03b5\u03af\u03bf \u03c3\u03c4\u03b1\u03bc\u03b1\u03c4\u03ac \u03c3\u03c4\u03bf \u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf", "\u0395\u03bd\u03bf\u03b9\u03ba\u03af\u03b1\u03c3\u03b7 \u03b1\u03c5\u03c4\u03bf\u03ba\u03b9\u03bd\u03ae\u03c4\u03bf\u03c5 \u03c0\u03b9\u03bf \u03b5\u03c5\u03ad\u03bb\u03b9\u03ba\u03c4\u03b7"] },
  },
  {
    slug: "heraklion-to-rethymno",
    from: "Heraklion", to: "Rethymno", type: "inter-city",
    options: [
      { mode: "bus", duration: "1h 30min", price: "\u20ac8", frequency: "16/day", notes: { en: "Frequent KTEL service. The bus also continues to Chania.", fr: "Service KTEL fr\u00e9quent. Le bus continue vers La Can\u00e9e.", de: "H\u00e4ufiger KTEL-Service. Der Bus f\u00e4hrt weiter nach Chania.", el: "\u03a3\u03c5\u03c7\u03bd\u03ac \u03b4\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03b1 \u039a\u03a4\u0395\u039b." } },
      { mode: "car", duration: "1h 15min", price: "\u20ac30-50/day rental", frequency: "Anytime", notes: { en: "Easy drive along the north coast highway.", fr: "Route facile le long de la c\u00f4te nord.", de: "Einfache Fahrt entlang der Nordk\u00fcste.", el: "\u0395\u03cd\u03ba\u03bf\u03bb\u03b7 \u03bf\u03b4\u03ae\u03b3\u03b7\u03c3\u03b7 \u03ba\u03b1\u03c4\u03ac \u03bc\u03ae\u03ba\u03bf\u03c2 \u03c4\u03bf\u03c5 \u03b2\u03cc\u03c1\u03b5\u03b9\u03bf\u03c5 \u03ac\u03be\u03bf\u03bd\u03b1." } },
    ],
    tips: { en: ["One of the easiest routes in Crete", "Bus passes through beautiful coastal scenery"], fr: ["L\u2019un des trajets les plus faciles en Cr\u00e8te"], de: ["Eine der einfachsten Strecken auf Kreta"], el: ["\u039c\u03af\u03b1 \u03b1\u03c0\u03cc \u03c4\u03b9\u03c2 \u03b5\u03c5\u03ba\u03bf\u03bb\u03cc\u03c4\u03b5\u03c1\u03b5\u03c2 \u03b4\u03b9\u03b1\u03b4\u03c1\u03bf\u03bc\u03ad\u03c2 \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7"] },
  },
  {
    slug: "heraklion-to-agios-nikolaos",
    from: "Heraklion", to: "Agios Nikolaos", type: "inter-city",
    options: [
      { mode: "bus", duration: "1h 30min", price: "\u20ac8", frequency: "12/day", notes: { en: "KTEL bus along the north coast to east Crete.", fr: "Bus KTEL le long de la c\u00f4te nord vers l\u2019est.", de: "KTEL Bus entlang der Nordk\u00fcste nach Ostkreta.", el: "\u039a\u03a4\u0395\u039b \u03ba\u03b1\u03c4\u03ac \u03bc\u03ae\u03ba\u03bf\u03c2 \u03c4\u03b7\u03c2 \u03b2\u03cc\u03c1\u03b5\u03b9\u03b1\u03c2 \u03b1\u03ba\u03c4\u03ae\u03c2." } },
      { mode: "car", duration: "1h 15min", price: "\u20ac30-50/day rental", frequency: "Anytime", notes: { en: "Well-maintained highway. Passes Hersonissos and Malia.", fr: "Autoroute bien entretenue. Passe par Hersonissos et Malia.", de: "Gut ausgebaute Autobahn. \u00dcber Hersonissos und Malia.", el: "\u039a\u03b1\u03bb\u03ac \u03c3\u03c5\u03bd\u03c4\u03b7\u03c1\u03b7\u03bc\u03ad\u03bd\u03bf\u03c2 \u03b1\u03c5\u03c4\u03bf\u03ba\u03b9\u03bd\u03b7\u03c4\u03cc\u03b4\u03c1\u03bf\u03bc\u03bf\u03c2." } },
    ],
    tips: { en: ["The road passes through the resort towns of Hersonissos and Malia", "Continue to Elounda (15 min further) or Sitia (1h further)"], fr: ["La route traverse Hersonissos et Malia"], de: ["Die Stra\u00dfe f\u00fchrt durch Hersonissos und Malia"], el: ["\u039f \u03b4\u03c1\u03cc\u03bc\u03bf\u03c2 \u03c0\u03b5\u03c1\u03bd\u03ac \u03b1\u03c0\u03cc \u03a7\u03b5\u03c1\u03c3\u03cc\u03bd\u03b7\u03c3\u03bf \u03ba\u03b1\u03b9 \u039c\u03ac\u03bb\u03b9\u03b1"] },
  },
  {
    slug: "heraklion-airport-to-city",
    from: "Heraklion Airport (HER)", to: "Heraklion City Center", type: "airport",
    options: [
      { mode: "bus", duration: "15 min", price: "\u20ac1.20", frequency: "Every 10 min", notes: { en: "Bus #1 from outside arrivals to Heraklion center (Eleftherias Square).", fr: "Bus n\u00b01 depuis les arriv\u00e9es vers le centre d\u2019H\u00e9raklion.", de: "Bus Nr. 1 vom Flughafen zum Zentrum.", el: "\u039b\u03b5\u03c9\u03c6\u03bf\u03c1\u03b5\u03af\u03bf \u039d\u03bf 1 \u03b1\u03c0\u03cc \u03c4\u03b9\u03c2 \u03b1\u03c6\u03af\u03be\u03b5\u03b9\u03c2 \u03c3\u03c4\u03bf \u03ba\u03ad\u03bd\u03c4\u03c1\u03bf." } },
      { mode: "taxi", duration: "10 min", price: "\u20ac10-15", frequency: "Always available", notes: { en: "Taxi rank outside arrivals. Fixed prices displayed.", fr: "Station de taxi devant les arriv\u00e9es. Prix fixes affich\u00e9s.", de: "Taxistand vor den Ank\u00fcnften. Festpreise.", el: "\u03a0\u03b9\u03ac\u03c4\u03c3\u03b1 \u03c4\u03b1\u03be\u03af \u03ad\u03be\u03c9 \u03b1\u03c0\u03cc \u03c4\u03b9\u03c2 \u03b1\u03c6\u03af\u03be\u03b5\u03b9\u03c2." } },
    ],
    tips: { en: ["The airport is very close to the city center (4 km)", "Bus #1 is the cheapest option", "Taxis have fixed rates to common destinations"], fr: ["L\u2019a\u00e9roport est tr\u00e8s proche du centre (4 km)", "Le bus n\u00b01 est l\u2019option la moins ch\u00e8re"], de: ["Der Flughafen ist sehr nah am Zentrum (4 km)"], el: ["\u03a4\u03bf \u03b1\u03b5\u03c1\u03bf\u03b4\u03c1\u03cc\u03bc\u03b9\u03bf \u03b5\u03af\u03bd\u03b1\u03b9 \u03c0\u03bf\u03bb\u03cd \u03ba\u03bf\u03bd\u03c4\u03ac \u03c3\u03c4\u03bf \u03ba\u03ad\u03bd\u03c4\u03c1\u03bf (4 \u03c7\u03bb\u03bc)"] },
  },
  {
    slug: "chania-airport-to-city",
    from: "Chania Airport (CHQ)", to: "Chania City Center", type: "airport",
    options: [
      { mode: "bus", duration: "25 min", price: "\u20ac2.50", frequency: "Matches flights", notes: { en: "KTEL bus from airport to Chania bus station. Timed with arrivals.", fr: "Bus KTEL de l\u2019a\u00e9roport \u00e0 la gare routi\u00e8re de La Can\u00e9e.", de: "KTEL Bus vom Flughafen zum Busbahnhof Chania.", el: "\u039a\u03a4\u0395\u039b \u03b1\u03c0\u03cc \u03b1\u03b5\u03c1\u03bf\u03b4\u03c1\u03cc\u03bc\u03b9\u03bf \u03c3\u03c4\u03bf \u03c3\u03c4\u03b1\u03b8\u03bc\u03cc \u03a7\u03b1\u03bd\u03af\u03c9\u03bd." } },
      { mode: "taxi", duration: "20 min", price: "\u20ac25-30", frequency: "Always available", notes: { en: "Taxi to old town or Venetian harbor area.", fr: "Taxi vers la vieille ville ou le port v\u00e9nitien.", de: "Taxi zur Altstadt oder zum Venezianischen Hafen.", el: "\u03a4\u03b1\u03be\u03af \u03c3\u03c4\u03b7\u03bd \u03c0\u03b1\u03bb\u03b9\u03ac \u03c0\u03cc\u03bb\u03b7." } },
    ],
    tips: { en: ["Airport is 14 km from the old town", "Pre-book a transfer for peace of mind", "Many car rental offices at the airport"], fr: ["L\u2019a\u00e9roport est \u00e0 14 km de la vieille ville", "Pr\u00e9-r\u00e9servez un transfert"], de: ["Flughafen ist 14 km von der Altstadt"], el: ["\u03a4\u03bf \u03b1\u03b5\u03c1\u03bf\u03b4\u03c1\u03cc\u03bc\u03b9\u03bf \u03b5\u03af\u03bd\u03b1\u03b9 14 \u03c7\u03bb\u03bc \u03b1\u03c0\u03cc \u03c4\u03b7\u03bd \u03c0\u03b1\u03bb\u03b9\u03ac \u03c0\u03cc\u03bb\u03b7"] },
  },
  {
    slug: "athens-to-crete",
    from: "Athens", to: "Crete", type: "international",
    options: [
      { mode: "flight", duration: "50 min", price: "\u20ac40-120", frequency: "20+ daily", notes: { en: "Multiple airlines fly to Heraklion (HER) and Chania (CHQ). Book early for best prices.", fr: "Plusieurs compagnies desservent H\u00e9raklion et La Can\u00e9e. R\u00e9servez t\u00f4t.", de: "Mehrere Airlines fliegen nach Heraklion und Chania. Fr\u00fch buchen.", el: "\u03a0\u03bf\u03bb\u03bb\u03ad\u03c2 \u03b1\u03b5\u03c1\u03bf\u03c0\u03bf\u03c1\u03b9\u03ba\u03ad\u03c2 \u03c0\u03c1\u03bf\u03c2 \u0397\u03c1\u03ac\u03ba\u03bb\u03b5\u03b9\u03bf \u03ba\u03b1\u03b9 \u03a7\u03b1\u03bd\u03b9\u03ac." } },
      { mode: "ferry", duration: "8-9h (overnight)", price: "\u20ac35-80", frequency: "2-3 daily", notes: { en: "Overnight ferries from Piraeus to Heraklion or Chania (Souda). Cabins available. Arrive refreshed in the morning.", fr: "Ferries de nuit de Pir\u00e9e vers H\u00e9raklion ou La Can\u00e9e (Souda). Cabines disponibles.", de: "Nachtf\u00e4hren von Pir\u00e4us nach Heraklion oder Chania. Kabinen verf\u00fcgbar.", el: "\u039d\u03c5\u03c7\u03c4\u03b5\u03c1\u03b9\u03bd\u03ac \u03c0\u03bb\u03bf\u03af\u03b1 \u03b1\u03c0\u03cc \u03a0\u03b5\u03b9\u03c1\u03b1\u03b9\u03ac. \u039a\u03b1\u03bc\u03c0\u03af\u03bd\u03b5\u03c2 \u03b4\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03b5\u03c2." } },
    ],
    tips: { en: ["Flights are cheapest if booked 2-3 months ahead", "Overnight ferry is an experience - take a cabin", "Ryanair, Aegean, Sky Express, and Volotea fly the route", "Ferry companies: Minoan Lines, ANEK, Blue Star"], fr: ["Les vols sont moins chers 2-3 mois \u00e0 l\u2019avance", "Le ferry de nuit est une exp\u00e9rience - prenez une cabine"], de: ["Fl\u00fcge sind am g\u00fcnstigsten 2-3 Monate vorher", "Die Nachtf\u00e4hre ist ein Erlebnis - nehmen Sie eine Kabine"], el: ["\u03a4\u03b1 \u03b1\u03b5\u03c1\u03bf\u03c0\u03bf\u03c1\u03b9\u03ba\u03ac \u03b5\u03af\u03bd\u03b1\u03b9 \u03c6\u03b8\u03b7\u03bd\u03cc\u03c4\u03b5\u03c1\u03b1 2-3 \u03bc\u03ae\u03bd\u03b5\u03c2 \u03c0\u03c1\u03b9\u03bd"] },
  },
  {
    slug: "crete-to-santorini",
    from: "Crete (Heraklion)", to: "Santorini", type: "inter-island",
    options: [
      { mode: "ferry", duration: "2h (high-speed) / 4-5h (regular)", price: "\u20ac40-70", frequency: "2-4 daily in summer", notes: { en: "High-speed ferries from Heraklion port. SeaJets and Minoan Lines.", fr: "Ferries rapides depuis le port d\u2019H\u00e9raklion. SeaJets et Minoan Lines.", de: "Schnellf\u00e4hren vom Hafen Heraklion. SeaJets und Minoan Lines.", el: "\u03a4\u03b1\u03c7\u03cd\u03c0\u03bb\u03bf\u03b1 \u03b1\u03c0\u03cc \u0397\u03c1\u03ac\u03ba\u03bb\u03b5\u03b9\u03bf. SeaJets \u03ba\u03b1\u03b9 Minoan Lines." } },
      { mode: "flight", duration: "25 min", price: "\u20ac60-150", frequency: "1-2 daily summer", notes: { en: "Sky Express operates seasonal flights. Very short but limited availability.", fr: "Sky Express op\u00e8re des vols saisonniers. Tr\u00e8s court mais disponibilit\u00e9 limit\u00e9e.", de: "Sky Express betreibt saisonale Fl\u00fcge. Sehr kurz aber begrenzt.", el: "Sky Express \u03b5\u03c0\u03bf\u03c7\u03b9\u03b1\u03ba\u03ad\u03c2 \u03c0\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2." } },
    ],
    tips: { en: ["Book ferry tickets at ferryhopper.com", "The high-speed ferry can be bumpy in windy conditions", "Summer-only route - very limited in winter", "Consider a day trip or 2-night stay"], fr: ["R\u00e9servez sur ferryhopper.com", "Le ferry rapide peut \u00eatre agit\u00e9 par vent fort", "Route estivale uniquement"], de: ["Tickets auf ferryhopper.com buchen", "Die Schnellf\u00e4hre kann bei Wind unruhig sein"], el: ["\u039a\u03bb\u03b5\u03af\u03c3\u03c4\u03b5 \u03b5\u03b9\u03c3\u03b9\u03c4\u03ae\u03c1\u03b9\u03b1 \u03c3\u03c4\u03bf ferryhopper.com"] },
  },
  {
    slug: "heraklion-to-sitia",
    from: "Heraklion", to: "Sitia", type: "inter-city",
    options: [
      { mode: "bus", duration: "3h 30min", price: "\u20ac16", frequency: "4-5/day", notes: { en: "KTEL bus via Agios Nikolaos. Changes to local bus in Ag. Nikolaos sometimes required.", fr: "Bus KTEL via Agios Nikolaos.", de: "KTEL Bus \u00fcber Agios Nikolaos.", el: "\u039a\u03a4\u0395\u039b \u03bc\u03ad\u03c3\u03c9 \u0391\u03b3\u03af\u03bf\u03c5 \u039d\u03b9\u03ba\u03bf\u03bb\u03ac\u03bf\u03c5." } },
      { mode: "car", duration: "2h 45min", price: "\u20ac30-50/day rental", frequency: "Anytime", notes: { en: "Scenic coastal drive. Road narrows after Agios Nikolaos.", fr: "Route c\u00f4ti\u00e8re panoramique.", de: "Malerische K\u00fcstenfahrt.", el: "\u0393\u03c1\u03b1\u03c6\u03b9\u03ba\u03ae \u03c0\u03b1\u03c1\u03b1\u03bb\u03b9\u03b1\u03ba\u03ae \u03b4\u03b9\u03b1\u03b4\u03c1\u03bf\u03bc\u03ae." } },
    ],
    tips: { en: ["The road east of Agios Nikolaos is winding but beautiful", "Stop in Agios Nikolaos for lunch"], fr: ["La route \u00e0 l\u2019est d\u2019Agios Nikolaos est sinueuse mais belle"], de: ["Die Stra\u00dfe \u00f6stlich von Agios Nikolaos ist kurvig aber sch\u00f6n"], el: ["\u039f \u03b4\u03c1\u03cc\u03bc\u03bf\u03c2 \u03b1\u03bd\u03b1\u03c4\u03bf\u03bb\u03b9\u03ba\u03ac \u03c4\u03bf\u03c5 \u0391\u03b3\u03af\u03bf\u03c5 \u039d\u03b9\u03ba\u03bf\u03bb\u03ac\u03bf\u03c5 \u03b5\u03af\u03bd\u03b1\u03b9 \u03b5\u03bb\u03b9\u03ba\u03bf\u03b5\u03b9\u03b4\u03ae\u03c2"] },
  },
];

/* ------------------------------------------------------------------ */
/*  Related routes mapping                                             */
/* ------------------------------------------------------------------ */

const RELATED: Record<string, string[]> = {
  "heraklion-to-chania": ["heraklion-to-rethymno", "heraklion-airport-to-city", "athens-to-crete"],
  "heraklion-to-rethymno": ["heraklion-to-chania", "heraklion-to-agios-nikolaos", "heraklion-airport-to-city"],
  "heraklion-to-agios-nikolaos": ["heraklion-to-rethymno", "heraklion-to-sitia", "heraklion-airport-to-city"],
  "heraklion-airport-to-city": ["heraklion-to-chania", "heraklion-to-agios-nikolaos", "athens-to-crete"],
  "chania-airport-to-city": ["heraklion-to-chania", "heraklion-to-rethymno", "athens-to-crete"],
  "athens-to-crete": ["heraklion-airport-to-city", "chania-airport-to-city", "crete-to-santorini"],
  "crete-to-santorini": ["athens-to-crete", "heraklion-airport-to-city", "heraklion-to-chania"],
  "heraklion-to-sitia": ["heraklion-to-agios-nikolaos", "heraklion-to-chania", "heraklion-airport-to-city"],
};

/* ------------------------------------------------------------------ */
/*  Labels                                                             */
/* ------------------------------------------------------------------ */

const LABELS: Record<string, Record<string, string>> = {
  en: {
    heroPrefix: "How to get from",
    heroTo: "to",
    transportOptions: "Transport options",
    duration: "Duration",
    price: "Price",
    frequency: "Frequency",
    travelTips: "Travel tips",
    relatedRoutes: "Related routes",
    busSchedules: "View all bus schedules",
    faq: "Frequently asked questions",
    howLong: "How long does it take from {from} to {to}?",
    howMuch: "How much does it cost from {from} to {to}?",
    bestWay: "What is the best way to get from {from} to {to}?",
    back: "Getting around Crete",
  },
  fr: {
    heroPrefix: "Comment aller de",
    heroTo: "\u00e0",
    transportOptions: "Options de transport",
    duration: "Dur\u00e9e",
    price: "Prix",
    frequency: "Fr\u00e9quence",
    travelTips: "Conseils de voyage",
    relatedRoutes: "Itin\u00e9raires similaires",
    busSchedules: "Voir tous les horaires de bus",
    faq: "Questions fr\u00e9quentes",
    howLong: "Combien de temps faut-il de {from} \u00e0 {to} ?",
    howMuch: "Combien co\u00fbte le trajet de {from} \u00e0 {to} ?",
    bestWay: "Quel est le meilleur moyen d\u2019aller de {from} \u00e0 {to} ?",
    back: "Se d\u00e9placer en Cr\u00e8te",
  },
  de: {
    heroPrefix: "So kommen Sie von",
    heroTo: "nach",
    transportOptions: "Transportm\u00f6glichkeiten",
    duration: "Dauer",
    price: "Preis",
    frequency: "H\u00e4ufigkeit",
    travelTips: "Reisetipps",
    relatedRoutes: "Verwandte Strecken",
    busSchedules: "Alle Busfahrpl\u00e4ne ansehen",
    faq: "H\u00e4ufig gestellte Fragen",
    howLong: "Wie lange dauert es von {from} nach {to}?",
    howMuch: "Was kostet die Fahrt von {from} nach {to}?",
    bestWay: "Wie kommt man am besten von {from} nach {to}?",
    back: "Fortbewegung auf Kreta",
  },
  el: {
    heroPrefix: "\u03a0\u03ce\u03c2 \u03bd\u03b1 \u03c0\u03ac\u03c4\u03b5 \u03b1\u03c0\u03cc",
    heroTo: "\u03c0\u03c1\u03bf\u03c2",
    transportOptions: "\u0395\u03c0\u03b9\u03bb\u03bf\u03b3\u03ad\u03c2 \u03bc\u03b5\u03c4\u03b1\u03c6\u03bf\u03c1\u03ac\u03c2",
    duration: "\u0394\u03b9\u03ac\u03c1\u03ba\u03b5\u03b9\u03b1",
    price: "\u03a4\u03b9\u03bc\u03ae",
    frequency: "\u03a3\u03c5\u03c7\u03bd\u03cc\u03c4\u03b7\u03c4\u03b1",
    travelTips: "\u03a3\u03c5\u03bc\u03b2\u03bf\u03c5\u03bb\u03ad\u03c2 \u03c4\u03b1\u03be\u03b9\u03b4\u03b9\u03bf\u03cd",
    relatedRoutes: "\u03a3\u03c7\u03b5\u03c4\u03b9\u03ba\u03ad\u03c2 \u03b4\u03b9\u03b1\u03b4\u03c1\u03bf\u03bc\u03ad\u03c2",
    busSchedules: "\u0394\u03b5\u03af\u03c4\u03b5 \u03cc\u03bb\u03b1 \u03c4\u03b1 \u03b4\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03b1 \u03bb\u03b5\u03c9\u03c6\u03bf\u03c1\u03b5\u03af\u03c9\u03bd",
    faq: "\u03a3\u03c5\u03c7\u03bd\u03ad\u03c2 \u03b5\u03c1\u03c9\u03c4\u03ae\u03c3\u03b5\u03b9\u03c2",
    howLong: "\u03a0\u03cc\u03c3\u03bf \u03b4\u03b9\u03b1\u03c1\u03ba\u03b5\u03af \u03b1\u03c0\u03cc {from} \u03c0\u03c1\u03bf\u03c2 {to};",
    howMuch: "\u03a0\u03cc\u03c3\u03bf \u03ba\u03bf\u03c3\u03c4\u03af\u03b6\u03b5\u03b9 \u03b1\u03c0\u03cc {from} \u03c0\u03c1\u03bf\u03c2 {to};",
    bestWay: "\u03a0\u03bf\u03b9\u03bf\u03c2 \u03b5\u03af\u03bd\u03b1\u03b9 \u03bf \u03ba\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03bf\u03c2 \u03c4\u03c1\u03cc\u03c0\u03bf\u03c2 \u03b1\u03c0\u03cc {from} \u03c0\u03c1\u03bf\u03c2 {to};",
    back: "\u039c\u03b5\u03c4\u03b1\u03ba\u03b9\u03bd\u03ae\u03c3\u03b5\u03b9\u03c2 \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7",
  },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getModeIcon(mode: string) {
  switch (mode) {
    case "bus": return <Bus className="w-6 h-6" />;
    case "car": return <Car className="w-6 h-6" />;
    case "ferry": return <Ship className="w-6 h-6" />;
    case "flight": return <Plane className="w-6 h-6" />;
    case "taxi": return <Car className="w-6 h-6" />;
    default: return <Car className="w-6 h-6" />;
  }
}

function getModeLabel(mode: string): string {
  switch (mode) {
    case "bus": return "Bus";
    case "car": return "Car";
    case "ferry": return "Ferry";
    case "flight": return "Flight";
    case "taxi": return "Taxi";
    default: return mode;
  }
}

function getModeBg(mode: string): string {
  switch (mode) {
    case "bus": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "car": return "bg-blue-50 text-blue-700 border-blue-200";
    case "ferry": return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "flight": return "bg-violet-50 text-violet-700 border-violet-200";
    case "taxi": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function getRoute(slug: string) {
  return ROUTES.find(r => r.slug === slug);
}

function fmtLabel(template: string, from: string, to: string) {
  return template.replace("{from}", from).replace("{to}", to);
}

/* ------------------------------------------------------------------ */
/*  Static params & metadata                                           */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return ROUTES.map(r => ({ route: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; route: string }> }) {
  const { locale, route: slug } = await params;
  const route = getRoute(slug);
  if (!route) return { title: "Not found" };

  const titles: Record<string, string> = {
    en: `How to Get From ${route.from} to ${route.to} - Transport Guide | Crete Direct`,
    fr: `Comment aller de ${route.from} \u00e0 ${route.to} - Guide transport | Crete Direct`,
    de: `Von ${route.from} nach ${route.to} - Transportguide | Crete Direct`,
    el: `\u0391\u03c0\u03cc ${route.from} \u03c0\u03c1\u03bf\u03c2 ${route.to} - \u039f\u03b4\u03b7\u03b3\u03cc\u03c2 \u03bc\u03b5\u03c4\u03b1\u03c6\u03bf\u03c1\u03ac\u03c2 | Crete Direct`,
  };

  const descs: Record<string, string> = {
    en: `Complete guide to getting from ${route.from} to ${route.to}. Compare ${route.options.map(o => o.mode).join(", ")} options with prices, duration, and tips.`,
    fr: `Guide complet pour aller de ${route.from} \u00e0 ${route.to}. Comparez les options ${route.options.map(o => o.mode).join(", ")} avec prix, dur\u00e9es et conseils.`,
    de: `Kompletter Guide von ${route.from} nach ${route.to}. Vergleichen Sie ${route.options.map(o => o.mode).join(", ")} Optionen mit Preisen, Dauer und Tipps.`,
    el: `\u03a0\u03bb\u03ae\u03c1\u03b7\u03c2 \u03bf\u03b4\u03b7\u03b3\u03cc\u03c2 \u03b1\u03c0\u03cc ${route.from} \u03c0\u03c1\u03bf\u03c2 ${route.to}. \u03a3\u03c5\u03b3\u03ba\u03c1\u03af\u03bd\u03b5\u03c4\u03b5 \u03b5\u03c0\u03b9\u03bb\u03bf\u03b3\u03ad\u03c2 ${route.options.map(o => o.mode).join(", ")} \u03bc\u03b5 \u03c4\u03b9\u03bc\u03ad\u03c2 \u03ba\u03b1\u03b9 \u03c3\u03c5\u03bc\u03b2\u03bf\u03c5\u03bb\u03ad\u03c2.`,
  };

  const url = `${BASE_URL}/${locale}/getting-around/${slug}`;

  return {
    title: titles[locale] || titles.en,
    description: descs[locale] || descs.en,
    alternates: { canonical: url },
    openGraph: { title: titles[locale] || titles.en, description: descs[locale] || descs.en, url, type: "website" },
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default async function RoutePage({ params }: { params: Promise<{ locale: string; route: string }> }) {
  const { locale, route: slug } = await params;
  const route = getRoute(slug);
  if (!route) notFound();

  const L = LABELS[locale] || LABELS.en;
  const tips = route.tips[locale] || route.tips.en;
  const related = (RELATED[slug] || []).map(s => ROUTES.find(r => r.slug === s)).filter(Boolean) as Route[];

  // Fastest option for FAQ answers
  const fastest = [...route.options].sort((a, b) => {
    const dA = parseInt(a.duration) || 999;
    const dB = parseInt(b.duration) || 999;
    return dA - dB;
  })[0];
  const cheapest = [...route.options].sort((a, b) => {
    const pA = parseFloat(a.price.replace(/[^\d.]/g, "")) || 999;
    const pB = parseFloat(b.price.replace(/[^\d.]/g, "")) || 999;
    return pA - pB;
  })[0];

  const durations = route.options.map(o => `${getModeLabel(o.mode)}: ${o.duration}`).join(", ");
  const prices = route.options.map(o => `${getModeLabel(o.mode)}: ${o.price}`).join(", ");

  const faqItems = [
    {
      q: fmtLabel(L.howLong, route.from, route.to),
      a: locale === "fr"
        ? `Les dur\u00e9es varient selon le mode de transport : ${durations}. Le plus rapide est le ${getModeLabel(fastest.mode).toLowerCase()} (${fastest.duration}).`
        : locale === "de"
        ? `Die Reisezeit variiert je nach Transportmittel: ${durations}. Am schnellsten ist ${getModeLabel(fastest.mode)} (${fastest.duration}).`
        : locale === "el"
        ? `\u039f\u03b9 \u03c7\u03c1\u03cc\u03bd\u03bf\u03b9 \u03c0\u03bf\u03b9\u03ba\u03af\u03bb\u03bb\u03bf\u03c5\u03bd: ${durations}. \u03a4\u03bf \u03c0\u03b9\u03bf \u03b3\u03c1\u03ae\u03b3\u03bf\u03c1\u03bf \u03b5\u03af\u03bd\u03b1\u03b9 ${getModeLabel(fastest.mode)} (${fastest.duration}).`
        : `Travel times vary by transport mode: ${durations}. The fastest option is ${getModeLabel(fastest.mode).toLowerCase()} at ${fastest.duration}.`,
    },
    {
      q: fmtLabel(L.howMuch, route.from, route.to),
      a: locale === "fr"
        ? `Les tarifs d\u00e9pendent du transport choisi : ${prices}. L\u2019option la plus \u00e9conomique est le ${getModeLabel(cheapest.mode).toLowerCase()} \u00e0 ${cheapest.price}.`
        : locale === "de"
        ? `Die Kosten h\u00e4ngen vom Transportmittel ab: ${prices}. Am g\u00fcnstigsten ist ${getModeLabel(cheapest.mode)} mit ${cheapest.price}.`
        : locale === "el"
        ? `\u039f\u03b9 \u03c4\u03b9\u03bc\u03ad\u03c2 \u03b5\u03be\u03b1\u03c1\u03c4\u03ce\u03bd\u03c4\u03b1\u03b9 \u03b1\u03c0\u03cc \u03c4\u03bf \u03bc\u03ad\u03c3\u03bf: ${prices}. \u03a4\u03bf \u03c0\u03b9\u03bf \u03bf\u03b9\u03ba\u03bf\u03bd\u03bf\u03bc\u03b9\u03ba\u03cc \u03b5\u03af\u03bd\u03b1\u03b9 ${getModeLabel(cheapest.mode)} \u03bc\u03b5 ${cheapest.price}.`
        : `Prices depend on transport mode: ${prices}. The most affordable option is ${getModeLabel(cheapest.mode).toLowerCase()} at ${cheapest.price}.`,
    },
    {
      q: fmtLabel(L.bestWay, route.from, route.to),
      a: locale === "fr"
        ? `Cela d\u00e9pend de vos priorit\u00e9s. Le ${getModeLabel(fastest.mode).toLowerCase()} est le plus rapide (${fastest.duration}), tandis que le ${getModeLabel(cheapest.mode).toLowerCase()} est le plus \u00e9conomique (${cheapest.price}). ${route.options.some(o => o.mode === "car") ? "La voiture offre le plus de flexibilit\u00e9." : ""}`
        : locale === "de"
        ? `Das h\u00e4ngt von Ihren Priorit\u00e4ten ab. ${getModeLabel(fastest.mode)} ist am schnellsten (${fastest.duration}), w\u00e4hrend ${getModeLabel(cheapest.mode)} am g\u00fcnstigsten ist (${cheapest.price}). ${route.options.some(o => o.mode === "car") ? "Ein Mietwagen bietet die meiste Flexibilit\u00e4t." : ""}`
        : locale === "el"
        ? `\u0395\u03be\u03b1\u03c1\u03c4\u03ac\u03c4\u03b1\u03b9 \u03b1\u03c0\u03cc \u03c4\u03b9\u03c2 \u03c0\u03c1\u03bf\u03c4\u03b5\u03c1\u03b1\u03b9\u03cc\u03c4\u03b7\u03c4\u03ad\u03c2 \u03c3\u03b1\u03c2. ${getModeLabel(fastest.mode)} \u03b5\u03af\u03bd\u03b1\u03b9 \u03c0\u03b9\u03bf \u03b3\u03c1\u03ae\u03b3\u03bf\u03c1\u03bf (${fastest.duration}), \u03b5\u03bd\u03ce ${getModeLabel(cheapest.mode)} \u03b5\u03af\u03bd\u03b1\u03b9 \u03c0\u03b9\u03bf \u03bf\u03b9\u03ba\u03bf\u03bd\u03bf\u03bc\u03b9\u03ba\u03cc (${cheapest.price}).`
        : `It depends on your priorities. ${getModeLabel(fastest.mode)} is the fastest (${fastest.duration}), while ${getModeLabel(cheapest.mode).toLowerCase()} is the most affordable (${cheapest.price}). ${route.options.some(o => o.mode === "car") ? "A rental car offers the most flexibility." : ""}`,
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
          <Link href={`/${locale}/buses`} className="inline-flex items-center gap-1 text-white/50 text-sm hover:text-white/80 mb-4">
            <ChevronLeft className="w-4 h-4" /> {L.back}
          </Link>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
            {route.from} <ArrowRight className="inline w-8 h-8 md:w-10 md:h-10 mx-2 opacity-60" /> {route.to}
          </h1>
          <p className="text-white/70 text-lg mt-4 max-w-2xl">
            {L.heroPrefix} {route.from} {L.heroTo} {route.to}
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">

        {/* Transport options */}
        <section>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">{L.transportOptions}</h2>
          <div className="grid gap-4">
            {route.options.map((opt, i) => (
              <div key={i} className={`rounded-xl border p-5 ${getModeBg(opt.mode)}`}>
                <div className="flex items-center gap-3 mb-4">
                  {getModeIcon(opt.mode)}
                  <h3 className="text-lg font-bold">{getModeLabel(opt.mode)}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 opacity-60" />
                    <div>
                      <p className="text-xs opacity-60">{L.duration}</p>
                      <p className="font-semibold text-sm">{opt.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="w-4 h-4 opacity-60" />
                    <div>
                      <p className="text-xs opacity-60">{L.price}</p>
                      <p className="font-semibold text-sm">{opt.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 opacity-60" />
                    <div>
                      <p className="text-xs opacity-60">{L.frequency}</p>
                      <p className="font-semibold text-sm">{opt.frequency}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed opacity-80">
                  {opt.notes[locale] || opt.notes.en}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        {tips.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">{L.travelTips}</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section>
          <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">{L.faq}</h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group bg-white border border-border rounded-xl overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer font-semibold text-text hover:bg-gray-50 transition-colors">
                  {faq.q}
                </summary>
                <div className="px-5 pb-4 text-sm text-text-muted leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Related routes */}
        {related.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4">{L.relatedRoutes}</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {related.map(r => (
                <Link
                  key={r.slug}
                  href={`/${locale}/getting-around/${r.slug}`}
                  className="flex items-center gap-2 px-4 py-3 bg-white border border-border rounded-xl hover:border-aegean hover:shadow-sm transition-all text-sm font-medium text-text"
                >
                  <ArrowRight className="w-4 h-4 text-aegean flex-shrink-0" />
                  {r.from} → {r.to}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Link to buses page */}
        <div className="text-center pt-4">
          <Link
            href={`/${locale}/buses`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-aegean text-white rounded-xl font-semibold hover:bg-aegean/90 transition-colors"
          >
            <Bus className="w-5 h-5" />
            {L.busSchedules}
          </Link>
        </div>
      </div>
    </main>
  );
}
