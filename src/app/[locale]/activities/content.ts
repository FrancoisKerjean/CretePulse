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
  catalogTitle: string;
  catalogNote: string;
  catalogFrom: string;
  catalogCta: string;
};

// ---- Page mère /activities ------------------------------------------------------

export const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Activities in Crete · quotes from local providers",
    desc: "Request food tours, boat trips or hiking in Crete in four clicks. Local providers reply with a quote for your whole group. You pay them directly, no online prepayment.",
  },
  fr: {
    title: "Activités en Crète · devis de prestataires locaux",
    desc: "Demandez une visite gastronomique, une sortie en bateau ou une randonnée en Crète en quatre clics. Les prestataires locaux vous répondent avec un devis pour votre groupe. Vous les payez directement, aucun prépaiement en ligne.",
  },
  de: {
    title: "Aktivitäten auf Kreta · Angebote lokaler Anbieter",
    desc: "Fordern Sie in vier Klicks ein Angebot für Kulinarik-Touren, Bootsausflüge oder Wanderungen auf Kreta an. Lokale Anbieter antworten mit einem Preis für Ihre ganze Gruppe. Sie zahlen direkt, keine Online-Vorauszahlung.",
  },
  el: {
    title: "Δραστηριότητες στην Κρήτη · προσφορές από τοπικούς παρόχους",
    desc: "Ζητήστε γαστρονομική περιήγηση, εκδρομή με σκάφος ή πεζοπορία στην Κρήτη με τέσσερα κλικ. Τοπικοί πάροχοι απαντούν με προσφορά για ολόκληρη την παρέα σας. Πληρώνετε απευθείας, καμία online προπληρωμή.",
  },
  it: {
    title: "Attività a Creta · preventivi da operatori locali",
    desc: "Richiedi un tour gastronomico, un'escursione in barca o un'escursione a piedi a Creta in quattro clic. Gli operatori locali rispondono con un preventivo per il tuo gruppo intero. Paghi direttamente, nessun pagamento anticipato online.",
  },
  nl: {
    title: "Activiteiten op Kreta · offertes van lokale aanbieders",
    desc: "Vraag in vier klikken een foodtour, boottocht of wandeling op Kreta aan. Lokale aanbieders antwoorden met een offerte voor je hele groep. Je betaalt hen rechtstreeks, geen online vooruitbetaling.",
  },
  pl: {
    title: "Atrakcje na Krecie · wyceny od lokalnych organizatorów",
    desc: "Zamów tour kulinarny, rejs łodzią lub wycieczką pieszą na Krecie w cztery kliknięcia. Lokalni organizatorzy odpowiadają wyceną dla całej Twojej grupy. Płacisz bezpośrednio, bez przedpłaty online.",
  },
  es: {
    title: "Actividades en Creta · presupuestos de proveedores locales",
    desc: "Solicita un tour gastronómico, una excursión en barco o una caminata en Creta en cuatro clics. Los proveedores locales responden con un presupuesto para todo tu grupo. Pagas directamente, sin pago anticipado online.",
  },
  pt: {
    title: "Atividades em Creta · orçamentos de fornecedores locais",
    desc: "Pede um tour gastronómico, um passeio de barco ou uma caminhada em Creta em quatro cliques. Os fornecedores locais respondem com um orçamento para o teu grupo inteiro. Pagas diretamente, sem pré-pagamento online.",
  },
  ru: {
    title: "Активности на Крите · расчёты от местных операторов",
    desc: "Закажите гастрономический тур, прогулку на лодке или пеший поход на Крите в четыре клика. Местные операторы отвечают с расчётом для всей вашей группы. Вы платите напрямую, без онлайн-предоплаты.",
  },
  ja: {
    title: "クレタ島のアクティビティ · 地元業者からの見積もり",
    desc: "4回のクリックでクレタ島のグルメツアー、ボートトリップ、ハイキングをリクエスト。地元業者がグループ全体の見積もりを添えて返信します。支払いは直接業者へ、オンライン前払いなし。",
  },
  ko: {
    title: "크레타 액티비티 · 현지 업체의 견적",
    desc: "네 번의 클릭으로 크레타 푸드 투어, 보트 여행 또는 하이킹을 요청하세요. 현지 업체가 그룹 전체 견적을 보내줍니다. 직접 결제, 온라인 선결제 없음.",
  },
  zh: {
    title: "克里特岛活动 · 本地供应商报价",
    desc: "四次点击即可在克里特岛申请美食游览、游船或徒步。本地供应商直接回复您整个团队的报价。直接付款给供应商，无需在线预付。",
  },
  tr: {
    title: "Girit'te aktiviteler · yerel tedarikçilerden fiyat teklifleri",
    desc: "Girit'te gastronomi turu, tekne gezisi veya yürüyüş için dört tıklamayla talep oluşturun. Yerel tedarikçiler tüm grubunuz için fiyat teklifiyle yanıt verir. Doğrudan ödeme yapın, çevrimiçi ön ödeme yok.",
  },
  sv: {
    title: "Aktiviteter på Kreta · offerter från lokala aktörer",
    desc: "Begär en mattur, båttur eller vandring på Kreta med fyra klick. Lokala aktörer svarar med en offert för hela din grupp. Du betalar direkt, ingen förskottsbetalning online.",
  },
  da: {
    title: "Aktiviteter på Kreta · tilbud fra lokale udbydere",
    desc: "Anmod om en madtur, bådudflugt eller vandring på Kreta med fire klik. Lokale udbydere svarer med et tilbud til hele din gruppe. Du betaler direkte, ingen forudbetaling online.",
  },
  no: {
    title: "Aktiviteter på Kreta · tilbud fra lokale tilbydere",
    desc: "Be om en mattur, båttur eller vandring på Kreta med fire klikk. Lokale tilbydere svarer med et tilbud for hele gruppen din. Du betaler direkte, ingen forhåndsbetaling på nett.",
  },
  fi: {
    title: "Aktiviteetit Kreetalla · tarjoukset paikallisilta toimijoilta",
    desc: "Pyydä ruokakierrosta, veneretkeä tai vaellusta Kreetalla neljällä napsautuksella. Paikalliset toimijat vastaavat tarjouksella koko ryhmällesi. Maksat suoraan heille, ei verkkoennakkomaksua.",
  },
  cs: {
    title: "Aktivity na Krétě · nabídky od místních poskytovatelů",
    desc: "Požádejte o gastronomický výlet, plavbu na lodi nebo túru na Krétě ve čtyřech kliknutích. Místní poskytovatelé odpovídají nabídkou pro celou vaši skupinu. Platíte přímo, bez platby předem online.",
  },
  hu: {
    title: "Tevékenységek Krétán · árajánlatok helyi szolgáltatóktól",
    desc: "Kérjen gasztronómiai kirándulást, hajóutat vagy túrát Krétán négy kattintással. A helyi szolgáltatók az egész csoportjára szóló árajánlattal válaszolnak. Közvetlenül fizet nekik, online előleg nélkül.",
  },
  ro: {
    title: "Activități în Creta · oferte de la furnizori locali",
    desc: "Solicită un tur gastronomic, o excursie cu barca sau o drumeție în Creta în patru clicuri. Furnizorii locali răspund cu o ofertă pentru întregul tău grup. Plătești direct, fără plată în avans online.",
  },
  ar: {
    title: "أنشطة في كريت · عروض أسعار من مزودين محليين",
    desc: "اطلب جولة غذائية أو رحلة قاربية أو مشياً في كريت بأربع نقرات. يردّ المزودون المحليون بعرض سعر لمجموعتك بالكامل. تدفع مباشرةً، بلا دفع مسبق عبر الإنترنت.",
  },
};

