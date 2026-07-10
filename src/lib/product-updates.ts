export type UpdateCategory =
  | "transport"
  | "beaches"
  | "activities"
  | "car"
  | "explore"
  | "app"
  | "data";

export type UpdateStatus = "live" | "waiting" | "planned";

type Localized = {
  en: string;
  fr: string;
};

export type ProductUpdate = {
  id: string;
  date: string;
  category: UpdateCategory;
  status: UpdateStatus;
  title: Localized;
  summary: Localized;
  detail: Localized;
  href?: string;
  impact: Localized;
};

export const UPDATE_CATEGORY_LABELS: Record<UpdateCategory, Localized> = {
  transport: { en: "Transport", fr: "Transport" },
  beaches: { en: "Beaches", fr: "Plages" },
  activities: { en: "Activities", fr: "Activités" },
  car: { en: "Car rental", fr: "Voiture" },
  explore: { en: "Explore", fr: "Explorer" },
  app: { en: "App", fr: "App" },
  data: { en: "Live data", fr: "Données live" },
};

export const UPDATE_STATUS_LABELS: Record<UpdateStatus, Localized> = {
  live: { en: "Live", fr: "Live" },
  waiting: { en: "Waiting for deploy", fr: "En attente de déploiement" },
  planned: { en: "In preparation", fr: "En préparation" },
};

