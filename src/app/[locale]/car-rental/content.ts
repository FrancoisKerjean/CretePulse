// Contenu i18n de /car-rental (22 locales). Données pures, importées par page.tsx.
// en/fr/de/el rédigés à la main (source) ; les autres traduits puis vérifiés en adversarial
// (diacritiques, exactitude technique CDW/IDP/loi grecque, voix de marque honnête) le 15/06/2026.
// Fichier ASSEMBLÉ par scripts/gen-car-content.mjs (jetable). NE PAS éditer une langue à la
// main sans répercuter le même soin ; la source de vérité du contenu est désormais ce fichier.
// ONLINE_FALLBACK = repli online secondaire DiscoverCars (affilié réel, audit 13/06 A4),
// volontairement discret face au wizard Auto Smart primaire.

export type PageStrings = {
  h1: string;
  intro: string;
  drivingTitle: string;
  driving: Array<{ h: string; p: string }>;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
  breadcrumbHome: string;
  breadcrumbCarRental: string;
};

export const META: Record<string, { title: string; desc: string }> = {
  "en": {
    "title": "Rent a car in Crete — local agency, fair price, no prepayment",
    "desc": "Request a rental car in Crete in four taps. A vetted local agency replies directly with a quote: you pay the agency, cash accepted, no online prepayment, airport pick-up possible."
  },
  "fr": {
    "title": "Louer une voiture en Crète — agence locale, prix juste, sans prépaiement",
    "desc": "Demandez une voiture de location en Crète en quatre clics. Une agence locale vérifiée vous répond directement avec un devis : vous payez l'agence, espèces acceptées, aucun prépaiement en ligne, prise à l'aéroport possible."
  },
  "de": {
    "title": "Mietwagen auf Kreta — lokale Agentur, fairer Preis, keine Vorauszahlung",
    "desc": "Fordern Sie in vier Klicks einen Mietwagen auf Kreta an. Eine geprüfte lokale Agentur antwortet direkt mit einem Angebot: Sie zahlen an die Agentur, Barzahlung möglich, keine Online-Vorauszahlung, Abholung am Flughafen möglich."
  },
  "el": {
    "title": "Ενοικίαση αυτοκινήτου στην Κρήτη — τοπικό γραφείο, δίκαιη τιμή, χωρίς προπληρωμή",
    "desc": "Ζητήστε ενοικιαζόμενο αυτοκίνητο στην Κρήτη με τέσσερα κλικ. Ένα ελεγμένο τοπικό γραφείο απαντά απευθείας με προσφορά: πληρώνετε το γραφείο, δεκτά μετρητά, καμία online προπληρωμή, δυνατή παραλαβή στο αεροδρόμιο."
  },
  "it": {
    "title": "Noleggio auto a Creta — agenzia locale, prezzo onesto, nessun pagamento anticipato",
    "desc": "Richiedi un'auto a noleggio a Creta in quattro tap. Un'agenzia locale selezionata ti risponde direttamente con un preventivo: paghi l'agenzia, contanti accettati, nessun pagamento online anticipato, ritiro in aeroporto possibile."
  },
  "nl": {
    "title": "Auto huren op Kreta — lokaal verhuurbedrijf, eerlijke prijs, geen vooruitbetaling",
    "desc": "Vraag in vier tikken een huurauto op Kreta aan. Een gescreend lokaal verhuurbedrijf reageert rechtstreeks met een offerte: je betaalt het verhuurbedrijf, contant mag, geen vooruitbetaling online, ophalen op de luchthaven mogelijk."
  },
  "pl": {
    "title": "Wynajem samochodu na Krecie — lokalna firma, uczciwa cena, bez przedpłaty",
    "desc": "Zamów samochód na Krecie w cztery kliknięcia. Sprawdzona lokalna firma odpowiada bezpośrednio z wyceną: płacisz firmie, gotówka akceptowana, bez przedpłaty online, możliwy odbiór z lotniska."
  },
  "es": {
    "title": "Alquilar un coche en Creta — agencia local, precio justo, sin pago por adelantado",
    "desc": "Solicita un coche de alquiler en Creta en cuatro toques. Una agencia local verificada responde directamente con un presupuesto: pagas a la agencia, se acepta efectivo, sin pago en línea por adelantado, recogida en el aeropuerto posible."
  },
  "pt": {
    "title": "Alugar um carro em Creta — agência local, preço justo, sem pré-pagamento",
    "desc": "Peça um carro de aluguer em Creta em quatro toques. Uma agência local de confiança responde diretamente com um orçamento: paga à agência, dinheiro aceite, sem pré-pagamento online, recolha no aeroporto possível."
  },
  "ru": {
    "title": "Аренда авто на Крите — местное агентство, честная цена, без предоплаты",
    "desc": "Оставьте заявку на аренду авто на Крите в четыре касания. Проверенное местное агентство отвечает напрямую и присылает расчёт: вы платите агентству, наличные принимаются, без онлайн-предоплаты, возможна встреча в аэропорту."
  },
  "ja": {
    "title": "クレタ島でレンタカーを借りる — 地元の代理店、適正価格、前払いなし",
    "desc": "4回のタップでクレタ島のレンタカーをリクエスト。信頼できる地元の代理店が見積もりを添えて直接返信します。支払いは代理店へ、現金可、オンライン前払いなし、空港での受け取りも可能です。"
  },
  "ko": {
    "title": "크레타 렌터카 — 현지 업체, 합리적인 가격, 온라인 선결제 없음",
    "desc": "네 번의 터치로 크레타 렌터카를 요청하세요. 검증된 현지 업체가 견적과 함께 직접 답변합니다. 업체에 직접 결제하고, 현금 결제 가능, 온라인 선결제 없음, 공항 픽업 가능."
  },
  "zh": {
    "title": "在克里特岛租车 — 本地车行，价格公道，无需预付",
    "desc": "在克里特岛租车，四步即可提交需求。我们筛选过的本地车行会直接回复报价：您付款给车行，接受现金，无需在线预付，可在机场取车。"
  },
  "tr": {
    "title": "Girit'te araba kiralayın — yerel acente, adil fiyat, ön ödeme yok",
    "desc": "Girit'te kiralık araba talebinizi dört dokunuşta gönderin. Doğrulanmış yerel bir acente size doğrudan fiyat teklifiyle yanıt verir: ödemeyi acenteye yaparsınız, nakit kabul edilir, çevrimiçi ön ödeme yoktur, havalimanından teslim mümkündür."
  },
  "sv": {
    "title": "Hyr bil på Kreta — lokal byrå, rättvist pris, ingen förskottsbetalning",
    "desc": "Begär en hyrbil på Kreta med fyra tryck. En granskad lokal byrå svarar direkt med en offert: du betalar byrån, kontanter accepteras, ingen förskottsbetalning online, hämtning på flygplatsen möjlig."
  },
  "da": {
    "title": "Lej en bil på Kreta — lokalt bureau, fair pris, ingen forudbetaling",
    "desc": "Anmod om en lejebil på Kreta med fire tryk. Et udvalgt lokalt bureau svarer dig direkte med et tilbud: du betaler bureauet, kontanter accepteres, ingen forudbetaling online, afhentning i lufthavnen er mulig."
  },
  "no": {
    "title": "Leie bil på Kreta — lokalt byrå, rettferdig pris, ingen forhåndsbetaling",
    "desc": "Be om en leiebil på Kreta med fire trykk. Et kvalitetssikret lokalt byrå svarer direkte med et tilbud: du betaler byrået, kontant godtas, ingen forhåndsbetaling på nett, henting på flyplassen mulig."
  },
  "fi": {
    "title": "Vuokraa auto Kreetalla — paikallinen toimisto, reilu hinta, ei ennakkomaksua",
    "desc": "Pyydä vuokra-autoa Kreetalla neljällä napautuksella. Luotettu paikallinen toimisto vastaa suoraan tarjouksella: maksat toimistolle, käteinen käy, ei verkkomaksua etukäteen, nouto lentokentältä mahdollinen."
  },
  "cs": {
    "title": "Pronájem auta na Krétě — místní agentura, férová cena, bez platby předem",
    "desc": "Požádejte o pronájem auta na Krétě ve čtyřech krocích. Prověřená místní agentura vám odpoví přímo s cenovou nabídkou: platíte agentuře, hotovost lze platit, žádná platba předem online, vyzvednutí na letišti je možné."
  },
  "hu": {
    "title": "Autóbérlés Krétán — helyi iroda, korrekt ár, előleg nélkül",
    "desc": "Kérjen bérautót Krétán négy koppintással. Egy ellenőrzött helyi iroda közvetlenül válaszol árajánlattal: az irodának fizet, készpénz elfogadott, online előleg nincs, reptéri átvétel lehetséges."
  },
  "ro": {
    "title": "Închiriază o mașină în Creta — agenție locală, preț corect, fără plată în avans",
    "desc": "Cere o mașină de închiriat în Creta în patru atingeri. O agenție locală verificată răspunde direct cu o ofertă: plătești agenției, se acceptă numerar, fără plată online în avans, preluare de la aeroport posibilă."
  },
  "ar": {
    "title": "استئجار سيارة في كريت — وكالة محلية، سعر عادل، بدون دفع مسبق",
    "desc": "اطلب سيارة للإيجار في كريت بأربع نقرات. تردّ وكالة محلية موثوقة مباشرةً بعرض سعر: تدفع للوكالة، والنقد مقبول، بلا دفع مسبق عبر الإنترنت، والاستلام من المطار ممكن."
  }
};

export const ONLINE_FALLBACK: Record<string, string> = {
  "en": "Prefer to book online right now? Compare every rental company in Crete on DiscoverCars, with free cancellation.",
  "fr": "Vous préférez réserver en ligne tout de suite ? Comparez tous les loueurs de Crète sur DiscoverCars, annulation gratuite.",
  "de": "Lieber sofort online buchen? Vergleichen Sie alle Vermieter Kretas auf DiscoverCars, mit kostenloser Stornierung.",
  "el": "Προτιμάτε κράτηση online τώρα; Συγκρίνετε όλες τις εταιρείες στην Κρήτη στο DiscoverCars, με δωρεάν ακύρωση.",
  "it": "Preferisci prenotare online subito? Confronta tutte le compagnie di autonoleggio a Creta su DiscoverCars, con cancellazione gratuita.",
  "nl": "Liever nu meteen online boeken? Vergelijk alle autoverhuurbedrijven op Kreta op DiscoverCars, met gratis annulering.",
  "pl": "Wolisz od razu zarezerwować online? Porównaj wszystkie wypożyczalnie na Krecie w serwisie DiscoverCars, z bezpłatną anulacją.",
  "es": "¿Prefieres reservar en línea ahora mismo? Compara todas las empresas de alquiler en Creta en DiscoverCars, con cancelación gratuita.",
  "pt": "Prefere reservar online já? Compare todas as empresas de aluguer em Creta na DiscoverCars, com cancelamento gratuito.",
  "ru": "Хотите забронировать онлайн прямо сейчас? Сравните все прокатные компании Крита на DiscoverCars с бесплатной отменой.",
  "ja": "今すぐオンラインで予約したいですか？DiscoverCars でクレタ島のすべてのレンタカー会社を比較できます。キャンセル無料です。",
  "ko": "지금 바로 온라인으로 예약하고 싶으신가요? DiscoverCars에서 크레타의 모든 렌터카 업체를 비교하고 무료 취소 조건으로 예약하세요.",
  "zh": "想现在就在线预订？在 DiscoverCars 上比较克里特岛所有租车公司，可免费取消。",
  "tr": "Şimdi çevrimiçi rezervasyon yapmayı mı tercih edersiniz? DiscoverCars üzerinden Girit'teki tüm kiralama şirketlerini ücretsiz iptal seçeneğiyle karşılaştırın.",
  "sv": "Vill du boka online direkt? Jämför alla biluthyrningsföretag på Kreta hos DiscoverCars, med fri avbokning.",
  "da": "Vil du hellere booke online med det samme? Sammenlign alle biludlejningsfirmaer på Kreta hos DiscoverCars, med gratis afbestilling.",
  "no": "Vil du heller bestille på nett med en gang? Sammenlign alle utleiefirmaer på Kreta hos DiscoverCars, med gratis avbestilling.",
  "fi": "Haluatko mieluummin varata verkossa heti? Vertaile kaikkia Kreetan vuokra-autofirmoja DiscoverCarsissa, ilmainen peruutus mukana.",
  "cs": "Chcete si raději rezervovat online hned teď? Porovnejte všechny půjčovny aut na Krétě na DiscoverCars, se zrušením zdarma.",
  "hu": "Inkább most foglalna online? Hasonlítsa össze az összes krétai autókölcsönzőt a DiscoverCars oldalán, ingyenes lemondással.",
  "ro": "Preferi să rezervi online chiar acum? Compară toate companiile de închirieri din Creta pe DiscoverCars, cu anulare gratuită.",
  "ar": "تفضّل الحجز عبر الإنترنت الآن؟ قارن بين كل شركات تأجير السيارات في كريت على DiscoverCars، مع إمكانية إلغاء مجاني."
};

