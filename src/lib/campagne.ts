export type RoadVariant = "mobile" | "desktop";
export const DESKTOP_MIN = 1024;

export function pickRoadVariant(width: number): RoadVariant {
  return width >= DESKTOP_MIN ? "desktop" : "mobile";
}

const BASE_URL = "https://crete.direct";
export const SLUG = "/projet";
export function buildShareUrl(locale: string): string {
  return `${BASE_URL}/${locale}${SLUG}`;
}

export type Beat = {
  id: string;
  kicker?: string;
  title?: string;        // optionnel : un beat peut n'avoir qu'un sous-titre (ex. demain)
  sub?: string;
  side: "center" | "left" | "right";
};
export type CampagneCopy = {
  meta: { title: string; description: string };
  hero: { kicker: string; title: string; sub: string };
  beats: Beat[];
  cta: { title: string; micro: string };
  buttons: { instagram: string; facebook: string; share: string; help: string };
};

/** Config NON localisee par beat : quelle scene illustree, quel badge emoji, et
 *  la variante de couleur du kicker pill. Le rendu (composant Scene) est cable
 *  dans ParcoursClient ; ici on ne garde que les donnees serialisables. */
export type KickerVariant = "terracotta" | "go" | "calm";
export type BeatConfig = {
  scene: "terminal" | "busStop" | "signpost" | "phoneLive" | "summit" | "app" | "community";
  tag?: string;            // badge emoji optionnel
  kickerVariant: KickerVariant;
  layout: "row" | "center"; // row = scene + card cote a cote (alternee) ; center = pleine largeur
  flip?: boolean;          // row : scene a droite au lieu de gauche (alternance)
};
export const HERO_SCENE = "terminal" as const;
export const HERO_KICKER_VARIANT: KickerVariant = "go";
export const BEAT_CONFIG: Record<string, BeatConfig> = {
  probleme: { scene: "busStop", tag: "⏳", kickerVariant: "terracotta", layout: "row" },
  carte: { scene: "signpost", tag: "🗺️", kickerVariant: "go", layout: "row", flip: true },
  direct: { scene: "phoneLive", tag: "⚡", kickerVariant: "terracotta", layout: "row" },
  marque: { scene: "summit", kickerVariant: "calm", layout: "center" },
  demain: { scene: "app", tag: "📱", kickerVariant: "go", layout: "row", flip: true },
  aide: { scene: "community", tag: "🫶", kickerVariant: "terracotta", layout: "row" },
};

const FR: CampagneCopy = {
  meta: {
    title: "Notre projet · crete.direct",
    description: "L'histoire de crete.direct, le bus en Crète enfin clair. Un projet indépendant et gratuit. Aide-nous à continuer.",
  },
  hero: { kicker: "le parcours", title: "Coucou ! Moi, c'est <hl>Kriri</hl>.", sub: "Je prends le bus partout en Crète. Viens, je te montre." },
  beats: [
    { id: "probleme", kicker: "au début", side: "left", title: "Avant, c'était un peu compliqué.", sub: "Les horaires sont souvent répartis entre plusieurs sources. On ne sait pas toujours quelle information est la bonne. Alors on attend, et on espère." },
    { id: "carte", kicker: "l'idée", side: "right", title: "Alors, on a eu une idée.<br>Tout mettre sur <hl>une seule carte</hl>." },
    { id: "direct", kicker: "et hop", side: "left", title: "Et hop !<br>Les bus, <hl>en vrai, en direct</hl>.", sub: "Tous les horaires au même endroit, dans ta langue. Tu vois où est ton bus, tout de suite. Et c'est gratuit pour tout le monde." },
    { id: "marque", kicker: "le sommet", side: "center", title: "Ça, c'est <hl>crete.direct</hl>.", sub: "Une petite équipe, ici en Crète, qui veut juste rendre le bus plus simple. Pour les Crétois comme pour les voyageurs." },
    { id: "demain", kicker: "et demain ?", side: "right", sub: "Encore plus de bus en direct, sur toute l'île. Et bientôt, une appli rien que pour toi, dans ta poche." },
    { id: "aide", kicker: "entre nous", side: "right", title: "On fait tout ça nous-mêmes.<br>Et on a besoin de <hl>toi</hl>.", sub: "crete.direct est libre, sans pub, et le restera. Pas de grande entreprise derrière nous. Juste des gens qui aiment la Crète. Pour continuer, on a besoin d'un coup de main." },
  ],
  cta: { title: "Tu veux nous aider ?<br>C'est <hl>tout simple</hl>.", micro: "Suis-nous et partage autour de toi. Ça nous aide énormément. Merci !" },
  buttons: { instagram: "Suivre sur Instagram", facebook: "Suivre sur Facebook", share: "Partager", help: "Aider" },
};

