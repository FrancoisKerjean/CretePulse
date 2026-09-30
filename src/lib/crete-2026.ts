// Textes de la page /[locale]/crete-2026 (« L'été 2026 en Crète », bilan publié le 30/09/2026).
// FR = texte de la maquette validée, repris à l'identique. EN/DE/EL = traductions fidèles,
// mêmes chiffres, seul le format des nombres et des dates change.
// Les séries des graphiques vivent dans src/data/crete-2026.json.

export type C26Locale = "fr" | "en" | "de" | "el";
export const C26_LOCALES: C26Locale[] = ["en", "fr", "de", "el"];
export const pickC26 = (locale: string): C26Locale =>
  (C26_LOCALES as string[]).includes(locale) ? (locale as C26Locale) : "en";

export type Fact = { big: string; txt: string; src: string; ex?: true; feat?: true; grave?: true };
export type ChartKey = "passengers" | "languages" | "busRoutes" | "fires" | "index";
export type ChartCopy = { key: ChartKey; title: string; sub: string; source: string; head: string[] };
export type Chapter = { id: string; nav: string; num: string; title: string; story: string; facts: Fact[]; chart?: ChartCopy };
export type PlaceKey = "heraklion" | "chania" | "rethymno" | "agiosNikolaos" | "hersonissos" | "malia" | "chaniaAirport";

export type Crete2026Copy = {
  meta: { title: string; description: string; headline: string; datasetName: string; datasetDescription: string; variables: string[] };
  hero: { kicker: string; h1Line: string; h1Pre: string; h1Hl: string; lede: string; goat: string };
  navLabel: string;
  badge: string;
  badgeIntro: string;
  chapters: Chapter[];
  method: {
    id: string; nav: string; num: string; title: string; storyBefore: string; storyAfter: string;
    items: [string, string][]; note: string; cta: string; copy: string; copied: string; selected: string;
  };
  published: string;
  seeData: string;
  months: string[];
  languages: string[];
  period: (year: number) => string;
  places: Record<PlaceKey, string>;
  series: { visits: string; receipts: string };
  units: { passengers: string; visitors: string; ha: string };
  millionSuffix: string;
};

const INTL: Record<C26Locale, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", el: "el-GR" };

/** Nombre au format de la langue. Espace fine insécable (U+202F) remplacée par une insécable
 *  classique : Baloo 2 n'a pas le glyphe fin, et la maquette utilisait une espace pleine. */
export function fmtNum(locale: C26Locale, n: number, digits = 0): string {
  return new Intl.NumberFormat(INTL[locale], { maximumFractionDigits: digits }).format(n).replace(/ /g, " ");
}

/** Pourcentage : espace insécable avant % en fr/de, collé en en/el (usage de chaque langue). */
export function fmtPct(locale: C26Locale, n: number, digits = 1): string {
  return fmtNum(locale, n, digits) + (locale === "fr" || locale === "de" ? " %" : "%");
}

// Insécables typographiques : un nombre ne se coupe jamais de ses milliers ni de son unité.
const UNIT = "%|€|°C|M|Mio\\.|εκ\\.|ha|km|min|Min\\.|jours|nuits|Tage|Nächte|days|nights|ημέρες|νύχτες|λεπτά|εκτάρια";
const THOUSANDS = /(\d) (?=\d{3}(?!\d))/g;
const BEFORE_UNIT = new RegExp(`(\\d) (?=(?:${UNIT})(?![\\p{L}]))`, "gu");
export const nb = (s: string) => s.replace(THOUSANDS, "$1 ").replace(BEFORE_UNIT, "$1 ");

