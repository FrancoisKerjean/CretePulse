import { breadcrumbSchema } from "@/lib/schema";
import type { Locale } from "@/lib/types";
import { MapPin, Clock, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

interface LocalizedText {
  en: string;
  fr: string;
  de: string;
  el: string;
}

interface DayPlan {
  day: number;
  title: LocalizedText;
  desc: LocalizedText;
}

interface Itinerary {
  slug: string;
  days: number;
  title: LocalizedText;
  focus: LocalizedText;
  dayPlans: DayPlan[];
}

const ITINERARIES: Itinerary[] = [
  {
    slug: "3-days",
    days: 3,
    title: { en: "3 Days in Crete", fr: "3 Jours en Cr\u00e8te", de: "3 Tage auf Kreta", el: "3 \u039c\u03ad\u03c1\u03b5\u03c2 \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7" },
    focus: { en: "highlights", fr: "incontournables", de: "Highlights", el: "\u03b1\u03be\u03b9\u03bf\u03b8\u03ad\u03b1\u03c4\u03b1" },
    dayPlans: [
      { day: 1, title: { en: "Heraklion & Knossos", fr: "H\u00e9raklion & Knossos", de: "Heraklion & Knossos", el: "\u0397\u03c1\u03ac\u03ba\u03bb\u03b5\u03b9\u03bf & \u039a\u03bd\u03c9\u03c3\u03cc\u03c2" }, desc: { en: "Arrive in Heraklion. Visit the Palace of Knossos in the morning, then explore the Archaeological Museum. Afternoon walk through Lions Square and the Venetian harbor. Evening at a traditional taverna.", fr: "Arriv\u00e9e \u00e0 H\u00e9raklion. Visite du palais de Knossos le matin, puis le mus\u00e9e arch\u00e9ologique. Balade \u00e0 la place des Lions et au port v\u00e9nitien.", de: "Ankunft in Heraklion. Besuch des Palastes von Knossos am Morgen, dann das Arch\u00e4ologische Museum. Nachmittags L\u00f6wenplatz.", el: "\u0386\u03c6\u03b9\u03be\u03b7 \u03c3\u03c4\u03bf \u0397\u03c1\u03ac\u03ba\u03bb\u03b5\u03b9\u03bf. \u0395\u03c0\u03af\u03c3\u03ba\u03b5\u03c8\u03b7 \u03c3\u03c4\u03bf \u03a0\u03b1\u03bb\u03ac\u03c4\u03b9 \u03c4\u03b7\u03c2 \u039a\u03bd\u03c9\u03c3\u03bf\u03cd, \u0391\u03c1\u03c7\u03b1\u03b9\u03bf\u03bb\u03bf\u03b3\u03b9\u03ba\u03cc \u039c\u03bf\u03c5\u03c3\u03b5\u03af\u03bf." } },
      { day: 2, title: { en: "Rethymno & Beach", fr: "R\u00e9thymnon & Plage", de: "Rethymno & Strand", el: "\u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf & \u03a0\u03b1\u03c1\u03b1\u03bb\u03af\u03b1" }, desc: { en: "Drive to Rethymno (1.5h). Explore the old town and Fortezza. Lunch at the Venetian harbor. Afternoon at the long sandy beach. Drive to Chania for the night.", fr: "Route vers R\u00e9thymnon (1h30). Vieille ville et Fortezza. D\u00e9jeuner au port v\u00e9nitien. Apr\u00e8s-midi plage. Route vers La Can\u00e9e.", de: "Fahrt nach Rethymno (1,5h). Altstadt und Fortezza. Mittagessen am venezianischen Hafen. Nachmittags Strand. Weiter nach Chania.", el: "\u039f\u03b4\u03ae\u03b3\u03b7\u03c3\u03b7 \u03c3\u03c4\u03bf \u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf. \u03a0\u03b1\u03bb\u03b9\u03ac \u03c0\u03cc\u03bb\u03b7 \u03ba\u03b1\u03b9 \u03a6\u03bf\u03c1\u03c4\u03ad\u03c4\u03b6\u03b1. \u039c\u03b5\u03c3\u03b7\u03bc\u03b5\u03c1\u03b9\u03b1\u03bd\u03cc \u03c3\u03c4\u03bf \u03bb\u03b9\u03bc\u03ac\u03bd\u03b9. \u0391\u03c0\u03cc\u03b3\u03b5\u03c5\u03bc\u03b1 \u03c3\u03c4\u03b7\u03bd \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b1." } },
      { day: 3, title: { en: "Chania & Elafonisi", fr: "La Can\u00e9e & Elafonisi", de: "Chania & Elafonisi", el: "\u03a7\u03b1\u03bd\u03b9\u03ac & \u0395\u03bb\u03b1\u03c6\u03bf\u03bd\u03ae\u03c3\u03b9" }, desc: { en: "Morning at Elafonisi Beach (1.5h drive). Pink sand, crystal water. Return to Chania for sunset at the Venetian Harbor. Final dinner in the old town.", fr: "Matin \u00e0 Elafonisi (1h30 de route). Sable rose, eau cristalline. Retour \u00e0 La Can\u00e9e pour le coucher de soleil au port v\u00e9nitien.", de: "Morgens Elafonisi Beach (1,5h Fahrt). Rosa Sand. Zur\u00fcck nach Chania f\u00fcr Sonnenuntergang am Hafen.", el: "\u03a0\u03c1\u03c9\u03af \u03c3\u03c4\u03bf \u0395\u03bb\u03b1\u03c6\u03bf\u03bd\u03ae\u03c3\u03b9. \u03a1\u03bf\u03b6 \u03ac\u03bc\u03bc\u03bf\u03c2. \u0395\u03c0\u03b9\u03c3\u03c4\u03c1\u03bf\u03c6\u03ae \u03c3\u03c4\u03b1 \u03a7\u03b1\u03bd\u03b9\u03ac \u03b3\u03b9\u03b1 \u03b7\u03bb\u03b9\u03bf\u03b2\u03b1\u03c3\u03af\u03bb\u03b5\u03bc\u03b1." } },
    ],
  },
  {
    slug: "5-days",
    days: 5,
    title: { en: "5 Days in Crete", fr: "5 Jours en Cr\u00e8te", de: "5 Tage auf Kreta", el: "5 \u039c\u03ad\u03c1\u03b5\u03c2 \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7" },
    focus: { en: "east to west road trip", fr: "road trip est-ouest", de: "Ost-West Roadtrip", el: "road trip \u03b1\u03bd\u03b1\u03c4\u03bf\u03bb\u03ae-\u03b4\u03cd\u03c3\u03b7" },
    dayPlans: [
      { day: 1, title: { en: "Heraklion & Knossos", fr: "H\u00e9raklion & Knossos", de: "Heraklion & Knossos", el: "\u0397\u03c1\u03ac\u03ba\u03bb\u03b5\u03b9\u03bf & \u039a\u03bd\u03c9\u03c3\u03cc\u03c2" }, desc: { en: "Arrive, visit Knossos and the Archaeological Museum. Evening stroll through the city center.", fr: "Arriv\u00e9e, visite de Knossos et du mus\u00e9e. Balade en soir\u00e9e.", de: "Ankunft, Knossos und Museum besuchen. Abendspaziergang.", el: "\u0386\u03c6\u03b9\u03be\u03b7, \u039a\u03bd\u03c9\u03c3\u03cc\u03c2 \u03ba\u03b1\u03b9 \u039c\u03bf\u03c5\u03c3\u03b5\u03af\u03bf. \u0392\u03c1\u03b1\u03b4\u03b9\u03bd\u03ae \u03b2\u03cc\u03bb\u03c4\u03b1." } },
      { day: 2, title: { en: "East Crete: Agios Nikolaos & Spinalonga", fr: "Est : Agios Nikolaos & Spinalonga", de: "Ostkreta: Agios Nikolaos & Spinalonga", el: "\u0391\u03bd\u03b1\u03c4\u03bf\u03bb\u03ae: \u0386\u03b3\u03b9\u03bf\u03c2 \u039d\u03b9\u03ba\u03cc\u03bb\u03b1\u03bf\u03c2 & \u03a3\u03c0\u03b9\u03bd\u03b1\u03bb\u03cc\u03b3\u03ba\u03b1" }, desc: { en: "Drive east to Agios Nikolaos. Lake Voulismeni, then boat to Spinalonga Island. Afternoon at Voulisma Beach.", fr: "Route est vers Agios Nikolaos. Lac Voulismeni, bateau vers Spinalonga. Apr\u00e8s-midi plage Voulisma.", de: "Fahrt nach Agios Nikolaos. Voulismeni-See, Boot nach Spinalonga. Nachmittags Voulisma Beach.", el: "\u0391\u03bd\u03b1\u03c4\u03bf\u03bb\u03b9\u03ba\u03ac \u03c3\u03c4\u03bf\u03bd \u0386\u03b3\u03b9\u03bf \u039d\u03b9\u03ba\u03cc\u03bb\u03b1\u03bf. \u039b\u03af\u03bc\u03bd\u03b7 \u0392\u03bf\u03c5\u03bb\u03b9\u03c3\u03bc\u03ad\u03bd\u03b7, \u03b2\u03ac\u03c1\u03ba\u03b1 \u03c3\u03c4\u03b7 \u03a3\u03c0\u03b9\u03bd\u03b1\u03bb\u03cc\u03b3\u03ba\u03b1." } },
      { day: 3, title: { en: "Rethymno", fr: "R\u00e9thymnon", de: "Rethymno", el: "\u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf" }, desc: { en: "Drive west to Rethymno. Old town, Fortezza, Rimondi Fountain. Beach afternoon. Try raki and Cretan meze.", fr: "Route ouest vers R\u00e9thymnon. Vieille ville, Fortezza. Plage l'apr\u00e8s-midi. Raki et meze cr\u00e9tois.", de: "Fahrt nach Rethymno. Altstadt, Fortezza. Nachmittags Strand. Raki und kretische Meze probieren.", el: "\u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf. \u03a0\u03b1\u03bb\u03b9\u03ac \u03c0\u03cc\u03bb\u03b7, \u03a6\u03bf\u03c1\u03c4\u03ad\u03c4\u03b6\u03b1. \u0391\u03c0\u03cc\u03b3\u03b5\u03c5\u03bc\u03b1 \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b1. \u03a1\u03b1\u03ba\u03af \u03ba\u03b1\u03b9 \u03bc\u03b5\u03b6\u03ad\u03b4\u03b5\u03c2." } },
      { day: 4, title: { en: "Samaria Gorge or Balos", fr: "Gorges de Samaria ou Balos", de: "Samaria-Schlucht oder Balos", el: "\u03a3\u03b1\u03bc\u03b1\u03c1\u03b9\u03ac \u03ae \u039c\u03c0\u03ac\u03bb\u03bf\u03c2" }, desc: { en: "Choose your adventure: hike the Samaria Gorge (full day, 16km) OR visit Balos Lagoon by car/boat. Both are unforgettable.", fr: "Choisissez : randonn\u00e9e Samaria (journ\u00e9e compl\u00e8te, 16km) OU lagon de Balos en voiture/bateau.", de: "W\u00e4hlen Sie: Samaria-Schlucht wandern (ganzer Tag, 16km) ODER Balos-Lagune.", el: "\u0395\u03c0\u03b9\u03bb\u03ad\u03be\u03c4\u03b5: \u03c0\u03b5\u03b6\u03bf\u03c0\u03bf\u03c1\u03af\u03b1 \u03a3\u03b1\u03bc\u03b1\u03c1\u03b9\u03ac (\u03bf\u03bb\u03bf\u03ae\u03bc\u03b5\u03c1\u03b7, 16\u03c7\u03bb\u03bc) \u0389 \u03bb\u03b9\u03bc\u03bd\u03bf\u03b8\u03ac\u03bb\u03b1\u03c3\u03c3\u03b1 \u039c\u03c0\u03ac\u03bb\u03bf\u03c2." } },
      { day: 5, title: { en: "Chania & Departure", fr: "La Can\u00e9e & D\u00e9part", de: "Chania & Abreise", el: "\u03a7\u03b1\u03bd\u03b9\u03ac & \u0391\u03bd\u03b1\u03c7\u03ce\u03c1\u03b7\u03c3\u03b7" }, desc: { en: "Explore Chania old town. Venetian Harbor breakfast, market stroll, last swim. Departure.", fr: "Explorer la vieille ville. Petit-d\u00e9jeuner au port v\u00e9nitien, march\u00e9, derni\u00e8re baignade.", de: "Chania Altstadt erkunden. Fr\u00fchst\u00fcck am Hafen, Markt, letztes Bad.", el: "\u0395\u03be\u03b5\u03c1\u03b5\u03cd\u03bd\u03b7\u03c3\u03b7 \u03c0\u03b1\u03bb\u03b9\u03ac\u03c2 \u03c0\u03cc\u03bb\u03b7\u03c2. \u03a0\u03c1\u03c9\u03b9\u03bd\u03cc \u03c3\u03c4\u03bf \u03bb\u03b9\u03bc\u03ac\u03bd\u03b9, \u03b1\u03b3\u03bf\u03c1\u03ac, \u03c4\u03b5\u03bb\u03b5\u03c5\u03c4\u03b1\u03af\u03bf \u03bc\u03c0\u03ac\u03bd\u03b9\u03bf." } },
    ],
  },
  {
    slug: "7-days",
    days: 7,
    title: { en: "7 Days in Crete", fr: "7 Jours en Cr\u00e8te", de: "7 Tage auf Kreta", el: "7 \u039c\u03ad\u03c1\u03b5\u03c2 \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7" },
    focus: { en: "complete island experience", fr: "exp\u00e9rience compl\u00e8te de l'\u00eele", de: "komplettes Inselerlebnis", el: "\u03c0\u03bb\u03ae\u03c1\u03b7\u03c2 \u03b5\u03bc\u03c0\u03b5\u03b9\u03c1\u03af\u03b1 \u03bd\u03b7\u03c3\u03b9\u03bf\u03cd" },
    dayPlans: [
      { day: 1, title: { en: "Heraklion", fr: "H\u00e9raklion", de: "Heraklion", el: "\u0397\u03c1\u03ac\u03ba\u03bb\u03b5\u03b9\u03bf" }, desc: { en: "Arrive, settle in. Knossos Palace, Archaeological Museum, city center walk. Dinner at the market area.", fr: "Arriv\u00e9e. Knossos, mus\u00e9e arch\u00e9ologique, centre-ville. D\u00eener au march\u00e9.", de: "Ankunft. Knossos, Museum, Stadtzentrum. Abendessen am Markt.", el: "\u0386\u03c6\u03b9\u03be\u03b7. \u039a\u03bd\u03c9\u03c3\u03cc\u03c2, \u039c\u03bf\u03c5\u03c3\u03b5\u03af\u03bf, \u03ba\u03ad\u03bd\u03c4\u03c1\u03bf. \u0394\u03b5\u03af\u03c0\u03bd\u03bf \u03c3\u03c4\u03b7\u03bd \u03b1\u03b3\u03bf\u03c1\u03ac." } },
      { day: 2, title: { en: "East: Agios Nikolaos & Elounda", fr: "Est : Agios Nikolaos & Elounda", de: "Osten: Agios Nikolaos & Elounda", el: "\u0391\u03bd\u03b1\u03c4\u03bf\u03bb\u03b9\u03ba\u03ac: \u0386\u03b3\u03b9\u03bf\u03c2 \u039d\u03b9\u03ba\u03cc\u03bb\u03b1\u03bf\u03c2 & \u0395\u03bb\u03bf\u03cd\u03bd\u03c4\u03b1" }, desc: { en: "Lake Voulismeni, Spinalonga boat trip, Elounda coast. Swim at Voulisma Beach.", fr: "Lac Voulismeni, excursion Spinalonga, c\u00f4te Elounda. Baignade \u00e0 Voulisma.", de: "Voulismeni-See, Spinalonga-Bootstour, Elounda-K\u00fcste. Baden am Voulisma.", el: "\u039b\u03af\u03bc\u03bd\u03b7 \u0392\u03bf\u03c5\u03bb\u03b9\u03c3\u03bc\u03ad\u03bd\u03b7, \u03a3\u03c0\u03b9\u03bd\u03b1\u03bb\u03cc\u03b3\u03ba\u03b1, \u0395\u03bb\u03bf\u03cd\u03bd\u03c4\u03b1. \u039c\u03c0\u03ac\u03bd\u03b9\u03bf \u03c3\u03c4\u03bf \u0392\u03bf\u03c5\u03bb\u03b9\u03c3\u03bc\u03ac." } },
      { day: 3, title: { en: "South Coast: Ierapetra & Chrysi", fr: "C\u00f4te sud : I\u00e9rap\u00e9tra & Chrysi", de: "S\u00fcdk\u00fcste: Ierapetra & Chrysi", el: "\u039d\u03cc\u03c4\u03b9\u03b1: \u0399\u03b5\u03c1\u03ac\u03c0\u03b5\u03c4\u03c1\u03b1 & \u03a7\u03c1\u03c5\u03c3\u03ae" }, desc: { en: "Drive south to Ierapetra. Boat to Chrysi Island - cedar forest, turquoise water, empty beaches.", fr: "Route sud vers I\u00e9rap\u00e9tra. Bateau vers l'\u00eele Chrysi - for\u00eat de c\u00e8dres, eaux turquoise.", de: "Fahrt nach Ierapetra. Boot zur Insel Chrysi - Zedernwald, t\u00fcrkises Wasser.", el: "\u039d\u03cc\u03c4\u03b9\u03b1 \u03c3\u03c4\u03b7\u03bd \u0399\u03b5\u03c1\u03ac\u03c0\u03b5\u03c4\u03c1\u03b1. \u0392\u03ac\u03c1\u03ba\u03b1 \u03c3\u03c4\u03b7 \u03a7\u03c1\u03c5\u03c3\u03ae - \u03ba\u03b5\u03b4\u03c1\u03cc\u03b4\u03b1\u03c3\u03bf\u03c2, \u03c4\u03c5\u03c1\u03ba\u03bf\u03c5\u03ac\u03b6 \u03bd\u03b5\u03c1\u03ac." } },
      { day: 4, title: { en: "Rethymno", fr: "R\u00e9thymnon", de: "Rethymno", el: "\u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf" }, desc: { en: "Drive to Rethymno. Fortezza, old town, Rimondi Fountain. Beach afternoon.", fr: "Route vers R\u00e9thymnon. Fortezza, vieille ville. Plage l'apr\u00e8s-midi.", de: "Fahrt nach Rethymno. Fortezza, Altstadt. Nachmittags Strand.", el: "\u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf. \u03a6\u03bf\u03c1\u03c4\u03ad\u03c4\u03b6\u03b1, \u03c0\u03b1\u03bb\u03b9\u03ac \u03c0\u03cc\u03bb\u03b7. \u0391\u03c0\u03cc\u03b3\u03b5\u03c5\u03bc\u03b1 \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b1." } },
      { day: 5, title: { en: "Samaria Gorge", fr: "Gorges de Samaria", de: "Samaria-Schlucht", el: "\u03a6\u03b1\u03c1\u03ac\u03b3\u03b3\u03b9 \u03a3\u03b1\u03bc\u03b1\u03c1\u03b9\u03ac\u03c2" }, desc: { en: "Full-day hike through Europe's longest gorge (16km). Start at Omalos, end at Agia Roumeli. Ferry back.", fr: "Randonn\u00e9e d'une journ\u00e9e dans les plus longues gorges d'Europe (16km). D\u00e9part Omalos, arriv\u00e9e Agia Roumeli.", de: "Ganztags-Wanderung durch Europas l\u00e4ngste Schlucht (16km). Start Omalos, Ende Agia Roumeli.", el: "\u039f\u03bb\u03bf\u03ae\u03bc\u03b5\u03c1\u03b7 \u03c0\u03b5\u03b6\u03bf\u03c0\u03bf\u03c1\u03af\u03b1 (16\u03c7\u03bb\u03bc). \u0391\u03c0\u03cc \u039f\u03bc\u03b1\u03bb\u03cc\u03c2 \u03c3\u03c4\u03b7\u03bd \u0391\u03b3\u03af\u03b1 \u03a1\u03bf\u03c5\u03bc\u03ad\u03bb\u03b7." } },
      { day: 6, title: { en: "Elafonisi & Chania", fr: "Elafonisi & La Can\u00e9e", de: "Elafonisi & Chania", el: "\u0395\u03bb\u03b1\u03c6\u03bf\u03bd\u03ae\u03c3\u03b9 & \u03a7\u03b1\u03bd\u03b9\u03ac" }, desc: { en: "Morning at Elafonisi pink sand beach. Drive back to Chania. Venetian Harbor sunset. Old town dinner.", fr: "Matin \u00e0 Elafonisi. Retour \u00e0 La Can\u00e9e. Coucher de soleil au port v\u00e9nitien.", de: "Morgens Elafonisi. Zur\u00fcck nach Chania. Sonnenuntergang am Hafen.", el: "\u03a0\u03c1\u03c9\u03af \u03c3\u03c4\u03bf \u0395\u03bb\u03b1\u03c6\u03bf\u03bd\u03ae\u03c3\u03b9. \u03a0\u03af\u03c3\u03c9 \u03c3\u03c4\u03b1 \u03a7\u03b1\u03bd\u03b9\u03ac. \u0397\u03bb\u03b9\u03bf\u03b2\u03b1\u03c3\u03af\u03bb\u03b5\u03bc\u03b1 \u03c3\u03c4\u03bf \u03bb\u03b9\u03bc\u03ac\u03bd\u03b9." } },
      { day: 7, title: { en: "Balos & Departure", fr: "Balos & D\u00e9part", de: "Balos & Abreise", el: "\u039c\u03c0\u03ac\u03bb\u03bf\u03c2 & \u0391\u03bd\u03b1\u03c7\u03ce\u03c1\u03b7\u03c3\u03b7" }, desc: { en: "Early start to Balos Lagoon. One of Greece's most beautiful beaches. Return for departure.", fr: "D\u00e9part t\u00f4t vers le lagon de Balos. L'une des plus belles plages de Gr\u00e8ce. Retour et d\u00e9part.", de: "Fr\u00fcher Start zur Balos-Lagune. Einer der sch\u00f6nsten Str\u00e4nde Griechenlands. R\u00fcckkehr und Abreise.", el: "\u039d\u03c9\u03c1\u03af\u03c2 \u03c3\u03c4\u03bf \u039c\u03c0\u03ac\u03bb\u03bf\u03c2. \u039c\u03b9\u03b1 \u03b1\u03c0\u03cc \u03c4\u03b9\u03c2 \u03c9\u03c1\u03b1\u03b9\u03cc\u03c4\u03b5\u03c1\u03b5\u03c2 \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b5\u03c2. \u0395\u03c0\u03b9\u03c3\u03c4\u03c1\u03bf\u03c6\u03ae \u03ba\u03b1\u03b9 \u03b1\u03bd\u03b1\u03c7\u03ce\u03c1\u03b7\u03c3\u03b7." } },
    ],
  },
  {
    slug: "10-days",
    days: 10,
    title: { en: "10 Days in Crete", fr: "10 Jours en Cr\u00e8te", de: "10 Tage auf Kreta", el: "10 \u039c\u03ad\u03c1\u03b5\u03c2 \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7" },
    focus: { en: "deep exploration", fr: "exploration approfondie", de: "tiefe Erkundung", el: "\u03b2\u03b1\u03b8\u03b9\u03ac \u03b5\u03be\u03b5\u03c1\u03b5\u03cd\u03bd\u03b7\u03c3\u03b7" },
    dayPlans: [
      { day: 1, title: { en: "Heraklion & Knossos", fr: "H\u00e9raklion & Knossos", de: "Heraklion & Knossos", el: "\u0397\u03c1\u03ac\u03ba\u03bb\u03b5\u03b9\u03bf & \u039a\u03bd\u03c9\u03c3\u03cc\u03c2" }, desc: { en: "Arrive, Knossos, Archaeological Museum, city center.", fr: "Arriv\u00e9e, Knossos, mus\u00e9e, centre-ville.", de: "Ankunft, Knossos, Museum, Zentrum.", el: "\u0386\u03c6\u03b9\u03be\u03b7, \u039a\u03bd\u03c9\u03c3\u03cc\u03c2, \u039c\u03bf\u03c5\u03c3\u03b5\u03af\u03bf, \u03ba\u03ad\u03bd\u03c4\u03c1\u03bf." } },
      { day: 2, title: { en: "Lassithi Plateau & Dikteon Cave", fr: "Plateau du Lassithi & Grotte de Psychro", de: "Lassithi-Hochebene & Dikt\u00e4ische H\u00f6hle", el: "\u039f\u03c1\u03bf\u03c0\u03ad\u03b4\u03b9\u03bf \u039b\u03b1\u03c3\u03b9\u03b8\u03af\u03bf\u03c5 & \u0394\u03b9\u03ba\u03c4\u03b1\u03af\u03bf \u0386\u03bd\u03c4\u03c1\u03bf" }, desc: { en: "Drive to the Lassithi Plateau. Visit the Dikteon Cave (birthplace of Zeus). Lunch in a plateau village.", fr: "Route vers le plateau du Lassithi. Grotte de Psychro (lieu de naissance de Zeus). D\u00e9jeuner dans un village.", de: "Fahrt zum Lassithi-Plateau. Dikt\u00e4ische H\u00f6hle (Geburtsort des Zeus). Mittagessen im Dorf.", el: "\u039f\u03c1\u03bf\u03c0\u03ad\u03b4\u03b9\u03bf \u039b\u03b1\u03c3\u03b9\u03b8\u03af\u03bf\u03c5. \u0394\u03b9\u03ba\u03c4\u03b1\u03af\u03bf \u0386\u03bd\u03c4\u03c1\u03bf (\u03c4\u03cc\u03c0\u03bf\u03c2 \u03b3\u03ad\u03bd\u03bd\u03b7\u03c3\u03b7\u03c2 \u0394\u03af\u03b1). \u039c\u03b5\u03c3\u03b7\u03bc\u03b5\u03c1\u03b9\u03b1\u03bd\u03cc \u03c3\u03b5 \u03c7\u03c9\u03c1\u03b9\u03cc." } },
      { day: 3, title: { en: "Agios Nikolaos & Spinalonga", fr: "Agios Nikolaos & Spinalonga", de: "Agios Nikolaos & Spinalonga", el: "\u0386\u03b3\u03b9\u03bf\u03c2 \u039d\u03b9\u03ba\u03cc\u03bb\u03b1\u03bf\u03c2 & \u03a3\u03c0\u03b9\u03bd\u03b1\u03bb\u03cc\u03b3\u03ba\u03b1" }, desc: { en: "Agios Nikolaos, Spinalonga Island, Elounda.", fr: "Agios Nikolaos, \u00eele de Spinalonga, Elounda.", de: "Agios Nikolaos, Insel Spinalonga, Elounda.", el: "\u0386\u03b3\u03b9\u03bf\u03c2 \u039d\u03b9\u03ba\u03cc\u03bb\u03b1\u03bf\u03c2, \u03a3\u03c0\u03b9\u03bd\u03b1\u03bb\u03cc\u03b3\u03ba\u03b1, \u0395\u03bb\u03bf\u03cd\u03bd\u03c4\u03b1." } },
      { day: 4, title: { en: "Sitia & Vai Palm Beach", fr: "Sitia & Palmier de Vai", de: "Sitia & Vai Palmenstrand", el: "\u03a3\u03b7\u03c4\u03b5\u03af\u03b1 & \u0392\u03ac\u03b9" }, desc: { en: "East to Sitia. Toplou Monastery, then Vai palm beach - Europe's largest natural palm forest.", fr: "Est vers Sitia. Monast\u00e8re Toplou, puis plage de palmiers de Vai.", de: "Osten nach Sitia. Kloster Toplou, dann Vai Palmenstrand.", el: "\u0391\u03bd\u03b1\u03c4\u03bf\u03bb\u03b9\u03ba\u03ac \u03c3\u03c4\u03b7 \u03a3\u03b7\u03c4\u03b5\u03af\u03b1. \u039c\u03bf\u03bd\u03ae \u03a4\u03bf\u03c0\u03bb\u03bf\u03cd, \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b1 \u0392\u03ac\u03b9." } },
      { day: 5, title: { en: "South Coast: Ierapetra & Chrysi", fr: "C\u00f4te sud : I\u00e9rap\u00e9tra & Chrysi", de: "S\u00fcdk\u00fcste: Ierapetra & Chrysi", el: "\u039d\u03cc\u03c4\u03b9\u03b1 \u03b1\u03ba\u03c4\u03ae: \u0399\u03b5\u03c1\u03ac\u03c0\u03b5\u03c4\u03c1\u03b1 & \u03a7\u03c1\u03c5\u03c3\u03ae" }, desc: { en: "Ierapetra, boat to Chrysi Island.", fr: "I\u00e9rap\u00e9tra, bateau vers l'\u00eele Chrysi.", de: "Ierapetra, Boot zur Insel Chrysi.", el: "\u0399\u03b5\u03c1\u03ac\u03c0\u03b5\u03c4\u03c1\u03b1, \u03b2\u03ac\u03c1\u03ba\u03b1 \u03c3\u03c4\u03b7 \u03a7\u03c1\u03c5\u03c3\u03ae." } },
      { day: 6, title: { en: "Matala & Phaistos", fr: "Matala & Phaistos", de: "Matala & Phaistos", el: "\u039c\u03ac\u03c4\u03b1\u03bb\u03b1 & \u03a6\u03b1\u03b9\u03c3\u03c4\u03cc\u03c2" }, desc: { en: "Hippie caves of Matala, Phaistos Palace, Red Beach hike.", fr: "Grottes hippies de Matala, palais de Phaistos, randonn\u00e9e Red Beach.", de: "Hippie-H\u00f6hlen Matala, Palast von Phaistos, Wanderung Red Beach.", el: "\u03a3\u03c0\u03b7\u03bb\u03b9\u03ad\u03c2 \u039c\u03ac\u03c4\u03b1\u03bb\u03b1, \u0391\u03bd\u03ac\u03ba\u03c4\u03bf\u03c1\u03bf \u03a6\u03b1\u03b9\u03c3\u03c4\u03bf\u03cd, Red Beach." } },
      { day: 7, title: { en: "Rethymno", fr: "R\u00e9thymnon", de: "Rethymno", el: "\u03a1\u03ad\u03b8\u03c5\u03bc\u03bd\u03bf" }, desc: { en: "Rethymno old town, Fortezza, beach, cooking class.", fr: "Vieille ville, Fortezza, plage, cours de cuisine.", de: "Altstadt, Fortezza, Strand, Kochkurs.", el: "\u03a0\u03b1\u03bb\u03b9\u03ac \u03c0\u03cc\u03bb\u03b7, \u03a6\u03bf\u03c1\u03c4\u03ad\u03c4\u03b6\u03b1, \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b1, \u03bc\u03ac\u03b8\u03b7\u03bc\u03b1 \u03bc\u03b1\u03b3\u03b5\u03b9\u03c1\u03b9\u03ba\u03ae\u03c2." } },
      { day: 8, title: { en: "Preveli & Plakias", fr: "Preveli & Plakias", de: "Preveli & Plakias", el: "\u03a0\u03c1\u03ad\u03b2\u03b5\u03bb\u03b7 & \u03a0\u03bb\u03b1\u03ba\u03b9\u03ac\u03c2" }, desc: { en: "Preveli palm beach (hike down), Plakias beach. South coast vibe.", fr: "Plage palmiers Preveli (descente), plage Plakias. Ambiance c\u00f4te sud.", de: "Preveli Palmenstrand (Abstieg), Plakias Beach. S\u00fcdk\u00fcste-Feeling.", el: "\u03a0\u03b1\u03c1\u03b1\u03bb\u03af\u03b1 \u03a0\u03c1\u03ad\u03b2\u03b5\u03bb\u03b7, \u03a0\u03bb\u03b1\u03ba\u03b9\u03ac\u03c2. \u0391\u03c4\u03bc\u03cc\u03c3\u03c6\u03b1\u03b9\u03c1\u03b1 \u03bd\u03cc\u03c4\u03b9\u03b1\u03c2 \u03b1\u03ba\u03c4\u03ae\u03c2." } },
      { day: 9, title: { en: "Samaria Gorge", fr: "Gorges de Samaria", de: "Samaria-Schlucht", el: "\u03a6\u03b1\u03c1\u03ac\u03b3\u03b3\u03b9 \u03a3\u03b1\u03bc\u03b1\u03c1\u03b9\u03ac\u03c2" }, desc: { en: "Full-day Samaria Gorge hike. 16km, Europe's longest gorge.", fr: "Randonn\u00e9e journ\u00e9e Samaria. 16km, plus longues gorges d'Europe.", de: "Ganztags Samaria-Schlucht. 16km, l\u00e4ngste Schlucht Europas.", el: "\u039f\u03bb\u03bf\u03ae\u03bc\u03b5\u03c1\u03b7 \u03a3\u03b1\u03bc\u03b1\u03c1\u03b9\u03ac. 16\u03c7\u03bb\u03bc, \u03bc\u03b5\u03b3\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03bf \u03c6\u03b1\u03c1\u03ac\u03b3\u03b3\u03b9 \u0395\u03c5\u03c1\u03ce\u03c0\u03b7\u03c2." } },
      { day: 10, title: { en: "Chania, Elafonisi & Departure", fr: "La Can\u00e9e, Elafonisi & D\u00e9part", de: "Chania, Elafonisi & Abreise", el: "\u03a7\u03b1\u03bd\u03b9\u03ac, \u0395\u03bb\u03b1\u03c6\u03bf\u03bd\u03ae\u03c3\u03b9 & \u0391\u03bd\u03b1\u03c7\u03ce\u03c1\u03b7\u03c3\u03b7" }, desc: { en: "Elafonisi morning, Chania old town afternoon, Venetian Harbor sunset.", fr: "Matin Elafonisi, apr\u00e8s-midi vieille ville, coucher de soleil au port.", de: "Morgens Elafonisi, nachmittags Altstadt, Sonnenuntergang am Hafen.", el: "\u03a0\u03c1\u03c9\u03af \u0395\u03bb\u03b1\u03c6\u03bf\u03bd\u03ae\u03c3\u03b9, \u03b1\u03c0\u03cc\u03b3\u03b5\u03c5\u03bc\u03b1 \u03c0\u03b1\u03bb\u03b9\u03ac \u03c0\u03cc\u03bb\u03b7, \u03b7\u03bb\u03b9\u03bf\u03b2\u03b1\u03c3\u03af\u03bb\u03b5\u03bc\u03b1." } },
    ],
  },
];

const LABELS: Record<Locale, {
  itineraries: string;
  allItineraries: string;
  days: string;
  day: string;
  focus: string;
  relatedItineraries: string;
  exploreMore: string;
  beaches: string;
  archaeology: string;
  villages: string;
  crete: string;
  faqTitle: string;
}> = {
  en: {
    itineraries: "Itineraries",
    allItineraries: "All itineraries",
    days: "days",
    day: "Day",
    focus: "Focus",
    relatedItineraries: "Other itineraries",
    exploreMore: "Explore more",
    beaches: "Best beaches",
    archaeology: "Archaeological sites",
    villages: "Traditional villages",
    crete: "Crete",
    faqTitle: "FAQ",
  },
  fr: {
    itineraries: "Itin\u00e9raires",
    allItineraries: "Tous les itin\u00e9raires",
    days: "jours",
    day: "Jour",
    focus: "Focus",
    relatedItineraries: "Autres itin\u00e9raires",
    exploreMore: "Explorer",
    beaches: "Plus belles plages",
    archaeology: "Sites arch\u00e9ologiques",
    villages: "Villages traditionnels",
    crete: "Cr\u00e8te",
    faqTitle: "FAQ",
  },
  de: {
    itineraries: "Reiserouten",
    allItineraries: "Alle Reiserouten",
    days: "Tage",
    day: "Tag",
    focus: "Schwerpunkt",
    relatedItineraries: "Andere Reiserouten",
    exploreMore: "Mehr entdecken",
    beaches: "Sch\u00f6nste Str\u00e4nde",
    archaeology: "Arch\u00e4ologische St\u00e4tten",
    villages: "Traditionelle D\u00f6rfer",
    crete: "Kreta",
    faqTitle: "FAQ",
  },
  el: {
    itineraries: "\u0394\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03b1",
    allItineraries: "\u038c\u03bb\u03b1 \u03c4\u03b1 \u03b4\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03b1",
    days: "\u03bc\u03ad\u03c1\u03b5\u03c2",
    day: "\u0397\u03bc\u03ad\u03c1\u03b1",
    focus: "\u0395\u03c3\u03c4\u03af\u03b1\u03c3\u03b7",
    relatedItineraries: "\u0386\u03bb\u03bb\u03b1 \u03b4\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03b1",
    exploreMore: "\u0395\u03be\u03b5\u03c1\u03b5\u03c5\u03bd\u03ae\u03c3\u03c4\u03b5",
    beaches: "\u039a\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03b5\u03c2 \u03c0\u03b1\u03c1\u03b1\u03bb\u03af\u03b5\u03c2",
    archaeology: "\u0391\u03c1\u03c7\u03b1\u03b9\u03bf\u03bb\u03bf\u03b3\u03b9\u03ba\u03bf\u03af \u03c7\u03ce\u03c1\u03bf\u03b9",
    villages: "\u03a0\u03b1\u03c1\u03b1\u03b4\u03bf\u03c3\u03b9\u03b1\u03ba\u03ac \u03c7\u03c9\u03c1\u03b9\u03ac",
    crete: "\u039a\u03c1\u03ae\u03c4\u03b7",
    faqTitle: "FAQ",
  },
};

function getLocalized(obj: LocalizedText, locale: Locale): string {
  return obj[locale] || obj.en;
}

export function generateStaticParams() {
  return ITINERARIES.map((it) => ({ slug: it.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = (locale || "en") as Locale;
  const itinerary = ITINERARIES.find((it) => it.slug === slug);
  if (!itinerary) return { title: "Itinerary not found" };

  const title = `${getLocalized(itinerary.title, loc)} - ${getLocalized(itinerary.focus, loc)} | Crete Direct`;
  const description =
    loc === "fr"
      ? `Itin\u00e9raire ${itinerary.days} jours en Cr\u00e8te : ${getLocalized(itinerary.focus, loc)}. Programme jour par jour avec les meilleurs sites, plages et villages.`
      : loc === "de"
      ? `${itinerary.days} Tage Kreta Reiseroute: ${getLocalized(itinerary.focus, loc)}. Tag-f\u00fcr-Tag Programm mit den besten Sehensw\u00fcrdigkeiten.`
      : loc === "el"
      ? `\u0394\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03bf ${itinerary.days} \u03b7\u03bc\u03b5\u03c1\u03ce\u03bd \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7: ${getLocalized(itinerary.focus, loc)}. \u0397\u03bc\u03b5\u03c1\u03ae\u03c3\u03b9\u03bf \u03c0\u03c1\u03cc\u03b3\u03c1\u03b1\u03bc\u03bc\u03b1.`
      : `${itinerary.days}-day Crete itinerary: ${getLocalized(itinerary.focus, loc)}. Day-by-day plan with the best sites, beaches and villages.`;
  const url = `${BASE_URL}/${locale}/itineraries/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
  };
}

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const loc = (locale || "en") as Locale;
  const L = LABELS[loc];

  const itinerary = ITINERARIES.find((it) => it.slug === slug);
  if (!itinerary) notFound();

  const title = getLocalized(itinerary.title, loc);
  const focus = getLocalized(itinerary.focus, loc);
  const url = `${BASE_URL}/${locale}/itineraries/${slug}`;

  const breadcrumb = breadcrumbSchema([
    { name: "Crete Direct", url: `${BASE_URL}/${locale}` },
    { name: L.itineraries, url: `${BASE_URL}/${locale}/itineraries` },
    { name: title, url },
  ]);

  // FAQ schema
  const faqItems = [
    {
      q: loc === "fr" ? `Combien de jours faut-il pour visiter la Cr\u00e8te ?` : loc === "de" ? `Wie viele Tage braucht man f\u00fcr Kreta?` : loc === "el" ? `\u03a0\u03cc\u03c3\u03b5\u03c2 \u03bc\u03ad\u03c1\u03b5\u03c2 \u03c7\u03c1\u03b5\u03b9\u03ac\u03b6\u03b5\u03c3\u03c4\u03b5 \u03b3\u03b9\u03b1 \u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7;` : `How many days do you need in Crete?`,
      a: loc === "fr" ? `Un minimum de 5 jours est recommand\u00e9 pour d\u00e9couvrir les incontournables. 7 \u00e0 10 jours permettent une exploration compl\u00e8te de l'\u00eele.` : loc === "de" ? `Mindestens 5 Tage werden empfohlen. 7-10 Tage erm\u00f6glichen eine vollst\u00e4ndige Erkundung der Insel.` : loc === "el" ? `\u03a3\u03c5\u03bd\u03b9\u03c3\u03c4\u03bf\u03cd\u03bd\u03c4\u03b1\u03b9 \u03c4\u03bf\u03c5\u03bb\u03ac\u03c7\u03b9\u03c3\u03c4\u03bf\u03bd 5 \u03bc\u03ad\u03c1\u03b5\u03c2. 7-10 \u03bc\u03ad\u03c1\u03b5\u03c2 \u03b5\u03c0\u03b9\u03c4\u03c1\u03ad\u03c0\u03bf\u03c5\u03bd \u03c0\u03bb\u03ae\u03c1\u03b7 \u03b5\u03be\u03b5\u03c1\u03b5\u03cd\u03bd\u03b7\u03c3\u03b7.` : `A minimum of 5 days is recommended to see the highlights. 7-10 days allow a complete exploration of the island.`,
    },
    {
      q: loc === "fr" ? `Faut-il une voiture pour visiter la Cr\u00e8te en ${itinerary.days} jours ?` : loc === "de" ? `Braucht man ein Auto f\u00fcr ${itinerary.days} Tage auf Kreta?` : loc === "el" ? `\u03a7\u03c1\u03b5\u03b9\u03ac\u03b6\u03b5\u03c3\u03c4\u03b5 \u03b1\u03c5\u03c4\u03bf\u03ba\u03af\u03bd\u03b7\u03c4\u03bf \u03b3\u03b9\u03b1 ${itinerary.days} \u03bc\u03ad\u03c1\u03b5\u03c2 \u03c3\u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7;` : `Do you need a car for ${itinerary.days} days in Crete?`,
      a: loc === "fr" ? `Oui, une voiture de location est fortement recommand\u00e9e pour ce circuit de ${itinerary.days} jours. Les transports en commun ne desservent pas tous les sites.` : loc === "de" ? `Ja, ein Mietwagen wird f\u00fcr diese ${itinerary.days}-Tage-Route dringend empfohlen. \u00d6ffentliche Verkehrsmittel erreichen nicht alle Orte.` : loc === "el" ? `\u039d\u03b1\u03b9, \u03c3\u03c5\u03bd\u03b9\u03c3\u03c4\u03ac\u03c4\u03b1\u03b9 \u03b5\u03bd\u03bf\u03b9\u03ba\u03b9\u03b1\u03b6\u03cc\u03bc\u03b5\u03bd\u03bf \u03b1\u03c5\u03c4\u03bf\u03ba\u03af\u03bd\u03b7\u03c4\u03bf \u03b3\u03b9\u03b1 \u03b1\u03c5\u03c4\u03cc \u03c4\u03bf \u03b4\u03c1\u03bf\u03bc\u03bf\u03bb\u03cc\u03b3\u03b9\u03bf ${itinerary.days} \u03b7\u03bc\u03b5\u03c1\u03ce\u03bd.` : `Yes, a rental car is highly recommended for this ${itinerary.days}-day itinerary. Public transport does not reach all locations.`,
    },
    {
      q: loc === "fr" ? `Quel est le meilleur moment pour visiter la Cr\u00e8te ?` : loc === "de" ? `Wann ist die beste Zeit f\u00fcr Kreta?` : loc === "el" ? `\u03a0\u03bf\u03b9\u03b1 \u03b5\u03af\u03bd\u03b1\u03b9 \u03b7 \u03ba\u03b1\u03bb\u03cd\u03c4\u03b5\u03c1\u03b7 \u03b5\u03c0\u03bf\u03c7\u03ae \u03b3\u03b9\u03b1 \u03c4\u03b7\u03bd \u039a\u03c1\u03ae\u03c4\u03b7;` : `What is the best time to visit Crete?`,
      a: loc === "fr" ? `Mai-juin et septembre-octobre offrent un climat id\u00e9al, moins de touristes et des prix plus bas. Juillet-ao\u00fbt sont les mois les plus chauds et fr\u00e9quent\u00e9s.` : loc === "de" ? `Mai-Juni und September-Oktober bieten ideales Wetter, weniger Touristen und niedrigere Preise. Juli-August sind die hei\u00dfesten und meistbesuchten Monate.` : loc === "el" ? `\u039c\u03ac\u03b9\u03bf\u03c2-\u0399\u03bf\u03cd\u03bd\u03b9\u03bf\u03c2 \u03ba\u03b1\u03b9 \u03a3\u03b5\u03c0\u03c4\u03ad\u03bc\u03b2\u03c1\u03b9\u03bf\u03c2-\u039f\u03ba\u03c4\u03ce\u03b2\u03c1\u03b9\u03bf\u03c2 \u03c0\u03c1\u03bf\u03c3\u03c6\u03ad\u03c1\u03bf\u03c5\u03bd \u03b9\u03b4\u03b1\u03bd\u03b9\u03ba\u03cc \u03ba\u03b1\u03b9\u03c1\u03cc. \u0399\u03bf\u03cd\u03bb\u03b9\u03bf\u03c2-\u0391\u03cd\u03b3\u03bf\u03c5\u03c3\u03c4\u03bf\u03c2 \u03b5\u03af\u03bd\u03b1\u03b9 \u03bf\u03b9 \u03c0\u03b9\u03bf \u03b6\u03b5\u03c3\u03c4\u03bf\u03af \u03bc\u03ae\u03bd\u03b5\u03c2.` : `May-June and September-October offer ideal weather, fewer tourists, and lower prices. July-August are the hottest and busiest months.`,
    },
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

  // TravelAction schema
  const travelSchema = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description: `${itinerary.days}-day Crete itinerary: ${getLocalized(itinerary.focus, "en")}`,
    touristType: "Sightseeing",
    itinerary: {
      "@type": "ItemList",
      numberOfItems: itinerary.dayPlans.length,
      itemListElement: itinerary.dayPlans.map((dp) => ({
        "@type": "ListItem",
        position: dp.day,
        name: getLocalized(dp.title, "en"),
        description: getLocalized(dp.desc, "en"),
      })),
    },
  };

  const otherItineraries = ITINERARIES.filter((it) => it.slug !== slug);

  return (
    <main className="min-h-screen bg-surface">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(travelSchema) }}
      />

      {/* Hero */}
      <div className="relative bg-aegean py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-aegean via-aegean/90 to-aegean-dark" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/90 text-sm mb-6">
            <Calendar className="w-4 h-4" />
            {itinerary.days} {L.days}
          </div>
          <h1
            className="text-3xl md:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {title}
          </h1>
          <p className="text-white/80 text-lg">
            {L.focus}: {focus}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href={`/${locale}/itineraries`}
          className="inline-flex items-center gap-1 text-sm text-aegean hover:underline mb-8"
        >
          <ChevronLeft className="w-4 h-4" /> {L.allItineraries}
        </Link>

        {/* Day-by-day timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

          <div className="space-y-6">
            {itinerary.dayPlans.map((dp) => (
              <div key={dp.day} className="relative flex gap-4 md:gap-6">
                {/* Day number circle */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-aegean text-white flex items-center justify-center font-bold text-sm z-10">
                  {L.day} {dp.day}
                </div>

                {/* Card */}
                <div className="flex-1 rounded-xl bg-white border border-border p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-aegean mb-2" style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}>
                    {getLocalized(dp.title, loc)}
                  </h2>
                  <p className="text-text leading-relaxed text-sm">
                    {getLocalized(dp.desc, loc)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ section */}
        <section className="mt-12 mb-8">
          <h2
            className="text-2xl font-bold text-aegean mb-6"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {L.faqTitle}
          </h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="group rounded-xl bg-white border border-border p-4">
                <summary className="font-medium text-text cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <ChevronRight className="w-4 h-4 text-text-muted transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-sm text-text-muted leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Related itineraries */}
        <section className="mt-8 mb-8">
          <h2
            className="text-2xl font-bold text-aegean mb-4"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {L.relatedItineraries}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {otherItineraries.map((it) => (
              <Link
                key={it.slug}
                href={`/${locale}/itineraries/${it.slug}`}
                className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 text-aegean mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-semibold text-sm">{it.days} {L.days}</span>
                </div>
                <p className="font-medium text-text text-sm">{getLocalized(it.title, loc)}</p>
                <p className="text-xs text-text-muted mt-1">{getLocalized(it.focus, loc)}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Explore more links */}
        <section className="mt-8 pb-8">
          <h2
            className="text-2xl font-bold text-aegean mb-4"
            style={{ fontFamily: "var(--font-heading, 'Playfair Display', Georgia, serif)" }}
          >
            {L.exploreMore}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href={`/${locale}/beaches`}
              className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <MapPin className="w-5 h-5 text-aegean" />
              <span className="font-medium text-sm text-text">{L.beaches}</span>
            </Link>
            <Link
              href={`/${locale}/archaeology`}
              className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <Clock className="w-5 h-5 text-terra" />
              <span className="font-medium text-sm text-text">{L.archaeology}</span>
            </Link>
            <Link
              href={`/${locale}/villages`}
              className="rounded-xl bg-white border border-border p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <MapPin className="w-5 h-5 text-olive" />
              <span className="font-medium text-sm text-text">{L.villages}</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
