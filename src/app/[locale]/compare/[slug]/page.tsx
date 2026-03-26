import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, ArrowRight, ChevronLeft, Scale } from "lucide-react";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

/* ------------------------------------------------------------------ */
/*  Static comparison definitions                                      */
/* ------------------------------------------------------------------ */

const COMPARISONS = [
  // City vs City (within Crete)
  { slug: "chania-vs-heraklion", a: "Chania", b: "Heraklion", type: "city" },
  { slug: "chania-vs-rethymno", a: "Chania", b: "Rethymno", type: "city" },
  { slug: "heraklion-vs-rethymno", a: "Heraklion", b: "Rethymno", type: "city" },
  { slug: "agios-nikolaos-vs-elounda", a: "Agios Nikolaos", b: "Elounda", type: "city" },
  { slug: "malia-vs-hersonissos", a: "Malia", b: "Hersonissos", type: "city" },
  { slug: "sitia-vs-ierapetra", a: "Sitia", b: "Ierapetra", type: "city" },
  { slug: "chania-vs-agios-nikolaos", a: "Chania", b: "Agios Nikolaos", type: "city" },
  // Island vs Island
  { slug: "crete-vs-santorini", a: "Crete", b: "Santorini", type: "island" },
  { slug: "crete-vs-rhodes", a: "Crete", b: "Rhodes", type: "island" },
  { slug: "crete-vs-corfu", a: "Crete", b: "Corfu", type: "island" },
  { slug: "crete-vs-mykonos", a: "Crete", b: "Mykonos", type: "island" },
  { slug: "crete-vs-cyprus", a: "Crete", b: "Cyprus", type: "island" },
  // Beach vs Beach
  { slug: "elafonisi-vs-balos", a: "Elafonisi", b: "Balos", type: "beach" },
  { slug: "elafonisi-vs-vai", a: "Elafonisi", b: "Vai", type: "beach" },
  { slug: "balos-vs-preveli", a: "Balos", b: "Preveli", type: "beach" },
] as const;

type ComparisonSlug = (typeof COMPARISONS)[number]["slug"];

/* ------------------------------------------------------------------ */
/*  Comparison data                                                    */
/* ------------------------------------------------------------------ */

interface CategoryRow {
  label: Record<string, string>;
  a: Record<string, string>;
  b: Record<string, string>;
  winner?: "a" | "b" | "tie";
}

interface ComparisonData {
  categories: CategoryRow[];
  verdictA: Record<string, string>;
  verdictB: Record<string, string>;
}

