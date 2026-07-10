import type { ProCopy } from "./campagne-pro.ts";

export function getInstitutionsCopyFR(): ProCopy {
  return {
    audience: "institutions",
    meta: {
      title: "Utilité publique, flux touristiques et mobilité · crete.direct",
      description: "crete.direct aide à lire les flux touristiques, mieux répartir l'information utile et préparer une Crète plus harmonieuse.",
    },
    hero: {
      kicker: "institutions", kickerVariant: "go",
      title: "Préparer les prochains flux touristiques de la Crète.",
      sub: "crete.direct est un outil d'utilité publique : aider les visiteurs à se repérer aujourd'hui, et aider demain les acteurs locaux à mieux comprendre, répartir et harmoniser les flux sur toute l'île.",
    },
    stats: [
      { n: "2", l: "réseaux KTEL à relier" },
      { n: "22", l: "langues pour les visiteurs" },
      { n: "2026", l: "preuve d'usage terrain" },
      { n: "2028", l: "horizon nouveaux flux" },
    ],
    hook: "La question n'est pas seulement d'informer les voyageurs. C'est de construire une couche commune pour voir où la demande se forme, quelles zones saturent, quelles zones restent invisibles, et comment mieux répartir l'attention sur l'ensemble de la Crète.",
    beats: [
      { id: "constat", kicker: "le constat", kickerVariant: "terracotta", emoji: "\u{1F410}", emojiCap: "où est l'information fiable ?", flip: true,
        title: "Les flux existent déjà. Ils sont juste <hl>mal lisibles</hl>.",
        body: "Les visiteurs cherchent des bus, des plages, des activités, des voitures, des zones où dormir. Ces signaux racontent comment la Crète est utilisée en temps réel. Aujourd'hui, ils restent dispersés entre plateformes, acteurs privés et informations publiques." },
      { id: "bati", kicker: "ce qu'on construit", kickerVariant: "go", scene: "signpost",
        title: "Un observatoire utile, accessible au <hl>public</hl>.",
        body: "crete.direct réunit les bus, la carte /explore, les plages, les activités, la location de voiture, la météo et les points d'intérêt. L'objectif : rendre service maintenant, tout en construisant une lecture plus juste des usages touristiques par zone." },
    ],
    frise: {
      kicker: "notre cap",
      title: "De l'information utile à l'<hl>harmonisation</hl> du territoire.",
      sub: "Une même couche peut servir les visiteurs, les communes, les transporteurs, les professionnels du tourisme et la Région.",
      steps: [
        { year: "2026", title: "Mesurer l'usage réel", text: "Demandes, zones consultées, besoins mobilité, saisons, frictions et recherches multilingues." },
        { year: "2027", title: "Relier les acteurs", text: "Communes, KTEL, activités, hébergeurs, loueurs et offices autour d'une lecture commune." },
        { year: "2028+", title: "Mieux répartir les flux", text: "Préparer les nouveaux flux liés à Kastelli et encourager une découverte plus équilibrée de toute la Crète.", future: true },
      ],
    },
    ask: {
      kicker: "notre demande", title: "Ouvrir un dialogue d'<hl>utilité publique</hl>.",
      body: "Un échange pour explorer une mission pilote sur les flux touristiques, un partenariat de données, ou une coopération autour de l'information visiteurs, de la mobilité et de l'équilibre territorial.",
      dossierLabel: "Télécharger le dossier (PDF)", dossierHref: "/dossiers/crete-direct-institutions-fr.pdf",
    },
    form: {
      variant: "institution",
      title: "Prendre contact", lead: "Réponse humaine. Vos coordonnées servent uniquement à vous recontacter.",
      fields: [
        { name: "name", label: "Nom", required: true, placeholder: "Votre nom" },
        { name: "org", label: "Organisme", required: true, placeholder: "Région, office de tourisme, KTEL..." },
        { name: "role", label: "Fonction", placeholder: "Votre fonction" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "vous@organisme.gr" },
        { name: "message", label: "Objet", type: "textarea", placeholder: "En quelques mots, ce que vous aimeriez explorer avec crete.direct." },
      ],
      submit: "Envoyer la demande", sending: "Envoi...", sent: "Message envoyé. Merci !", error: "Échec de l'envoi. Réessayez ou écrivez à hello@crete.direct.",
    },
  };
}

