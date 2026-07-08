// Contenu i18n de /activities (22 locales). Données pures, importées par page.tsx.
// en/fr/de/el rédigés à la main (source) ; les autres locales (18) viendront en tâche 12b.
// Voix crete.direct : honnête, concrète, locale. Pas de superlatifs, pas de prix inventés,
// pas de noms de prestataires spécifiques. Aucune garantie de résultat.
// Fichier ASSEMBLÉ par la tâche 12a. NE PAS éditer une langue à la main sans appliquer
// le même soin aux autres ; la source de vérité du contenu est désormais ce fichier.

export type ActivityPageStrings = {
  h1: string;
  intro: string;
  howTitle: string;
  how: Array<{ h: string; p: string }>;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
  breadcrumbHome: string;
  breadcrumbActivities: string;
  categoriesTitle: string;
  onRequestBadge: string;
};

// ---- Page mère /activities ------------------------------------------------------

export const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Activities in Crete · quotes from local providers",
    desc: "Request food tours, boat trips or hiking in Crete in four clicks. Local providers reply with a quote for your whole group. You pay them directly — no online prepayment.",
  },
  fr: {
    title: "Activités en Crète · devis de prestataires locaux",
    desc: "Demandez une visite gastronomique, une sortie en bateau ou une randonnée en Crète en quatre clics. Les prestataires locaux vous répondent avec un devis pour votre groupe. Vous les payez directement — aucun prépaiement en ligne.",
  },
  de: {
    title: "Aktivitäten auf Kreta · Angebote lokaler Anbieter",
    desc: "Fordern Sie in vier Klicks ein Angebot für Kulinarik-Touren, Bootsausflüge oder Wanderungen auf Kreta an. Lokale Anbieter antworten mit einem Preis für Ihre ganze Gruppe. Sie zahlen direkt — keine Online-Vorauszahlung.",
  },
  el: {
    title: "Δραστηριότητες στην Κρήτη · προσφορές από τοπικούς παρόχους",
    desc: "Ζητήστε γαστρονομική περιήγηση, εκδρομή με σκάφος ή πεζοπορία στην Κρήτη με τέσσερα κλικ. Τοπικοί πάροχοι απαντούν με προσφορά για ολόκληρη την παρέα σας. Πληρώνετε απευθείας — καμία online προπληρωμή.",
  },
};