const fr: Crete2026Copy = {
  meta: {
    title: "L’été 2026 en Crète : la saison en chiffres | crete.direct",
    description: "Aéroports, Airbnb, bus, météo, feux : la saison 2026 en Crète en chiffres, dont beaucoup que vous ne trouverez que sur crete.direct.",
    headline: "L’été 2026 en Crète",
    datasetName: "L’été 2026 en Crète : données des graphiques",
    datasetDescription: "Séries du bilan de l’été 2026 en Crète : passagers aériens mensuels 2023-2026 (HCAA), langue de 281 874 avis Airbnb, trajets de bus les plus recherchés sur crete.direct, surfaces brûlées 2016-2026 (EFFIS), indice des visites et des recettes touristiques 2016-2025 (Banque de Grèce, Eurostat).",
    variables: ["passagers aériens par mois", "langue des avis Airbnb", "recherches de trajets de bus", "surfaces brûlées", "indice des visites et des recettes touristiques"],
  },
  hero: {
    kicker: "crete.direct · bilan de saison",
    h1Line: "L’été 2026",
    h1Pre: "en ",
    h1Hl: "Crète",
    lede: "Les chiffres de la saison, dont beaucoup que vous ne trouverez que chez nous.",
    goat: "La chèvre kri-kri de crete.direct",
  },
  navLabel: "Chapitres",
  badge: "Exclusif crete.direct",
  badgeIntro: "Ce badge signale les chiffres issus des relevés de crete.direct : tableaux des aéroports, bus en direct, recherches de trajets, devis, avis analysés et agenda.",
  chapters: [
    {
      id: "venus", nav: "Arriver", num: "1 · Arriver", title: "Une île qui fait le plein",
      story: "La Crète n’avait pas vu passer autant de voyageurs dans ses aéroports depuis au moins 2023. Et nos capteurs, qui lisent les tableaux d’arrivées et de départs toutes les dix minutes, racontent le détail de l’été.",
      facts: [
        { big: "10,5 M", txt: "passagers aériens de janvier à août, +6 % en un an.", src: "Aviation civile grecque (HCAA)", feat: true },
        { big: "2,64 M", txt: "passagers en août, le mois le plus chargé depuis au moins 2023.", src: "HCAA" },
        { big: "1 sur 5", txt: "des arrivées internationales en avion de toute la Grèce atterrit en Crète.", src: "INSETE, janvier-août 2026" },
        { big: "562", txt: "vols en une journée, le dimanche 23 août : le record de l’été à Héraklion et La Canée.", src: "tableaux des aéroports relevés par crete.direct", ex: true },
        { big: "+15 %", txt: "de vols le dimanche par rapport à la semaine. Le mardi est le jour le plus calme.", src: "tableaux des aéroports, 28/07 au 29/09", ex: true },
        { big: "Tel-Aviv", txt: "est le premier aéroport étranger d’origine des vols vers la Crète cet été, avec 840 arrivées.", src: "tableaux des aéroports, 28/07 au 29/09", ex: true },
        { big: "92 %", txt: "des passagers des vols en provenance de Norvège arrivent à La Canée ; 87 % de ceux des vols français arrivent à Héraklion.", src: "HCAA, passagers par pays du vol" },
        { big: "179", txt: "villes dans 42 pays reliées à la Crète par avion cet été.", src: "tableaux des aéroports", ex: true },
        { big: "20 min", txt: "de retard médian à l’arrivée à Héraklion. Les vols du matin sont les plus ponctuels.", src: "tableaux des aéroports, mesure toutes les 10 min", ex: true },
      ],
      chart: { key: "passengers", title: "Chaque mois de 2026 dépasse les années précédentes", sub: "Passagers des aéroports crétois par mois", source: "Source : aviation civile grecque (HCAA).", head: ["Mois", "2023", "2024", "2025", "2026"] },
    },
    {
      id: "dormir", nav: "Dormir", num: "2 · Dormir", title: "27 333 annonces Airbnb",
      story: "Nous avons analysé les annonces Airbnb de toute l’île et la langue de 281 874 avis laissés depuis 2024. Une clientèle se dessine : de plus en plus germanophone et francophone.",
      facts: [
        { big: "132 656", txt: "places proposées sur Airbnb en juin 2026, dans 27 333 annonces.", src: "Inside Airbnb, relevé du 29/06/2026", feat: true },
        { big: "73", txt: "annonces pour 1 000 habitants dans la préfecture de La Canée, contre 44 pour l’ensemble de l’île.", src: "Inside Airbnb, ELSTAT recensement 2021" },
        { big: "17,3 %", txt: "des avis sont en allemand début 2026, contre 14,3 % début 2024. Le français progresse aussi, l’anglais recule.", src: "281 874 avis analysés par crete.direct", ex: true },
        { big: "23 %", txt: "des avis sont écrits en français dans le Lassithi, l’est de l’île, contre 17 % à La Canée.", src: "avis 2025 analysés par crete.direct", ex: true },
        { big: "132 €", txt: "la nuit en médiane dans le Lassithi, contre 163 € à La Canée : l’est est 19 % moins cher.", src: "Inside Airbnb, prix affichés en juin 2026" },
        { big: "20 %", txt: "des avis de l’année tombent en août. De novembre à mars, à peine 7 %.", src: "Inside Airbnb, moyenne 2023-2025" },
      ],
      chart: { key: "languages", title: "L’allemand et le français progressent, l’anglais recule", sub: "Langue des avis Airbnb laissés en Crète, janvier-juin", source: "Source : 281 874 avis, langue détectée par crete.direct. Langue de l’avis, pas nationalité.", head: ["Langue", "janv-juin 2024", "janv-juin 2025", "janv-juin 2026"] },
    },
    {
      id: "bouger", nav: "Bouger", num: "3 · Bouger", title: "Le bus au dernier moment",
      story: "Sur place, on circule en bus, en voiture de location et parfois en van partagé. Nos données de terrain montrent un voyageur qui décide au dernier moment, téléphone en main.",
      facts: [
        { big: "Héraklion → La Canée", txt: "est le trajet de bus le plus recherché de l’été, devant Héraklion → Réthymnon.", src: "planificateur de trajets crete.direct", ex: true, feat: true },
        { big: "63 %", txt: "des recherches de bus portent sur un trajet le jour même ou le lendemain.", src: "planificateur de trajets crete.direct", ex: true },
        { big: "3 sur 4", txt: "des recherches de bus se font sur un téléphone.", src: "planificateur de trajets crete.direct", ex: true },
        { big: "−56 %", txt: "d’activité pour les bus urbains d’Héraklion le dimanche. Pas de renfort estival en semaine.", src: "positions GPS des bus suivies par crete.direct", ex: true },
        { big: "23 %", txt: "des courses urbaines d’Héraklion sont assurées par la ligne 1 de l’aéroport.", src: "positions GPS des bus suivies par crete.direct", ex: true },
        { big: "51 €", txt: "par jour pour une voiture de location en médiane, et, pour une même demande, l’offre la plus chère coûte en médiane 1,66 fois la moins chère.", src: "devis reçus par crete.direct", ex: true },
        { big: "143", txt: "escales de croisière programmées à Héraklion de juillet à décembre. Un jour d’escale sur cinq voit arriver deux navires ou plus.", src: "programme du port d’Héraklion, compilé par crete.direct" },
      ],
      chart: { key: "busRoutes", title: "Les trajets de bus les plus recherchés", sub: "Visiteurs ayant cherché chaque trajet, 13/06 au 29/09", source: "Source : planificateur de trajets de crete.direct.", head: ["Trajet", "Visiteurs"] },
    },
    {
      id: "decouvrir", nav: "Découvrir", num: "4 · Découvrir", title: "Ce que vous avez regardé",
      story: "Plages, sites antiques, fêtes de village : voici ce qui a attiré les regards cet été.",
      facts: [
        { big: "Agiofarago", txt: "est la plage la plus consultée sur crete.direct, devant Balos, Almyrida, Elafonisi, Matala.", src: "pages plages de crete.direct", ex: true, feat: true },
        { big: "Knossos", txt: "reste le lieu crétois le plus lu sur Wikipedia : 212 944 pages vues depuis janvier.", src: "Wikimedia, en anglais" },
        { big: "981", txt: "événements recensés par l’agenda crete.direct de juin à septembre, festivals et concerts en tête.", src: "agenda crete.direct", ex: true },
        { big: "2 294", txt: "lieux recensés sur l’île, dont 641 monastères et ermitages, 475 plages et 173 gorges.", src: "catalogue des lieux de crete.direct" },
      ],
    },
    {
      id: "temps", nav: "Le temps", num: "5 · Le temps qu’il a fait", title: "Un été plus frais, une année de feux",
      story: "La saison a été un peu moins chaude que la moyenne de la décennie, avec un meltem plus présent. Mais 2026 restera l’année où la Crète a le plus brûlé depuis au moins dix ans.",
      facts: [
        { big: "−0,35 °C", txt: "sous la moyenne 2016-2025 en moyenne sur six villes crétoises, de mai à septembre.", src: "réanalyse ERA5 (Open-Meteo)" },
        { big: "7 jours", txt: "à 35 °C ou plus à Héraklion, contre 13 en moyenne et 18 en 2025.", src: "réanalyse ERA5" },
        { big: "15 jours", txt: "de meltem fort en juillet à Héraklion, contre 11 d’habitude.", src: "réanalyse ERA5, rafales de 50 km/h ou plus" },
        { big: "175/177", txt: "zones de baignade classées Excellentes par l’Union européenne, et 154 plages Pavillon bleu.", src: "Agence européenne pour l’environnement, ΕΕΠΦ" },
        { big: "8 031 ha", txt: "brûlés en 2026, 7 fois la moyenne de la décennie. Le feu de Kria Vrisi et Saktouria, le 29 juillet, a parcouru 5 331 ha et coûté la vie à deux pompiers.", src: "EFFIS (Copernicus)", grave: true },
        { big: "340", txt: "détections satellite de feu suivies du 29 au 31 juillet, les trois quarts de l’année.", src: "NASA FIRMS, suivi en direct sur crete.direct" },
      ],
      chart: { key: "fires", title: "2026, année record : 8 031 hectares brûlés", sub: "Surfaces brûlées en Crète par année", source: "Source : EFFIS (Copernicus, JRC), au 30/09/2026.", head: ["Année", "Hectares"] },
    },
    {
      id: "envers", nav: "L’envers du décor", num: "6 · L’envers du décor", title: "Plus de visiteurs, pas plus d’argent",
      story: "Les aéroports battent des records, mais la dépense des visiteurs ne suit pas. Les séjours raccourcissent, et les locations via les plateformes prennent une part croissante.",
      facts: [
        { big: "−16,5 %", txt: "de recettes touristiques au premier semestre, pour +3,3 % de visites.", src: "Banque de Grèce, données provisoires", feat: true },
        { big: "7,7 nuits", txt: "en moyenne par visite en 2025, contre 8,7 en 2016.", src: "Banque de Grèce" },
        { big: "684 €", txt: "dépensés par visite en 2025, autant qu’en 2016. Inflation déduite, c’est 18 % de moins.", src: "Banque de Grèce, Eurostat" },
        { big: "20 %", txt: "des nuitées marchandes réservées via Airbnb, Booking et les autres plateformes en 2025, deux fois plus qu’en 2019.", src: "Eurostat" },
      ],
      chart: { key: "index", title: "Les visites montent, les recettes réelles stagnent", sub: "Indice base 100 en 2016, recettes en euros constants", source: "Source : Banque de Grèce, Eurostat.", head: ["Année", "Visites", "Recettes réelles"] },
    },
    {
      id: "demain", nav: "Demain", num: "7 · Demain", title: "Ce qui arrive",
      story: "Deux chantiers vont changer la manière d’arriver et de circuler en Crète.",
      facts: [
        { big: "2028", txt: "ouverture prévue du nouvel aéroport de Kastelli, conçu pour accueillir jusqu’à 15 millions de passagers par an. Chantier à 70 % en mai 2026.", src: "concessionnaire GEK TERNA", feat: true },
        { big: "157 km", txt: "d’autoroute nord entre La Canée et Héraklion, livraison visée en 2030.", src: "loi 5204/2025, GEK TERNA" },
        { big: "10 km", txt: "d’autoroute ouverts le 30 septembre entre Neapoli et Agios Nikolaos, fin prévue en octobre 2027.", src: "ministère grec des Infrastructures, presse crétoise" },
      ],
    },
  ],
  method: {
    id: "methode", nav: "Nos données", num: "Nos données",
    title: "Ce que crete.direct mesure, et que vous ne trouverez pas ailleurs",
    storyBefore: "Ce rapport croise les statistiques officielles publiées au 30 septembre 2026 et les données que crete.direct collecte chaque jour. Les chiffres marqués ",
    storyAfter: " viennent de nos propres relevés.",
    items: [
      ["Les tableaux des aéroports", "arrivées et départs d’Héraklion et de La Canée relevés toutes les 10 minutes, contrôlés contre les chiffres officiels à moins de 1 % près."],
      ["Les bus en direct", "positions GPS des bus urbains d’Héraklion, de La Canée et d’Agios Nikolaos."],
      ["Les trajets recherchés", "6 800 recherches d’itinéraires en bus depuis juin."],
      ["Les devis de location", "264 offres de loueurs locaux comparées pour des voyageurs."],
      ["Les avis Airbnb", "281 874 avis dont la langue a été détectée."],
      ["L’agenda et l’actualité", "981 événements de l’été et 40 946 actualités crétoises classées."],
      ["Les feux", "détections satellite de la NASA suivies et cartographiées en direct depuis le 29 juillet."],
    ],
    note: "Sources officielles : aviation civile grecque (HCAA), INSETE, Banque de Grèce, Eurostat, ELSTAT, Inside Airbnb, Agence européenne pour l’environnement, EFFIS et Copernicus, NASA FIRMS, Open-Meteo (réanalyse ERA5), NOAA, Wikimedia, port d’Héraklion. Les données de septembre ne sont pas encore toutes publiées. Un avis n’est pas un séjour, et le pays d’un vol n’est pas la nationalité de ses passagers.",
    cta: "Vous avez passé l’été en Crète ? Dites-nous ce que crete.direct doit améliorer pour 2027 :",
    copy: "Copier l’adresse", copied: "Adresse copiée", selected: "Adresse sélectionnée",
  },
  published: "Le guide pratique de la Crète · bilan publié le 30 septembre 2026",
  seeData: "Voir les données",
  months: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  languages: ["anglais", "français", "allemand", "grec", "italien", "néerlandais"],
  period: (y) => `janv-juin ${y}`,
  places: { heraklion: "Héraklion", chania: "La Canée", rethymno: "Réthymnon", agiosNikolaos: "Agios Nikolaos", hersonissos: "Hersonissos", malia: "Malia", chaniaAirport: "Aéroport de La Canée" },
  series: { visits: "Visites", receipts: "Recettes (euros constants)" },
  units: { passengers: "passagers", visitors: "visiteurs", ha: "ha" },
  millionSuffix: " M",
};