const EN: CampagneCopy = {
  meta: {
    title: "Our project · crete.direct",
    description: "The story of crete.direct, Crete's buses made simple. An independent, free project. Help us keep going.",
  },
  hero: { kicker: "the journey", title: "Hi! I'm <hl>Kriri</hl>.", sub: "I take the bus all over Crete. Come on, I'll show you." },
  beats: [
    { id: "probleme", kicker: "at first", side: "left", title: "At first, it was a bit tricky.", sub: "Timetables live on old papers, often in Greek. You never quite know when the bus will come. So you wait, and you hope." },
    { id: "carte", kicker: "the idea", side: "right", title: "So we had an idea.<br>Put it all on <hl>one map</hl>." },
    { id: "direct", kicker: "and there!", side: "left", title: "And tada!<br>The buses, <hl>for real, live</hl>.", sub: "Every timetable in one place, in your language. You see where your bus is, right away. And it's free for everyone." },
    { id: "marque", kicker: "the summit", side: "center", title: "This is <hl>crete.direct</hl>.", sub: "A tiny team, here in Crete, that just wants to make the bus simpler. For Cretans and travellers alike." },
    { id: "demain", kicker: "and tomorrow?", side: "right", sub: "Even more buses live, all across the island. And soon, an app just for you, in your pocket." },
    { id: "aide", kicker: "between us", side: "right", title: "We do all of this ourselves.<br>And we need <hl>you</hl>.", sub: "crete.direct is free, with no ads, and it'll stay that way. No big company behind us. Just people who love Crete. To go further, we need a hand." },
  ],
  cta: { title: "Want to help?<br>It's <hl>super easy</hl>.", micro: "Follow us and share around you. It helps us so much. Thank you!" },
  buttons: { instagram: "Follow on Instagram", facebook: "Follow on Facebook", share: "Share", help: "Help" },
};

const EL: CampagneCopy = {
  meta: {
    title: "Το έργο μας · crete.direct",
    description: "Η ιστορία του crete.direct: τα λεωφορεία της Κρήτης πιο απλά. Ένα ανεξάρτητο και δωρεάν έργο.",
  },
  hero: { kicker: "η διαδρομή", title: "Γεια! Είμαι ο <hl>Kriri</hl>.", sub: "Παίρνω λεωφορεία σε όλη την Κρήτη. Έλα, θα σου δείξω." },
  beats: [
    { id: "probleme", kicker: "στην αρχή", side: "left", title: "Στην αρχή ήταν λίγο μπερδεμένο.", sub: "Τα ωράρια είναι συχνά σκορπισμένα, με παλιές ανακοινώσεις και διαφορετικές πηγές. Δεν ξέρεις πάντα τι ισχύει. Περιμένεις και ελπίζεις." },
    { id: "carte", kicker: "η ιδέα", side: "right", title: "Οπότε είχαμε μια ιδέα.<br>Να τα βάλουμε όλα σε <hl>έναν χάρτη</hl>." },
    { id: "direct", kicker: "και έγινε", side: "left", title: "Τα λεωφορεία, <hl>πιο καθαρά</hl>.", sub: "Ωράρια, διαδρομές και χρήσιμες πληροφορίες σε ένα σημείο, στη γλώσσα σου. Δωρεάν για όλους." },
    { id: "marque", kicker: "η κορυφή", side: "center", title: "Αυτό είναι το <hl>crete.direct</hl>.", sub: "Μια μικρή ομάδα στην Κρήτη που θέλει να κάνει τη μετακίνηση πιο απλή. Για Κρητικούς και ταξιδιώτες." },
    { id: "demain", kicker: "και αύριο;", side: "right", sub: "Περισσότερα ζωντανά δεδομένα, περισσότερες περιοχές και μια εφαρμογή στην τσέπη σου." },
    { id: "aide", kicker: "μεταξύ μας", side: "right", title: "Το χτίζουμε μόνοι μας.<br>Και χρειαζόμαστε <hl>βοήθεια</hl>.", sub: "Το crete.direct είναι δωρεάν και ανεξάρτητο. Όσο περισσότερο το μοιράζονται οι άνθρωποι, τόσο πιο χρήσιμο γίνεται." },
  ],
  cta: { title: "Θέλεις να βοηθήσεις;<br>Είναι <hl>απλό</hl>.", micro: "Ακολούθησέ μας και μοιράσου το. Μας βοηθάει πραγματικά. Ευχαριστούμε!" },
  buttons: { instagram: "Instagram", facebook: "Facebook", share: "Κοινοποίηση", help: "Βοήθεια" },
};

const COPY: Record<string, CampagneCopy> = { fr: FR, en: EN, el: EL };
export function getCampagneCopy(locale: string): CampagneCopy {
  return COPY[locale] ?? EN;
}

export const SHARE: Record<string, { title: string; text: string }> = {
  fr: { title: "crete.direct · le bus en Crète, en clair", text: "Un projet indépendant et gratuit pour les bus crétois. Soutiens-le en suivant et en partageant." },
  en: { title: "crete.direct · Crete's buses, made simple", text: "A free, independent project for Crete's buses. Support it by following and sharing." },
  el: { title: "crete.direct · τα λεωφορεία της Κρήτης πιο απλά", text: "Ένα δωρεάν και ανεξάρτητο έργο για τις μετακινήσεις στην Κρήτη. Βοήθησέ το με μια κοινοποίηση." },
};
export function getShare(locale: string): { title: string; text: string } { return SHARE[locale] ?? SHARE.en; }

export const LINKS = {
  instagram: "https://instagram.com/cretedirect",
  facebook: "https://www.facebook.com/1098023870060924",
};