export const STRINGS: Record<string, ActivityPageStrings> = {
  en: {
    h1: "Activities in Crete — get quotes from local providers",
    intro: "Tell us what you want to do, where and when. Local providers we work with reply directly with a price for your whole group. You compare, pick one, and pay them on the day — no online prepayment, no booking platform in between.",
    howTitle: "How it works",
    how: [
      {
        h: "Tell us what you want to do",
        p: "Choose a category (food tour, boat trip, hiking), select your area and dates, and tell us how many people are in your group.",
      },
      {
        h: "Local providers reply with a quote",
        p: "Providers we have verified in the area receive your request and reply by email with a price for your whole group — not per person. You hear back within 24 hours.",
      },
      {
        h: "Compare, pick one, pay directly",
        p: "You choose the offer that suits you and pay the provider directly — cash, card, or however they prefer. We do not handle money.",
      },
    ],
    faqTitle: "Questions about how this works",
    faq: [
      {
        q: "How does it work?",
        a: "You fill in a short form: activity type, area, date, group size and your contact details. We forward your request to local providers we work with. They reply by email with a quote for your whole group. You pick one and pay them directly.",
      },
      {
        q: "Do I pay online?",
        a: "No — you pay the provider directly on the day or as agreed with them. There is no online payment on this site and no card required to send a request.",
      },
      {
        q: "Is the price per person?",
        a: "No — every quote you receive is priced for your whole group. Some providers may give you a per-person breakdown inside their quote, but the number you compare is always a group total.",
      },
      {
        q: "What if nobody replies?",
        a: "We follow up with providers after 24 hours and email you either way. If no provider is available for your combination, we tell you directly and note your interest for when coverage expands.",
      },
    ],
    breadcrumbHome: "Home",
    breadcrumbActivities: "Activities",
    categoriesTitle: "Choose a category",
    onRequestBadge: "on request",
  },
  fr: {
    h1: "Activités en Crète — recevez des devis de prestataires locaux",
    intro: "Dites-nous ce que vous voulez faire, où et quand. Les prestataires locaux avec lesquels nous travaillons vous répondent directement avec un prix pour votre groupe entier. Vous comparez, vous choisissez, et vous les payez sur place — aucun prépaiement en ligne, aucune plateforme intermédiaire.",
    howTitle: "Comment ça marche",
    how: [
      {
        h: "Dites-nous ce que vous voulez faire",
        p: "Choisissez une catégorie (visite gastronomique, sortie en bateau, randonnée), sélectionnez votre zone et vos dates, et indiquez-nous la taille de votre groupe.",
      },
      {
        h: "Les prestataires locaux vous répondent avec un devis",
        p: "Les prestataires que nous avons vérifiés dans la zone reçoivent votre demande et vous répondent par email avec un prix pour votre groupe entier — pas par personne. Vous recevez une réponse sous 24 heures.",
      },
      {
        h: "Comparez, choisissez, payez directement",
        p: "Vous choisissez l'offre qui vous convient et vous payez le prestataire directement — espèces, carte, ou selon leur préférence. Nous ne manipulons pas l'argent.",
      },
    ],
    faqTitle: "Vos questions sur le fonctionnement",
    faq: [
      {
        q: "Comment ça fonctionne ?",
        a: "Vous remplissez un court formulaire : type d'activité, zone, date, taille du groupe et vos coordonnées. Nous transmettrons votre demande aux prestataires locaux avec lesquels nous travaillons. Ils vous répondent par email avec un devis pour votre groupe entier. Vous en choisissez un et le payez directement.",
      },
      {
        q: "Dois-je payer en ligne ?",
        a: "Non — vous payez le prestataire directement sur place ou selon ce qui est convenu avec lui. Il n'y a aucun paiement en ligne sur ce site et aucune carte n'est requise pour envoyer une demande.",
      },
      {
        q: "Le prix est-il par personne ?",
        a: "Non — chaque devis que vous recevez est établi pour votre groupe entier. Certains prestataires peuvent vous détailler un tarif par personne dans leur devis, mais le chiffre que vous comparez est toujours un total groupe.",
      },
      {
        q: "Que se passe-t-il si personne ne répond ?",
        a: "Nous relançons les prestataires après 24 heures et nous vous répondons dans tous les cas. Si aucun prestataire n'est disponible pour votre combinaison, nous vous le disons clairement et notons votre intérêt pour quand la couverture s'élargira.",
      },
    ],
    breadcrumbHome: "Accueil",
    breadcrumbActivities: "Activités",
    categoriesTitle: "Choisissez une catégorie",
    onRequestBadge: "sur demande",
  },
  de: {
    h1: "Aktivitäten auf Kreta — Angebote von lokalen Anbietern erhalten",
    intro: "Sagen Sie uns, was Sie unternehmen möchten, wo und wann. Die lokalen Anbieter, mit denen wir zusammenarbeiten, antworten Ihnen direkt mit einem Preis für Ihre gesamte Gruppe. Sie vergleichen, wählen einen aus und zahlen am Tag selbst — keine Online-Vorauszahlung, keine Buchungsplattform dazwischen.",
    howTitle: "So funktioniert es",
    how: [
      {
        h: "Sagen Sie uns, was Sie unternehmen möchten",
        p: "Wählen Sie eine Kategorie (kulinarische Tour, Bootsausflug, Wandern), wählen Sie Ihre Region und Ihr Datum, und geben Sie uns die Gruppengröße an.",
      },
      {
        h: "Lokale Anbieter antworten mit einem Angebot",
        p: "Anbieter, die wir in der Region überprüft haben, erhalten Ihre Anfrage und antworten per E-Mail mit einem Preis für Ihre gesamte Gruppe — nicht pro Person. Sie erhalten eine Antwort innerhalb von 24 Stunden.",
      },
      {
        h: "Vergleichen, auswählen, direkt zahlen",
        p: "Sie wählen das passende Angebot und zahlen direkt beim Anbieter — bar, mit Karte oder nach seiner Präferenz. Wir nehmen kein Geld in die Hand.",
      },
    ],
    faqTitle: "Fragen zur Funktionsweise",
    faq: [
      {
        q: "Wie funktioniert es?",
        a: "Sie füllen ein kurzes Formular aus: Aktivitätstyp, Region, Datum, Gruppengröße und Ihre Kontaktdaten. Wir leiten Ihre Anfrage an die lokalen Anbieter weiter, mit denen wir zusammenarbeiten. Diese antworten per E-Mail mit einem Angebot für Ihre gesamte Gruppe. Sie wählen einen aus und zahlen direkt.",
      },
      {
        q: "Zahle ich online?",
        a: "Nein — Sie zahlen dem Anbieter direkt vor Ort oder wie mit ihm vereinbart. Auf dieser Website gibt es keine Online-Zahlung, und zum Absenden einer Anfrage ist keine Karte erforderlich.",
      },
      {
        q: "Ist der Preis pro Person?",
        a: "Nein — jedes Angebot, das Sie erhalten, ist für Ihre gesamte Gruppe kalkuliert. Einige Anbieter können einen Pro-Kopf-Betrag in ihrem Angebot aufführen, aber die Zahl, die Sie vergleichen, ist immer ein Gruppengesamtpreis.",
      },
      {
        q: "Was passiert, wenn niemand antwortet?",
        a: "Wir kontaktieren Anbieter nach 24 Stunden erneut und melden uns in jedem Fall bei Ihnen. Falls kein Anbieter für Ihre Kombination verfügbar ist, teilen wir Ihnen das direkt mit und vermerken Ihr Interesse für eine spätere Ausweitung.",
      },
    ],
    breadcrumbHome: "Startseite",
    breadcrumbActivities: "Aktivitäten",
    categoriesTitle: "Kategorie wählen",
    onRequestBadge: "auf Anfrage",
  },
  el: {
    h1: "Δραστηριότητες στην Κρήτη — λάβετε προσφορές από τοπικούς παρόχους",
    intro: "Πείτε μας τι θέλετε να κάνετε, πού και πότε. Τοπικοί πάροχοι με τους οποίους συνεργαζόμαστε σας απαντούν απευθείας με μια τιμή για ολόκληρη την παρέα σας. Συγκρίνετε, επιλέγετε έναν και τον πληρώνετε εκείνη την ημέρα — καμία online προπληρωμή, καμία ενδιάμεση πλατφόρμα.",
    howTitle: "Πώς λειτουργεί",
    how: [
      {
        h: "Πείτε μας τι θέλετε να κάνετε",
        p: "Επιλέξτε μια κατηγορία (γαστρονομική περιήγηση, εκδρομή με σκάφος, πεζοπορία), διαλέξτε την περιοχή και τις ημερομηνίες σας, και πείτε μας το μέγεθος της παρέας σας.",
      },
      {
        h: "Τοπικοί πάροχοι απαντούν με προσφορά",
        p: "Πάροχοι που έχουμε επαληθεύσει στην περιοχή λαμβάνουν το αίτημά σας και απαντούν μέσω email με τιμή για ολόκληρη την παρέα σας — όχι ανά άτομο. Λαμβάνετε απάντηση εντός 24 ωρών.",
      },
      {
        h: "Συγκρίνετε, επιλέξτε, πληρώστε απευθείας",
        p: "Επιλέγετε την προσφορά που σας ταιριάζει και πληρώνετε τον πάροχο απευθείας — μετρητά, κάρτα ή όπως προτιμά. Εμείς δεν χειριζόμαστε χρήματα.",
      },
    ],
    faqTitle: "Ερωτήσεις για τη λειτουργία",
    faq: [
      {
        q: "Πώς λειτουργεί;",
        a: "Συμπληρώνετε μια σύντομη φόρμα: τύπος δραστηριότητας, περιοχή, ημερομηνία, μέγεθος παρέας και τα στοιχεία επικοινωνίας σας. Προωθούμε το αίτημά σας στους τοπικούς παρόχους με τους οποίους συνεργαζόμαστε. Αυτοί απαντούν μέσω email με προσφορά για ολόκληρη την παρέα σας. Επιλέγετε έναν και τον πληρώνετε απευθείας.",
      },
      {
        q: "Πληρώνω online;",
        a: "Όχι — πληρώνετε τον πάροχο απευθείας εκείνη την ημέρα ή όπως έχετε συμφωνήσει μαζί του. Δεν υπάρχει online πληρωμή σε αυτόν τον ιστότοπο και δεν απαιτείται κάρτα για να στείλετε ένα αίτημα.",
      },
      {
        q: "Η τιμή είναι ανά άτομο;",
        a: "Όχι — κάθε προσφορά που λαμβάνετε είναι τιμολογημένη για ολόκληρη την παρέα σας. Ορισμένοι πάροχοι μπορεί να αναλύουν τιμή ανά άτομο στην προσφορά τους, αλλά ο αριθμός που συγκρίνετε είναι πάντα σύνολο ομάδας.",
      },
      {
        q: "Τι γίνεται αν κανείς δεν απαντήσει;",
        a: "Επικοινωνούμε ξανά με τους παρόχους μετά από 24 ώρες και σας απαντάμε σε κάθε περίπτωση. Αν δεν υπάρχει διαθέσιμος πάροχος για τον συνδυασμό σας, σας το λέμε ξεκάθαρα και καταγράφουμε το ενδιαφέρον σας για όταν η κάλυψη επεκταθεί.",
      },
    ],
    breadcrumbHome: "Αρχική",
    breadcrumbActivities: "Δραστηριότητες",
    categoriesTitle: "Επιλέξτε κατηγορία",
    onRequestBadge: "κατόπιν αιτήματος",
  },
};

