// Catalogue des pages-lieu SEO /car-rental/[location] (longue traîne géo, même
// recette que /buses/[pair] qui a gagné GATE A). Chaque lieu = un point d'entrée
// touristique majeur (aéroport / port ferry) SERVI par le partenaire Auto Smart,
// mappé à un `pickup` slug VALIDE (présent dans CAR_ZONES → préfile le wizard à
// l'étape 2). Contenu rédigé main en/fr/de ; les autres locales servies en ISR
// (fallback EN), pattern buses. NE PAS lister ici une zone sans partenaire :
// on ne génère pas de demande qu'on ne peut pas honorer.
//
// Le contenu est GÉO-SPÉCIFIQUE seulement (récupération sur place, transfert,
// accès) : le générique (conduire en Crète, conditions de location) vit sur la
// page mère /car-rental et est atteint par un lien retour → zéro duplicate.

export type CarLocLocale = "en" | "fr" | "de";
export const CAR_LOC_LOCALES: CarLocLocale[] = ["en", "fr", "de"];

export interface CarLocationContent {
  h1: string;
  intro: string;          // 2-3 phrases, mot-clé géo en tête
  deliveryTitle: string;
  delivery: string;       // comment on récupère la voiture ICI
  tips: Array<{ h: string; p: string }>;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
}

export interface CarLocation {
  /** Slug d'URL : /car-rental/<slug>. */
  slug: string;
  /** Slug pickup VALIDE (∈ CAR_ZONES.pickups) qui préfile le wizard. */
  pickup: string;
  kind: "airport" | "port";
  /** Code IATA pour les aéroports (ancrage requête « CHQ car rental »). */
  code?: string;
  /** Label court pour les chips de maillage (page mère /car-rental). */
  hub: Record<CarLocLocale, string>;
  meta: Record<CarLocLocale, { title: string; desc: string }>;
  content: Record<CarLocLocale, CarLocationContent>;
}