export const PRODUCT_UPDATES: ProductUpdate[] = [
  {
    id: "retention-measurement",
    date: "2026-07-10",
    category: "app",
    status: "live",
    title: {
      en: "Return-visit measurement for the future app",
      fr: "Mesure de retour visiteur pour la future app",
    },
    summary: {
      en: "Crete Direct now measures real multi-day return visits before building the app shell.",
      fr: "Crete Direct mesure maintenant les retours réels sur plusieurs jours avant de construire l'app.",
    },
    detail: {
      en: "The measurement stays browser-local and sends only aggregate Plausible properties such as the return bucket and visit number.",
      fr: "La mesure reste locale au navigateur et n'envoie que des propriétés agrégées dans Plausible, comme le bucket de retour et le numéro de visite.",
    },
    impact: {
      en: "Better go/no-go decisions for app features.",
      fr: "Décisions plus propres avant d'investir dans les fonctions app.",
    },
  },
  {
    id: "car-insurance-quotes",
    date: "2026-07-10",
    category: "car",
    status: "live",
    title: {
      en: "Clearer insurance details in car quotes",
      fr: "Assurance plus claire dans les devis voiture",
    },
    summary: {
      en: "Car rental quotes now show the insurance type, excess and zero-excess option more clearly.",
      fr: "Les devis de location voiture affichent maintenant plus clairement le type d'assurance, la franchise et l'option zéro franchise.",
    },
    detail: {
      en: "The quote flow is aligned with what the car-rental page already promises: excess confirmed in the quote, with zero-excess options when available.",
      fr: "Le flux devis est aligné avec ce que la page voiture promet déjà : franchise confirmée au devis, avec option zéro franchise quand disponible.",
    },
    href: "/car-rental",
    impact: {
      en: "Less ambiguity before choosing a local rental partner.",
      fr: "Moins d'ambiguïté avant de choisir un loueur local.",
    },
  },
  {
    id: "swim-near-nowpanel",
    date: "2026-07-10",
    category: "app",
    status: "live",
    title: {
      en: "Best beaches near you, right now",
      fr: "Les meilleures plages près de toi, maintenant",
    },
    summary: {
      en: "The Explore panel now shows the top 3 swimmable beaches truly close to your position, using live sea conditions.",
      fr: "Le panneau Explorer affiche maintenant le top 3 des plages baignables vraiment proches de ta position, avec les conditions mer du moment.",
    },
    detail: {
      en: "Instead of island-wide suggestions, the panel ranks beaches within a realistic radius of where you are, so the first result is actually reachable today.",
      fr: "Au lieu de suggestions à l'échelle de l'île, le panneau classe les plages dans un rayon réaliste autour de toi, pour que le premier résultat soit vraiment atteignable aujourd'hui.",
    },
    href: "/explore",
    impact: {
      en: "Beach picks you can actually reach within the hour.",
      fr: "Des plages qu'on peut vraiment rejoindre dans l'heure.",
    },
  },
  {
    id: "citybus-bidirectional-planner",
    date: "2026-07-10",
    category: "transport",
    status: "live",
    title: {
      en: "Bus planner now understands opposite-side stops",
      fr: "Le planificateur bus comprend les arrêts du sens opposé",
    },
    summary: {
      en: "The planner now checks nearby paired stops, so more Heraklion and Chania city-bus routes are found.",
      fr: "Le planificateur vérifie maintenant les arrêts jumeaux proches, ce qui trouve plus d'itinéraires à Héraklion et La Canée.",
    },
    detail: {
      en: "This improves real-world planning when the return stop is across the road or listed as a separate direction.",
      fr: "Cela améliore les trajets réels quand l'arrêt retour est de l'autre côté de la rue ou listé comme une direction séparée.",
    },
    href: "/buses",
    impact: {
      en: "Fewer false 'no route found' answers.",
      fr: "Moins de faux résultats « aucun itinéraire trouvé ».",
    },
  },
  {
    id: "beach-live-data",
    date: "2026-07-10",
    category: "beaches",
    status: "live",
    title: {
      en: "Beach pages now combine buses, sea conditions and quiet alternatives",
      fr: "Les pages plages croisent bus, conditions mer et alternatives calmes",
    },
    summary: {
      en: "Beach pages now surface practical live context: how to get there, today's sea conditions, crowd pressure and calmer nearby options.",
      fr: "Les pages plages affichent maintenant du contexte utile : accès, conditions du jour, affluence probable et alternatives plus calmes.",
    },
    detail: {
      en: "The goal is to make each beach page useful on the day of the visit, not only as a static guide.",
      fr: "Le but est que chaque page plage serve le jour même, pas seulement comme guide statique.",
    },
    href: "/beaches",
    impact: {
      en: "Better beach choices during wind, heat or crowded days.",
      fr: "De meilleurs choix de plage quand il y a du vent, de la chaleur ou trop de monde.",
    },
  },
  {
    id: "activities-direct",
    date: "2026-07-09",
    category: "activities",
    status: "live",
    title: {
      en: "Activity quote flow for local providers",
      fr: "Devis activités avec prestataires locaux",
    },
    summary: {
      en: "Crete Direct now has a dedicated flow for requesting local activity quotes.",
      fr: "Crete Direct dispose maintenant d'un flux dédié pour demander des devis d'activités locales.",
    },
    detail: {
      en: "The experience is designed around local providers, direct requests and clear categories instead of generic activity listings.",
      fr: "L'expérience est pensée autour des prestataires locaux, des demandes directes et de catégories claires, plutôt qu'une simple liste générique.",
    },
    href: "/activities",
    impact: {
      en: "More direct access to real local experiences.",
      fr: "Un accès plus direct à de vraies expériences locales.",
    },
  },
  {
    id: "explore-v2",
    date: "2026-07-09",
    category: "explore",
    status: "live",
    title: {
      en: "Explore map made faster and more complete",
      fr: "Carte Explorer plus rapide et plus complète",
    },
    summary: {
      en: "The Explore section now has stronger data coverage, better page structure and more useful links into activities and places.",
      fr: "La section Explorer a maintenant une meilleure couverture data, une structure plus solide et plus de liens utiles vers activités et lieux.",
    },
    detail: {
      en: "It is becoming the practical map layer of Crete Direct: places, beaches, routes and next actions in one flow.",
      fr: "Elle devient la couche carte pratique de Crete Direct : lieux, plages, trajets et actions utiles dans un même parcours.",
    },
    href: "/explore",
    impact: {
      en: "Easier discovery from map to action.",
      fr: "Découverte plus fluide, de la carte à l'action.",
    },
  },
];

export function updateText(value: Localized, locale: string): string {
  return locale === "fr" ? value.fr : value.en;
}

export function sortedProductUpdates() {
  return [...PRODUCT_UPDATES].sort((a, b) => b.date.localeCompare(a.date));
}