const COMPARISON_DATA: Record<string, ComparisonData> = {
  /* ===== CITY vs CITY ===== */

  "chania-vs-heraklion": {
    categories: [
      { label: { en: "Vibe", fr: "Ambiance", de: "Atmosphare", el: "Ατμόσφαιρα" }, a: { en: "Romantic, Venetian charm", fr: "Romantique, charme venitien", de: "Romantisch, venezianischer Charme", el: "Ρομαντική, βενετσιάνικη γοητεία" }, b: { en: "Urban, bustling capital", fr: "Urbain, capitale animee", de: "Urban, geschaftige Hauptstadt", el: "Αστική, πολυσύχναστη πρωτεύουσα" }, winner: "a" },
      { label: { en: "Beaches nearby", fr: "Plages proches", de: "Strande in der Nahe", el: "Κοντινές παραλίες" }, a: { en: "Elafonisi, Balos, Falassarna", fr: "Elafonisi, Balos, Falassarna", de: "Elafonisi, Balos, Falassarna", el: "Ελαφονήσι, Μπάλος, Φαλάσαρνα" }, b: { en: "Ammoudara, Agia Pelagia, Matala", fr: "Ammoudara, Agia Pelagia, Matala", de: "Ammoudara, Agia Pelagia, Matala", el: "Αμμουδάρα, Αγία Πελαγία, Μάταλα" }, winner: "a" },
      { label: { en: "Food scene", fr: "Gastronomie", de: "Gastronomie", el: "Γαστρονομία" }, a: { en: "Creative Cretan cuisine, harbor tavernas", fr: "Cuisine cretoise creative, tavernes du port", de: "Kreative kretische Kuche, Hafentavernen", el: "Δημιουργική κρητική κουζίνα" }, b: { en: "Traditional, street food, market", fr: "Traditionnelle, street food, marche", de: "Traditionell, Street Food, Markt", el: "Παραδοσιακή, street food, αγορά" }, winner: "tie" },
      { label: { en: "History", fr: "Histoire", de: "Geschichte", el: "Ιστορία" }, a: { en: "Venetian/Ottoman old town", fr: "Vieille ville venitienne/ottomane", de: "Venezianische/Osmanische Altstadt", el: "Βενετσιάνικη/Οθωμανική παλιά πόλη" }, b: { en: "Knossos Palace, Archaeological Museum", fr: "Palais de Knossos, Musee archeologique", de: "Palast von Knossos, Archaologisches Museum", el: "Ανάκτορο Κνωσού, Αρχαιολογικό Μουσείο" }, winner: "b" },
      { label: { en: "Nightlife", fr: "Vie nocturne", de: "Nachtleben", el: "Νυχτερινή ζωή" }, a: { en: "Relaxed bars, cocktails by the harbor", fr: "Bars detendus, cocktails au port", de: "Entspannte Bars, Cocktails am Hafen", el: "Χαλαρά μπαρ, κοκτέιλ στο λιμάνι" }, b: { en: "More options, clubs, live music", fr: "Plus d'options, clubs, musique live", de: "Mehr Auswahl, Clubs, Live-Musik", el: "Περισσότερες επιλογές, clubs" }, winner: "b" },
      { label: { en: "Accessibility", fr: "Accessibilite", de: "Erreichbarkeit", el: "Προσβασιμότητα" }, a: { en: "Own airport (CHQ), ferry port", fr: "Aeroport propre (CHQ), port ferry", de: "Eigener Flughafen (CHQ), Fahrhafen", el: "Δικό του αεροδρόμιο (CHQ)" }, b: { en: "Main airport (HER), central hub", fr: "Aeroport principal (HER), hub central", de: "Hauptflughafen (HER), zentraler Knotenpunkt", el: "Κύριο αεροδρόμιο (HER)" }, winner: "b" },
      { label: { en: "Price level", fr: "Niveau de prix", de: "Preisniveau", el: "Επίπεδο τιμών" }, a: { en: "Mid-range, tourist-oriented", fr: "Moyen de gamme, touristique", de: "Mittlere Preisklasse", el: "Μεσαίο, τουριστικό" }, b: { en: "Slightly cheaper, more local", fr: "Legerement moins cher, plus local", de: "Etwas gunstiger, mehr lokal", el: "Ελαφρώς φθηνότερο" }, winner: "b" },
      { label: { en: "Best for", fr: "Ideal pour", de: "Am besten fur", el: "Ιδανικό για" }, a: { en: "Couples, photographers, foodies", fr: "Couples, photographes, gourmets", de: "Paare, Fotografen, Feinschmecker", el: "Ζευγάρια, φωτογράφους, γκουρμέ" }, b: { en: "History buffs, families, nightlife", fr: "Passionnes d'histoire, familles, vie nocturne", de: "Geschichtsfans, Familien, Nachtleben", el: "Λάτρεις ιστορίας, οικογένειες" } },
    ],
    verdictA: { en: "Choose Chania for romantic charm, stunning beaches, and a more relaxed pace.", fr: "Choisissez La Canee pour son charme romantique et ses plages spectaculaires.", de: "Wahlen Sie Chania fur romantischen Charme und atemberaubende Strande.", el: "Επιλέξτε Χανιά για ρομαντική γοητεία και εκπληκτικές παραλίες." },
    verdictB: { en: "Choose Heraklion for world-class archaeology, urban energy, and central location.", fr: "Choisissez Heraklion pour l'archeologie, l'energie urbaine et sa position centrale.", de: "Wahlen Sie Heraklion fur Weltklasse-Archaologie und zentrale Lage.", el: "Επιλέξτε Ηράκλειο για αρχαιολογία παγκόσμιας κλάσης." },
  },

  "chania-vs-rethymno": {
    categories: [
      { label: { en: "Vibe", fr: "Ambiance" }, a: { en: "Cosmopolitan, Venetian grandeur", fr: "Cosmopolite, grandeur venitienne" }, b: { en: "Bohemian, laid-back university town", fr: "Boheme, ville universitaire decontractee" }, winner: "tie" },
      { label: { en: "Beaches nearby", fr: "Plages proches" }, a: { en: "Elafonisi, Balos, Falassarna (1-2h drive)", fr: "Elafonisi, Balos, Falassarna (1-2h)" }, b: { en: "Preveli, Plakias, Bali (30-60 min)", fr: "Preveli, Plakias, Bali (30-60 min)" }, winner: "a" },
      { label: { en: "Food scene", fr: "Gastronomie" }, a: { en: "Upscale harbor dining, creative cuisine", fr: "Restaurants haut de gamme au port" }, b: { en: "Cozy tavernas, local flavors, cheaper", fr: "Tavernes cosy, saveurs locales, moins cher" }, winner: "tie" },
      { label: { en: "History", fr: "Histoire" }, a: { en: "Venetian lighthouse, Maritime Museum, mosque", fr: "Phare venitien, musee maritime, mosquee" }, b: { en: "Fortezza fortress, old town, Rimondi fountain", fr: "Forteresse Fortezza, vieille ville, fontaine Rimondi" }, winner: "tie" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Trendy bars, harbor cocktails", fr: "Bars tendance, cocktails au port" }, b: { en: "Student bars, live music, taverna culture", fr: "Bars etudiants, musique live" }, winner: "tie" },
      { label: { en: "Accessibility", fr: "Accessibilite" }, a: { en: "Own airport, more flights", fr: "Aeroport propre, plus de vols" }, b: { en: "Between two airports (CHQ & HER)", fr: "Entre deux aeroports (CHQ et HER)" }, winner: "a" },
      { label: { en: "Price level", fr: "Niveau de prix" }, a: { en: "Higher, more touristy", fr: "Plus eleve, plus touristique" }, b: { en: "More affordable, good value", fr: "Plus abordable, bon rapport qualite-prix" }, winner: "b" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "First-time visitors, couples, luxury", fr: "Premiers visiteurs, couples, luxe" }, b: { en: "Budget travelers, repeat visitors, families", fr: "Voyageurs budget, habitues, familles" } },
    ],
    verdictA: { en: "Choose Chania for the iconic Venetian harbor, world-famous beaches, and a polished tourist experience.", fr: "Choisissez La Canee pour le port venitien iconique et les plages mondialement connues." },
    verdictB: { en: "Choose Rethymno for a more authentic, affordable, and relaxed Cretan experience with its own charm.", fr: "Choisissez Rethymno pour une experience cretoise plus authentique, abordable et detendue." },
  },

  "heraklion-vs-rethymno": {
    categories: [
      { label: { en: "Vibe", fr: "Ambiance" }, a: { en: "Busy capital, urban energy", fr: "Capitale animee, energie urbaine" }, b: { en: "Relaxed, bohemian, walkable", fr: "Detendu, boheme, a pied" }, winner: "b" },
      { label: { en: "Beaches nearby", fr: "Plages proches" }, a: { en: "Ammoudara, Agia Pelagia, Matala", fr: "Ammoudara, Agia Pelagia, Matala" }, b: { en: "Preveli, Plakias, Bali, town beach", fr: "Preveli, Plakias, Bali, plage en ville" }, winner: "b" },
      { label: { en: "Food scene", fr: "Gastronomie" }, a: { en: "Central market, diverse restaurants", fr: "Marche central, restaurants varies" }, b: { en: "Old town tavernas, harbor dining", fr: "Tavernes de la vieille ville" }, winner: "tie" },
      { label: { en: "History", fr: "Histoire" }, a: { en: "Knossos, world-class museum", fr: "Knossos, musee de classe mondiale" }, b: { en: "Fortezza, Venetian-Ottoman old town", fr: "Fortezza, vieille ville veneto-ottomane" }, winner: "a" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Clubs, bars, live music venues", fr: "Clubs, bars, salles de concert" }, b: { en: "Cozy bars, student scene", fr: "Bars cosy, ambiance etudiante" }, winner: "a" },
      { label: { en: "Accessibility", fr: "Accessibilite" }, a: { en: "Main international airport", fr: "Aeroport international principal" }, b: { en: "1h from Heraklion airport", fr: "1h de l'aeroport d'Heraklion" }, winner: "a" },
      { label: { en: "Price level", fr: "Niveau de prix" }, a: { en: "Mid-range, varies by area", fr: "Moyen, varie selon le quartier" }, b: { en: "Affordable, great value", fr: "Abordable, excellent rapport qualite-prix" }, winner: "b" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Archaeology, transit hub, city life", fr: "Archeologie, hub de transit, vie urbaine" }, b: { en: "Relaxation, families, budget travel", fr: "Detente, familles, petit budget" } },
    ],
    verdictA: { en: "Choose Heraklion for Knossos, the archaeological museum, and easy access to all of Crete.", fr: "Choisissez Heraklion pour Knossos, le musee archeologique et un acces facile a toute la Crete." },
    verdictB: { en: "Choose Rethymno for charm, a walkable old town, better beaches nearby, and a more relaxed holiday.", fr: "Choisissez Rethymno pour le charme, la vieille ville pietonne et de meilleures plages a proximite." },
  },

  "agios-nikolaos-vs-elounda": {
    categories: [
      { label: { en: "Vibe", fr: "Ambiance" }, a: { en: "Lively lakeside town, local character", fr: "Ville animee au bord du lac" }, b: { en: "Upscale resort village, quiet luxury", fr: "Village de villegiature haut de gamme" }, winner: "tie" },
      { label: { en: "Beaches nearby", fr: "Plages proches" }, a: { en: "Almyros, Ammoudara, Voulisma", fr: "Almyros, Ammoudara, Voulisma" }, b: { en: "Kolokytha, Plaka, small coves", fr: "Kolokytha, Plaka, petites criques" }, winner: "a" },
      { label: { en: "Food scene", fr: "Gastronomie" }, a: { en: "Waterfront tavernas, diverse options", fr: "Tavernes en bord de mer, options variees" }, b: { en: "High-end hotel restaurants, fewer options", fr: "Restaurants d'hotel haut de gamme" }, winner: "a" },
      { label: { en: "History", fr: "Histoire" }, a: { en: "Lake Voulismeni, Archaeological Museum", fr: "Lac Voulismeni, musee archeologique" }, b: { en: "Sunken city of Olous, Spinalonga boat trips", fr: "Cite engloutie d'Olous, excursions Spinalonga" }, winner: "b" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Bars around the lake, local scene", fr: "Bars autour du lac, ambiance locale" }, b: { en: "Hotel bars, very quiet", fr: "Bars d'hotel, tres calme" }, winner: "a" },
      { label: { en: "Accessibility", fr: "Accessibilite" }, a: { en: "Bus connections, 1h from HER airport", fr: "Bus, 1h de l'aeroport HER" }, b: { en: "10 min from Agios Nikolaos", fr: "10 min d'Agios Nikolaos" }, winner: "a" },
      { label: { en: "Price level", fr: "Niveau de prix" }, a: { en: "Mid-range, good value", fr: "Moyen de gamme, bon rapport qualite-prix" }, b: { en: "Premium to luxury pricing", fr: "Prix premium a luxe" }, winner: "a" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Independent travelers, families, budget", fr: "Voyageurs independants, familles" }, b: { en: "Luxury holidays, honeymooners, relaxation", fr: "Vacances de luxe, lune de miel" } },
    ],
    verdictA: { en: "Choose Agios Nikolaos for a lively lakeside atmosphere, diverse dining, and better value.", fr: "Choisissez Agios Nikolaos pour l'ambiance animee au bord du lac et le meilleur rapport qualite-prix." },
    verdictB: { en: "Choose Elounda for luxury hotels, Spinalonga excursions, and a peaceful upscale retreat.", fr: "Choisissez Elounda pour les hotels de luxe, les excursions a Spinalonga et une retraite paisible." },
  },

  "malia-vs-hersonissos": {
    categories: [
      { label: { en: "Vibe", fr: "Ambiance" }, a: { en: "Party town, young crowd", fr: "Ville festive, public jeune" }, b: { en: "Family-friendly resort, water parks", fr: "Station familiale, parcs aquatiques" }, winner: "tie" },
      { label: { en: "Beaches nearby", fr: "Plages proches" }, a: { en: "Long sandy Malia beach, Potamos", fr: "Longue plage de sable de Malia" }, b: { en: "Star Beach, Sarandari, small coves", fr: "Star Beach, Sarandari, criques" }, winner: "tie" },
      { label: { en: "Food scene", fr: "Gastronomie" }, a: { en: "Tourist restaurants, British-style pubs", fr: "Restaurants touristiques, pubs anglais" }, b: { en: "More variety, some authentic tavernas", fr: "Plus de variete, tavernes authentiques" }, winner: "b" },
      { label: { en: "History", fr: "Histoire" }, a: { en: "Minoan Palace of Malia (often overlooked)", fr: "Palais minoen de Malia (souvent ignore)" }, b: { en: "Lychnostatis open-air museum", fr: "Musee en plein air Lychnostatis" }, winner: "a" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Legendary party strip, clubs until dawn", fr: "Strip de fete legendaire, clubs jusqu'a l'aube" }, b: { en: "Bars and clubs, slightly tamer", fr: "Bars et clubs, un peu plus sage" }, winner: "a" },
      { label: { en: "Accessibility", fr: "Accessibilite" }, a: { en: "35 min from HER airport", fr: "35 min de l'aeroport HER" }, b: { en: "25 min from HER airport", fr: "25 min de l'aeroport HER" }, winner: "b" },
      { label: { en: "Price level", fr: "Niveau de prix" }, a: { en: "Budget-friendly, cheap drinks", fr: "Petit budget, boissons pas cheres" }, b: { en: "Slightly higher, more family-oriented", fr: "Un peu plus cher, plus familial" }, winner: "a" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "18-25 party seekers, budget travelers", fr: "Fetards 18-25 ans, petit budget" }, b: { en: "Families, couples, mixed groups", fr: "Familles, couples, groupes mixtes" } },
    ],
    verdictA: { en: "Choose Malia for legendary nightlife, cheap drinks, and a young party atmosphere.", fr: "Choisissez Malia pour la vie nocturne legendaire et l'ambiance festive jeune." },
    verdictB: { en: "Choose Hersonissos for a more balanced holiday with water parks, dining, and nightlife options.", fr: "Choisissez Hersonissos pour des vacances plus equilibrees avec parcs aquatiques et restaurants." },
  },

  "sitia-vs-ierapetra": {
    categories: [
      { label: { en: "Vibe", fr: "Ambiance" }, a: { en: "Quiet, authentic, off-the-beaten-path", fr: "Calme, authentique, hors des sentiers battus" }, b: { en: "Warm, southern, agricultural town", fr: "Chaud, meridional, ville agricole" }, winner: "tie" },
      { label: { en: "Beaches nearby", fr: "Plages proches" }, a: { en: "Vai palm beach, Itanos, Kouremenos", fr: "Plage de palmiers de Vai, Itanos, Kouremenos" }, b: { en: "Chrysi island, Myrtos, Makrigialos", fr: "ile de Chrysi, Myrtos, Makrigialos" }, winner: "tie" },
      { label: { en: "Food scene", fr: "Gastronomie" }, a: { en: "Local tavernas, fresh fish, sultanas", fr: "Tavernes locales, poisson frais, sultanines" }, b: { en: "Waterfront dining, greenhouse produce", fr: "Restaurants en front de mer, produits de serres" }, winner: "tie" },
      { label: { en: "History", fr: "Histoire" }, a: { en: "Kazarma fortress, Archaeological Museum, Toplou", fr: "Forteresse Kazarma, musee archeologique, Toplou" }, b: { en: "Kales fortress, Ottoman fountain, Napoleon's house", fr: "Forteresse Kales, fontaine ottomane, maison de Napoleon" }, winner: "tie" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Very quiet, a few harbor bars", fr: "Tres calme, quelques bars au port" }, b: { en: "Quiet, waterfront cafes", fr: "Calme, cafes en front de mer" }, winner: "tie" },
      { label: { en: "Accessibility", fr: "Accessibilite" }, a: { en: "Small airport (seasonal), 3h from HER", fr: "Petit aeroport (saisonnier), 3h de HER" }, b: { en: "No airport, 2.5h from HER", fr: "Pas d'aeroport, 2h30 de HER" }, winner: "a" },
      { label: { en: "Price level", fr: "Niveau de prix" }, a: { en: "Very affordable, few tourists", fr: "Tres abordable, peu de touristes" }, b: { en: "Very affordable, local prices", fr: "Tres abordable, prix locaux" }, winner: "tie" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Windsurfers, nature lovers, solitude seekers", fr: "Veligistes, amoureux de la nature" }, b: { en: "Warm winters, Chrysi island, authentic life", fr: "Hivers doux, ile de Chrysi, vie authentique" } },
    ],
    verdictA: { en: "Choose Sitia for Vai palm beach, windsurf at Kouremenos, and the most unspoiled corner of Crete.", fr: "Choisissez Sitia pour la plage de Vai, le windsurf a Kouremenos et le coin le plus preserve de Crete." },
    verdictB: { en: "Choose Ierapetra for year-round warmth, the stunning Chrysi island, and Europe's southernmost city.", fr: "Choisissez Ierapetra pour la chaleur toute l'annee et la magnifique ile de Chrysi." },
  },

  "chania-vs-agios-nikolaos": {
    categories: [
      { label: { en: "Vibe", fr: "Ambiance" }, a: { en: "Venetian grandeur, cosmopolitan", fr: "Grandeur venitienne, cosmopolite" }, b: { en: "Charming lakeside, more intimate", fr: "Charmant au bord du lac, plus intime" }, winner: "a" },
      { label: { en: "Beaches nearby", fr: "Plages proches" }, a: { en: "Elafonisi, Balos, Falassarna", fr: "Elafonisi, Balos, Falassarna" }, b: { en: "Voulisma, Almyros, Istron", fr: "Voulisma, Almyros, Istron" }, winner: "a" },
      { label: { en: "Food scene", fr: "Gastronomie" }, a: { en: "Creative restaurants, harbor dining", fr: "Restaurants creatifs, repas au port" }, b: { en: "Waterfront tavernas, local fish", fr: "Tavernes en bord de mer, poisson local" }, winner: "a" },
      { label: { en: "History", fr: "Histoire" }, a: { en: "Venetian harbor, old town, mosque", fr: "Port venitien, vieille ville, mosquee" }, b: { en: "Lake Voulismeni, Spinalonga nearby", fr: "Lac Voulismeni, Spinalonga a proximite" }, winner: "tie" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Varied, trendy bars", fr: "Variee, bars tendance" }, b: { en: "Quieter, lakeside bars", fr: "Plus calme, bars au bord du lac" }, winner: "a" },
      { label: { en: "Accessibility", fr: "Accessibilite" }, a: { en: "Own airport (CHQ)", fr: "Aeroport propre (CHQ)" }, b: { en: "1h from Heraklion airport", fr: "1h de l'aeroport d'Heraklion" }, winner: "a" },
      { label: { en: "Price level", fr: "Niveau de prix" }, a: { en: "Mid to high range", fr: "Moyen a eleve" }, b: { en: "More affordable", fr: "Plus abordable" }, winner: "b" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "First-timers, photographers, foodies", fr: "Premiers visiteurs, photographes, gourmets" }, b: { en: "Repeat visitors, Spinalonga fans, east Crete", fr: "Habitues, fans de Spinalonga, est de la Crete" } },
    ],
    verdictA: { en: "Choose Chania for the iconic harbor, legendary beaches, and a wider range of experiences.", fr: "Choisissez La Canee pour le port iconique, les plages legendaires et plus d'experiences." },
    verdictB: { en: "Choose Agios Nikolaos for a quieter lakeside charm, Spinalonga, and easier access to eastern Crete.", fr: "Choisissez Agios Nikolaos pour le charme du lac, Spinalonga et l'acces a l'est de la Crete." },
  },

  /* ===== ISLAND vs ISLAND ===== */

  "crete-vs-santorini": {
    categories: [
      { label: { en: "Size", fr: "Taille", de: "Grosse", el: "Μέγεθος" }, a: { en: "Largest Greek island (8,450 km2)", fr: "Plus grande ile grecque (8 450 km2)", de: "Grosste griechische Insel (8.450 km2)", el: "Μεγαλύτερο ελληνικό νησί (8.450 km2)" }, b: { en: "Small (76 km2) - walkable", fr: "Petite (76 km2) - a pied", de: "Klein (76 km2) - begehbar", el: "Μικρό (76 km2)" }, winner: "a" },
      { label: { en: "Beaches", fr: "Plages", de: "Strande", el: "Παραλίες" }, a: { en: "500+ beaches, all types", fr: "500+ plages, tous types", de: "500+ Strande, alle Typen", el: "500+ παραλίες, όλοι οι τύποι" }, b: { en: "Volcanic black/red sand, limited", fr: "Sable volcanique noir/rouge, limite", de: "Vulkanischer schwarzer/roter Sand", el: "Ηφαιστειακή μαύρη/κόκκινη άμμος" }, winner: "a" },
      { label: { en: "Culture", fr: "Culture", de: "Kultur", el: "Πολιτισμός" }, a: { en: "4000+ years, Minoan palaces, gorges", fr: "4000+ ans, palais minoens, gorges", de: "4000+ Jahre, minoische Palaste, Schluchten", el: "4000+ χρόνια, μινωικά ανάκτορα" }, b: { en: "Caldera views, Akrotiri ruins, wine", fr: "Vues sur la caldeira, ruines d'Akrotiri, vin", de: "Caldera-Blick, Akrotiri-Ruinen, Wein", el: "Θέα καλντέρας, ερείπια Ακρωτηρίου" }, winner: "a" },
      { label: { en: "Food", fr: "Gastronomie", de: "Essen", el: "Φαγητό" }, a: { en: "Authentic Cretan diet, affordable tavernas", fr: "Regime cretois authentique, tavernes abordables", de: "Authentische kretische Kuche, erschwinglich", el: "Αυθεντική κρητική διατροφή" }, b: { en: "Upscale dining, sunset views, expensive", fr: "Restaurants haut de gamme, vues coucher de soleil, cher", de: "Gehobene Kuche, Sonnenuntergangsblick, teuer", el: "Υψηλή γαστρονομία, ακριβό" }, winner: "tie" },
      { label: { en: "Nightlife", fr: "Vie nocturne", de: "Nachtleben", el: "Νυχτερινή ζωή" }, a: { en: "Varied: from quiet tavernas to clubs", fr: "Variee : des tavernes calmes aux clubs", de: "Vielfatig: von ruhigen Tavernen bis Clubs", el: "Ποικίλη: από ταβέρνες μέχρι clubs" }, b: { en: "Sunset cocktails, small bar scene", fr: "Cocktails au coucher de soleil, petits bars", de: "Sonnenuntergangs-Cocktails, kleine Barszene", el: "Κοκτέιλ ηλιοβασιλέματος, μικρά μπαρ" }, winner: "a" },
      { label: { en: "Getting there", fr: "Comment y aller", de: "Anreise", el: "Πώς φτάνετε" }, a: { en: "2 airports, ferries from Piraeus (9h)", fr: "2 aeroports, ferries depuis le Piree (9h)", de: "2 Flughafen, Fahren von Piraus (9h)", el: "2 αεροδρόμια, φέρι από Πειραιά (9ω)" }, b: { en: "1 airport, ferry from Piraeus (5-8h)", fr: "1 aeroport, ferry depuis le Piree (5-8h)", de: "1 Flughafen, Fahre von Piraus (5-8h)", el: "1 αεροδρόμιο, φέρι από Πειραιά (5-8ω)" }, winner: "tie" },
      { label: { en: "Budget", fr: "Budget", de: "Budget", el: "Προϋπολογισμός" }, a: { en: "50-100 EUR/day comfortable", fr: "50-100 EUR/jour confortable", de: "50-100 EUR/Tag komfortabel", el: "50-100 EUR/ημέρα" }, b: { en: "150-300 EUR/day minimum", fr: "150-300 EUR/jour minimum", de: "150-300 EUR/Tag mindestens", el: "150-300 EUR/ημέρα ελάχιστο" }, winner: "a" },
      { label: { en: "Best for", fr: "Ideal pour", de: "Am besten fur", el: "Ιδανικό για" }, a: { en: "Explorers, families, foodies, hikers", fr: "Explorateurs, familles, randonneurs", de: "Entdecker, Familien, Wanderer", el: "Εξερευνητές, οικογένειες, πεζοπόρους" }, b: { en: "Romance, Instagram, sunsets, luxury", fr: "Romance, Instagram, couchers de soleil, luxe", de: "Romantik, Instagram, Sonnenuntergange, Luxus", el: "Ρομαντισμός, Instagram, ηλιοβασιλέματα" } },
    ],
    verdictA: { en: "Choose Crete for diversity, adventure, authentic culture, and value for money. You could spend a month and not see everything.", fr: "Choisissez la Crete pour la diversite, l'aventure et l'authenticite. Vous pourriez passer un mois sans tout voir.", de: "Wahlen Sie Kreta fur Vielfalt, Abenteuer und authentische Kultur.", el: "Επιλέξτε Κρήτη για ποικιλία, περιπέτεια και αυθεντική κουλτούρα." },
    verdictB: { en: "Choose Santorini for a short, romantic getaway with iconic views. Perfect for 2-3 days, but budget significantly more.", fr: "Choisissez Santorin pour une escapade romantique courte avec des vues iconiques.", de: "Wahlen Sie Santorini fur einen kurzen, romantischen Kurzurlaub.", el: "Επιλέξτε Σαντορίνη για σύντομη ρομαντική απόδραση." },
  },

  "crete-vs-rhodes": {
    categories: [
      { label: { en: "Size", fr: "Taille" }, a: { en: "8,450 km2 - enormous diversity", fr: "8 450 km2 - diversite enorme" }, b: { en: "1,401 km2 - medium island", fr: "1 401 km2 - ile moyenne" }, winner: "a" },
      { label: { en: "Beaches", fr: "Plages" }, a: { en: "500+ beaches, pink sand to lagoons", fr: "500+ plages, sable rose aux lagons" }, b: { en: "Good beaches, Lindos, Tsambika, Prasonisi", fr: "Bonnes plages, Lindos, Tsambika, Prasonisi" }, winner: "a" },
      { label: { en: "Culture", fr: "Culture" }, a: { en: "Minoan civilization, Venetian/Ottoman layers", fr: "Civilisation minoenne, strates veneto-ottomanes" }, b: { en: "Medieval old town (UNESCO), Knights of St John", fr: "Vieille ville medievale (UNESCO), Chevaliers de Saint-Jean" }, winner: "tie" },
      { label: { en: "Food", fr: "Gastronomie" }, a: { en: "Famous Cretan diet, olive oil, local wine", fr: "Regime cretois celebre, huile d'olive, vin local" }, b: { en: "Dodecanese cuisine, seafood, pitaroudia", fr: "Cuisine dodecanesienne, fruits de mer" }, winner: "a" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Chania, Heraklion, Malia - varied", fr: "La Canee, Heraklion, Malia - variee" }, b: { en: "Faliraki party strip, Rhodes old town bars", fr: "Strip festive de Faliraki, bars de la vieille ville" }, winner: "tie" },
      { label: { en: "Getting there", fr: "Comment y aller" }, a: { en: "2 international airports, frequent flights", fr: "2 aeroports internationaux, vols frequents" }, b: { en: "1 international airport, good connections", fr: "1 aeroport international, bonnes connexions" }, winner: "a" },
      { label: { en: "Budget", fr: "Budget" }, a: { en: "50-100 EUR/day", fr: "50-100 EUR/jour" }, b: { en: "60-120 EUR/day", fr: "60-120 EUR/jour" }, winner: "a" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Long stays, road trips, nature, families", fr: "Longs sejours, road trips, nature, familles" }, b: { en: "Medieval history, windsurfing, beach holidays", fr: "Histoire medievale, planche a voile" } },
    ],
    verdictA: { en: "Choose Crete for its sheer diversity - beaches, mountains, gorges, and a month's worth of exploration.", fr: "Choisissez la Crete pour sa diversite - plages, montagnes, gorges et un mois d'exploration." },
    verdictB: { en: "Choose Rhodes for a stunning medieval old town, great windsurfing, and a more compact island experience.", fr: "Choisissez Rhodes pour sa vieille ville medievale et une experience insulaire plus compacte." },
  },

  "crete-vs-corfu": {
    categories: [
      { label: { en: "Size", fr: "Taille" }, a: { en: "8,450 km2 - vast and varied", fr: "8 450 km2 - vaste et variee" }, b: { en: "592 km2 - lush and green", fr: "592 km2 - luxuriant et vert" }, winner: "a" },
      { label: { en: "Beaches", fr: "Plages" }, a: { en: "500+ beaches, turquoise lagoons", fr: "500+ plages, lagons turquoise" }, b: { en: "Beautiful coves, Canal d'Amour, Paleokastritsa", fr: "Belles criques, Canal d'Amour, Paleokastritsa" }, winner: "a" },
      { label: { en: "Culture", fr: "Culture" }, a: { en: "Minoan, Venetian, Ottoman heritage", fr: "Patrimoine minoen, venitien, ottoman" }, b: { en: "British, French, Venetian influences, UNESCO town", fr: "Influences britanniques, francaises, veneto, ville UNESCO" }, winner: "tie" },
      { label: { en: "Food", fr: "Gastronomie" }, a: { en: "Cretan diet, olive oil, dakos, raki", fr: "Regime cretois, huile d'olive, dakos, raki" }, b: { en: "Italian-influenced, sofrito, pastitsada, kumquat", fr: "Influence italienne, sofrito, pastitsada, kumquat" }, winner: "tie" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Multiple cities, Malia party scene", fr: "Plusieurs villes, scene festive de Malia" }, b: { en: "Corfu town bars, Kavos party strip", fr: "Bars de la ville de Corfou, strip de Kavos" }, winner: "tie" },
      { label: { en: "Getting there", fr: "Comment y aller" }, a: { en: "2 airports, year-round flights", fr: "2 aeroports, vols toute l'annee" }, b: { en: "1 airport, mostly seasonal", fr: "1 aeroport, surtout saisonnier" }, winner: "a" },
      { label: { en: "Budget", fr: "Budget" }, a: { en: "50-100 EUR/day", fr: "50-100 EUR/jour" }, b: { en: "60-110 EUR/day", fr: "60-110 EUR/jour" }, winner: "a" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Adventure, long stays, authentic Greece", fr: "Aventure, longs sejours, Grece authentique" }, b: { en: "Green landscapes, Venetian elegance, short trips", fr: "Paysages verts, elegance venitienne, courts sejours" } },
    ],
    verdictA: { en: "Choose Crete for endless exploration, legendary beaches, and the deepest Greek cultural experience.", fr: "Choisissez la Crete pour l'exploration sans fin, les plages legendaires et la culture grecque la plus profonde." },
    verdictB: { en: "Choose Corfu for lush green landscapes, Venetian elegance, and a uniquely cosmopolitan Greek island.", fr: "Choisissez Corfou pour ses paysages verts luxuriants et son elegance venitienne unique." },
  },

  "crete-vs-mykonos": {
    categories: [
      { label: { en: "Size", fr: "Taille" }, a: { en: "8,450 km2 - weeks to explore", fr: "8 450 km2 - des semaines a explorer" }, b: { en: "86 km2 - see it in 2 days", fr: "86 km2 - a voir en 2 jours" }, winner: "a" },
      { label: { en: "Beaches", fr: "Plages" }, a: { en: "500+ beaches, all types", fr: "500+ plages, tous types" }, b: { en: "Famous party beaches: Paradise, Super Paradise", fr: "Plages festives celebres : Paradise, Super Paradise" }, winner: "a" },
      { label: { en: "Culture", fr: "Culture" }, a: { en: "Ancient Minoan, gorges, mountain villages", fr: "Minoenne antique, gorges, villages de montagne" }, b: { en: "Windmills, Little Venice, Delos island", fr: "Moulins a vent, Little Venice, ile de Delos" }, winner: "a" },
      { label: { en: "Food", fr: "Gastronomie" }, a: { en: "Authentic tavernas, local ingredients", fr: "Tavernes authentiques, ingredients locaux" }, b: { en: "Trendy restaurants, very expensive", fr: "Restaurants tendance, tres cher" }, winner: "a" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Varied across cities", fr: "Variee selon les villes" }, b: { en: "World-famous clubs, DJ sets, beach parties", fr: "Clubs mondialement celebres, DJ sets, beach parties" }, winner: "b" },
      { label: { en: "Getting there", fr: "Comment y aller" }, a: { en: "2 airports, direct from Europe", fr: "2 aeroports, direct depuis l'Europe" }, b: { en: "1 airport, very busy in summer", fr: "1 aeroport, tres charge en ete" }, winner: "a" },
      { label: { en: "Budget", fr: "Budget" }, a: { en: "50-100 EUR/day", fr: "50-100 EUR/jour" }, b: { en: "200-500 EUR/day", fr: "200-500 EUR/jour" }, winner: "a" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "All travelers, families, culture, nature", fr: "Tous voyageurs, familles, culture, nature" }, b: { en: "Party lovers, celebrities, LGBTQ+ scene", fr: "Fetards, celebrites, scene LGBTQ+" } },
    ],
    verdictA: { en: "Choose Crete for real Greece - authentic food, diverse landscapes, and experiences that don't drain your wallet.", fr: "Choisissez la Crete pour la vraie Grece - cuisine authentique, paysages divers et budget raisonnable." },
    verdictB: { en: "Choose Mykonos for world-class nightlife, celebrity spotting, and the ultimate Greek party island.", fr: "Choisissez Mykonos pour la vie nocturne de classe mondiale et l'ile festive ultime." },
  },

  "crete-vs-cyprus": {
    categories: [
      { label: { en: "Size", fr: "Taille" }, a: { en: "8,450 km2 - Greek island", fr: "8 450 km2 - ile grecque" }, b: { en: "9,251 km2 - independent country", fr: "9 251 km2 - pays independant" }, winner: "tie" },
      { label: { en: "Beaches", fr: "Plages" }, a: { en: "500+ beaches, pink sand, lagoons", fr: "500+ plages, sable rose, lagons" }, b: { en: "Blue Flag beaches, Nissi, Fig Tree Bay", fr: "Plages Pavillon Bleu, Nissi, Fig Tree Bay" }, winner: "a" },
      { label: { en: "Culture", fr: "Culture" }, a: { en: "Minoan, Venetian, Greek Orthodox", fr: "Minoenne, venitienne, orthodoxe grecque" }, b: { en: "Greek-Turkish mix, Crusader castles", fr: "Mix greco-turc, chateaux croises" }, winner: "tie" },
      { label: { en: "Food", fr: "Gastronomie" }, a: { en: "Cretan diet, olive oil, raki", fr: "Regime cretois, huile d'olive, raki" }, b: { en: "Meze culture, halloumi, commandaria wine", fr: "Culture du meze, halloumi, vin commandaria" }, winner: "tie" },
      { label: { en: "Nightlife", fr: "Vie nocturne" }, a: { en: "Varied across cities", fr: "Variee selon les villes" }, b: { en: "Ayia Napa clubs, Limassol bars", fr: "Clubs d'Ayia Napa, bars de Limassol" }, winner: "tie" },
      { label: { en: "Getting there", fr: "Comment y aller" }, a: { en: "Part of Greece, 2 airports", fr: "Fait partie de la Grece, 2 aeroports" }, b: { en: "Independent country, 2 airports", fr: "Pays independant, 2 aeroports" }, winner: "tie" },
      { label: { en: "Budget", fr: "Budget" }, a: { en: "50-100 EUR/day", fr: "50-100 EUR/jour" }, b: { en: "60-120 EUR/day", fr: "60-120 EUR/jour" }, winner: "a" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Greek culture immersion, nature, history", fr: "Immersion culture grecque, nature, histoire" }, b: { en: "Year-round sun, British expats, golf", fr: "Soleil toute l'annee, expatries britanniques, golf" } },
    ],
    verdictA: { en: "Choose Crete for the ultimate Greek island experience - Minoan history, legendary beaches, and authentic culture.", fr: "Choisissez la Crete pour l'experience ultime d'ile grecque - histoire minoenne, plages legendaires." },
    verdictB: { en: "Choose Cyprus for year-round warm weather, English-speaking ease, and a blend of Greek and Middle Eastern culture.", fr: "Choisissez Chypre pour le beau temps toute l'annee et un melange de cultures grecque et orientale." },
  },

  /* ===== BEACH vs BEACH ===== */

  "elafonisi-vs-balos": {
    categories: [
      { label: { en: "Sand", fr: "Sable", de: "Sand", el: "Άμμος" }, a: { en: "Pink-white sand, shallow lagoon", fr: "Sable rose-blanc, lagon peu profond", de: "Rosa-weisser Sand, flache Lagune", el: "Ροζ-λευκή άμμος, αβαθής λιμνοθάλασσα" }, b: { en: "White sand, turquoise lagoon", fr: "Sable blanc, lagon turquoise", de: "Weisser Sand, turkise Lagune", el: "Λευκή άμμος, τυρκουάζ λιμνοθάλασσα" }, winner: "tie" },
      { label: { en: "Water color", fr: "Couleur de l'eau", de: "Wasserfarbe", el: "Χρώμα νερού" }, a: { en: "Caribbean-like turquoise and pink hues", fr: "Turquoise et reflets roses, style Caraibes", de: "Karibisch-turkis mit rosa Schimmer", el: "Τυρκουάζ με ροζ αποχρώσεις" }, b: { en: "Stunning turquoise-emerald gradient", fr: "Degrade turquoise-emeraude spectaculaire", de: "Atemberaubender Turkis-Smaragd-Gradient", el: "Εκπληκτική διαβάθμιση τυρκουάζ-σμαράγδι" }, winner: "tie" },
      { label: { en: "Access", fr: "Acces", de: "Zugang", el: "Πρόσβαση" }, a: { en: "Paved road, easy parking", fr: "Route goudronnee, parking facile", de: "Asphaltstrasse, einfaches Parken", el: "Ασφαλτόδρομος, εύκολο πάρκινγκ" }, b: { en: "Dirt road + 20 min steep hike down", fr: "Piste + 20 min descente raide", de: "Schotterstrasse + 20 min steiler Abstieg", el: "Χωματόδρομος + 20 λεπτά κατηφόρα" }, winner: "a" },
      { label: { en: "Crowd level", fr: "Foule", de: "Menschenmassen", el: "Πλήθη" }, a: { en: "Very crowded Jul-Aug", fr: "Tres bonde juil-aout", de: "Sehr voll Jul-Aug", el: "Πολύ πολυσύχναστο Ιούλ-Αύγ" }, b: { en: "Crowded but more spread out", fr: "Bonde mais plus etale", de: "Voll aber mehr verteilt", el: "Πολυσύχναστο αλλά πιο απλωμένο" }, winner: "tie" },
      { label: { en: "Facilities", fr: "Equipements", de: "Einrichtungen", el: "Εγκαταστάσεις" }, a: { en: "Sunbeds, taverna, showers", fr: "Transats, taverne, douches", de: "Liegen, Taverne, Duschen", el: "Ξαπλώστρες, ταβέρνα, ντουζ" }, b: { en: "Sunbeds, basic canteen only", fr: "Transats, cantine basique", de: "Liegen, einfache Kantine", el: "Ξαπλώστρες, βασικό κυλικείο" }, winner: "a" },
      { label: { en: "Best time", fr: "Meilleur moment", de: "Beste Zeit", el: "Καλύτερη εποχή" }, a: { en: "May-Jun and Sep-Oct for fewer crowds", fr: "Mai-juin et sept-oct pour moins de monde", de: "Mai-Jun und Sep-Okt fur weniger Andrang", el: "Μάι-Ιούν και Σεπ-Οκτ" }, b: { en: "Early morning or late Sep for photos", fr: "Tot le matin ou fin sept pour les photos", de: "Fruh morgens oder Ende Sep fur Fotos", el: "Νωρίς το πρωί ή τέλη Σεπ" }, winner: "tie" },
      { label: { en: "Unique feature", fr: "Particularite", de: "Besonderheit", el: "Μοναδικό χαρακτηριστικό" }, a: { en: "Natural pink sand from crushed shells", fr: "Sable rose naturel de coquillages broyes", de: "Naturlicher rosa Sand aus zermahlenen Muscheln", el: "Φυσική ροζ άμμος από θρυμματισμένα κοχύλια" }, b: { en: "Dramatic viewpoint from cliff above", fr: "Point de vue spectaculaire depuis la falaise", de: "Dramatischer Aussichtspunkt von der Klippe", el: "Δραματική θέα από τον βράχο" }, winner: "tie" },
      { label: { en: "Best for", fr: "Ideal pour", de: "Am besten fur", el: "Ιδανικό για" }, a: { en: "Families, easy access, all-day beach", fr: "Familles, acces facile, plage toute la journee", de: "Familien, einfacher Zugang, Ganztagesstrand", el: "Οικογένειες, εύκολη πρόσβαση" }, b: { en: "Adventurers, photographers, dramatic views", fr: "Aventuriers, photographes, vues spectaculaires", de: "Abenteurer, Fotografen, dramatische Aussichten", el: "Περιπετειώδεις, φωτογράφους" } },
    ],
    verdictA: { en: "Choose Elafonisi for easy access, pink sand, and a family-friendly lagoon experience.", fr: "Choisissez Elafonisi pour l'acces facile, le sable rose et une experience familiale.", de: "Wahlen Sie Elafonisi fur einfachen Zugang und rosa Sand.", el: "Επιλέξτε Ελαφονήσι για εύκολη πρόσβαση και ροζ άμμο." },
    verdictB: { en: "Choose Balos for the dramatic viewpoint hike and one of the most photographed lagoons in Greece.", fr: "Choisissez Balos pour la randonnee panoramique et l'un des lagons les plus photographies de Grece.", de: "Wahlen Sie Balos fur die dramatische Aussichtswanderung.", el: "Επιλέξτε Μπάλος για τη δραματική πεζοπορία." },
  },

  "elafonisi-vs-vai": {
    categories: [
      { label: { en: "Sand", fr: "Sable" }, a: { en: "Pink-white sand, shallow lagoon", fr: "Sable rose-blanc, lagon peu profond" }, b: { en: "Golden sand, natural palm forest", fr: "Sable dore, foret de palmiers naturelle" }, winner: "a" },
      { label: { en: "Water color", fr: "Couleur de l'eau" }, a: { en: "Turquoise with pink reflections", fr: "Turquoise avec reflets roses" }, b: { en: "Clear blue, calm waters", fr: "Bleu clair, eaux calmes" }, winner: "a" },
      { label: { en: "Access", fr: "Acces" }, a: { en: "Paved road, west Crete (1h from Chania)", fr: "Route goudronnee, ouest Crete (1h de La Canee)" }, b: { en: "Paved road, far east Crete (1.5h from Agios Nikolaos)", fr: "Route goudronnee, extreme est Crete (1h30 d'Agios Nikolaos)" }, winner: "tie" },
      { label: { en: "Crowd level", fr: "Foule" }, a: { en: "Very crowded in peak season", fr: "Tres bonde en haute saison" }, b: { en: "Moderate, more remote location helps", fr: "Moderee, l'emplacement recule aide" }, winner: "b" },
      { label: { en: "Facilities", fr: "Equipements" }, a: { en: "Sunbeds, taverna, showers, parking", fr: "Transats, taverne, douches, parking" }, b: { en: "Sunbeds, cafe, protected natural area", fr: "Transats, cafe, zone naturelle protegee" }, winner: "a" },
      { label: { en: "Best time", fr: "Meilleur moment" }, a: { en: "May-June, September-October", fr: "Mai-juin, septembre-octobre" }, b: { en: "May-October, less seasonal variation", fr: "Mai-octobre, moins de variation saisonniere" }, winner: "tie" },
      { label: { en: "Unique feature", fr: "Particularite" }, a: { en: "Natural pink sand from shell fragments", fr: "Sable rose naturel de fragments de coquillages" }, b: { en: "Europe's largest natural palm forest", fr: "Plus grande foret de palmiers naturelle d'Europe" }, winner: "tie" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Families, Instagram, easy beach day", fr: "Familles, Instagram, journee plage facile" }, b: { en: "Nature lovers, unique landscapes, east Crete explorers", fr: "Amoureux de la nature, paysages uniques, explorateurs de l'est" } },
    ],
    verdictA: { en: "Choose Elafonisi for the iconic pink sand and a Caribbean-like lagoon experience in western Crete.", fr: "Choisissez Elafonisi pour le sable rose iconique et une experience de lagon style Caraibes." },
    verdictB: { en: "Choose Vai for Europe's only natural palm beach, fewer crowds, and a tropical atmosphere in eastern Crete.", fr: "Choisissez Vai pour la seule plage de palmiers naturelle d'Europe et une atmosphere tropicale." },
  },

  "balos-vs-preveli": {
    categories: [
      { label: { en: "Sand", fr: "Sable" }, a: { en: "White sand, turquoise lagoon", fr: "Sable blanc, lagon turquoise" }, b: { en: "Coarse sand, river meets sea", fr: "Sable grossier, riviere rencontre la mer" }, winner: "a" },
      { label: { en: "Water color", fr: "Couleur de l'eau" }, a: { en: "Turquoise-emerald gradient, unreal", fr: "Degrade turquoise-emeraude, irreal" }, b: { en: "Clear blue sea + freshwater river", fr: "Mer bleu clair + riviere d'eau douce" }, winner: "a" },
      { label: { en: "Access", fr: "Acces" }, a: { en: "Dirt road + steep 20 min descent (or boat)", fr: "Piste + descente raide 20 min (ou bateau)" }, b: { en: "Steps down from parking (15 min) or boat", fr: "Escaliers depuis le parking (15 min) ou bateau" }, winner: "tie" },
      { label: { en: "Crowd level", fr: "Foule" }, a: { en: "Very crowded Jul-Aug, spread out lagoon", fr: "Tres bonde juil-aout, lagon etendu" }, b: { en: "Moderate, smaller beach", fr: "Moderee, plage plus petite" }, winner: "b" },
      { label: { en: "Facilities", fr: "Equipements" }, a: { en: "Sunbeds, basic canteen", fr: "Transats, cantine basique" }, b: { en: "Minimal, natural setting", fr: "Minimal, cadre naturel" }, winner: "a" },
      { label: { en: "Best time", fr: "Meilleur moment" }, a: { en: "Early morning May-June for empty lagoon", fr: "Tot le matin mai-juin pour un lagon vide" }, b: { en: "May-October, river fullest in spring", fr: "Mai-octobre, riviere plus pleine au printemps" }, winner: "tie" },
      { label: { en: "Unique feature", fr: "Particularite" }, a: { en: "Viewpoint from cliff - most photographed in Greece", fr: "Point de vue depuis la falaise - le plus photographie de Grece" }, b: { en: "Palm-lined river gorge flowing into the sea", fr: "Gorge bordee de palmiers se jetant dans la mer" }, winner: "tie" },
      { label: { en: "Best for", fr: "Ideal pour" }, a: { en: "Photographers, bucket-listers, adventurers", fr: "Photographes, bucket-listers, aventuriers" }, b: { en: "Nature lovers, unique combo river+beach", fr: "Amoureux de la nature, combo unique riviere+plage" } },
    ],
    verdictA: { en: "Choose Balos for the jaw-dropping aerial viewpoint and Greece's most iconic lagoon.", fr: "Choisissez Balos pour la vue aerienne a couper le souffle et le lagon le plus iconique de Grece." },
    verdictB: { en: "Choose Preveli for a unique experience where a palm-lined river gorge meets a beautiful beach.", fr: "Choisissez Preveli pour l'experience unique ou une gorge bordee de palmiers rencontre la plage." },
  },
};

/* ------------------------------------------------------------------ */
/*  Helper: get text for locale with fallback                          */
/* ------------------------------------------------------------------ */

function t(record: Record<string, string>, locale: string): string {
  return record[locale] || record.en || Object.values(record)[0] || "";
}

/* ------------------------------------------------------------------ */
/*  generateStaticParams                                               */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

/* ------------------------------------------------------------------ */
/*  SEO metadata                                                       */
/* ------------------------------------------------------------------ */

const META_TITLES: Record<string, Record<string, string>> = {
  en: { prefix: "", suffix: "- Which is better? | Crete Direct" },
  fr: { prefix: "", suffix: "- Lequel choisir ? | Crete Direct" },
  de: { prefix: "", suffix: "- Was ist besser? | Crete Direct" },
  el: { prefix: "", suffix: "- Ποιο είναι καλύτερο; | Crete Direct" },
};

const META_DESC: Record<string, string> = {
  en: "Detailed side-by-side comparison of %A% vs %B%. Beaches, food, nightlife, budget, and our honest verdict.",
  fr: "Comparaison detaillee de %A% vs %B%. Plages, gastronomie, vie nocturne, budget et notre verdict honnete.",
  de: "Detaillierter Vergleich von %A% vs %B%. Strande, Essen, Nachtleben, Budget und unser ehrliches Urteil.",
  el: "Λεπτομερής σύγκριση %A% vs %B%. Παραλίες, φαγητό, νυχτερινή ζωή, κόστος.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const comp = COMPARISONS.find((c) => c.slug === slug);
  if (!comp) return {};

  const titleMeta = META_TITLES[locale] || META_TITLES.en;
  const title = `${comp.a} vs ${comp.b} ${titleMeta.suffix}`;
  const descTemplate = META_DESC[locale] || META_DESC.en;
  const description = descTemplate.replace("%A%", comp.a).replace("%B%", comp.b);

  const url = `${BASE_URL}/${locale}/compare/${slug}`;
  const alternates: Record<string, string> = {};
  for (const loc of ["en", "fr", "de", "el"]) {
    alternates[loc] = `${BASE_URL}/${loc}/compare/${slug}`;
  }
  alternates["x-default"] = `${BASE_URL}/en/compare/${slug}`;

  const data = COMPARISON_DATA[slug];
  const faqSchema = data
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Which is better, ${comp.a} or ${comp.b}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `${t(data.verdictA, "en")} ${t(data.verdictB, "en")}`,
            },
          },
          {
            "@type": "Question",
            name: `Is ${comp.a} cheaper than ${comp.b}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text:
                data.categories.find((c) => t(c.label, "en").toLowerCase().includes("budget") || t(c.label, "en").toLowerCase().includes("price"))
                  ? `${comp.a}: ${t(data.categories.find((c) => t(c.label, "en").toLowerCase().includes("budget") || t(c.label, "en").toLowerCase().includes("price"))!.a, "en")}. ${comp.b}: ${t(data.categories.find((c) => t(c.label, "en").toLowerCase().includes("budget") || t(c.label, "en").toLowerCase().includes("price"))!.b, "en")}.`
                  : `Both ${comp.a} and ${comp.b} offer different price ranges depending on the season and type of accommodation.`,
            },
          },
          {
            "@type": "Question",
            name: `Is ${comp.a} or ${comp.b} better for beaches?`,
            acceptedAnswer: {
              "@type": "Answer",
              text:
                data.categories.find((c) => t(c.label, "en").toLowerCase().includes("beach"))
                  ? `${comp.a}: ${t(data.categories.find((c) => t(c.label, "en").toLowerCase().includes("beach"))!.a, "en")}. ${comp.b}: ${t(data.categories.find((c) => t(c.label, "en").toLowerCase().includes("beach"))!.b, "en")}.`
                  : `Both destinations offer great beach experiences.`,
            },
          },
        ],
      }
    : null;

  return {
    title,
    description,
    alternates: { languages: alternates },
    openGraph: {
      title,
      description,
      url,
      siteName: "Crete Direct",
      type: "article",
    },
    other: faqSchema
      ? { "script:ld+json": JSON.stringify(faqSchema) }
      : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

const LABELS: Record<string, Record<string, string>> = {
  verdict: { en: "Our verdict", fr: "Notre verdict", de: "Unser Urteil", el: "Η γνώμη μας" },
  otherComparisons: { en: "More comparisons", fr: "Autres comparaisons", de: "Weitere Vergleiche", el: "Περισσότερες συγκρίσεις" },
  backHome: { en: "Back to home", fr: "Retour a l'accueil", de: "Zuruck zur Startseite", el: "Πίσω στην αρχική" },
  winner: { en: "Winner", fr: "Gagnant", de: "Gewinner", el: "Νικητής" },
  tie: { en: "Tie", fr: "Egalite", de: "Unentschieden", el: "Ισοπαλία" },
  faq: { en: "Frequently asked questions", fr: "Questions frequentes", de: "Haufig gestellte Fragen", el: "Συχνές ερωτήσεις" },
};

export default async function ComparePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const comp = COMPARISONS.find((c) => c.slug === slug);
  if (!comp) notFound();

  const data = COMPARISON_DATA[slug];
  if (!data) notFound();

  const other = COMPARISONS.filter((c) => c.slug !== slug);

  // Count wins
  let winsA = 0;
  let winsB = 0;
  for (const cat of data.categories) {
    if (cat.winner === "a") winsA++;
    if (cat.winner === "b") winsB++;
  }

  // FAQ data for visible section
  const budgetCat = data.categories.find((c) => t(c.label, "en").toLowerCase().includes("budget") || t(c.label, "en").toLowerCase().includes("price"));
  const beachCat = data.categories.find((c) => t(c.label, "en").toLowerCase().includes("beach") || t(c.label, "en").toLowerCase().includes("sand"));

  const faqItems = [
    {
      q: { en: `Which is better, ${comp.a} or ${comp.b}?`, fr: `Lequel est mieux, ${comp.a} ou ${comp.b} ?` },
      a: { en: `${t(data.verdictA, "en")} ${t(data.verdictB, "en")}`, fr: `${t(data.verdictA, "fr")} ${t(data.verdictB, "fr")}` },
    },
    budgetCat
      ? {
          q: { en: `Is ${comp.a} cheaper than ${comp.b}?`, fr: `Est-ce que ${comp.a} est moins cher que ${comp.b} ?` },
          a: { en: `${comp.a}: ${t(budgetCat.a, "en")}. ${comp.b}: ${t(budgetCat.b, "en")}.`, fr: `${comp.a} : ${t(budgetCat.a, "fr")}. ${comp.b} : ${t(budgetCat.b, "fr")}.` },
        }
      : null,
    beachCat
      ? {
          q: { en: `Which has better beaches, ${comp.a} or ${comp.b}?`, fr: `Qui a les meilleures plages, ${comp.a} ou ${comp.b} ?` },
          a: { en: `${comp.a}: ${t(beachCat.a, "en")}. ${comp.b}: ${t(beachCat.b, "en")}.`, fr: `${comp.a} : ${t(beachCat.a, "fr")}. ${comp.b} : ${t(beachCat.b, "fr")}.` },
        }
      : null,
  ].filter(Boolean) as { q: Record<string, string>; a: Record<string, string> }[];

  return (
    <main className="min-h-screen bg-white">
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map((item) => ({
              "@type": "Question",
              name: t(item.q, locale),
              acceptedAnswer: {
                "@type": "Answer",
                text: t(item.a, locale),
              },
            })),
          }),
        }}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-sky-600 to-blue-800 text-white py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t(LABELS.backHome, locale)}
          </Link>

          <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
            <div className="text-right flex-1">
              <h1 className="text-3xl md:text-5xl font-bold">{comp.a}</h1>
            </div>
            <div className="flex-shrink-0">
              <Scale className="w-10 h-10 md:w-14 md:h-14 text-white/60" />
            </div>
            <div className="text-left flex-1">
              <h1 className="text-3xl md:text-5xl font-bold">{comp.b}</h1>
            </div>
          </div>

          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            {locale === "fr"
              ? `Comparaison detaillee pour vous aider a choisir entre ${comp.a} et ${comp.b}.`
              : locale === "de"
                ? `Detaillierter Vergleich zwischen ${comp.a} und ${comp.b}.`
                : locale === "el"
                  ? `Λεπτομερής σύγκριση μεταξύ ${comp.a} και ${comp.b}.`
                  : `A detailed side-by-side comparison to help you choose between ${comp.a} and ${comp.b}.`}
          </p>

          {/* Score summary */}
          <div className="mt-8 flex justify-center gap-8 text-sm">
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <span className="font-semibold">{comp.a}</span>
              <span className="ml-2 text-green-300">{winsA} {locale === "fr" ? "point" : "win"}{winsA > 1 ? "s" : ""}</span>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <span className="font-semibold">{comp.b}</span>
              <span className="ml-2 text-green-300">{winsB} {locale === "fr" ? "point" : "win"}{winsB > 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <div className="space-y-4">
          {data.categories.map((cat, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_2fr] gap-3 md:gap-4 items-start rounded-xl border border-gray-100 bg-gray-50/50 p-4 md:p-5 hover:shadow-md transition-shadow"
            >
              {/* Category label */}
              <div className="font-semibold text-gray-900 text-sm md:text-base">
                {t(cat.label, locale)}
              </div>

              {/* A value */}
              <div
                className={`text-sm md:text-base rounded-lg p-3 ${
                  cat.winner === "a"
                    ? "bg-green-50 border border-green-200 text-green-900"
                    : "bg-white border border-gray-100 text-gray-700"
                }`}
              >
                <span className="md:hidden font-medium text-gray-500 mr-1">{comp.a}:</span>
                {t(cat.a, locale)}
                {cat.winner === "a" && (
                  <Trophy className="inline-block w-4 h-4 ml-2 text-green-600" />
                )}
              </div>

              {/* Winner badge - desktop only */}
              <div className="hidden md:flex items-center justify-center">
                {cat.winner === "tie" ? (
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-1">
                    {t(LABELS.tie, locale)}
                  </span>
                ) : cat.winner ? (
                  <ArrowRight
                    className={`w-4 h-4 ${
                      cat.winner === "a" ? "rotate-180 text-green-500" : "text-green-500"
                    }`}
                  />
                ) : null}
              </div>

              {/* B value */}
              <div
                className={`text-sm md:text-base rounded-lg p-3 ${
                  cat.winner === "b"
                    ? "bg-green-50 border border-green-200 text-green-900"
                    : "bg-white border border-gray-100 text-gray-700"
                }`}
              >
                <span className="md:hidden font-medium text-gray-500 mr-1">{comp.b}:</span>
                {t(cat.b, locale)}
                {cat.winner === "b" && (
                  <Trophy className="inline-block w-4 h-4 ml-2 text-green-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verdict */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8">
            {t(LABELS.verdict, locale)}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-sky-700 mb-3">{comp.a}</h3>
              <p className="text-gray-700 leading-relaxed">{t(data.verdictA, locale)}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-sky-700 mb-3">{comp.b}</h3>
              <p className="text-gray-700 leading-relaxed">{t(data.verdictB, locale)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqItems.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t(LABELS.faq, locale)}</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                <summary className="cursor-pointer px-5 py-4 font-medium text-gray-900 hover:bg-gray-50 transition-colors">
                  {t(item.q, locale)}
                </summary>
                <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed">
                  {t(item.a, locale)}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Related links */}
      <section className="bg-gray-50 py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {t(LABELS.otherComparisons, locale)}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {other.map((c) => (
              <Link
                key={c.slug}
                href={`/${locale}/compare/${c.slug}`}
                className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 hover:shadow-md hover:border-sky-200 transition-all text-sm"
              >
                <Scale className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <span className="text-gray-800 font-medium">
                  {c.a} vs {c.b}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
              </Link>
            ))}
          </div>

          {/* Links back to site */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/beaches`}
              className="text-sm text-sky-600 hover:text-sky-800 underline underline-offset-2"
            >
              {locale === "fr" ? "Toutes les plages" : "All beaches"}
            </Link>
            <Link
              href={`/${locale}/villages`}
              className="text-sm text-sky-600 hover:text-sky-800 underline underline-offset-2"
            >
              {locale === "fr" ? "Villages" : "Villages"}
            </Link>
            <Link
              href={`/${locale}/weather`}
              className="text-sm text-sky-600 hover:text-sky-800 underline underline-offset-2"
            >
              {locale === "fr" ? "Meteo" : "Weather"}
            </Link>
            <Link
              href={`/${locale}/food`}
              className="text-sm text-sky-600 hover:text-sky-800 underline underline-offset-2"
            >
              {locale === "fr" ? "Gastronomie" : "Food & drink"}
            </Link>
            <Link
              href={`/${locale}/hikes`}
              className="text-sm text-sky-600 hover:text-sky-800 underline underline-offset-2"
            >
              {locale === "fr" ? "Randonnees" : "Hikes"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
