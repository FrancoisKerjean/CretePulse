import type { ProCopy } from "./campagne-pro.ts";

export function getEntreprisesCopyFR(): ProCopy {
  return {
    audience: "entreprises",
    meta: {
      title: "Système data-driven pour la Crète · crete.direct",
      description: "crete.direct montre comment transformer des données touristiques locales en décisions, en demandes clients et en visibilité utile.",
    },
    hero: {
      kicker: "preuve de méthode", kickerVariant: "terracotta",
      title: "Un territoire devient lisible quand la donnée devient <hl>actionnable</hl>.",
      sub: "crete.direct n'est pas seulement un guide. C'est un système vivant pour observer la demande, structurer l'offre locale et transformer l'information en décisions.",
    },
    stats: [
      { n: "22", l: "langues pour capter la demande" },
      { n: "/explore", l: "carte unique du territoire" },
      { n: "CRD", l: "location auto en devis directs" },
      { n: "Activities", l: "offres locales comparées" },
    ],
    hook: "Nous utilisons crete.direct comme preuve terrain : un système public, utile aux voyageurs, qui révèle aussi comment une destination ou une entreprise peut piloter son activité par la donnée.",
    beats: [
      { id: "signal", kicker: "le signal", kickerVariant: "go", emoji: "\u{1F4C8}", emojiCap: "Recherche, cartes, bus, voitures, activités", flip: true,
        title: "On ne regarde pas le trafic. On regarde <hl>l'intention</hl>.",
        body: "Un visiteur qui cherche un trajet, une voiture, une activité ou une zone précise n'est pas une impression publicitaire. C'est une demande en train de se former. Le système capte ces signaux et les rend exploitables." },
      { id: "systeme", kicker: "le système", kickerVariant: "calm", scene: "community",
        title: "Contenu, carte, devis, partenaires : <hl>une seule boucle</hl>.",
        body: "Les pages attirent la demande. La carte structure le territoire. Les formulaires qualifient le besoin. Les partenaires répondent avec des offres. Les données reviennent ensuite dans le système pour mieux comprendre ce qui marche." },
    ],
    frise: {
      kicker: "ce que ça prouve",
      title: "La même méthode peut servir une <hl>entreprise</hl>, une destination ou un réseau local.",
      sub: "Crete.direct est le démonstrateur. Le sujet réel est plus large : rendre une activité mesurable, plus visible, plus réactive, sans perdre le terrain.",
      steps: [
        { year: "Observer", title: "Identifier les vrais signaux", text: "Recherches, demandes, zones, saisons, frictions et intentions fortes." },
        { year: "Structurer", title: "Relier données et opérations", text: "Pages, cartes, formulaires, partenaires, devis, suivi et reporting." },
        { year: "Decider", title: "Piloter avec des preuves", text: "Mieux vendre, mieux orienter les flux, mieux investir le temps et le budget.", future: true },
      ],
    },
    doors: [
      { id: "sponsor", emoji: "\u{1F9ED}", title: "Parler stratégie",
        body: "Vous dirigez une entreprise, un réseau ou une destination ? On peut regarder comment vos données, votre visibilité et vos demandes clients pourraient former un système plus utile.",
        cta: "Demander un échange", href: "#sponsor-form" },
      { id: "visible", emoji: "\u{1F4CD}", title: "Entrer dans l'écosystème",
        body: "Vous êtes un acteur local du tourisme, de la mobilité, de la location ou des activités ? crete.direct peut aussi vous rendre visible dans les parcours existants.",
        cta: "Voir les partenaires", href: "/partners" },
    ],
    form: {
      variant: "sponsor",
      title: "Échanger avec crete.direct", lead: "Expliquez votre activité et le type de système que vous aimeriez rendre plus lisible. Réponse humaine, pas de séquence automatique.",
      fields: [
        { name: "name", label: "Nom", required: true, placeholder: "Votre nom" },
        { name: "company", label: "Entreprise", required: true, placeholder: "Nom de l'entreprise" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "vous@entreprise.com" },
        { name: "website", label: "Site web (optionnel)", placeholder: "https://" },
        { name: "message", label: "Votre sujet", type: "textarea", placeholder: "Exemple : mieux comprendre la demande, automatiser les demandes clients, cartographier une offre, relier données et ventes." },
      ],
      submit: "Demander un échange", sending: "Envoi...", sent: "Message reçu. Merci !", error: "Échec de l'envoi. Réessayez ou écrivez à hello@crete.direct.",
    },
  };
}