const en: Crete2026Copy = {
  meta: {
    title: "Crete, summer 2026 in numbers | crete.direct",
    description: "Airports, Airbnb, buses, weather, fires: the 2026 season in Crete in numbers, many of which you will only find on crete.direct.",
    headline: "Crete, summer 2026 in numbers",
    datasetName: "Crete, summer 2026: chart data",
    datasetDescription: "Series behind the summer 2026 review of Crete: monthly air passengers 2023-2026 (HCAA), language of 281,874 Airbnb reviews, most searched bus routes on crete.direct, area burned 2016-2026 (EFFIS), index of visits and tourism receipts 2016-2025 (Bank of Greece, Eurostat).",
    variables: ["air passengers per month", "language of Airbnb reviews", "bus route searches", "area burned", "index of visits and tourism receipts"],
  },
  hero: {
    kicker: "crete.direct · season review",
    h1Line: "Summer 2026",
    h1Pre: "in ",
    h1Hl: "Crete",
    lede: "The season in numbers, many of which you will only find here.",
    goat: "The crete.direct kri-kri goat",
  },
  navLabel: "Chapters",
  badge: "crete.direct exclusive",
  badgeIntro: "This badge marks figures that come from crete.direct’s own tracking: airport boards, live buses, route searches, quotes, analysed reviews and events calendar.",
  chapters: [
    {
      id: "venus", nav: "Arriving", num: "1 · Arriving", title: "Full house on the island",
      story: "Crete’s airports had not seen so many travellers since at least 2023. And our sensors, which read the arrival and departure boards every ten minutes, tell the story of the summer in detail.",
      facts: [
        { big: "10.5M", txt: "air passengers from January to August, +6% in a year.", src: "Hellenic Civil Aviation Authority (HCAA)", feat: true },
        { big: "2.64M", txt: "passengers in August, the busiest month since at least 2023.", src: "HCAA" },
        { big: "1 in 5", txt: "international air arrivals in the whole of Greece lands in Crete.", src: "INSETE, January-August 2026" },
        { big: "562", txt: "flights in a single day, on Sunday 23 August: the summer record at Heraklion and Chania.", src: "airport boards tracked by crete.direct", ex: true },
        { big: "+15%", txt: "more flights on Sundays than on weekdays. Tuesday is the quietest day.", src: "airport boards, 28/07 to 29/09", ex: true },
        { big: "Tel Aviv", txt: "is the top foreign airport of origin for flights to Crete this summer, with 840 arrivals.", src: "airport boards, 28/07 to 29/09", ex: true },
        { big: "92%", txt: "of passengers on flights from Norway land in Chania; 87% of those on flights from France land in Heraklion.", src: "HCAA, passengers by country of flight" },
        { big: "179", txt: "cities in 42 countries linked to Crete by air this summer.", src: "airport boards", ex: true },
        { big: "20 min", txt: "median arrival delay at Heraklion. Morning flights are the most punctual.", src: "airport boards, measured every 10 min", ex: true },
      ],
      chart: { key: "passengers", title: "Every month of 2026 beats the previous years", sub: "Passengers at Cretan airports, by month", source: "Source: Hellenic Civil Aviation Authority (HCAA).", head: ["Month", "2023", "2024", "2025", "2026"] },
    },
    {
      id: "dormir", nav: "Staying", num: "2 · Staying", title: "27,333 Airbnb listings",
      story: "We analysed Airbnb listings across the whole island and the language of 281,874 reviews left since 2024. A clear picture of the guests emerges: more and more German and French speakers.",
      facts: [
        { big: "132,656", txt: "guest places on offer on Airbnb in June 2026, across 27,333 listings.", src: "Inside Airbnb, snapshot of 29/06/2026", feat: true },
        { big: "73", txt: "listings per 1,000 inhabitants in the Chania regional unit, against 44 for the island as a whole.", src: "Inside Airbnb, ELSTAT 2021 census" },
        { big: "17.3%", txt: "of reviews are in German in early 2026, up from 14.3% in early 2024. French is rising too, English is falling.", src: "281,874 reviews analysed by crete.direct", ex: true },
        { big: "23%", txt: "of reviews are written in French in Lasithi, in the east of the island, against 17% in Chania.", src: "2025 reviews analysed by crete.direct", ex: true },
        { big: "€132", txt: "per night (median) in Lasithi, against €163 in Chania: the east is 19% cheaper.", src: "Inside Airbnb, listed prices in June 2026" },
        { big: "20%", txt: "of the year’s reviews come in August. From November to March, barely 7%.", src: "Inside Airbnb, 2023-2025 average" },
      ],
      chart: { key: "languages", title: "German and French are rising, English is falling", sub: "Language of Airbnb reviews left in Crete, January-June", source: "Source: 281,874 reviews, language detected by crete.direct. Language of the review, not nationality.", head: ["Language", "Jan-Jun 2024", "Jan-Jun 2025", "Jan-Jun 2026"] },
    },
    {
      id: "bouger", nav: "Getting around", num: "3 · Getting around", title: "The last-minute bus",
      story: "Once on the island, people get around by bus, by rental car and sometimes by shared van. Our field data show travellers who decide at the last minute, phone in hand.",
      facts: [
        { big: "Heraklion → Chania", txt: "is the most searched bus route of the summer, ahead of Heraklion → Rethymno.", src: "crete.direct journey planner", ex: true, feat: true },
        { big: "63%", txt: "of bus searches are for a trip the same day or the next day.", src: "crete.direct journey planner", ex: true },
        { big: "3 in 4", txt: "bus searches are made on a phone.", src: "crete.direct journey planner", ex: true },
        { big: "−56%", txt: "activity for Heraklion city buses on Sundays. No extra summer service on weekdays.", src: "bus GPS positions tracked by crete.direct", ex: true },
        { big: "23%", txt: "of Heraklion city bus trips are run by line 1, the airport line.", src: "bus GPS positions tracked by crete.direct", ex: true },
        { big: "€51", txt: "per day for a rental car (median), and for the same request, the most expensive offer costs a median 1.66 times the cheapest.", src: "quotes received by crete.direct", ex: true },
        { big: "143", txt: "cruise calls scheduled in Heraklion from July to December. One call day in five sees two or more ships arrive.", src: "Heraklion port schedule, compiled by crete.direct" },
      ],
      chart: { key: "busRoutes", title: "The most searched bus routes", sub: "Visitors who searched each route, 13/06 to 29/09", source: "Source: crete.direct journey planner.", head: ["Route", "Visitors"] },
    },
    {
      id: "decouvrir", nav: "Exploring", num: "4 · Exploring", title: "What you looked at",
      story: "Beaches, ancient sites, village festivals: here is what caught people’s eye this summer.",
      facts: [
        { big: "Agiofarago", txt: "is the most viewed beach on crete.direct, ahead of Balos, Almyrida, Elafonisi, Matala.", src: "crete.direct beach pages", ex: true, feat: true },
        { big: "Knossos", txt: "is still the most-read Cretan place on Wikipedia: 212,944 page views since January.", src: "Wikimedia, English-language" },
        { big: "981", txt: "events listed in the crete.direct calendar from June to September, led by festivals and concerts.", src: "crete.direct events calendar", ex: true },
        { big: "2,294", txt: "places listed on the island, including 641 monasteries and hermitages, 475 beaches and 173 gorges.", src: "crete.direct places catalogue" },
      ],
    },
    {
      id: "temps", nav: "Weather", num: "5 · How the weather was", title: "A cooler summer, a year of fires",
      story: "The season was slightly cooler than the decade’s average, with a stronger meltemi. But 2026 will be remembered as the year Crete burned the most in at least ten years.",
      facts: [
        { big: "−0.35°C", txt: "below the 2016-2025 average, across six Cretan towns, from May to September.", src: "ERA5 reanalysis (Open-Meteo)" },
        { big: "7 days", txt: "at 35°C or above in Heraklion, against 13 on average and 18 in 2025.", src: "ERA5 reanalysis" },
        { big: "15 days", txt: "of strong meltemi in July in Heraklion, against 11 usually.", src: "ERA5 reanalysis, gusts of 50 km/h or more" },
        { big: "175/177", txt: "bathing sites rated Excellent by the European Union, and 154 Blue Flag beaches.", src: "European Environment Agency, ΕΕΠΦ" },
        { big: "8,031 ha", txt: "burned in 2026, 7 times the decade’s average. The Kria Vrisi and Saktouria fire on 29 July swept through 5,331 ha and cost the lives of two firefighters.", src: "EFFIS (Copernicus)", grave: true },
        { big: "340", txt: "satellite fire detections tracked from 29 to 31 July, three quarters of the year’s total.", src: "NASA FIRMS, tracked live on crete.direct" },
      ],
      chart: { key: "fires", title: "2026, a record year: 8,031 hectares burned", sub: "Area burned in Crete per year", source: "Source: EFFIS (Copernicus, JRC), as of 30/09/2026.", head: ["Year", "Hectares"] },
    },
    {
      id: "envers", nav: "The flip side", num: "6 · The flip side", title: "More visitors, no more money",
      story: "Airports are breaking records, but visitor spending is not keeping up. Stays are getting shorter, and rentals booked through platforms are taking a growing share.",
      facts: [
        { big: "−16.5%", txt: "in tourism receipts in the first half of the year, for +3.3% in visits.", src: "Bank of Greece, provisional data", feat: true },
        { big: "7.7 nights", txt: "on average per visit in 2025, against 8.7 in 2016.", src: "Bank of Greece" },
        { big: "€684", txt: "spent per visit in 2025, the same as in 2016. Adjusted for inflation, that is 18% less.", src: "Bank of Greece, Eurostat" },
        { big: "20%", txt: "of paid overnight stays were booked through Airbnb, Booking and other platforms in 2025, twice as many as in 2019.", src: "Eurostat" },
      ],
      chart: { key: "index", title: "Visits rise, real receipts stall", sub: "Index, 2016 = 100, receipts in constant euros", source: "Source: Bank of Greece, Eurostat.", head: ["Year", "Visits", "Real receipts"] },
    },
    {
      id: "demain", nav: "Tomorrow", num: "7 · Tomorrow", title: "What’s coming",
      story: "Two major projects will change the way people arrive in Crete and travel around the island.",
      facts: [
        { big: "2028", txt: "planned opening of the new Kastelli airport, designed to handle up to 15 million passengers a year. Construction 70% complete in May 2026.", src: "concession holder GEK TERNA", feat: true },
        { big: "157 km", txt: "of northern motorway between Chania and Heraklion, with completion targeted for 2030.", src: "Law 5204/2025, GEK TERNA" },
        { big: "10 km", txt: "of motorway opened on 30 September between Neapoli and Agios Nikolaos, with completion expected in October 2027.", src: "Greek Ministry of Infrastructure, Cretan press" },
      ],
    },
  ],
  method: {
    id: "methode", nav: "Our data", num: "Our data",
    title: "What crete.direct measures, and you won’t find anywhere else",
    storyBefore: "This report combines official statistics published as of 30 September 2026 with the data crete.direct collects every day. Figures marked ",
    storyAfter: " come from our own tracking.",
    items: [
      ["Airport boards", "arrivals and departures at Heraklion and Chania recorded every 10 minutes, checked against official figures to within 1%."],
      ["Live buses", "GPS positions of city buses in Heraklion, Chania and Agios Nikolaos."],
      ["Route searches", "6,800 bus journey searches since June."],
      ["Rental quotes", "264 offers from local rental companies compared for travellers."],
      ["Airbnb reviews", "281,874 reviews whose language was detected."],
      ["Events and news", "981 summer events and 40,946 Cretan news items classified."],
      ["Fires", "NASA satellite detections tracked and mapped live since 29 July."],
    ],
    note: "Official sources: Hellenic Civil Aviation Authority (HCAA), INSETE, Bank of Greece, Eurostat, ELSTAT, Inside Airbnb, European Environment Agency, EFFIS and Copernicus, NASA FIRMS, Open-Meteo (ERA5 reanalysis), NOAA, Wikimedia, Port of Heraklion. September data are not all published yet. A review is not a stay, and the country a flight comes from is not the nationality of its passengers.",
    cta: "Spent the summer in Crete? Tell us what crete.direct should improve for 2027:",
    copy: "Copy address", copied: "Address copied", selected: "Address selected",
  },
  published: "The practical guide to Crete · review published on 30 September 2026",
  seeData: "See the data",
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  languages: ["English", "French", "German", "Greek", "Italian", "Dutch"],
  period: (y) => `Jan-Jun ${y}`,
  places: { heraklion: "Heraklion", chania: "Chania", rethymno: "Rethymno", agiosNikolaos: "Agios Nikolaos", hersonissos: "Hersonissos", malia: "Malia", chaniaAirport: "Chania Airport" },
  series: { visits: "Visits", receipts: "Receipts (constant euros)" },
  units: { passengers: "passengers", visitors: "visitors", ha: "ha" },
  millionSuffix: "M",
};