export const STRINGS: Record<string, ActivityPageStrings> = {
  en: {
    h1: "Activities in Crete · get quotes from local providers",
    intro: "Tell us what you want to do, where and when. Local providers we work with reply directly with a price for your whole group. You compare, pick one, and pay them on the day, no online prepayment, no booking platform in between.",
    howTitle: "How it works",
    how: [
      {
        h: "Tell us what you want to do",
        p: "Choose a category (food tour, boat trip, hiking), select your area and dates, and tell us how many people are in your group.",
      },
      {
        h: "Local providers reply with a quote",
        p: "Providers we have verified in the area receive your request and reply by email with a price for your whole group, not per person. You hear back within 24 hours.",
      },
      {
        h: "Compare, pick one, pay directly",
        p: "You choose the offer that suits you and pay the provider directly, cash, card, or however they prefer. We do not handle money.",
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
        a: "No, you pay the provider directly on the day or as agreed with them. There is no online payment on this site and no card required to send a request.",
      },
      {
        q: "Is the price per person?",
        a: "No, every quote you receive is priced for your whole group. Some providers may give you a per-person breakdown inside their quote, but the number you compare is always a group total.",
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
    catalogTitle: "Example activities",
    catalogNote: "Real activities offered in the area, shown as examples. The exact price and availability come from the providers' quotes for your group.",
    catalogFrom: "from ~{price}€ / person",
    catalogCta: "Request a quote",
  },
  fr: {
    h1: "Activités en Crète · recevez des devis de prestataires locaux",
    intro: "Dites-nous ce que vous voulez faire, où et quand. Les prestataires locaux avec lesquels nous travaillons vous répondent directement avec un prix pour votre groupe entier. Vous comparez, vous choisissez, et vous les payez sur place, aucun prépaiement en ligne, aucune plateforme intermédiaire.",
    howTitle: "Comment ça marche",
    how: [
      {
        h: "Dites-nous ce que vous voulez faire",
        p: "Choisissez une catégorie (visite gastronomique, sortie en bateau, randonnée), sélectionnez votre zone et vos dates, et indiquez-nous la taille de votre groupe.",
      },
      {
        h: "Les prestataires locaux vous répondent avec un devis",
        p: "Les prestataires que nous avons vérifiés dans la zone reçoivent votre demande et vous répondent par email avec un prix pour votre groupe entier, pas par personne. Vous recevez une réponse sous 24 heures.",
      },
      {
        h: "Comparez, choisissez, payez directement",
        p: "Vous choisissez l'offre qui vous convient et vous payez le prestataire directement, espèces, carte, ou selon leur préférence. Nous ne manipulons pas l'argent.",
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
        a: "Non, vous payez le prestataire directement sur place ou selon ce qui est convenu avec lui. Il n'y a aucun paiement en ligne sur ce site et aucune carte n'est requise pour envoyer une demande.",
      },
      {
        q: "Le prix est-il par personne ?",
        a: "Non, chaque devis que vous recevez est établi pour votre groupe entier. Certains prestataires peuvent vous détailler un tarif par personne dans leur devis, mais le chiffre que vous comparez est toujours un total groupe.",
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
    catalogTitle: "Exemples d'activités",
    catalogNote: "Activités réellement proposées dans la région, montrées à titre d'exemple. Le prix exact et la disponibilité viennent des devis des prestataires pour votre groupe.",
    catalogFrom: "à partir de ~{price}€ / pers",
    catalogCta: "Demander un devis",
  },
  de: {
    h1: "Aktivitäten auf Kreta · Angebote von lokalen Anbietern erhalten",
    intro: "Sagen Sie uns, was Sie unternehmen möchten, wo und wann. Die lokalen Anbieter, mit denen wir zusammenarbeiten, antworten Ihnen direkt mit einem Preis für Ihre gesamte Gruppe. Sie vergleichen, wählen einen aus und zahlen am Tag selbst, keine Online-Vorauszahlung, keine Buchungsplattform dazwischen.",
    howTitle: "So funktioniert es",
    how: [
      {
        h: "Sagen Sie uns, was Sie unternehmen möchten",
        p: "Wählen Sie eine Kategorie (kulinarische Tour, Bootsausflug, Wandern), wählen Sie Ihre Region und Ihr Datum, und geben Sie uns die Gruppengröße an.",
      },
      {
        h: "Lokale Anbieter antworten mit einem Angebot",
        p: "Anbieter, die wir in der Region überprüft haben, erhalten Ihre Anfrage und antworten per E-Mail mit einem Preis für Ihre gesamte Gruppe, nicht pro Person. Sie erhalten eine Antwort innerhalb von 24 Stunden.",
      },
      {
        h: "Vergleichen, auswählen, direkt zahlen",
        p: "Sie wählen das passende Angebot und zahlen direkt beim Anbieter, bar, mit Karte oder nach seiner Präferenz. Wir nehmen kein Geld in die Hand.",
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
        a: "Nein, Sie zahlen dem Anbieter direkt vor Ort oder wie mit ihm vereinbart. Auf dieser Website gibt es keine Online-Zahlung, und zum Absenden einer Anfrage ist keine Karte erforderlich.",
      },
      {
        q: "Ist der Preis pro Person?",
        a: "Nein, jedes Angebot, das Sie erhalten, ist für Ihre gesamte Gruppe kalkuliert. Einige Anbieter können einen Pro-Kopf-Betrag in ihrem Angebot aufführen, aber die Zahl, die Sie vergleichen, ist immer ein Gruppengesamtpreis.",
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
    catalogTitle: "Beispiel-Aktivitäten",
    catalogNote: "Aktivitäten, die in der Region tatsächlich angeboten werden, als Beispiele gezeigt. Der genaue Preis und die Verfügbarkeit kommen aus den Angeboten der Anbieter für Ihre Gruppe.",
    catalogFrom: "ab ~{price}€ / Person",
    catalogCta: "Angebot anfordern",
  },
  el: {
    h1: "Δραστηριότητες στην Κρήτη · λάβετε προσφορές από τοπικούς παρόχους",
    intro: "Πείτε μας τι θέλετε να κάνετε, πού και πότε. Τοπικοί πάροχοι με τους οποίους συνεργαζόμαστε σας απαντούν απευθείας με μια τιμή για ολόκληρη την παρέα σας. Συγκρίνετε, επιλέγετε έναν και τον πληρώνετε εκείνη την ημέρα, καμία online προπληρωμή, καμία ενδιάμεση πλατφόρμα.",
    howTitle: "Πώς λειτουργεί",
    how: [
      {
        h: "Πείτε μας τι θέλετε να κάνετε",
        p: "Επιλέξτε μια κατηγορία (γαστρονομική περιήγηση, εκδρομή με σκάφος, πεζοπορία), διαλέξτε την περιοχή και τις ημερομηνίες σας, και πείτε μας το μέγεθος της παρέας σας.",
      },
      {
        h: "Τοπικοί πάροχοι απαντούν με προσφορά",
        p: "Πάροχοι που έχουμε επαληθεύσει στην περιοχή λαμβάνουν το αίτημά σας και απαντούν μέσω email με τιμή για ολόκληρη την παρέα σας, όχι ανά άτομο. Λαμβάνετε απάντηση εντός 24 ωρών.",
      },
      {
        h: "Συγκρίνετε, επιλέξτε, πληρώστε απευθείας",
        p: "Επιλέγετε την προσφορά που σας ταιριάζει και πληρώνετε τον πάροχο απευθείας, μετρητά, κάρτα ή όπως προτιμά. Εμείς δεν χειριζόμαστε χρήματα.",
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
        a: "Όχι, πληρώνετε τον πάροχο απευθείας εκείνη την ημέρα ή όπως έχετε συμφωνήσει μαζί του. Δεν υπάρχει online πληρωμή σε αυτόν τον ιστότοπο και δεν απαιτείται κάρτα για να στείλετε ένα αίτημα.",
      },
      {
        q: "Η τιμή είναι ανά άτομο;",
        a: "Όχι, κάθε προσφορά που λαμβάνετε είναι τιμολογημένη για ολόκληρη την παρέα σας. Ορισμένοι πάροχοι μπορεί να αναλύουν τιμή ανά άτομο στην προσφορά τους, αλλά ο αριθμός που συγκρίνετε είναι πάντα σύνολο ομάδας.",
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
    catalogTitle: "Παραδείγματα δραστηριοτήτων",
    catalogNote: "Δραστηριότητες που πραγματικά προσφέρονται στην περιοχή, ως παραδείγματα. Η ακριβής τιμή και η διαθεσιμότητα προκύπτουν από τις προσφορές των παρόχων για την παρέα σας.",
    catalogFrom: "από ~{price}€ / άτομο",
    catalogCta: "Ζητήστε προσφορά",
  },
  it: {
    h1: "Attività a Creta · ricevi preventivi da operatori locali",
    intro: "Dicci cosa vuoi fare, dove e quando. Gli operatori locali con cui lavoriamo ti rispondono direttamente con un prezzo per il tuo gruppo intero. Confronti, scegli uno e lo paghi sul posto, nessun pagamento anticipato online, nessuna piattaforma intermediaria.",
    howTitle: "Come funziona",
    how: [
      {
        h: "Dicci cosa vuoi fare",
        p: "Scegli una categoria (tour gastronomico, escursione in barca, escursione a piedi), seleziona la tua zona e le date, e comunicaci la dimensione del tuo gruppo.",
      },
      {
        h: "Gli operatori locali rispondono con un preventivo",
        p: "Gli operatori che abbiamo verificato nella zona ricevono la tua richiesta e rispondono via email con un prezzo per il tuo gruppo intero, non a persona. Ricevi una risposta entro 24 ore.",
      },
      {
        h: "Confronta, scegli, paga direttamente",
        p: "Scegli l'offerta che fa per te e paghi l'operatore direttamente, contanti, carta o come preferisce lui. Noi non gestiamo denaro.",
      },
    ],
    faqTitle: "Domande sul funzionamento",
    faq: [
      {
        q: "Come funziona?",
        a: "Compili un breve modulo: tipo di attività, zona, data, dimensione del gruppo e i tuoi contatti. Inoltriaimo la tua richiesta agli operatori locali con cui collaboriamo. Rispondono via email con un preventivo per il tuo gruppo intero. Ne scegli uno e lo paghi direttamente.",
      },
      {
        q: "Devo pagare online?",
        a: "No, paghi l'operatore direttamente sul posto o come concordato con lui. Non c'è alcun pagamento online su questo sito e non serve nessuna carta per inviare una richiesta.",
      },
      {
        q: "Il prezzo è a persona?",
        a: "No, ogni preventivo che ricevi è calcolato per il tuo gruppo intero. Alcuni operatori possono indicare un importo a persona nel preventivo, ma il numero che confronti è sempre un totale di gruppo.",
      },
      {
        q: "Cosa succede se nessuno risponde?",
        a: "Ricontattiaimo gli operatori dopo 24 ore e ti rispondiamo in ogni caso. Se nessun operatore è disponibile per la tua combinazione, te lo diciamo chiaramente e registriamo il tuo interesse per quando la copertura si espanderà.",
      },
    ],
    breadcrumbHome: "Home",
    breadcrumbActivities: "Attività",
    categoriesTitle: "Scegli una categoria",
    onRequestBadge: "su richiesta",
    catalogTitle: "Esempi di attività",
    catalogNote: "Attività realmente proposte nella zona, mostrate a titolo di esempio. Il prezzo esatto e la disponibilità provengono dai preventivi dei fornitori per il tuo gruppo.",
    catalogFrom: "da ~{price}€ / persona",
    catalogCta: "Richiedi un preventivo",
  },
  nl: {
    h1: "Activiteiten op Kreta · ontvang offertes van lokale aanbieders",
    intro: "Vertel ons wat je wilt doen, waar en wanneer. De lokale aanbieders waarmee we samenwerken antwoorden je rechtstreeks met een prijs voor je hele groep. Je vergelijkt, kiest er één en betaalt hem ter plekke, geen online vooruitbetaling, geen tussenplatform.",
    howTitle: "Zo werkt het",
    how: [
      {
        h: "Vertel ons wat je wilt doen",
        p: "Kies een categorie (foodtour, boottocht, wandeling), selecteer je gebied en datums, en geef ons de groepsgrootte op.",
      },
      {
        h: "Lokale aanbieders reageren met een offerte",
        p: "Aanbieders die we in het gebied hebben geverifieerd ontvangen je aanvraag en reageren via e-mail met een prijs voor je hele groep, niet per persoon. Je ontvangt een reactie binnen 24 uur.",
      },
      {
        h: "Vergelijk, kies, betaal rechtstreeks",
        p: "Je kiest het aanbod dat bij je past en betaalt de aanbieder rechtstreeks, contant, per kaart of hoe hij het verkiest. Wij verwerken geen geld.",
      },
    ],
    faqTitle: "Vragen over de werking",
    faq: [
      {
        q: "Hoe werkt het?",
        a: "Je vult een kort formulier in: type activiteit, gebied, datum, groepsgrootte en je contactgegevens. We sturen je aanvraag door naar de lokale aanbieders waarmee we samenwerken. Zij reageren via e-mail met een offerte voor je hele groep. Je kiest er één en betaalt hem rechtstreeks.",
      },
      {
        q: "Moet ik online betalen?",
        a: "Nee, je betaalt de aanbieder rechtstreeks ter plekke of zoals afgesproken met hem. Op deze site is er geen online betaling en er is geen kaart nodig om een aanvraag te sturen.",
      },
      {
        q: "Is de prijs per persoon?",
        a: "Nee, elke offerte die je ontvangt is geprijsd voor je hele groep. Sommige aanbieders kunnen een bedrag per persoon vermelden in hun offerte, maar het getal dat je vergelijkt is altijd een groepstotaal.",
      },
      {
        q: "Wat als niemand reageert?",
        a: "We nemen na 24 uur opnieuw contact op met de aanbieders en sturen je sowieso een bericht. Als er geen aanbieder beschikbaar is voor jouw combinatie, vertellen we dat je dat direct en noteren we je interesse voor wanneer het aanbod uitbreidt.",
      },
    ],
    breadcrumbHome: "Home",
    breadcrumbActivities: "Activiteiten",
    categoriesTitle: "Kies een categorie",
    onRequestBadge: "op aanvraag",
    catalogTitle: "Voorbeeldactiviteiten",
    catalogNote: "Activiteiten die echt in de regio worden aangeboden, getoond als voorbeelden. De exacte prijs en beschikbaarheid komen uit de offertes van de aanbieders voor jouw groep.",
    catalogFrom: "vanaf ~{price}€ / persoon",
    catalogCta: "Offerte aanvragen",
  },
  pl: {
    h1: "Atrakcje na Krecie · otrzymaj wyceny od lokalnych organizatorów",
    intro: "Powiedz nam, co chcesz robić, gdzie i kiedy. Lokalni organizatorzy, z którymi współpracujemy, odpowiadają Ci bezpośrednio z ceną dla całej Twojej grupy. Porównujesz, wybierasz jednego i płacisz mu na miejscu, bez przedpłaty online, żadnej pośredniej platformy.",
    howTitle: "Jak to działa",
    how: [
      {
        h: "Powiedz nam, co chcesz robić",
        p: "Wybierz kategorię (tour kulinarny, rejs łodzią, wycieczka piesza), zaznacz swój region i daty, i powiedz nam, ile osób jest w Twojej grupie.",
      },
      {
        h: "Lokalni organizatorzy odpowiadają wyceną",
        p: "Organizatorzy, których zweryfikowaliśmy w danym rejonie, otrzymują Twoje zapytanie i odpowiadają mailem z ceną dla całej Twojej grupy, nie od osoby. Odpowiedź otrzymasz w ciągu 24 godzin.",
      },
      {
        h: "Porównaj, wybierz, zapłać bezpośrednio",
        p: "Wybierasz ofertę, która Ci odpowiada, i płacisz organizatorowi bezpośrednio, gotówką, kartą lub jak woli. My nie obsługujemy pieniędzy.",
      },
    ],
    faqTitle: "Pytania dotyczące zasad działania",
    faq: [
      {
        q: "Jak to działa?",
        a: "Wypełniasz krótki formularz: rodzaj aktywności, region, data, liczba osób i Twoje dane kontaktowe. Przesyłamy Twoje zapytanie do lokalnych organizatorów, z którymi współpracujemy. Odpowiadają mailem z wyceną dla całej Twojej grupy. Wybierasz jednego i płacisz mu bezpośrednio.",
      },
      {
        q: "Czy muszę płacić online?",
        a: "Nie, płacisz organizatorowi bezpośrednio na miejscu lub zgodnie z ustaleniami z nim. Na tej stronie nie ma płatności online i nie potrzebujesz karty, żeby wysłać zapytanie.",
      },
      {
        q: "Czy cena jest od osoby?",
        a: "Nie, każda wycena, którą otrzymujesz, jest skalkulowana dla całej Twojej grupy. Niektórzy organizatorzy mogą podać kwotę od osoby w swojej wycenie, ale liczba, którą porównujesz, to zawsze suma dla grupy.",
      },
      {
        q: "Co jeśli nikt nie odpowie?",
        a: "Kontaktujemy się z organizatorami ponownie po 24 godzinach i odpisujemy Ci w każdym przypadku. Jeśli żaden organizator nie jest dostępny dla Twojej kombinacji, mówimy Ci o tym wprost i odnotowujemy Twoje zainteresowanie na przyszłość.",
      },
    ],
    breadcrumbHome: "Strona główna",
    breadcrumbActivities: "Atrakcje",
    categoriesTitle: "Wybierz kategorię",
    onRequestBadge: "na żądanie",
    catalogTitle: "Przykładowe atrakcje",
    catalogNote: "Atrakcje rzeczywiście dostępne w regionie, pokazane jako przykłady. Dokładna cena i dostępność pochodzą z wycen organizatorów dla Twojej grupy.",
    catalogFrom: "od ~{price}€ / os.",
    catalogCta: "Poproś o wycenę",
  },
  es: {
    h1: "Actividades en Creta · recibe presupuestos de proveedores locales",
    intro: "Cuéntanos qué quieres hacer, dónde y cuándo. Los proveedores locales con los que trabajamos te responden directamente con un precio para todo tu grupo. Comparas, eliges uno y lo pagas el mismo día, sin pago anticipado online, sin plataforma intermediaria.",
    howTitle: "Cómo funciona",
    how: [
      {
        h: "Cuéntanos qué quieres hacer",
        p: "Elige una categoría (tour gastronómico, excursión en barco, senderismo), selecciona tu zona y fechas, e indícanos el tamaño de tu grupo.",
      },
      {
        h: "Los proveedores locales responden con un presupuesto",
        p: "Los proveedores que hemos verificado en la zona reciben tu solicitud y responden por correo electrónico con un precio para todo tu grupo, no por persona. Recibes respuesta en 24 horas.",
      },
      {
        h: "Compara, elige, paga directamente",
        p: "Eliges la oferta que te conviene y pagas al proveedor directamente, efectivo, tarjeta o como prefiera él. Nosotros no gestionamos dinero.",
      },
    ],
    faqTitle: "Preguntas sobre el funcionamiento",
    faq: [
      {
        q: "¿Cómo funciona?",
        a: "Rellenas un breve formulario: tipo de actividad, zona, fecha, tamaño del grupo y tus datos de contacto. Enviamos tu solicitud a los proveedores locales con los que trabajamos. Responden por correo electrónico con un presupuesto para todo tu grupo. Eliges uno y lo pagas directamente.",
      },
      {
        q: "¿Tengo que pagar online?",
        a: "No, pagas al proveedor directamente en el momento o según lo acordado con él. No hay ningún pago online en este sitio y no se necesita tarjeta para enviar una solicitud.",
      },
      {
        q: "¿El precio es por persona?",
        a: "No, cada presupuesto que recibes está calculado para todo tu grupo. Algunos proveedores pueden incluir un desglose por persona en su presupuesto, pero el número que comparas es siempre un total de grupo.",
      },
      {
        q: "¿Qué pasa si nadie responde?",
        a: "Hacemos un seguimiento con los proveedores después de 24 horas y te respondemos en cualquier caso. Si ningún proveedor está disponible para tu combinación, te lo decimos directamente y anotamos tu interés para cuando la cobertura se amplíe.",
      },
    ],
    breadcrumbHome: "Inicio",
    breadcrumbActivities: "Actividades",
    categoriesTitle: "Elige una categoría",
    onRequestBadge: "a petición",
    catalogTitle: "Ejemplos de actividades",
    catalogNote: "Actividades realmente ofrecidas en la zona, mostradas como ejemplos. El precio exacto y la disponibilidad provienen de los presupuestos de los proveedores para tu grupo.",
    catalogFrom: "desde ~{price}€ / persona",
    catalogCta: "Solicitar presupuesto",
  },
  pt: {
    h1: "Atividades em Creta · recebe orçamentos de fornecedores locais",
    intro: "Diz-nos o que queres fazer, onde e quando. Os fornecedores locais com quem trabalhamos respondem-te diretamente com um preço para todo o teu grupo. Comparas, escolhes um e pagas-lhe no dia, sem pré-pagamento online, sem plataforma intermediária.",
    howTitle: "Como funciona",
    how: [
      {
        h: "Diz-nos o que queres fazer",
        p: "Escolhe uma categoria (tour gastronómico, passeio de barco, caminhada), seleciona a tua zona e datas, e indica-nos o tamanho do teu grupo.",
      },
      {
        h: "Os fornecedores locais respondem com um orçamento",
        p: "Os fornecedores que verificámos na zona recebem o teu pedido e respondem por e-mail com um preço para todo o teu grupo, não por pessoa. Recebes resposta em 24 horas.",
      },
      {
        h: "Compara, escolhe, paga diretamente",
        p: "Escolhes a oferta que te convém e pagas ao fornecedor diretamente, dinheiro, cartão ou como ele preferir. Nós não tratamos de dinheiro.",
      },
    ],
    faqTitle: "Perguntas sobre o funcionamento",
    faq: [
      {
        q: "Como funciona?",
        a: "Preenches um breve formulário: tipo de atividade, zona, data, tamanho do grupo e os teus contactos. Enviamos o teu pedido aos fornecedores locais com quem trabalhamos. Eles respondem por e-mail com um orçamento para todo o teu grupo. Escolhes um e pagas-lhe diretamente.",
      },
      {
        q: "Tenho de pagar online?",
        a: "Não, pagas ao fornecedor diretamente no local ou conforme acordado com ele. Não há qualquer pagamento online neste site e não é necessário cartão para enviar um pedido.",
      },
      {
        q: "O preço é por pessoa?",
        a: "Não, cada orçamento que recebes é calculado para todo o teu grupo. Alguns fornecedores podem incluir um valor por pessoa no orçamento, mas o número que comparas é sempre um total de grupo.",
      },
      {
        q: "E se ninguém responder?",
        a: "Contactamos os fornecedores novamente após 24 horas e escrevemos-te de qualquer forma. Se nenhum fornecedor estiver disponível para a tua combinação, dizemo-lo diretamente e registamos o teu interesse para quando a cobertura se expandir.",
      },
    ],
    breadcrumbHome: "Início",
    breadcrumbActivities: "Atividades",
    categoriesTitle: "Escolhe uma categoria",
    onRequestBadge: "a pedido",
    catalogTitle: "Exemplos de atividades",
    catalogNote: "Atividades realmente oferecidas na região, mostradas como exemplos. O preço exato e a disponibilidade vêm dos orçamentos dos fornecedores para o teu grupo.",
    catalogFrom: "a partir de ~{price}€ / pessoa",
    catalogCta: "Pedir orçamento",
  },
  ru: {
    h1: "Активности на Крите · получите расчёты от местных операторов",
    intro: "Расскажите нам, что хотите сделать, где и когда. Местные операторы, с которыми мы работаем, отвечают напрямую с ценой для всей вашей группы. Вы сравниваете, выбираете одного и платите ему в день активности, без онлайн-предоплаты, без посредников.",
    howTitle: "Как это работает",
    how: [
      {
        h: "Расскажите, что хотите сделать",
        p: "Выберите категорию (гастрономический тур, прогулка на лодке, пеший поход), укажите район и даты, а также размер вашей группы.",
      },
      {
        h: "Местные операторы отвечают с расчётом",
        p: "Операторы, которых мы проверили в данном районе, получают вашу заявку и отвечают по электронной почте с ценой для всей вашей группы, не с человека. Вы получаете ответ в течение 24 часов.",
      },
      {
        h: "Сравните, выберите, платите напрямую",
        p: "Вы выбираете подходящее предложение и платите оператору напрямую, наличными, картой или как ему удобно. Мы деньги не принимаем.",
      },
    ],
    faqTitle: "Вопросы о том, как это работает",
    faq: [
      {
        q: "Как это работает?",
        a: "Вы заполняете короткую форму: тип активности, район, дата, размер группы и ваши контактные данные. Мы пересылаем вашу заявку местным операторам, с которыми сотрудничаем. Они отвечают по электронной почте с расчётом для всей вашей группы. Вы выбираете одного и платите ему напрямую.",
      },
      {
        q: "Нужно ли платить онлайн?",
        a: "Нет, вы платите оператору напрямую в день активности или по договорённости с ним. На этом сайте нет онлайн-оплаты, и для отправки заявки карта не нужна.",
      },
      {
        q: "Цена указана за человека?",
        a: "Нет, каждый расчёт, который вы получаете, рассчитан для всей вашей группы. Некоторые операторы могут указать сумму за человека внутри расчёта, но число, которое вы сравниваете, это всегда итог для группы.",
      },
      {
        q: "Что если никто не ответит?",
        a: "Мы связываемся с операторами повторно через 24 часа и пишем вам в любом случае. Если ни один оператор не доступен для вашей комбинации, мы говорим об этом прямо и фиксируем ваш интерес на будущее.",
      },
    ],
    breadcrumbHome: "Главная",
    breadcrumbActivities: "Активности",
    categoriesTitle: "Выберите категорию",
    onRequestBadge: "по запросу",
    catalogTitle: "Примеры активностей",
    catalogNote: "Активности, которые реально предлагаются в данном районе, показаны в качестве примеров. Точная цена и наличие берутся из расчётов операторов для вашей группы.",
    catalogFrom: "от ~{price}€ / чел.",
    catalogCta: "Запросить расчёт",
  },
  ja: {
    h1: "クレタ島のアクティビティ · 地元業者から見積もりを受け取る",
    intro: "何をしたいか、どこで、いつかを教えてください。当サイトが連携する地元業者がグループ全体の料金を直接お知らせします。比較して、一社を選び、当日に直接支払います、オンライン前払いなし、仲介プラットフォームなし。",
    howTitle: "ご利用の流れ",
    how: [
      {
        h: "やりたいことを教えてください",
        p: "カテゴリー（グルメツアー、ボートトリップ、ハイキング）を選び、エリアと日程を指定して、グループの人数をお知らせください。",
      },
      {
        h: "地元業者が見積もりを返信します",
        p: "当サイトがその地区で確認した業者がリクエストを受け取り、グループ全体の料金をメールでお知らせします、一人当たりではありません。24時間以内に返信が届きます。",
      },
      {
        h: "比較して、選んで、直接支払う",
        p: "希望に合うオファーを選び、業者に直接お支払いください。現金、カード、または業者の希望する方法で。当サイトは料金を一切受け取りません。",
      },
    ],
    faqTitle: "よくある質問",
    faq: [
      {
        q: "どのように利用しますか？",
        a: "短いフォームに入力します：アクティビティの種類、エリア、日程、グループ人数、連絡先。当サイトが連携する地元業者にリクエストを転送します。業者はグループ全体の見積もりをメールで送ります。一社を選び、直接支払います。",
      },
      {
        q: "オンラインで支払いが必要ですか？",
        a: "いいえ、当日または業者との合意に基づいて直接支払います。このサイトにオンライン決済はなく、リクエスト送信にカードは不要です。",
      },
      {
        q: "料金は一人当たりですか？",
        a: "いいえ、受け取るすべての見積もりはグループ全体の料金です。業者によっては見積もり内に一人当たりの内訳を記載することがありますが、比較する数字は常にグループ合計です。",
      },
      {
        q: "誰も返信しなかった場合は？",
        a: "24時間後に業者に再度連絡し、いずれの場合もメールでお知らせします。ご希望の組み合わせに対応できる業者がいない場合は直接お伝えし、将来カバレッジが拡大した際のためにご関心を記録します。",
      },
    ],
    breadcrumbHome: "ホーム",
    breadcrumbActivities: "アクティビティ",
    categoriesTitle: "カテゴリーを選ぶ",
    onRequestBadge: "要リクエスト",
    catalogTitle: "アクティビティ例",
    catalogNote: "この地域で実際に提供されているアクティビティを例として紹介しています。正確な料金と空き状況は、業者があなたのグループへ提示する見積もりによります。",
    catalogFrom: "~{price}€ / 人から",
    catalogCta: "見積もりを依頼する",
  },
  ko: {
    h1: "크레타 액티비티 · 현지 업체의 견적 받기",
    intro: "무엇을 하고 싶은지, 어디서, 언제인지 알려주세요. 저희가 협력하는 현지 업체가 그룹 전체 가격을 직접 알려드립니다. 비교하고, 하나를 선택하고, 당일 직접 결제합니다, 온라인 선결제 없음, 중간 플랫폼 없음.",
    howTitle: "이용 방법",
    how: [
      {
        h: "하고 싶은 것을 알려주세요",
        p: "카테고리(음식 투어, 보트 여행, 하이킹)를 선택하고 지역과 날짜를 지정한 후 그룹 인원을 알려주세요.",
      },
      {
        h: "현지 업체가 견적으로 답변합니다",
        p: "해당 지역에서 저희가 확인한 업체가 요청을 받고 그룹 전체 가격을 이메일로 보내드립니다, 1인당 가격이 아닙니다. 24시간 이내에 답변을 받으실 수 있습니다.",
      },
      {
        h: "비교하고, 선택하고, 직접 결제하세요",
        p: "원하는 제안을 선택하고 업체에 직접 결제하세요, 현금, 카드 또는 업체가 선호하는 방식으로. 저희는 돈을 처리하지 않습니다.",
      },
    ],
    faqTitle: "이용 방법에 대한 질문",
    faq: [
      {
        q: "어떻게 이용하나요?",
        a: "짧은 양식을 작성합니다: 활동 유형, 지역, 날짜, 그룹 크기 및 연락처. 저희가 협력하는 현지 업체에 요청을 전달합니다. 업체는 그룹 전체 견적을 이메일로 보냅니다. 하나를 선택하고 직접 결제합니다.",
      },
      {
        q: "온라인으로 결제해야 하나요?",
        a: "아니요, 당일 또는 업체와의 합의에 따라 직접 결제합니다. 이 사이트에는 온라인 결제가 없으며, 요청을 보내는 데 카드가 필요하지 않습니다.",
      },
      {
        q: "가격이 1인당인가요?",
        a: "아니요, 받으시는 모든 견적은 그룹 전체를 위한 가격입니다. 일부 업체는 견적 내에 1인당 금액을 명시할 수 있지만, 비교하는 숫자는 항상 그룹 합계입니다.",
      },
      {
        q: "아무도 답변하지 않으면 어떻게 되나요?",
        a: "24시간 후 업체에 재연락하고 어떤 경우에도 이메일로 알려드립니다. 원하시는 조합에 가능한 업체가 없는 경우 직접 말씀드리고, 향후 범위가 확대될 때를 위해 관심사를 기록합니다.",
      },
    ],
    breadcrumbHome: "홈",
    breadcrumbActivities: "액티비티",
    categoriesTitle: "카테고리 선택",
    onRequestBadge: "요청 시",
    catalogTitle: "활동 예시",
    catalogNote: "해당 지역에서 실제로 제공되는 활동을 예시로 보여드립니다. 정확한 가격과 가용 여부는 업체가 귀하의 그룹에 제시하는 견적에 따라 다릅니다.",
    catalogFrom: "~{price}€ / 인당부터",
    catalogCta: "견적 요청하기",
  },
  zh: {
    h1: "克里特岛活动 · 获取本地供应商报价",
    intro: "告诉我们您想做什么、在哪里、什么时候。我们合作的本地供应商会直接回复您整个团队的价格。您比较、选择一家，当天直接付款，无需在线预付，没有中间平台。",
    howTitle: "如何使用",
    how: [
      {
        h: "告诉我们您想做什么",
        p: "选择类别（美食游览、游船、徒步），选择您的地区和日期，并告知我们团队人数。",
      },
      {
        h: "本地供应商回复报价",
        p: "我们在该地区核实过的供应商收到您的请求后，会通过电子邮件回复您整个团队的价格，而非每人单价。您将在24小时内收到回复。",
      },
      {
        h: "比较、选择、直接付款",
        p: "选择适合您的方案，直接向供应商付款，现金、银行卡或他们偏好的方式。我们不处理任何款项。",
      },
    ],
    faqTitle: "关于使用方式的问题",
    faq: [
      {
        q: "如何使用？",
        a: "填写简短表格：活动类型、地区、日期、团队人数和您的联系方式。我们将您的请求转发给合作的本地供应商。他们通过电子邮件回复您整个团队的报价。您选择一家，直接付款给他们。",
      },
      {
        q: "需要在线付款吗？",
        a: "不需要，您在当天或按与供应商商定的方式直接付款。本网站没有在线支付，发送请求也不需要银行卡。",
      },
      {
        q: "价格是每人的吗？",
        a: "不是，您收到的每份报价都是针对整个团队的价格。部分供应商可能在报价中提供每人费用明细，但您比较的数字始终是团队总价。",
      },
      {
        q: "如果没有人回复怎么办？",
        a: "我们会在24小时后跟进供应商，并无论如何都会给您发送邮件。如果没有供应商能满足您的组合，我们会直接告知，并为将来服务范围扩大时记录您的需求。",
      },
    ],
    breadcrumbHome: "首页",
    breadcrumbActivities: "活动",
    categoriesTitle: "选择类别",
    onRequestBadge: "按需预约",
    catalogTitle: "活动示例",
    catalogNote: "该地区实际提供的活动，仅作示例展示。确切价格和可用性来自供应商针对您团队的报价。",
    catalogFrom: "~{price}€ / 人起",
    catalogCta: "申请报价",
  },
  tr: {
    h1: "Girit'te aktiviteler · yerel tedarikçilerden fiyat teklifleri alın",
    intro: "Ne yapmak istediğinizi, nerede ve ne zaman olduğunu bize söyleyin. Birlikte çalıştığımız yerel tedarikçiler tüm grubunuz için doğrudan bir fiyatla yanıt verir. Karşılaştırır, birini seçer ve o gün doğrudan ödersiniz, çevrimiçi ön ödeme yok, aracı platform yok.",
    howTitle: "Nasıl çalışır",
    how: [
      {
        h: "Ne yapmak istediğinizi söyleyin",
        p: "Bir kategori seçin (gastronomi turu, tekne gezisi, yürüyüş), bölgenizi ve tarihlerinizi belirleyin ve grubunuzun kaç kişi olduğunu bildirin.",
      },
      {
        h: "Yerel tedarikçiler fiyat teklifiyle yanıt verir",
        p: "Bölgede doğruladığımız tedarikçiler talebinizi alır ve e-posta ile tüm grubunuz için bir fiyatla yanıt verir, kişi başı değil. 24 saat içinde yanıt alırsınız.",
      },
      {
        h: "Karşılaştırın, seçin, doğrudan ödeyin",
        p: "Size uygun teklifi seçer ve tedarikçiye doğrudan ödersiniz, nakit, kart veya tercih ettiği şekilde. Biz para işlemleri yapmıyoruz.",
      },
    ],
    faqTitle: "Çalışma şekline ilişkin sorular",
    faq: [
      {
        q: "Nasıl çalışır?",
        a: "Kısa bir form doldurursunuz: aktivite türü, bölge, tarih, grup büyüklüğü ve iletişim bilgileriniz. Talebinizi birlikte çalıştığımız yerel tedarikçilere iletiyoruz. Tüm grubunuz için bir fiyat teklifiyle e-posta yoluyla yanıt verirler. Birini seçer ve doğrudan ödersiniz.",
      },
      {
        q: "Çevrimiçi ödeme yapmam gerekiyor mu?",
        a: "Hayır, tedarikçiye o gün veya onunla kararlaştırıldığı şekilde doğrudan ödeme yaparsınız. Bu sitede çevrimiçi ödeme yoktur ve talep göndermek için kart gerekmez.",
      },
      {
        q: "Fiyat kişi başınadır mı?",
        a: "Hayır, aldığınız her fiyat teklifi tüm grubunuz için hesaplanmıştır. Bazı tedarikçiler tekliflerinde kişi başı bir tutar belirtebilir, ancak karşılaştırdığınız rakam her zaman grup toplamıdır.",
      },
      {
        q: "Kimse yanıt vermezse ne olur?",
        a: "24 saat sonra tedarikçilerle tekrar iletişime geçiyor ve her durumda size e-posta gönderiyoruz. Kombinasyonunuz için uygun tedarikçi yoksa bunu doğrudan söylüyor ve kapsam genişlediğinde ilginizi not alıyoruz.",
      },
    ],
    breadcrumbHome: "Ana Sayfa",
    breadcrumbActivities: "Aktiviteler",
    categoriesTitle: "Bir kategori seçin",
    onRequestBadge: "talep üzerine",
    catalogTitle: "Örnek aktiviteler",
    catalogNote: "Bölgede gerçekten sunulan aktiviteler, örnek olarak gösterilmektedir. Kesin fiyat ve uygunluk, grubunuz için tedarikçilerin tekliflerinden gelir.",
    catalogFrom: "~{price}€ / kişiden itibaren",
    catalogCta: "Teklif isteyin",
  },
  sv: {
    h1: "Aktiviteter på Kreta · få offerter från lokala aktörer",
    intro: "Berätta för oss vad du vill göra, var och när. De lokala aktörer vi samarbetar med svarar dig direkt med ett pris för hela din grupp. Du jämför, väljer en och betalar dem på plats, ingen förskottsbetalning online, ingen mellanplattform.",
    howTitle: "Så fungerar det",
    how: [
      {
        h: "Berätta vad du vill göra",
        p: "Välj en kategori (mattur, båttur, vandring), välj ditt område och datum, och ange hur många ni är i gruppen.",
      },
      {
        h: "Lokala aktörer svarar med en offert",
        p: "Aktörer vi har verifierat i området tar emot din förfrågan och svarar via e-post med ett pris för hela din grupp, inte per person. Du får svar inom 24 timmar.",
      },
      {
        h: "Jämför, välj, betala direkt",
        p: "Du väljer det erbjudande som passar dig och betalar aktören direkt, kontant, kort eller hur han föredrar. Vi hanterar inga pengar.",
      },
    ],
    faqTitle: "Frågor om hur det fungerar",
    faq: [
      {
        q: "Hur fungerar det?",
        a: "Du fyller i ett kort formulär: aktivitetstyp, område, datum, gruppstorlek och dina kontaktuppgifter. Vi vidarebefordrar din förfrågan till de lokala aktörer vi samarbetar med. De svarar via e-post med en offert för hela din grupp. Du väljer en och betalar direkt.",
      },
      {
        q: "Måste jag betala online?",
        a: "Nej, du betalar aktören direkt på plats eller som överenskommet med honom. Det finns ingen online-betalning på den här sidan och inget kort krävs för att skicka en förfrågan.",
      },
      {
        q: "Är priset per person?",
        a: "Nej, varje offert du får är prissatt för hela din grupp. Vissa aktörer kan ge en per-person-uppdelning i sin offert, men det nummer du jämför är alltid en gruppotal.",
      },
      {
        q: "Vad händer om ingen svarar?",
        a: "Vi följer upp med aktörerna efter 24 timmar och skriver till dig i vilket fall. Om ingen aktör är tillgänglig för din kombination berättar vi det direkt och noterar ditt intresse inför när täckningen utökas.",
      },
    ],
    breadcrumbHome: "Hem",
    breadcrumbActivities: "Aktiviteter",
    categoriesTitle: "Välj en kategori",
    onRequestBadge: "på begäran",
    catalogTitle: "Exempelaktiviteter",
    catalogNote: "Aktiviteter som faktiskt erbjuds i området, visade som exempel. Det exakta priset och tillgängligheten kommer från aktörernas offerter för din grupp.",
    catalogFrom: "från ~{price}€ / person",
    catalogCta: "Begär offert",
  },
  da: {
    h1: "Aktiviteter på Kreta · modtag tilbud fra lokale udbydere",
    intro: "Fortæl os, hvad du vil lave, hvor og hvornår. De lokale udbydere, vi samarbejder med, svarer dig direkte med en pris for hele din gruppe. Du sammenligner, vælger én og betaler dem på dagen, ingen forudbetaling online, ingen mellemplatform.",
    howTitle: "Sådan fungerer det",
    how: [
      {
        h: "Fortæl os, hvad du vil lave",
        p: "Vælg en kategori (madtur, bådudflugt, vandring), vælg dit område og datoer, og fortæl os størrelsen på din gruppe.",
      },
      {
        h: "Lokale udbydere svarer med et tilbud",
        p: "Udbydere, vi har verificeret i området, modtager din anmodning og svarer via e-mail med en pris for hele din gruppe, ikke per person. Du hører tilbage inden for 24 timer.",
      },
      {
        h: "Sammenlign, vælg, betal direkte",
        p: "Du vælger det tilbud, der passer dig, og betaler udbyderen direkte, kontant, kort eller som han foretrækker. Vi håndterer ikke penge.",
      },
    ],
    faqTitle: "Spørgsmål om, hvordan det fungerer",
    faq: [
      {
        q: "Hvordan fungerer det?",
        a: "Du udfylder en kort formular: aktivitetstype, område, dato, gruppestørrelse og dine kontaktoplysninger. Vi videresender din anmodning til de lokale udbydere, vi samarbejder med. De svarer via e-mail med et tilbud til hele din gruppe. Du vælger én og betaler direkte.",
      },
      {
        q: "Skal jeg betale online?",
        a: "Nej, du betaler udbyderen direkte på dagen eller som aftalt med ham. Der er ingen online-betaling på denne side, og der kræves intet kort for at sende en anmodning.",
      },
      {
        q: "Er prisen per person?",
        a: "Nej, hvert tilbud, du modtager, er beregnet for hele din gruppe. Nogle udbydere kan give en per-person-opdeling i deres tilbud, men det tal, du sammenligner, er altid en gruppetotal.",
      },
      {
        q: "Hvad sker der, hvis ingen svarer?",
        a: "Vi følger op hos udbyderne efter 24 timer og skriver til dig under alle omstændigheder. Hvis ingen udbyder er tilgængelig for din kombination, siger vi det direkte og noterer din interesse til, når dækningen udvides.",
      },
    ],
    breadcrumbHome: "Hjem",
    breadcrumbActivities: "Aktiviteter",
    categoriesTitle: "Vælg en kategori",
    onRequestBadge: "på forespørgsel",
    catalogTitle: "Eksempelaktiviteter",
    catalogNote: "Aktiviteter der faktisk tilbydes i området, vist som eksempler. Den nøjagtige pris og tilgængelighed kommer fra udbydernes tilbud til din gruppe.",
    catalogFrom: "fra ~{price}€ / person",
    catalogCta: "Bed om tilbud",
  },
  no: {
    h1: "Aktiviteter på Kreta · motta tilbud fra lokale tilbydere",
    intro: "Fortell oss hva du vil gjøre, hvor og når. De lokale tilbyderne vi samarbeider med, svarer deg direkte med en pris for hele gruppen din. Du sammenligner, velger én og betaler dem på dagen, ingen forhåndsbetaling på nett, ingen mellomplattform.",
    howTitle: "Slik fungerer det",
    how: [
      {
        h: "Fortell oss hva du vil gjøre",
        p: "Velg en kategori (mattur, båttur, vandring), velg ditt område og datoer, og fortell oss størrelsen på gruppen din.",
      },
      {
        h: "Lokale tilbydere svarer med et tilbud",
        p: "Tilbydere vi har bekreftet i området, mottar forespørselen din og svarer via e-post med en pris for hele gruppen din, ikke per person. Du hører tilbake innen 24 timer.",
      },
      {
        h: "Sammenlign, velg, betal direkte",
        p: "Du velger tilbudet som passer deg, og betaler tilbyderen direkte, kontant, kort eller slik han foretrekker. Vi håndterer ikke penger.",
      },
    ],
    faqTitle: "Spørsmål om hvordan det fungerer",
    faq: [
      {
        q: "Hvordan fungerer det?",
        a: "Du fyller ut et kort skjema: aktivitetstype, område, dato, gruppestørrelse og kontaktinformasjonen din. Vi videresender forespørselen din til de lokale tilbyderne vi samarbeider med. De svarer via e-post med et tilbud for hele gruppen din. Du velger én og betaler direkte.",
      },
      {
        q: "Må jeg betale på nett?",
        a: "Nei, du betaler tilbyderen direkte på dagen eller som avtalt med ham. Det er ingen nettbetaling på denne siden, og det kreves ikke kort for å sende en forespørsel.",
      },
      {
        q: "Er prisen per person?",
        a: "Nei, hvert tilbud du mottar, er beregnet for hele gruppen din. Noen tilbydere kan gi en per-person-fordeling i tilbudet sitt, men tallet du sammenligner, er alltid en gruppesum.",
      },
      {
        q: "Hva skjer hvis ingen svarer?",
        a: "Vi følger opp med tilbyderne etter 24 timer og skriver til deg uansett. Hvis ingen tilbyder er tilgjengelig for kombinasjonen din, sier vi det direkte og noterer interessen din til dekningen utvides.",
      },
    ],
    breadcrumbHome: "Hjem",
    breadcrumbActivities: "Aktiviteter",
    categoriesTitle: "Velg en kategori",
    onRequestBadge: "på forespørsel",
    catalogTitle: "Eksempelaktiviteter",
    catalogNote: "Aktiviteter som faktisk tilbys i området, vist som eksempler. Den nøyaktige prisen og tilgjengeligheten kommer fra tilbydernes tilbud for gruppen din.",
    catalogFrom: "fra ~{price}€ / person",
    catalogCta: "Be om tilbud",
  },
  fi: {
    h1: "Aktiviteetit Kreetalla · vastaanota tarjoukset paikallisilta toimijoilta",
    intro: "Kerro meille, mitä haluat tehdä, missä ja milloin. Yhteistyökumppanimme paikalliset toimijat vastaavat suoraan koko ryhmäsi hinnalla. Vertailet, valitset yhden ja maksat heille paikan päällä, ei verkkoennakkomaksua, ei välittäjäalustaa.",
    howTitle: "Näin se toimii",
    how: [
      {
        h: "Kerro, mitä haluat tehdä",
        p: "Valitse kategoria (ruokakierros, veneretki, vaellus), valitse alueesi ja päivämäärät, ja kerro ryhmäsi koko.",
      },
      {
        h: "Paikalliset toimijat vastaavat tarjouksella",
        p: "Alueella varmentamamme toimijat saavat pyyntösi ja vastaavat sähköpostitse koko ryhmäsi hinnalla, ei henkilöä kohden. Saat vastauksen 24 tunnin sisällä.",
      },
      {
        h: "Vertaile, valitse, maksa suoraan",
        p: "Valitset sopivan tarjouksen ja maksat toimijalle suoraan, käteisellä, kortilla tai haluamallaan tavalla. Emme käsittele rahaa.",
      },
    ],
    faqTitle: "Kysymyksiä toimintatavasta",
    faq: [
      {
        q: "Miten se toimii?",
        a: "Täytät lyhyen lomakkeen: aktiviteetin tyyppi, alue, päivämäärä, ryhmän koko ja yhteystietosi. Välitämme pyyntösi yhteistyötoimijoille. He vastaavat sähköpostitse koko ryhmäsi tarjouksella. Valitset yhden ja maksat suoraan.",
      },
      {
        q: "Täytyykö maksaa verkossa?",
        a: "Ei, maksat toimijalle suoraan paikan päällä tai sovitusti hänen kanssaan. Tällä sivustolla ei ole verkkomaksua, eikä korttia tarvita pyynnön lähettämiseen.",
      },
      {
        q: "Onko hinta per henkilö?",
        a: "Ei, jokainen saamasi tarjous on hinnoiteltu koko ryhmällesi. Jotkut toimijat voivat eritellä henkilökohtaisen hinnan tarjouksessaan, mutta vertailet aina ryhmäkokonaishintaa.",
      },
      {
        q: "Mitä jos kukaan ei vastaa?",
        a: "Otamme yhteyttä toimijoihin 24 tunnin kuluttua uudelleen ja kirjoitamme sinulle joka tapauksessa. Jos yhdistelmällesi ei löydy toimijaa, kerromme sen suoraan ja kirjaamme kiinnostuksesi tulevaa varten.",
      },
    ],
    breadcrumbHome: "Etusivu",
    breadcrumbActivities: "Aktiviteetit",
    categoriesTitle: "Valitse kategoria",
    onRequestBadge: "pyynnöstä",
    catalogTitle: "Esimerkkiaktiviteetteja",
    catalogNote: "Alueella todella tarjottavia aktiviteetteja, esitelty esimerkkeinä. Tarkka hinta ja saatavuus tulevat toimijoiden tarjouksista ryhmällesi.",
    catalogFrom: "~{price}€ / henkilö alkaen",
    catalogCta: "Pyydä tarjous",
  },
  cs: {
    h1: "Aktivity na Krétě · získejte nabídky od místních poskytovatelů",
    intro: "Řekněte nám, co chcete dělat, kde a kdy. Místní poskytovatelé, se kterými spolupracujeme, vám odpoví přímo s cenou pro celou vaši skupinu. Porovnáte, vyberete jednoho a zaplatíte mu v den aktivity, bez platby předem online, bez zprostředkovatelské platformy.",
    howTitle: "Jak to funguje",
    how: [
      {
        h: "Řekněte nám, co chcete dělat",
        p: "Vyberte kategorii (gastronomický výlet, plavba lodí, turistika), zvolte svou oblast a termíny a sdělte nám velikost skupiny.",
      },
      {
        h: "Místní poskytovatelé odpoví s nabídkou",
        p: "Poskytovatelé, které jsme v oblasti ověřili, obdrží váš požadavek a odpoví e-mailem s cenou pro celou vaši skupinu, ne na osobu. Odpověď obdržíte do 24 hodin.",
      },
      {
        h: "Porovnejte, vyberte, zaplaťte přímo",
        p: "Vyberete nabídku, která vám vyhovuje, a zaplatíte poskytovateli přímo, hotovostí, kartou nebo jak preferuje. My s penězi nenakládáme.",
      },
    ],
    faqTitle: "Otázky ohledně fungování",
    faq: [
      {
        q: "Jak to funguje?",
        a: "Vyplníte krátký formulář: typ aktivity, oblast, datum, velikost skupiny a vaše kontaktní údaje. Váš požadavek přepošleme místním poskytovatelům, se kterými spolupracujeme. Odpoví e-mailem s nabídkou pro celou vaši skupinu. Vyberete jednoho a zaplatíte přímo.",
      },
      {
        q: "Musím platit online?",
        a: "Ne, platíte poskytovateli přímo v den aktivity nebo dle dohody s ním. Na tomto webu neexistuje online platba a pro odeslání požadavku není potřeba karta.",
      },
      {
        q: "Je cena na osobu?",
        a: "Ne, každá nabídka, kterou obdržíte, je kalkulována pro celou vaši skupinu. Někteří poskytovatelé mohou ve své nabídce uvést cenu na osobu, ale číslo, které porovnáváte, je vždy skupinový celek.",
      },
      {
        q: "Co se stane, když nikdo neodpoví?",
        a: "Po 24 hodinách poskytovatele znovu kontaktujeme a v každém případě vám napíšeme. Pokud pro vaši kombinaci není dostupný žádný poskytovatel, řekneme vám to přímo a zaznamenáme váš zájem pro budoucí rozšíření pokrytí.",
      },
    ],
    breadcrumbHome: "Domů",
    breadcrumbActivities: "Aktivity",
    categoriesTitle: "Vyberte kategorii",
    onRequestBadge: "na vyžádání",
    catalogTitle: "Ukázkové aktivity",
    catalogNote: "Aktivity skutečně nabízené v dané oblasti, zobrazené jako příklady. Přesná cena a dostupnost vycházejí z nabídek poskytovatelů pro vaši skupinu.",
    catalogFrom: "od ~{price}€ / os.",
    catalogCta: "Požádat o nabídku",
  },
  hu: {
    h1: "Tevékenységek Krétán · kapjon árajánlatokat helyi szolgáltatóktól",
    intro: "Mondja el, mit szeretne csinálni, hol és mikor. A velünk együttműködő helyi szolgáltatók közvetlenül válaszolnak az egész csoport árával. Összehasonlítja, választ egyet, és azon a napon fizet neki, online előleg nélkül, közvetítő platform nélkül.",
    howTitle: "Hogyan működik",
    how: [
      {
        h: "Mondja el, mit szeretne csinálni",
        p: "Válasszon kategóriát (gasztronómiai túra, hajókirándulás, gyalogtura), válassza ki területét és dátumait, és mondja el, hány fő a csoportja.",
      },
      {
        h: "Helyi szolgáltatók árajánlattal válaszolnak",
        p: "A területen általunk ellenőrzött szolgáltatók megkapják kérelmét, és e-mailben válaszolnak az egész csoport árával, nem személyenként. 24 órán belül választ kap.",
      },
      {
        h: "Hasonlítsa össze, válasszon, fizessen közvetlenül",
        p: "Kiválasztja az önnek megfelelő ajánlatot, és közvetlenül fizet a szolgáltatónak, készpénzzel, kártyával vagy az általa preferált módon. Mi nem kezelünk pénzt.",
      },
    ],
    faqTitle: "Kérdések a működéssel kapcsolatban",
    faq: [
      {
        q: "Hogyan működik?",
        a: "Kitölt egy rövid űrlapot: tevékenység típusa, terület, dátum, csoportlétszám és elérhetőségei. Az Ön kérelmét a velünk együttműködő helyi szolgáltatóknak továbbítjuk. E-mailben válaszolnak az egész csoport árajánlatával. Választ egyet, és közvetlenül fizet.",
      },
      {
        q: "Online kell fizetnem?",
        a: "Nem, a szolgáltatónak közvetlenül, azon a napon vagy a megállapodás szerinti időpontban fizet. Ezen az oldalon nincs online fizetés, és kérelem beküldéséhez nem szükséges kártya.",
      },
      {
        q: "Az ár személyenként értendő?",
        a: "Nem, minden kapott árajánlat az egész csoportjára vonatkozik. Egyes szolgáltatók megadhatnak személyenkénti összeget az ajánlatban, de az összehasonlított szám mindig csoportösszeg.",
      },
      {
        q: "Mi történik, ha senki nem válaszol?",
        a: "24 óra után újra felvesszük a kapcsolatot a szolgáltatókkal, és mindenképpen írunk Önnek. Ha a kombinációjához nem érhető el szolgáltató, azt közvetlenül közöljük, és rögzítjük érdeklődését a lefedettség bővülésekor.",
      },
    ],
    breadcrumbHome: "Főoldal",
    breadcrumbActivities: "Tevékenységek",
    categoriesTitle: "Válasszon kategóriát",
    onRequestBadge: "kérésre",
    catalogTitle: "Példa tevékenységek",
    catalogNote: "A területen ténylegesen kínált tevékenységek, példaként bemutatva. A pontos ár és elérhetőség a szolgáltatók csoportjára vonatkozó árajánlataiból derül ki.",
    catalogFrom: "~{price}€-tól / fő",
    catalogCta: "Árajánlat kérése",
  },
  ro: {
    h1: "Activități în Creta · primește oferte de la furnizori locali",
    intro: "Spune-ne ce vrei să faci, unde și când. Furnizorii locali cu care lucrăm îți răspund direct cu un preț pentru întregul tău grup. Compari, alegi unul și îl plătești în ziua respectivă, fără plată în avans online, fără platformă intermediară.",
    howTitle: "Cum funcționează",
    how: [
      {
        h: "Spune-ne ce vrei să faci",
        p: "Alege o categorie (tur gastronomic, excursie cu barca, drumeție), selectează zona și datele tale și spune-ne câți sunteți în grup.",
      },
      {
        h: "Furnizorii locali răspund cu o ofertă",
        p: "Furnizorii pe care i-am verificat în zonă primesc cererea ta și răspund prin e-mail cu un preț pentru întregul tău grup, nu pe persoană. Primești răspuns în 24 de ore.",
      },
      {
        h: "Compară, alege, plătește direct",
        p: "Alegi oferta care ți se potrivește și plătești furnizorul direct, numerar, card sau cum preferă el. Noi nu gestionăm bani.",
      },
    ],
    faqTitle: "Întrebări despre cum funcționează",
    faq: [
      {
        q: "Cum funcționează?",
        a: "Completezi un formular scurt: tipul activității, zona, data, mărimea grupului și datele tale de contact. Înaintăm cererea ta furnizorilor locali cu care colaborăm. Aceștia răspund prin e-mail cu o ofertă pentru întregul tău grup. Alegi unul și plătești direct.",
      },
      {
        q: "Trebuie să plătesc online?",
        a: "Nu, plătești furnizorul direct în ziua respectivă sau conform înțelegerii cu el. Pe acest site nu există plată online și nu este necesară nicio carte pentru a trimite o cerere.",
      },
      {
        q: "Prețul este pe persoană?",
        a: "Nu, fiecare ofertă pe care o primești este calculată pentru întregul tău grup. Unii furnizori pot oferi o defalcare pe persoană în oferta lor, dar cifra pe care o compari este întotdeauna un total de grup.",
      },
      {
        q: "Ce se întâmplă dacă nimeni nu răspunde?",
        a: "Contactăm furnizorii din nou după 24 de ore și îți scriem în orice caz. Dacă niciun furnizor nu este disponibil pentru combinația ta, îți spunem direct și notăm interesul tău pentru când acoperirea se va extinde.",
      },
    ],
    breadcrumbHome: "Acasă",
    breadcrumbActivities: "Activități",
    categoriesTitle: "Alege o categorie",
    onRequestBadge: "la cerere",
    catalogTitle: "Exemple de activități",
    catalogNote: "Activități oferite cu adevărat în zonă, prezentate ca exemple. Prețul exact și disponibilitatea provin din ofertele furnizorilor pentru grupul tău.",
    catalogFrom: "de la ~{price}€ / persoană",
    catalogCta: "Solicită o ofertă",
  },
  ar: {
    h1: "أنشطة في كريت · احصل على عروض أسعار من مزودين محليين",
    intro: "أخبرنا بما تريد فعله، وأين، ومتى. يردّ المزودون المحليون الذين نتعامل معهم مباشرةً بسعر لمجموعتك بالكامل. تقارن، تختار واحداً وتدفع له في اليوم ذاته، بلا دفع مسبق عبر الإنترنت، وبلا وسيط.",
    howTitle: "كيف يعمل",
    how: [
      {
        h: "أخبرنا بما تريد فعله",
        p: "اختر فئة (جولة غذائية، رحلة قاربية، مشي في الطبيعة)، حدّد منطقتك وتواريخك، وأخبرنا بعدد أفراد مجموعتك.",
      },
      {
        h: "يردّ المزودون المحليون بعرض سعر",
        p: "يتلقّى المزودون الذين تحققنا منهم في المنطقة طلبك ويردّون عبر البريد الإلكتروني بسعر لمجموعتك بالكامل، وليس بالسعر للفرد. تتلقّى رداً خلال 24 ساعة.",
      },
      {
        h: "قارن، اختر، ادفع مباشرةً",
        p: "تختار العرض المناسب وتدفع للمزوّد مباشرةً، نقداً، أو بالبطاقة، أو بأي طريقة يفضّلها. نحن لا نتعامل بالأموال.",
      },
    ],
    faqTitle: "أسئلة حول طريقة العمل",
    faq: [
      {
        q: "كيف يعمل؟",
        a: "تملأ استمارة قصيرة: نوع النشاط، المنطقة، التاريخ، حجم المجموعة ومعلومات التواصل. نحيل طلبك إلى المزودين المحليين الذين نتعاون معهم. يردّون عبر البريد الإلكتروني بعرض سعر لمجموعتك بالكامل. تختار واحداً وتدفع مباشرةً.",
      },
      {
        q: "هل أحتاج إلى الدفع عبر الإنترنت؟",
        a: "لا، تدفع للمزوّد مباشرةً في اليوم ذاته أو وفق الاتفاق معه. لا يوجد دفع إلكتروني على هذا الموقع، ولا حاجة لبطاقة لإرسال طلبك.",
      },
      {
        q: "هل السعر للفرد؟",
        a: "لا، كل عرض سعر تتلقّاه محسوب لمجموعتك بالكامل. قد يوفّر بعض المزودين تفصيلاً للسعر الفردي داخل عرضهم، لكن الرقم الذي تقارنه دائماً هو الإجمالي للمجموعة.",
      },
      {
        q: "ماذا لو لم يردّ أحد؟",
        a: "نتواصل مع المزودين مجدداً بعد 24 ساعة ونكتب إليك في كلّ الأحوال. إن لم يكن أيّ مزوّد متاحاً لتوليفتك، نخبرك بذلك مباشرةً ونسجّل اهتمامك لمتابعته عند توسّع التغطية.",
      },
    ],
    breadcrumbHome: "الرئيسية",
    breadcrumbActivities: "الأنشطة",
    categoriesTitle: "اختر فئة",
    onRequestBadge: "عند الطلب",
    catalogTitle: "أمثلة على الأنشطة",
    catalogNote: "أنشطة مقدَّمة فعلياً في المنطقة، معروضة بوصفها أمثلة. السعر الدقيق والتوفر يأتيان من عروض المزودين لمجموعتك.",
    catalogFrom: "من ~{price}€ / شخص",
    catalogCta: "طلب عرض سعر",
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
    it: {
      title: "Tour gastronomici a Creta · preventivi da guide locali",
      desc: "Richiedi un tour gastronomico o enologico a Creta: mercati locali, taverne di famiglia, olio d'oliva, raki e vini di piccoli produttori. Le guide locali rispondono con un preventivo di gruppo entro 24 ore.",
    },
    nl: {
      title: "Gastronomische tours op Kreta · offertes van lokale gidsen",
      desc: "Vraag een gastronomische of wijnreis op Kreta aan: lokale markten, familiaire taverna's, olijfolie, raki en wijnen van kleine producenten. Lokale gidsen antwoorden binnen 24 uur met een groepsofferte.",
    },
    pl: {
      title: "Kulinarne wycieczki na Krecie · wyceny od lokalnych przewodników",
      desc: "Zamów kulinarną lub winną wycieczkę na Krecie: lokalne targi, rodzinne tawerny, oliwę z oliwek, rakı i wina od małych producentów. Lokalni przewodnicy odpowiadają wyceną grupową w ciągu 24 godzin.",
    },
    es: {
      title: "Tours gastronómicos en Creta · presupuestos de guías locales",
      desc: "Solicita un tour gastronómico o enológico en Creta: mercados locales, tabernas familiares, aceite de oliva, raki y vinos de pequeños productores. Los guías locales responden con un presupuesto de grupo en 24 horas.",
    },
    pt: {
      title: "Tours gastronómicos em Creta · orçamentos de guias locais",
      desc: "Pede um tour gastronómico ou enológico em Creta: mercados locais, tabernas de família, azeite, raki e vinhos de pequenos produtores. Os guias locais respondem com um orçamento de grupo em 24 horas.",
    },
    ru: {
      title: "Гастрономические туры на Крите · расчёты от местных гидов",
      desc: "Закажите гастрономический или винный тур на Крите: местные рынки, семейные таверны, оливковое масло, ракию и вина малых производителей. Местные гиды отвечают с групповым расчётом в течение 24 часов.",
    },
    ja: {
      title: "クレタ島のグルメツアー · 地元ガイドからの見積もり",
      desc: "クレタ島のグルメツアーやワインツアーをリクエスト：地元の市場、ファミリー経営のタベルナ、オリーブオイル、ラキ、小規模生産者のワイン。地元ガイドが24時間以内にグループ見積もりで返信します。",
    },
    ko: {
      title: "크레타 미식 투어 · 현지 가이드의 견적",
      desc: "크레타 미식 또는 와인 투어를 요청하세요: 현지 시장, 가족 운영 타베르나, 올리브유, 라키, 소규모 생산자 와인. 현지 가이드가 24시간 이내에 그룹 견적으로 답합니다.",
    },
    zh: {
      title: "克里特岛美食游览 · 本地导游报价",
      desc: "申请克里特岛美食或葡萄酒之旅：当地市场、家庭塔韦尔纳、橄榄油、拉基和小生产商葡萄酒。本地导游在24小时内回复团队报价。",
    },
    tr: {
      title: "Girit'te gastronomi turları · yerel rehberlerden fiyat teklifleri",
      desc: "Girit'te gastronomi veya şarap turu talep edin: yerel pazarlar, aile tavernaları, zeytinyağı, raki ve küçük üreticilerin şarapları. Yerel rehberler 24 saat içinde grup fiyat teklifiyle yanıt verir.",
    },
    sv: {
      title: "Gastronomiska turer på Kreta · offerter från lokala guider",
      desc: "Begär en gastronomisk eller vintur på Kreta: lokala marknader, familjetavernor, olivolja, raki och viner från småproducenter. Lokala guider svarar med en gruppoffert inom 24 timmar.",
    },
    da: {
      title: "Gastronomiske ture på Kreta · tilbud fra lokale guider",
      desc: "Anmod om en gastronomisk eller vintur på Kreta: lokale markeder, familietavernaer, olivenolie, raki og vine fra små producenter. Lokale guider svarer med et gruppetilbud inden for 24 timer.",
    },
    no: {
      title: "Gastronomiske turer på Kreta · tilbud fra lokale guider",
      desc: "Be om en gastronomisk eller vintur på Kreta: lokale markeder, familietavernaer, olivenolje, raki og viner fra småprodusenter. Lokale guider svarer med et gruppetilbud innen 24 timer.",
    },
    fi: {
      title: "Gastronomiatuurit Kreetalla · tarjoukset paikallisilta oppailta",
      desc: "Pyydä gastronomia- tai viiniretkeä Kreetalla: paikalliset torit, perhetavernat, oliiviöljy, raki ja pienten tuottajien viinit. Paikalliset oppaat vastaavat ryhmätarjouksella 24 tunnin sisällä.",
    },
    cs: {
      title: "Gastronomické výlety na Krétě · nabídky od místních průvodců",
      desc: "Požádejte o gastronomický nebo vinařský výlet na Krétě: místní trhy, rodinné taverny, olivový olej, raki a vína malých výrobců. Místní průvodci odpovídají skupinovou nabídkou do 24 hodin.",
    },
    hu: {
      title: "Gasztronómiai kirándulások Krétán · árajánlatok helyi idegenvezetőktől",
      desc: "Kérjen gasztronómiai vagy boroskirándulást Krétán: helyi piacok, családi tavernák, olívaolaj, raki és kis termelők borai. A helyi idegenvezetők 24 órán belül csoportos árajánlattal válaszolnak.",
    },
    ro: {
      title: "Tururi gastronomice în Creta · oferte de la ghizi locali",
      desc: "Solicită un tur gastronomic sau viticol în Creta: piețe locale, taverne de familie, ulei de măsline, raki și vinuri de la producători mici. Ghizii locali răspund cu o ofertă de grup în 24 de ore.",
    },
    ar: {
      title: "جولات غذائية في كريت · عروض أسعار من المرشدين المحليين",
      desc: "اطلب جولة غذائية أو نبيذية في كريت: أسواق محلية، حانات عائلية، زيت الزيتون، الراكي وخمور من صغار المنتجين. يردّ المرشدون المحليون بعرض سعر جماعي خلال 24 ساعة.",
    },
  },
  "boat-trips": {
    en: {
      title: "Boat trips in Crete · quotes from local skippers",
      desc: "Request a boat trip in Crete: coastline, hidden coves, swimming stops, sunset. Local skippers reply with a group quote in 24 h, no online prepayment.",
    },
    fr: {
      title: "Sorties en bateau en Crète · devis de patrons locaux",
      desc: "Demandez une sortie en bateau en Crète : côtes, criques cachées, baignades, coucher de soleil. Les patrons locaux vous répondent avec un devis groupe sous 24 h, aucun prépaiement en ligne.",
    },
    de: {
      title: "Bootsausflüge auf Kreta · Angebote lokaler Skipper",
      desc: "Bootsausflug auf Kreta anfragen: Küste, versteckte Buchten, Schwimmstopps, Sonnenuntergang. Lokale Skipper antworten mit einem Gruppenangebot in 24 Stunden, keine Online-Vorauszahlung.",
    },
    el: {
      title: "Εκδρομές με σκάφος στην Κρήτη · προσφορές από τοπικούς πλοίαρχους",
      desc: "Ζητήστε εκδρομή με σκάφος στην Κρήτη: ακτογραμμή, κρυμμένους κολπίσκους, κολύμπι, ηλιοβασίλεμα. Τοπικοί πλοίαρχοι απαντούν με προσφορά ομάδας σε 24 ώρες, καμία online προπληρωμή.",
    },
    it: {
      title: "Escursioni in barca a Creta · preventivi da skipper locali",
      desc: "Richiedi un'escursione in barca a Creta: costa, calette nascoste, soste per nuotare, tramonto. Gli skipper locali rispondono con un preventivo di gruppo entro 24 ore, nessun pagamento anticipato online.",
    },
    nl: {
      title: "Boottochten op Kreta · offertes van lokale schippers",
      desc: "Vraag een boottocht op Kreta aan: kustlijn, verborgen baaien, zwemstops, zonsondergang. Lokale schippers antwoorden binnen 24 uur met een groepsofferte, geen online vooruitbetaling.",
    },
    pl: {
      title: "Rejsy łodzią na Krecie · wyceny od lokalnych skipperów",
      desc: "Zamów rejs łodzią na Krecie: wybrzeże, ukryte zatoczki, kąpiele, zachód słońca. Lokalni skipperzy odpowiadają wyceną grupową w ciągu 24 godzin, bez przedpłaty online.",
    },
    es: {
      title: "Excursiones en barco en Creta · presupuestos de patrones locales",
      desc: "Solicita una excursión en barco en Creta: costa, calas escondidas, paradas para nadar, puesta de sol. Los patrones locales responden con un presupuesto de grupo en 24 horas, sin pago anticipado online.",
    },
    pt: {
      title: "Passeios de barco em Creta · orçamentos de capitães locais",
      desc: "Pede um passeio de barco em Creta: costa, enseadas escondidas, paragens para nadar, pôr do sol. Os capitães locais respondem com um orçamento de grupo em 24 horas, sem pré-pagamento online.",
    },
    ru: {
      title: "Прогулки на лодке на Крите · расчёты от местных шкиперов",
      desc: "Закажите прогулку на лодке на Крите: побережье, скрытые бухты, купание, закат. Местные шкиперы отвечают с групповым расчётом в течение 24 часов, без онлайн-предоплаты.",
    },
    ja: {
      title: "クレタ島のボートトリップ · 地元スキッパーからの見積もり",
      desc: "クレタ島のボートトリップをリクエスト：海岸線、隠れた入り江、海水浴、サンセット。地元スキッパーが24時間以内にグループ見積もりで返信、オンライン前払いなし。",
    },
    ko: {
      title: "크레타 보트 여행 · 현지 선장의 견적",
      desc: "크레타 보트 여행을 요청하세요: 해안선, 숨겨진 만, 수영 정류장, 일몰. 현지 선장이 24시간 이내에 그룹 견적으로 답변, 온라인 선결제 없음.",
    },
    zh: {
      title: "克里特岛游船 · 本地船长报价",
      desc: "申请克里特岛游船：海岸线、隐秘海湾、游泳停靠点、日落。本地船长在24小时内回复团队报价，无需在线预付。",
    },
    tr: {
      title: "Girit'te tekne gezileri · yerel kaptanlardan fiyat teklifleri",
      desc: "Girit'te tekne gezisi talep edin: kıyı şeridi, gizli koylar, yüzme durakları, gün batımı. Yerel kaptanlar 24 saat içinde grup fiyat teklifiyle yanıt verir, çevrimiçi ön ödeme yok.",
    },
    sv: {
      title: "Båtturer på Kreta · offerter från lokala skeppare",
      desc: "Begär en båttur på Kreta: kustlinje, dolda vikar, simstoppar, solnedgång. Lokala skeppare svarar med en gruppoffert inom 24 timmar, ingen förskottsbetalning online.",
    },
    da: {
      title: "Bådsture på Kreta · tilbud fra lokale skippere",
      desc: "Anmod om en bådstur på Kreta: kystlinje, skjulte bugter, svømmestop, solnedgang. Lokale skippere svarer med et gruppetilbud inden for 24 timer, ingen forudbetaling online.",
    },
    no: {
      title: "Båtturer på Kreta · tilbud fra lokale skippere",
      desc: "Be om en båttur på Kreta: kystlinje, skjulte bukter, badetopp, solnedgang. Lokale skippere svarer med et gruppetilbud innen 24 timer, ingen forhåndsbetaling på nett.",
    },
    fi: {
      title: "Veneretkiä Kreetalla · tarjoukset paikallisilta kapteeneilta",
      desc: "Pyydä veneretkeilyä Kreetalla: rantaviiva, piilotetut lahdet, uintipysähdykset, auringonlasku. Paikalliset kapteenit vastaavat ryhmätarjouksella 24 tunnin sisällä, ei verkkoennakkomaksua.",
    },
    cs: {
      title: "Plavby lodí na Krétě · nabídky od místních kapitánů",
      desc: "Požádejte o plavbu lodí na Krétě: pobřeží, skryté zátoky, zastávky ke koupání, západ slunce. Místní kapitáni odpovídají skupinovou nabídkou do 24 hodin, bez platby předem online.",
    },
    hu: {
      title: "Hajókirándulások Krétán · árajánlatok helyi kapitányoktól",
      desc: "Kérjen hajókirándulást Krétán: partszakasz, rejtett öblök, úszóállomások, naplemente. A helyi kapitányok 24 órán belül csoportos árajánlattal válaszolnak, online előleg nélkül.",
    },
    ro: {
      title: "Excursii cu barca în Creta · oferte de la căpitani locali",
      desc: "Solicită o excursie cu barca în Creta: coastă, cale ascunse, opriri pentru înot, apus de soare. Căpitanii locali răspund cu o ofertă de grup în 24 de ore, fără plată în avans online.",
    },
    ar: {
      title: "رحلات قاربية في كريت · عروض أسعار من الربانين المحليين",
      desc: "اطلب رحلة قاربية في كريت: الساحل، الخلجان المخفية، محطات السباحة، غروب الشمس. يردّ الربانون المحليون بعرض سعر جماعي خلال 24 ساعة، بلا دفع مسبق عبر الإنترنت.",
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
    it: {
      title: "Escursionismo e natura a Creta · preventivi da guide locali",
      desc: "Richiedi un'escursione a piedi o un tour naturalistico a Creta: gole, tratti del sentiero E4, flora selvatica, tutti i livelli. Le guide locali rispondono con un preventivo di gruppo entro 24 ore.",
    },
    nl: {
      title: "Wandelen en natuur op Kreta · offertes van lokale gidsen",
      desc: "Vraag een wandel- of natuurtocht op Kreta aan: kloven, gedeelten van het E4-pad, wilde flora, alle niveaus. Lokale gidsen antwoorden binnen 24 uur met een groepsofferte.",
    },
    pl: {
      title: "Piesze wędrówki i przyroda na Krecie · wyceny od lokalnych przewodników",
      desc: "Zamów pieszą wycieczkę lub wypad do natury na Krecie: wąwozy, odcinki szlaku E4, dzika flora, wszystkie poziomy trudności. Lokalni przewodnicy odpowiadają wyceną grupową w ciągu 24 godzin.",
    },
    es: {
      title: "Senderismo y naturaleza en Creta · presupuestos de guías locales",
      desc: "Solicita una excursión de senderismo o naturaleza en Creta: gargantas, tramos del sendero E4, flora silvestre, todos los niveles. Los guías locales responden con un presupuesto de grupo en 24 horas.",
    },
    pt: {
      title: "Caminhadas e natureza em Creta · orçamentos de guias locais",
      desc: "Pede uma caminhada ou excursão à natureza em Creta: gargantas, troços do trilho E4, flora selvagem, todos os níveis. Os guias locais respondem com um orçamento de grupo em 24 horas.",
    },
    ru: {
      title: "Пешие походы и природа на Крите · расчёты от местных гидов",
      desc: "Закажите пеший поход или природный тур на Крите: ущелья, участки маршрута E4, дикая флора, все уровни сложности. Местные гиды отвечают с групповым расчётом в течение 24 часов.",
    },
    ja: {
      title: "クレタ島のハイキングと自然 · 地元ガイドからの見積もり",
      desc: "クレタ島のハイキングや自然ツアーをリクエスト：渓谷、E4トレイルの区間、野生の植物、全レベル対応。地元ガイドが24時間以内にグループ見積もりで返信します。",
    },
    ko: {
      title: "크레타 하이킹 및 자연 · 현지 가이드의 견적",
      desc: "크레타 하이킹 또는 자연 투어를 요청하세요: 협곡, E4 트레일 구간, 야생 식물, 모든 난이도. 현지 가이드가 24시간 이내에 그룹 견적으로 답합니다.",
    },
    zh: {
      title: "克里特岛徒步与自然 · 本地导游报价",
      desc: "申请克里特岛徒步或自然之旅：峡谷、E4小径路段、野生植物、所有难度级别。本地导游在24小时内回复团队报价。",
    },
    tr: {
      title: "Girit'te yürüyüş ve doğa · yerel rehberlerden fiyat teklifleri",
      desc: "Girit'te yürüyüş veya doğa turu talep edin: boğazlar, E4 yolu bölümleri, yabani flora, tüm seviyeler. Yerel rehberler 24 saat içinde grup fiyat teklifiyle yanıt verir.",
    },
    sv: {
      title: "Vandring och natur på Kreta · offerter från lokala guider",
      desc: "Begär en vandring eller naturtur på Kreta: klyftor, avsnitt av E4-leden, vild flora, alla nivåer. Lokala guider svarar med en gruppoffert inom 24 timmar.",
    },
    da: {
      title: "Vandring og natur på Kreta · tilbud fra lokale guider",
      desc: "Anmod om en vandretur eller naturtur på Kreta: kløfter, afsnit af E4-ruten, vild flora, alle niveauer. Lokale guider svarer med et gruppetilbud inden for 24 timer.",
    },
    no: {
      title: "Vandring og natur på Kreta · tilbud fra lokale guider",
      desc: "Be om en fjelltur eller naturtur på Kreta: kløfter, deler av E4-stien, vill flora, alle nivåer. Lokale guider svarer med et gruppetilbud innen 24 timer.",
    },
    fi: {
      title: "Vaellukset ja luonto Kreetalla · tarjoukset paikallisilta oppailta",
      desc: "Pyydä vaellusretkeä tai luontomatkaa Kreetalla: rotot, E4-reitin osuudet, luonnonvarainen kasvisto, kaikki tasot. Paikalliset oppaat vastaavat ryhmätarjouksella 24 tunnin sisällä.",
    },
    cs: {
      title: "Turistika a příroda na Krétě · nabídky od místních průvodců",
      desc: "Požádejte o turistický výlet nebo výlet do přírody na Krétě: soutěsky, úseky trasy E4, divoká flóra, všechny obtížnosti. Místní průvodci odpovídají skupinovou nabídkou do 24 hodin.",
    },
    hu: {
      title: "Túrázás és természet Krétán · árajánlatok helyi idegenvezetőktől",
      desc: "Kérjen túrát vagy természetjárást Krétán: szurdokok, E4-es ösvény szakaszai, vadon élő növényzet, minden nehézségi szint. A helyi idegenvezetők 24 órán belül csoportos árajánlattal válaszolnak.",
    },
    ro: {
      title: "Drumeții și natură în Creta · oferte de la ghizi locali",
      desc: "Solicită o drumeție sau un tur în natură în Creta: chei, tronsoane ale traseului E4, floră sălbatică, toate nivelurile. Ghizii locali răspund cu o ofertă de grup în 24 de ore.",
    },
    ar: {
      title: "المشي في الطبيعة والطبيعة في كريت · عروض أسعار من المرشدين المحليين",
      desc: "اطلب رحلة مشي أو جولة طبيعية في كريت: الممرات الجبلية، أجزاء مسار E4، النباتات البرية، جميع المستويات. يردّ المرشدون المحليون بعرض سعر جماعي خلال 24 ساعة.",
    },
  },
};

// ---- Textes courts par catégorie (H1 + intro hub) --------------------------------

export const CATEGORY_STRINGS: Record<string, Record<string, { h1: string; intro: string }>> = {
  "food-tours": {
    en: {
      h1: "Food & wine tours in Crete",
      intro: "Crete's food culture is built on what is grown locally: olive oil from small estates, cheeses produced in mountain villages, wild herbs, and wine from varieties that do not exist anywhere else. The raki that ends every meal is usually from a family still. Our food tour providers take you to the places where this actually happens, markets, tavernas run by the same family for generations, and producers who are not set up for mass tourism. Tell us what interests you and they reply with a price for your group.",
    },
    fr: {
      h1: "Tours gastronomiques en Crète",
      intro: "La culture culinaire crétoise repose sur ce qui est cultivé localement : huile d'olive de petits domaines, fromages produits dans les villages de montagne, herbes sauvages, et vins de cépages qu'on ne trouve nulle part ailleurs. Le raki qui termine chaque repas vient généralement d'un alambic familial. Nos prestataires de visites gastronomiques vous emmènent là où tout cela se passe vraiment, marchés, tavernes tenues par la même famille depuis des générations, et producteurs qui ne sont pas organisés pour le tourisme de masse. Dites-nous ce qui vous intéresse et ils vous répondent avec un prix pour votre groupe.",
    },
    de: {
      h1: "Kulinarische Touren auf Kreta",
      intro: "Kretas kulinarische Kultur beruht auf dem, was lokal angebaut wird: Olivenöl von kleinen Gütern, Käse aus Bergdörfern, Wildkräuter und Weine aus Sorten, die es nirgendwo sonst gibt. Der Raki, der jede Mahlzeit beendet, kommt meist aus einer Familienbrennerei. Unsere Anbieter kulinarischer Touren bringen Sie dorthin, wo all das wirklich stattfindet: auf Märkte, seit Generationen familiengeführte Tavernen und zu Erzeugern, die nicht für Massentourismus aufgestellt sind. Sagen Sie uns, was Sie interessiert, und sie antworten mit einem Preis für Ihre Gruppe.",
    },
    el: {
      h1: "Γαστρονομικές περιηγήσεις στην Κρήτη",
      intro: "Η γαστρονομική κουλτούρα της Κρήτης βασίζεται σε αυτό που καλλιεργείται τοπικά: ελαιόλαδο από μικρά κτήματα, τυριά που παράγονται σε ορεινά χωριά, άγρια βότανα και κρασιά από ποικιλίες που δεν υπάρχουν πουθενά αλλού. Η ρακή που τελειώνει κάθε γεύμα προέρχεται συνήθως από οικογενειακό αποστακτήριο. Οι πάροχοι γαστρονομικών περιηγήσεων σας πηγαίνουν εκεί που όλα αυτά συμβαίνουν πραγματικά, αγορές, ταβέρνες που η ίδια οικογένεια διατηρεί εδώ και γενιές, και παραγωγοί που δεν είναι στηθιμένοι για τον μαζικό τουρισμό. Πείτε μας τι σας ενδιαφέρει και σας απαντούν με τιμή για την παρέα σας.",
    },
    it: {
      h1: "Tour gastronomici a Creta",
      intro: "La cultura culinaria cretese si basa su ciò che viene coltivato localmente: olio d'oliva di piccole tenute, formaggi prodotti nei villaggi di montagna, erbe selvatiche e vini di varietà che non esistono altrove. Il raki che chiude ogni pasto viene di solito da un alambicco di famiglia. I nostri operatori di tour gastronomici vi portano nei luoghi in cui tutto questo accade davvero, mercati, taverne gestite dalla stessa famiglia da generazioni, e produttori non attrezzati per il turismo di massa. Diteci cosa vi interessa e vi rispondono con un prezzo per il vostro gruppo.",
    },
    nl: {
      h1: "Gastronomische tours op Kreta",
      intro: "De culinaire cultuur van Kreta is gebaseerd op wat er lokaal wordt verbouwd: olijfolie van kleine landgoederen, kazen geproduceerd in bergdorpen, wilde kruiden en wijnen van druivenrassen die nergens anders bestaan. De raki waarmee elk maal eindigt, is doorgaans afkomstig van een familiestokerij. Onze aanbieders van gastronomische tours nemen je mee naar de plekken waar dit echt gebeurt, markten, taverna's die al generaties door dezelfde familie worden gerund, en producenten die niet zijn ingericht voor massamastoerisme. Vertel ons wat je interesseert en ze antwoorden met een prijs voor je groep.",
    },
    pl: {
      h1: "Kulinarne wycieczki na Krecie",
      intro: "Kultura kulinarna Krety opiera się na tym, co uprawiane jest lokalnie: oliwa z oliwek z małych posiadłości, sery produkowane w górskich wsiach, dzikie zioła i wina ze szczepów, których nie ma nigdzie indziej. Rakı kończące każdy posiłek pochodzi zwykle z rodzinnej destylarni. Nasi organizatorzy kulinarnych wycieczek zabierają was do miejsc, gdzie to wszystko naprawdę się dzieje, targi, tawerny prowadzone przez tę samą rodzinę od pokoleń, i producenci, którzy nie są nastawieni na turystykę masową. Powiedzcie nam, co was interesuje, a odpowiedzą ceną dla waszej grupy.",
    },
    es: {
      h1: "Tours gastronómicos en Creta",
      intro: "La cultura culinaria cretense se basa en lo que se cultiva localmente: aceite de oliva de pequeñas fincas, quesos elaborados en pueblos de montaña, hierbas silvestres y vinos de variedades que no existen en ningún otro lugar. El raki con el que termina cada comida suele proceder de un alambique familiar. Nuestros operadores de tours gastronómicos os llevan a los lugares donde todo esto ocurre de verdad, mercados, tabernas regentadas por la misma familia durante generaciones y productores que no están preparados para el turismo de masas. Decidnos qué os interesa y responden con un precio para vuestro grupo.",
    },
    pt: {
      h1: "Tours gastronómicos em Creta",
      intro: "A cultura culinária cretense assenta no que é cultivado localmente: azeite de pequenas propriedades, queijos produzidos em aldeias de montanha, ervas selvagens e vinhos de castas que não existem em nenhum outro lugar. O raki que termina cada refeição vem geralmente de uma destilaria familiar. Os nossos operadores de tours gastronómicos levam-te aos locais onde tudo isto realmente acontece, mercados, tabernas geridas pela mesma família há gerações e produtores que não estão preparados para o turismo de massas. Diz-nos o que te interessa e respondem com um preço para o teu grupo.",
    },
    ru: {
      h1: "Гастрономические туры на Крите",
      intro: "Кулинарная культура Крита основана на том, что выращивается здесь: оливковое масло с небольших угодий, сыры из горных деревень, дикие травы и вина из сортов, которых нет нигде больше. Ракия, которой заканчивается каждая трапеза, обычно с семейной перегонки. Наши операторы гастрономических туров везут вас туда, где всё это происходит по-настоящему, рынки, таверны, которые ведёт та же семья из поколения в поколение, и производители, не ориентированные на массовый туризм. Расскажите, что вас интересует, и они ответят ценой для вашей группы.",
    },
    ja: {
      h1: "クレタ島のグルメツアー",
      intro: "クレタ島の食文化は地元で栽培されるものに根ざしています：小さな農園のオリーブオイル、山村で生産されるチーズ、野生のハーブ、そして他のどこにも存在しないブドウ品種のワイン。食事を締めくくるラキは通常、家族経営の蒸留所から来ています。私たちのグルメツアー業者は、これが実際に起きている場所へあなたを連れて行きます。市場、何世代も同じ家族が経営するタベルナ、マスツーリズムに対応していない生産者。関心があることを教えてください。グループへの料金で返信します。",
    },
    ko: {
      h1: "크레타 미식 투어",
      intro: "크레타의 음식 문화는 현지에서 재배되는 것들에 기반합니다: 소규모 농장의 올리브 오일, 산촌에서 생산되는 치즈, 야생 허브, 그리고 다른 어디에도 존재하지 않는 품종의 와인. 식사를 마무리하는 라키는 보통 가족 증류소에서 옵니다. 우리의 미식 투어 업체들은 이 모든 것이 실제로 일어나는 곳으로 데려갑니다. 시장, 대대로 같은 가족이 운영하는 타베르나, 대중관광에 맞추지 않은 생산자. 관심 있는 것을 알려주시면 그룹 가격으로 답변합니다.",
    },
    zh: {
      h1: "克里特岛美食游览",
      intro: "克里特岛的饮食文化根植于本地种植的食材：小型庄园的橄榄油、山村生产的奶酪、野生香草，以及其他地方没有的葡萄品种酿制的葡萄酒。结束每顿饭的拉基通常来自家族蒸馏厂。我们的美食游览供应商带您去这一切真实发生的地方，市场、世代由同一家族经营的塔韦尔纳，以及没有为大众旅游准备的生产者。告诉我们您的兴趣，他们会回复您整个团队的报价。",
    },
    tr: {
      h1: "Girit'te gastronomi turları",
      intro: "Girit'in mutfak kültürü yerel olarak yetiştirilen ürünlere dayanır: küçük çiftliklerin zeytinyağı, dağ köylerinde üretilen peynirler, yabani otlar ve başka hiçbir yerde olmayan üzüm çeşitlerinden yapılan şaraplar. Her yemeği bitiren raki genellikle aile damıtma evinden gelir. Gastronomi turu operatörlerimiz sizi tüm bunların gerçekten yaşandığı yerlere götürür, pazarlar, nesiller boyu aynı aile tarafından işletilen tavernalar ve kitlesel turizme hazırlanmamış üreticiler. Ne ilginizi çektiğini söyleyin, grubunuza fiyat ile yanıt versinler.",
    },
    sv: {
      h1: "Gastronomiska turer på Kreta",
      intro: "Kretas kulinariska kultur bygger på vad som odlas lokalt: olivolja från små gårdar, ostar producerade i bergbyar, vilda örter och viner från druvor som inte finns någon annanstans. Rakin som avslutar varje måltid kommer vanligtvis från ett familjedestilleri. Våra aktörer för gastronomiska turer tar dig till platser där detta verkligen händer, marknader, tavernor drivna av samma familj i generationer och producenter som inte är anpassade för massturism. Berätta vad du är intresserad av och de svarar med ett pris för din grupp.",
    },
    da: {
      h1: "Gastronomiske ture på Kreta",
      intro: "Kretas kulinariske kultur bygger på det, der dyrkes lokalt: olivenolie fra små gårde, oste produceret i bjerglandsbyer, vilde urter og vine fra druesorter, der ikke findes andre steder. Den raki, der afslutter hvert måltid, kommer normalt fra et familiedestilleri. Vores udbydere af gastronomiske ture tager dig med til de steder, hvor alt dette virkelig foregår, markeder, tavernaer drevet af den samme familie i generationer og producenter, der ikke er indstillet på masseturisme. Fortæl os, hvad du er interesseret i, og de svarer med en pris for din gruppe.",
    },
    no: {
      h1: "Gastronomiske turer på Kreta",
      intro: "Kretas kulinariske kultur er bygget på det som dyrkes lokalt: olivenolje fra små gårder, oster produsert i fjellsbygder, ville urter og viner fra druesorter som ikke finnes andre steder. Rakien som avslutter hvert måltid kommer vanligvis fra et familiebrenneri. Våre tilbydere av gastronomiske turer tar deg med til stedene der alt dette virkelig skjer, markeder, tavernaer drevet av samme familie i generasjoner og produsenter som ikke er rigget for masseturisme. Fortell oss hva som interesserer deg, og de svarer med en pris for gruppen din.",
    },
    fi: {
      h1: "Gastronomiatuurit Kreetalla",
      intro: "Kreetan ruokakulttuuri perustuu paikallisesti kasvatettavaan: pienten tilojen oliiviöljy, vuoristokylissä tuotetut juustot, luonnonyrttejä ja viinejä lajikkeista, joita ei ole missään muualla. Ruokailun päättävä raki tulee yleensä perhedestilleriolta. Gastronomiatuurien toimijat vievät sinut paikkoihin, joissa kaikki tämä todella tapahtuu, torit, sukupolvien ajan saman perheen pyörittämät tavernat ja tuottajat, jotka eivät ole varautuneet massamatkailuun. Kerro, mikä sinua kiinnostaa, niin he vastaavat hinnalla ryhmällesi.",
    },
    cs: {
      h1: "Gastronomické výlety na Krétě",
      intro: "Kulinářská kultura Kréty je postavena na tom, co se pěstuje lokálně: olivový olej z malých statků, sýry vyráběné v horských vesnicích, divoké bylinky a vína z odrůd, které jinde neexistují. Raki, které uzavírá každé jídlo, pochází zpravidla z rodinné palírny. Naši poskytovatelé gastronomických výletů vás vezou na místa, kde se to vše skutečně odehrává, trhy, taverny provozované touž rodinou po generace a výrobci, kteří nejsou zaříznuti na masový turismus. Řekněte nám, co vás zajímá, a odpoví cenou pro vaši skupinu.",
    },
    hu: {
      h1: "Gasztronómiai kirándulások Krétán",
      intro: "Kréta kulináris kultúrája a helyileg termelt alapanyagokon nyugszik: kis gazdaságok olívaolaja, hegyi falvakban készült sajtok, vadgyógynövények és máshol nem létező szőlőfajtákból készült borok. A minden étkezést lezáró raki általában egy családi párlóból származik. Gasztronómiai kirándulásaink szervezői elviszik önt oda, ahol mindez valóban megtörténik, piacokra, generációk óta ugyanazon család által vezetett tavernákba és tömegturizmust nem kiszolgáló termelőkhöz. Mondja el, mi érdekli, és a csoportjára szóló árral válaszolnak.",
    },
    ro: {
      h1: "Tururi gastronomice în Creta",
      intro: "Cultura culinară cretană se bazează pe ceea ce se cultivă local: ulei de măsline din ferme mici, brânzeturi produse în sate de munte, ierburi sălbatice și vinuri din soiuri care nu există în altă parte. Raki-ul care încheie fiecare masă provine de obicei dintr-o distilerie de familie. Operatorii noștri de tururi gastronomice vă duc în locurile unde toate acestea se întâmplă cu adevărat, piețe, taverne conduse de aceeași familie de generații și producători care nu sunt pregătiți pentru turismul de masă. Spuneți-ne ce vă interesează și vă răspund cu un preț pentru grupul dvs.",
    },
    ar: {
      h1: "جولات غذائية في كريت",
      intro: "تقوم ثقافة الطعام في كريت على ما يُزرع محلياً: زيت الزيتون من المزارع الصغيرة، والأجبان المُنتجة في قرى الجبال، والأعشاب البرية، والنبيذ من أصناف عنب لا توجد في أي مكان آخر. الراكي الذي يُختتم به كل وجبة يأتي عادةً من مقطرة عائلية. يأخذك مزودو الجولات الغذائية إلى الأماكن التي تجري فيها كل هذه الأمور فعلياً، الأسواق، والمطاعم التي تديرها العائلة نفسها منذ أجيال، والمنتجون غير المهيئين للسياحة الجماعية. أخبرنا بما يثير اهتمامك وسيردّون بسعر لمجموعتك.",
    },
  },
  "boat-trips": {
    en: {
      h1: "Boat trips in Crete",
      intro: "Crete's coastline is long and much of it is not reachable by road. A private or small-group boat trip is often the only way to get to the best coves and swimming spots. Most trips combine a few hours of sailing with swimming stops, snorkelling, and a return around sunset, but the exact route and pace are agreed with your skipper beforehand. Providers reply with a price for your whole group based on the area, duration and number of people.",
    },
    fr: {
      h1: "Sorties en bateau en Crète",
      intro: "La côte crétoise est longue et une grande partie n'est pas accessible par la route. Une sortie en bateau privé ou en petit groupe est souvent le seul moyen d'atteindre les plus belles criques et spots de baignade. La plupart des sorties associent quelques heures de navigation à des baignades, du snorkeling et un retour au coucher du soleil, mais le trajet exact et le rythme sont convenus avec votre skipper au préalable. Les prestataires vous répondent avec un prix pour votre groupe entier en fonction de la zone, de la durée et du nombre de personnes.",
    },
    de: {
      h1: "Bootsausflüge auf Kreta",
      intro: "Kretas Küste ist lang, und ein Großteil davon ist nicht auf dem Landweg erreichbar. Ein privater oder kleingruppenweiser Bootsausflug ist oft der einzige Weg zu den schönsten Buchten und Schwimmstellen. Die meisten Ausflüge kombinieren einige Stunden Segeln mit Schwimmstopps, Schnorcheln und einer Rückkehr bei Sonnenuntergang, aber Route und Tempo werden vorab mit Ihrem Skipper abgesprochen. Anbieter antworten mit einem Preis für Ihre gesamte Gruppe, basierend auf Region, Dauer und Personenzahl.",
    },
    el: {
      h1: "Εκδρομές με σκάφος στην Κρήτη",
      intro: "Η ακτογραμμή της Κρήτης είναι μεγάλη και μεγάλο μέρος της δεν είναι προσβάσιμο οδικώς. Μια ιδιωτική εκδρομή ή εκδρομή μικρής ομάδας με σκάφος είναι συχνά ο μόνος τρόπος να φτάσετε στους καλύτερους κολπίσκους και σημεία κολύμβησης. Οι περισσότερες εκδρομές συνδυάζουν μερικές ώρες πλεύσης με στάσεις για κολύμπι, κατάδυση με μάσκα και επιστροφή κατά το ηλιοβασίλεμα, αλλά η ακριβής διαδρομή και ο ρυθμός συμφωνούνται εκ των προτέρων με τον πλοίαρχό σας. Οι πάροχοι απαντούν με τιμή για ολόκληρη την παρέα σας βάσει της περιοχής, της διάρκειας και του αριθμού ατόμων.",
    },
    it: {
      h1: "Escursioni in barca a Creta",
      intro: "La costa cretese è lunga e gran parte di essa non è raggiungibile via terra. Un'escursione privata o in piccolo gruppo in barca è spesso l'unico modo per raggiungere le migliori calette e i punti di balneazione. La maggior parte delle escursioni combina alcune ore di navigazione con soste per nuotare, fare snorkeling e un ritorno al tramonto, ma il percorso esatto e il ritmo vengono concordati in anticipo con il vostro skipper. I fornitori rispondono con un prezzo per il vostro gruppo intero in base alla zona, alla durata e al numero di persone.",
    },
    nl: {
      h1: "Boottochten op Kreta",
      intro: "De kustlijn van Kreta is lang en een groot deel ervan is niet bereikbaar per weg. Een privé of kleine-groepsboottocht is vaak de enige manier om de mooiste baaien en zwemplekken te bereiken. De meeste tochten combineren een paar uur zeilen met zwemstops, snorkelen en een terugkeer rond zonsondergang, maar de exacte route en het tempo worden vooraf met je schipper afgesproken. Aanbieders antwoorden met een prijs voor je hele groep op basis van het gebied, de duur en het aantal personen.",
    },
    pl: {
      h1: "Rejsy łodzią na Krecie",
      intro: "Linia brzegowa Krety jest długa i duża jej część jest niedostępna drogą lądową. Prywatny lub małogrupowy rejs łodzią jest często jedynym sposobem na dotarcie do najpiękniejszych zatoczek i miejsc kąpielowych. Większość rejsów łączy kilka godzin żeglowania z kąpielami, snorkelingiem i powrotem o zachodzie słońca, ale dokładna trasa i tempo są ustalane wcześniej ze skipperem. Organizatorzy odpowiadają ceną dla całej grupy w oparciu o rejon, czas trwania i liczbę osób.",
    },
    es: {
      h1: "Excursiones en barco en Creta",
      intro: "La costa cretense es larga y gran parte de ella no es accesible por carretera. Una excursión en barco privado o en grupo pequeño es a menudo la única forma de llegar a las mejores calas y puntos de baño. La mayoría de las excursiones combinan algunas horas de navegación con paradas para nadar, hacer snorkel y un regreso al atardecer, pero la ruta exacta y el ritmo se acuerdan de antemano con el patrón. Los proveedores responden con un precio para todo el grupo en función de la zona, la duración y el número de personas.",
    },
    pt: {
      h1: "Passeios de barco em Creta",
      intro: "A costa cretense é longa e grande parte dela não é acessível por estrada. Um passeio de barco privado ou em pequeno grupo é muitas vezes a única forma de chegar às melhores enseadas e pontos de banho. A maioria dos passeios combina algumas horas de navegação com paragens para nadar, fazer snorkeling e um regresso ao pôr do sol, mas o percurso exato e o ritmo são acordados antecipadamente com o capitão. Os fornecedores respondem com um preço para todo o grupo com base na zona, duração e número de pessoas.",
    },
    ru: {
      h1: "Прогулки на лодке на Крите",
      intro: "Береговая линия Крита длинная, и большая её часть недоступна по суше. Частная или малогрупповая прогулка на лодке нередко является единственным способом добраться до лучших бухточек и мест для купания. Большинство прогулок сочетают несколько часов плавания с купанием, снорклингом и возвращением на закате, но точный маршрут и темп заранее согласовываются с вашим шкипером. Операторы отвечают ценой для всей вашей группы в зависимости от района, продолжительности и количества человек.",
    },
    ja: {
      h1: "クレタ島のボートトリップ",
      intro: "クレタ島の海岸線は長く、その多くは道路では到達できません。プライベートまたは小グループのボートトリップが、最高の入り江や海水浴スポットに行く唯一の方法であることが多いです。ほとんどのトリップは数時間の航行と海水浴、シュノーケリング、夕暮れ時の帰航を組み合わせていますが、正確なルートとペースは事前にスキッパーと合意します。業者はエリア、時間、人数に基づきグループ全体の料金で返信します。",
    },
    ko: {
      h1: "크레타 보트 여행",
      intro: "크레타의 해안선은 길고 그 대부분은 도로로 접근할 수 없습니다. 개인 또는 소그룹 보트 여행은 종종 최고의 만과 수영 장소에 도달하는 유일한 방법입니다. 대부분의 여행은 몇 시간의 항해와 수영 정류장, 스노클링, 일몰 때의 귀환을 결합하지만 정확한 경로와 속도는 사전에 선장과 합의합니다. 업체는 지역, 시간, 인원 수에 따라 그룹 전체 가격으로 답변합니다.",
    },
    zh: {
      h1: "克里特岛游船",
      intro: "克里特岛的海岸线很长，其中很大一部分无法通过公路到达。私人或小团体游船通常是到达最佳海湾和游泳点的唯一方式。大多数行程将几小时的航行与游泳、浮潜停留和日落返回结合在一起，但具体路线和节奏事先与您的船长商定。供应商根据地区、时长和人数回复您整个团队的报价。",
    },
    tr: {
      h1: "Girit'te tekne gezileri",
      intro: "Girit'in kıyı şeridi uzun ve büyük bir kısmı karadan ulaşılamaz. Özel veya küçük grup tekne gezisi, en iyi koy ve yüzme noktalarına ulaşmanın genellikle tek yoludur. Çoğu gezi birkaç saatlik yelkeni yüzme durakları, şnorkel ve gün batımında dönüşle birleştirir; ancak tam rota ve tempo önceden kaptanınızla kararlaştırılır. Operatörler bölge, süre ve kişi sayısına göre tüm grubunuz için fiyatla yanıt verir.",
    },
    sv: {
      h1: "Båtturer på Kreta",
      intro: "Kretas kustlinje är lång och stor del av den är inte nåbar med bil. En privat eller liten gruppbåttur är ofta det enda sättet att nå de bästa vikarna och badplatserna. De flesta turer kombinerar några timmars segling med simstoppar, snorkling och en återkomst runt solnedgången, men den exakta rutten och takten avtalas i förväg med din skeppare. Aktörer svarar med ett pris för hela din grupp baserat på område, varaktighet och antal personer.",
    },
    da: {
      h1: "Bådsture på Kreta",
      intro: "Kretas kystlinje er lang, og en stor del af den er ikke tilgængelig ad landevejen. En privat eller lille gruppe bådstur er ofte den eneste måde at nå de bedste bugter og badesteder. De fleste ture kombinerer et par timers sejlads med svømmestop, snorkling og en hjemtur ved solnedgang, men den præcise rute og tempoet aftales på forhånd med din skipper. Udbydere svarer med en pris for hele din gruppe baseret på område, varighed og antal personer.",
    },
    no: {
      h1: "Båtturer på Kreta",
      intro: "Kretas kystlinje er lang og store deler av den er ikke tilgjengelig med bil. En privat eller liten gruppe båttur er ofte den eneste måten å nå de beste buktene og badeplassene. De fleste turene kombinerer et par timers seiling med badetopp, snorkling og en hjemtur ved solnedgang, men den nøyaktige ruten og tempoet avklares på forhånd med skipperen din. Tilbydere svarer med en pris for hele gruppen din basert på område, varighet og antall personer.",
    },
    fi: {
      h1: "Veneretkiä Kreetalla",
      intro: "Kreetan rantaviiva on pitkä ja suuri osa siitä ei ole saavutettavissa maanteitse. Yksityinen tai pienryhmäveneretkeilys on usein ainoa tapa päästä parhaimpiin lahtiin ja uintipaikkoihin. Useimmat retket yhdistävät muutaman tunnin purjehtimisen uintipysähdyksiin, snorklaukseen ja paluuseen auringonlaskun aikaan, mutta tarkka reitti ja vauhti sovitaan etukäteen kapteenisi kanssa. Toimijat vastaavat hinnalla koko ryhmällesi alueen, keston ja henkilömäärän perusteella.",
    },
    cs: {
      h1: "Plavby lodí na Krétě",
      intro: "Pobřeží Kréty je dlouhé a velká jeho část není dostupná po silnici. Soukromá nebo maloskupinová plavba lodí je často jediným způsobem, jak se dostat k nejlepším zátoce a místům ke koupání. Většina výletů kombinuje několik hodin plavby se zastávkami ke koupání, šnorchlování a návratem při západu slunce, ale přesnou trasu a tempo si dopředu domluvíte s kapitánem. Poskytovatelé odpovídají cenou pro celou vaši skupinu na základě oblasti, doby trvání a počtu osob.",
    },
    hu: {
      h1: "Hajókirándulások Krétán",
      intro: "Kréta partvonala hosszú, és nagy részéhez nem vezet közút. Egy privát vagy kis csoportos hajókirándulás gyakran az egyetlen lehetőség a legjobb öblök és fürdőhelyek elérésére. A legtöbb kirándulás néhány óra vitorlázást ötvöz úszóállomásokkal, snorkeleléssel és naplementekor való visszatéréssel, de a pontos útvonalat és ütemet előre egyeztetik kapitányukkal. A szervezők az egész csoport árával válaszolnak, a terület, az időtartam és a létszám alapján.",
    },
    ro: {
      h1: "Excursii cu barca în Creta",
      intro: "Coasta Cretei este lungă și mare parte din ea nu este accesibilă pe șosea. O excursie cu barca privată sau cu un grup mic este adesea singura modalitate de a ajunge la cele mai frumoase cale și locuri de înot. Majoritatea excursiilor combină câteva ore de navigație cu opriri pentru înot, snorkeling și o întoarcere la apus, dar ruta exactă și ritmul sunt stabilite în avans cu căpitanul. Furnizorii răspund cu un preț pentru întregul tău grup, în funcție de zonă, durată și număr de persoane.",
    },
    ar: {
      h1: "رحلات قاربية في كريت",
      intro: "ساحل كريت طويل وجزء كبير منه لا يمكن الوصول إليه براً. الرحلة القاربية الخاصة أو لمجموعة صغيرة هي في الغالب الطريقة الوحيدة للوصول إلى أجمل الخلجان ومواقع السباحة. تجمع معظم الرحلات بين ساعات من الإبحار ومحطات للسباحة والغطس والعودة عند غروب الشمس، لكن المسار الدقيق والإيقاع يُتفق عليهما مسبقاً مع الربان. يردّ المزودون بسعر لمجموعتك بالكامل بناءً على المنطقة والمدة وعدد الأشخاص.",
    },
  },
  hiking: {
    en: {
      h1: "Hiking & nature in Crete",
      intro: "Crete has one of the densest trail networks of any Greek island, from coastal paths to the White Mountains above 2 000 m. The most famous route is Samaria Gorge, but there are dozens of other gorges, sections of the E4 European long-distance trail, and quieter mountain paths where you are unlikely to meet other tourists. A local guide knows which paths are open, which require permits, and what the terrain actually feels like. They price their walks for your group. Solo walkers, families and experienced trekkers all need different things.",
    },
    fr: {
      h1: "Randonnée & nature en Crète",
      intro: "La Crète possède l'un des réseaux de sentiers les plus denses de toutes les îles grecques, des chemins côtiers jusqu'aux Montagnes Blanches au-dessus de 2 000 m. L'itinéraire le plus connu est les Gorges de Samaria, mais il existe des dizaines d'autres gorges, des tronçons du sentier européen de grande randonnée E4, et des chemins de montagne plus tranquilles où vous n'êtes pas près de croiser d'autres touristes. Un guide local sait quels sentiers sont ouverts, lesquels nécessitent des autorisations, et à quoi ressemble vraiment le terrain. Il tarifie ses randonnées pour votre groupe. Randonneurs solitaires, familles et trekkeurs expérimentés ont tous des besoins différents.",
    },
    de: {
      h1: "Wandern & Natur auf Kreta",
      intro: "Kreta hat eines der dichtesten Wegenetze aller griechischen Inseln, von Küstenpfaden bis zu den Weißen Bergen über 2 000 m. Die bekannteste Route ist die Samaria-Schlucht, aber es gibt Dutzende anderer Schluchten, Abschnitte des europäischen Fernwanderwegs E4 und ruhigere Bergpfade, auf denen man kaum anderen Touristen begegnet. Ein lokaler Guide weiß, welche Wege offen sind, welche Genehmigungen erfordern, und wie das Gelände wirklich ist. Er kalkuliert seine Wanderungen für Ihre Gruppe. Alleinwanderer, Familien und erfahrene Trekker haben alle unterschiedliche Bedürfnisse.",
    },
    el: {
      h1: "Πεζοπορία & φύση στην Κρήτη",
      intro: "Η Κρήτη έχει ένα από τα πυκνότερα δίκτυα μονοπατιών από όλα τα ελληνικά νησιά, από παράκτια μονοπάτια έως τα Λευκά Όρη πάνω από 2 000 μ. Η πιο γνωστή διαδρομή είναι το Φαράγγι της Σαμαριάς, αλλά υπάρχουν δεκάδες άλλα φαράγγια, τμήματα του ευρωπαϊκού μακρινού μονοπατιού Ε4, και πιο ήσυχα ορεινά μονοπάτια όπου είναι απίθανο να συναντήσετε άλλους τουρίστες. Ένας τοπικός ξεναγός γνωρίζει ποια μονοπάτια είναι ανοιχτά, ποια απαιτούν άδειες και πώς είναι πραγματικά το έδαφος. Τιμολογούν τις πεζοπορίες για την παρέα σας. Μοναχικοί πεζοπόροι, οικογένειες και έμπειροι ορειβάτες έχουν όλοι διαφορετικές ανάγκες.",
    },
    it: {
      h1: "Escursionismo e natura a Creta",
      intro: "Creta ha una delle reti di sentieri più dense di tutte le isole greche, dai percorsi costieri alle Montagne Bianche sopra i 2 000 m. Il percorso più famoso è la Gola di Samaria, ma esistono decine di altre gole, tratti del sentiero europeo a lunga distanza E4 e sentieri di montagna più tranquilli dove è improbabile incontrare altri turisti. Una guida locale sa quali sentieri sono aperti, quali richiedono permessi e com'è davvero il terreno. Calcolano le loro escursioni per il tuo gruppo. Escursionisti solitari, famiglie e trekker esperti hanno tutti esigenze diverse.",
    },
    nl: {
      h1: "Wandelen en natuur op Kreta",
      intro: "Kreta heeft een van de dichtste wandelnetwerken van alle Griekse eilanden, van kustpaden tot de Witte Bergen boven de 2 000 m. De bekendste route is de Samaria-kloof, maar er zijn tientallen andere kloven, gedeelten van het Europese langeafstandspad E4 en stillere bergpaden waar je waarschijnlijk geen andere toeristen tegenkomt. Een lokale gids weet welke paden open zijn, welke vergunningen vereisen en hoe het terrein er in werkelijkheid uitziet. Ze prijzen hun wandelingen voor jouw groep. Soloisten, families en ervaren trekkers hebben allemaal andere behoeften.",
    },
    pl: {
      h1: "Piesze wędrówki i przyroda na Krecie",
      intro: "Kreta posiada jedną z najgęstszych sieci szlaków na wszystkich greckich wyspach, od ścieżek nadmorskich po Białe Góry powyżej 2 000 m. Najsłynniejszą trasą jest Wąwóz Samaria, ale jest też dziesiątki innych wąwozów, odcinki europejskiego szlaku długodystansowego E4 i spokojniejsze górskie ścieżki, na których raczej nie spotkacie innych turystów. Lokalny przewodnik wie, które szlaki są otwarte, które wymagają zezwoleń i jak naprawdę wygląda teren. Wyceniają wycieczki dla waszej grupy. Samotni wędrowcy, rodziny i doświadczeni trekerzy mają różne potrzeby.",
    },
    es: {
      h1: "Senderismo y naturaleza en Creta",
      intro: "Creta tiene una de las redes de senderos más densas de todas las islas griegas, desde caminos costeros hasta las Montañas Blancas por encima de los 2 000 m. La ruta más famosa es el Desfiladero de Samaria, pero hay docenas de otras gargantas, tramos del sendero europeo de largo recorrido E4 y caminos de montaña más tranquilos donde es improbable encontrarse con otros turistas. Un guía local sabe qué senderos están abiertos, cuáles requieren permisos y cómo es el terreno en realidad. Cotizan sus caminatas para tu grupo. Excursionistas en solitario, familias y trekkers experimentados tienen necesidades diferentes.",
    },
    pt: {
      h1: "Caminhadas e natureza em Creta",
      intro: "Creta tem uma das redes de trilhos mais densas de todas as ilhas gregas, de caminhos costeiros às Montanhas Brancas acima dos 2 000 m. O percurso mais famoso é o Desfiladeiro de Samaria, mas existem dezenas de outros desfiladeiros, troços do trilho europeu de longa distância E4 e caminhos de montanha mais calmos onde é improvável encontrar outros turistas. Um guia local sabe quais os trilhos que estão abertos, quais precisam de licenças e como é o terreno na realidade. Calculam as suas caminhadas para o teu grupo. Caminhantes solitários, famílias e trekkers experientes têm todos necessidades diferentes.",
    },
    ru: {
      h1: "Пешие походы и природа на Крите",
      intro: "У Крита одна из самых густых сетей троп среди всех греческих островов, от прибрежных тропинок до Белых гор высотой свыше 2 000 м. Самым известным маршрутом является ущелье Самария, но есть десятки других ущелий, участки европейского дальнего маршрута E4 и более тихие горные тропы, где редко встретишь других туристов. Местный гид знает, какие тропы открыты, какие требуют разрешений и каков рельеф на самом деле. Они рассчитывают свои маршруты для вашей группы. У одиночных путешественников, семей и опытных треккеров разные потребности.",
    },
    ja: {
      h1: "クレタ島のハイキングと自然",
      intro: "クレタ島は、海岸の小道から標高2,000m超の白山地まで、ギリシャのすべての島の中で最も密なトレイルネットワークの一つを持っています。最も有名なルートはサマリア渓谷ですが、他にも数十の渓谷、ヨーロッパ長距離トレイルE4の区間、他の観光客にほぼ出会わないより静かな山道があります。地元のガイドはどの道が開いているか、許可が必要な道はどれか、そして実際の地形を把握しています。一人旅、家族連れ、経験豊富なトレッカー、それぞれに異なるニーズに合わせてグループ料金を提示します。",
    },
    ko: {
      h1: "크레타 하이킹 및 자연",
      intro: "크레타는 해안 경로부터 2,000m 이상의 백산 지대까지, 모든 그리스 섬 중 가장 밀도 높은 트레일 네트워크 중 하나를 보유하고 있습니다. 가장 유명한 경로는 사마리아 협곡이지만 다른 협곡, 유럽 장거리 트레일 E4 구간, 다른 관광객을 만날 가능성이 낮은 더 조용한 산길도 수십 곳 있습니다. 현지 가이드는 어떤 길이 열려 있는지, 허가가 필요한 길은 어디인지, 그리고 지형이 실제로 어떤지 알고 있습니다. 혼자 여행하는 사람, 가족, 경험 많은 트레커 모두 다른 필요가 있으므로 그룹 가격을 제시합니다.",
    },
    zh: {
      h1: "克里特岛徒步与自然",
      intro: "克里特岛拥有希腊所有岛屿中最密集的步道网络之一，从沿海小径到海拔2,000米以上的白山地区。最著名的路线是萨马里亚峡谷，但还有数十个其他峡谷、欧洲长距离步道E4的路段，以及鲜少遇到其他游客的更宁静山路。当地导游了解哪些路径开放、哪些需要许可证，以及实际地形如何。他们针对您的团队报价。独行客、家庭和经验丰富的徒步者各有不同需求。",
    },
    tr: {
      h1: "Girit'te yürüyüş ve doğa",
      intro: "Girit, tüm Yunan adaları arasında en yoğun yürüyüş ağlarından birine sahiptir, kıyı yollarından 2 000 m üzerindeki Beyaz Dağlar'a kadar. En ünlü rota Samaria Geçidi'dir, ancak düzinelerce başka geçit, Avrupa uzun mesafe yolu E4'ün bölümleri ve başka turistlerle karşılaşma ihtimalinizin düşük olduğu daha sakin dağ yolları da vardır. Yerel bir rehber hangi yolların açık olduğunu, hangilerinin izin gerektirdiğini ve arazinin gerçekte nasıl olduğunu bilir. Yürüyüşlerini grubunuz için fiyatlandırır. Yalnız yürüyüşçüler, aileler ve deneyimli trekkerlar hepsinin farklı ihtiyaçları vardır.",
    },
    sv: {
      h1: "Vandring och natur på Kreta",
      intro: "Kreta har ett av de tätaste ledssystemen på alla Griekse öarna, från kuststigar till Vita bergen över 2 000 m. Den mest kända rutten är Samaria-klyftan, men det finns dussintals andra klyftor, avsnitt av det europeiska långdistansledet E4 och lugnare bergsstigar där du sannolikt inte möter andra turister. En lokal guide vet vilka leder som är öppna, vilka som kräver tillstånd och hur terrängen faktiskt ser ut. De prissätter sina vandringar för din grupp. Solovandare, familjer och erfarna trekkers har alla olika behov.",
    },
    da: {
      h1: "Vandring og natur på Kreta",
      intro: "Kreta har et af de tættest vandrestier netværk på alle Grieske øer, fra kyststier til Hvide Bjerge over 2 000 m. Den mest kendte rute er Samaria-kløften, men der er snesevis af andre kløfter, afsnit af den europæiske langdistancesti E4 og roligere bjergstier, hvor du sandsynligvis ikke møder andre turister. En lokal guide ved, hvilke stier der er åbne, hvilke der kræver tilladelser, og hvordan terrænet faktisk er. De prissætter deres vandringer for din gruppe. Soloturister, familier og erfarne trekkere har alle forskellige behov.",
    },
    no: {
      h1: "Vandring og natur på Kreta",
      intro: "Kreta har ett av de tetteste stinettverkene blant alle greske øyer, fra kystveier til Hvite fjell over 2 000 m. Den mest kjente ruten er Samaria-kløften, men det finnes dusinvis av andre kløfter, deler av den europeiske langdistansestien E4 og roligere fjellstier der du neppe møter andre turister. En lokal guide vet hvilke stier som er åpne, hvilke som krever tillatelser, og hvordan terrenget faktisk er. De prissetter turene sine for gruppen din. Soloturister, familier og erfarne trekkere har alle ulike behov.",
    },
    fi: {
      h1: "Vaellukset ja luonto Kreetalla",
      intro: "Kreetalla on yksi tiheimmistä reittiverkoista kaikista Kreikan saarista, rantareiteistä Valkoisiin vuoriin yli 2 000 m korkeudelle. Tunnetuin reitti on Samarian rotkoreitti, mutta on kymmeniä muita rotkoja, E4-pitkänmatkan reitin osuuksia ja rauhallisempia vuoristoreittejä, joilla et todennäköisesti kohtaa muita turisteja. Paikallinen opas tietää mitkä reitit ovat auki, mitkä vaativat lupia ja millainen maasto todella on. He hinnoittelevat retkensä ryhmällesi. Yksin vaeltajat, perheet ja kokeneet vaeltajat tarvitsevat kaikki eri asioita.",
    },
    cs: {
      h1: "Turistika a příroda na Krétě",
      intro: "Kréta má jednu z nejhustších sítí stezek ze všech Řeckých ostrovů, od pobřežních cest po Bílé hory nad 2 000 m. Nejznámější trasa je Soutěska Samaria, ale existují desítky dalších soutěsek, úseky evropské dálkové turistické trasy E4 a klidnější horské stezky, kde je nepravděpodobné, že narazíte na jiné turisty. Místní průvodce ví, které stezky jsou otevřené, které vyžadují povolení a jak terén skutečně vypadá. Kalkulují své vycházky pro vaši skupinu. Sóloturisté, rodiny a zkušení trekaři mají všichni různé potřeby.",
    },
    hu: {
      h1: "Túrázás és természet Krétán",
      intro: "Krétának az összes görög sziget közül az egyik legsűrűbb ösvényhálózata van, a parti utaktól a 2 000 m feletti Fehér-hegyekig. A leghíresebb útvonal a Szamária-szurdok, de vannak tucatnyi más szurdok, az E4 európai hosszútávú túraútvonal szakaszai, és csendesebb hegyiösvények, ahol más turistával aligha találkozik. Egy helyi idegenvezető tudja, mely utak nyitottak, melyekhez kell engedély, és milyen a terep valójában. A csoportjára szabva árazzák a kirándulásokat. Az egyéni túrázóknak, a családoknak és a tapasztalt trekkereknek mind más igényük van.",
    },
    ro: {
      h1: "Drumeții și natură în Creta",
      intro: "Creta are una dintre cele mai dense rețele de trasee dintre toate insulele grecești, de la poteci costiere la Munții Albi de peste 2 000 m. Cel mai cunoscut traseu este Defileul Samaria, dar există zeci de alte defilee, tronsoane ale traseului european de lungă distanță E4 și poteci montane mai liniștite unde este puțin probabil să întâlnești alți turiști. Un ghid local știe ce trasee sunt deschise, care necesită permise și cum este terenul în realitate. Ei calculează drumețiile pentru grupul tău. Drumeții solitari, familii și trekker-i experimentați au cu toții nevoi diferite.",
    },
    ar: {
      h1: "المشي في الطبيعة والطبيعة في كريت",
      intro: "تمتلك كريت إحدى أكثف شبكات المسارات بين جميع الجزر اليونانية، من المسارات الساحلية إلى الجبال البيضاء فوق 2000 متر. الطريق الأشهر هو وادي سامارياس، لكن توجد عشرات المسارات الأخرى وأجزاء من ممر المشي الأوروبي البعيد E4 ومسارات جبلية أكثر هدوءاً يندر أن تلقى فيها سياحاً آخرين. المرشد المحلي يعرف أيّ المسارات مفتوحة، وأيّها يحتاج تصاريح، وكيف تبدو التضاريس فعلياً. يسعّرون رحلاتهم لمجموعتك، فالمشاة المنفردون والعائلات والمشاة ذوو الخبرة لديهم جميعاً احتياجات مختلفة.",
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
  it: "{category} a {city}, Creta · preventivi diretti da operatori locali",
  nl: "{category} in {city}, Kreta · directe offertes van lokale aanbieders",
  pl: "{category} w {city}, Kreta · bezpośrednie wyceny od lokalnych organizatorów",
  es: "{category} en {city}, Creta · presupuestos directos de proveedores locales",
  pt: "{category} em {city}, Creta · orçamentos diretos de fornecedores locais",
  ru: "{category} в {city}, Крит · прямые расчёты от местных операторов",
  ja: "クレタ島{city}の{category} · 地元業者からの直接見積もり",
  ko: "크레타 {city}의 {category} · 현지 업체의 직접 견적",
  zh: "克里特岛{city}的{category} · 本地供应商直接报价",
  tr: "{city}, Girit'te {category} · yerel tedarikçilerden doğrudan fiyat teklifleri",
  sv: "{category} i {city}, Kreta · direkta offerter från lokala aktörer",
  da: "{category} i {city}, Kreta · direkte tilbud fra lokale udbydere",
  no: "{category} i {city}, Kreta · direkte tilbud fra lokale tilbydere",
  fi: "{category} paikassa {city}, Kreeta · suorat tarjoukset paikallisilta toimijoilta",
  cs: "{category} v {city}, Kréta · přímé nabídky od místních poskytovatelů",
  hu: "{category} {city}, Kréta · közvetlen árajánlatok helyi szolgáltatóktól",
  ro: "{category} în {city}, Creta · oferte directe de la furnizori locali",
  ar: "{category} في {city}، كريت · عروض أسعار مباشرة من مزودين محليين",
};

export const CITY_INTRO_TPL: Record<string, string> = {
  en: "Looking for {category} in {city}? Tell us your dates and group size, local providers based in or near {city} reply with a quote for your whole group. You pay them directly on the day.",
  fr: "Vous cherchez des {category} à {city} ? Indiquez-nous vos dates et la taille de votre groupe, des prestataires locaux basés à ou près de {city} vous répondent avec un devis pour votre groupe entier. Vous les payez directement sur place.",
  de: "Suchen Sie {category} in {city}? Teilen Sie uns Ihre Daten und Gruppengröße mit, lokale Anbieter in oder bei {city} antworten mit einem Angebot für Ihre gesamte Gruppe. Sie zahlen direkt vor Ort.",
  el: "Ψάχνετε για {category} στην/στο {city}; Πείτε μας τις ημερομηνίες σας και το μέγεθος της παρέας, τοπικοί πάροχοι με έδρα την/το {city} ή κοντά σε αυτήν/αυτό απαντούν με προσφορά για ολόκληρη την παρέα σας. Τους πληρώνετε απευθείας εκείνη την ημέρα.",
  it: "Cerchi {category} a {city}? Dicci le tue date e la dimensione del gruppo, operatori locali con sede a o vicino a {city} rispondono con un preventivo per il tuo gruppo intero. Li paghi direttamente il giorno stesso.",
  nl: "Op zoek naar {category} in {city}? Vertel ons je datums en groepsgrootte, lokale aanbieders gevestigd in of nabij {city} antwoorden met een offerte voor je hele groep. Je betaalt hen rechtstreeks op de dag zelf.",
  pl: "Szukasz {category} w {city}? Powiedz nam swoje daty i wielkość grupy, lokalni organizatorzy z siedzibą w {city} lub w pobliżu odpowiadają wyceną dla całej grupy. Płacisz im bezpośrednio w dniu aktywności.",
  es: "¿Buscas {category} en {city}? Cuéntanos tus fechas y el tamaño del grupo, proveedores locales con sede en {city} o cerca de allí responden con un presupuesto para todo tu grupo. Les pagas directamente el día.",
  pt: "Procuras {category} em {city}? Diz-nos as tuas datas e o tamanho do grupo, fornecedores locais com base em {city} ou perto respondem com um orçamento para todo o teu grupo. Pagas-lhes diretamente no dia.",
  ru: "Ищете {category} в {city}? Укажите ваши даты и размер группы, местные операторы, базирующиеся в {city} или вблизи, ответят с расчётом для всей вашей группы. Вы платите им напрямую в день активности.",
  ja: "{city}で{category}をお探しですか？日程とグループ人数を教えてください。{city}またはその近郊を拠点とする地元業者がグループ全体の見積もりで返信します。当日に直接お支払いください。",
  ko: "{city}에서 {category}을 찾고 있나요? 날짜와 그룹 크기를 알려주세요. {city} 또는 그 근처를 기반으로 하는 현지 업체가 그룹 전체 견적으로 답변합니다. 당일 직접 결제하세요.",
  zh: "在{city}寻找{category}？告诉我们您的日期和团队人数，位于{city}或附近的本地供应商会回复您整个团队的报价。当天直接付款给他们。",
  tr: "{city}'de {category} arıyor musunuz? Tarihlerinizi ve grup büyüklüğünüzü bize bildirin, {city}'de veya yakınında bulunan yerel tedarikçiler tüm grubunuz için bir fiyat teklifiyle yanıt verir. Günü geldiğinde doğrudan ödeme yaparsınız.",
  sv: "Letar du efter {category} i {city}? Berätta dina datum och gruppstorlek, lokala aktörer baserade i eller nära {city} svarar med en offert för hela din grupp. Du betalar dem direkt på dagen.",
  da: "Leder du efter {category} i {city}? Fortæl os dine datoer og gruppestørrelse, lokale udbydere baseret i eller nær {city} svarer med et tilbud til hele din gruppe. Du betaler dem direkte på dagen.",
  no: "Leter du etter {category} i {city}? Fortell oss dine datoer og gruppestørrelse, lokale tilbydere med base i eller nær {city} svarer med et tilbud for hele gruppen din. Du betaler dem direkte på dagen.",
  fi: "Etsitkö {category} paikasta {city}? Kerro meille päivämääräsi ja ryhmäsi koko, {city}:ssä tai sen lähellä toimivat paikalliset toimijat vastaavat tarjouksella koko ryhmällesi. Maksat heille suoraan päivänä.",
  cs: "Hledáte {category} v {city}? Sdělte nám svá data a velikost skupiny, místní poskytovatelé se sídlem v {city} nebo v jeho okolí odpoví nabídkou pro celou vaši skupinu. Platíte jim přímo v den aktivity.",
  hu: "{city}ban/ben {category} után keres? Mondja el nekünk dátumait és a csoport méretét, {city}ban/ben vagy közelében székhellyel rendelkező helyi szolgáltatók az egész csoportjára szóló árajánlattal válaszolnak. Közvetlenül fizet nekik azon a napon.",
  ro: "Cauți {category} în {city}? Spune-ne datele și mărimea grupului, furnizorii locali cu sediul în sau lângă {city} răspund cu o ofertă pentru întregul tău grup. Îi plătești direct în ziua respectivă.",
  ar: "هل تبحث عن {category} في {city}؟ أخبرنا بتواريخك وحجم مجموعتك، يردّ المزودون المحليون المتمركزون في {city} أو بالقرب منها بعرض سعر لمجموعتك بالكامل. تدفع لهم مباشرةً في ذلك اليوم.",
};