export function getEntreprisesCopyEN(): ProCopy {
  return {
    audience: "entreprises",
    meta: {
      title: "Data-driven system for Crete · crete.direct",
      description: "crete.direct shows how local tourism data can become decisions, customer demand and useful visibility.",
    },
    hero: {
      kicker: "proof of method", kickerVariant: "terracotta",
      title: "A territory becomes readable when data becomes <hl>actionable</hl>.",
      sub: "crete.direct is not only a guide. It is a living system to observe demand, structure local supply and turn information into decisions.",
    },
    stats: [
      { n: "22", l: "languages to capture demand" },
      { n: "/explore", l: "one territory map" },
      { n: "CRD", l: "direct car rental quotes" },
      { n: "Activities", l: "local offers compared" },
    ],
    hook: "We use crete.direct as field proof: a public tool that helps travellers and also shows how a destination or business can be managed through data.",
    beats: [
      { id: "signal", kicker: "the signal", kickerVariant: "go", emoji: "\u{1F4C8}", emojiCap: "Search, maps, buses, cars, activities", flip: true,
        title: "We do not look at traffic. We look at <hl>intent</hl>.",
        body: "A visitor looking for a route, a car, an activity or a precise area is not an advertising impression. It is demand being formed. The system captures those signals and makes them usable." },
      { id: "systeme", kicker: "the system", kickerVariant: "calm", scene: "community",
        title: "Content, map, quotes, partners: <hl>one loop</hl>.",
        body: "Pages attract demand. The map structures the territory. Forms qualify the need. Partners answer with offers. Data then returns into the system to better understand what works." },
    ],
    frise: {
      kicker: "what it proves",
      title: "The same method can serve a <hl>business</hl>, a destination or a local network.",
      sub: "Crete.direct is the demonstrator. The real subject is broader: making an activity measurable, more visible and more reactive, without losing the field.",
      steps: [
        { year: "Observe", title: "Identify real signals", text: "Searches, requests, areas, seasons, friction points and strong intent." },
        { year: "Structure", title: "Connect data and operations", text: "Pages, maps, forms, partners, quotes, follow-up and reporting." },
        { year: "Decide", title: "Manage with proof", text: "Sell better, orient flows better, invest time and budget better.", future: true },
      ],
    },
    doors: [
      { id: "sponsor", emoji: "\u{1F9ED}", title: "Talk strategy",
        body: "Do you run a business, network or destination? We can look at how your data, visibility and customer demand could become a more useful system.",
        cta: "Request a conversation", href: "#sponsor-form" },
      { id: "visible", emoji: "\u{1F4CD}", title: "Join the ecosystem",
        body: "Are you a local tourism, mobility, rental or activity operator? crete.direct can also make you visible inside existing traveller paths.",
        cta: "See partners", href: "/partners" },
    ],
    form: {
      variant: "sponsor",
      title: "Talk with crete.direct", lead: "Explain your activity and the kind of system you want to make more readable. Human reply, no automated sequence.",
      fields: [
        { name: "name", label: "Name", required: true, placeholder: "Your name" },
        { name: "company", label: "Company", required: true, placeholder: "Company name" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@company.com" },
        { name: "website", label: "Website (optional)", placeholder: "https://" },
        { name: "message", label: "Your topic", type: "textarea", placeholder: "Example: understand demand better, automate customer requests, map an offer, connect data and sales." },
      ],
      submit: "Request a conversation", sending: "Sending...", sent: "Message received. Thank you!", error: "Sending failed. Try again or email hello@crete.direct.",
    },
  };
}

export function getEntreprisesCopyEL(): ProCopy {
  return {
    audience: "entreprises",
    meta: {
      title: "Σύστημα με βάση τα δεδομένα για την Κρήτη · crete.direct",
      description: "Το crete.direct δείχνει πώς τα τοπικά τουριστικά δεδομένα μπορούν να γίνουν αποφάσεις, αιτήματα πελατών και χρήσιμη ορατότητα.",
    },
    hero: {
      kicker: "απόδειξη μεθόδου", kickerVariant: "terracotta",
      title: "Ένας τόπος γίνεται κατανοητός όταν τα δεδομένα γίνονται <hl>πράξη</hl>.",
      sub: "Το crete.direct δεν είναι μόνο ένας οδηγός. Είναι ένα ζωντανό σύστημα που παρατηρεί τη ζήτηση, οργανώνει την τοπική προσφορά και μετατρέπει την πληροφορία σε αποφάσεις.",
    },
    stats: [
      { n: "22", l: "γλώσσες για τη ζήτηση" },
      { n: "/explore", l: "ενιαίος χάρτης του τόπου" },
      { n: "CRD", l: "άμεσες προσφορές ενοικίασης" },
      { n: "Activities", l: "σύγκριση τοπικών εμπειριών" },
    ],
    hook: "Χρησιμοποιούμε το crete.direct ως απόδειξη πεδίου: ένα δημόσιο εργαλείο χρήσιμο στους ταξιδιώτες, που δείχνει επίσης πώς ένας προορισμός ή μια επιχείρηση μπορεί να διοικείται με δεδομένα.",
    beats: [
      { id: "signal", kicker: "το σήμα", kickerVariant: "go", emoji: "\u{1F4C8}", emojiCap: "Αναζήτηση, χάρτες, λεωφορεία, αυτοκίνητα, δραστηριότητες", flip: true,
        title: "Δεν κοιτάμε απλώς την επισκεψιμότητα. Κοιτάμε <hl>την πρόθεση</hl>.",
        body: "Ένας επισκέπτης που ψάχνει διαδρομή, αυτοκίνητο, δραστηριότητα ή συγκεκριμένη περιοχή δεν είναι απλή προβολή διαφήμισης. Είναι ζήτηση που σχηματίζεται. Το σύστημα πιάνει αυτά τα σήματα και τα κάνει χρήσιμα." },
      { id: "systeme", kicker: "το σύστημα", kickerVariant: "calm", scene: "community",
        title: "Περιεχόμενο, χάρτης, προσφορές, συνεργάτες: <hl>ένας κύκλος</hl>.",
        body: "Οι σελίδες φέρνουν τη ζήτηση. Ο χάρτης οργανώνει τον τόπο. Οι φόρμες ξεκαθαρίζουν την ανάγκη. Οι συνεργάτες απαντούν με προσφορές. Τα δεδομένα επιστρέφουν στο σύστημα για να καταλάβουμε καλύτερα τι λειτουργεί." },
    ],
    frise: {
      kicker: "τι αποδεικνύει",
      title: "Η ίδια μέθοδος μπορεί να υπηρετήσει μια <hl>επιχείρηση</hl>, έναν προορισμό ή ένα τοπικό δίκτυο.",
      sub: "Το crete.direct είναι το παράδειγμα. Το πραγματικό θέμα είναι ευρύτερο: να γίνει μια δραστηριότητα μετρήσιμη, πιο ορατή και πιο άμεση, χωρίς να χαθεί η επαφή με το πεδίο.",
      steps: [
        { year: "Παρατήρηση", title: "Εντοπισμός πραγματικών σημάτων", text: "Αναζητήσεις, αιτήματα, περιοχές, εποχικότητα, σημεία τριβής και ισχυρή πρόθεση." },
        { year: "Δομή", title: "Σύνδεση δεδομένων και λειτουργίας", text: "Σελίδες, χάρτες, φόρμες, συνεργάτες, προσφορές, παρακολούθηση και αναφορά." },
        { year: "Απόφαση", title: "Διοίκηση με αποδείξεις", text: "Καλύτερες πωλήσεις, καλύτερη κατεύθυνση ροών, καλύτερη χρήση χρόνου και προϋπολογισμού.", future: true },
      ],
    },
    doors: [
      { id: "sponsor", emoji: "\u{1F9ED}", title: "Συζήτηση στρατηγικής",
        body: "Διοικείτε επιχείρηση, δίκτυο ή προορισμό; Μπορούμε να δούμε πώς τα δεδομένα, η ορατότητα και η ζήτηση πελατών μπορούν να γίνουν πιο χρήσιμο σύστημα.",
        cta: "Ζητήστε συζήτηση", href: "#sponsor-form" },
      { id: "visible", emoji: "\u{1F4CD}", title: "Μπείτε στο οικοσύστημα",
        body: "Είστε τοπικός φορέας τουρισμού, κινητικότητας, ενοικίασης ή δραστηριοτήτων; Το crete.direct μπορεί επίσης να σας κάνει ορατούς μέσα στις υπάρχουσες διαδρομές των ταξιδιωτών.",
        cta: "Δείτε τους συνεργάτες", href: "/partners" },
    ],
    form: {
      variant: "sponsor",
      title: "Μιλήστε με το crete.direct", lead: "Περιγράψτε τη δραστηριότητά σας και το σύστημα που θέλετε να γίνει πιο καθαρό. Ανθρώπινη απάντηση, χωρίς αυτόματη ακολουθία.",
      fields: [
        { name: "name", label: "Όνομα", required: true, placeholder: "Το όνομά σας" },
        { name: "company", label: "Επιχείρηση", required: true, placeholder: "Όνομα επιχείρησης" },
        { name: "email", label: "Email", type: "email", required: true, placeholder: "you@company.com" },
        { name: "website", label: "Ιστότοπος (προαιρετικά)", placeholder: "https://" },
        { name: "message", label: "Το θέμα σας", type: "textarea", placeholder: "Παράδειγμα: κατανόηση ζήτησης, αυτοματοποίηση αιτημάτων, χαρτογράφηση προσφοράς, σύνδεση δεδομένων και πωλήσεων." },
      ],
      submit: "Ζητήστε συζήτηση", sending: "Αποστολή...", sent: "Το μήνυμα ελήφθη. Ευχαριστούμε!", error: "Η αποστολή απέτυχε. Δοκιμάστε ξανά ή γράψτε στο hello@crete.direct.",
    },
  };
}