const de: Crete2026Copy = {
  meta: {
    title: "Kreta, Sommer 2026 in Zahlen | crete.direct",
    description: "Flughäfen, Airbnb, Busse, Wetter, Brände: die Saison 2026 auf Kreta in Zahlen, viele davon gibt es nur bei crete.direct.",
    headline: "Kreta, Sommer 2026 in Zahlen",
    datasetName: "Kreta, Sommer 2026: Daten der Grafiken",
    datasetDescription: "Datenreihen der Bilanz des Sommers 2026 auf Kreta: monatliche Fluggäste 2023-2026 (HCAA), Sprache von 281.874 Airbnb-Bewertungen, meistgesuchte Busverbindungen auf crete.direct, verbrannte Fläche 2016-2026 (EFFIS), Index der Besuche und Tourismuseinnahmen 2016-2025 (Bank von Griechenland, Eurostat).",
    variables: ["Fluggäste pro Monat", "Sprache der Airbnb-Bewertungen", "Suchen nach Busverbindungen", "verbrannte Fläche", "Index der Besuche und Tourismuseinnahmen"],
  },
  hero: {
    kicker: "crete.direct · Saisonbilanz",
    h1Line: "Sommer 2026",
    h1Pre: "auf ",
    h1Hl: "Kreta",
    lede: "Die Saison in Zahlen, viele davon finden Sie nur bei uns.",
    goat: "Die Kri-Kri-Ziege von crete.direct",
  },
  navLabel: "Kapitel",
  badge: "Exklusiv crete.direct",
  badgeIntro: "Dieses Abzeichen kennzeichnet Zahlen aus den eigenen Erhebungen von crete.direct: Flughafentafeln, Busse in Echtzeit, Routensuchen, Angebote, ausgewertete Bewertungen und Veranstaltungskalender.",
  chapters: [
    {
      id: "venus", nav: "Ankommen", num: "1 · Ankommen", title: "Volles Haus auf der Insel",
      story: "So viele Reisende hatten Kretas Flughäfen mindestens seit 2023 nicht gesehen. Und unsere Sensoren, die alle zehn Minuten die Ankunfts- und Abflugtafeln auslesen, erzählen den Sommer im Detail.",
      facts: [
        { big: "10,5 Mio.", txt: "Fluggäste von Januar bis August, +6 % in einem Jahr.", src: "Griechische Zivilluftfahrtbehörde (HCAA)", feat: true },
        { big: "2,64 Mio.", txt: "Fluggäste im August, der verkehrsreichste Monat seit mindestens 2023.", src: "HCAA" },
        { big: "1 von 5", txt: "internationalen Flugankünften in ganz Griechenland landet auf Kreta.", src: "INSETE, Januar-August 2026" },
        { big: "562", txt: "Flüge an einem einzigen Tag, am Sonntag, dem 23. August: der Sommerrekord in Heraklion und Chania.", src: "von crete.direct erfasste Flughafentafeln", ex: true },
        { big: "+15 %", txt: "mehr Flüge am Sonntag als unter der Woche. Der Dienstag ist der ruhigste Tag.", src: "Flughafentafeln, 28.07. bis 29.09.", ex: true },
        { big: "Tel Aviv", txt: "ist in diesem Sommer der wichtigste ausländische Herkunftsflughafen für Flüge nach Kreta, mit 840 Ankünften.", src: "Flughafentafeln, 28.07. bis 29.09.", ex: true },
        { big: "92 %", txt: "der Passagiere auf Flügen aus Norwegen landen in Chania; 87 % derjenigen auf Flügen aus Frankreich landen in Heraklion.", src: "HCAA, Passagiere nach Herkunftsland des Flugs" },
        { big: "179", txt: "Städte in 42 Ländern waren diesen Sommer per Flug mit Kreta verbunden.", src: "Flughafentafeln", ex: true },
        { big: "20 Min.", txt: "Verspätung im Median bei der Ankunft in Heraklion. Die Morgenflüge sind am pünktlichsten.", src: "Flughafentafeln, Messung alle 10 Min.", ex: true },
      ],
      chart: { key: "passengers", title: "Jeder Monat 2026 übertrifft die Vorjahre", sub: "Fluggäste der kretischen Flughäfen pro Monat", source: "Quelle: Griechische Zivilluftfahrtbehörde (HCAA).", head: ["Monat", "2023", "2024", "2025", "2026"] },
    },
    {
      id: "dormir", nav: "Übernachten", num: "2 · Übernachten", title: "27.333 Airbnb-Inserate",
      story: "Wir haben die Airbnb-Inserate der ganzen Insel ausgewertet und die Sprache von 281.874 Bewertungen seit 2024. Es zeichnet sich eine Kundschaft ab, die immer öfter Deutsch und Französisch spricht.",
      facts: [
        { big: "132.656", txt: "Schlafplätze auf Airbnb im Juni 2026, verteilt auf 27.333 Inserate.", src: "Inside Airbnb, Stand 29.06.2026", feat: true },
        { big: "73", txt: "Inserate pro 1.000 Einwohner im Regionalbezirk Chania, gegenüber 44 auf der ganzen Insel.", src: "Inside Airbnb, ELSTAT-Volkszählung 2021" },
        { big: "17,3 %", txt: "der Bewertungen sind Anfang 2026 auf Deutsch, nach 14,3 % Anfang 2024. Französisch legt ebenfalls zu, Englisch geht zurück.", src: "281.874 von crete.direct ausgewertete Bewertungen", ex: true },
        { big: "23 %", txt: "der Bewertungen sind in Lasithi, im Osten der Insel, auf Französisch verfasst, gegenüber 17 % in Chania.", src: "Bewertungen 2025, ausgewertet von crete.direct", ex: true },
        { big: "132 €", txt: "pro Nacht im Median in Lasithi, gegenüber 163 € in Chania: Der Osten ist 19 % günstiger.", src: "Inside Airbnb, angezeigte Preise im Juni 2026" },
        { big: "20 %", txt: "der Bewertungen eines Jahres entfallen auf den August. Von November bis März sind es kaum 7 %.", src: "Inside Airbnb, Durchschnitt 2023-2025" },
      ],
      chart: { key: "languages", title: "Deutsch und Französisch legen zu, Englisch geht zurück", sub: "Sprache der Airbnb-Bewertungen auf Kreta, Januar-Juni", source: "Quelle: 281.874 Bewertungen, Sprache von crete.direct erkannt. Sprache der Bewertung, nicht Nationalität.", head: ["Sprache", "Jan.-Juni 2024", "Jan.-Juni 2025", "Jan.-Juni 2026"] },
    },
    {
      id: "bouger", nav: "Unterwegs", num: "3 · Unterwegs", title: "Der Bus in letzter Minute",
      story: "Vor Ort ist man mit dem Bus, dem Mietwagen und manchmal mit dem geteilten Van unterwegs. Unsere Daten aus der Praxis zeigen Reisende, die in letzter Minute entscheiden, das Handy in der Hand.",
      facts: [
        { big: "Heraklion → Chania", txt: "ist die meistgesuchte Busverbindung des Sommers, vor Heraklion → Rethymno.", src: "Routenplaner von crete.direct", ex: true, feat: true },
        { big: "63 %", txt: "der Bussuchen betreffen eine Fahrt am selben oder am nächsten Tag.", src: "Routenplaner von crete.direct", ex: true },
        { big: "3 von 4", txt: "Bussuchen erfolgen auf dem Smartphone.", src: "Routenplaner von crete.direct", ex: true },
        { big: "−56 %", txt: "Betrieb bei den Stadtbussen von Heraklion am Sonntag. Unter der Woche keine Verstärkung im Sommer.", src: "von crete.direct verfolgte GPS-Positionen der Busse", ex: true },
        { big: "23 %", txt: "der Stadtbusfahrten in Heraklion übernimmt die Linie 1 zum Flughafen.", src: "von crete.direct verfolgte GPS-Positionen der Busse", ex: true },
        { big: "51 €", txt: "pro Tag kostet ein Mietwagen im Median, und bei derselben Anfrage kostet das teuerste Angebot im Median das 1,66-Fache des günstigsten.", src: "bei crete.direct eingegangene Angebote", ex: true },
        { big: "143", txt: "Kreuzfahrtanläufe in Heraklion von Juli bis Dezember geplant. An jedem fünften Anlauftag kommen zwei oder mehr Schiffe.", src: "Hafenplan von Heraklion, zusammengestellt von crete.direct" },
      ],
      chart: { key: "busRoutes", title: "Die meistgesuchten Busverbindungen", sub: "Besucher, die die jeweilige Strecke gesucht haben, 13.06. bis 29.09.", source: "Quelle: Routenplaner von crete.direct.", head: ["Strecke", "Besucher"] },
    },
    {
      id: "decouvrir", nav: "Entdecken", num: "4 · Entdecken", title: "Was Sie sich angesehen haben",
      story: "Strände, antike Stätten, Dorffeste: Das hat diesen Sommer die Blicke auf sich gezogen.",
      facts: [
        { big: "Agiofarago", txt: "ist der meistaufgerufene Strand auf crete.direct, vor Balos, Almyrida, Elafonisi, Matala.", src: "Strandseiten von crete.direct", ex: true, feat: true },
        { big: "Knossos", txt: "bleibt der meistgelesene kretische Ort auf Wikipedia: 212.944 Seitenaufrufe seit Januar.", src: "Wikimedia, englischsprachig" },
        { big: "981", txt: "Veranstaltungen im Kalender von crete.direct von Juni bis September, allen voran Festivals und Konzerte.", src: "Veranstaltungskalender von crete.direct", ex: true },
        { big: "2.294", txt: "erfasste Orte auf der Insel, darunter 641 Klöster und Einsiedeleien, 475 Strände und 173 Schluchten.", src: "Ortskatalog von crete.direct" },
      ],
    },
    {
      id: "temps", nav: "Wetter", num: "5 · Wie das Wetter war", title: "Ein kühlerer Sommer, ein Jahr der Brände",
      story: "Die Saison war etwas kühler als im Durchschnitt des Jahrzehnts, mit häufigerem Meltemi. Doch 2026 bleibt das Jahr, in dem auf Kreta so viel Fläche brannte wie seit mindestens zehn Jahren nicht mehr.",
      facts: [
        { big: "−0,35 °C", txt: "unter dem Mittel 2016-2025, gemittelt über sechs kretische Städte, von Mai bis September.", src: "ERA5-Reanalyse (Open-Meteo)" },
        { big: "7 Tage", txt: "mit 35 °C oder mehr in Heraklion, gegenüber 13 im Durchschnitt und 18 im Jahr 2025.", src: "ERA5-Reanalyse" },
        { big: "15 Tage", txt: "mit starkem Meltemi im Juli in Heraklion, sonst sind es 11.", src: "ERA5-Reanalyse, Böen ab 50 km/h" },
        { big: "175/177", txt: "Badestellen von der Europäischen Union als ausgezeichnet eingestuft, dazu 154 Strände mit Blauer Flagge.", src: "Europäische Umweltagentur, ΕΕΠΦ" },
        { big: "8.031 ha", txt: "verbrannt im Jahr 2026, das Siebenfache des Durchschnitts des Jahrzehnts. Der Brand von Kria Vrisi und Saktouria am 29. Juli erfasste 5.331 ha und kostete zwei Feuerwehrleute das Leben.", src: "EFFIS (Copernicus)", grave: true },
        { big: "340", txt: "Brandentdeckungen per Satellit vom 29. bis 31. Juli, drei Viertel des ganzen Jahres.", src: "NASA FIRMS, live verfolgt auf crete.direct" },
      ],
      chart: { key: "fires", title: "2026, ein Rekordjahr: 8.031 Hektar verbrannt", sub: "Verbrannte Fläche auf Kreta pro Jahr", source: "Quelle: EFFIS (Copernicus, JRC), Stand 30.09.2026.", head: ["Jahr", "Hektar"] },
    },
    {
      id: "envers", nav: "Die Kehrseite", num: "6 · Die Kehrseite", title: "Mehr Besucher, nicht mehr Geld",
      story: "Die Flughäfen brechen Rekorde, doch die Ausgaben der Besucher halten nicht Schritt. Die Aufenthalte werden kürzer, und Vermietungen über Plattformen gewinnen immer mehr Anteile.",
      facts: [
        { big: "−16,5 %", txt: "Tourismuseinnahmen im ersten Halbjahr, bei +3,3 % Besuchen.", src: "Bank von Griechenland, vorläufige Daten", feat: true },
        { big: "7,7 Nächte", txt: "im Schnitt pro Besuch im Jahr 2025, gegenüber 8,7 im Jahr 2016.", src: "Bank von Griechenland" },
        { big: "684 €", txt: "Ausgaben pro Besuch im Jahr 2025, so viel wie 2016. Inflationsbereinigt sind das 18 % weniger.", src: "Bank von Griechenland, Eurostat" },
        { big: "20 %", txt: "der gewerblichen Übernachtungen wurden 2025 über Airbnb, Booking und andere Plattformen gebucht, doppelt so viele wie 2019.", src: "Eurostat" },
      ],
      chart: { key: "index", title: "Die Besuche steigen, die realen Einnahmen stagnieren", sub: "Index 2016 = 100, Einnahmen in konstanten Euro", source: "Quelle: Bank von Griechenland, Eurostat.", head: ["Jahr", "Besuche", "Reale Einnahmen"] },
    },
    {
      id: "demain", nav: "Morgen", num: "7 · Morgen", title: "Was kommt",
      story: "Zwei Großprojekte werden verändern, wie man nach Kreta kommt und sich auf der Insel bewegt.",
      facts: [
        { big: "2028", txt: "geplante Eröffnung des neuen Flughafens Kastelli, ausgelegt für bis zu 15 Millionen Passagiere pro Jahr. Baufortschritt 70 % im Mai 2026.", src: "Konzessionär GEK TERNA", feat: true },
        { big: "157 km", txt: "Nordautobahn zwischen Chania und Heraklion, Fertigstellung für 2030 angestrebt.", src: "Gesetz 5204/2025, GEK TERNA" },
        { big: "10 km", txt: "Autobahn am 30. September zwischen Neapoli und Agios Nikolaos eröffnet, Fertigstellung im Oktober 2027 geplant.", src: "griechisches Infrastrukturministerium, kretische Presse" },
      ],
    },
  ],
  method: {
    id: "methode", nav: "Unsere Daten", num: "Unsere Daten",
    title: "Was crete.direct misst und Sie nirgendwo sonst finden",
    storyBefore: "Dieser Bericht verbindet die bis zum 30. September 2026 veröffentlichten amtlichen Statistiken mit den Daten, die crete.direct täglich erhebt. Die mit ",
    storyAfter: " markierten Zahlen stammen aus unseren eigenen Erhebungen.",
    items: [
      ["Die Flughafentafeln", "Ankünfte und Abflüge in Heraklion und Chania, alle 10 Minuten erfasst und mit den amtlichen Zahlen abgeglichen, auf weniger als 1 % genau."],
      ["Die Busse in Echtzeit", "GPS-Positionen der Stadtbusse von Heraklion, Chania und Agios Nikolaos."],
      ["Die gesuchten Strecken", "6.800 Suchen nach Busverbindungen seit Juni."],
      ["Die Mietwagenangebote", "264 Angebote lokaler Vermieter, für Reisende verglichen."],
      ["Die Airbnb-Bewertungen", "281.874 Bewertungen, deren Sprache erkannt wurde."],
      ["Kalender und Nachrichten", "981 Veranstaltungen im Sommer und 40.946 kretische Nachrichten, thematisch eingeordnet."],
      ["Die Brände", "Satellitendaten der NASA, seit dem 29. Juli live verfolgt und kartiert."],
    ],
    note: "Amtliche Quellen: Griechische Zivilluftfahrtbehörde (HCAA), INSETE, Bank von Griechenland, Eurostat, ELSTAT, Inside Airbnb, Europäische Umweltagentur, EFFIS und Copernicus, NASA FIRMS, Open-Meteo (ERA5-Reanalyse), NOAA, Wikimedia, Hafen Heraklion. Die Septemberdaten sind noch nicht vollständig veröffentlicht. Eine Bewertung ist kein Aufenthalt, und das Herkunftsland eines Flugs ist nicht die Nationalität seiner Passagiere.",
    cta: "Sie haben den Sommer auf Kreta verbracht? Sagen Sie uns, was crete.direct für 2027 verbessern soll:",
    copy: "Adresse kopieren", copied: "Adresse kopiert", selected: "Adresse markiert",
  },
  published: "Der praktische Kreta-Reiseführer · Bilanz veröffentlicht am 30. September 2026",
  seeData: "Daten anzeigen",
  months: ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."],
  languages: ["Englisch", "Französisch", "Deutsch", "Griechisch", "Italienisch", "Niederländisch"],
  period: (y) => `Jan.-Juni ${y}`,
  places: { heraklion: "Heraklion", chania: "Chania", rethymno: "Rethymno", agiosNikolaos: "Agios Nikolaos", hersonissos: "Chersonissos", malia: "Malia", chaniaAirport: "Flughafen Chania" },
  series: { visits: "Besuche", receipts: "Einnahmen (konstante Euro)" },
  units: { passengers: "Fluggäste", visitors: "Besucher", ha: "ha" },
  millionSuffix: " Mio.",
};