// ---- Métadonnées par catégorie (/activities/[category]) -------------------------

export const CATEGORY_META: Record<string, Record<string, { title: string; desc: string }>> = {
  "food-tours": {
    en: {
      title: "Food & wine tours in Crete · quotes from local guides",
      desc: "Request a food or wine tour in Crete: local markets, family tavernas, olive oil, raki and wine from small producers. Local guides reply with a group quote in 24 h.",
    },
    fr: {
      title: "Tours gastronomiques en Crète · devis de guides locaux",
      desc: "Demandez une visite gastronomique ou oenologique en Crète : marchés locaux, tavernes familiales, huile d'olive, raki et vins de petits producteurs. Les guides locaux vous répondent avec un devis groupe sous 24 h.",
    },
    de: {
      title: "Kulinarische Touren auf Kreta · Angebote lokaler Guides",
      desc: "Kulinarische Tour oder Weinreise auf Kreta anfragen: lokale Märkte, Familientavernen, Olivenöl, Raki und Weine kleiner Erzeuger. Lokale Guides antworten innerhalb von 24 Stunden mit einem Gruppenangebot.",
    },
    el: {
      title: "Γαστρονομικές περιηγήσεις στην Κρήτη · προσφορές από τοπικούς ξεναγούς",
      desc: "Ζητήστε γαστρονομική ή οινολογική περιήγηση στην Κρήτη: τοπικές αγορές, οικογενειακές ταβέρνες, ελαιόλαδο, ρακή και κρασιά μικρών παραγωγών. Τοπικοί ξεναγοί απαντούν με προσφορά ομάδας σε 24 ώρες.",
    },
  },
  "boat-trips": {
    en: {
      title: "Boat trips in Crete · quotes from local skippers",
      desc: "Request a boat trip in Crete: coastline, hidden coves, swimming stops, sunset. Local skippers reply with a group quote in 24 h — no online prepayment.",
    },
    fr: {
      title: "Sorties en bateau en Crète · devis de patrons locaux",
      desc: "Demandez une sortie en bateau en Crète : côtes, criques cachées, baignades, coucher de soleil. Les patrons locaux vous répondent avec un devis groupe sous 24 h — aucun prépaiement en ligne.",
    },
    de: {
      title: "Bootsausflüge auf Kreta · Angebote lokaler Skipper",
      desc: "Bootsausflug auf Kreta anfragen: Küste, versteckte Buchten, Schwimmstopps, Sonnenuntergang. Lokale Skipper antworten mit einem Gruppenangebot in 24 Stunden — keine Online-Vorauszahlung.",
    },
    el: {
      title: "Εκδρομές με σκάφος στην Κρήτη · προσφορές από τοπικούς πλοίαρχους",
      desc: "Ζητήστε εκδρομή με σκάφος στην Κρήτη: ακτογραμμή, κρυμμένους κολπίσκους, κολύμπι, ηλιοβασίλεμα. Τοπικοί πλοίαρχοι απαντούν με προσφορά ομάδας σε 24 ώρες — καμία online προπληρωμή.",
    },
  },
  hiking: {
    en: {
      title: "Hiking & nature in Crete · quotes from local guides",
      desc: "Request a hiking or nature tour in Crete: gorges, E4 trail sections, wild flora, all difficulty levels. Local guides reply with a group quote in 24 h.",
    },
    fr: {
      title: "Randonnée & nature en Crète · devis de guides locaux",
      desc: "Demandez une randonnée ou une sortie nature en Crète : gorges, tronçons du sentier E4, flore sauvage, tous niveaux. Les guides locaux vous répondent avec un devis groupe sous 24 h.",
    },
    de: {
      title: "Wandern & Natur auf Kreta · Angebote lokaler Guides",
      desc: "Wander- oder Naturausflug auf Kreta anfragen: Schluchten, E4-Abschnitte, wilde Flora, alle Schwierigkeitsgrade. Lokale Guides antworten mit einem Gruppenangebot in 24 Stunden.",
    },
    el: {
      title: "Πεζοπορία & φύση στην Κρήτη · προσφορές από τοπικούς ξεναγούς",
      desc: "Ζητήστε πεζοπορία ή εκδρομή φύσης στην Κρήτη: φαράγγια, τμήματα μονοπατιού E4, άγρια χλωρίδα, όλα τα επίπεδα δυσκολίας. Τοπικοί ξεναγοί απαντούν με προσφορά ομάδας σε 24 ώρες.",
    },
  },
};

