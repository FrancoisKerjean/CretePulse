// scripts/add-article-promo-i18n.mjs
// Injecte le namespace "articlePromo" (33 feuilles) comme PREMIÈRE clé racine de chaque
// src/messages/<locale>.json. Insertion textuelle pour un diff minimal, idempotent
// (skip si déjà présent). Même mécanisme que add-activity-nudge-i18n.mjs, avec des
// garde-fous : 22 locales, 33 feuilles, variables ICU conservées, pas d'anglais
// recopié, pas de tiret cadratin, aucun titre au-delà de 45 caractères (mobile).
// Spec : docs/superpowers/specs/2026-09-07-article-service-promos-design.md §4
// Lancer : node scripts/add-article-promo-i18n.mjs
//   --update : le namespace existe déjà, réécrire les feuilles dont la valeur diffère
//              de TRANSLATIONS (les blocs ci-dessous restent la source de vérité).
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const UPDATE = process.argv.includes("--update");
const TITLE_MAX = 45;

const DIR = "src/messages";

const TRANSLATIONS = {
  en: {
    disclosure: { car: "Local partner", van: "van.crete.direct", bus: "Official KTEL timetables" },
    car: {
      v1: { title: "A car for this trip?", line: "Local agency, quote in four steps, no prepayment.", cta: "Get a quote" },
      v2: { title: "The bus does not go everywhere here.", line: "Rent from an agency on the island. Price stated upfront, airport pickup available.", cta: "See prices" },
      v3: { title: "You have the guide. The drive is next.", line: "Local rental car, fast reply, cash accepted.", cta: "Request a quote" },
    },
    van: {
      corridor: {
        v1: { title: "Shared van {from} to {to}", line: "From {price} € a seat. Licensed local driver, no payment now.", cta: "Join a group" },
        v2: { title: "{to} from the airport, without renting a car", line: "Shared van from {price} € a seat. Departure confirmed once the group fills.", cta: "See departures" },
      },
      generic: {
        v1: { title: "Airport to your town, by shared van", line: "{count} routes from Heraklion and Chania, from {price} € a seat.", cta: "See routes" },
        v2: { title: "No car? Share a van.", line: "Local driver, no payment at booking.", cta: "See routes" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Getting there by bus from {from}", line: "Today's timetable, journey time and ticket price.", cta: "See timetables" },
        v2: { title: "The {from} to {to} bus, today", line: "Connections and fares, from KTEL timetables.", cta: "Open the planner" },
      },
      generic: { title: "Getting around Crete by bus", line: "Timetables, fares and connections of the KTEL networks.", cta: "See timetables" },
    },
  },
  fr: {
    disclosure: { car: "Partenaire local", van: "van.crete.direct", bus: "Horaires officiels KTEL" },
    car: {
      v1: { title: "Une voiture pour ce trajet ?", line: "Agence locale, devis en quatre étapes, aucun prépaiement.", cta: "Obtenir un devis" },
      v2: { title: "Le bus ne va pas partout ici.", line: "Louez auprès d'une agence de l'île. Prix annoncé, retrait à l'aéroport possible.", cta: "Voir les prix" },
      v3: { title: "Vous avez le guide. Reste le trajet.", line: "Voiture de location locale, réponse rapide, espèces acceptées.", cta: "Demander un devis" },
    },
    van: {
      corridor: {
        v1: { title: "Van partagé {from} vers {to}", line: "Dès {price} € la place. Chauffeur local licencié, aucun paiement maintenant.", cta: "Rejoindre un groupe" },
        v2: { title: "{to} depuis l'aéroport, sans louer de voiture", line: "Van partagé dès {price} € la place. Le départ est confirmé quand le groupe se remplit.", cta: "Voir les départs" },
      },
      generic: {
        v1: { title: "De l'aéroport à votre ville, en van partagé", line: "{count} trajets depuis Héraklion et La Canée, dès {price} € la place.", cta: "Voir les trajets" },
        v2: { title: "Pas de voiture ? Partagez un van.", line: "Chauffeur local, aucun paiement à la réservation.", cta: "Voir les trajets" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Y aller en bus depuis {from}", line: "Horaires du jour, durée et prix du billet.", cta: "Voir les horaires" },
        v2: { title: "Le bus {from} vers {to}, aujourd'hui", line: "Correspondances et prix, d'après les horaires KTEL.", cta: "Ouvrir le planificateur" },
      },
      generic: { title: "Se déplacer en bus en Crète", line: "Horaires, prix et correspondances des réseaux KTEL.", cta: "Voir les horaires" },
    },
  },
  de: {
    disclosure: { car: "Lokaler Partner", van: "van.crete.direct", bus: "Offizielle KTEL-Fahrpläne" },
    car: {
      v1: { title: "Ein Auto für diese Strecke?", line: "Lokale Agentur, Angebot in vier Schritten, keine Vorauszahlung.", cta: "Angebot anfordern" },
      v2: { title: "Der Bus fährt hier nicht überall hin.", line: "Mieten Sie bei einer Agentur der Insel. Preis vorab genannt, Abholung am Flughafen möglich.", cta: "Preise ansehen" },
      v3: { title: "Der Guide ist da. Jetzt der Weg.", line: "Lokaler Mietwagen, schnelle Antwort, Barzahlung möglich.", cta: "Angebot anfragen" },
    },
    van: {
      corridor: {
        v1: { title: "Sammelvan {from} nach {to}", line: "Ab {price} € pro Platz. Lizenzierter lokaler Fahrer, keine Zahlung jetzt.", cta: "Gruppe beitreten" },
        v2: { title: "{to} vom Flughafen aus, ohne Mietwagen", line: "Sammelvan ab {price} € pro Platz. Die Abfahrt wird bestätigt, sobald die Gruppe voll ist.", cta: "Abfahrten ansehen" },
      },
      generic: {
        v1: { title: "Vom Flughafen in Ihren Ort, im Sammelvan", line: "{count} Strecken ab Heraklion und Chania, ab {price} € pro Platz.", cta: "Strecken ansehen" },
        v2: { title: "Kein Auto? Teilen Sie sich einen Van.", line: "Lokaler Fahrer, keine Zahlung bei der Buchung.", cta: "Strecken ansehen" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Mit dem Bus ab {from}", line: "Fahrplan des Tages, Fahrzeit und Ticketpreis.", cta: "Fahrpläne ansehen" },
        v2: { title: "Der Bus {from} nach {to}, heute", line: "Verbindungen und Preise, nach den KTEL-Fahrplänen.", cta: "Planer öffnen" },
      },
      generic: { title: "Mit dem Bus durch Kreta", line: "Fahrpläne, Preise und Verbindungen der KTEL-Netze.", cta: "Fahrpläne ansehen" },
    },
  },
  el: {
    disclosure: { car: "Τοπικός συνεργάτης", van: "van.crete.direct", bus: "Επίσημα δρομολόγια ΚΤΕΛ" },
    car: {
      v1: { title: "Αυτοκίνητο για αυτή τη διαδρομή;", line: "Τοπικό γραφείο, προσφορά σε τέσσερα βήματα, καμία προπληρωμή.", cta: "Ζητήστε προσφορά" },
      v2: { title: "Το λεωφορείο δεν πάει παντού εδώ.", line: "Νοικιάστε από γραφείο του νησιού. Τιμή γνωστή από πριν, παραλαβή στο αεροδρόμιο.", cta: "Δείτε τιμές" },
      v3: { title: "Έχετε τον οδηγό. Μένει η διαδρομή.", line: "Τοπικό ενοικιαζόμενο αυτοκίνητο, γρήγορη απάντηση, δεκτά μετρητά.", cta: "Ζητήστε προσφορά" },
    },
    van: {
      corridor: {
        v1: { title: "Κοινόχρηστο βαν {from} προς {to}", line: "Από {price} € η θέση. Αδειοδοτημένος τοπικός οδηγός, καμία πληρωμή τώρα.", cta: "Συμμετοχή σε ομάδα" },
        v2: { title: "{to} από το αεροδρόμιο, χωρίς ενοικίαση", line: "Κοινόχρηστο βαν από {price} € η θέση. Η αναχώρηση επιβεβαιώνεται όταν γεμίσει η ομάδα.", cta: "Δείτε αναχωρήσεις" },
      },
      generic: {
        v1: { title: "Αεροδρόμιο προς την πόλη σας, με κοινό βαν", line: "{count} διαδρομές από Ηράκλειο και Χανιά, από {price} € η θέση.", cta: "Δείτε διαδρομές" },
        v2: { title: "Χωρίς αυτοκίνητο; Μοιραστείτε ένα βαν.", line: "Τοπικός οδηγός, καμία πληρωμή κατά την κράτηση.", cta: "Δείτε διαδρομές" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Με λεωφορείο από {from}", line: "Σημερινά δρομολόγια, διάρκεια και τιμή εισιτηρίου.", cta: "Δείτε δρομολόγια" },
        v2: { title: "Το λεωφορείο {from} προς {to}, σήμερα", line: "Ανταποκρίσεις και τιμές, σύμφωνα με τα δρομολόγια ΚΤΕΛ.", cta: "Άνοιγμα σχεδιαστή" },
      },
      generic: { title: "Μετακίνηση με λεωφορείο στην Κρήτη", line: "Δρομολόγια, τιμές και ανταποκρίσεις των δικτύων ΚΤΕΛ.", cta: "Δείτε δρομολόγια" },
    },
  },
  es: {
    disclosure: { car: "Socio local", van: "van.crete.direct", bus: "Horarios oficiales KTEL" },
    car: {
      v1: { title: "¿Un coche para este trayecto?", line: "Agencia local, presupuesto en cuatro pasos, sin pago por adelantado.", cta: "Pedir presupuesto" },
      v2: { title: "El autobús no llega a todas partes aquí.", line: "Alquila en una agencia de la isla. Precio indicado de antemano, recogida en el aeropuerto posible.", cta: "Ver precios" },
      v3: { title: "Ya tienes la guía. Falta el trayecto.", line: "Coche de alquiler local, respuesta rápida, se acepta efectivo.", cta: "Solicitar presupuesto" },
    },
    van: {
      corridor: {
        v1: { title: "Furgoneta compartida de {from} a {to}", line: "Desde {price} € por plaza. Conductor local con licencia, sin pago ahora.", cta: "Unirse a un grupo" },
        v2: { title: "{to} desde el aeropuerto, sin alquilar coche", line: "Furgoneta compartida desde {price} € por plaza. La salida se confirma cuando el grupo se completa.", cta: "Ver salidas" },
      },
      generic: {
        v1: { title: "Aeropuerto a tu pueblo, furgoneta compartida", line: "{count} rutas desde Heraklion y Chania, desde {price} € por plaza.", cta: "Ver rutas" },
        v2: { title: "¿Sin coche? Comparte una furgoneta.", line: "Conductor local, sin pago al reservar.", cta: "Ver rutas" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Llegar en autobús desde {from}", line: "Horarios de hoy, duración y precio del billete.", cta: "Ver horarios" },
        v2: { title: "El autobús de {from} a {to}, hoy", line: "Conexiones y tarifas, según los horarios de KTEL.", cta: "Abrir el planificador" },
      },
      generic: { title: "Moverse en autobús por Creta", line: "Horarios, tarifas y conexiones de las redes KTEL.", cta: "Ver horarios" },
    },
  },
  it: {
    disclosure: { car: "Partner locale", van: "van.crete.direct", bus: "Orari ufficiali KTEL" },
    car: {
      v1: { title: "Un'auto per questo tragitto?", line: "Agenzia locale, preventivo in quattro passaggi, nessun pagamento anticipato.", cta: "Richiedi un preventivo" },
      v2: { title: "Qui l'autobus non arriva ovunque.", line: "Noleggia da un'agenzia dell'isola. Prezzo indicato in anticipo, ritiro in aeroporto possibile.", cta: "Vedi i prezzi" },
      v3: { title: "Hai la guida. Manca il viaggio.", line: "Auto a noleggio locale, risposta rapida, contanti accettati.", cta: "Chiedi un preventivo" },
    },
    van: {
      corridor: {
        v1: { title: "Van condiviso da {from} a {to}", line: "Da {price} € a posto. Autista locale autorizzato, nessun pagamento ora.", cta: "Unisciti a un gruppo" },
        v2: { title: "{to} dall'aeroporto, senza noleggiare un'auto", line: "Van condiviso da {price} € a posto. La partenza è confermata quando il gruppo è completo.", cta: "Vedi le partenze" },
      },
      generic: {
        v1: { title: "Dall'aeroporto al tuo paese, in van condiviso", line: "{count} tratte da Heraklion e Chania, da {price} € a posto.", cta: "Vedi le tratte" },
        v2: { title: "Senza auto? Condividi un van.", line: "Autista locale, nessun pagamento alla prenotazione.", cta: "Vedi le tratte" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Arrivarci in autobus da {from}", line: "Orari di oggi, durata e prezzo del biglietto.", cta: "Vedi gli orari" },
        v2: { title: "L'autobus da {from} a {to}, oggi", line: "Coincidenze e tariffe, secondo gli orari KTEL.", cta: "Apri il pianificatore" },
      },
      generic: { title: "Spostarsi in autobus a Creta", line: "Orari, tariffe e coincidenze delle reti KTEL.", cta: "Vedi gli orari" },
    },
  },
  pt: {
    disclosure: { car: "Parceiro local", van: "van.crete.direct", bus: "Horários oficiais KTEL" },
    car: {
      v1: { title: "Um carro para este trajeto?", line: "Agência local, orçamento em quatro passos, sem pré-pagamento.", cta: "Pedir orçamento" },
      v2: { title: "O autocarro não chega a todo o lado aqui.", line: "Alugue numa agência da ilha. Preço indicado à partida, levantamento no aeroporto possível.", cta: "Ver preços" },
      v3: { title: "Já tem o guia. Falta o trajeto.", line: "Carro de aluguer local, resposta rápida, dinheiro aceite.", cta: "Solicitar orçamento" },
    },
    van: {
      corridor: {
        v1: { title: "Carrinha partilhada de {from} para {to}", line: "Desde {price} € por lugar. Motorista local licenciado, sem pagamento agora.", cta: "Juntar-se a um grupo" },
        v2: { title: "{to} a partir do aeroporto, sem alugar carro", line: "Carrinha partilhada desde {price} € por lugar. A partida é confirmada quando o grupo fica completo.", cta: "Ver partidas" },
      },
      generic: {
        v1: { title: "Do aeroporto à sua vila, carrinha partilhada", line: "{count} rotas a partir de Heraklion e Chania, desde {price} € por lugar.", cta: "Ver rotas" },
        v2: { title: "Sem carro? Partilhe uma carrinha.", line: "Motorista local, sem pagamento na reserva.", cta: "Ver rotas" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Ir de autocarro a partir de {from}", line: "Horários de hoje, duração e preço do bilhete.", cta: "Ver horários" },
        v2: { title: "O autocarro de {from} para {to}, hoje", line: "Ligações e tarifas, segundo os horários da KTEL.", cta: "Abrir o planeador" },
      },
      generic: { title: "Deslocar-se de autocarro em Creta", line: "Horários, tarifas e ligações das redes KTEL.", cta: "Ver horários" },
    },
  },
  nl: {
    disclosure: { car: "Lokale partner", van: "van.crete.direct", bus: "Officiële KTEL-dienstregelingen" },
    car: {
      v1: { title: "Een auto voor deze route?", line: "Lokaal verhuurbedrijf, offerte in vier stappen, geen vooruitbetaling.", cta: "Offerte aanvragen" },
      v2: { title: "De bus komt hier niet overal.", line: "Huur bij een verhuurder op het eiland. Prijs vooraf bekend, ophalen op de luchthaven mogelijk.", cta: "Prijzen bekijken" },
      v3: { title: "De gids heb je. Nu nog de rit.", line: "Lokale huurauto, snel antwoord, contant betalen kan.", cta: "Offerte opvragen" },
    },
    van: {
      corridor: {
        v1: { title: "Gedeelde minibus van {from} naar {to}", line: "Vanaf {price} € per plaats. Erkende lokale chauffeur, nu niets betalen.", cta: "Bij een groep aansluiten" },
        v2: { title: "{to} vanaf de luchthaven, zonder huurauto", line: "Gedeelde minibus vanaf {price} € per plaats. Het vertrek wordt bevestigd zodra de groep vol is.", cta: "Vertrektijden bekijken" },
      },
      generic: {
        v1: { title: "Van luchthaven naar jouw plaats, per minibus", line: "{count} routes vanuit Heraklion en Chania, vanaf {price} € per plaats.", cta: "Routes bekijken" },
        v2: { title: "Geen auto? Deel een minibus.", line: "Lokale chauffeur, geen betaling bij het boeken.", cta: "Routes bekijken" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Met de bus vanuit {from}", line: "Dienstregeling van vandaag, reistijd en ticketprijs.", cta: "Dienstregeling bekijken" },
        v2: { title: "De bus van {from} naar {to}, vandaag", line: "Overstappen en tarieven, volgens de KTEL-dienstregelingen.", cta: "Planner openen" },
      },
      generic: { title: "Met de bus door Kreta", line: "Dienstregelingen, tarieven en overstappen van de KTEL-netwerken.", cta: "Dienstregeling bekijken" },
    },
  },
  sv: {
    disclosure: { car: "Lokal partner", van: "van.crete.direct", bus: "Officiella KTEL-tidtabeller" },
    car: {
      v1: { title: "En bil för den här resan?", line: "Lokal uthyrare, offert i fyra steg, ingen förskottsbetalning.", cta: "Begär offert" },
      v2: { title: "Bussen går inte överallt här.", line: "Hyr hos en uthyrare på ön. Priset anges i förväg, upphämtning på flygplatsen möjlig.", cta: "Se priser" },
      v3: { title: "Guiden har du. Nu återstår resan.", line: "Lokal hyrbil, snabbt svar, kontanter accepteras.", cta: "Be om offert" },
    },
    van: {
      corridor: {
        v1: { title: "Delad minibuss {from} till {to}", line: "Från {price} € per plats. Licensierad lokal förare, ingen betalning nu.", cta: "Gå med i en grupp" },
        v2: { title: "{to} från flygplatsen, utan att hyra bil", line: "Delad minibuss från {price} € per plats. Avgången bekräftas när gruppen är full.", cta: "Se avgångar" },
      },
      generic: {
        v1: { title: "Flygplatsen till din ort, med delad minibuss", line: "{count} sträckor från Heraklion och Chania, från {price} € per plats.", cta: "Se sträckor" },
        v2: { title: "Ingen bil? Dela en minibuss.", line: "Lokal förare, ingen betalning vid bokning.", cta: "Se sträckor" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Ta bussen från {from}", line: "Dagens tidtabell, restid och biljettpris.", cta: "Se tidtabeller" },
        v2: { title: "Bussen {from} till {to}, i dag", line: "Byten och priser, enligt KTEL:s tidtabeller.", cta: "Öppna reseplaneraren" },
      },
      generic: { title: "Resa med buss på Kreta", line: "Tidtabeller, priser och byten i KTEL-näten.", cta: "Se tidtabeller" },
    },
  },
  da: {
    disclosure: { car: "Lokal partner", van: "van.crete.direct", bus: "Officielle KTEL-køreplaner" },
    car: {
      v1: { title: "En bil til denne tur?", line: "Lokalt udlejningsfirma, tilbud i fire trin, ingen forudbetaling.", cta: "Få et tilbud" },
      v2: { title: "Bussen kører ikke overalt her.", line: "Lej hos et udlejningsfirma på øen. Prisen oplyses på forhånd, afhentning i lufthavnen mulig.", cta: "Se priser" },
      v3: { title: "Guiden har du. Nu mangler turen.", line: "Lokal lejebil, hurtigt svar, kontanter accepteres.", cta: "Bed om et tilbud" },
    },
    van: {
      corridor: {
        v1: { title: "Delt minibus {from} til {to}", line: "Fra {price} € pr. plads. Lokal chauffør med licens, ingen betaling nu.", cta: "Deltag i en gruppe" },
        v2: { title: "{to} fra lufthavnen, uden at leje bil", line: "Delt minibus fra {price} € pr. plads. Afgangen bekræftes, når gruppen er fuld.", cta: "Se afgange" },
      },
      generic: {
        v1: { title: "Fra lufthavnen til din by, i delt minibus", line: "{count} ruter fra Heraklion og Chania, fra {price} € pr. plads.", cta: "Se ruter" },
        v2: { title: "Ingen bil? Del en minibus.", line: "Lokal chauffør, ingen betaling ved booking.", cta: "Se ruter" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Med bus fra {from}", line: "Dagens køreplan, rejsetid og billetpris.", cta: "Se køreplaner" },
        v2: { title: "Bussen {from} til {to}, i dag", line: "Forbindelser og priser, ifølge KTEL's køreplaner.", cta: "Åbn rejseplanlæggeren" },
      },
      generic: { title: "Rundt på Kreta med bus", line: "Køreplaner, priser og forbindelser i KTEL-nettene.", cta: "Se køreplaner" },
    },
  },
  no: {
    disclosure: { car: "Lokal partner", van: "van.crete.direct", bus: "Offisielle KTEL-rutetabeller" },
    car: {
      v1: { title: "En bil til denne turen?", line: "Lokalt utleiefirma, tilbud i fire steg, ingen forskuddsbetaling.", cta: "Få et tilbud" },
      v2: { title: "Bussen går ikke overalt her.", line: "Lei hos et utleiefirma på øya. Prisen oppgis på forhånd, henting på flyplassen mulig.", cta: "Se priser" },
      v3: { title: "Guiden har du. Nå gjenstår turen.", line: "Lokal leiebil, raskt svar, kontanter godtas.", cta: "Be om et tilbud" },
    },
    van: {
      corridor: {
        v1: { title: "Delt minibuss {from} til {to}", line: "Fra {price} € per plass. Lokal sjåfør med løyve, ingen betaling nå.", cta: "Bli med i en gruppe" },
        v2: { title: "{to} fra flyplassen, uten å leie bil", line: "Delt minibuss fra {price} € per plass. Avgangen bekreftes når gruppen er full.", cta: "Se avganger" },
      },
      generic: {
        v1: { title: "Fra flyplassen til ditt sted, delt minibuss", line: "{count} strekninger fra Heraklion og Chania, fra {price} € per plass.", cta: "Se strekninger" },
        v2: { title: "Ingen bil? Del en minibuss.", line: "Lokal sjåfør, ingen betaling ved bestilling.", cta: "Se strekninger" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Med buss fra {from}", line: "Dagens rutetabell, reisetid og billettpris.", cta: "Se rutetabeller" },
        v2: { title: "Bussen {from} til {to}, i dag", line: "Overganger og priser, etter KTELs rutetabeller.", cta: "Åpne reiseplanleggeren" },
      },
      generic: { title: "Rundt på Kreta med buss", line: "Rutetabeller, priser og overganger i KTEL-nettene.", cta: "Se rutetabeller" },
    },
  },
  fi: {
    disclosure: { car: "Paikallinen kumppani", van: "van.crete.direct", bus: "Viralliset KTEL-aikataulut" },
    car: {
      v1: { title: "Auto tälle matkalle?", line: "Paikallinen vuokraamo, tarjous neljässä vaiheessa, ei ennakkomaksua.", cta: "Pyydä tarjous" },
      v2: { title: "Bussi ei kulje täällä kaikkialle.", line: "Vuokraa saaren vuokraamosta. Hinta kerrotaan etukäteen, nouto lentokentältä mahdollinen.", cta: "Katso hinnat" },
      v3: { title: "Opas on käsissäsi. Jäljellä on matka.", line: "Paikallinen vuokra-auto, nopea vastaus, käteinen käy.", cta: "Pyydä tarjous" },
    },
    van: {
      corridor: {
        v1: { title: "Jaettu pikkubussi {from} ja {to} välillä", line: "Alkaen {price} € paikalta. Luvallinen paikallinen kuljettaja, ei maksua nyt.", cta: "Liity ryhmään" },
        v2: { title: "{to} lentokentältä ilman vuokra-autoa", line: "Jaettu pikkubussi alkaen {price} € paikalta. Lähtö vahvistetaan, kun ryhmä on täynnä.", cta: "Katso lähdöt" },
      },
      generic: {
        v1: { title: "Lentokentältä kohteeseesi, jaettu pikkubussi", line: "{count} reittiä Heraklionista ja Chaniasta, alkaen {price} € paikalta.", cta: "Katso reitit" },
        v2: { title: "Ei autoa? Jaa pikkubussi.", line: "Paikallinen kuljettaja, ei maksua varattaessa.", cta: "Katso reitit" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Bussilla kohteesta {from}", line: "Päivän aikataulu, matka-aika ja lipun hinta.", cta: "Katso aikataulut" },
        v2: { title: "Bussi {from} ja {to} välillä, tänään", line: "Vaihdot ja hinnat KTEL-aikataulujen mukaan.", cta: "Avaa reittiopas" },
      },
      generic: { title: "Bussilla Kreetalla", line: "KTEL-verkkojen aikataulut, hinnat ja vaihdot.", cta: "Katso aikataulut" },
    },
  },
  pl: {
    disclosure: { car: "Lokalny partner", van: "van.crete.direct", bus: "Oficjalne rozkłady KTEL" },
    car: {
      v1: { title: "Samochód na tę trasę?", line: "Lokalna wypożyczalnia, wycena w czterech krokach, bez przedpłaty.", cta: "Poproś o wycenę" },
      v2: { title: "Autobus nie dojeżdża tu wszędzie.", line: "Wynajmij w wypożyczalni na wyspie. Cena podana z góry, odbiór na lotnisku możliwy.", cta: "Zobacz ceny" },
      v3: { title: "Przewodnik już masz. Została trasa.", line: "Lokalny samochód na wynajem, szybka odpowiedź, gotówka akceptowana.", cta: "Zapytaj o wycenę" },
    },
    van: {
      corridor: {
        v1: { title: "Wspólny bus z {from} do {to}", line: "Od {price} € za miejsce. Licencjonowany lokalny kierowca, bez płatności teraz.", cta: "Dołącz do grupy" },
        v2: { title: "{to} z lotniska, bez wynajmu samochodu", line: "Wspólny bus od {price} € za miejsce. Wyjazd potwierdzany, gdy grupa się zapełni.", cta: "Zobacz odjazdy" },
      },
      generic: {
        v1: { title: "Z lotniska do Twojego miasta, wspólnym busem", line: "{count} tras z Heraklionu i Chanii, od {price} € za miejsce.", cta: "Zobacz trasy" },
        v2: { title: "Jedź wspólnym busem.", line: "Lokalny kierowca, bez płatności przy rezerwacji.", cta: "Zobacz trasy" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Dojazd autobusem z {from}", line: "Dzisiejszy rozkład, czas przejazdu i cena biletu.", cta: "Zobacz rozkłady" },
        v2: { title: "Autobus z {from} do {to}, dzisiaj", line: "Przesiadki i ceny, według rozkładów KTEL.", cta: "Otwórz planer" },
      },
      generic: { title: "Autobusem po Krecie", line: "Rozkłady, ceny i przesiadki sieci KTEL.", cta: "Zobacz rozkłady" },
    },
  },
  cs: {
    disclosure: { car: "Místní partner", van: "van.crete.direct", bus: "Oficiální jízdní řády KTEL" },
    car: {
      v1: { title: "Auto na tuto cestu?", line: "Místní půjčovna, nabídka ve čtyřech krocích, bez platby předem.", cta: "Získat nabídku" },
      v2: { title: "Autobus tu nejezdí všude.", line: "Půjčte si u půjčovny na ostrově. Cena známá předem, vyzvednutí na letišti možné.", cta: "Zobrazit ceny" },
      v3: { title: "Průvodce máte. Zbývá cesta.", line: "Místní půjčovna aut, rychlá odpověď, hotovost přijímána.", cta: "Požádat o nabídku" },
    },
    van: {
      corridor: {
        v1: { title: "Sdílený van z {from} do {to}", line: "Od {price} € za místo. Místní řidič s licencí, bez platby teď.", cta: "Přidat se ke skupině" },
        v2: { title: "{to} z letiště, bez půjčení auta", line: "Sdílený van od {price} € za místo. Odjezd je potvrzen, jakmile se skupina naplní.", cta: "Zobrazit odjezdy" },
      },
      generic: {
        v1: { title: "Z letiště do vašeho města sdíleným vanem", line: "{count} tras z Heraklionu a Chanie, od {price} € za místo.", cta: "Zobrazit trasy" },
        v2: { title: "Bez auta? Sdílejte van.", line: "Místní řidič, bez platby při rezervaci.", cta: "Zobrazit trasy" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Autobusem z {from}", line: "Dnešní jízdní řád, doba jízdy a cena jízdenky.", cta: "Zobrazit jízdní řády" },
        v2: { title: "Autobus z {from} do {to}, dnes", line: "Přestupy a ceny podle jízdních řádů KTEL.", cta: "Otevřít plánovač" },
      },
      generic: { title: "Autobusem po Krétě", line: "Jízdní řády, ceny a přestupy sítí KTEL.", cta: "Zobrazit jízdní řády" },
    },
  },
  hu: {
    disclosure: { car: "Helyi partner", van: "van.crete.direct", bus: "Hivatalos KTEL menetrendek" },
    car: {
      v1: { title: "Autó erre az útra?", line: "Helyi kölcsönző, ajánlat négy lépésben, előleg nélkül.", cta: "Ajánlatot kérek" },
      v2: { title: "A busz itt nem jár mindenhová.", line: "Béreljen a sziget egyik kölcsönzőjénél. Az ár előre ismert, átvétel a repülőtéren lehetséges.", cta: "Árak megtekintése" },
      v3: { title: "Az útikalauz megvan. Már csak az út hiányzik.", line: "Helyi bérautó, gyors válasz, készpénz elfogadva.", cta: "Ajánlatkérés" },
    },
    van: {
      corridor: {
        v1: { title: "Közös kisbusz {from} és {to} között", line: "{price} €-tól helyenként. Engedéllyel rendelkező helyi sofőr, most nincs fizetés.", cta: "Csatlakozom egy csoporthoz" },
        v2: { title: "{to} a repülőtérről, autóbérlés nélkül", line: "Közös kisbusz {price} €-tól helyenként. Az indulás akkor véglegesedik, amikor a csoport betelik.", cta: "Indulások megtekintése" },
      },
      generic: {
        v1: { title: "A reptérről a városodba, közös kisbusszal", line: "{count} útvonal Heraklionból és Chaniából, {price} €-tól helyenként.", cta: "Útvonalak megtekintése" },
        v2: { title: "Nincs autó? Ossz meg egy kisbuszt.", line: "Helyi sofőr, foglaláskor nincs fizetés.", cta: "Útvonalak megtekintése" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Busszal {from} felől", line: "Mai menetrend, menetidő és jegyár.", cta: "Menetrendek megtekintése" },
        v2: { title: "A {from} és {to} közötti busz, ma", line: "Átszállások és árak, a KTEL menetrendjei alapján.", cta: "Útvonaltervező megnyitása" },
      },
      generic: { title: "Busszal Krétán", line: "A KTEL hálózatok menetrendjei, árai és átszállásai.", cta: "Menetrendek megtekintése" },
    },
  },
  ro: {
    disclosure: { car: "Partener local", van: "van.crete.direct", bus: "Orare oficiale KTEL" },
    car: {
      v1: { title: "O mașină pentru acest traseu?", line: "Agenție locală, ofertă în patru pași, fără plată în avans.", cta: "Cere o ofertă" },
      v2: { title: "Autobuzul nu ajunge peste tot aici.", line: "Închiriază de la o agenție de pe insulă. Preț anunțat dinainte, preluare de la aeroport posibilă.", cta: "Vezi prețurile" },
      v3: { title: "Ghidul îl ai. Mai rămâne drumul.", line: "Mașină de închiriat locală, răspuns rapid, numerar acceptat.", cta: "Solicită o ofertă" },
    },
    van: {
      corridor: {
        v1: { title: "Microbuz partajat de la {from} la {to}", line: "De la {price} € locul. Șofer local autorizat, nicio plată acum.", cta: "Alătură-te unui grup" },
        v2: { title: "{to} de la aeroport, fără mașină închiriată", line: "Microbuz partajat de la {price} € locul. Plecarea se confirmă când grupul se completează.", cta: "Vezi plecările" },
      },
      generic: {
        v1: { title: "De la aeroport în oraș, cu microbuz partajat", line: "{count} rute din Heraklion și Chania, de la {price} € locul.", cta: "Vezi rutele" },
        v2: { title: "Fără mașină? Împarte un microbuz.", line: "Șofer local, nicio plată la rezervare.", cta: "Vezi rutele" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Cu autobuzul din {from}", line: "Orarul zilei, durata și prețul biletului.", cta: "Vezi orarele" },
        v2: { title: "Autobuzul de la {from} la {to}, astăzi", line: "Legături și tarife, după orarele KTEL.", cta: "Deschide planificatorul" },
      },
      generic: { title: "Cu autobuzul prin Creta", line: "Orare, tarife și legături ale rețelelor KTEL.", cta: "Vezi orarele" },
    },
  },
  tr: {
    disclosure: { car: "Yerel ortak", van: "van.crete.direct", bus: "Resmî KTEL tarifeleri" },
    car: {
      v1: { title: "Bu yolculuk için araba mı lazım?", line: "Yerel acente, dört adımda teklif, ön ödeme yok.", cta: "Teklif al" },
      v2: { title: "Otobüs burada her yere gitmiyor.", line: "Adadaki bir acenteden kiralayın. Fiyat baştan belli, havalimanından teslim mümkün.", cta: "Fiyatları gör" },
      v3: { title: "Rehber elinizde. Sıra yolda.", line: "Yerel kiralık araba, hızlı yanıt, nakit kabul edilir.", cta: "Teklif iste" },
    },
    van: {
      corridor: {
        v1: { title: "{from} ile {to} arası paylaşımlı minibüs", line: "Koltuk başına {price} €'dan başlayan. Lisanslı yerel sürücü, şimdi ödeme yok.", cta: "Bir gruba katıl" },
        v2: { title: "Havalimanından {to}, araba kiralamadan", line: "Koltuk başına {price} €'dan başlayan paylaşımlı minibüs. Grup dolunca kalkış onaylanır.", cta: "Kalkışları gör" },
      },
      generic: {
        v1: { title: "Havalimanından kasabanıza, ortak minibüsle", line: "Kandiye ve Hanya çıkışlı {count} güzergâh, koltuk başına {price} €'dan başlayan.", cta: "Güzergâhları gör" },
        v2: { title: "Araba yok mu? Minibüsü paylaşın.", line: "Yerel sürücü, rezervasyonda ödeme yok.", cta: "Güzergâhları gör" },
      },
    },
    bus: {
      pair: {
        v1: { title: "{from} çıkışlı otobüsle ulaşım", line: "Bugünün tarifesi, yolculuk süresi ve bilet fiyatı.", cta: "Tarifeleri gör" },
        v2: { title: "{from} ile {to} arası otobüs, bugün", line: "Aktarmalar ve ücretler, KTEL tarifelerine göre.", cta: "Planlayıcıyı aç" },
      },
      generic: { title: "Girit'te otobüsle ulaşım", line: "KTEL ağlarının tarifeleri, ücretleri ve aktarmaları.", cta: "Tarifeleri gör" },
    },
  },
  ru: {
    disclosure: { car: "Местный партнёр", van: "van.crete.direct", bus: "Официальные расписания KTEL" },
    car: {
      v1: { title: "Машина для этой поездки?", line: "Местное агентство, расчёт в четыре шага, без предоплаты.", cta: "Получить расчёт" },
      v2: { title: "Автобус здесь ходит не везде.", line: "Арендуйте у агентства на острове. Цена известна заранее, выдача в аэропорту возможна.", cta: "Смотреть цены" },
      v3: { title: "Путеводитель у вас. Осталась дорога.", line: "Местный прокат авто, быстрый ответ, наличные принимаются.", cta: "Запросить расчёт" },
    },
    van: {
      corridor: {
        v1: { title: "Совместный микроавтобус из {from} в {to}", line: "От {price} € за место. Лицензированный местный водитель, без оплаты сейчас.", cta: "Присоединиться к группе" },
        v2: { title: "{to} из аэропорта, без аренды машины", line: "Совместный микроавтобус от {price} € за место. Отправление подтверждается, когда группа набрана.", cta: "Смотреть отправления" },
      },
      generic: {
        v1: { title: "Из аэропорта в ваш город на микроавтобусе", line: "{count} маршрутов из Ираклиона и Ханьи, от {price} € за место.", cta: "Смотреть маршруты" },
        v2: { title: "Возьмите место в микроавтобусе.", line: "Местный водитель, без оплаты при бронировании.", cta: "Смотреть маршруты" },
      },
    },
    bus: {
      pair: {
        v1: { title: "Как добраться автобусом из {from}", line: "Расписание на сегодня, время в пути и цена билета.", cta: "Смотреть расписание" },
        v2: { title: "Автобус из {from} в {to}, сегодня", line: "Пересадки и тарифы по расписаниям KTEL.", cta: "Открыть планировщик" },
      },
      generic: { title: "По Криту на автобусе", line: "Расписания, тарифы и пересадки сетей KTEL.", cta: "Смотреть расписание" },
    },
  },
  ar: {
    disclosure: { car: "شريك محلي", van: "van.crete.direct", bus: "مواعيد KTEL الرسمية" },
    car: {
      v1: { title: "سيارة لهذه الرحلة؟", line: "وكالة محلية، عرض سعر في أربع خطوات، دون دفع مسبق.", cta: "اطلب عرض سعر" },
      v2: { title: "الحافلة لا تصل إلى كل مكان هنا.", line: "استأجر من وكالة في الجزيرة. السعر معلن مسبقًا، والاستلام من المطار ممكن.", cta: "اطّلع على الأسعار" },
      v3: { title: "الدليل بين يديك. بقي الطريق.", line: "سيارة مستأجرة محلية، رد سريع، الدفع نقدًا مقبول.", cta: "اطلب عرض سعر" },
    },
    van: {
      corridor: {
        v1: { title: "حافلة صغيرة مشتركة من {from} إلى {to}", line: "ابتداءً من {price} € للمقعد. سائق محلي مرخّص، لا دفع الآن.", cta: "انضم إلى مجموعة" },
        v2: { title: "{to} من المطار، دون استئجار سيارة", line: "حافلة صغيرة مشتركة ابتداءً من {price} € للمقعد. يُؤكَّد الانطلاق عند اكتمال المجموعة.", cta: "اطّلع على الانطلاقات" },
      },
      generic: {
        v1: { title: "من المطار إلى بلدتك، بحافلة صغيرة مشتركة", line: "{count} مسارات من هيراكليون وخانيا، ابتداءً من {price} € للمقعد.", cta: "اطّلع على المسارات" },
        v2: { title: "بلا سيارة؟ شارك حافلة صغيرة.", line: "سائق محلي، لا دفع عند الحجز.", cta: "اطّلع على المسارات" },
      },
    },
    bus: {
      pair: {
        v1: { title: "الوصول بالحافلة من {from}", line: "مواعيد اليوم، مدة الرحلة وسعر التذكرة.", cta: "اطّلع على المواعيد" },
        v2: { title: "حافلة {from} إلى {to}، اليوم", line: "التحويلات والأسعار، وفق مواعيد KTEL.", cta: "افتح مخطط الرحلات" },
      },
      generic: { title: "التنقل بالحافلة في كريت", line: "مواعيد وأسعار وتحويلات شبكات KTEL.", cta: "اطّلع على المواعيد" },
    },
  },
  ja: {
    disclosure: { car: "地元パートナー", van: "van.crete.direct", bus: "KTEL公式時刻表" },
    car: {
      v1: { title: "この行程に車は必要ですか？", line: "地元のレンタカー会社、四段階で見積もり、前払いなし。", cta: "見積もりを依頼" },
      v2: { title: "ここではバスがどこへでも行くわけではありません。", line: "島内の会社でレンタル。料金は事前提示、空港受け取りも可能。", cta: "料金を見る" },
      v3: { title: "ガイドは手元に。あとは移動だけ。", line: "地元のレンタカー、返信が早く、現金払い可。", cta: "見積もりを依頼する" },
    },
    van: {
      corridor: {
        v1: { title: "{from}から{to}への乗り合いバン", line: "一席あたり{price}€から。認可を受けた地元ドライバー、今のお支払いは不要。", cta: "グループに参加" },
        v2: { title: "空港から{to}へ、レンタカーなしで", line: "乗り合いバン、一席あたり{price}€から。人数が集まり次第、出発が確定します。", cta: "出発便を見る" },
      },
      generic: {
        v1: { title: "空港から滞在先の町へ、乗り合いバンで", line: "イラクリオンとハニア発の{count}路線、一席あたり{price}€から。", cta: "路線を見る" },
        v2: { title: "車がない？バンを乗り合いで。", line: "地元ドライバー、予約時のお支払いは不要。", cta: "路線を見る" },
      },
    },
    bus: {
      pair: {
        v1: { title: "{from}からバスで行く", line: "本日の時刻表、所要時間、運賃。", cta: "時刻表を見る" },
        v2: { title: "{from}発{to}行きのバス、本日", line: "乗り換えと運賃、KTELの時刻表に基づく。", cta: "経路プランナーを開く" },
      },
      generic: { title: "クレタ島をバスで移動", line: "KTEL各路線網の時刻表、運賃、乗り換え。", cta: "時刻表を見る" },
    },
  },
  ko: {
    disclosure: { car: "현지 파트너", van: "van.crete.direct", bus: "KTEL 공식 시간표" },
    car: {
      v1: { title: "이 여정에 차가 필요하신가요?", line: "현지 업체, 네 단계로 견적, 선결제 없음.", cta: "견적 받기" },
      v2: { title: "이곳은 버스가 어디든 가지는 않습니다.", line: "섬 현지 업체에서 대여하세요. 요금은 사전 안내, 공항 인수 가능.", cta: "요금 보기" },
      v3: { title: "가이드는 준비됐습니다. 남은 건 이동입니다.", line: "현지 렌터카, 빠른 답변, 현금 결제 가능.", cta: "견적 요청" },
    },
    van: {
      corridor: {
        v1: { title: "{from}에서 {to}까지 합승 밴", line: "좌석당 {price}€부터. 허가받은 현지 기사, 지금은 결제 없음.", cta: "그룹에 참여" },
        v2: { title: "공항에서 {to}까지, 렌터카 없이", line: "합승 밴, 좌석당 {price}€부터. 인원이 차면 출발이 확정됩니다.", cta: "출발편 보기" },
      },
      generic: {
        v1: { title: "공항에서 머무는 마을까지, 합승 밴으로", line: "이라클리온과 하니아 출발 {count}개 노선, 좌석당 {price}€부터.", cta: "노선 보기" },
        v2: { title: "차가 없으신가요? 밴을 함께 타세요.", line: "현지 기사, 예약 시 결제 없음.", cta: "노선 보기" },
      },
    },
    bus: {
      pair: {
        v1: { title: "{from}에서 버스로 가기", line: "오늘의 시간표, 소요 시간, 요금.", cta: "시간표 보기" },
        v2: { title: "{from}에서 {to}까지 버스, 오늘", line: "환승과 요금, KTEL 시간표 기준.", cta: "경로 플래너 열기" },
      },
      generic: { title: "크레타에서 버스로 이동하기", line: "KTEL 노선망의 시간표, 요금, 환승 정보.", cta: "시간표 보기" },
    },
  },
  zh: {
    disclosure: { car: "本地合作伙伴", van: "van.crete.direct", bus: "KTEL 官方时刻表" },
    car: {
      v1: { title: "这段行程需要一辆车吗？", line: "本地租车公司，四步获取报价，无需预付。", cta: "获取报价" },
      v2: { title: "这里的公交并非处处可达。", line: "向岛上的租车公司租车。价格事先说明，可在机场取车。", cta: "查看价格" },
      v3: { title: "攻略已备好，接下来是路程。", line: "本地租车，回复迅速，可付现金。", cta: "索取报价" },
    },
    van: {
      corridor: {
        v1: { title: "{from} 到 {to} 的拼车面包车", line: "每座 {price} € 起。持证本地司机，现在无需付款。", cta: "加入拼车" },
        v2: { title: "从机场到 {to}，无需租车", line: "拼车面包车每座 {price} € 起。成团后确认发车。", cta: "查看班次" },
      },
      generic: {
        v1: { title: "从机场到您下榻的小镇，拼车出行", line: "从伊拉克利翁和哈尼亚出发的 {count} 条线路，每座 {price} € 起。", cta: "查看线路" },
        v2: { title: "没有车？拼一辆面包车。", line: "本地司机，预订时无需付款。", cta: "查看线路" },
      },
    },
    bus: {
      pair: {
        v1: { title: "从 {from} 乘公交前往", line: "今日时刻表、行程时间和票价。", cta: "查看时刻表" },
        v2: { title: "今日 {from} 到 {to} 的公交", line: "换乘与票价，依据 KTEL 时刻表。", cta: "打开路线规划" },
      },
      generic: { title: "在克里特岛乘公交出行", line: "KTEL 各线网的时刻表、票价与换乘。", cta: "查看时刻表" },
    },
  },
};

// ── Garde-fous ──
function leaves(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, leaves(v, p));
    else out[p] = v;
  }
  return out;
}
const icuVars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const locales = files.map((f) => f.replace(".json", ""));
const en = leaves(TRANSLATIONS.en);
if (Object.keys(en).length !== 33) throw new Error(`en : ${Object.keys(en).length} feuilles, 33 attendues`);
const problems = [];
for (const loc of locales) {
  const block = TRANSLATIONS[loc];
  if (!block) { problems.push(`${loc} : bloc manquant`); continue; }
  const l = leaves(block);
  for (const k of Object.keys(en)) {
    if (!(k in l)) { problems.push(`${loc} : feuille manquante ${k}`); continue; }
    if (icuVars(l[k]) !== icuVars(en[k])) problems.push(`${loc} ${k} : variables ICU ${icuVars(l[k]) || "(aucune)"} vs ${icuVars(en[k]) || "(aucune)"}`);
    if (String(l[k]).includes("\u2014")) problems.push(`${loc} ${k} : tiret cadratin`);
    // Aucun chiffre en dur : les seuls nombres sont {price} et {count}.
    if (/\d/.test(String(l[k]).replace(/\{\w+\}/g, ""))) problems.push(`${loc} ${k} : chiffre en dur`);
    // Un titre d'encart tient sur une ligne mobile : 45 caractères, template compris.
    const len = [...String(l[k])].length;
    if (k.endsWith(".title") && len > TITLE_MAX) problems.push(`${loc} ${k} : titre de ${len} caractères, ${TITLE_MAX} max`);
  }
  for (const k of Object.keys(l)) if (!(k in en)) problems.push(`${loc} : feuille en trop ${k}`);
  if (loc !== "en" && l["car.v1.title"] === en["car.v1.title"]) problems.push(`${loc} : anglais recopié`);
}
for (const loc of Object.keys(TRANSLATIONS)) if (!locales.includes(loc)) problems.push(`${loc} : bloc sans fichier de messages`);
if (problems.length) {
  console.error(problems.join("\n"));
  throw new Error(`${problems.length} problème(s) dans TRANSLATIONS, rien n'est écrit`);
}

// ── Injection ──
let updated = 0;
for (const file of files) {
  const locale = file.replace(".json", "");
  const path = join(DIR, file);
  const content = readFileSync(path, "utf8");
  // Même fin de ligne que le fichier (CRLF sur le poste avec core.autocrlf=true, LF ailleurs).
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const block = '  "articlePromo": ' + JSON.stringify(TRANSLATIONS[locale], null, 2).replace(/\n/g, eol + "  ") + "," + eol;
  let out;
  if (!content.includes('"articlePromo"')) {
    out = content.replace(/^\{\r?\n/, (m) => m + block);
    if (out === content) throw new Error("Insertion échouée (format racine inattendu) : " + file);
  } else if (UPDATE) {
    const current = leaves(JSON.parse(content).articlePromo);
    const wanted = leaves(TRANSLATIONS[locale]);
    const diff = Object.keys(wanted).filter((k) => current[k] !== wanted[k]);
    if (!diff.length) { console.log("skip (à jour)", file); continue; }
    // Le bloc a été posé par ce script, indenté à 2 espaces : il court de sa clé à la
    // première ligne « }, » de niveau racine qui suit.
    const start = content.indexOf('  "articlePromo": {');
    const endRe = /^ {2}\},?\r?\n/m;
    const rest = content.slice(start);
    const m = endRe.exec(rest);
    if (start < 0 || !m) throw new Error("Bloc articlePromo introuvable ou format inattendu : " + file);
    out = content.slice(0, start) + block + rest.slice(m.index + m[0].length);
    updated += diff.length;
    console.log(`updated ${file} : ${diff.length} feuille(s)`, diff.join(", "));
  } else {
    console.log("skip (déjà présent, --update pour réécrire)", file);
    continue;
  }
  // Le reste du fichier est intact et le namespace vaut exactement TRANSLATIONS.
  const before = JSON.parse(content), after = JSON.parse(out);
  delete before.articlePromo; delete after.articlePromo;
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error("Autre clé modifiée, rien n'est écrit : " + file);
  if (JSON.stringify(JSON.parse(out).articlePromo) !== JSON.stringify(TRANSLATIONS[locale])) throw new Error("Namespace réécrit différent de TRANSLATIONS : " + file);
  writeFileSync(path, out, "utf8");
  if (!UPDATE) console.log("updated", file);
}
if (UPDATE) console.log(`updated: ${updated}`);