export const L: Record<string, PageStrings> = {
  "en": {
    "h1": "Rent a car in Crete",
    "intro": "This form sends your request to a local rental agency we actually work with: Auto Smart Car Rental in Chania, clearly labelled, nothing hidden. The agency replies directly with a quote; you pay them, on the spot if you like, cash accepted, no online prepayment. We earn a commission from the agency when a rental happens — the price you pay does not change because of it.",
    "drivingTitle": "Driving in Crete: what to know before you book",
    "driving": [
      {
        "h": "Licence and paperwork",
        "p": "An EU or EEA driving licence is all you need. If your licence was issued outside the EU/EEA, Greek agencies and police can ask for an International Driving Permit (IDP) alongside your national licence — get one before you fly, it cannot be issued in Greece. Most agencies ask for a minimum age of 21 to 23 and at least one year of driving experience."
      },
      {
        "h": "Insurance, in plain words",
        "p": "Quotes normally include the legal third-party liability and a collision damage waiver (CDW) with an excess: if the car is damaged, you pay up to that excess amount, not the full repair. Full coverage reduces the excess to zero or near zero for a few euros more per day. Read what is excluded — tyres, underbody, mirrors and dirt roads often are — and ask the agency directly, they answer."
      },
      {
        "h": "Mountain roads and goats",
        "p": "Crete's interior is hairpin country: narrow lanes, blind corners, and goats that consider the asphalt theirs. Honk briefly before tight blind bends, let locals pass, and fill up before heading into the mountains — petrol stations get sparse south of the main road. A small car is genuinely easier on village streets than a big SUV."
      },
      {
        "h": "Parking in the old towns",
        "p": "The old towns of Chania, Rethymno and Heraklion are largely pedestrian or residents-only. Do not try to park inside them: use the signed paid car parks and free zones around the edges and walk in — it is ten minutes at most. Blue lines mean paid parking, yellow means no parking, white is free."
      }
    ],
    "faqTitle": "Questions people actually ask",
    "faq": [
      {
        "q": "Do I have to prepay online?",
        "a": "No. This form only sends your request to the local agency. They reply with a quote and you confirm directly with them — there is no online payment on this page, no card required to ask."
      },
      {
        "q": "Can I pay in cash?",
        "a": "Yes. The partner agency accepts cash as well as cards. You pay when you pick up the car or as agreed with the agency; a refundable security deposit typically applies, with the exact amount confirmed in the quote."
      },
      {
        "q": "What insurance is included?",
        "a": "Quotes from the agency include third-party liability as required by Greek law, normally with a collision damage waiver (CDW) and a damage excess: the exact excess amount and conditions are confirmed in the quote. Full coverage with zero or near-zero excess is available for an extra daily fee. Ask for it in the request notes if you want it quoted."
      },
      {
        "q": "Can I pick the car up at the airport?",
        "a": "Yes. Chania airport pick-up and drop-off is standard, and the agency also covers Heraklion airport, the ports and Rethymno: add your flight number in the form and the agency tracks delays. Pick-up in town or at your accommodation is typically possible too."
      }
    ],
    "breadcrumbHome": "Home",
    "breadcrumbCarRental": "Rent a car"
  },
  "fr": {
    "h1": "Louer une voiture en Crète",
    "intro": "Ce formulaire transmet votre demande à une agence de location locale avec laquelle nous travaillons vraiment : Auto Smart Car Rental à La Canée, clairement étiquetée, rien de caché. L'agence vous répond directement avec un devis ; vous la payez, sur place si vous voulez, espèces acceptées, aucun prépaiement en ligne. Nous touchons une commission de l'agence quand une location se conclut — le prix que vous payez ne change pas pour autant.",
    "drivingTitle": "Conduire en Crète : à savoir avant de réserver",
    "driving": [
      {
        "h": "Permis et papiers",
        "p": "Un permis de conduire de l'UE ou de l'EEE suffit. Si votre permis a été délivré hors UE/EEE, les agences grecques et la police peuvent exiger un permis de conduire international (PCI) en plus de votre permis national — faites-le avant de partir, il ne peut pas être délivré en Grèce. La plupart des agences demandent un âge minimum de 21 à 23 ans et au moins un an de conduite."
      },
      {
        "h": "L'assurance, en clair",
        "p": "Les devis incluent normalement la responsabilité civile obligatoire et une assurance collision (CDW) avec franchise : en cas de dommage, vous payez au maximum le montant de la franchise, pas toute la réparation. La couverture complète ramène la franchise à zéro ou presque pour quelques euros de plus par jour. Lisez ce qui est exclu — pneus, bas de caisse, rétroviseurs et pistes le sont souvent — et posez la question à l'agence, elle répond."
      },
      {
        "h": "Routes de montagne et chèvres",
        "p": "L'intérieur de la Crète, c'est le pays des épingles à cheveux : voies étroites, virages aveugles et chèvres qui considèrent l'asphalte comme leur territoire. Un coup de klaxon bref avant les virages sans visibilité, laissez passer les locaux, et faites le plein avant de monter — les stations-service se raréfient au sud de l'axe principal. Une petite voiture est franchement plus facile dans les ruelles de village qu'un gros SUV."
      },
      {
        "h": "Se garer dans les vieilles villes",
        "p": "Les vieilles villes de La Canée, Réthymnon et Héraklion sont largement piétonnes ou réservées aux résidents. N'essayez pas de vous y garer : utilisez les parkings payants signalés et les zones gratuites en périphérie, puis marchez — dix minutes au maximum. Lignes bleues : stationnement payant ; jaunes : interdit ; blanches : gratuit."
      }
    ],
    "faqTitle": "Les questions qu'on nous pose vraiment",
    "faq": [
      {
        "q": "Dois-je prépayer en ligne ?",
        "a": "Non. Ce formulaire transmet seulement votre demande à l'agence locale. Elle vous répond avec un devis et vous confirmez directement avec elle — aucun paiement en ligne sur cette page, aucune carte requise pour demander."
      },
      {
        "q": "Puis-je payer en espèces ?",
        "a": "Oui. L'agence partenaire accepte les espèces comme les cartes. Vous payez à la prise du véhicule ou selon ce que vous convenez avec l'agence ; un dépôt de garantie restituable s'applique généralement, son montant exact est confirmé au devis."
      },
      {
        "q": "Quelle assurance est incluse ?",
        "a": "Les devis de l'agence incluent la responsabilité civile exigée par la loi grecque, normalement avec une assurance collision (CDW) à franchise : le montant exact de la franchise et les conditions sont confirmés au devis. La couverture complète sans franchise ou presque est disponible pour un supplément journalier. Demandez-la dans les notes si vous voulez qu'elle soit chiffrée."
      },
      {
        "q": "Puis-je prendre la voiture à l'aéroport ?",
        "a": "Oui. La prise et la restitution à l'aéroport de La Canée sont courantes, et l'agence couvre aussi l'aéroport d'Héraklion, les ports et Réthymnon : indiquez votre numéro de vol dans le formulaire et l'agence suit les retards. La prise en ville ou à votre hébergement est généralement possible aussi."
      }
    ],
    "breadcrumbHome": "Accueil",
    "breadcrumbCarRental": "Louer une voiture"
  },
  "de": {
    "h1": "Mietwagen auf Kreta",
    "intro": "Dieses Formular sendet Ihre Anfrage an eine lokale Mietwagenagentur, mit der wir wirklich zusammenarbeiten: Auto Smart Car Rental in Chania, klar gekennzeichnet, nichts versteckt. Die Agentur antwortet Ihnen direkt mit einem Angebot; Sie zahlen an die Agentur, gern vor Ort, Barzahlung möglich, keine Online-Vorauszahlung. Wir erhalten von der Agentur eine Provision, wenn eine Vermietung zustande kommt — der Preis, den Sie zahlen, ändert sich dadurch nicht.",
    "drivingTitle": "Autofahren auf Kreta: das sollten Sie vorher wissen",
    "driving": [
      {
        "h": "Führerschein und Papiere",
        "p": "Ein Führerschein aus der EU oder dem EWR genügt. Wurde Ihr Führerschein außerhalb der EU/des EWR ausgestellt, können griechische Agenturen und die Polizei zusätzlich einen Internationalen Führerschein (IDP) verlangen — besorgen Sie ihn vor der Reise, in Griechenland wird er nicht ausgestellt. Die meisten Agenturen verlangen ein Mindestalter von 21 bis 23 Jahren und mindestens ein Jahr Fahrpraxis."
      },
      {
        "h": "Versicherung, verständlich erklärt",
        "p": "Angebote enthalten üblicherweise die gesetzliche Haftpflicht und eine Vollkaskoversicherung (CDW) mit Selbstbeteiligung: Bei einem Schaden zahlen Sie höchstens die Selbstbeteiligung, nicht die ganze Reparatur. Der Vollschutz senkt die Selbstbeteiligung für ein paar Euro mehr pro Tag auf null oder fast null. Lesen Sie, was ausgeschlossen ist — Reifen, Unterboden, Spiegel und Schotterpisten oft — und fragen Sie die Agentur direkt, sie antwortet."
      },
      {
        "h": "Bergstraßen und Ziegen",
        "p": "Kretas Landesinneres ist Serpentinenland: schmale Fahrbahnen, unübersichtliche Kurven und Ziegen, die den Asphalt als ihr Revier betrachten. Hupen Sie kurz vor engen, unübersichtlichen Kurven, lassen Sie Einheimische vorbei und tanken Sie, bevor es in die Berge geht — südlich der Hauptstraße werden Tankstellen rar. Ein kleines Auto ist in Dorfgassen wirklich leichter zu bewegen als ein großer SUV."
      },
      {
        "h": "Parken in den Altstädten",
        "p": "Die Altstädte von Chania, Rethymno und Heraklion sind weitgehend Fußgängerzonen oder Anwohnern vorbehalten. Versuchen Sie nicht, dort zu parken: Nutzen Sie die ausgeschilderten Parkplätze und freien Zonen am Rand und gehen Sie zu Fuß hinein — höchstens zehn Minuten. Blaue Linien bedeuten gebührenpflichtig, gelbe Parkverbot, weiße kostenlos."
      }
    ],
    "faqTitle": "Fragen, die wirklich gestellt werden",
    "faq": [
      {
        "q": "Muss ich online vorauszahlen?",
        "a": "Nein. Dieses Formular sendet nur Ihre Anfrage an die lokale Agentur. Sie antwortet mit einem Angebot und Sie bestätigen direkt mit ihr — keine Online-Zahlung auf dieser Seite, keine Karte nötig, um anzufragen."
      },
      {
        "q": "Kann ich bar bezahlen?",
        "a": "Ja. Die Partneragentur akzeptiert Bargeld ebenso wie Karten. Sie zahlen bei der Abholung des Wagens oder wie mit der Agentur vereinbart; in der Regel fällt eine erstattungsfähige Kaution an, deren genaue Höhe im Angebot bestätigt wird."
      },
      {
        "q": "Welche Versicherung ist enthalten?",
        "a": "Die Angebote der Agentur enthalten die nach griechischem Recht vorgeschriebene Haftpflicht, üblicherweise mit einer Kaskoversicherung (CDW) mit Selbstbeteiligung: die genaue Höhe und die Bedingungen werden im Angebot bestätigt. Vollschutz ohne oder mit minimaler Selbstbeteiligung gibt es gegen einen täglichen Aufpreis. Erwähnen Sie es im Anfragefeld, wenn Sie ein Angebot dafür möchten."
      },
      {
        "q": "Kann ich das Auto am Flughafen abholen?",
        "a": "Ja. Abholung und Rückgabe am Flughafen Chania sind Standard, und die Agentur deckt auch den Flughafen Heraklion, die Häfen und Rethymno ab: tragen Sie Ihre Flugnummer in das Formular ein, die Agentur verfolgt Verspätungen. Abholung in der Stadt oder an Ihrer Unterkunft ist in der Regel ebenfalls möglich."
      }
    ],
    "breadcrumbHome": "Startseite",
    "breadcrumbCarRental": "Mietwagen"
  },
  "el": {
    "h1": "Ενοικίαση αυτοκινήτου στην Κρήτη",
    "intro": "Αυτή η φόρμα στέλνει το αίτημά σας σε ένα τοπικό γραφείο ενοικίασης με το οποίο πραγματικά συνεργαζόμαστε: το Auto Smart Car Rental στα Χανιά, με σαφή επισήμανση, τίποτα κρυφό. Το γραφείο σας απαντά απευθείας με προσφορά· πληρώνετε το γραφείο, και επί τόπου αν θέλετε, δεκτά μετρητά, καμία online προπληρωμή. Λαμβάνουμε προμήθεια από το γραφείο όταν γίνει μια ενοικίαση — η τιμή που πληρώνετε δεν αλλάζει εξαιτίας αυτού.",
    "drivingTitle": "Οδήγηση στην Κρήτη: τι να ξέρετε πριν κλείσετε",
    "driving": [
      {
        "h": "Δίπλωμα και χαρτιά",
        "p": "Ένα δίπλωμα οδήγησης ΕΕ ή ΕΟΧ αρκεί. Αν το δίπλωμά σας εκδόθηκε εκτός ΕΕ/ΕΟΧ, τα ελληνικά γραφεία και η αστυνομία μπορούν να ζητήσουν Διεθνή Άδεια Οδήγησης (IDP) μαζί με το εθνικό σας δίπλωμα — βγάλτε την πριν ταξιδέψετε, δεν εκδίδεται στην Ελλάδα. Τα περισσότερα γραφεία ζητούν ελάχιστη ηλικία 21 έως 23 ετών και τουλάχιστον έναν χρόνο οδηγικής εμπειρίας."
      },
      {
        "h": "Η ασφάλεια, με απλά λόγια",
        "p": "Οι προσφορές περιλαμβάνουν συνήθως την υποχρεωτική αστική ευθύνη και μικτή ασφάλεια (CDW) με απαλλαγή: σε περίπτωση ζημιάς πληρώνετε έως το ποσό της απαλλαγής, όχι όλη την επισκευή. Η πλήρης κάλυψη μηδενίζει ή σχεδόν μηδενίζει την απαλλαγή για λίγα ευρώ παραπάνω την ημέρα. Διαβάστε τι εξαιρείται — συχνά ελαστικά, κάτω μέρος, καθρέφτες και χωματόδρομοι — και ρωτήστε το γραφείο απευθείας, απαντούν."
      },
      {
        "h": "Ορεινοί δρόμοι και κατσίκες",
        "p": "Η ενδοχώρα της Κρήτης είναι χώρα φουρκετών: στενές λωρίδες, τυφλές στροφές και κατσίκες που θεωρούν την άσφαλτο δική τους. Κορνάρετε σύντομα πριν από κλειστές τυφλές στροφές, αφήστε τους ντόπιους να περάσουν και βάλτε καύσιμα πριν ανεβείτε στα βουνά — τα βενζινάδικα αραιώνουν νότια του κεντρικού άξονα. Ένα μικρό αυτοκίνητο είναι ειλικρινά πιο εύκολο στα σοκάκια των χωριών από ένα μεγάλο SUV."
      },
      {
        "h": "Παρκάρισμα στις παλιές πόλεις",
        "p": "Οι παλιές πόλεις των Χανίων, του Ρεθύμνου και του Ηρακλείου είναι σε μεγάλο βαθμό πεζόδρομοι ή μόνο για κατοίκους. Μην προσπαθήσετε να παρκάρετε μέσα: χρησιμοποιήστε τα σηματοδοτημένα πληρωμένα πάρκινγκ και τις δωρεάν ζώνες στις παρυφές και περπατήστε — δέκα λεπτά το πολύ. Μπλε γραμμές σημαίνουν πληρωμένη στάθμευση, κίτρινες απαγόρευση, λευκές δωρεάν."
      }
    ],
    "faqTitle": "Ερωτήσεις που πραγματικά γίνονται",
    "faq": [
      {
        "q": "Πρέπει να προπληρώσω online;",
        "a": "Όχι. Αυτή η φόρμα στέλνει μόνο το αίτημά σας στο τοπικό γραφείο. Σας απαντά με προσφορά και επιβεβαιώνετε απευθείας μαζί του — καμία online πληρωμή σε αυτήν τη σελίδα, δεν χρειάζεται κάρτα για να ρωτήσετε."
      },
      {
        "q": "Μπορώ να πληρώσω με μετρητά;",
        "a": "Ναι. Το συνεργαζόμενο γραφείο δέχεται μετρητά όπως και κάρτες. Πληρώνετε κατά την παραλαβή του αυτοκινήτου ή όπως συμφωνήσετε με το γραφείο· συνήθως ισχύει επιστρεφόμενη εγγύηση, με το ακριβές ποσό να επιβεβαιώνεται στην προσφορά."
      },
      {
        "q": "Ποια ασφάλεια περιλαμβάνεται;",
        "a": "Οι προσφορές του γραφείου περιλαμβάνουν την αστική ευθύνη που απαιτεί ο ελληνικός νόμος, συνήθως με μικτή ασφάλεια (CDW) με απαλλαγή: το ακριβές ποσό της απαλλαγής και οι όροι επιβεβαιώνονται στην προσφορά. Πλήρης κάλυψη με μηδενική ή σχεδόν μηδενική απαλλαγή διατίθεται με μικρή ημερήσια επιβάρυνση. Ζητήστε την στις σημειώσεις του αιτήματος αν θέλετε να τιμολογηθεί."
      },
      {
        "q": "Μπορώ να παραλάβω το αυτοκίνητο στο αεροδρόμιο;",
        "a": "Ναι. Η παραλαβή και επιστροφή στο αεροδρόμιο των Χανίων είναι στάνταρ, και το γραφείο καλύπτει επίσης το αεροδρόμιο του Ηρακλείου, τα λιμάνια και το Ρέθυμνο: προσθέστε τον αριθμό πτήσης σας στη φόρμα και το γραφείο παρακολουθεί τις καθυστερήσεις. Παραλαβή στην πόλη ή στο κατάλυμά σας είναι συνήθως δυνατή επίσης."
      }
    ],
    "breadcrumbHome": "Αρχική",
    "breadcrumbCarRental": "Ενοικίαση αυτοκινήτου"
  },
  "it": {
    "h1": "Noleggia un'auto a Creta",
    "intro": "Questo modulo invia la tua richiesta a un'agenzia di noleggio locale con cui lavoriamo davvero: Auto Smart Car Rental a Chania, indicata chiaramente, senza nulla di nascosto. L'agenzia risponde direttamente con un preventivo; paghi loro, anche sul posto se preferisci, contanti accettati, nessun pagamento online anticipato. Riceviamo una commissione dall'agenzia quando un affitto va a buon fine — il prezzo che pagate non cambia per questo.",
    "drivingTitle": "Guidare a Creta: cosa sapere prima di prenotare",
    "driving": [
      {
        "h": "Patente e documenti",
        "p": "Una patente di guida dell'UE o dello SEE è tutto ciò che ti serve. Se la tua patente è stata rilasciata fuori dall'UE/SEE, le agenzie greche e la polizia possono richiedere un permesso di guida internazionale (IDP) insieme alla patente nazionale: procuralo prima di partire, perché non può essere rilasciato in Grecia. La maggior parte delle agenzie richiede un'età minima compresa tra 21 e 23 anni e almeno un anno di esperienza di guida."
      },
      {
        "h": "L'assicurazione, in parole semplici",
        "p": "I preventivi di solito includono la responsabilità civile verso terzi prevista dalla legge e una copertura per i danni da collisione (CDW) con una franchigia: se l'auto subisce danni, paghi fino all'importo della franchigia, non l'intera riparazione. La copertura completa riduce la franchigia a zero o quasi zero per pochi euro in più al giorno. Leggi cosa è escluso — spesso lo sono pneumatici, sottoscocca, specchietti e strade sterrate — e chiedi direttamente all'agenzia, perché rispondono."
      },
      {
        "h": "Strade di montagna e capre",
        "p": "L'entroterra di Creta è terra di tornanti: strade strette, curve cieche e capre che considerano l'asfalto cosa loro. Suona brevemente il clacson prima delle curve cieche più strette, lascia passare la gente del posto e fai il pieno prima di salire in montagna — i distributori di benzina si fanno rari a sud della strada principale. Un'auto piccola è davvero più comoda nelle vie dei paesi rispetto a un grande SUV."
      },
      {
        "h": "Parcheggio nei centri storici",
        "p": "I centri storici di Chania, Rethymno e Heraklion sono in gran parte pedonali o riservati ai residenti. Non provare a parcheggiare al loro interno: usa i parcheggi a pagamento segnalati e le zone gratuite lungo i bordi e prosegui a piedi — sono dieci minuti al massimo. Le linee blu indicano parcheggio a pagamento, quelle gialle divieto di sosta, quelle bianche parcheggio gratuito."
      }
    ],
    "faqTitle": "Le domande che la gente fa davvero",
    "faq": [
      {
        "q": "Devo pagare anticipatamente online?",
        "a": "No. Questo modulo si limita a inviare la tua richiesta all'agenzia locale. Loro rispondono con un preventivo e confermi direttamente con loro — su questa pagina non c'è alcun pagamento online, non serve nessuna carta per chiedere."
      },
      {
        "q": "Posso pagare in contanti?",
        "a": "Sì. L'agenzia partner accetta sia contanti che carte. Paghi al momento del ritiro dell'auto o come concordato con l'agenzia; di solito è previsto un deposito cauzionale rimborsabile, il cui importo esatto viene confermato nel preventivo."
      },
      {
        "q": "Quale assicurazione è inclusa?",
        "a": "I preventivi dell'agenzia includono la responsabilità civile verso terzi come richiesto dalla legge greca, normalmente con una copertura per i danni da collisione (CDW) e una franchigia sui danni: l'importo esatto della franchigia e le condizioni vengono confermati nel preventivo. La copertura completa con franchigia zero o quasi zero è disponibile per un supplemento giornaliero. Richiedila nelle note della richiesta se vuoi che ti venga quotata."
      },
      {
        "q": "Posso ritirare l'auto in aeroporto?",
        "a": "Sì. Il ritiro e la riconsegna all'aeroporto di Chania sono standard, e l'agenzia copre anche l'aeroporto di Heraklion, i porti e Rethymno: aggiungi il numero del tuo volo nel modulo e l'agenzia monitora eventuali ritardi. Di solito è possibile anche il ritiro in città o presso il tuo alloggio."
      }
    ],
    "breadcrumbHome": "Home",
    "breadcrumbCarRental": "Noleggia un'auto"
  },
  "nl": {
    "h1": "Auto huren op Kreta",
    "intro": "Dit formulier stuurt je aanvraag naar een lokaal verhuurbedrijf waar we echt mee samenwerken: Auto Smart Car Rental in Chania, duidelijk vermeld, niets verborgen. Het verhuurbedrijf reageert rechtstreeks met een offerte; je betaalt aan hen, desnoods ter plekke, contant mag, geen vooruitbetaling online. Wij ontvangen een commissie van het bureau wanneer een verhuur tot stand komt — de prijs die u betaalt verandert daardoor niet.",
    "drivingTitle": "Rijden op Kreta: wat je moet weten voordat je boekt",
    "driving": [
      {
        "h": "Rijbewijs en papieren",
        "p": "Een rijbewijs uit de EU of EER is alles wat je nodig hebt. Is je rijbewijs buiten de EU/EER afgegeven, dan kunnen Griekse verhuurbedrijven en de politie naast je nationale rijbewijs om een internationaal rijbewijs (IDP) vragen — regel dat voordat je vertrekt, want in Griekenland wordt het niet afgegeven. De meeste verhuurbedrijven vragen een minimumleeftijd van 21 tot 23 jaar en minstens een jaar rijervaring."
      },
      {
        "h": "Verzekering, in gewone taal",
        "p": "Offertes bevatten normaal de wettelijke aansprakelijkheidsverzekering en een collision damage waiver (CDW) met een eigen risico: bij schade aan de auto betaal je tot het bedrag van dat eigen risico, niet de volledige reparatie. Volledige dekking verlaagt het eigen risico naar nul of bijna nul voor een paar euro per dag extra. Lees wat is uitgesloten — banden, onderkant, spiegels en onverharde wegen vallen er vaak buiten — en vraag het rechtstreeks aan het verhuurbedrijf, ze geven antwoord."
      },
      {
        "h": "Bergwegen en geiten",
        "p": "Het binnenland van Kreta is haarspeldbochtenland: smalle wegen, blinde bochten en geiten die het asfalt als hun terrein beschouwen. Toeter kort voor krappe blinde bochten, laat de locals passeren en tank bij voordat je de bergen in gaat — ten zuiden van de hoofdweg worden de benzinestations schaars. Een kleine auto is op de dorpsstraatjes echt makkelijker dan een grote SUV."
      },
      {
        "h": "Parkeren in de oude steden",
        "p": "De oude steden van Chania, Rethymno en Heraklion zijn grotendeels autovrij of alleen voor bewoners. Probeer er niet binnenin te parkeren: gebruik de bewegwijzerde betaalde parkeerplaatsen en gratis zones aan de rand en loop naar binnen — dat is hooguit tien minuten. Blauwe lijnen betekenen betaald parkeren, geel betekent parkeerverbod, wit is gratis."
      }
    ],
    "faqTitle": "Vragen die mensen echt stellen",
    "faq": [
      {
        "q": "Moet ik online vooruitbetalen?",
        "a": "Nee. Dit formulier stuurt enkel je aanvraag naar het lokale verhuurbedrijf. Zij reageren met een offerte en je bevestigt rechtstreeks met hen — op deze pagina is er geen online betaling, en je hebt geen kaart nodig om aan te vragen."
      },
      {
        "q": "Kan ik contant betalen?",
        "a": "Ja. Het partnerverhuurbedrijf accepteert zowel contant als kaart. Je betaalt bij het ophalen van de auto of zoals afgesproken met het verhuurbedrijf; meestal geldt een terugbetaalbare borg, waarvan het exacte bedrag in de offerte staat."
      },
      {
        "q": "Welke verzekering is inbegrepen?",
        "a": "Offertes van het verhuurbedrijf bevatten de aansprakelijkheidsverzekering zoals de Griekse wet vereist, normaal met een collision damage waiver (CDW) en een eigen risico voor schade: het exacte bedrag van het eigen risico en de voorwaarden staan in de offerte. Volledige dekking met nul of bijna nul eigen risico is beschikbaar voor een dagelijkse meerprijs. Vraag erom in de opmerkingen bij je aanvraag als je het in de offerte wilt zien."
      },
      {
        "q": "Kan ik de auto op de luchthaven ophalen?",
        "a": "Ja. Ophalen en inleveren op de luchthaven van Chania is standaard, en het verhuurbedrijf bedient ook de luchthaven van Heraklion, de havens en Rethymno: vermeld je vluchtnummer in het formulier, dan houdt het verhuurbedrijf vertragingen in de gaten. Ophalen in de stad of bij je accommodatie is meestal ook mogelijk."
      }
    ],
    "breadcrumbHome": "Home",
    "breadcrumbCarRental": "Auto huren"
  },
  "pl": {
    "h1": "Wynajem samochodu na Krecie",
    "intro": "Ten formularz wysyła Twoje zapytanie do lokalnej wypożyczalni, z którą naprawdę współpracujemy: Auto Smart Car Rental w Chanii, wyraźnie oznaczonej, bez niczego ukrytego. Wypożyczalnia odpowiada bezpośrednio z wyceną; płacisz jej, jeśli chcesz to na miejscu, gotówka akceptowana, bez przedpłaty online. Otrzymujemy prowizję od agencji, gdy dojdzie do wynajmu — cena, którą płacisz, nie zmienia się z tego powodu.",
    "drivingTitle": "Prowadzenie na Krecie: co warto wiedzieć przed rezerwacją",
    "driving": [
      {
        "h": "Prawo jazdy i dokumenty",
        "p": "Prawo jazdy z UE lub EOG to wszystko, czego potrzebujesz. Jeśli Twoje prawo jazdy zostało wydane poza UE/EOG, greckie wypożyczalnie i policja mogą poprosić o międzynarodowe prawo jazdy (IDP) oprócz krajowego dokumentu — wyrób je przed wyjazdem, bo w Grecji nie da się go uzyskać. Większość wypożyczalni wymaga wieku minimum od 21 do 23 lat i co najmniej roku doświadczenia za kierownicą."
      },
      {
        "h": "Ubezpieczenie, prosto i jasno",
        "p": "Wyceny zazwyczaj obejmują obowiązkowe ubezpieczenie OC oraz ograniczenie odpowiedzialności za szkody (CDW) z udziałem własnym: jeśli samochód zostanie uszkodzony, płacisz do wysokości tego udziału własnego, a nie za całą naprawę. Pełne ubezpieczenie obniża udział własny do zera lub niemal zera za kilka euro dziennie więcej. Przeczytaj, co jest wyłączone — opony, podwozie, lusterka i drogi gruntowe często są — i zapytaj wypożyczalnię wprost, oni odpowiadają."
      },
      {
        "h": "Górskie drogi i kozy",
        "p": "Wnętrze Krety to kraina serpentyn: wąskie drogi, zakręty bez widoczności i kozy, które uważają asfalt za swój. Zatrąb krótko przed ciasnymi zakrętami bez widoczności, przepuszczaj miejscowych i zatankuj przed wjazdem w góry — stacje paliw rzedną na południe od głównej drogi. Mały samochód jest naprawdę wygodniejszy na uliczkach wiosek niż duży SUV."
      },
      {
        "h": "Parkowanie w starych miastach",
        "p": "Stare miasta Chanii, Rethymno i Heraklionu są w dużej mierze strefą tylko dla pieszych lub dla mieszkańców. Nie próbuj parkować w ich wnętrzu: korzystaj z oznaczonych płatnych parkingów i bezpłatnych stref na obrzeżach i wejdź pieszo — to najwyżej dziesięć minut. Niebieskie linie oznaczają parkowanie płatne, żółte zakaz parkowania, białe parkowanie bezpłatne."
      }
    ],
    "faqTitle": "Pytania, które ludzie naprawdę zadają",
    "faq": [
      {
        "q": "Czy muszę zapłacić z góry online?",
        "a": "Nie. Ten formularz wysyła tylko Twoje zapytanie do lokalnej wypożyczalni. Odpowiada ona z wyceną, a Ty potwierdzasz bezpośrednio z nią — na tej stronie nie ma płatności online, nie potrzebujesz karty, żeby zapytać."
      },
      {
        "q": "Czy mogę zapłacić gotówką?",
        "a": "Tak. Współpracująca wypożyczalnia akceptuje zarówno gotówkę, jak i karty. Płacisz przy odbiorze samochodu lub zgodnie z ustaleniami z wypożyczalnią; zazwyczaj obowiązuje zwrotna kaucja, której dokładna kwota jest potwierdzona w wycenie."
      },
      {
        "q": "Jakie ubezpieczenie jest wliczone?",
        "a": "Wyceny od wypożyczalni obejmują ubezpieczenie OC wymagane greckim prawem, zazwyczaj z ograniczeniem odpowiedzialności za szkody (CDW) i udziałem własnym: dokładna kwota udziału własnego oraz warunki są potwierdzone w wycenie. Pełne ubezpieczenie z zerowym lub niemal zerowym udziałem własnym jest dostępne za dodatkową opłatą dzienną. Poproś o nie w uwagach do zapytania, jeśli chcesz mieć je w wycenie."
      },
      {
        "q": "Czy mogę odebrać samochód na lotnisku?",
        "a": "Tak. Odbiór i zwrot na lotnisku w Chanii to standard, a wypożyczalnia obsługuje też lotnisko w Heraklionie, porty oraz Rethymno: dodaj numer lotu w formularzu, a firma śledzi opóźnienia. Odbiór w mieście lub w miejscu zakwaterowania zazwyczaj również jest możliwy."
      }
    ],
    "breadcrumbHome": "Strona główna",
    "breadcrumbCarRental": "Wynajem samochodu"
  },
  "es": {
    "h1": "Alquilar un coche en Creta",
    "intro": "Este formulario envía tu solicitud a una agencia de alquiler local con la que trabajamos de verdad: Auto Smart Car Rental en Chania, claramente identificada, sin nada oculto. La agencia responde directamente con un presupuesto; les pagas a ellos, sobre la marcha si quieres, se acepta efectivo, sin pago en línea por adelantado. Recibimos una comisión de la agencia cuando se concreta un alquiler — el precio que usted paga no cambia por ello.",
    "drivingTitle": "Conducir en Creta: lo que conviene saber antes de reservar",
    "driving": [
      {
        "h": "Carné y documentación",
        "p": "Con un carné de conducir de la UE o del EEE es suficiente. Si tu carné se expidió fuera de la UE/EEE, las agencias griegas y la policía pueden pedirte un permiso internacional de conducción (IDP) junto con tu carné nacional; consíguelo antes de viajar, ya que no se puede expedir en Grecia. La mayoría de las agencias exigen una edad mínima de 21 a 23 años y al menos un año de experiencia al volante."
      },
      {
        "h": "El seguro, explicado con claridad",
        "p": "Los presupuestos suelen incluir la responsabilidad civil obligatoria frente a terceros y una cobertura por daños por colisión (CDW) con una franquicia: si el coche sufre daños, pagas hasta el importe de esa franquicia, no la reparación completa. La cobertura total reduce la franquicia a cero o casi cero por unos pocos euros más al día. Lee qué queda excluido —los neumáticos, los bajos, los retrovisores y los caminos de tierra suelen estarlo— y pregunta directamente a la agencia, que te responde."
      },
      {
        "h": "Carreteras de montaña y cabras",
        "p": "El interior de Creta es territorio de curvas cerradas: carriles estrechos, curvas sin visibilidad y cabras que consideran que el asfalto es suyo. Toca brevemente el claxon antes de las curvas ciegas más cerradas, deja pasar a la gente del lugar y llena el depósito antes de adentrarte en las montañas: las gasolineras escasean al sur de la carretera principal. Un coche pequeño es realmente más cómodo por las calles de los pueblos que un SUV grande."
      },
      {
        "h": "Aparcar en los cascos antiguos",
        "p": "Los cascos antiguos de Chania, Rethymno y Heraklion son en gran parte peatonales o solo para residentes. No intentes aparcar dentro: usa los aparcamientos de pago señalizados y las zonas gratuitas de los alrededores y entra a pie; son diez minutos como mucho. Las líneas azules significan aparcamiento de pago, las amarillas prohíben aparcar y las blancas son gratuitas."
      }
    ],
    "faqTitle": "Preguntas que la gente hace de verdad",
    "faq": [
      {
        "q": "¿Tengo que pagar por adelantado en línea?",
        "a": "No. Este formulario solo envía tu solicitud a la agencia local. Ellos responden con un presupuesto y tú lo confirmas directamente con ellos: en esta página no hay ningún pago en línea ni hace falta tarjeta para preguntar."
      },
      {
        "q": "¿Puedo pagar en efectivo?",
        "a": "Sí. La agencia colaboradora acepta efectivo además de tarjetas. Pagas al recoger el coche o según lo acordado con la agencia; normalmente se aplica un depósito de garantía reembolsable, cuyo importe exacto se confirma en el presupuesto."
      },
      {
        "q": "¿Qué seguro está incluido?",
        "a": "Los presupuestos de la agencia incluyen la responsabilidad civil frente a terceros que exige la ley griega, normalmente con una cobertura por daños por colisión (CDW) y una franquicia por daños: el importe exacto de la franquicia y las condiciones se confirman en el presupuesto. La cobertura total con franquicia cero o casi cero está disponible por un suplemento diario. Pídela en las notas de la solicitud si quieres que te la incluyan en el presupuesto."
      },
      {
        "q": "¿Puedo recoger el coche en el aeropuerto?",
        "a": "Sí. La recogida y la devolución en el aeropuerto de Chania son habituales, y la agencia también cubre el aeropuerto de Heraklion, los puertos y Rethymno: añade tu número de vuelo en el formulario y la agencia hace seguimiento de los retrasos. La recogida en la ciudad o en tu alojamiento suele ser posible también."
      }
    ],
    "breadcrumbHome": "Inicio",
    "breadcrumbCarRental": "Alquilar un coche"
  },
  "pt": {
    "h1": "Alugar um carro em Creta",
    "intro": "Este formulário envia o seu pedido a uma agência de aluguer local com a qual realmente trabalhamos: a Auto Smart Car Rental, em Chania, claramente identificada, sem nada escondido. A agência responde diretamente com um orçamento; paga-lhe a ela, no momento se assim preferir, dinheiro aceite, sem pré-pagamento online. Recebemos uma comissão da agência quando um aluguer se concretiza — o preço que paga não muda por causa disso.",
    "drivingTitle": "Conduzir em Creta: o que saber antes de reservar",
    "driving": [
      {
        "h": "Carta de condução e documentação",
        "p": "Uma carta de condução da UE ou do EEE é tudo o que precisa. Se a sua carta foi emitida fora da UE/EEE, as agências e a polícia gregas podem pedir uma Licença Internacional de Condução (IDP) juntamente com a carta nacional — obtenha-a antes de viajar, pois não pode ser emitida na Grécia. A maioria das agências exige uma idade mínima de 21 a 23 anos e pelo menos um ano de experiência de condução."
      },
      {
        "h": "O seguro, em palavras simples",
        "p": "Os orçamentos incluem normalmente a responsabilidade civil obrigatória perante terceiros e uma cobertura de danos por colisão (CDW) com uma franquia: se o carro sofrer danos, paga até ao valor dessa franquia, e não a totalidade da reparação. A cobertura completa reduz a franquia a zero, ou perto de zero, por mais alguns euros por dia. Leia o que está excluído — pneus, parte inferior do chassis, retrovisores e estradas de terra costumam estar — e pergunte diretamente à agência, que responde."
      },
      {
        "h": "Estradas de montanha e cabras",
        "p": "O interior de Creta é território de curvas apertadas: faixas estreitas, curvas sem visibilidade e cabras que consideram o asfalto delas. Buzine brevemente antes das curvas cegas e apertadas, deixe os locais passar e abasteça antes de subir à montanha — as bombas de gasolina escasseiam a sul da estrada principal. Um carro pequeno é genuinamente mais fácil nas ruas das aldeias do que um SUV grande."
      },
      {
        "h": "Estacionamento nos centros históricos",
        "p": "Os centros históricos de Chania, Rethymno e Heraklion são em grande parte pedonais ou reservados a residentes. Não tente estacionar lá dentro: use os parques pagos sinalizados e as zonas gratuitas nas imediações e entre a pé — são dez minutos no máximo. As linhas azuis significam estacionamento pago, as amarelas significam proibido estacionar, as brancas são gratuitas."
      }
    ],
    "faqTitle": "Perguntas que as pessoas realmente fazem",
    "faq": [
      {
        "q": "Tenho de pagar online antecipadamente?",
        "a": "Não. Este formulário apenas envia o seu pedido à agência local. A agência responde com um orçamento e confirma diretamente com ela — não há pagamento online nesta página, nem é necessário cartão para perguntar."
      },
      {
        "q": "Posso pagar em dinheiro?",
        "a": "Sim. A agência parceira aceita dinheiro além de cartões. Paga quando recolhe o carro ou conforme acordado com a agência; aplica-se habitualmente um depósito de garantia reembolsável, sendo o valor exato confirmado no orçamento."
      },
      {
        "q": "Que seguro está incluído?",
        "a": "Os orçamentos da agência incluem a responsabilidade civil perante terceiros conforme exigido pela lei grega, normalmente com uma cobertura de danos por colisão (CDW) e uma franquia de danos: o valor exato da franquia e as condições são confirmados no orçamento. A cobertura completa, com franquia zero ou perto de zero, está disponível por uma taxa diária adicional. Peça-a nas notas do pedido se a quiser orçamentada."
      },
      {
        "q": "Posso levantar o carro no aeroporto?",
        "a": "Sim. A recolha e a entrega no aeroporto de Chania são padrão, e a agência cobre também o aeroporto de Heraklion, os portos e Rethymno: indique o número do seu voo no formulário e a agência acompanha os atrasos. A recolha na cidade ou no seu alojamento costuma também ser possível."
      }
    ],
    "breadcrumbHome": "Início",
    "breadcrumbCarRental": "Alugar um carro"
  },
  "ru": {
    "h1": "Аренда авто на Крите",
    "intro": "Эта форма отправляет вашу заявку местному прокатному агентству, с которым мы действительно работаем: Auto Smart Car Rental в Ханье — всё открыто, ничего не скрыто. Агентство отвечает напрямую и присылает расчёт; вы платите ему, при желании сразу на месте, наличные принимаются, без онлайн-предоплаты. Мы получаем комиссию от агентства, когда аренда состоится, — цена, которую вы платите, от этого не меняется.",
    "drivingTitle": "Вождение на Крите: что нужно знать перед бронированием",
    "driving": [
      {
        "h": "Права и документы",
        "p": "Водительских прав ЕС или ЕЭЗ достаточно. Если права выданы за пределами ЕС/ЕЭЗ, греческие агентства и полиция могут запросить международное водительское удостоверение (IDP) вместе с национальными правами — оформите его до поездки, в Греции его не выдают. Большинство агентств требуют минимальный возраст от 21 до 23 лет и не менее одного года водительского стажа."
      },
      {
        "h": "Страховка простыми словами",
        "p": "Расчёт обычно включает обязательную страховку гражданской ответственности и покрытие ущерба при ДТП (CDW) с франшизой: если автомобиль повреждён, вы платите только до суммы франшизы, а не за весь ремонт. Полное покрытие снижает франшизу до нуля или почти до нуля всего за несколько евро в день. Прочитайте, что не покрывается — шины, днище, зеркала и грунтовые дороги часто в список исключений входят — и спросите агентство напрямую, они отвечают."
      },
      {
        "h": "Горные дороги и козы",
        "p": "Внутренняя часть Крита — это сплошные серпантины: узкие полосы, повороты без видимости и козы, которые считают асфальт своим. Перед крутыми поворотами с плохой видимостью коротко посигнальте, пропускайте местных и заправляйтесь перед выездом в горы — к югу от главной дороги заправки попадаются редко. На деревенских улочках маленькая машина действительно удобнее большого внедорожника."
      },
      {
        "h": "Парковка в старых городах",
        "p": "Старые города Ханьи, Ретимно и Ираклиона почти полностью пешеходные или открыты только для жителей. Не пытайтесь парковаться внутри: пользуйтесь обозначенными платными парковками и бесплатными зонами по краям и заходите пешком — это максимум десять минут. Синяя разметка означает платную парковку, жёлтая — стоянка запрещена, белая — бесплатно."
      }
    ],
    "faqTitle": "Вопросы, которые задают на самом деле",
    "faq": [
      {
        "q": "Нужно ли платить онлайн заранее?",
        "a": "Нет. Эта форма лишь отправляет вашу заявку местному агентству. Они присылают расчёт, и вы подтверждаете всё напрямую с ними — на этой странице нет онлайн-оплаты, и карта для заявки не нужна."
      },
      {
        "q": "Можно ли заплатить наличными?",
        "a": "Да. Агентство-партнёр принимает как наличные, так и карты. Вы платите при получении машины или по договорённости с агентством; обычно вносится возвратный залог, точная сумма которого указывается в расчёте."
      },
      {
        "q": "Какая страховка включена?",
        "a": "Расчёт от агентства включает страхование гражданской ответственности, как того требует греческое законодательство, обычно с покрытием ущерба при ДТП (CDW) и франшизой: точная сумма франшизы и условия указываются в расчёте. Полное покрытие с нулевой или почти нулевой франшизой доступно за дополнительную дневную плату. Укажите это в примечаниях к заявке, если хотите получить его в расчёте."
      },
      {
        "q": "Можно ли забрать машину в аэропорту?",
        "a": "Да. Встреча и возврат в аэропорту Ханьи — это стандарт, а ещё агентство работает с аэропортом Ираклиона, портами и Ретимно: укажите номер рейса в форме, и агентство отследит задержки. Подача в город или к месту проживания обычно тоже возможна."
      }
    ],
    "breadcrumbHome": "Главная",
    "breadcrumbCarRental": "Аренда авто"
  },
  "ja": {
    "h1": "クレタ島でレンタカーを借りる",
    "intro": "このフォームは、私たちが実際に提携している地元のレンタカー代理店、シャニア（Chania）の Auto Smart Car Rental にあなたのリクエストを送ります。代理店名は明記しており、隠しごとはありません。代理店が見積もりを添えて直接返信します。支払いは代理店へ、ご希望ならその場で、現金可、オンライン前払いはありません。 賃貸が成立すると、私たちは代理店から手数料を受け取ります。そのためにお客様が支払う料金が変わることはありません。",
    "drivingTitle": "クレタ島での運転：予約前に知っておきたいこと",
    "driving": [
      {
        "h": "免許と必要書類",
        "p": "EU または EEA の運転免許証があれば、それだけで大丈夫です。免許証が EU/EEA 域外で発行されたものなら、ギリシャの代理店や警察から、国の運転免許証に加えて国際運転免許証（IDP）の提示を求められることがあります。ギリシャでは発行できないため、出発前に取得しておいてください。多くの代理店では、最低年齢を 21〜23 歳とし、運転経験 1 年以上を条件としています。"
      },
      {
        "h": "保険について、わかりやすく",
        "p": "見積もりには通常、法律で定められた対人・対物賠償責任保険と、免責額（エクセス）付きの車両損害補償（CDW）が含まれます。車が損傷した場合、修理費の全額ではなく、この免責額までを負担します。1 日あたり数ユーロの追加で、フル補償にすれば免責額をゼロまたはほぼゼロに抑えられます。補償対象外の項目も確認してください。タイヤ、車体下部、ミラー、未舗装路はしばしば対象外です。気になる点は代理店に直接尋ねれば、きちんと答えてくれます。"
      },
      {
        "h": "山道とヤギ",
        "p": "クレタ島の内陸部はヘアピンカーブの連続です。狭い車線、見通しの悪いカーブ、そしてアスファルトを自分のものと心得たヤギたち。見通しの悪い急カーブの手前では軽くクラクションを鳴らし、地元の車には道を譲り、山へ入る前に給油を済ませておきましょう。幹線道路から南へ入ると、ガソリンスタンドはまばらになります。村の細い道では、大型 SUV より小型車のほうが本当に楽です。"
      },
      {
        "h": "旧市街での駐車",
        "p": "シャニア（Chania）、レティムノ（Rethymno）、イラクリオン（Heraklion）の旧市街は、その大部分が歩行者専用または住民専用です。中に駐車しようとせず、周辺の標識のある有料駐車場や無料エリアを利用して歩いて入りましょう。せいぜい 10 分ほどです。青い線は有料駐車、黄色は駐車禁止、白は無料を意味します。"
      }
    ],
    "faqTitle": "実際によく寄せられる質問",
    "faq": [
      {
        "q": "オンラインで前払いが必要ですか？",
        "a": "いいえ。このフォームはあなたのリクエストを地元の代理店に送るだけです。代理店が見積もりを返信し、あなたは代理店と直接やり取りして確定します。このページにオンライン決済はなく、問い合わせにカードは不要です。"
      },
      {
        "q": "現金で支払えますか？",
        "a": "はい。提携代理店はカードに加えて現金も受け付けています。支払いは車を受け取るとき、または代理店との取り決めに従って行います。通常、返金可能な保証金（デポジット）が必要で、正確な金額は見積もりに明記されます。"
      },
      {
        "q": "どんな保険が含まれていますか？",
        "a": "代理店の見積もりには、ギリシャの法律で義務付けられた対人・対物賠償責任保険が含まれ、通常は車両損害補償（CDW）と損害免責額（エクセス）が付いています。正確な免責額と条件は見積もりで確認されます。1 日あたりの追加料金で、免責額をゼロまたはほぼゼロにするフル補償も利用できます。希望する場合は、リクエストの備考欄に記入して見積もりに含めてもらってください。"
      },
      {
        "q": "空港で車を受け取れますか？",
        "a": "はい。シャニア（Chania）空港での受け取り・返却は標準対応で、代理店はイラクリオン（Heraklion）空港、各港、レティムノ（Rethymno）もカバーしています。フォームに便名を記入すれば、代理店が遅延を確認します。市内や宿泊先での受け取りも通常は可能です。"
      }
    ],
    "breadcrumbHome": "ホーム",
    "breadcrumbCarRental": "レンタカーを借りる"
  },
  "ko": {
    "h1": "크레타에서 렌터카 빌리기",
    "intro": "이 양식은 저희가 실제로 협력하는 현지 렌터카 업체로 요청을 전달합니다. 하니아(Chania)에 위치한 Auto Smart Car Rental이며, 정보를 명확히 밝히고 숨기는 것은 없습니다. 업체가 견적과 함께 직접 답변하며, 결제는 업체에 하시면 됩니다. 원하시면 현장에서 현금으로도 가능하고, 온라인 선결제는 없습니다. 임대가 성사되면 저희는 중개사로부터 수수료를 받습니다. 그렇다고 해서 고객님이 지불하는 가격이 달라지지는 않습니다.",
    "drivingTitle": "크레타에서 운전하기: 예약 전에 알아둘 것",
    "driving": [
      {
        "h": "운전면허와 서류",
        "p": "EU 또는 EEA 운전면허가 있으면 그것으로 충분합니다. 면허가 EU/EEA 외 지역에서 발급되었다면, 그리스 업체나 경찰이 자국 면허와 함께 국제운전면허증(IDP)을 요구할 수 있습니다. 출발 전에 미리 발급받으세요. 그리스에서는 발급되지 않습니다. 대부분의 업체는 최소 만 21세에서 23세 이상, 그리고 최소 1년의 운전 경력을 요구합니다."
      },
      {
        "h": "보험, 쉽게 풀어서",
        "p": "견적에는 보통 법적으로 의무인 대인·대물 배상책임보험과 자기부담금(면책금)이 있는 차량손해면책(CDW)이 포함됩니다. 차량이 손상되면 수리비 전액이 아니라 그 자기부담금 한도까지만 부담하면 됩니다. 완전 보장(풀 커버리지)을 선택하면 하루 몇 유로만 더 내고 자기부담금을 0 또는 거의 0에 가깝게 줄일 수 있습니다. 무엇이 보장에서 제외되는지 꼭 확인하세요. 타이어, 차량 하부, 사이드미러, 비포장도로는 제외되는 경우가 많습니다. 궁금한 점은 업체에 직접 물어보세요. 답해 줍니다."
      },
      {
        "h": "산길과 염소",
        "p": "크레타 내륙은 헤어핀 커브의 연속입니다. 좁은 차로, 시야가 막힌 코너, 그리고 아스팔트를 자기 것이라 여기는 염소들이 있습니다. 시야가 막힌 급커브 앞에서는 짧게 경적을 울리고, 현지인이 먼저 지나가도록 양보하고, 산으로 들어가기 전에 기름을 채워 두세요. 주요 도로 남쪽으로 가면 주유소가 드물어집니다. 마을 골목길에서는 큰 SUV보다 작은 차가 확실히 더 다니기 편합니다."
      },
      {
        "h": "구시가지 주차",
        "p": "하니아(Chania), 레팀노(Rethymno), 이라클리온(Heraklion)의 구시가지는 대부분 보행자 전용이거나 주민 전용입니다. 그 안에 주차하려 하지 마세요. 가장자리에 있는 표지가 된 유료 주차장과 무료 구역을 이용하고 걸어 들어가세요. 길어야 10분 거리입니다. 파란색 선은 유료 주차, 노란색은 주차 금지, 흰색은 무료를 뜻합니다."
      }
    ],
    "faqTitle": "사람들이 실제로 묻는 질문",
    "faq": [
      {
        "q": "온라인으로 미리 결제해야 하나요?",
        "a": "아니요. 이 양식은 현지 업체로 요청을 전달할 뿐입니다. 업체가 견적과 함께 답변하면 그쪽과 직접 확정하시면 됩니다. 이 페이지에서는 온라인 결제가 없고, 문의하는 데 카드도 필요하지 않습니다."
      },
      {
        "q": "현금으로 결제할 수 있나요?",
        "a": "네. 협력 업체는 카드뿐 아니라 현금도 받습니다. 차량을 픽업할 때 또는 업체와 합의한 대로 결제하시면 됩니다. 보통 환불 가능한 보증금이 있으며, 정확한 금액은 견적에서 확인됩니다."
      },
      {
        "q": "어떤 보험이 포함되나요?",
        "a": "업체 견적에는 그리스 법이 요구하는 대인·대물 배상책임보험이 포함되며, 보통 자기부담금이 있는 차량손해면책(CDW)도 함께 포함됩니다. 정확한 자기부담금 금액과 조건은 견적에서 확인됩니다. 자기부담금이 0이거나 거의 0에 가까운 완전 보장은 하루 추가 요금으로 이용할 수 있습니다. 원하시면 요청 메모에 적어 견적에 반영해 달라고 하세요."
      },
      {
        "q": "공항에서 차를 픽업할 수 있나요?",
        "a": "네. 하니아(Chania) 공항 픽업과 반납이 기본이며, 업체는 이라클리온(Heraklion) 공항, 항구, 레팀노(Rethymno)도 커버합니다. 양식에 항공편 번호를 적어 두면 업체가 지연 여부를 확인합니다. 시내나 숙소에서의 픽업도 보통 가능합니다."
      }
    ],
    "breadcrumbHome": "홈",
    "breadcrumbCarRental": "렌터카"
  },
  "zh": {
    "h1": "在克里特岛租车",
    "intro": "此表单会把您的需求发送给一家我们真正合作的本地车行：位于哈尼亚（Chania）的 Auto Smart Car Rental，名称清楚标明，没有任何隐瞒。车行会直接回复报价；您付款给他们，愿意的话可当场付清，接受现金，无需在线预付。 租赁达成时，我们会从中介机构获得一笔佣金——您支付的价格不会因此而改变。",
    "drivingTitle": "在克里特岛开车：预订前需要了解的事",
    "driving": [
      {
        "h": "驾照与证件",
        "p": "持有欧盟（EU）或欧洲经济区（EEA）驾照即可。如果您的驾照是在欧盟/欧洲经济区以外签发的，希腊车行和警察可能会要求您在本国驾照之外另出示国际驾驶许可（IDP）——请在出发前办好，希腊本地无法签发。多数车行要求驾驶人年龄不低于 21 至 23 岁，并有至少一年的驾驶经验。"
      },
      {
        "h": "保险，说人话",
        "p": "报价通常已包含法定的第三者责任险，以及一份带有自付额（免赔额）的碰撞损害免责（CDW）：如果车辆受损，您只需赔付到该自付额为止，而非全额维修费。每天多付几欧元，全额保险可把自付额降到零或接近零。请看清楚哪些不在保障范围内——轮胎、底盘、后视镜和土路通常被排除在外——有疑问就直接问车行，他们会回答。"
      },
      {
        "h": "山路与山羊",
        "p": "克里特岛内陆是发夹弯的天下：车道狭窄、弯道盲区多，还有把柏油路当成自家地盘的山羊。遇到狭窄的盲弯前先轻按几声喇叭，让本地车辆先行，进山前把油加满——主路以南的加油站会越来越稀少。在村庄街道上，一辆小车确实比大型 SUV 好开得多。"
      },
      {
        "h": "老城里的停车",
        "p": "哈尼亚（Chania）、雷西姆诺（Rethymno）和伊拉克利翁（Heraklion）的老城大多是步行区或仅限居民通行。不要试图把车开进去停：请使用老城外围有标识的付费停车场和免费区域，然后步行进去——最多十分钟。蓝线表示付费停车，黄线表示禁止停车，白线则是免费。"
      }
    ],
    "faqTitle": "大家真正会问的问题",
    "faq": [
      {
        "q": "我必须在线预付吗？",
        "a": "不需要。此表单只是把您的需求发送给本地车行。他们会回复报价，您再直接与他们确认——本页面没有任何在线付款，咨询也不需要银行卡。"
      },
      {
        "q": "我可以用现金付款吗？",
        "a": "可以。合作车行同时接受现金和银行卡。您在取车时付款，或按与车行约定的方式付款；通常会收取一笔可退还的押金，具体金额会在报价中确认。"
      },
      {
        "q": "包含哪些保险？",
        "a": "车行的报价已包含希腊法律要求的第三者责任险，通常还附带碰撞损害免责（CDW）和一份损害自付额：确切的自付额金额和条件会在报价中确认。每天加付一笔费用，即可获得自付额为零或接近零的全额保险。如需此项，请在需求备注中说明，以便一并报价。"
      },
      {
        "q": "我可以在机场取车吗？",
        "a": "可以。哈尼亚（Chania）机场取还车是标准服务，车行同时也覆盖伊拉克利翁（Heraklion）机场、各港口以及雷西姆诺（Rethymno）：请在表单中填写航班号，车行会追踪航班延误情况。通常也可在市区或您的住处取车。"
      }
    ],
    "breadcrumbHome": "首页",
    "breadcrumbCarRental": "租车"
  },
  "tr": {
    "h1": "Girit'te araba kiralayın",
    "intro": "Bu form talebinizi gerçekten birlikte çalıştığımız yerel bir kiralama acentesine iletir: Chania'daki Auto Smart Car Rental, açıkça belirtilmiş, gizli hiçbir şey yok. Acente size doğrudan bir fiyat teklifiyle yanıt verir; ödemeyi onlara yaparsınız, isterseniz yerinde, nakit kabul edilir, çevrimiçi ön ödeme yoktur. Bir kiralama gerçekleştiğinde acenteden komisyon alıyoruz — ödediğiniz fiyat bu yüzden değişmez.",
    "drivingTitle": "Girit'te araç kullanmak: rezervasyondan önce bilmeniz gerekenler",
    "driving": [
      {
        "h": "Ehliyet ve evraklar",
        "p": "AB veya AEA ehliyetiniz varsa başka bir şeye gerek yok. Ehliyetiniz AB/AEA dışında bir ülkede verildiyse, Yunan acenteleri ve polisi ulusal ehliyetinizin yanında bir Uluslararası Sürücü Belgesi (IDP) isteyebilir — uçağa binmeden önce alın, çünkü Yunanistan'da düzenlenemez. Çoğu acente en az 21 ila 23 yaş ve en az bir yıllık sürüş deneyimi ister."
      },
      {
        "h": "Sigorta, açık bir dille",
        "p": "Fiyat teklifleri genellikle yasal üçüncü şahıs mali sorumluluk sigortasını ve muafiyetli bir çarpışma hasar teminatını (CDW) içerir: araç hasar görürse, tüm onarımı değil, yalnızca o muafiyet tutarına kadar ödersiniz. Tam kapsamlı teminat, günde birkaç euro fazlasına muafiyeti sıfıra ya da neredeyse sıfıra indirir. Nelerin kapsam dışı olduğunu okuyun — lastikler, aracın alt kısmı, aynalar ve toprak yollar çoğunlukla kapsam dışıdır — ve doğrudan acenteye sorun, yanıt verirler."
      },
      {
        "h": "Dağ yolları ve keçiler",
        "p": "Girit'in iç bölgeleri keskin viraj diyarıdır: dar yollar, görüşün kapalı olduğu dönemeçler ve asfaltı kendilerinin sayan keçiler. Görüşün kapalı olduğu dar virajlardan önce kısaca korna çalın, yerlilerin geçmesine izin verin ve dağlara çıkmadan önce depoyu doldurun — ana yolun güneyinde benzin istasyonları seyrekleşir. Köy sokaklarında küçük bir araba, büyük bir SUV'a göre gerçekten daha kullanışlıdır."
      },
      {
        "h": "Eski şehirlerde park etmek",
        "p": "Chania, Rethymno ve Heraklion'un eski şehirleri büyük ölçüde yayalara veya yalnızca sakinlere ayrılmıştır. İçlerine park etmeye çalışmayın: kenarlardaki işaretli ücretli otoparkları ve ücretsiz bölgeleri kullanıp yürüyerek girin — en fazla on dakika sürer. Mavi çizgiler ücretli parkı, sarı park yasağını, beyaz ise ücretsizi gösterir."
      }
    ],
    "faqTitle": "İnsanların gerçekten sorduğu sorular",
    "faq": [
      {
        "q": "Çevrimiçi ön ödeme yapmak zorunda mıyım?",
        "a": "Hayır. Bu form yalnızca talebinizi yerel acenteye iletir. Onlar bir fiyat teklifiyle yanıt verir ve siz doğrudan onlarla onaylarsınız — bu sayfada çevrimiçi ödeme yoktur, talep etmek için kart gerekmez."
      },
      {
        "q": "Nakit ödeyebilir miyim?",
        "a": "Evet. Partner acente kartların yanı sıra nakit de kabul eder. Ödemeyi arabayı teslim alırken ya da acenteyle anlaştığınız şekilde yaparsınız; genellikle iade edilebilir bir güvence depozitosu uygulanır ve kesin tutar fiyat teklifinde belirtilir."
      },
      {
        "q": "Hangi sigorta dahil?",
        "a": "Acentenin fiyat teklifleri, Yunan yasalarının gerektirdiği üçüncü şahıs mali sorumluluk sigortasını içerir; genellikle bir çarpışma hasar teminatı (CDW) ve hasar muafiyeti ile birlikte: kesin muafiyet tutarı ve koşulları fiyat teklifinde belirtilir. Sıfır ya da neredeyse sıfır muafiyetli tam kapsamlı teminat, ek bir günlük ücret karşılığında mevcuttur. İsterseniz teklife dahil edilmesi için talep notlarında belirtin."
      },
      {
        "q": "Arabayı havalimanından teslim alabilir miyim?",
        "a": "Evet. Chania havalimanından teslim alma ve bırakma standarttır ve acente ayrıca Heraklion havalimanını, limanları ve Rethymno'yu da kapsar: forma uçuş numaranızı ekleyin, acente gecikmeleri takip eder. Şehirde ya da konakladığınız yerde teslim alma da genellikle mümkündür."
      }
    ],
    "breadcrumbHome": "Ana Sayfa",
    "breadcrumbCarRental": "Araba kirala"
  },
  "sv": {
    "h1": "Hyr bil på Kreta",
    "intro": "Det här formuläret skickar din förfrågan till en lokal biluthyrningsbyrå som vi faktiskt samarbetar med: Auto Smart Car Rental i Chania, tydligt angiven, inget dolt. Byrån svarar direkt med en offert; du betalar dem, på plats om du vill, kontanter accepteras, ingen förskottsbetalning online. Vi får en provision från byrån när en uthyrning blir av — priset du betalar ändras inte på grund av det.",
    "drivingTitle": "Köra bil på Kreta: vad du bör veta innan du bokar",
    "driving": [
      {
        "h": "Körkort och dokument",
        "p": "Ett körkort från EU eller EES är allt du behöver. Om ditt körkort är utfärdat utanför EU/EES kan grekiska byråer och polis be om ett internationellt körkort (IDP) tillsammans med ditt nationella körkort — skaffa det innan du reser, det kan inte utfärdas i Grekland. De flesta byråer kräver en lägsta ålder på 21 till 23 år och minst ett års körvana."
      },
      {
        "h": "Försäkring, klart och tydligt",
        "p": "Offerter innehåller normalt det lagstadgade trafikansvaret och en självriskreducering vid kollisionsskada (CDW) med en självrisk: om bilen skadas betalar du upp till självriskbeloppet, inte hela reparationen. Full täckning sänker självrisken till noll eller nära noll för några euro mer per dag. Läs vad som är undantaget — däck, underrede, speglar och grusvägar är ofta det — och fråga byrån direkt, de svarar."
      },
      {
        "h": "Bergsvägar och getter",
        "p": "Kretas inland är fullt av hårnålskurvor: smala körfält, skymd sikt och getter som anser att asfalten är deras. Tuta kort före trånga, skymda kurvor, släpp förbi de lokala och tanka innan du beger dig upp i bergen — bensinstationerna blir glesa söder om huvudvägen. En liten bil är ärligt talat lättare på byarnas gator än en stor SUV."
      },
      {
        "h": "Parkering i de gamla stadsdelarna",
        "p": "De gamla stadsdelarna i Chania, Rethymno och Heraklion är till stor del bilfria eller endast för boende. Försök inte parkera inne i dem: använd de skyltade avgiftsbelagda parkeringarna och de gratiszoner som finns runtomkring och gå in — det tar tio minuter som mest. Blå linjer betyder avgiftsbelagd parkering, gult betyder parkering förbjuden, vitt är gratis."
      }
    ],
    "faqTitle": "Frågor folk faktiskt ställer",
    "faq": [
      {
        "q": "Måste jag betala online i förväg?",
        "a": "Nej. Det här formuläret skickar bara din förfrågan till den lokala byrån. De svarar med en offert och du bekräftar direkt med dem — det finns ingen onlinebetalning på den här sidan, inget kort krävs för att fråga."
      },
      {
        "q": "Kan jag betala kontant?",
        "a": "Ja. Partnerbyrån tar emot både kontanter och kort. Du betalar när du hämtar bilen eller enligt överenskommelse med byrån; en återbetalningsbar deposition gäller vanligtvis, med exakt belopp bekräftat i offerten."
      },
      {
        "q": "Vilken försäkring ingår?",
        "a": "Byråns offerter innehåller trafikansvar enligt grekisk lag, normalt med en självriskreducering vid kollisionsskada (CDW) och en självrisk vid skada: det exakta självriskbeloppet och villkoren bekräftas i offerten. Full täckning med noll eller nära noll självrisk finns tillgänglig mot en extra daglig avgift. Be om den i förfrågans anteckningar om du vill ha den med i offerten."
      },
      {
        "q": "Kan jag hämta bilen på flygplatsen?",
        "a": "Ja. Hämtning och återlämning på Chanias flygplats är standard, och byrån täcker även Heraklions flygplats, hamnarna och Rethymno: lägg till ditt flightnummer i formuläret så håller byrån koll på förseningar. Hämtning i stan eller på ditt boende är vanligtvis också möjlig."
      }
    ],
    "breadcrumbHome": "Hem",
    "breadcrumbCarRental": "Hyr bil"
  },
  "da": {
    "h1": "Lej en bil på Kreta",
    "intro": "Denne formular sender din forespørgsel til et lokalt biludlejningsbureau, som vi faktisk samarbejder med: Auto Smart Car Rental i Chania, tydeligt angivet, intet skjult. Bureauet svarer dig direkte med et tilbud; du betaler dem, på stedet hvis du vil, kontanter accepteres, ingen forudbetaling online. Vi får en provision fra bureauet, når en udlejning bliver til noget — den pris, du betaler, ændrer sig ikke på grund af det.",
    "drivingTitle": "At køre på Kreta: hvad du bør vide, før du booker",
    "driving": [
      {
        "h": "Kørekort og papirer",
        "p": "Et EU- eller EØS-kørekort er alt, hvad du behøver. Hvis dit kørekort er udstedt uden for EU/EØS, kan græske bureauer og politiet bede om et internationalt kørekort (IDP) sammen med dit nationale kørekort — skaf et, før du flyver, det kan ikke udstedes i Grækenland. De fleste bureauer kræver en minimumsalder på 21 til 23 år og mindst ét års kørselserfaring."
      },
      {
        "h": "Forsikring, forklaret ligeud",
        "p": "Tilbud omfatter normalt den lovpligtige ansvarsforsikring og en kaskoforsikring med selvrisiko (CDW): hvis bilen bliver beskadiget, betaler du op til selvrisikobeløbet, ikke hele reparationen. Fuld dækning reducerer selvrisikoen til nul eller næsten nul for nogle få euro mere om dagen. Læs, hvad der er undtaget — dæk, undervogn, sidespejle og grusveje er det ofte — og spørg bureauet direkte, de svarer."
      },
      {
        "h": "Bjergveje og geder",
        "p": "Kretas indre er hårnålsland: smalle veje, blinde sving og geder, der betragter asfalten som deres. Dyt kort før snævre blinde sving, lad de lokale komme forbi, og tank op, før du kører ind i bjergene — der bliver langt mellem tankstationerne syd for hovedvejen. En lille bil er reelt nemmere at have med at gøre i landsbygaderne end en stor SUV."
      },
      {
        "h": "Parkering i de gamle bydele",
        "p": "De gamle bydele i Chania, Rethymno og Heraklion er stort set gågader eller forbeholdt beboere. Forsøg ikke at parkere inde i dem: brug de skiltede betalingsparkeringspladser og de gratis zoner i udkanten, og gå ind — det tager højst ti minutter. Blå linjer betyder betalingsparkering, gul betyder parkering forbudt, hvid er gratis."
      }
    ],
    "faqTitle": "Spørgsmål, folk faktisk stiller",
    "faq": [
      {
        "q": "Skal jeg forudbetale online?",
        "a": "Nej. Denne formular sender kun din forespørgsel til det lokale bureau. De svarer med et tilbud, og du bekræfter direkte med dem — der er ingen onlinebetaling på denne side, og du behøver ikke noget kort for at spørge."
      },
      {
        "q": "Kan jeg betale kontant?",
        "a": "Ja. Partnerbureauet tager imod kontanter såvel som kort. Du betaler, når du henter bilen, eller som aftalt med bureauet; der gælder typisk et depositum, der refunderes, med det præcise beløb bekræftet i tilbuddet."
      },
      {
        "q": "Hvilken forsikring er inkluderet?",
        "a": "Tilbud fra bureauet omfatter ansvarsforsikring som krævet efter græsk lov, normalt med en kaskoforsikring med selvrisiko (CDW): det præcise selvrisikobeløb og betingelserne bekræftes i tilbuddet. Fuld dækning med nul eller næsten nul selvrisiko kan fås mod et ekstra dagligt gebyr. Bed om det i bemærkningerne til din forespørgsel, hvis du ønsker det med i tilbuddet."
      },
      {
        "q": "Kan jeg hente bilen i lufthavnen?",
        "a": "Ja. Afhentning og aflevering i Chania lufthavn er standard, og bureauet dækker også Heraklion lufthavn, havnene og Rethymno: tilføj dit flynummer i formularen, så holder bureauet øje med forsinkelser. Afhentning i byen eller ved din indkvartering er typisk også muligt."
      }
    ],
    "breadcrumbHome": "Forside",
    "breadcrumbCarRental": "Lej en bil"
  },
  "no": {
    "h1": "Leie bil på Kreta",
    "intro": "Dette skjemaet sender forespørselen din til et lokalt utleiebyrå vi faktisk samarbeider med: Auto Smart Car Rental i Chania, tydelig oppgitt, ingenting skjult. Byrået svarer direkte med et tilbud; du betaler dem, på stedet om du vil, kontant godtas, ingen forhåndsbetaling på nett. Vi får en provisjon fra byrået når en utleie blir gjennomført — prisen du betaler endres ikke på grunn av det.",
    "drivingTitle": "Å kjøre på Kreta: dette bør du vite før du bestiller",
    "driving": [
      {
        "h": "Førerkort og papirer",
        "p": "Et førerkort fra EU eller EØS er alt du trenger. Hvis førerkortet ditt ble utstedt utenfor EU/EØS, kan greske byråer og politiet be om et internasjonalt førerkort (IDP) i tillegg til det nasjonale førerkortet ditt — skaff deg det før du reiser, det kan ikke utstedes i Hellas. De fleste byråer krever en minstealder på 21 til 23 år og minst ett års kjøreerfaring."
      },
      {
        "h": "Forsikring, forklart enkelt",
        "p": "Tilbud inkluderer vanligvis det lovpålagte ansvaret overfor tredjepart og en kollisjonsskadefraskrivelse (CDW) med en egenandel: hvis bilen blir skadet, betaler du opptil egenandelsbeløpet, ikke hele reparasjonen. Full dekning reduserer egenandelen til null eller nær null for noen få euro mer per dag. Les hva som er unntatt — dekk, understell, speil og grusveier er det ofte — og spør byrået direkte, de svarer."
      },
      {
        "h": "Fjellveier og geiter",
        "p": "Det indre av Kreta er hårnålssvingenes land: smale veier, uoversiktlige svinger og geiter som mener asfalten er deres. Tut kort før trange, uoversiktlige svinger, la lokalbefolkningen passere, og fyll opp tanken før du tar fatt på fjellet — det blir langt mellom bensinstasjonene sør for hovedveien. En liten bil er faktisk lettere å manøvrere i landsbygatene enn en stor SUV."
      },
      {
        "h": "Parkering i gamlebyene",
        "p": "Gamlebyene i Chania, Rethymno og Heraklion er stort sett bilfrie eller forbeholdt beboere. Ikke prøv å parkere inne i dem: bruk de skiltede betalingsparkeringene og gratissonene rundt utkanten og gå inn — det tar høyst ti minutter. Blå striper betyr betalingsparkering, gult betyr parkering forbudt, hvitt er gratis."
      }
    ],
    "faqTitle": "Spørsmål folk faktisk stiller",
    "faq": [
      {
        "q": "Må jeg forhåndsbetale på nett?",
        "a": "Nei. Dette skjemaet sender bare forespørselen din til det lokale byrået. De svarer med et tilbud, og du bekrefter direkte med dem — det finnes ingen betaling på nett på denne siden, og du trenger ikke kort for å spørre."
      },
      {
        "q": "Kan jeg betale kontant?",
        "a": "Ja. Partnerbyrået godtar kontanter så vel som kort. Du betaler når du henter bilen, eller som avtalt med byrået; vanligvis gjelder et depositum som du får tilbake, og det nøyaktige beløpet bekreftes i tilbudet."
      },
      {
        "q": "Hvilken forsikring er inkludert?",
        "a": "Tilbud fra byrået inkluderer ansvar overfor tredjepart slik gresk lov krever, vanligvis med en kollisjonsskadefraskrivelse (CDW) og en egenandel ved skade: det nøyaktige egenandelsbeløpet og vilkårene bekreftes i tilbudet. Full dekning med null eller nær null egenandel er tilgjengelig mot et ekstra dagsgebyr. Be om det i merknadsfeltet i forespørselen hvis du vil ha det med i tilbudet."
      },
      {
        "q": "Kan jeg hente bilen på flyplassen?",
        "a": "Ja. Henting og levering på Chania flyplass er standard, og byrået dekker også Heraklion flyplass, havnene og Rethymno: legg inn flynummeret ditt i skjemaet, så følger byrået med på forsinkelser. Henting i byen eller på overnattingsstedet ditt er vanligvis også mulig."
      }
    ],
    "breadcrumbHome": "Hjem",
    "breadcrumbCarRental": "Leie bil"
  },
  "fi": {
    "h1": "Vuokraa auto Kreetalla",
    "intro": "Tämä lomake lähettää pyyntösi paikalliselle vuokra-autotoimistolle, jonka kanssa todella teemme yhteistyötä: Auto Smart Car Rental Chaniassa, selkeästi nimettynä, mitään piilottelematta. Toimisto vastaa suoraan tarjouksella; maksat heille, halutessasi vaikka paikan päällä, käteinen käy, ei verkkomaksua etukäteen. Saamme välityspalkkion toimistolta, kun vuokraus toteutuu — maksamasi hinta ei muutu sen vuoksi.",
    "drivingTitle": "Ajaminen Kreetalla: mitä on hyvä tietää ennen varaamista",
    "driving": [
      {
        "h": "Ajokortti ja paperit",
        "p": "EU- tai ETA-ajokortti riittää. Jos ajokorttisi on myönnetty EU:n/ETA:n ulkopuolella, kreikkalaiset toimistot ja poliisi voivat vaatia kansainvälisen ajokortin (IDP) kansallisen korttisi rinnalle — hanki se ennen matkaa, sitä ei myönnetä Kreikassa. Useimmat toimistot edellyttävät vähintään 21–23 vuoden ikää ja vähintään yhden vuoden ajokokemusta."
      },
      {
        "h": "Vakuutus selkokielellä",
        "p": "Tarjouksiin sisältyy yleensä lakisääteinen liikennevakuutus ja kolarivahinkovapautus (CDW), jossa on omavastuu: jos auto vaurioituu, maksat enintään omavastuun verran, et koko korjausta. Täysi turva pienentää omavastuun nollaan tai lähes nollaan muutamalla lisäeurolla päivässä. Lue, mitä on rajattu ulkopuolelle — renkaat, auton pohja, peilit ja hiekkatiet jäävät usein korvaamatta — ja kysy toimistolta suoraan, he vastaavat."
      },
      {
        "h": "Vuoristotiet ja vuohet",
        "p": "Kreetan sisäosa on serpentiiniä: kapeita kaistoja, sokkomutkia ja vuohia, jotka pitävät asfalttia ominaan. Tööttää lyhyesti ennen tiukkoja sokkomutkia, anna paikallisten ohittaa ja tankkaa ennen vuorille suuntaamista — huoltoasemat harvenevat päätien eteläpuolella. Pieni auto on kylän kujilla aidosti helpompi kuin iso maasturi."
      },
      {
        "h": "Pysäköinti vanhoissakaupungeissa",
        "p": "Chanian, Rethymnon ja Heraklionin vanhatkaupungit ovat suurelta osin kävelyalueita tai vain asukkaille. Älä yritä pysäköidä niiden sisään: käytä opastettuja maksullisia pysäköintialueita ja ilmaisvyöhykkeitä reuna-alueilla ja kävele sisään — matkaa on enintään kymmenen minuuttia. Siniset viivat tarkoittavat maksullista pysäköintiä, keltaiset pysäköintikieltoa, valkoiset ilmaista."
      }
    ],
    "faqTitle": "Kysymyksiä, joita ihmiset oikeasti kysyvät",
    "faq": [
      {
        "q": "Pitääkö minun maksaa verkossa etukäteen?",
        "a": "Ei. Tämä lomake vain lähettää pyyntösi paikalliselle toimistolle. He vastaavat tarjouksella ja vahvistat varauksen suoraan heidän kanssaan — tällä sivulla ei ole verkkomaksua eikä korttia tarvita kysymiseen."
      },
      {
        "q": "Voinko maksaa käteisellä?",
        "a": "Kyllä. Kumppanitoimisto ottaa vastaan sekä käteistä että kortteja. Maksat auton noudon yhteydessä tai toimiston kanssa sovitulla tavalla; yleensä peritään palautettava vakuusmaksu, jonka tarkka summa vahvistetaan tarjouksessa."
      },
      {
        "q": "Mikä vakuutus sisältyy?",
        "a": "Toimiston tarjouksiin sisältyy Kreikan lain vaatima liikennevakuutus, yleensä kolarivahinkovapautus (CDW) ja vahinko-omavastuu: tarkka omavastuun määrä ja ehdot vahvistetaan tarjouksessa. Täysi turva, jossa omavastuu on nolla tai lähes nolla, on saatavilla päivittäistä lisämaksua vastaan. Pyydä sitä pyynnön lisätiedoissa, jos haluat sen mukaan tarjoukseen."
      },
      {
        "q": "Voinko noutaa auton lentokentältä?",
        "a": "Kyllä. Nouto ja palautus Chanian lentokentällä on vakiona, ja toimisto palvelee myös Heraklionin lentokentällä, satamissa ja Rethymnossa: lisää lennon numero lomakkeeseen, niin toimisto seuraa viivästyksiä. Nouto kaupungista tai majoituksestasi on yleensä myös mahdollinen."
      }
    ],
    "breadcrumbHome": "Etusivu",
    "breadcrumbCarRental": "Vuokraa auto"
  },
  "cs": {
    "h1": "Pronájem auta na Krétě",
    "intro": "Tento formulář odešle vaši žádost místní půjčovně, se kterou skutečně spolupracujeme: Auto Smart Car Rental v Chanii, vše transparentně, nic skrytého. Agentura vám odpoví přímo s cenovou nabídkou; platíte jí, klidně na místě, hotovost přijímá, žádná platba předem online. Když dojde k pronájmu, dostáváme od agentury provizi — cena, kterou platíte, se kvůli tomu nemění.",
    "drivingTitle": "Řízení na Krétě: co vědět, než si auto rezervujete",
    "driving": [
      {
        "h": "Řidičský průkaz a doklady",
        "p": "Řidičský průkaz z EU nebo EHP je vše, co potřebujete. Pokud byl váš průkaz vydán mimo EU/EHP, řecké půjčovny i policie mohou vedle vnitrostátního průkazu požadovat mezinárodní řidičský průkaz (IDP) — pořiďte si ho před odletem, v Řecku se nevydává. Většina půjčoven požaduje minimální věk 21 až 23 let a alespoň jeden rok řidičské praxe."
      },
      {
        "h": "Pojištění, srozumitelně",
        "p": "Cenové nabídky obvykle zahrnují zákonné pojištění odpovědnosti vůči třetím osobám a pojištění proti poškození vozidla (CDW) se spoluúčastí: pokud se auto poškodí, platíte jen do výše této spoluúčasti, nikoli celou opravu. Plné krytí sníží spoluúčast na nulu nebo téměř nulu za pár eur navíc denně. Přečtěte si, co je z pojištění vyloučeno — pneumatiky, spodek vozu, zrcátka a nezpevněné cesty často ano — a zeptejte se agentury přímo, odpovídá."
      },
      {
        "h": "Horské silnice a kozy",
        "p": "Vnitrozemí Kréty je kraj serpentin: úzké pruhy, zatáčky bez výhledu a kozy, které považují asfalt za svůj. Před úzkými nepřehlednými zatáčkami krátce zatrubte, nechte místní projet a před cestou do hor natankujte — jižně od hlavní silnice jsou čerpací stanice řídké. Malé auto je v uličkách vesnic opravdu pohodlnější než velké SUV."
      },
      {
        "h": "Parkování ve starých městech",
        "p": "Stará města Chania, Rethymno a Heraklion jsou převážně pěší zóny nebo přístupná jen rezidentům. Nesnažte se v nich zaparkovat: využijte označená placená parkoviště a volné zóny po okrajích a dojděte pěšky — je to nanejvýš deset minut. Modré čáry znamenají placené parkování, žluté zákaz parkování, bílé parkování zdarma."
      }
    ],
    "faqTitle": "Otázky, které lidé skutečně kladou",
    "faq": [
      {
        "q": "Musím platit předem online?",
        "a": "Ne. Tento formulář pouze odešle vaši žádost místní agentuře. Ta vám odpoví s cenovou nabídkou a vy potvrdíte přímo s ní — na této stránce není žádná online platba, k podání žádosti není potřeba karta."
      },
      {
        "q": "Můžu platit hotově?",
        "a": "Ano. Partnerská agentura přijímá hotovost i karty. Platíte při vyzvednutí auta nebo podle domluvy s agenturou; obvykle se účtuje vratná kauce, jejíž přesná výše je potvrzena v cenové nabídce."
      },
      {
        "q": "Jaké pojištění je zahrnuto?",
        "a": "Cenové nabídky agentury zahrnují pojištění odpovědnosti vůči třetím osobám, jak vyžaduje řecký zákon, obvykle s pojištěním proti poškození vozidla (CDW) a spoluúčastí: přesná výše spoluúčasti a podmínky jsou potvrzeny v nabídce. Plné krytí s nulovou nebo téměř nulovou spoluúčastí je k dispozici za příplatek za den. Pokud ho chcete, vyžádejte si ho v poznámkách k žádosti, aby vám byl naceněn."
      },
      {
        "q": "Můžu si auto vyzvednout na letišti?",
        "a": "Ano. Vyzvednutí a vrácení na letišti v Chanii je standardní a agentura pokrývá také letiště v Heraklionu, přístavy a Rethymno: do formuláře doplňte číslo letu a agentura sleduje zpoždění. Vyzvednutí ve městě nebo v ubytování je obvykle také možné."
      }
    ],
    "breadcrumbHome": "Domů",
    "breadcrumbCarRental": "Pronájem auta"
  },
  "hu": {
    "h1": "Béreljen autót Krétán",
    "intro": "Ez az űrlap egy olyan helyi autókölcsönzőnek küldi el a kérését, amellyel ténylegesen együtt dolgozunk: az Auto Smart Car Rentalnek Chaniában, egyértelműen feltüntetve, semmi rejtett. Az iroda közvetlenül válaszol árajánlattal; nekik fizet, akár a helyszínen is, készpénz elfogadott, online előleg nélkül. Az ügynökségtől jutalékot kapunk, amikor egy bérlés létrejön — az Ön által fizetett ár emiatt nem változik.",
    "drivingTitle": "Vezetés Krétán: amit a foglalás előtt érdemes tudni",
    "driving": [
      {
        "h": "Jogosítvány és iratok",
        "p": "Egy uniós (EU) vagy EGT-jogosítvány minden, amire szüksége van. Ha a jogosítványát az EU/EGT-n kívül állították ki, a görög irodák és a rendőrség kérheti a nemzetközi vezetői engedélyt (IDP) a nemzeti jogosítvány mellé — ezt még az indulás előtt szerezze be, Görögországban nem állítják ki. A legtöbb iroda minimum 21–23 éves életkort és legalább egy év vezetési tapasztalatot kér."
      },
      {
        "h": "Biztosítás, érthetően",
        "p": "Az árajánlat általában tartalmazza a törvény által előírt felelősségbiztosítást és egy önrészes töréskárlemondást (CDW): ha a kocsi megsérül, csak az önrész összegéig fizet, nem a teljes javítást. A teljes körű fedezet néhány euró napi felárért nullára vagy közel nullára csökkenti az önrészt. Olvassa el, mi van kizárva — a gumiabroncsok, az alváz, a tükrök és a földutak gyakran azok —, és kérdezzen rá közvetlenül az irodánál, ők válaszolnak."
      },
      {
        "h": "Hegyi utak és kecskék",
        "p": "Kréta belseje a hajtűkanyarok birodalma: szűk sávok, beláthatatlan kanyarok, és kecskék, amelyek az aszfaltot a sajátjuknak tekintik. Szűk, beláthatatlan kanyarok előtt dudáljon röviden, engedje előre a helyieket, és tankoljon tele, mielőtt a hegyek közé indul — a főúttól délre megritkulnak a benzinkutak. Egy kis autóval a falusi utcákon valóban könnyebb a közlekedés, mint egy nagy SUV-val."
      },
      {
        "h": "Parkolás az óvárosokban",
        "p": "Chania, Rethymno és Heraklion óvárosa nagyrészt gyalogos vagy csak lakossági övezet. Ne próbáljon meg ezeken belül parkolni: használja a táblákkal jelölt fizetős parkolókat és a szélükön lévő ingyenes zónákat, és sétáljon be — legfeljebb tíz perc. A kék vonal fizetős parkolást jelent, a sárga tilosat, a fehér ingyenest."
      }
    ],
    "faqTitle": "Kérdések, amelyeket az emberek valóban feltesznek",
    "faq": [
      {
        "q": "Kell online előleget fizetnem?",
        "a": "Nem. Ez az űrlap csak elküldi a kérését a helyi irodának. Ők válaszolnak árajánlattal, és Ön közvetlenül velük erősíti meg — ezen az oldalon nincs online fizetés, a kérdezéshez nem kell bankkártya."
      },
      {
        "q": "Fizethetek készpénzzel?",
        "a": "Igen. A partneriroda elfogadja a készpénzt és a kártyát is. Akkor fizet, amikor átveszi az autót, vagy az irodával egyeztetett módon; jellemzően visszatérítendő óvadék jár, amelynek pontos összegét az árajánlat tartalmazza."
      },
      {
        "q": "Milyen biztosítás van benne?",
        "a": "Az iroda árajánlata tartalmazza a görög törvény által előírt felelősségbiztosítást, általában egy töréskárlemondással (CDW) és kárönrésszel: az önrész pontos összegét és feltételeit az árajánlat erősíti meg. Nulla vagy közel nulla önrészű teljes körű fedezet napi felárért elérhető. Ha kéri, jelezze a kérés megjegyzéseinél, hogy szerepeljen az árajánlatban."
      },
      {
        "q": "Átvehetem az autót a reptéren?",
        "a": "Igen. A chaniai reptéri átvétel és visszaadás alapból megoldott, és az iroda lefedi a heraklioni repteret, a kikötőket és Rethymnót is: adja meg a járatszámát az űrlapon, és az iroda követi a késéseket. A városban vagy a szállásán való átvétel is jellemzően lehetséges."
      }
    ],
    "breadcrumbHome": "Főoldal",
    "breadcrumbCarRental": "Autóbérlés"
  },
  "ro": {
    "h1": "Închiriază o mașină în Creta",
    "intro": "Acest formular trimite cererea ta unei agenții locale de închirieri cu care chiar colaborăm: Auto Smart Car Rental din Chania, clar identificată, nimic ascuns. Agenția răspunde direct cu o ofertă; le plătești lor, pe loc dacă vrei, se acceptă numerar, fără plată online în avans. Primim un comision de la agenție atunci când o închiriere se concretizează — prețul pe care îl plătiți nu se schimbă din acest motiv.",
    "drivingTitle": "Condusul în Creta: ce trebuie să știi înainte să rezervi",
    "driving": [
      {
        "h": "Permis și acte",
        "p": "Un permis de conducere din UE sau SEE este tot ce îți trebuie. Dacă permisul tău a fost emis în afara UE/SEE, agențiile grecești și poliția pot cere un permis internațional de conducere (IDP) pe lângă permisul tău național — obține-l înainte de a pleca, în Grecia nu poate fi eliberat. Majoritatea agențiilor cer o vârstă minimă între 21 și 23 de ani și cel puțin un an de experiență la volan."
      },
      {
        "h": "Asigurarea, pe înțelesul tuturor",
        "p": "Ofertele includ de obicei răspunderea civilă obligatorie față de terți și o asigurare pentru daune la coliziune (CDW) cu o franșiză: dacă mașina se avariază, plătești până la suma franșizei, nu întreaga reparație. Acoperirea completă reduce franșiza la zero sau aproape de zero pentru câțiva euro în plus pe zi. Citește ce este exclus — anvelopele, partea inferioară a caroseriei, oglinzile și drumurile neasfaltate sunt deseori excluse — și întreabă direct agenția, îți răspund."
      },
      {
        "h": "Drumuri de munte și capre",
        "p": "Interiorul Cretei este o zonă plină de serpentine: benzi înguste, curbe fără vizibilitate și capre care consideră asfaltul al lor. Claxonează scurt înainte de curbele strânse fără vizibilitate, lasă localnicii să treacă și fă plinul înainte să urci spre munți — benzinăriile devin rare la sud de drumul principal. O mașină mică este chiar mai ușor de condus pe străzile satelor decât un SUV mare."
      },
      {
        "h": "Parcarea în orașele vechi",
        "p": "Orașele vechi din Chania, Rethymno și Heraklion sunt în mare parte pietonale sau doar pentru rezidenți. Nu încerca să parchezi în interiorul lor: folosește parcările cu plată semnalizate și zonele gratuite de la margini și intră pe jos — sunt cel mult zece minute. Liniile albastre înseamnă parcare cu plată, galben înseamnă parcare interzisă, alb este gratuit."
      }
    ],
    "faqTitle": "Întrebări pe care oamenii le pun cu adevărat",
    "faq": [
      {
        "q": "Trebuie să plătesc online în avans?",
        "a": "Nu. Acest formular doar trimite cererea ta agenției locale. Ei răspund cu o ofertă și confirmi direct cu ei — nu există nicio plată online pe această pagină, nu este nevoie de card ca să întrebi."
      },
      {
        "q": "Pot plăti cu numerar?",
        "a": "Da. Agenția parteneră acceptă atât numerar, cât și carduri. Plătești când iei mașina sau cum ai convenit cu agenția; de obicei se aplică un depozit de garanție rambursabil, suma exactă fiind confirmată în ofertă."
      },
      {
        "q": "Ce asigurare este inclusă?",
        "a": "Ofertele de la agenție includ răspunderea civilă față de terți, așa cum cere legislația greacă, de obicei cu o asigurare pentru daune la coliziune (CDW) și o franșiză pentru daune: suma exactă a franșizei și condițiile sunt confirmate în ofertă. Acoperirea completă cu franșiză zero sau aproape de zero este disponibilă pentru un cost zilnic suplimentar. Cere-o în observațiile cererii dacă vrei să fie inclusă în ofertă."
      },
      {
        "q": "Pot prelua mașina de la aeroport?",
        "a": "Da. Preluarea și returnarea la aeroportul din Chania este standard, iar agenția acoperă și aeroportul din Heraklion, porturile și Rethymno: adaugă numărul zborului în formular, iar agenția urmărește întârzierile. De obicei este posibilă și preluarea în oraș sau la cazarea ta."
      }
    ],
    "breadcrumbHome": "Acasă",
    "breadcrumbCarRental": "Închiriază o mașină"
  },
  "ar": {
    "h1": "استئجار سيارة في كريت",
    "intro": "يرسل هذا النموذج طلبك إلى وكالة تأجير محلية نتعامل معها فعلاً: Auto Smart Car Rental في خانيا، بوضوح تام ودون إخفاء أي شيء. تردّ الوكالة مباشرةً بعرض سعر؛ تدفع لها، على الفور إن أردت، والنقد مقبول، بلا دفع مسبق عبر الإنترنت. نحصل على عمولة من الوكالة عند إتمام عملية تأجير — والسعر الذي تدفعه لا يتغير بسبب ذلك.",
    "drivingTitle": "القيادة في كريت: ما يجب معرفته قبل الحجز",
    "driving": [
      {
        "h": "رخصة القيادة والأوراق",
        "p": "رخصة قيادة من الاتحاد الأوروبي أو المنطقة الاقتصادية الأوروبية هي كل ما تحتاجه. إذا صدرت رخصتك خارج الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية، فقد تطلب منك الوكالات والشرطة في اليونان رخصة قيادة دولية (IDP) إلى جانب رخصتك الوطنية — احصل عليها قبل سفرك، إذ لا يمكن إصدارها في اليونان. تشترط معظم الوكالات حدًّا أدنى للعمر بين 21 و23 عامًا، وخبرة قيادة لا تقل عن سنة واحدة."
      },
      {
        "h": "التأمين بكلمات واضحة",
        "p": "تشمل عروض الأسعار عادةً تأمين المسؤولية المدنية تجاه الغير الذي يفرضه القانون، وإعفاءً من أضرار الاصطدام (CDW) مع مبلغ تحمّل: إذا تضررت السيارة، فإنك تدفع حتى مبلغ التحمّل فقط، لا تكلفة الإصلاح كاملةً. تخفّض التغطية الشاملة مبلغ التحمّل إلى صفر أو ما يقارب الصفر مقابل بضعة يوروات إضافية في اليوم. اقرأ ما هو مستثنى — فغالبًا ما تُستثنى الإطارات وأسفل الهيكل والمرايا والطرق الترابية — واسأل الوكالة مباشرةً، فهي تجيب."
      },
      {
        "h": "الطرق الجبلية والماعز",
        "p": "داخل كريت مليء بالمنعطفات الحادة: ممرات ضيقة، ومنعطفات عمياء، وماعز يعتبر الإسفلت ملكًا له. أطلق بوق سيارتك بإيجاز قبل المنعطفات العمياء الضيقة، ودع السكان المحليين يمرّون، واملأ خزان الوقود قبل التوجه إلى الجبال — فمحطات الوقود تقلّ جنوب الطريق الرئيسي. السيارة الصغيرة أسهل فعلاً في شوارع القرى من سيارة الدفع الرباعي الكبيرة."
      },
      {
        "h": "ركن السيارة في المدن القديمة",
        "p": "المدن القديمة في خانيا وريثيمنو وهيراكليون مخصصة في معظمها للمشاة أو للسكان فقط. لا تحاول الركن داخلها: استخدم مواقف السيارات المدفوعة والمناطق المجانية المُشار إليها حول الأطراف ثم امشِ إلى الداخل — فالمسافة عشر دقائق على الأكثر. الخطوط الزرقاء تعني ركنًا مدفوعًا، والصفراء تعني ممنوع الركن، والبيضاء تعني مجانيًا."
      }
    ],
    "faqTitle": "أسئلة يطرحها الناس فعلاً",
    "faq": [
      {
        "q": "هل عليّ الدفع مسبقًا عبر الإنترنت؟",
        "a": "لا. يكتفي هذا النموذج بإرسال طلبك إلى الوكالة المحلية. تردّ بعرض سعر وتؤكّد معها مباشرةً — لا يوجد دفع عبر الإنترنت في هذه الصفحة، ولا حاجة إلى بطاقة لمجرد السؤال."
      },
      {
        "q": "هل يمكنني الدفع نقدًا؟",
        "a": "نعم. تقبل الوكالة الشريكة الدفع نقدًا وبالبطاقات أيضًا. تدفع عند استلام السيارة أو حسب الاتفاق مع الوكالة؛ ويُطبَّق عادةً مبلغ تأمين قابل للاسترداد، يُؤكَّد مقداره الدقيق في عرض السعر."
      },
      {
        "q": "ما التأمين المشمول؟",
        "a": "تشمل عروض أسعار الوكالة تأمين المسؤولية تجاه الغير كما يقتضي القانون اليوناني، وعادةً مع إعفاء من أضرار الاصطدام (CDW) ومبلغ تحمّل عن الأضرار: يُؤكَّد مقدار التحمّل الدقيق وشروطه في عرض السعر. وتتوفر تغطية شاملة بتحمّل صفري أو شبه صفري مقابل رسوم يومية إضافية. اطلبها في ملاحظات الطلب إن أردت إدراجها في العرض."
      },
      {
        "q": "هل يمكنني استلام السيارة من المطار؟",
        "a": "نعم. استلام السيارة وتسليمها في مطار خانيا أمر معتاد، كما تغطي الوكالة مطار هيراكليون والموانئ وريثيمنو: أضف رقم رحلتك في النموذج وتتابع الوكالة أي تأخير. ويمكن عادةً الاستلام في المدينة أو في مكان إقامتك أيضًا."
      }
    ],
    "breadcrumbHome": "الرئيسية",
    "breadcrumbCarRental": "استئجار سيارة"
  }
};