export const CAR_LOCATIONS: CarLocation[] = [
  // ── Chania International Airport (CHQ), Akrotiri, ~14 km NE de Chania ──
  {
    slug: "chania-airport",
    pickup: "chania-airport",
    kind: "airport",
    code: "CHQ",
    hub: { en: "Chania Airport (CHQ)", fr: "Aéroport de Chania (CHQ)", de: "Flughafen Chania (CHQ)" },
    meta: {
      en: {
        title: "Car Rental Chania Airport (CHQ) · local agency, no prepayment",
        desc: "Rent a car at Chania Airport (CHQ) in four taps. A local partner agency meets you at arrivals with the keys: pay on the spot, cash accepted, no online prepayment, free airport delivery.",
      },
      fr: {
        title: "Location de voiture aéroport de Chania (CHQ) · agence locale, sans prépaiement",
        desc: "Louez une voiture à l'aéroport de Chania (CHQ) en quatre clics. Une agence partenaire locale vous remet les clés à l'arrivée : paiement sur place, espèces acceptées, aucun prépaiement en ligne, livraison gratuite à l'aéroport.",
      },
      de: {
        title: "Mietwagen Flughafen Chania (CHQ) · lokale Agentur, keine Vorauszahlung",
        desc: "Mietwagen am Flughafen Chania (CHQ) in vier Klicks. Eine lokale Partneragentur übergibt Ihnen die Schlüssel bei der Ankunft: Zahlung vor Ort, Barzahlung möglich, keine Online-Vorauszahlung, kostenlose Lieferung zum Flughafen.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Chania Airport (CHQ)",
        intro:
          "Renting a car at Chania Airport is the simplest way to reach the beaches of the west — Balos, Elafonisi, Falassarna — that the bus barely serves. Chania Airport (CHQ) sits on the Akrotiri peninsula, about 14 km northeast of the city.",
        deliveryTitle: "Picking up your car at the airport",
        delivery:
          "There is no rental desk queue: the local partner agency delivers the car to the airport and hands you the keys in person after you land. You send your flight number with the request so the delivery matches your real arrival time, even if the flight is late. Delivery to Chania Airport is free.",
        tips: [
          {
            h: "Free airport delivery",
            p: "The car is brought to CHQ at no extra cost. Same for the drop-off: you leave it at the airport before your return flight.",
          },
          {
            h: "Pay on arrival",
            p: "No online prepayment. You pay the agency directly on pick-up, cash or card, with a refundable deposit held on the car.",
          },
        ],
        faqTitle: "Chania Airport car rental — FAQ",
        faq: [
          {
            q: "Is there a rental car counter at Chania Airport?",
            a: "The local partner works by meet-and-greet delivery rather than a fixed counter: an agent brings the car to the airport and hands over the keys, so there is no counter queue after your flight.",
          },
          {
            q: "How far is Chania town from the airport?",
            a: "Chania Airport (CHQ) is on the Akrotiri peninsula, roughly 14 km — about 20-25 minutes by road — from the old town and harbour.",
          },
          {
            q: "Can I drop the car back at the airport?",
            a: "Yes. You return it at Chania Airport before your departure flight; airport drop-off is free within the Chania area.",
          },
        ],
      },
      fr: {
        h1: "Location de voiture à l'aéroport de Chania (CHQ)",
        intro:
          "Louer une voiture à l'aéroport de Chania est le moyen le plus simple d'atteindre les plages de l'ouest — Balos, Elafonisi, Falassarna — que le bus dessert à peine. L'aéroport de Chania (CHQ) se trouve sur la presqu'île d'Akrotiri, à environ 14 km au nord-est de la ville.",
        deliveryTitle: "Récupérer votre voiture à l'aéroport",
        delivery:
          "Pas de file d'attente au comptoir : l'agence partenaire locale livre la voiture à l'aéroport et vous remet les clés en main propre après l'atterrissage. Vous transmettez votre numéro de vol avec la demande, pour que la livraison colle à votre heure d'arrivée réelle, même en cas de retard. La livraison à l'aéroport de Chania est gratuite.",
        tips: [
          {
            h: "Livraison gratuite à l'aéroport",
            p: "La voiture est amenée à CHQ sans surcoût. Idem pour le retour : vous la laissez à l'aéroport avant votre vol de départ.",
          },
          {
            h: "Paiement à l'arrivée",
            p: "Aucun prépaiement en ligne. Vous payez l'agence directement à la prise en main, espèces ou carte, avec une caution bloquée sur le véhicule.",
          },
        ],
        faqTitle: "Location de voiture aéroport de Chania — FAQ",
        faq: [
          {
            q: "Y a-t-il un comptoir de location à l'aéroport de Chania ?",
            a: "Le partenaire local fonctionne par remise en main propre plutôt qu'avec un comptoir fixe : un agent amène la voiture à l'aéroport et vous remet les clés, sans file d'attente à la sortie du vol.",
          },
          {
            q: "À quelle distance est la ville de Chania de l'aéroport ?",
            a: "L'aéroport de Chania (CHQ) est sur la presqu'île d'Akrotiri, à environ 14 km — soit 20 à 25 minutes de route — de la vieille ville et du port.",
          },
          {
            q: "Puis-je rendre la voiture à l'aéroport ?",
            a: "Oui. Vous la rendez à l'aéroport de Chania avant votre vol de départ ; le retour à l'aéroport est gratuit dans la région de Chania.",
          },
        ],
      },
      de: {
        h1: "Mietwagen am Flughafen Chania (CHQ)",
        intro:
          "Ein Mietwagen am Flughafen Chania ist der einfachste Weg zu den Stränden im Westen — Balos, Elafonisi, Falassarna — die der Bus kaum bedient. Der Flughafen Chania (CHQ) liegt auf der Halbinsel Akrotiri, rund 14 km nordöstlich der Stadt.",
        deliveryTitle: "Ihren Wagen am Flughafen abholen",
        delivery:
          "Keine Warteschlange am Schalter: Die lokale Partneragentur liefert den Wagen zum Flughafen und übergibt Ihnen die Schlüssel persönlich nach der Landung. Sie senden Ihre Flugnummer mit der Anfrage, damit die Übergabe zu Ihrer tatsächlichen Ankunftszeit passt, auch bei Verspätung. Die Lieferung zum Flughafen Chania ist kostenlos.",
        tips: [
          {
            h: "Kostenlose Lieferung zum Flughafen",
            p: "Der Wagen wird ohne Aufpreis zum CHQ gebracht. Ebenso die Rückgabe: Sie lassen ihn vor dem Rückflug am Flughafen.",
          },
          {
            h: "Zahlung bei Ankunft",
            p: "Keine Online-Vorauszahlung. Sie zahlen die Agentur direkt bei der Übernahme, bar oder mit Karte, mit einer Kaution auf dem Fahrzeug.",
          },
        ],
        faqTitle: "Mietwagen Flughafen Chania — FAQ",
        faq: [
          {
            q: "Gibt es einen Mietwagenschalter am Flughafen Chania?",
            a: "Der lokale Partner arbeitet mit persönlicher Übergabe statt festem Schalter: Ein Mitarbeiter bringt den Wagen zum Flughafen und übergibt die Schlüssel, ohne Warteschlange nach dem Flug.",
          },
          {
            q: "Wie weit ist die Stadt Chania vom Flughafen entfernt?",
            a: "Der Flughafen Chania (CHQ) liegt auf der Halbinsel Akrotiri, etwa 14 km — rund 20 bis 25 Fahrminuten — von der Altstadt und dem Hafen entfernt.",
          },
          {
            q: "Kann ich den Wagen am Flughafen zurückgeben?",
            a: "Ja. Sie geben ihn vor Ihrem Abflug am Flughafen Chania zurück; die Rückgabe am Flughafen ist im Raum Chania kostenlos.",
          },
        ],
      },
    },
  },

  // ── Heraklion International Airport (HER), ~5 km E du centre ──
  {
    slug: "heraklion-airport",
    pickup: "heraklion",
    kind: "airport",
    code: "HER",
    hub: { en: "Heraklion Airport (HER)", fr: "Aéroport d'Héraklion (HER)", de: "Flughafen Heraklion (HER)" },
    meta: {
      en: {
        title: "Car Rental Heraklion Airport (HER) · local agency, no prepayment",
        desc: "Rent a car at Heraklion Airport (HER) in four taps. A local partner agency meets you at arrivals: pay on the spot, cash accepted, no online prepayment, free airport delivery. Crete's busiest airport.",
      },
      fr: {
        title: "Location de voiture aéroport d'Héraklion (HER) · agence locale, sans prépaiement",
        desc: "Louez une voiture à l'aéroport d'Héraklion (HER) en quatre clics. Une agence partenaire locale vous accueille à l'arrivée : paiement sur place, espèces acceptées, aucun prépaiement en ligne, livraison gratuite. L'aéroport le plus fréquenté de Crète.",
      },
      de: {
        title: "Mietwagen Flughafen Heraklion (HER) · lokale Agentur, keine Vorauszahlung",
        desc: "Mietwagen am Flughafen Heraklion (HER) in vier Klicks. Eine lokale Partneragentur empfängt Sie bei der Ankunft: Zahlung vor Ort, Barzahlung möglich, keine Online-Vorauszahlung, kostenlose Lieferung. Kretas verkehrsreichster Flughafen.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Heraklion Airport (HER)",
        intro:
          "Heraklion Airport (HER) is the busiest gateway to Crete and the natural base for Knossos, the central beaches and the drive east toward Lasithi. A car turns a queue for the airport bus into a direct run to your hotel. The airport sits about 5 km east of the city centre.",
        deliveryTitle: "Picking up your car at the airport",
        delivery:
          "The local partner agency delivers the car to Heraklion Airport and hands you the keys after you land — no counter queue. Send your flight number with the request and the delivery follows your real arrival time, delay included. Airport delivery is free.",
        tips: [
          {
            h: "Free airport delivery",
            p: "The car is brought to HER at no extra cost, and you can leave it at the airport before your return flight.",
          },
          {
            h: "Pay on arrival",
            p: "No online prepayment. You settle with the agency on pick-up, cash or card, with a refundable deposit on the car.",
          },
        ],
        faqTitle: "Heraklion Airport car rental — FAQ",
        faq: [
          {
            q: "Is there a rental car counter at Heraklion Airport?",
            a: "The local partner delivers the car by meet-and-greet rather than staffing a fixed counter, so you skip the counter queue and get the keys directly on arrival.",
          },
          {
            q: "How far is Heraklion centre from the airport?",
            a: "Heraklion Airport (HER) is about 5 km east of the city centre, roughly a 10-15 minute drive depending on traffic.",
          },
          {
            q: "Can I pick up at the airport and drop off in town?",
            a: "Yes. Tell us both points in the request and the agency confirms whether a one-way within the Heraklion area carries any fee.",
          },
        ],
      },
      fr: {
        h1: "Location de voiture à l'aéroport d'Héraklion (HER)",
        intro:
          "L'aéroport d'Héraklion (HER) est la principale porte d'entrée de la Crète et la base naturelle pour Knossos, les plages du centre et la route vers l'est du Lasithi. Une voiture transforme la file du bus aéroport en trajet direct jusqu'à l'hôtel. L'aéroport se trouve à environ 5 km à l'est du centre-ville.",
        deliveryTitle: "Récupérer votre voiture à l'aéroport",
        delivery:
          "L'agence partenaire locale livre la voiture à l'aéroport d'Héraklion et vous remet les clés après l'atterrissage — sans file au comptoir. Transmettez votre numéro de vol avec la demande : la livraison suit votre heure d'arrivée réelle, retard compris. La livraison à l'aéroport est gratuite.",
        tips: [
          {
            h: "Livraison gratuite à l'aéroport",
            p: "La voiture est amenée à HER sans surcoût, et vous pouvez la laisser à l'aéroport avant votre vol de retour.",
          },
          {
            h: "Paiement à l'arrivée",
            p: "Aucun prépaiement en ligne. Vous réglez l'agence à la prise en main, espèces ou carte, avec une caution bloquée sur le véhicule.",
          },
        ],
        faqTitle: "Location de voiture aéroport d'Héraklion — FAQ",
        faq: [
          {
            q: "Y a-t-il un comptoir de location à l'aéroport d'Héraklion ?",
            a: "Le partenaire local livre la voiture en main propre plutôt que de tenir un comptoir fixe : vous évitez la file et récupérez les clés directement à l'arrivée.",
          },
          {
            q: "À quelle distance est le centre d'Héraklion de l'aéroport ?",
            a: "L'aéroport d'Héraklion (HER) est à environ 5 km à l'est du centre-ville, soit 10 à 15 minutes de route selon le trafic.",
          },
          {
            q: "Puis-je prendre la voiture à l'aéroport et la rendre en ville ?",
            a: "Oui. Indiquez les deux points dans la demande et l'agence confirme si un aller simple dans la région d'Héraklion entraîne des frais.",
          },
        ],
      },
      de: {
        h1: "Mietwagen am Flughafen Heraklion (HER)",
        intro:
          "Der Flughafen Heraklion (HER) ist das verkehrsreichste Tor nach Kreta und die natürliche Basis für Knossos, die zentralen Strände und die Fahrt ostwärts nach Lasithi. Ein Auto macht aus der Schlange für den Flughafenbus eine Direktfahrt zum Hotel. Der Flughafen liegt etwa 5 km östlich des Stadtzentrums.",
        deliveryTitle: "Ihren Wagen am Flughafen abholen",
        delivery:
          "Die lokale Partneragentur liefert den Wagen zum Flughafen Heraklion und übergibt Ihnen die Schlüssel nach der Landung — ohne Schalterschlange. Senden Sie Ihre Flugnummer mit der Anfrage: Die Übergabe folgt Ihrer echten Ankunftszeit, Verspätung inklusive. Die Lieferung zum Flughafen ist kostenlos.",
        tips: [
          {
            h: "Kostenlose Lieferung zum Flughafen",
            p: "Der Wagen wird ohne Aufpreis zum HER gebracht, und Sie können ihn vor dem Rückflug am Flughafen lassen.",
          },
          {
            h: "Zahlung bei Ankunft",
            p: "Keine Online-Vorauszahlung. Sie zahlen die Agentur bei der Übernahme, bar oder mit Karte, mit einer Kaution auf dem Fahrzeug.",
          },
        ],
        faqTitle: "Mietwagen Flughafen Heraklion — FAQ",
        faq: [
          {
            q: "Gibt es einen Mietwagenschalter am Flughafen Heraklion?",
            a: "Der lokale Partner liefert den Wagen persönlich, statt einen festen Schalter zu besetzen: Sie sparen sich die Schlange und erhalten die Schlüssel direkt bei der Ankunft.",
          },
          {
            q: "Wie weit ist das Zentrum von Heraklion vom Flughafen entfernt?",
            a: "Der Flughafen Heraklion (HER) liegt etwa 5 km östlich des Stadtzentrums, rund 10 bis 15 Fahrminuten je nach Verkehr.",
          },
          {
            q: "Kann ich am Flughafen abholen und in der Stadt zurückgeben?",
            a: "Ja. Nennen Sie beide Punkte in der Anfrage, und die Agentur bestätigt, ob eine Einwegmiete im Raum Heraklion Gebühren verursacht.",
          },
        ],
      },
    },
  },

  // ── Souda Port (ferry port of Chania), ~7 km E de Chania ──
  {
    slug: "souda-port",
    pickup: "chania",
    kind: "port",
    hub: { en: "Souda Port (Chania)", fr: "Port de Souda (Chania)", de: "Hafen Souda (Chania)" },
    meta: {
      en: {
        title: "Car Rental Souda Port, Chania · pick up off the ferry, no prepayment",
        desc: "Rent a car at Souda ferry port (Chania) in four taps. A local partner agency meets you off the overnight ferry with the keys: pay on the spot, cash accepted, no online prepayment.",
      },
      fr: {
        title: "Location de voiture port de Souda, Chania · à la descente du ferry, sans prépaiement",
        desc: "Louez une voiture au port de ferry de Souda (Chania) en quatre clics. Une agence partenaire locale vous attend à la descente du ferry de nuit avec les clés : paiement sur place, espèces acceptées, aucun prépaiement en ligne.",
      },
      de: {
        title: "Mietwagen Hafen Souda, Chania · direkt von der Fähre, keine Vorauszahlung",
        desc: "Mietwagen am Fährhafen Souda (Chania) in vier Klicks. Eine lokale Partneragentur erwartet Sie mit den Schlüsseln direkt an der Nachtfähre: Zahlung vor Ort, Barzahlung möglich, keine Online-Vorauszahlung.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Souda Port (Chania)",
        intro:
          "Souda is the ferry port of Chania, where the overnight boats from Piraeus (Athens) dock each morning. Souda sits about 7 km east of Chania town — a car waiting on the quay is the quickest way to start the day in the west of Crete.",
        deliveryTitle: "Picking up your car off the ferry",
        delivery:
          "The local partner agency delivers the car to Souda port and meets you as you come off the boat. You give the ferry's arrival time in the request; delivery to the port is free within the Chania area.",
        tips: [
          {
            h: "Meet-and-greet on the quay",
            p: "No trek into town for the keys: the car is brought to the port and handed over on arrival.",
          },
          {
            h: "Pay on arrival",
            p: "No online prepayment. You pay the agency on pick-up, cash or card, with a refundable deposit on the car.",
          },
        ],
        faqTitle: "Souda Port car rental — FAQ",
        faq: [
          {
            q: "Can I collect a rental car at Souda port?",
            a: "Yes. The local partner delivers the car to Souda and meets you off the ferry, so you can drive away straight from the quay.",
          },
          {
            q: "How far is Souda port from Chania town?",
            a: "Souda is about 7 km east of central Chania, roughly a 15-minute drive.",
          },
          {
            q: "Which ferries arrive at Souda?",
            a: "Souda handles the overnight ferry route from Piraeus (Athens); boats typically dock in the early morning.",
          },
        ],
      },
      fr: {
        h1: "Location de voiture au port de Souda (Chania)",
        intro:
          "Souda est le port de ferry de Chania, où accostent chaque matin les bateaux de nuit du Pirée (Athènes). Souda se trouve à environ 7 km à l'est de la ville de Chania — une voiture qui attend sur le quai est le moyen le plus rapide de démarrer la journée dans l'ouest de la Crète.",
        deliveryTitle: "Récupérer votre voiture à la descente du ferry",
        delivery:
          "L'agence partenaire locale livre la voiture au port de Souda et vous accueille à la descente du bateau. Vous indiquez l'heure d'arrivée du ferry dans la demande ; la livraison au port est gratuite dans la région de Chania.",
        tips: [
          {
            h: "Remise en main propre sur le quai",
            p: "Pas de trajet jusqu'en ville pour les clés : la voiture est amenée au port et remise à l'arrivée.",
          },
          {
            h: "Paiement à l'arrivée",
            p: "Aucun prépaiement en ligne. Vous payez l'agence à la prise en main, espèces ou carte, avec une caution sur le véhicule.",
          },
        ],
        faqTitle: "Location de voiture port de Souda — FAQ",
        faq: [
          {
            q: "Puis-je récupérer une voiture de location au port de Souda ?",
            a: "Oui. Le partenaire local livre la voiture à Souda et vous accueille à la descente du ferry, pour repartir directement depuis le quai.",
          },
          {
            q: "À quelle distance est le port de Souda de la ville de Chania ?",
            a: "Souda est à environ 7 km à l'est du centre de Chania, soit une quinzaine de minutes de route.",
          },
          {
            q: "Quels ferries arrivent à Souda ?",
            a: "Souda dessert la ligne de ferry de nuit depuis Le Pirée (Athènes) ; les bateaux accostent généralement tôt le matin.",
          },
        ],
      },
      de: {
        h1: "Mietwagen am Hafen Souda (Chania)",
        intro:
          "Souda ist der Fährhafen von Chania, wo jeden Morgen die Nachtfähren aus Piräus (Athen) anlegen. Souda liegt etwa 7 km östlich der Stadt Chania — ein Auto, das am Kai wartet, ist der schnellste Weg, den Tag im Westen Kretas zu beginnen.",
        deliveryTitle: "Ihren Wagen direkt von der Fähre abholen",
        delivery:
          "Die lokale Partneragentur liefert den Wagen zum Hafen Souda und empfängt Sie bei der Ankunft der Fähre. Sie geben die Ankunftszeit der Fähre in der Anfrage an; die Lieferung zum Hafen ist im Raum Chania kostenlos.",
        tips: [
          {
            h: "Persönliche Übergabe am Kai",
            p: "Kein Weg in die Stadt für die Schlüssel: Der Wagen wird zum Hafen gebracht und bei der Ankunft übergeben.",
          },
          {
            h: "Zahlung bei Ankunft",
            p: "Keine Online-Vorauszahlung. Sie zahlen die Agentur bei der Übernahme, bar oder mit Karte, mit einer Kaution auf dem Fahrzeug.",
          },
        ],
        faqTitle: "Mietwagen Hafen Souda — FAQ",
        faq: [
          {
            q: "Kann ich einen Mietwagen am Hafen Souda abholen?",
            a: "Ja. Der lokale Partner liefert den Wagen nach Souda und empfängt Sie an der Fähre, sodass Sie direkt vom Kai losfahren.",
          },
          {
            q: "Wie weit ist der Hafen Souda von der Stadt Chania entfernt?",
            a: "Souda liegt etwa 7 km östlich des Zentrums von Chania, rund 15 Fahrminuten.",
          },
          {
            q: "Welche Fähren kommen in Souda an?",
            a: "Souda bedient die Nachtfährverbindung aus Piräus (Athen); die Schiffe legen meist am frühen Morgen an.",
          },
        ],
      },
    },
  },

  // ── Heraklion Port (main ferry port, city centre) ──
  {
    slug: "heraklion-port",
    pickup: "heraklion",
    kind: "port",
    hub: { en: "Heraklion Port", fr: "Port d'Héraklion", de: "Hafen Heraklion" },
    meta: {
      en: {
        title: "Car Rental Heraklion Port · pick up off the ferry, no prepayment",
        desc: "Rent a car at Heraklion ferry port in four taps. A local partner agency meets you off the boat with the keys: pay on the spot, cash accepted, no online prepayment.",
      },
      fr: {
        title: "Location de voiture port d'Héraklion · à la descente du ferry, sans prépaiement",
        desc: "Louez une voiture au port de ferry d'Héraklion en quatre clics. Une agence partenaire locale vous attend à la descente du bateau avec les clés : paiement sur place, espèces acceptées, aucun prépaiement en ligne.",
      },
      de: {
        title: "Mietwagen Hafen Heraklion · direkt von der Fähre, keine Vorauszahlung",
        desc: "Mietwagen am Fährhafen Heraklion in vier Klicks. Eine lokale Partneragentur erwartet Sie mit den Schlüsseln direkt an der Fähre: Zahlung vor Ort, Barzahlung möglich, keine Online-Vorauszahlung.",
      },
    },
    content: {
      en: {
        h1: "Car rental at Heraklion Port",
        intro:
          "Heraklion's ferry port sits right on the edge of the city centre and links Crete to Piraeus (Athens) and the Cyclades — Santorini, Mykonos and beyond. Stepping off the boat straight into your own car is the fastest way to head for Knossos or the beaches.",
        deliveryTitle: "Picking up your car off the ferry",
        delivery:
          "The local partner agency delivers the car to Heraklion port and meets you as you disembark. Give the ferry's arrival time in the request; port delivery is free within the Heraklion area.",
        tips: [
          {
            h: "Meet-and-greet at the port",
            p: "The car is brought to the port and handed over on arrival — no walk into the city for the keys.",
          },
          {
            h: "Pay on arrival",
            p: "No online prepayment. You pay the agency on pick-up, cash or card, with a refundable deposit on the car.",
          },
        ],
        faqTitle: "Heraklion Port car rental — FAQ",
        faq: [
          {
            q: "Can I collect a rental car at Heraklion port?",
            a: "Yes. The local partner delivers the car to the port and meets you off the ferry, so you drive away directly.",
          },
          {
            q: "Is the port close to Heraklion centre?",
            a: "Yes — the ferry port is on the edge of the city centre, within walking distance of the old harbour.",
          },
          {
            q: "Which ferries use Heraklion port?",
            a: "Heraklion links to Piraeus (Athens) and several Cyclades islands, including Santorini and Mykonos, depending on the season.",
          },
        ],
      },
      fr: {
        h1: "Location de voiture au port d'Héraklion",
        intro:
          "Le port de ferry d'Héraklion se trouve en bordure immédiate du centre-ville et relie la Crète au Pirée (Athènes) et aux Cyclades — Santorin, Mykonos et au-delà. Descendre du bateau directement dans sa propre voiture est le moyen le plus rapide de filer vers Knossos ou les plages.",
        deliveryTitle: "Récupérer votre voiture à la descente du ferry",
        delivery:
          "L'agence partenaire locale livre la voiture au port d'Héraklion et vous accueille au débarquement. Indiquez l'heure d'arrivée du ferry dans la demande ; la livraison au port est gratuite dans la région d'Héraklion.",
        tips: [
          {
            h: "Remise en main propre au port",
            p: "La voiture est amenée au port et remise à l'arrivée — pas de marche jusqu'en ville pour les clés.",
          },
          {
            h: "Paiement à l'arrivée",
            p: "Aucun prépaiement en ligne. Vous payez l'agence à la prise en main, espèces ou carte, avec une caution sur le véhicule.",
          },
        ],
        faqTitle: "Location de voiture port d'Héraklion — FAQ",
        faq: [
          {
            q: "Puis-je récupérer une voiture de location au port d'Héraklion ?",
            a: "Oui. Le partenaire local livre la voiture au port et vous accueille à la descente du ferry, pour repartir directement.",
          },
          {
            q: "Le port est-il proche du centre d'Héraklion ?",
            a: "Oui — le port de ferry est en bordure du centre-ville, à distance de marche du vieux port.",
          },
          {
            q: "Quels ferries utilisent le port d'Héraklion ?",
            a: "Héraklion est relié au Pirée (Athènes) et à plusieurs îles des Cyclades, dont Santorin et Mykonos, selon la saison.",
          },
        ],
      },
      de: {
        h1: "Mietwagen am Hafen Heraklion",
        intro:
          "Der Fährhafen von Heraklion liegt direkt am Rand des Stadtzentrums und verbindet Kreta mit Piräus (Athen) und den Kykladen — Santorin, Mykonos und mehr. Direkt vom Schiff ins eigene Auto zu steigen ist der schnellste Weg nach Knossos oder zu den Stränden.",
        deliveryTitle: "Ihren Wagen direkt von der Fähre abholen",
        delivery:
          "Die lokale Partneragentur liefert den Wagen zum Hafen Heraklion und empfängt Sie beim Aussteigen. Geben Sie die Ankunftszeit der Fähre in der Anfrage an; die Lieferung zum Hafen ist im Raum Heraklion kostenlos.",
        tips: [
          {
            h: "Persönliche Übergabe am Hafen",
            p: "Der Wagen wird zum Hafen gebracht und bei der Ankunft übergeben — kein Weg in die Stadt für die Schlüssel.",
          },
          {
            h: "Zahlung bei Ankunft",
            p: "Keine Online-Vorauszahlung. Sie zahlen die Agentur bei der Übernahme, bar oder mit Karte, mit einer Kaution auf dem Fahrzeug.",
          },
        ],
        faqTitle: "Mietwagen Hafen Heraklion — FAQ",
        faq: [
          {
            q: "Kann ich einen Mietwagen am Hafen Heraklion abholen?",
            a: "Ja. Der lokale Partner liefert den Wagen zum Hafen und empfängt Sie an der Fähre, sodass Sie direkt losfahren.",
          },
          {
            q: "Liegt der Hafen nahe am Zentrum von Heraklion?",
            a: "Ja — der Fährhafen liegt am Rand des Stadtzentrums, in Gehweite des alten Hafens.",
          },
          {
            q: "Welche Fähren nutzen den Hafen Heraklion?",
            a: "Heraklion ist mit Piräus (Athen) und mehreren Kykladeninseln verbunden, darunter Santorin und Mykonos, je nach Saison.",
          },
        ],
      },
    },
  },
];

export function getCarLocation(slug: string): CarLocation | null {
  return CAR_LOCATIONS.find((l) => l.slug === slug) ?? null;
}

export const CAR_LOCATION_SLUGS = CAR_LOCATIONS.map((l) => l.slug);