export function getInstitutionsCopyEN(): ProCopy {
  return {
    audience: "institutions",
    meta: {
      title: "Public utility, tourism flows and mobility · crete.direct",
      description: "crete.direct helps read tourism flows, distribute useful information better and prepare a more balanced Crete.",
    },
    hero: {
      kicker: "institutions", kickerVariant: "go",
      title: "Preparing Crete's next tourism flows.",
      sub: "crete.direct is a public-utility tool: helping visitors navigate today, and helping local actors tomorrow understand, distribute and harmonise flows across the island.",
    },
    stats: [
      { n: "2", l: "KTEL networks to connect" },
      { n: "22", l: "languages for visitors" },
      { n: "2026", l: "field usage proof" },
      { n: "2028", l: "new-flow horizon" },
    ],
    hook: "The issue is not only informing travellers. It is building a shared layer to see where demand forms, which areas saturate, which areas stay invisible, and how attention can be distributed more fairly across Crete.",
    beats: [
      { id: "constat", kicker: "the issue", kickerVariant: "terracotta", emoji: "\u{1F410}", emojiCap: "where is the reliable information?", flip: true,
        title: "The flows already exist. They are just <hl>hard to read</hl>.",
        body: "Visitors search for buses, beaches, activities, cars and areas to stay. Those signals tell how Crete is used in real time. Today, they remain scattered across platforms, private actors and public information." },
      { id: "bati", kicker: "what we build", kickerVariant: "go", scene: "signpost",
        title: "A useful observatory, accessible to the <hl>public</hl>.",
        body: "crete.direct brings together buses, the /explore map, beaches, activities, car rental, weather and points of interest. The goal: serve people now, while building a better reading of tourism usage by area." },
    ],
    frise: {
      kicker: "our direction",
      title: "From useful information to territorial <hl>balance</hl>.",
      sub: "The same layer can serve visitors, municipalities, transport operators, tourism professionals and the Region.",
      steps: [
        { year: "2026", title: "Measure real usage", text: "Requests, consulted areas, mobility needs, seasons, friction points and multilingual searches." },
        { year: "2027", title: "Connect local actors", text: "Municipalities, KTEL, activities, accommodation, rental operators and tourism offices around a shared reading." },
        { year: "2028+", title: "Distribute flows better", text: "Prepare new flows linked to Kastelli and encourage a more balanced discovery of the whole island.", future: true },
      ],
    },
    ask: {
      kicker: "our ask", title: "Open a public-utility <hl>dialogue</hl>.",
      body: "A conversation to explore a pilot mission around tourism flows, a data partnership, or cooperation around visitor information, mobility and territorial balance.",
      dossierLabel: "Download the dossier (PDF)", dossierHref: "/dossiers/crete-direct-institutions-en.pdf",
    },
    form: {
      variant: "institution",
      title: "Get in touch", lead: "Human reply. Your details are only used to get back to you.",
      fields: [
        { name: "name", label: "Name", required: true, placeholder: "Your name" },
        { name: "org", label: "Organisation", required: true, placeholder: "Region, tourism board, KTEL..." },
        { name: "role", label: "Role", placeholder: "Your role" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@organisation.gr" },
        { name: "message", label: "Subject", type: "textarea", placeholder: "In a few words, what you would like to explore with crete.direct." },
      ],
      submit: "Send the request", sending: "Sending...", sent: "Message sent. Thank you!", error: "Sending failed. Try again or email hello@crete.direct.",
    },
  };
}

export function getInstitutionsCopyEL(): ProCopy {
  return {
    audience: "institutions",
    meta: {
      title: "Δημόσια χρησιμότητα, τουριστικές ροές και κινητικότητα · crete.direct",
      description: "Το crete.direct βοηθά στην ανάγνωση των τουριστικών ροών, στην καλύτερη διάδοση χρήσιμης πληροφορίας και στην προετοιμασία μιας πιο ισορροπημένης Κρήτης.",
    },
    hero: {
      kicker: "θεσμοί", kickerVariant: "go",
      title: "Προετοιμασία των επόμενων τουριστικών ροών της Κρήτης.",
      sub: "Το crete.direct είναι εργαλείο δημόσιας χρησιμότητας: βοηθά τους επισκέπτες σήμερα και μπορεί αύριο να βοηθήσει τους τοπικούς φορείς να κατανοούν, να κατανέμουν και να εναρμονίζουν τις ροές σε όλο το νησί.",
    },
    stats: [
      { n: "2", l: "δίκτυα ΚΤΕΛ προς σύνδεση" },
      { n: "22", l: "γλώσσες για επισκέπτες" },
      { n: "2026", l: "απόδειξη χρήσης πεδίου" },
      { n: "2028", l: "ορίζοντας νέων ροών" },
    ],
    hook: "Το ζήτημα δεν είναι μόνο η ενημέρωση των ταξιδιωτών. Είναι η δημιουργία ενός κοινού επιπέδου που δείχνει πού σχηματίζεται η ζήτηση, ποιες περιοχές πιέζονται, ποιες μένουν αόρατες και πώς μπορεί η προσοχή να κατανέμεται πιο δίκαια σε όλη την Κρήτη.",
    beats: [
      { id: "constat", kicker: "το ζήτημα", kickerVariant: "terracotta", emoji: "\u{1F410}", emojiCap: "πού είναι η αξιόπιστη πληροφορία;", flip: true,
        title: "Οι ροές υπάρχουν ήδη. Απλώς είναι <hl>δύσκολο να διαβαστούν</hl>.",
        body: "Οι επισκέπτες αναζητούν λεωφορεία, παραλίες, δραστηριότητες, αυτοκίνητα και περιοχές διαμονής. Αυτά τα σήματα δείχνουν πώς χρησιμοποιείται η Κρήτη σε πραγματικό χρόνο. Σήμερα μένουν διάσπαρτα σε πλατφόρμες, ιδιωτικούς φορείς και δημόσια πληροφορία." },
      { id: "bati", kicker: "τι χτίζουμε", kickerVariant: "go", scene: "signpost",
        title: "Ένα χρήσιμο παρατηρητήριο, ανοιχτό στο <hl>κοινό</hl>.",
        body: "Το crete.direct συγκεντρώνει λεωφορεία, τον χάρτη /explore, παραλίες, δραστηριότητες, ενοικίαση αυτοκινήτου, καιρό και σημεία ενδιαφέροντος. Στόχος: να βοηθά τώρα, ενώ χτίζει καλύτερη ανάγνωση της τουριστικής χρήσης ανά περιοχή." },
    ],
    frise: {
      kicker: "η κατεύθυνση",
      title: "Από χρήσιμη πληροφορία σε <hl>ισορροπία</hl> του τόπου.",
      sub: "Το ίδιο επίπεδο μπορεί να υπηρετήσει επισκέπτες, δήμους, μεταφορείς, επαγγελματίες τουρισμού και την Περιφέρεια.",
      steps: [
        { year: "2026", title: "Μέτρηση πραγματικής χρήσης", text: "Αιτήματα, περιοχές ενδιαφέροντος, ανάγκες κινητικότητας, εποχές, τριβές και πολύγλωσσες αναζητήσεις." },
        { year: "2027", title: "Σύνδεση τοπικών φορέων", text: "Δήμοι, ΚΤΕΛ, δραστηριότητες, διαμονή, ενοικιάσεις και τουριστικά γραφεία γύρω από κοινή ανάγνωση." },
        { year: "2028+", title: "Καλύτερη κατανομή ροών", text: "Προετοιμασία νέων ροών που συνδέονται με το Καστέλι και πιο ισορροπημένη ανακάλυψη όλης της Κρήτης.", future: true },
      ],
    },
    ask: {
      kicker: "το αίτημα", title: "Να ανοίξει διάλογος <hl>δημόσιας χρησιμότητας</hl>.",
      body: "Μια συζήτηση για πιλοτική αποστολή γύρω από τις τουριστικές ροές, συνεργασία δεδομένων, ή συνεργασία στην πληροφόρηση επισκεπτών, την κινητικότητα και την ισορροπία του τόπου.",
      dossierLabel: "Λήψη φακέλου (PDF)", dossierHref: "/dossiers/crete-direct-institutions-en.pdf",
    },
    form: {
      variant: "institution",
      title: "Επικοινωνία", lead: "Ανθρώπινη απάντηση. Τα στοιχεία σας χρησιμοποιούνται μόνο για να επικοινωνήσουμε μαζί σας.",
      fields: [
        { name: "name", label: "Όνομα", required: true, placeholder: "Το όνομά σας" },
        { name: "org", label: "Οργανισμός", required: true, placeholder: "Περιφέρεια, φορέας τουρισμού, ΚΤΕΛ..." },
        { name: "role", label: "Ρόλος", placeholder: "Ο ρόλος σας" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@organisation.gr" },
        { name: "message", label: "Θέμα", type: "textarea", placeholder: "Με λίγες λέξεις, τι θα θέλατε να εξερευνήσετε με το crete.direct." },
      ],
      submit: "Αποστολή αιτήματος", sending: "Αποστολή...", sent: "Το μήνυμα εστάλη. Ευχαριστούμε!", error: "Η αποστολή απέτυχε. Δοκιμάστε ξανά ή γράψτε στο hello@crete.direct.",
    },
  };
}
