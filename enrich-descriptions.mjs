/**
 * enrich-descriptions.mjs
 * Fetches all events from Supabase and enriches description_fr, description_de, description_el
 * for events where the French/German descriptions are missing or identical to English.
 *
 * Run: node enrich-descriptions.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzofxinjsuexjoxlwrhg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KIRJh01jgKZ4X5XCpik-w_jWT9BmAX";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// ENRICHED DESCRIPTIONS — keyed by title_en (partial match)
// ---------------------------------------------------------------------------
const descriptions = [
  // ── RELIGIOUS ─────────────────────────────────────────────────────────────
  {
    match: "Feast of the Assumption of the Virgin Mary",
    fr: "La Fête de l'Assomption est la célébration religieuse la plus importante de Crète, marquant le 15 août dans chaque village et ville avec des liturgies solennelles, des processions et des panigýria festifs. Les églises sont bondées sur toute l'île et de nombreuses communautés organisent des festivités nocturnes avec musique, danse et repas partagés en plein air.",
    de: "Mariä Himmelfahrt ist das bedeutendste religiöse Fest auf Kreta und wird am 15. August in jedem Dorf und jeder Stadt mit feierlichen Liturgien, Prozessionen und Panigýria-Festen gefeiert. Kirchen sind inselweit überfüllt, und viele Gemeinden veranstalten Nachtfeiern mit traditioneller Musik, Tanz und gemeinsamen Mahlzeiten.",
    el: "Η Κοίμηση της Θεοτόκου είναι η σημαντικότερη θρησκευτική εορτή της Κρήτης, που γιορτάζεται στις 15 Αυγούστου σε κάθε χωριό και πόλη με λειτουργίες, λιτανείες και πανηγύρια. Οι εκκλησίες γεμίζουν ασφυκτικά σε ολόκληρο το νησί, ενώ πολλές κοινότητες οργανώνουν ολονύχτιες γιορτές με παραδοσιακή μουσική, χορό και κοινά γεύματα.",
  },
  {
    match: "Orthodox Easter in Crete",
    fr: "Pâques orthodoxe est le sommet du calendrier religieux crétois. La veillée du Samedi Saint culmine avec la cérémonie de la Résurrection à minuit, suivie du festin d'agneau pascal le dimanche. Chaque village de Crète célèbre avec feux d'artifice, musique traditionnelle et repas communautaires en plein air.",
    de: "Das griechisch-orthodoxe Osterfest (Pascha) ist der Höhepunkt des kretischen Religionskalenders. Der Auferstehungsgottesdienst am Heiligen Samstag um Mitternacht füllt jeden Kirchplatz, gefolgt von einem gemeinsamen Lammfest am Ostersonntag. Jedes kretische Dorf feiert mit Feuerwerk, traditioneller Musik und Gemeinschaftsmahlzeiten unter freiem Himmel.",
    el: "Το ορθόδοξο Πάσχα αποτελεί την κορύφωση του θρησκευτικού ημερολογίου της Κρήτης. Η Ανάσταση τα μεσάνυχτα του Μεγάλου Σαββάτου γεμίζει κάθε εκκλησιαστική πλατεία, ακολουθούμενη από το αρνίσιο γεύμα της Κυριακής. Κάθε χωριό γιορτάζει με花火, παραδοσιακή μουσική και κοινά τραπέζια σε εξωτερικούς χώρους.",
  },
  {
    match: "Clean Monday (Kathara Deftera)",
    fr: "Kathara Deftera, le Lundi Pur, marque le début du Carême orthodoxe et s'accompagne de pique-niques en plein air, de cerfs-volants et de plats végétariens traditionnels comme la taramosalata et les légumes grillés. En Crète, la journée est célébrée en famille et entre amis, souvent dans les collines ou au bord de la mer.",
    de: "Der Reine Montag (Kathara Deftera) markiert den Beginn der orthodoxen Fastenzeit und wird mit Picknicks im Freien, Drachensteigen und traditionellen veganen Gerichten wie Taramosalata und gegrilltem Gemüse gefeiert. Auf Kreta verbringt man den Tag mit Familie und Freunden, oft in den Hügeln oder am Meer.",
    el: "Η Καθαρά Δευτέρα σηματοδοτεί την έναρξη της Ορθόδοξης Σαρακοστής και γιορτάζεται με υπαίθρια πικνίκ, πετάγματα χαρταετών και παραδοσιακά νηστίσιμα φαγητά όπως ταραμοσαλάτα και λαχανικά. Στην Κρήτη, η μέρα περνιέται με οικογένεια και φίλους, συχνά στους λόφους ή στην παραλία.",
  },
  {
    match: "Feast of Saint Titus",
    fr: "La Fête de Saint Tite honore le saint patron d'Héraklion et protecteur de la Crète, premier évêque chrétien de l'île et disciple de l'apôtre Paul. Une liturgie solennelle se tient à la basilique Saint-Tite au coeur de la vieille ville, suivie de processions et de célébrations locales dans toute la capitale crétoise.",
    de: "Das Fest des Heiligen Titus ehrt den Schutzpatron von Heraklion und Kreta, den ersten christlichen Bischof der Insel und Jünger des Apostels Paulus. Ein feierlicher Gottesdienst findet in der Basilika des Heiligen Titus im Herzen der Altstadt statt, gefolgt von Prozessionen und Feierlichkeiten in der gesamten kretischen Hauptstadt.",
    el: "Η γιορτή του Αγίου Τίτου τιμά τον προστάτη άγιο του Ηρακλείου και της Κρήτης, τον πρώτο χριστιανό επίσκοπο του νησιού και μαθητή του Αποστόλου Παύλου. Επίσημη λειτουργία τελείται στη Βασιλική του Αγίου Τίτου στο κέντρο της παλιάς πόλης, ακολουθούμενη από λιτανείες και εορταστικές εκδηλώσεις.",
  },
  {
    match: "Transfiguration",
    fr: "La Transfiguration du Seigneur (Métamorphose) est célébrée le 6 août dans toute la Crète avec des liturgies dans les chapelles dédiées au sommet des collines et dans les monastères. C'est une fête traditionnellement liée à la vendange, et dans de nombreux villages crétois on bénit les premiers raisins de la saison pendant l'office religieux.",
    de: "Die Verklärung des Herrn (Metamorfosi) wird am 6. August auf ganz Kreta in Kapellen auf Hügeln und in Klöstern gefeiert. Das Fest ist traditionell mit der Weinlese verbunden, und in vielen kretischen Dörfern werden die ersten Trauben der Saison während des Gottesdienstes gesegnet.",
    el: "Η Μεταμόρφωση του Σωτήρος γιορτάζεται στις 6 Αυγούστου σε ολόκληρη την Κρήτη με λειτουργίες σε εκκλησάκια στις κορυφές λόφων και σε μοναστήρια. Η εορτή συνδέεται παραδοσιακά με τον τρύγο, και σε πολλά κρητικά χωριά ευλογούνται τα πρώτα σταφύλια της σεζόν κατά τη διάρκεια της λειτουργίας.",
  },
  {
    match: "Saint George",
    fr: "La Fête de Saint Georges (Agios Georgios) est célébrée le 23 avril, ou le lundi de Pâques quand la date coïncide avec la Semaine Sainte. Patron des bergers et des guerriers crétois, il est fêté avec des liturgies, des processions à cheval dans certains villages et des repas festifs. La ville d'Agios Nikolaos et de nombreux villages crétois célèbrent leur fête patronale ce jour.",
    de: "Das Fest des Heiligen Georg (Agios Georgios) wird am 23. April gefeiert, oder am Ostermontag, wenn das Datum mit der Karwoche zusammenfällt. Als Schutzpatron der kretischen Hirten und Krieger wird er mit Liturgien, Reitprozessionen in manchen Dörfern und Festmählern geehrt. Agios Nikolaos und viele kretische Dörfer feiern an diesem Tag ihr Patronatsfest.",
    el: "Η γιορτή του Αγίου Γεωργίου εορτάζεται στις 23 Απριλίου, ή τη Δευτέρα του Πάσχα όταν η ημερομηνία συμπίπτει με την Αγία Εβδομάδα. Προστάτης των κρητικών βοσκών και πολεμιστών, τιμάται με λειτουργίες, λιτανείες και εορταστικά τραπέζια σε πολλά χωριά της Κρήτης.",
  },
  // ── CARNAVAL ──────────────────────────────────────────────────────────────
  {
    match: "Rethymno Carnival",
    fr: "Le Carnaval de Réthymnon est le plus grand et le plus animé de Crète, reconnu parmi les plus importants de Grèce. Des milliers de fêtards costumés défilent dans les ruelles vénitiennes de la vieille ville pendant trois semaines de festivités, culminant avec la grande parade du dimanche gras et la brûlure symbolique du roi du carnaval.",
    de: "Der Karneval von Rethymno ist der größte und lebendigste Kretas und gilt als einer der bedeutendsten Griechenlands. Tausende kostümierter Feiernder ziehen drei Wochen lang durch die venezianischen Gassen der Altstadt, mit dem Höhepunkt der großen Sonntagsparade am Faschingsdienstag und der symbolischen Verbrennung des Karnevalskönigs.",
    el: "Το Καρναβάλι του Ρεθύμνου είναι το μεγαλύτερο και πιο ζωντανό της Κρήτης, ανάμεσα στα σημαντικότερα της Ελλάδας. Χιλιάδες αποκριάτες παρελαύνουν για τρεις εβδομάδες στα βενετσιάνικα στενά της παλιάς πόλης, με κορύφωση τη μεγάλη παρέλαση της Κυριακής της Αποκριάς και το κάψιμο του Καρνάβαλου.",
  },
  {
    match: "Heraklion Carnival",
    fr: "Le Carnaval d'Héraklion anime les rues de la capitale crétoise pendant plusieurs semaines avant le Carême. Défilés colorés, bals masqués et animations populaires rythment l'événement, avec la grande parade finale rassemblant des dizaines de chars et des milliers de participants costumés dans les artères principales de la ville.",
    de: "Der Karneval von Heraklion belebt die Straßen der kretischen Hauptstadt über mehrere Wochen vor der Fastenzeit. Bunte Umzüge, Maskenbälle und volkstümliche Unterhaltung prägen das Ereignis, mit der großen Abschlussparade, die Dutzende von Festwagen und Tausende kostümierter Teilnehmer durch die Hauptstraßen der Stadt führt.",
    el: "Το Καρναβάλι του Ηρακλείου ζωντανεύει τους δρόμους της κρητικής πρωτεύουσας για αρκετές εβδομάδες πριν τη Σαρακοστή. Πολύχρωμες παρελάσεις, αποκριάτικες βραδιές και λαϊκές εκδηλώσεις χαρακτηρίζουν τη γιορτή, με μεγάλη τελική παρέλαση με δεκάδες άρματα και χιλιάδες μεταμφιεσμένους.",
  },
  // ── FESTIVALS CULTURELS ────────────────────────────────────────────────────
  {
    match: "Matala Beach Festival",
    fr: "Le Festival de la Plage de Matala fait revivre l'esprit hippie des années 1970, époque où des milliers de voyageurs du monde entier s'installaient dans les grottes préhistoriques de la falaise. Musique live, artisanat, danse et projections en plein air transforment cette plage légendaire du sud de la Crète en un rassemblement alternatif et festif unique.",
    de: "Das Matala Beach Festival erweckt den Hippie-Geist der 1970er Jahre zum Leben, als Tausende von Reisenden aus aller Welt in den prähistorischen Höhlen der Klippe lebten. Livemusik, Kunsthandwerk, Tanz und Open-Air-Vorführungen verwandeln diesen legendären Strand im Süden Kretas in ein einzigartiges alternatives Fest.",
    el: "Το Φεστιβάλ Παραλίας Ματάλων αναβιώνει το χίπικο πνεύμα της δεκαετίας του 1970, όταν χιλιάδες ταξιδιώτες από όλο τον κόσμο κατοικούσαν στα προϊστορικά σπήλαια του βράχου. Ζωντανή μουσική, χειροτεχνία, χορός και υπαίθριες προβολές μετατρέπουν αυτή την εμβληματική παραλία του νότιου Ηρακλείου σε μια μοναδική εναλλακτική γιορτή.",
  },
  {
    match: "Heraklion Summer Arts Festival",
    fr: "Le Festival des Arts d'Été d'Héraklion propose une programmation riche de théâtre, musique classique et contemporaine, danse et arts visuels dans des lieux emblématiques de la ville dont les remparts vénitiens et le théâtre Nikos Kazantzakis. Le festival attire des compagnies grecques et internationales de premier plan tout au long de l'été.",
    de: "Das Heraklion Sommer-Kunstfestival bietet ein reichhaltiges Programm aus Theater, klassischer und zeitgenössischer Musik, Tanz und bildender Kunst an ikonischen Veranstaltungsorten der Stadt, darunter die venezianischen Stadtmauern und das Nikos-Kazantzakis-Theater. Das Festival zieht führende griechische und internationale Ensembles den ganzen Sommer über an.",
    el: "Το Καλοκαιρινό Φεστιβάλ Τεχνών Ηρακλείου προσφέρει πλούσιο πρόγραμμα θεάτρου, κλασικής και σύγχρονης μουσικής, χορού και εικαστικών τεχνών σε εμβληματικούς χώρους της πόλης, όπως τα Ενετικά τείχη και το θέατρο Νίκος Καζαντζάκης. Το φεστιβάλ προσελκύει κορυφαίους ελληνικούς και διεθνείς θιάσους καθ' όλη τη διάρκεια του καλοκαιριού.",
  },
  {
    match: "Rethymno Renaissance Festival",
    fr: "Le Festival Renaissance de Réthymnon célèbre le riche héritage vénitien de la ville avec des spectacles de théâtre historique, concerts de musique baroque et de la Renaissance, expositions et défilés en costumes d'époque dans les rues pavées de la vieille ville. Une plongée unique dans l'histoire médiévale et vénitienne de la Crète.",
    de: "Das Renaissance-Festival von Rethymno feiert das reiche venezianische Erbe der Stadt mit historischen Theateraufführungen, Barock- und Renaissancekonzerten, Ausstellungen und Kostümumzügen in den gepflasterten Straßen der Altstadt. Ein einzigartiger Einblick in die mittelalterliche und venezianische Geschichte Kretas.",
    el: "Το Φεστιβάλ Αναγέννησης του Ρεθύμνου γιορτάζει την πλούσια βενετσιάνικη κληρονομιά της πόλης με παραστάσεις ιστορικού θεάτρου, συναυλίες μπαρόκ και αναγεννησιακής μουσικής, εκθέσεις και πορείες με ενδυμασίες εποχής στα πλακόστρωτα δρομάκια της παλιάς πόλης.",
  },
  {
    match: "Sitia Cultural Summer",
    fr: "L'Été Culturel de Sitia propose des concerts, des spectacles de théâtre et des expositions dans la charmante ville portuaire de l'est de la Crète. Les soirées estivales se déroulent dans des espaces en plein air, dont la forteresse vénitienne Kazarma, offrant un cadre exceptionnel pour les arts et la culture locale.",
    de: "Der kulturelle Sommer von Sitia bietet Konzerte, Theatervorstellungen und Ausstellungen in der charmanten Hafenstadt im Osten Kretas. Die Sommerabende finden in Freilichtbühnen statt, darunter die venezianische Festung Kazarma, die einen außergewöhnlichen Rahmen für Kunst und lokale Kultur bietet.",
    el: "Το Πολιτιστικό Καλοκαίρι της Σητείας προσφέρει συναυλίες, θεατρικές παραστάσεις και εκθέσεις στη γραφική λιμανοπόλη της ανατολικής Κρήτης. Οι καλοκαιρινές βραδιές πραγματοποιούνται σε υπαίθριους χώρους, όπως το Βενετσιάνικο φρούριο Καζάρμα, που προσφέρει εξαιρετικό σκηνικό για τις τέχνες.",
  },
  {
    match: "Ierapetra Summer Cultural Events",
    fr: "Les Événements Culturels d'Été d'Ierapetra animent la ville la plus méridionale d'Europe avec une programmation variée de concerts, spectacles folkloriques, expositions et soirées estivales en bord de mer. La ville profite de ses soirées chaudes et de ses espaces en plein air pour accueillir artistes locaux et invités de toute la Grèce.",
    de: "Die kulturellen Sommerveranstaltungen in Ierapetra beleben die südlichste Stadt Europas mit einem abwechslungsreichen Programm aus Konzerten, Folklorevorführungen, Ausstellungen und Sommerabenden am Meer. Die Stadt nutzt ihre warmen Abende und Freiluftflächen, um lokale Künstler und Gäste aus ganz Griechenland zu empfangen.",
    el: "Οι καλοκαιρινές πολιτιστικές εκδηλώσεις της Ιεράπετρας ζωντανεύουν την πιο νότια πόλη της Ευρώπης με ποικίλο πρόγραμμα συναυλιών, λαϊκών παραστάσεων, εκθέσεων και καλοκαιρινών βραδιών δίπλα στη θάλασσα. Η πόλη αξιοποιεί τις ζεστές βραδιές και τους υπαίθριους χώρους της για να φιλοξενήσει τοπικούς καλλιτέχνες και επισκέπτες.",
  },
  // ── ALIMENTATION & GASTRONOMIE ─────────────────────────────────────────────
  {
    match: "Cretan Diet Festival",
    fr: "Le Festival du Régime Crétois célèbre l'un des patrimoines gastronomiques les plus reconnus au monde, inscrit au patrimoine culturel immatériel de l'UNESCO. Dégustations de produits locaux, ateliers de cuisine traditionnelle, conférences sur la nutrition méditerranéenne et marché de producteurs font de cet événement une vitrine complète de la richesse culinaire de la Crète.",
    de: "Das Festival der Kretischen Ernährung feiert eines der weltweit anerkanntesten gastronomischen Erben, das zum immateriellen Kulturerbe der UNESCO gehört. Verkostungen lokaler Produkte, Workshops zur traditionellen Küche, Ernährungsvorträge und ein Erzeugermarkt machen dieses Ereignis zu einer vollständigen Präsentation des kulinarischen Reichtums Kretas.",
    el: "Το Φεστιβάλ Κρητικής Διατροφής γιορτάζει μία από τις πιο αναγνωρισμένες γαστρονομικές κληρονομιές του κόσμου, εγγεγραμμένη στην άυλη πολιτιστική κληρονομιά της UNESCO. Γευστικές δοκιμές τοπικών προϊόντων, εργαστήρια παραδοσιακής μαγειρικής, διαλέξεις διατροφής και αγορά παραγωγών αναδεικνύουν τον γαστρονομικό πλούτο της Κρήτης.",
  },
  {
    match: "Sitia Wine Festival",
    fr: "Le Festival du Vin de Sitia (Festival du Sultanina) célèbre le cépage sultana de l'est de la Crète, utilisé pour produire raisins secs et vins locaux d'exception. Dégustations de vins et produits locaux, musique traditionnelle et animations conviviales font de ce festival une belle célébration de la viticulture crétoise dans la ville de Sitia.",
    de: "Das Weinland Sitia Festival (Sultana-Festival) feiert die Sultana-Traube aus Ostkreta, die zur Herstellung von Rosinen und ausgezeichneten lokalen Weinen verwendet wird. Wein- und Lokalproduktverkostungen, traditionelle Musik und gesellige Unterhaltung machen dieses Festival zu einer schönen Feier des kretischen Weinbaus in der Stadt Sitia.",
    el: "Το Φεστιβάλ Κρασιού Σητείας (Φεστιβάλ Σουλτανίνας) γιορτάζει την ποικιλία σουλτανίνα της ανατολικής Κρήτης, που χρησιμοποιείται για την παραγωγή σταφίδων και εξαιρετικών τοπικών κρασιών. Γευστικές δοκιμές κρασιών και τοπικών προϊόντων, παραδοσιακή μουσική και κεφάτες εκδηλώσεις αναδεικνύουν τον κρητικό αμπελοοινικό πολιτισμό.",
  },
  {
    match: "Anogia Tsikoudia Festival",
    fr: "Le Festival du Tsikoudia d'Anogia célèbre la distillation de la grappa crétoise dans le village de montagne le plus authentique de l'île. Le tsikoudia, eau-de-vie de marc de raisin, est au coeur de la culture crétoise et de la convivialité montagnarde. Dégustations, musique de lyra et mezes traditionnels animent ce festival au coeur de l'Ida.",
    de: "Das Tsikoudia-Festival in Anogia feiert die Destillation des kretischen Tresterbranntweins im authentischsten Bergdorf der Insel. Tsikoudia, ein Traubentresterschnaps, steht im Mittelpunkt der kretischen Kultur und der Gastfreundschaft der Bergbewohner. Verkostungen, Lyra-Musik und traditionelle Mezedes beleben dieses Festival im Herzen des Ida-Gebirges.",
    el: "Το Φεστιβάλ Τσικουδιάς Ανωγείων γιορτάζει την απόσταξη του κρητικού τσικουδιού στο πιο αυθεντικό ορεινό χωριό του νησιού. Το τσικούδι, το απόσταγμα από τα στέμφυλα του σταφυλιού, βρίσκεται στο επίκεντρο της κρητικής κουλτούρας και της ορεινής φιλοξενίας. Γευστικές δοκιμές, μουσική λύρας και παραδοσιακοί μεζέδες ζωντανεύουν αυτό το φεστιβάλ στην καρδιά του Ψηλορείτη.",
  },
  {
    match: "Olive Harvest Festival",
    fr: "Le Festival de la Récolte des Olives à Kolymvari célèbre la tradition millénaire de l'oléiculture crétoise dans l'une des zones de production les plus réputées de l'île, en péninsule de Rodopou. Démonstrations de récolte traditionnelle, dégustations d'huiles d'olive extra-vierge, ateliers de cuisine et musique locale composent un programme ancré dans les racines agricoles de la Crète.",
    de: "Das Olivenernte-Festival in Kolymvari feiert die jahrtausendealte Tradition des kretischen Olivenanbaus in einer der renommiertesten Produktionsregionen der Insel auf der Halbinsel Rodopou. Vorführungen der traditionellen Ernte, Verkostungen von nativem Olivenöl extra, Kochworkshops und lokale Musik bilden ein Programm, das in den landwirtschaftlichen Wurzeln Kretas verwurzelt ist.",
    el: "Το Φεστιβάλ Ελαιοσυλλογής στο Κολυμβάρι γιορτάζει την αιωνόβια παράδοση της κρητικής ελαιοκομίας σε μια από τις πιο φημισμένες περιοχές παραγωγής του νησιού, στη χερσόνησο Ροδοπού. Επιδείξεις παραδοσιακής συγκομιδής, γευστικές δοκιμές εξαιρετικού παρθένου ελαιολάδου, μαγειρικά εργαστήρια και τοπική μουσική συνθέτουν ένα πρόγραμμα ριζωμένο στη γεωργική παράδοση της Κρήτης.",
  },
  {
    match: "Cretan Honey Festival",
    fr: "Le Festival du Miel Crétois met en valeur l'un des produits naturels les plus précieux de l'île, réputé pour ses propriétés exceptionnelles grâce à la flore sauvage endémique de Crète dont le thym, la sauge et les herbes aromatiques de montagne. Apiculteurs locaux, dégustations, ateliers et concours de miels animent cette célébration du patrimoine apicole crétois.",
    de: "Das Kretische Honigernte-Festival würdigt eines der wertvollsten Naturprodukte der Insel, das für seine außergewöhnlichen Eigenschaften bekannt ist, die es der endemischen Wildflora Kretas verdankt: Thymian, Salbei und Bergkräuter. Lokale Imker, Verkostungen, Workshops und Honigwettbewerbe beleben die Feier des kretischen Imkereierbes.",
    el: "Το Φεστιβάλ Κρητικού Μελιού αναδεικνύει ένα από τα πολυτιμότερα φυσικά προϊόντα του νησιού, φημισμένο για τις εξαιρετικές του ιδιότητες χάρη στην ενδημική άγρια χλωρίδα της Κρήτης: θυμάρι, φασκόμηλο και αρωματικά βότανα. Τοπικοί μελισσοκόμοι, γευστικές δοκιμές, εργαστήρια και διαγωνισμοί μελιών εμψυχώνουν αυτή τη γιορτή της κρητικής μελισσοκομίας.",
  },
  {
    match: "Ierapetra Cucumber Festival",
    fr: "Le Festival du Concombre d'Ierapetra célèbre le produit agricole phare de la région. Dégustations, concours culinaires et animations locales rythment cet événement populaire au coeur de la ville.",
    de: "Das Gurkenfestival von Ierapetra feiert das wichtigste landwirtschaftliche Produkt der Region. Verkostungen, kulinarische Wettbewerbe und lokale Unterhaltung bestimmen dieses beliebte Ereignis im Herzen der Stadt.",
    el: "Το Φεστιβάλ Αγγουριού Ιεράπετρας γιορτάζει το κύριο αγροτικό προϊόν της περιοχής. Γευστικές δοκιμές, μαγειρικοί διαγωνισμοί και τοπικές εκδηλώσεις χαρακτηρίζουν αυτή τη δημοφιλή γιορτή στο κέντρο της πόλης.",
  },
  {
    match: "Chestnut Festival of Elos",
    fr: "Le Festival des Châtaignes d'Elos célèbre la récolte automnale dans ce village de montagne verdoyant de la région de La Canée, entouré de châtaigniers centenaires. Châtaignes rôties, produits locaux, musique traditionnelle et danse crétoise transforment le village en une fête authentique au coeur des montagnes de l'Ouest Crète.",
    de: "Das Kastanienfest von Elos feiert die Herbsternte in diesem üppig bewaldeten Bergdorf in der Region Chania, umgeben von jahrhundertealten Kastanienbäumen. Geröstete Kastanien, Lokalprodukte, traditionelle Musik und kretische Tänze verwandeln das Dorf in ein authentisches Fest im Herzen der Westkreter Berge.",
    el: "Το Φεστιβάλ Κάστανου στο Έλος γιορτάζει την φθινοπωρινή συγκομιδή σε αυτό το καταπράσινο ορεινό χωριό της περιοχής Χανίων, που περιβάλλεται από αιωνόβια καστανόδεντρα. Ψητά κάστανα, τοπικά προϊόντα, παραδοσιακή μουσική και κρητικοί χοροί μεταμορφώνουν το χωριό σε μια αυθεντική γιορτή στην καρδιά των βουνών της Δυτικής Κρήτης.",
  },
  // ── PANIGYRIA ─────────────────────────────────────────────────────────────
  {
    match: "Panigyri of Agios Nikolaos",
    fr: "Le Panigyri d'Agios Nikolaos honore le saint patron de la ville éponyme avec une liturgie solennelle suivie d'une fête populaire en bord du lac Voulismeni. Musique traditionnelle, danse crétoise et repas festif réunissent habitants et visiteurs dans cette célébration qui mêle dévotion religieuse et convivialité méditerranéenne.",
    de: "Das Panigyri von Agios Nikolaos ehrt den Schutzpatron der gleichnamigen Stadt mit einer feierlichen Liturgie, gefolgt von einem Volksfest am Ufer des Voulismeni-Sees. Traditionelle Musik, kretische Tänze und festliche Mahlzeiten bringen Einheimische und Besucher bei dieser Feier zusammen, die religiöse Hingabe mit mediteraner Geselligkeit verbindet.",
    el: "Το Πανηγύρι Αγίου Νικολάου τιμά τον προστάτη άγιο της ομώνυμης πόλης με επίσημη λειτουργία και λαϊκή γιορτή στις όχθες της λίμνης Βουλισμένης. Παραδοσιακή μουσική, κρητικοί χοροί και εορταστικό τραπέζι ενώνουν κατοίκους και επισκέπτες σε μια γιορτή που συνδυάζει θρησκευτική ευλάβεια και μεσογειακή κοινωνικότητα.",
  },
  {
    match: "Prophet Elijah (Profitis Ilias)",
    fr: "Le Panigyri du Prophète Élie se tient le 20 juillet dans les chapelles de montagne dédiées à ce saint, souvent perchées sur les sommets les plus élevés de la Crète. Des pèlerins gravissent les sentiers escarpés dès l'aube pour assister à la liturgie au lever du soleil, une tradition qui unit foi, nature et culture crétoise dans un cadre sublime.",
    de: "Das Panigyri des Propheten Elias findet am 20. Juli in den Bergkapellen statt, die diesem Heiligen gewidmet sind und oft auf den höchsten Gipfeln Kretas thronen. Pilger erklimmen bereits bei Tagesanbruch steile Pfade, um der Liturgie beim Sonnenaufgang beizuwohnen, eine Tradition, die Glauben, Natur und kretische Kultur in einer erhabenen Umgebung vereint.",
    el: "Το Πανηγύρι του Προφήτη Ηλία τελείται στις 20 Ιουλίου στα εξωκλήσια της βουνοκορφής που είναι αφιερωμένα στον άγιο, συχνά στις ψηλότερες κορυφές της Κρήτης. Προσκυνητές ανεβαίνουν τα απόκρημνα μονοπάτια από τα χαράματα για να παρακολουθήσουν τη λειτουργία στην ανατολή του ήλιου, μια παράδοση που ενώνει πίστη, φύση και κρητικό πολιτισμό.",
  },
  {
    match: "Agia Triada Monastery",
    fr: "Le Panigyri du Monastère d'Agia Triada (Sainte Trinité) à Akrotiri, près de La Canée, attire des pèlerins de toute la région pour la liturgie festive du lundi de Pentecôte. Ce monastère vénérable du XVIIe siècle, entouré d'oliviers et de cyprès, offre un cadre unique où se mêlent foi orthodoxe, architecture monastique et paysage crétois.",
    de: "Das Panigyri des Agia Triada Klosters (Heilige Dreifaltigkeit) in Akrotiri bei Chania zieht Pilger aus der gesamten Region zur festlichen Liturgie am Pfingstmontag an. Dieses ehrwürdige Kloster aus dem 17. Jahrhundert, umgeben von Olivenbäumen und Zypressen, bietet einen einzigartigen Rahmen, in dem sich orthodoxer Glaube, Klosterarchitektur und kretische Landschaft vereinen.",
    el: "Το Πανηγύρι της Μονής Αγίας Τριάδας στο Ακρωτήρι, κοντά στα Χανιά, προσελκύει προσκυνητές από ολόκληρη την περιοχή για τη λειτουργία της Δευτέρας του Αγίου Πνεύματος. Αυτή η αξιοσέβαστη μονή του 17ου αιώνα, περιβαλλόμενη από ελαιόδεντρα και κυπαρίσσια, προσφέρει μοναδικό σκηνικό όπου συναντώνται ορθόδοξη πίστη, μοναστηριακή αρχιτεκτονική και κρητικό τοπίο.",
  },
  {
    match: "Toplou Monastery",
    fr: "Le Panigyri du Monastère de Toplou, l'un des plus importants de Crète, se tient dans ce fort monastique du XVe siècle perché dans les collines de l'extrême est de l'île, près de Sitia. Le monastère, gardien d'une remarquable collection d'icônes byzantines dont la célèbre icône 'Grand tu es, Seigneur', accueille pèlerins et visiteurs pour sa fête patronale annuelle.",
    de: "Das Panigyri des Toplou-Klosters, eines der bedeutendsten Kretas, findet in dieser befestigten Klosteranlage aus dem 15. Jahrhundert statt, die in den Hügeln des östlichsten Zipfels der Insel bei Sitia thront. Das Kloster, Hüter einer bemerkenswerten Sammlung byzantinischer Ikonen, darunter die berühmte Ikone 'Groß bist du, o Herr', empfängt Pilger und Besucher zu seinem jährlichen Patronatsfest.",
    el: "Το Πανηγύρι της Μονής Τοπλού, μιας από τις σημαντικότερες της Κρήτης, πραγματοποιείται σε αυτό το οχυρωμένο μοναστήρι του 15ου αιώνα που δεσπόζει στους λόφους της ανατολικής άκρης του νησιού, κοντά στη Σητεία. Η μονή, φύλακας σημαντικής συλλογής βυζαντινών εικόνων, μεταξύ των οποίων η περίφημη εικόνα 'Μέγας ει Κύριε', υποδέχεται προσκυνητές και επισκέπτες για την ετήσια πανήγυρή της.",
  },
  // ── SPORTS ────────────────────────────────────────────────────────────────
  {
    match: "Heraklion International Road Race",
    fr: "Course internationale dans les rues d'Héraklion. Plusieurs distances proposées, ambiance festive et parcours à travers le centre historique de la capitale crétoise.",
    de: "Internationales Straßenrennen durch die Straßen von Heraklion. Verschiedene Distanzen werden angeboten, festliche Atmosphäre und Streckenführung durch das historische Zentrum der kretischen Hauptstadt.",
    el: "Διεθνής αγώνας δρόμου στους δρόμους του Ηρακλείου. Διαφορετικές αποστάσεις, γιορτινή ατμόσφαιρα και διαδρομή μέσα από το ιστορικό κέντρο της κρητικής πρωτεύουσας.",
  },
  {
    match: "Crete Marathon",
    fr: "Le Marathon de Crète se déroule à Réthymnon avec un parcours longeant la magnifique côte nord de l'île et traversant la vieille ville vénitienne. Plusieurs distances sont proposées, du 5 km au marathon complet, attirant des coureurs grecs et internationaux dans un cadre naturel et historique exceptionnel.",
    de: "Der Kreta-Marathon findet in Rethymno statt und führt entlang der herrlichen Nordküste der Insel und durch die venezianische Altstadt. Verschiedene Distanzen werden angeboten, vom 5-km-Lauf bis zum Vollmarathon, und ziehen griechische und internationale Läufer in ein außergewöhnliches natürliches und historisches Umfeld.",
    el: "Ο Μαραθώνιος Κρήτης διεξάγεται στο Ρέθυμνο με διαδρομή κατά μήκος της υπέροχης βόρειας ακτής του νησιού και μέσα από την ενετική παλιά πόλη. Διαφορετικές αποστάσεις προσφέρονται, από τα 5 χλμ ως τον πλήρη μαραθώνιο, προσελκύοντας Έλληνες και διεθνείς δρομείς.",
  },
  {
    match: "Gorge of Samaria Running Race",
    fr: "Course à pied dans les gorges de Samaria, les plus longues d'Europe (16 km). Un défi sportif unique dans un cadre naturel exceptionnel, du plateau d'Omalos jusqu'à Agia Roumeli sur la côte sud.",
    de: "Laufrennen durch die Samaria-Schlucht, die längste Europas (16 km). Eine einzigartige sportliche Herausforderung in einer außergewöhnlichen Naturlandschaft, vom Hochplateau von Omalos bis nach Agia Roumeli an der Südküste.",
    el: "Αγώνας δρόμου στο Φαράγγι Σαμαριάς, το μεγαλύτερο της Ευρώπης (16 χλμ). Μια μοναδική αθλητική πρόκληση σε εξαιρετικό φυσικό τοπίο, από το οροπέδιο Ομαλού ως την Αγία Ρουμέλη στη νότια ακτή.",
  },
  // ── MARCHES ───────────────────────────────────────────────────────────────
  {
    match: "Heraklion Saturday Market",
    fr: "Le marché du samedi d'Héraklion (Laïki Agora) est le plus grand marché de plein air de la capitale crétoise, proposant fruits et légumes locaux de saison, fromages crétois, olives, herbes aromatiques et produits artisanaux. Une expérience authentique pour découvrir les saveurs et les couleurs de la gastronomie crétoise au contact des producteurs locaux.",
    de: "Der Samstagmarkt von Heraklion (Laiki Agora) ist der größte Freiluftmarkt der kretischen Hauptstadt und bietet saisonales Obst und Gemüse, kretische Käsesorten, Oliven, Kräuter und Kunsthandwerk. Ein authentisches Erlebnis, um die Aromen und Farben der kretischen Gastronomie im direkten Kontakt mit lokalen Erzeugern zu entdecken.",
    el: "Η Λαϊκή Αγορά του Ηρακλείου το Σάββατο είναι η μεγαλύτερη υπαίθρια αγορά της κρητικής πρωτεύουσας, με εποχιακά φρούτα και λαχανικά, κρητικά τυριά, ελιές, αρωματικά βότανα και χειροτεχνήματα. Μια αυθεντική εμπειρία για να ανακαλύψετε τις γεύσεις και τα χρώματα της κρητικής γαστρονομίας σε επαφή με τοπικούς παραγωγούς.",
  },
  {
    match: "Chania Old Town Market",
    fr: "La Halle Municipale de La Canée (Dimotiki Agora) est un marché couvert historique construit en 1913, coeur gastronomique de la vieille ville. Sous sa structure en croix aux grandes arches, bouchers, fromagers, marchands d'olives et d'huiles d'olive, herboristes et artisans perpétuent une tradition commerciale centenaire dans un cadre architectural remarquable.",
    de: "Die städtische Markthalle von Chania (Dimotiki Agora) ist ein historischer überdachter Markt aus dem Jahr 1913, das gastronomische Herz der Altstadt. Unter ihrer kreuzförmigen Struktur mit großen Bögen führen Metzger, Käsehändler, Oliven- und Olivenölhändler, Kräuterhändler und Handwerker eine hundertjährige Handelstradition in einem bemerkenswerten architektonischen Rahmen fort.",
    el: "Η Δημοτική Αγορά Χανίων είναι μια ιστορική στεγασμένη αγορά που χτίστηκε το 1913 και αποτελεί το γαστρονομικό κέντρο της παλιάς πόλης. Κάτω από την σταυροειδή κατασκευή της με τις μεγάλες καμάρες, κρεοπώλες, τυροπώλες, εμπόρους ελαιών και ελαιολάδου, μυρεψοί και χειροτέχνες διατηρούν μια εκατοντάχρονη εμπορική παράδοση.",
  },
  {
    match: "Rethymno Thursday Market",
    fr: "Le marché du jeudi de Réthymnon (Laïki Agora) étale ses étals colorés dans les rues de la ville avec fruits et légumes frais, olives, fromages locaux, miel et produits artisanaux de la région. C'est l'occasion idéale pour les habitants et visiteurs de s'approvisionner directement auprès des producteurs locaux et de s'immerger dans la vie quotidienne crétoise.",
    de: "Der Donnerstagmarkt von Rethymno (Laiki Agora) breitet seine bunten Stände in den Straßen der Stadt aus und bietet frisches Obst und Gemüse, Oliven, lokale Käsesorten, Honig und Kunsthandwerk aus der Region. Es ist die ideale Gelegenheit für Einheimische und Besucher, direkt bei lokalen Erzeugern einzukaufen und in das tägliche kretische Leben einzutauchen.",
    el: "Η Λαϊκή Αγορά του Ρεθύμνου την Πέμπτη απλώνει τα πολύχρωμα πάγκα της στους δρόμους της πόλης με φρέσκα φρούτα και λαχανικά, ελιές, τοπικά τυριά, μέλι και χειροτεχνήματα της περιοχής. Είναι η ιδανική ευκαιρία για κατοίκους και επισκέπτες να εφοδιαστούν απευθείας από τοπικούς παραγωγούς.",
  },
  {
    match: "Agios Nikolaos Wednesday Market",
    fr: "Le marché du mercredi d'Agios Nikolaos anime le coeur de la ville avec ses étals de produits frais de saison, fromages locaux, herbes et épices, olives et spécialités crétoise. Ce rendez-vous hebdomadaire incontournable permet aux visiteurs de plonger dans l'authenticité de la vie quotidienne de cette charmante ville portuaire du Lasithi.",
    de: "Der Mittwochmarkt von Agios Nikolaos belebt das Stadtzentrum mit Ständen für saisonale Frischprodukte, lokale Käsesorten, Kräuter und Gewürze, Oliven und kretische Spezialitäten. Dieser unverzichtbare wöchentliche Treffpunkt ermöglicht Besuchern, in die Authentizität des Alltags dieser charmanten Hafenstadt in Lasithi einzutauchen.",
    el: "Η Λαϊκή Αγορά του Αγίου Νικολάου την Τετάρτη ζωντανεύει το κέντρο της πόλης με πάγκους φρέσκων εποχιακών προϊόντων, τοπικά τυριά, βότανα και μπαχαρικά, ελιές και κρητικές σπεσιαλιτέ. Αυτή η αναπόφευκτη εβδομαδιαία συνάντηση επιτρέπει στους επισκέπτες να βυθιστούν στην αυθεντικότητα της καθημερινής ζωής της γοητευτικής λιμανοπόλης του Λασιθίου.",
  },
  {
    match: "Sitia Saturday Farmers Market",
    fr: "Le marché agricole du samedi de Sitia rassemble producteurs locaux et artisans dans le centre-ville de cette cité portuaire de l'est crétois. Raisins sultana et raisins secs locaux, huile d'olive, herbes aromatiques, fromages de montagne et produits de la mer composent une offre qui reflète la richesse naturelle et agricole de la région de Sitia.",
    de: "Der Samstags-Bauernmarkt von Sitia versammelt lokale Erzeuger und Handwerker im Stadtzentrum dieser Hafenstadt im Osten Kretas. Sultana-Trauben und lokale Rosinen, Olivenöl, Aromakräuter, Bergkäse und Meeresfrüchte bilden ein Angebot, das den natürlichen und landwirtschaftlichen Reichtum der Region Sitia widerspiegelt.",
    el: "Η Λαϊκή Αγορά της Σητείας το Σάββατο συγκεντρώνει τοπικούς παραγωγούς και χειροτέχνες στο κέντρο της πόλης αυτής της λιμανοπόλης της ανατολικής Κρήτης. Σταφύλια σουλτανίνα και τοπικές σταφίδες, ελαιόλαδο, αρωματικά βότανα, ορεινά τυριά και θαλασσινά προϊόντα αποτελούν μια προσφορά που αντικατοπτρίζει τον φυσικό και αγροτικό πλούτο της περιοχής.",
  },
  // ── CULTURE & PATRIMOINE ───────────────────────────────────────────────────
  {
    match: "Nikos Kazantzakis International Meeting",
    fr: "La Rencontre Internationale Nikos Kazantzakis honore la mémoire du plus grand écrivain crétois, auteur de Zorba le Grec et de La Dernière Tentation du Christ. Conférences, expositions, lectures et débats littéraires réunissent chercheurs, écrivains et admirateurs du monde entier à Héraklion, ville natale de Kazantzakis, pour explorer son oeuvre intemporelle.",
    de: "Das Internationale Nikos-Kazantzakis-Treffen ehrt die Erinnerung an den größten kretischen Schriftsteller, den Autor von Alexis Sorbas und Die letzte Versuchung. Konferenzen, Ausstellungen, Lesungen und Literaturdiskussionen bringen Forscher, Schriftsteller und Bewunderer aus aller Welt nach Heraklion, der Geburtsstadt von Kazantzakis, zusammen.",
    el: "Η Διεθνής Συνάντηση Νίκου Καζαντζάκη τιμά τη μνήμη του μεγαλύτερου κρητικού συγγραφέα, δημιουργού του Ζορμπά και της Τελευταίας Πειρασμός. Συνέδρια, εκθέσεις, αναγνώσεις και λογοτεχνικές συζητήσεις φέρνουν κοντά ερευνητές, συγγραφείς και θαυμαστές από όλο τον κόσμο στο Ηράκλειο, γενέτειρα του Καζαντζάκη.",
  },
  {
    match: "Lychnostatis Open Air Museum Annual Festival",
    fr: "Le Festival Annuel du Musée en Plein Air Lychnostatis à Hersonissos célèbre la culture et les traditions crétoise à travers des démonstrations artisanales, de la musique live et des danses folkloriques dans un cadre muséal unique consacré à l'architecture et au mode de vie traditionnels de la Crète. Un voyage dans le temps à la découverte du patrimoine ethnographique de l'île.",
    de: "Das Jahresfestival des Freilichtmuseums Lychnostatis in Hersonissos feiert die kretische Kultur und Traditionen mit Handwerksvorführungen, Livemusik und Folkloretänzen in einem einzigartigen musealen Rahmen, der der traditionellen Architektur und Lebensweise Kretas gewidmet ist. Eine Zeitreise zur Entdeckung des ethnografischen Erbes der Insel.",
    el: "Το Ετήσιο Φεστιβάλ του Υπαίθριου Μουσείου Λυχνοστάτη στη Χερσόνησο γιορτάζει την κρητική κουλτούρα και τις παραδόσεις με επιδείξεις χειροτεχνίας, ζωντανή μουσική και λαογραφικούς χορούς σε ένα μοναδικό μουσειακό περιβάλλον αφιερωμένο στην παραδοσιακή αρχιτεκτονική και τον τρόπο ζωής της Κρήτης.",
  },
  {
    match: "Zakros Minoan Festival",
    fr: "Le Festival Minoen de Zakros célèbre l'héritage de la civilisation minoenne dans l'un de ses hauts lieux, le palais minoïque de Zakros à l'extrême est de la Crète. Reconstitutions historiques en costumes d'époque, spectacles artistiques et conférences archéologiques font revivre cette civilisation fascinante qui fleurit il y a plus de 3500 ans sur l'île.",
    de: "Das Minoische Festival von Zakros feiert das Erbe der minoischen Zivilisation an einem ihrer bedeutendsten Schauplätze, dem minoischen Palast von Zakros im äußersten Osten Kretas. Historische Reenactments in zeitgenössischen Kostümen, Kunstvorführungen und archäologische Vorträge lassen diese faszinierende Zivilisation wieder aufleben, die vor mehr als 3500 Jahren auf der Insel blühte.",
    el: "Το Μινωικό Φεστιβάλ Ζάκρου γιορτάζει την κληρονομιά του μινωικού πολιτισμού σε ένα από τα σημαντικότερα κέντρα του, το μινωικό ανάκτορο της Ζάκρου στην ανατολική άκρη της Κρήτης. Ιστορικές αναπαραστάσεις με ενδυμασίες εποχής, καλλιτεχνικές παραστάσεις και αρχαιολογικές διαλέξεις αναβιώνουν αυτόν τον συναρπαστικό πολιτισμό που άκμαζε πριν από 3500 χρόνια.",
  },
  {
    match: "Chania International Film Festival",
    fr: "Le Festival International du Film de La Canée présente une sélection de films grecs et internationaux, courts et longs métrages, dans les cinémas en plein air et salles de la vieille ville. Ce festival cinéphile favorise les échanges culturels et la découverte de cinémas du monde entier dans la belle ville portuaire de La Canée.",
    de: "Das Internationale Filmfestival von Chania präsentiert eine Auswahl griechischer und internationaler Kurz- und Langfilme in Open-Air-Kinos und Sälen der Altstadt. Dieses Cinéphile-Festival fördert kulturellen Austausch und die Entdeckung von Kinos aus aller Welt in der schönen Hafenstadt Chania.",
    el: "Το Διεθνές Φεστιβάλ Κινηματογράφου Χανίων παρουσιάζει μια επιλογή ελληνικών και διεθνών ταινιών, μικρού και μεγάλου μήκους, σε υπαίθρια σινεμά και αίθουσες της παλιάς πόλης. Αυτό το κινηματογραφόφιλο φεστιβάλ προωθεί την πολιτιστική ανταλλαγή και την ανακάλυψη κινηματογραφικών δημιουργιών από όλο τον κόσμο.",
  },
  {
    match: "Spinalonga Festival",
    fr: "Le Festival de Spinalonga propose des spectacles culturels sur le rivage face à cette île historique du golfe d'Elounda, ancienne léproserie rendue célèbre par le roman de Victoria Hislop 'L'Île'. Concerts, théâtre et performances en plein air face au fort vénitien créent une atmosphère unique mêlant art, histoire et paysage lacustre crétois.",
    de: "Das Spinalonga-Festival bietet kulturelle Darbietungen am Ufer gegenüber dieser historischen Insel im Golf von Elounda, der ehemaligen Leprakolonie, die durch Victoria Hislops Roman 'Die Insel' berühmt wurde. Konzerte, Theater und Open-Air-Performances vor der venezianischen Festung schaffen eine einzigartige Atmosphäre aus Kunst, Geschichte und kretischer Seenlandschaft.",
    el: "Το Φεστιβάλ Σπιναλόγκας προσφέρει πολιτιστικές παραστάσεις στην ακτή απέναντι από το ιστορικό νησί του κόλπου Ελούντας, το πρώην λεπροκομείο που έγινε διάσημο από το μυθιστόρημα της Victoria Hislop 'Το Νησί'. Συναυλίες, θέατρο και υπαίθριες παραστάσεις μπροστά στο ενετικό φρούριο δημιουργούν μοναδική ατμόσφαιρα τέχνης, ιστορίας και κρητικού τοπίου.",
  },
  {
    match: "Anogia Lyra Festival",
    fr: "Le Festival de la Lyra d'Anogia célèbre l'instrument emblématique de la musique crétoise dans le village qui a produit les plus grands lyristes de l'île, dont la légendaire famille Xylouris. Concerts en plein air, ateliers de lutherie et de musique, et soirées de chant improvisé (mantinades) réunissent musiciens et mélomanes dans ce haut lieu de la culture crétoise.",
    de: "Das Lyra-Festival von Anogia feiert das emblematische Instrument der kretischen Musik in dem Dorf, das die größten Lyraspieler der Insel hervorgebracht hat, darunter die legendäre Familie Xylouris. Open-Air-Konzerte, Geigenbau- und Musik-Workshops und Abende mit improvisiertem Gesang (Mantinades) bringen Musiker und Musikliebhaber in diesem bedeutenden Ort der kretischen Kultur zusammen.",
    el: "Το Φεστιβάλ Λύρας Ανωγείων γιορτάζει το εμβληματικό όργανο της κρητικής μουσικής στο χωριό που έχει αναδείξει τους μεγαλύτερους λυράρηδες του νησιού, όπως η θρυλική οικογένεια Ξυλούρη. Υπαίθριες συναυλίες, εργαστήρια κατασκευής οργάνων και μουσικής, και βραδιές αυτοσχέδιου τραγουδιού (μαντινάδες) συγκεντρώνουν μουσικούς και λάτρεις στο σημαντικότερο κέντρο κρητικής κουλτούρας.",
  },
  {
    match: "Sfakia Freedom Festival",
    fr: "Le Festival de la Liberté de Sfakia commémore la résistance farouche des Sphakiotes, guerriers légendaires de la Crète occidentale qui n'ont jamais été véritablement soumis ni par les Ottomans ni par les autres envahisseurs. Musique traditionnelle, danses guerrières, reconstitutions historiques et repas communautaires célèbrent cette identité montagnarde et libre, symbole de l'âme crétoise.",
    de: "Das Sfakia-Freiheitsfestival gedenkt des erbitterten Widerstands der Sfakioten, der legendären Krieger Westkrtas, die weder von den Osmanen noch von anderen Eindringlingen wirklich unterworfen wurden. Traditionelle Musik, Kriegstänze, historische Reenactments und Gemeinschaftsmahlzeiten feiern diese bergige und freie Identität, Symbol der kretischen Seele.",
    el: "Το Φεστιβάλ Ελευθερίας Σφακίων τιμά την άγρια αντίσταση των Σφακιανών, των θρυλικών πολεμιστών της δυτικής Κρήτης που δεν υποτάχθηκαν ποτέ ουσιαστικά στους Οθωμανούς ή άλλους εισβολείς. Παραδοσιακή μουσική, πολεμικοί χοροί, ιστορικές αναπαραστάσεις και κοινά γεύματα γιορτάζουν αυτή την ορεινή και ελεύθερη ταυτότητα, σύμβολο της κρητικής ψυχής.",
  },
  {
    match: "Battle of Crete Commemoration",
    fr: "La Commémoration de la Bataille de Crète honore chaque année les soldats alliés et le peuple crétois qui ont résisté héroïquement à l'invasion aéroportée allemande de mai 1941. Des cérémonies officielles, défilés militaires, dépôts de couronnes aux cimetières et expositions historiques se tiennent à Héraklion, La Canée et dans les villages qui furent le théâtre des combats.",
    de: "Die Gedenkfeier zur Schlacht um Kreta ehrt jedes Jahr die alliierten Soldaten und das kretische Volk, die dem deutschen Luftlandeeinfall im Mai 1941 heldenhaft widerstanden. Offizielle Zeremonien, Militärparaden, Kranzniederlegungen auf Friedhöfen und historische Ausstellungen finden in Heraklion, Chania und in den Dörfern statt, die Schauplatz der Kämpfe waren.",
    el: "Η Εορτασμός της Μάχης της Κρήτης τιμά κάθε χρόνο τους συμμαχικούς στρατιώτες και τον κρητικό λαό που αντιστάθηκαν ηρωικά στη γερμανική αεροπόρη εισβολή του Μαΐου 1941. Επίσημες τελετές, στρατιωτικές παρελάσεις, καταθέσεις στεφάνων σε νεκροταφεία και ιστορικές εκθέσεις πραγματοποιούνται στο Ηράκλειο, τα Χανιά και στα χωριά που υπήρξαν πεδίο μαχών.",
  },
  {
    match: "Elounda International Jazz",
    fr: "Le Festival International de Jazz & Blues d'Elounda réunit des musiciens grecs et internationaux au bord du magnifique golfe d'Elounda, l'un des plus beaux plans d'eau de Méditerranée. Concerts en plein air face à la lagune de Spinalonga, jam sessions et ambiance décontractée font de ce festival une parenthèse musicale inoubliable dans l'est de la Crète.",
    de: "Das Internationale Jazz & Blues Festival von Elounda bringt griechische und internationale Musiker an den Rand des wunderschönen Golfs von Elounda, einer der schönsten Meeresflächen des Mittelmeers. Open-Air-Konzerte vor der Spinalonga-Lagune, Jam-Sessions und entspannte Atmosphäre machen dieses Festival zu einem unvergesslichen musikalischen Erlebnis im Osten Kretas.",
    el: "Το Διεθνές Φεστιβάλ Jazz & Blues Ελούντας συγκεντρώνει Έλληνες και διεθνείς μουσικούς στις όχθες του υπέροχου κόλπου Ελούντας, μιας από τις ομορφότερες υδάτινες επιφάνειες της Μεσογείου. Υπαίθριες συναυλίες μπροστά στη λιμνοθάλασσα Σπιναλόγκας, jam sessions και χαλαρή ατμόσφαιρα κάνουν αυτό το φεστιβάλ μια αξέχαστη μουσική εμπειρία.",
  },
  {
    match: "Georgioupoli Lakeside Fair",
    fr: "La Foire au Bord du Lac de Georgioupolis se déroule près du charmant lac Kournas, le seul lac d'eau douce de Crète, dans ce village côtier pittoresque de la région de La Canée. Stands de produits locaux, artisanat crétois, musique traditionnelle et animations familiales créent une atmosphère festive et authentique dans l'un des plus beaux coins de l'île.",
    de: "Die Georgioupolis Seeufer-Messe findet in der Nähe des charmanten Kournas-Sees, dem einzigen Süßwassersee Kretas, in diesem malerischen Küstendorf der Region Chania statt. Stände mit Lokalprodukten, kretisches Kunsthandwerk, traditionelle Musik und Familienunterhaltung schaffen eine festliche und authentische Atmosphäre in einer der schönsten Ecken der Insel.",
    el: "Το Πανηγύρι της Λίμνης Γεωργιούπολης πραγματοποιείται κοντά στη γοητευτική λίμνη Κουρνά, τη μοναδική λίμνη γλυκού νερού της Κρήτης, σε αυτό το γραφικό παράκτιο χωριό της περιοχής Χανίων. Πάγκοι με τοπικά προϊόντα, κρητική χειροτεχνία, παραδοσιακή μουσική και οικογενειακές εκδηλώσεις δημιουργούν γιορτινή και αυθεντική ατμόσφαιρα.",
  },
];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function run() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title_en, description_en, description_fr, description_de, description_el");

  if (error) {
    console.error("Fetch error:", error);
    process.exit(1);
  }

  console.log(`Fetched ${events.length} events from Supabase\n`);

  let updated = 0;
  let skipped = 0;
  const results = [];

  for (const event of events) {
    // Find matching description entry (partial match on title_en)
    const match = descriptions.find((d) =>
      event.title_en && event.title_en.toLowerCase().includes(d.match.toLowerCase())
    );

    if (!match) {
      console.log(`  SKIP id=${event.id} — no enrichment entry for: "${event.title_en}"`);
      skipped++;
      continue;
    }

    // Determine which fields need updating
    const needsFr =
      !event.description_fr ||
      event.description_fr === event.description_en ||
      event.description_fr.trim() === "";

    const needsDe =
      !event.description_de ||
      event.description_de === event.description_en ||
      event.description_de.trim() === "";

    const needsEl =
      !event.description_el ||
      event.description_el.trim() === "";

    if (!needsFr && !needsDe && !needsEl) {
      console.log(`  SKIP id=${event.id} — already enriched: "${event.title_en}"`);
      skipped++;
      continue;
    }

    const updatePayload = {};
    if (needsFr) updatePayload.description_fr = match.fr;
    if (needsDe) updatePayload.description_de = match.de;
    if (needsEl) updatePayload.description_el = match.el;

    const { error: updateError } = await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", event.id);

    if (updateError) {
      console.error(`  ERROR id=${event.id}: ${updateError.message}`);
      results.push({ id: event.id, title: event.title_en, status: "error" });
    } else {
      const langs = Object.keys(updatePayload).map((k) => k.replace("description_", "")).join(", ");
      console.log(`  UPDATED id=${event.id} [${langs}]: "${event.title_en}"`);
      updated++;
      results.push({ id: event.id, title: event.title_en, status: "updated", langs });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`DONE. Updated: ${updated} | Skipped: ${skipped} | Total: ${events.length}`);
  console.log(`${"=".repeat(60)}\n`);
}

run().catch(console.error);