// ---- Textes courts par catégorie (H1 + intro hub) --------------------------------

export const CATEGORY_STRINGS: Record<string, Record<string, { h1: string; intro: string }>> = {
  "food-tours": {
    en: {
      h1: "Food & wine tours in Crete",
      intro: "Crete's food culture is built on what is grown locally: olive oil from small estates, cheeses produced in mountain villages, wild herbs, and wine from varieties that do not exist anywhere else. The raki that ends every meal is usually from a family still. Our food tour providers take you to the places where this actually happens — markets, tavernas run by the same family for generations, and producers who are not set up for mass tourism. Tell us what interests you and they reply with a price for your group.",
    },
    fr: {
      h1: "Tours gastronomiques en Crète",
      intro: "La culture culinaire crétoise repose sur ce qui est cultivé localement : huile d'olive de petits domaines, fromages produits dans les villages de montagne, herbes sauvages, et vins de cépages qu'on ne trouve nulle part ailleurs. Le raki qui termine chaque repas vient généralement d'un alambic familial. Nos prestataires de visites gastronomiques vous emmènent là où tout cela se passe vraiment — marchés, tavernes tenues par la même famille depuis des générations, et producteurs qui ne sont pas organisés pour le tourisme de masse. Dites-nous ce qui vous intéresse et ils vous répondent avec un prix pour votre groupe.",
    },
    de: {
      h1: "Kulinarische Touren auf Kreta",
      intro: "Kretas kulinarische Kultur beruht auf dem, was lokal angebaut wird: Olivenöl von kleinen Gütern, Käse aus Bergdörfern, Wildkräuter und Weine aus Sorten, die es nirgendwo sonst gibt. Der Raki, der jede Mahlzeit beendet, kommt meist aus einer Familienbrennerei. Unsere Anbieter kulinarischer Touren bringen Sie dorthin, wo all das wirklich stattfindet — auf Märkte, seit Generationen familiengeführte Tavernen und zu Erzeugern, die nicht für Massentourismus aufgestellt sind. Sagen Sie uns, was Sie interessiert, und sie antworten mit einem Preis für Ihre Gruppe.",
    },
    el: {
      h1: "Γαστρονομικές περιηγήσεις στην Κρήτη",
      intro: "Η γαστρονομική κουλτούρα της Κρήτης βασίζεται σε αυτό που καλλιεργείται τοπικά: ελαιόλαδο από μικρά κτήματα, τυριά που παράγονται σε ορεινά χωριά, άγρια βότανα και κρασιά από ποικιλίες που δεν υπάρχουν πουθενά αλλού. Η ρακή που τελειώνει κάθε γεύμα προέρχεται συνήθως από οικογενειακό αποστακτήριο. Οι πάροχοι γαστρονομικών περιηγήσεων σας πηγαίνουν εκεί που όλα αυτά συμβαίνουν πραγματικά — αγορές, ταβέρνες που η ίδια οικογένεια διατηρεί εδώ και γενιές, και παραγωγοί που δεν είναι στηθιμένοι για τον μαζικό τουρισμό. Πείτε μας τι σας ενδιαφέρει και σας απαντούν με τιμή για την παρέα σας.",
    },
  },
  "boat-trips": {
    en: {
      h1: "Boat trips in Crete",
      intro: "Crete's coastline is long and much of it is not reachable by road. A private or small-group boat trip is often the only way to get to the best coves and swimming spots. Most trips combine a few hours of sailing with swimming stops, snorkelling, and a return around sunset — but the exact route and pace are agreed with your skipper beforehand. Providers reply with a price for your whole group based on the area, duration and number of people.",
    },
    fr: {
      h1: "Sorties en bateau en Crète",
      intro: "La côte crétoise est longue et une grande partie n'est pas accessible par la route. Une sortie en bateau privé ou en petit groupe est souvent le seul moyen d'atteindre les plus belles criques et spots de baignade. La plupart des sorties associent quelques heures de navigation à des baignades, du snorkeling et un retour au coucher du soleil — mais le trajet exact et le rythme sont convenus avec votre skipper au préalable. Les prestataires vous répondent avec un prix pour votre groupe entier en fonction de la zone, de la durée et du nombre de personnes.",
    },
    de: {
      h1: "Bootsausflüge auf Kreta",
      intro: "Kretas Küste ist lang, und ein Großteil davon ist nicht auf dem Landweg erreichbar. Ein privater oder kleingruppenweiser Bootsausflug ist oft der einzige Weg zu den schönsten Buchten und Schwimmstellen. Die meisten Ausflüge kombinieren einige Stunden Segeln mit Schwimmstopps, Schnorcheln und einer Rückkehr bei Sonnenuntergang — aber Route und Tempo werden vorab mit Ihrem Skipper abgesprochen. Anbieter antworten mit einem Preis für Ihre gesamte Gruppe, basierend auf Region, Dauer und Personenzahl.",
    },
    el: {
      h1: "Εκδρομές με σκάφος στην Κρήτη",
      intro: "Η ακτογραμμή της Κρήτης είναι μεγάλη και μεγάλο μέρος της δεν είναι προσβάσιμο οδικώς. Μια ιδιωτική εκδρομή ή εκδρομή μικρής ομάδας με σκάφος είναι συχνά ο μόνος τρόπος να φτάσετε στους καλύτερους κολπίσκους και σημεία κολύμβησης. Οι περισσότερες εκδρομές συνδυάζουν μερικές ώρες πλεύσης με στάσεις για κολύμπι, κατάδυση με μάσκα και επιστροφή κατά το ηλιοβασίλεμα — αλλά η ακριβής διαδρομή και ο ρυθμός συμφωνούνται εκ των προτέρων με τον πλοίαρχό σας. Οι πάροχοι απαντούν με τιμή για ολόκληρη την παρέα σας βάσει της περιοχής, της διάρκειας και του αριθμού ατόμων.",
    },
  },
  hiking: {
    en: {
      h1: "Hiking & nature in Crete",
      intro: "Crete has one of the densest trail networks of any Greek island, from coastal paths to the White Mountains above 2 000 m. The most famous route is Samaria Gorge, but there are dozens of other gorges, sections of the E4 European long-distance trail, and quieter mountain paths where you are unlikely to meet other tourists. A local guide knows which paths are open, which require permits, and what the terrain actually feels like. They price their walks for your group — solo walkers, families and experienced trekkers all need different things.",
    },
    fr: {
      h1: "Randonnée & nature en Crète",
      intro: "La Crète possède l'un des réseaux de sentiers les plus denses de toutes les îles grecques, des chemins côtiers jusqu'aux Montagnes Blanches au-dessus de 2 000 m. L'itinéraire le plus connu est les Gorges de Samaria, mais il existe des dizaines d'autres gorges, des tronçons du sentier européen de grande randonnée E4, et des chemins de montagne plus tranquilles où vous n'êtes pas près de croiser d'autres touristes. Un guide local sait quels sentiers sont ouverts, lesquels nécessitent des autorisations, et à quoi ressemble vraiment le terrain. Il tarifie ses randonnées pour votre groupe — randonneurs solitaires, familles et trekkeurs expérimentés ont tous des besoins différents.",
    },
    de: {
      h1: "Wandern & Natur auf Kreta",
      intro: "Kreta hat eines der dichtesten Wegenetze aller griechischen Inseln — von Küstenpfaden bis zu den Weißen Bergen über 2 000 m. Die bekannteste Route ist die Samaria-Schlucht, aber es gibt Dutzende anderer Schluchten, Abschnitte des europäischen Fernwanderwegs E4 und ruhigere Bergpfade, auf denen man kaum anderen Touristen begegnet. Ein lokaler Guide weiß, welche Wege offen sind, welche Genehmigungen erfordern, und wie das Gelände wirklich ist. Er kalkuliert seine Wanderungen für Ihre Gruppe — Alleinwanderer, Familien und erfahrene Trekker haben alle unterschiedliche Bedürfnisse.",
    },
    el: {
      h1: "Πεζοπορία & φύση στην Κρήτη",
      intro: "Η Κρήτη έχει ένα από τα πυκνότερα δίκτυα μονοπατιών από όλα τα ελληνικά νησιά — από παράκτια μονοπάτια έως τα Λευκά Όρη πάνω από 2 000 μ. Η πιο γνωστή διαδρομή είναι το Φαράγγι της Σαμαριάς, αλλά υπάρχουν δεκάδες άλλα φαράγγια, τμήματα του ευρωπαϊκού μακρινού μονοπατιού Ε4, και πιο ήσυχα ορεινά μονοπάτια όπου είναι απίθανο να συναντήσετε άλλους τουρίστες. Ένας τοπικός ξεναγός γνωρίζει ποια μονοπάτια είναι ανοιχτά, ποια απαιτούν άδειες και πώς είναι πραγματικά το έδαφος. Τιμολογούν τις πεζοπορίες για την παρέα σας — μοναχικοί πεζοπόροι, οικογένειες και έμπειροι ορειβάτες έχουν όλοι διαφορετικές ανάγκες.",
    },
  },
};