const el: Crete2026Copy = {
  meta: {
    title: "Κρήτη, καλοκαίρι 2026 σε αριθμούς | crete.direct",
    description: "Αεροδρόμια, Airbnb, λεωφορεία, καιρός, πυρκαγιές: η σεζόν 2026 στην Κρήτη σε αριθμούς, πολλοί από τους οποίους υπάρχουν μόνο στο crete.direct.",
    headline: "Κρήτη, καλοκαίρι 2026 σε αριθμούς",
    datasetName: "Κρήτη, καλοκαίρι 2026: δεδομένα των γραφημάτων",
    datasetDescription: "Οι σειρές δεδομένων του απολογισμού του καλοκαιριού 2026 στην Κρήτη: μηνιαίοι επιβάτες αεροδρομίων 2023-2026 (ΥΠΑ), γλώσσα 281.874 κριτικών Airbnb, οι πιο αναζητημένες διαδρομές λεωφορείου στο crete.direct, καμένες εκτάσεις 2016-2026 (EFFIS), δείκτης επισκέψεων και τουριστικών εισπράξεων 2016-2025 (Τράπεζα της Ελλάδος, Eurostat).",
    variables: ["επιβάτες αεροδρομίων ανά μήνα", "γλώσσα των κριτικών Airbnb", "αναζητήσεις διαδρομών λεωφορείου", "καμένες εκτάσεις", "δείκτης επισκέψεων και τουριστικών εισπράξεων"],
  },
  hero: {
    kicker: "crete.direct · απολογισμός σεζόν",
    h1Line: "Καλοκαίρι 2026",
    h1Pre: "στην ",
    h1Hl: "Κρήτη",
    lede: "Τα νούμερα της σεζόν, πολλά από τα οποία θα βρείτε μόνο εδώ.",
    goat: "Το κρι-κρι του crete.direct",
  },
  navLabel: "Κεφάλαια",
  badge: "Αποκλειστικό crete.direct",
  badgeIntro: "Αυτό το σήμα επισημαίνει τα νούμερα που προέρχονται από τις καταγραφές του crete.direct: πίνακες πτήσεων των αεροδρομίων, λεωφορεία σε πραγματικό χρόνο, αναζητήσεις διαδρομών, προσφορές, αναλυμένες κριτικές και ατζέντα εκδηλώσεων.",
  chapters: [
    {
      id: "venus", nav: "Άφιξη", num: "1 · Άφιξη", title: "Ένα νησί γεμάτο κόσμο",
      story: "Τα αεροδρόμια της Κρήτης δεν είχαν δει τόσους ταξιδιώτες τουλάχιστον από το 2023. Και οι αισθητήρες μας, που διαβάζουν τους πίνακες αφίξεων και αναχωρήσεων κάθε δέκα λεπτά, αφηγούνται το καλοκαίρι με κάθε λεπτομέρεια.",
      facts: [
        { big: "10,5 εκ.", txt: "επιβάτες αεροπορικώς από τον Ιανουάριο έως τον Αύγουστο, +6% σε έναν χρόνο.", src: "Υπηρεσία Πολιτικής Αεροπορίας (ΥΠΑ)", feat: true },
        { big: "2,64 εκ.", txt: "επιβάτες τον Αύγουστο, ο πιο πολυσύχναστος μήνας τουλάχιστον από το 2023.", src: "ΥΠΑ" },
        { big: "1 στις 5", txt: "διεθνείς αεροπορικές αφίξεις σε όλη την Ελλάδα γίνεται στην Κρήτη.", src: "ΙΝΣΕΤΕ, Ιανουάριος-Αύγουστος 2026" },
        { big: "562", txt: "πτήσεις σε μία μέρα, την Κυριακή 23 Αυγούστου: το ρεκόρ του καλοκαιριού σε Ηράκλειο και Χανιά.", src: "πίνακες πτήσεων των αεροδρομίων, καταγραφή crete.direct", ex: true },
        { big: "+15%", txt: "περισσότερες πτήσεις την Κυριακή σε σχέση με τις καθημερινές. Η Τρίτη είναι η πιο ήσυχη μέρα.", src: "πίνακες πτήσεων, 28/07 έως 29/09", ex: true },
        { big: "Τελ Αβίβ", txt: "είναι το πρώτο ξένο αεροδρόμιο προέλευσης των πτήσεων προς την Κρήτη αυτό το καλοκαίρι, με 840 αφίξεις.", src: "πίνακες πτήσεων, 28/07 έως 29/09", ex: true },
        { big: "92%", txt: "των επιβατών των πτήσεων από τη Νορβηγία φτάνουν στα Χανιά· το 87% όσων ταξιδεύουν με πτήσεις από τη Γαλλία φτάνουν στο Ηράκλειο.", src: "ΥΠΑ, επιβάτες ανά χώρα προέλευσης της πτήσης" },
        { big: "179", txt: "πόλεις σε 42 χώρες συνδέθηκαν αεροπορικώς με την Κρήτη αυτό το καλοκαίρι.", src: "πίνακες πτήσεων", ex: true },
        { big: "20 λεπτά", txt: "διάμεση καθυστέρηση στις αφίξεις του Ηρακλείου. Οι πρωινές πτήσεις είναι οι πιο συνεπείς.", src: "πίνακες πτήσεων, μέτρηση κάθε 10 λεπτά", ex: true },
      ],
      chart: { key: "passengers", title: "Κάθε μήνας του 2026 ξεπερνά τις προηγούμενες χρονιές", sub: "Επιβάτες των αεροδρομίων της Κρήτης ανά μήνα", source: "Πηγή: Υπηρεσία Πολιτικής Αεροπορίας (ΥΠΑ).", head: ["Μήνας", "2023", "2024", "2025", "2026"] },
    },
    {
      id: "dormir", nav: "Διαμονή", num: "2 · Διαμονή", title: "27.333 καταχωρίσεις Airbnb",
      story: "Αναλύσαμε τις καταχωρίσεις Airbnb σε όλο το νησί και τη γλώσσα 281.874 κριτικών που γράφτηκαν από το 2024. Διαγράφεται μια πελατεία που μιλά όλο και περισσότερο γερμανικά και γαλλικά.",
      facts: [
        { big: "132.656", txt: "θέσεις φιλοξενίας στο Airbnb τον Ιούνιο του 2026, σε 27.333 καταχωρίσεις.", src: "Inside Airbnb, στοιχεία 29/06/2026", feat: true },
        { big: "73", txt: "καταχωρίσεις ανά 1.000 κατοίκους στον νομό Χανίων, έναντι 44 σε όλο το νησί.", src: "Inside Airbnb, απογραφή ΕΛΣΤΑΤ 2021" },
        { big: "17,3%", txt: "των κριτικών είναι στα γερμανικά στις αρχές του 2026, έναντι 14,3% στις αρχές του 2024. Τα γαλλικά ανεβαίνουν επίσης, τα αγγλικά υποχωρούν.", src: "281.874 κριτικές, ανάλυση crete.direct", ex: true },
        { big: "23%", txt: "των κριτικών είναι γραμμένες στα γαλλικά στο Λασίθι, στα ανατολικά του νησιού, έναντι 17% στα Χανιά.", src: "κριτικές 2025, ανάλυση crete.direct", ex: true },
        { big: "132 €", txt: "τη βραδιά (διάμεση τιμή) στο Λασίθι, έναντι 163 € στα Χανιά: η ανατολική Κρήτη είναι 19% φθηνότερη.", src: "Inside Airbnb, αναρτημένες τιμές Ιουνίου 2026" },
        { big: "20%", txt: "των κριτικών της χρονιάς γράφονται τον Αύγουστο. Από τον Νοέμβριο έως τον Μάρτιο, μόλις 7%.", src: "Inside Airbnb, μέσος όρος 2023-2025" },
      ],
      chart: { key: "languages", title: "Τα γερμανικά και τα γαλλικά ανεβαίνουν, τα αγγλικά υποχωρούν", sub: "Γλώσσα των κριτικών Airbnb στην Κρήτη, Ιανουάριος-Ιούνιος", source: "Πηγή: 281.874 κριτικές, αναγνώριση γλώσσας από το crete.direct. Γλώσσα της κριτικής, όχι εθνικότητα.", head: ["Γλώσσα", "Ιαν.-Ιουν. 2024", "Ιαν.-Ιουν. 2025", "Ιαν.-Ιουν. 2026"] },
    },
    {
      id: "bouger", nav: "Μετακινήσεις", num: "3 · Μετακινήσεις", title: "Λεωφορείο την τελευταία στιγμή",
      story: "Στο νησί, οι επισκέπτες μετακινούνται με λεωφορείο, με ενοικιαζόμενο αυτοκίνητο και μερικές φορές με κοινόχρηστο βαν. Τα δεδομένα μας από το πεδίο δείχνουν έναν ταξιδιώτη που αποφασίζει την τελευταία στιγμή, με το κινητό στο χέρι.",
      facts: [
        { big: "Ηράκλειο → Χανιά", txt: "είναι η πιο αναζητημένη διαδρομή λεωφορείου του καλοκαιριού, πριν από τη διαδρομή Ηράκλειο → Ρέθυμνο.", src: "σχεδιαστής διαδρομών crete.direct", ex: true, feat: true },
        { big: "63%", txt: "των αναζητήσεων λεωφορείου αφορούν διαδρομή την ίδια μέρα ή την επόμενη.", src: "σχεδιαστής διαδρομών crete.direct", ex: true },
        { big: "3 στις 4", txt: "αναζητήσεις λεωφορείου γίνονται από κινητό.", src: "σχεδιαστής διαδρομών crete.direct", ex: true },
        { big: "−56%", txt: "δραστηριότητα για τα αστικά λεωφορεία του Ηρακλείου την Κυριακή. Καμία καλοκαιρινή ενίσχυση τις καθημερινές.", src: "θέσεις GPS των λεωφορείων, παρακολούθηση crete.direct", ex: true },
        { big: "23%", txt: "των αστικών δρομολογίων του Ηρακλείου εκτελούνται από τη γραμμή 1 του αεροδρομίου.", src: "θέσεις GPS των λεωφορείων, παρακολούθηση crete.direct", ex: true },
        { big: "51 €", txt: "την ημέρα για ενοικιαζόμενο αυτοκίνητο (διάμεση τιμή), και, για το ίδιο αίτημα, η ακριβότερη προσφορά κοστίζει 1,66 φορές όσο η φθηνότερη (διάμεση τιμή).", src: "προσφορές που έλαβε το crete.direct", ex: true },
        { big: "143", txt: "προσεγγίσεις κρουαζιερόπλοιων προγραμματισμένες στο Ηράκλειο από τον Ιούλιο έως τον Δεκέμβριο. Σε μία στις πέντε ημέρες προσέγγισης φτάνουν δύο ή περισσότερα πλοία.", src: "πρόγραμμα του λιμανιού Ηρακλείου, επεξεργασία crete.direct" },
      ],
      chart: { key: "busRoutes", title: "Οι πιο αναζητημένες διαδρομές λεωφορείου", sub: "Επισκέπτες που αναζήτησαν κάθε διαδρομή, 13/06 έως 29/09", source: "Πηγή: σχεδιαστής διαδρομών του crete.direct.", head: ["Διαδρομή", "Επισκέπτες"] },
    },
    {
      id: "decouvrir", nav: "Εξερεύνηση", num: "4 · Εξερεύνηση", title: "Τι είδατε",
      story: "Παραλίες, αρχαιολογικοί χώροι, πανηγύρια: αυτά τράβηξαν τα βλέμματα φέτος το καλοκαίρι.",
      facts: [
        { big: "Αγιοφάραγγο", txt: "είναι η παραλία με τις περισσότερες προβολές στο crete.direct, πριν από τον Μπάλο, την Αλμυρίδα, το Ελαφονήσι και τα Μάταλα.", src: "σελίδες παραλιών του crete.direct", ex: true, feat: true },
        { big: "Κνωσός", txt: "παραμένει ο πιο διαβασμένος κρητικός τόπος στη Wikipedia: 212.944 προβολές σελίδας από τον Ιανουάριο.", src: "Wikimedia, αγγλόφωνη έκδοση" },
        { big: "981", txt: "εκδηλώσεις καταγράφηκαν στην ατζέντα του crete.direct από τον Ιούνιο έως τον Σεπτέμβριο, με πρώτα τα φεστιβάλ και τις συναυλίες.", src: "ατζέντα crete.direct", ex: true },
        { big: "2.294", txt: "τοποθεσίες καταγεγραμμένες στο νησί, ανάμεσά τους 641 μοναστήρια και ασκηταριά, 475 παραλίες και 173 φαράγγια.", src: "κατάλογος τοποθεσιών του crete.direct" },
      ],
    },
    {
      id: "temps", nav: "Καιρός", num: "5 · Ο καιρός που έκανε", title: "Ένα πιο δροσερό καλοκαίρι, μια χρονιά πυρκαγιών",
      story: "Η σεζόν ήταν λίγο λιγότερο ζεστή από τον μέσο όρο της δεκαετίας, με πιο έντονο μελτέμι. Όμως το 2026 θα μείνει ως η χρονιά που κάηκαν στην Κρήτη οι μεγαλύτερες εκτάσεις εδώ και τουλάχιστον δέκα χρόνια.",
      facts: [
        { big: "−0,35 °C", txt: "κάτω από τον μέσο όρο 2016-2025, κατά μέσο όρο σε έξι κρητικές πόλεις, από τον Μάιο έως τον Σεπτέμβριο.", src: "επανανάλυση ERA5 (Open-Meteo)" },
        { big: "7 ημέρες", txt: "με 35 °C ή περισσότερο στο Ηράκλειο, έναντι 13 κατά μέσο όρο και 18 το 2025.", src: "επανανάλυση ERA5" },
        { big: "15 ημέρες", txt: "με δυνατό μελτέμι τον Ιούλιο στο Ηράκλειο, έναντι 11 συνήθως.", src: "επανανάλυση ERA5, ριπές 50 km/h και άνω" },
        { big: "175/177", txt: "ακτές κολύμβησης χαρακτηρίστηκαν Εξαιρετικές από την Ευρωπαϊκή Ένωση, και 154 παραλίες έχουν Γαλάζια Σημαία.", src: "Ευρωπαϊκός Οργανισμός Περιβάλλοντος, ΕΕΠΦ" },
        { big: "8.031 ha", txt: "κάηκαν το 2026, 7 φορές ο μέσος όρος της δεκαετίας. Η πυρκαγιά σε Κρύα Βρύση και Σακτούρια, στις 29 Ιουλίου, έκαψε 5.331 εκτάρια και στοίχισε τη ζωή σε δύο πυροσβέστες.", src: "EFFIS (Copernicus)", grave: true },
        { big: "340", txt: "δορυφορικές ανιχνεύσεις πυρκαγιάς καταγράφηκαν από τις 29 έως τις 31 Ιουλίου, τα τρία τέταρτα της χρονιάς.", src: "NASA FIRMS, ζωντανή παρακολούθηση στο crete.direct" },
      ],
      chart: { key: "fires", title: "2026, χρονιά-ρεκόρ: 8.031 εκτάρια καμένα", sub: "Καμένες εκτάσεις στην Κρήτη ανά έτος", source: "Πηγή: EFFIS (Copernicus, JRC), έως 30/09/2026.", head: ["Έτος", "Εκτάρια"] },
    },
    {
      id: "envers", nav: "Η άλλη όψη", num: "6 · Η άλλη όψη", title: "Περισσότεροι επισκέπτες, όχι περισσότερα χρήματα",
      story: "Τα αεροδρόμια σπάνε ρεκόρ, όμως οι δαπάνες των επισκεπτών δεν ακολουθούν. Οι διαμονές μικραίνουν και οι μισθώσεις μέσω πλατφορμών κερδίζουν όλο και μεγαλύτερο μερίδιο.",
      facts: [
        { big: "−16,5%", txt: "στις τουριστικές εισπράξεις το πρώτο εξάμηνο, με +3,3% στις επισκέψεις.", src: "Τράπεζα της Ελλάδος, προσωρινά στοιχεία", feat: true },
        { big: "7,7 νύχτες", txt: "κατά μέσο όρο ανά επίσκεψη το 2025, έναντι 8,7 το 2016.", src: "Τράπεζα της Ελλάδος" },
        { big: "684 €", txt: "δαπάνη ανά επίσκεψη το 2025, όση και το 2016. Αν αφαιρεθεί ο πληθωρισμός, είναι 18% λιγότερα.", src: "Τράπεζα της Ελλάδος, Eurostat" },
        { big: "20%", txt: "των διανυκτερεύσεων σε καταλύματα κρατήθηκε μέσω Airbnb, Booking και άλλων πλατφορμών το 2025, διπλάσιο ποσοστό από το 2019.", src: "Eurostat" },
      ],
      chart: { key: "index", title: "Οι επισκέψεις ανεβαίνουν, οι πραγματικές εισπράξεις μένουν στάσιμες", sub: "Δείκτης με βάση το 2016 = 100, εισπράξεις σε σταθερές τιμές", source: "Πηγή: Τράπεζα της Ελλάδος, Eurostat.", head: ["Έτος", "Επισκέψεις", "Πραγματικές εισπράξεις"] },
    },
    {
      id: "demain", nav: "Αύριο", num: "7 · Αύριο", title: "Τι έρχεται",
      story: "Δύο μεγάλα έργα θα αλλάξουν τον τρόπο που φτάνει κανείς στην Κρήτη και κινείται στο νησί.",
      facts: [
        { big: "2028", txt: "προγραμματισμένα εγκαίνια του νέου αεροδρομίου στο Καστέλι, σχεδιασμένου για έως 15 εκατομμύρια επιβάτες τον χρόνο. Τα έργα είχαν προχωρήσει κατά 70% τον Μάιο του 2026.", src: "παραχωρησιούχος ΓΕΚ ΤΕΡΝΑ", feat: true },
        { big: "157 km", txt: "αυτοκινητόδρομου ΒΟΑΚ μεταξύ Χανίων και Ηρακλείου, με στόχο την παράδοση το 2030.", src: "ν. 5204/2025, ΓΕΚ ΤΕΡΝΑ" },
        { big: "10 km", txt: "αυτοκινητόδρομου δόθηκαν στην κυκλοφορία στις 30 Σεπτεμβρίου μεταξύ Νεάπολης και Αγίου Νικολάου, με ολοκλήρωση τον Οκτώβριο του 2027.", src: "Υπουργείο Υποδομών, κρητικός Τύπος" },
      ],
    },
  ],
  method: {
    id: "methode", nav: "Τα δεδομένα μας", num: "Τα δεδομένα μας",
    title: "Τι μετράει το crete.direct, και δεν θα το βρείτε πουθενά αλλού",
    storyBefore: "Η έκθεση αυτή διασταυρώνει τις επίσημες στατιστικές που είχαν δημοσιευτεί έως τις 30 Σεπτεμβρίου 2026 με τα δεδομένα που συλλέγει καθημερινά το crete.direct. Τα νούμερα με την ένδειξη ",
    storyAfter: " προέρχονται από τις δικές μας καταγραφές.",
    items: [
      ["Οι πίνακες των αεροδρομίων", "αφίξεις και αναχωρήσεις σε Ηράκλειο και Χανιά, καταγεγραμμένες κάθε 10 λεπτά και ελεγμένες με τα επίσημα στοιχεία, με απόκλιση κάτω του 1%."],
      ["Τα λεωφορεία σε πραγματικό χρόνο", "θέσεις GPS των αστικών λεωφορείων σε Ηράκλειο, Χανιά και Άγιο Νικόλαο."],
      ["Οι αναζητήσεις διαδρομών", "6.800 αναζητήσεις δρομολογίων λεωφορείου από τον Ιούνιο."],
      ["Οι προσφορές ενοικίασης", "264 προσφορές τοπικών εταιρειών ενοικίασης, συγκριμένες για λογαριασμό ταξιδιωτών."],
      ["Οι κριτικές Airbnb", "281.874 κριτικές με αναγνωρισμένη γλώσσα."],
      ["Ατζέντα και ειδήσεις", "981 καλοκαιρινές εκδηλώσεις και 40.946 κρητικές ειδήσεις ταξινομημένες."],
      ["Οι πυρκαγιές", "δορυφορικές ανιχνεύσεις της NASA, με ζωντανή παρακολούθηση και χαρτογράφηση από τις 29 Ιουλίου."],
    ],
    note: "Επίσημες πηγές: Υπηρεσία Πολιτικής Αεροπορίας (ΥΠΑ), ΙΝΣΕΤΕ, Τράπεζα της Ελλάδος, Eurostat, ΕΛΣΤΑΤ, Inside Airbnb, Ευρωπαϊκός Οργανισμός Περιβάλλοντος, EFFIS και Copernicus, NASA FIRMS, Open-Meteo (επανανάλυση ERA5), NOAA, Wikimedia, λιμάνι Ηρακλείου. Τα στοιχεία του Σεπτεμβρίου δεν έχουν δημοσιευτεί ακόμη όλα. Μια κριτική δεν είναι διαμονή, και η χώρα προέλευσης μιας πτήσης δεν είναι η εθνικότητα των επιβατών της.",
    cta: "Περάσατε το καλοκαίρι στην Κρήτη; Πείτε μας τι να βελτιώσει το crete.direct για το 2027:",
    copy: "Αντιγραφή διεύθυνσης", copied: "Η διεύθυνση αντιγράφηκε", selected: "Η διεύθυνση επιλέχθηκε",
  },
  published: "Ο πρακτικός οδηγός της Κρήτης · απολογισμός που δημοσιεύτηκε στις 30 Σεπτεμβρίου 2026",
  seeData: "Δείτε τα δεδομένα",
  months: ["Ιαν.", "Φεβ.", "Μαρ.", "Απρ.", "Μάι.", "Ιούν.", "Ιούλ.", "Αύγ.", "Σεπ.", "Οκτ.", "Νοέ.", "Δεκ."],
  languages: ["αγγλικά", "γαλλικά", "γερμανικά", "ελληνικά", "ιταλικά", "ολλανδικά"],
  period: (y) => `Ιαν.-Ιουν. ${y}`,
  places: { heraklion: "Ηράκλειο", chania: "Χανιά", rethymno: "Ρέθυμνο", agiosNikolaos: "Άγιος Νικόλαος", hersonissos: "Χερσόνησος", malia: "Μάλια", chaniaAirport: "Αεροδρόμιο Χανίων" },
  series: { visits: "Επισκέψεις", receipts: "Εισπράξεις (σταθερές τιμές)" },
  units: { passengers: "επιβάτες", visitors: "επισκέπτες", ha: "ha" },
  millionSuffix: " εκ.",
};

export const CRETE_2026_COPY: Record<C26Locale, Crete2026Copy> = { fr, en, de, el };