// ---- Templates titre/intro pour les pages ville (/activities/[category]/[city]) --
// Placeholders : {category} et {city} sont remplacés dans les pages.

export const CITY_TITLE_TPL: Record<string, string> = {
  en: "{category} in {city}, Crete · direct quotes from local providers",
  fr: "{category} à {city}, Crète · devis directs de prestataires locaux",
  de: "{category} in {city}, Kreta · direkte Angebote von lokalen Anbietern",
  el: "{category} στην/στο {city}, Κρήτη · άμεσες προσφορές από τοπικούς παρόχους",
};

export const CITY_INTRO_TPL: Record<string, string> = {
  en: "Looking for {category} in {city}? Tell us your dates and group size — local providers based in or near {city} reply with a quote for your whole group. You pay them directly on the day.",
  fr: "Vous cherchez des {category} à {city} ? Indiquez-nous vos dates et la taille de votre groupe — des prestataires locaux basés à ou près de {city} vous répondent avec un devis pour votre groupe entier. Vous les payez directement sur place.",
  de: "Suchen Sie {category} in {city}? Teilen Sie uns Ihre Daten und Gruppengröße mit — lokale Anbieter in oder bei {city} antworten mit einem Angebot für Ihre gesamte Gruppe. Sie zahlen direkt vor Ort.",
  el: "Ψάχνετε για {category} στην/στο {city}; Πείτε μας τις ημερομηνίες σας και το μέγεθος της παρέας — τοπικοί πάροχοι με έδρα την/το {city} ή κοντά σε αυτήν/αυτό απαντούν με προσφορά για ολόκληρη την παρέα σας. Τους πληρώνετε απευθείας εκείνη την ημέρα.",
};
