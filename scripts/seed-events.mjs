/**
 * seed-events.mjs
 * Seeds the Supabase "events" table with 35+ known annual Cretan festivals,
 * religious celebrations, food events, markets, and cultural events.
 *
 * Run: node scripts/seed-events.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fzofxinjsuexjoxlwrhg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_9KIRJh01jgKZ4X5XCpik-w_jWT9BmAX";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// EVENT DEFINITIONS
// Each event uses 2026 dates. is_recurring=true means it happens every year.
// rrule follows the iCalendar RRULE spec (FREQ=YEARLY is sufficient here).
// ---------------------------------------------------------------------------
const events = [
  // ── RELIGIOUS ─────────────────────────────────────────────────────────────
  {
    title_en: "Feast of the Assumption of the Virgin Mary",
    title_el: "Κοίμηση της Θεοτόκου",
    title_fr: "Feast of the Assumption of the Virgin Mary",
    title_de: "Feast of the Assumption of the Virgin Mary",
    description_en:
      "The most important religious holiday in Crete, celebrated on 15 August across every village and town with liturgies, processions, and panigýria. Churches are packed island-wide and many communities hold all-night festivities.",
    description_fr:
      "The most important religious holiday in Crete, celebrated on 15 August across every village and town with liturgies, processions, and panigýria. Churches are packed island-wide and many communities hold all-night festivities.",
    description_de:
      "The most important religious holiday in Crete, celebrated on 15 August across every village and town with liturgies, processions, and panigýria. Churches are packed island-wide and many communities hold all-night festivities.",
    description_el:
      "Η σημαντικότερη θρησκευτική εορτή της Κρήτης, που γιορτάζεται στις 15 Αυγούστου σε κάθε χωριό και πόλη με λειτουργίες, λιτανείες και πανηγύρια.",
    date_start: "2026-08-15",
    date_end: "2026-08-15",
    time_start: null,
    location_name: "Island-wide, Crete",
    region: "central",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=15",
    verified: true,
    source_url: null,
    latitude: null,
    longitude: null,
  },
  {
    title_en: "Orthodox Easter in Crete",
    title_el: "Ορθόδοξο Πάσχα στην Κρήτη",
    title_fr: "Orthodox Easter in Crete",
    title_de: "Orthodox Easter in Crete",
    description_en:
      "Greek Orthodox Easter (Pascha) is the pinnacle of the Cretan religious calendar. The Holy Saturday midnight Resurrection service fills every church square, followed by a collective lamb feast on Easter Sunday. In 2026 it falls on 5 April.",
    description_fr:
      "Greek Orthodox Easter (Pascha) is the pinnacle of the Cretan religious calendar. The Holy Saturday midnight Resurrection service fills every church square, followed by a collective lamb feast on Easter Sunday.",
    description_de:
      "Greek Orthodox Easter (Pascha) is the pinnacle of the Cretan religious calendar. The Holy Saturday midnight Resurrection service fills every church square, followed by a collective lamb feast on Easter Sunday.",
    description_el:
      "Το ελληνορθόδοξο Πάσχα είναι η κορύφωση του θρησκευτικού ημερολογίου της Κρήτης. Η Ανάσταση τα μεσάνυχτα του Μεγάλου Σαββάτου γεμίζει κάθε εκκλησιαστική πλατεία.",
    date_start: "2026-04-05",
    date_end: "2026-04-06",
    time_start: "23:00",
    location_name: "Island-wide, Crete",
    region: "central",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY",
    verified: true,
    source_url: null,
    latitude: null,
    longitude: null,
  },
  {
    title_en: "Clean Monday (Kathara Deftera)",
    title_el: "Καθαρά Δευτέρα",
    title_fr: "Clean Monday (Kathara Deftera)",
    title_de: "Clean Monday (Kathara Deftera)",
    description_en:
      "The first day of Orthodox Lent. Cretans celebrate outdoors with kite-flying, seafood and lagana flatbread picnics. In 2026 it falls on 23 February.",
    description_fr:
      "The first day of Orthodox Lent. Cretans celebrate outdoors with kite-flying, seafood and lagana flatbread picnics. In 2026 it falls on 23 February.",
    description_de:
      "The first day of Orthodox Lent. Cretans celebrate outdoors with kite-flying, seafood and lagana flatbread picnics. In 2026 it falls on 23 February.",
    description_el:
      "Η πρώτη ημέρα της Μεγάλης Σαρακοστής. Χαρταετοί, θαλασσινά και λαγάνα.",
    date_start: "2026-02-23",
    date_end: "2026-02-23",
    time_start: null,
    location_name: "Island-wide, Crete",
    region: "central",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY",
    verified: true,
    source_url: null,
    latitude: null,
    longitude: null,
  },
  {
    title_en: "Feast of Saint Titus (Patron of Heraklion)",
    title_el: "Εορτή Αγίου Τίτου Ηρακλείου",
    title_fr: "Feast of Saint Titus (Patron of Heraklion)",
    title_de: "Feast of Saint Titus (Patron of Heraklion)",
    description_en:
      "Heraklion celebrates its patron saint on 25 August with a solemn liturgy at the Cathedral of Saint Titus, processions through the old city, and civic festivities.",
    description_fr:
      "Heraklion celebrates its patron saint on 25 August with a solemn liturgy at the Cathedral of Saint Titus, processions through the old city, and civic festivities.",
    description_de:
      "Heraklion celebrates its patron saint on 25 August with a solemn liturgy at the Cathedral of Saint Titus, processions through the old city, and civic festivities.",
    description_el:
      "Το Ηράκλειο γιορτάζει τον πολιούχο του στις 25 Αυγούστου με λιτανεία στην Αγία Τριάδα και πολιτιστικές εκδηλώσεις.",
    date_start: "2026-08-25",
    date_end: "2026-08-25",
    time_start: "10:00",
    location_name: "Cathedral of Saint Titus, Heraklion",
    region: "central",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=25",
    verified: true,
    source_url: null,
    latitude: 35.3387,
    longitude: 25.1442,
  },
  {
    title_en: "Feast of the Transfiguration (Metamorfosi)",
    title_el: "Μεταμόρφωση του Σωτήρος",
    title_fr: "Feast of the Transfiguration (Metamorfosi)",
    title_de: "Feast of the Transfiguration (Metamorfosi)",
    description_en:
      "Celebrated on 6 August across Crete. Mountain villages named Metamorfosi hold major panigýria with traditional music, dancing, and food.",
    description_fr:
      "Celebrated on 6 August across Crete. Mountain villages named Metamorfosi hold major panigýria with traditional music, dancing, and food.",
    description_de:
      "Celebrated on 6 August across Crete. Mountain villages named Metamorfosi hold major panigýria with traditional music, dancing, and food.",
    description_el:
      "Γιορτάζεται στις 6 Αυγούστου. Τα χωριά με όνομα Μεταμόρφωση διοργανώνουν μεγάλα πανηγύρια.",
    date_start: "2026-08-06",
    date_end: "2026-08-06",
    time_start: null,
    location_name: "Island-wide, Crete",
    region: "central",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=6",
    verified: true,
    source_url: null,
    latitude: null,
    longitude: null,
  },
  {
    title_en: "Feast of Saint George (Agios Georgios)",
    title_el: "Εορτή Αγίου Γεωργίου",
    title_fr: "Feast of Saint George (Agios Georgios)",
    title_de: "Feast of Saint George (Agios Georgios)",
    description_en:
      "Saint George is patron of many Cretan villages and shepherds. Celebrated on 23 April with horse races and traditional festivities in the village of Asi Gonia (Rethymno) and many other locations.",
    description_fr:
      "Saint George is patron of many Cretan villages and shepherds. Celebrated on 23 April with horse races and traditional festivities.",
    description_de:
      "Saint George is patron of many Cretan villages and shepherds. Celebrated on 23 April with horse races and traditional festivities.",
    description_el:
      "Ο Άγιος Γεώργιος είναι προστάτης πολλών κρητικών χωριών. Γιορτάζεται στις 23 Απριλίου με ιπποδρομίες και παραδοσιακές εκδηλώσεις.",
    date_start: "2026-04-23",
    date_end: "2026-04-23",
    time_start: null,
    location_name: "Asi Gonia, Rethymno",
    region: "west",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=23",
    verified: true,
    source_url: null,
    latitude: 35.2597,
    longitude: 24.3761,
  },

  // ── CARNIVAL ──────────────────────────────────────────────────────────────
  {
    title_en: "Rethymno Carnival",
    title_el: "Αποκριάτικο Καρναβάλι Ρεθύμνου",
    title_fr: "Rethymno Carnival",
    title_de: "Rethymno Carnival",
    description_en:
      "One of the largest carnivals in Greece, held for several weeks before Lent in Rethymno. The grand parade through the old Venetian city draws tens of thousands. In 2026 the main parade falls on 22 February.",
    description_fr:
      "One of the largest carnivals in Greece, held for several weeks before Lent in Rethymno. The grand parade through the old Venetian city draws tens of thousands.",
    description_de:
      "One of the largest carnivals in Greece, held for several weeks before Lent in Rethymno. The grand parade through the old Venetian city draws tens of thousands.",
    description_el:
      "Ένα από τα μεγαλύτερα καρναβάλια στην Ελλάδα. Η μεγάλη παρέλαση στην παλιά βενετική πόλη του Ρεθύμνου.",
    date_start: "2026-02-01",
    date_end: "2026-02-22",
    time_start: null,
    location_name: "Old Town, Rethymno",
    region: "west",
    category: "festival",
    is_recurring: true,
    rrule: "FREQ=YEARLY",
    verified: true,
    source_url: "https://www.rethymno-carnival.gr",
    latitude: 35.3713,
    longitude: 24.4731,
  },
  {
    title_en: "Heraklion Carnival",
    title_el: "Αποκριές Ηρακλείου",
    title_fr: "Heraklion Carnival",
    title_de: "Heraklion Carnival",
    description_en:
      "Heraklion's Apokries carnival season features masked balls, street events, and a grand carnival parade in the city centre before the start of Lent.",
    description_fr:
      "Heraklion's Apokries carnival season features masked balls, street events, and a grand carnival parade in the city centre before the start of Lent.",
    description_de:
      "Heraklion's Apokries carnival season features masked balls, street events, and a grand carnival parade in the city centre before the start of Lent.",
    description_el:
      "Η αποκριάτικη σεζόν του Ηρακλείου με αποκριάτικες εκδηλώσεις και μεγάλη παρέλαση.",
    date_start: "2026-02-15",
    date_end: "2026-02-22",
    time_start: null,
    location_name: "City Centre, Heraklion",
    region: "central",
    category: "festival",
    is_recurring: true,
    rrule: "FREQ=YEARLY",
    verified: true,
    source_url: null,
    latitude: 35.3401,
    longitude: 25.1341,
  },

  // ── MUSIC & CULTURAL ──────────────────────────────────────────────────────
  {
    title_en: "Matala Beach Festival",
    title_el: "Φεστιβάλ Μάταλα",
    title_fr: "Matala Beach Festival",
    title_de: "Matala Beach Festival",
    description_en:
      "An iconic open-air rock and world music festival held on the famous Matala beach (south Heraklion), celebrating the hippie legacy of the 1970s. Typically held mid-June over a weekend.",
    description_fr:
      "An iconic open-air rock and world music festival held on the famous Matala beach (south Heraklion), celebrating the hippie legacy of the 1970s.",
    description_de:
      "An iconic open-air rock and world music festival held on the famous Matala beach (south Heraklion), celebrating the hippie legacy of the 1970s.",
    description_el:
      "Το εμβληματικό φεστιβάλ ανοιχτής σκηνής στην παραλία Μάταλα, με ροκ και παγκόσμια μουσική.",
    date_start: "2026-06-12",
    date_end: "2026-06-14",
    time_start: "18:00",
    location_name: "Matala Beach, Heraklion",
    region: "central",
    category: "music",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=6",
    verified: true,
    source_url: "https://www.matalabeachfestival.gr",
    latitude: 34.9958,
    longitude: 24.7516,
  },
  {
    title_en: "Heraklion Summer Arts Festival",
    title_el: "Καλοκαιρινό Φεστιβάλ Ηρακλείου",
    title_fr: "Heraklion Summer Arts Festival",
    title_de: "Heraklion Summer Arts Festival",
    description_en:
      "Annual summer festival of theatre, classical music, and dance held at the Nikos Kazantzakis Open-Air Theatre and Koules Venetian Fortress in Heraklion. Runs July through August.",
    description_fr:
      "Annual summer festival of theatre, classical music, and dance held at the Nikos Kazantzakis Open-Air Theatre and Koules Venetian Fortress in Heraklion.",
    description_de:
      "Annual summer festival of theatre, classical music, and dance held at the Nikos Kazantzakis Open-Air Theatre and Koules Venetian Fortress in Heraklion.",
    description_el:
      "Καλοκαιρινό φεστιβάλ θεάτρου, κλασικής μουσικής και χορού στο Ανοιχτό Θέατρο Νίκος Καζαντζάκης.",
    date_start: "2026-07-01",
    date_end: "2026-08-31",
    time_start: "21:00",
    location_name: "Nikos Kazantzakis Open Theatre, Heraklion",
    region: "central",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=7",
    verified: true,
    source_url: null,
    latitude: 35.3406,
    longitude: 25.1349,
  },
  {
    title_en: "Rethymno Renaissance Festival",
    title_el: "Φεστιβάλ Αναγέννησης Ρεθύμνου",
    title_fr: "Rethymno Renaissance Festival",
    title_de: "Rethymno Renaissance Festival",
    description_en:
      "A unique cultural festival celebrating Rethymno's Venetian heritage, with Renaissance music, period costumes, theatrical performances and art exhibitions in the old town. Typically held in July–August.",
    description_fr:
      "A unique cultural festival celebrating Rethymno's Venetian heritage, with Renaissance music, period costumes, theatrical performances and art exhibitions in the old town.",
    description_de:
      "A unique cultural festival celebrating Rethymno's Venetian heritage, with Renaissance music, period costumes, theatrical performances and art exhibitions in the old town.",
    description_el:
      "Μοναδικό πολιτιστικό φεστιβάλ που γιορτάζει τη βενετική κληρονομιά του Ρεθύμνου, με μουσική Αναγέννησης, ενδυμασίες εποχής και θεατρικές παραστάσεις.",
    date_start: "2026-07-15",
    date_end: "2026-08-20",
    time_start: "20:30",
    location_name: "Old Town, Rethymno",
    region: "west",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=7",
    verified: true,
    source_url: null,
    latitude: 35.3713,
    longitude: 24.4731,
  },
  {
    title_en: "Sitia Cultural Summer",
    title_el: "Πολιτιστικό Καλοκαίρι Σητείας",
    title_fr: "Sitia Cultural Summer",
    title_de: "Sitia Cultural Summer",
    description_en:
      "Sitia organises a full calendar of summer cultural events including concerts, theatre and art exhibitions throughout July and August in its Venetian fortress and town squares.",
    description_fr:
      "Sitia organises a full calendar of summer cultural events including concerts, theatre and art exhibitions throughout July and August.",
    description_de:
      "Sitia organises a full calendar of summer cultural events including concerts, theatre and art exhibitions throughout July and August.",
    description_el:
      "Το Πολιτιστικό Καλοκαίρι Σητείας με συναυλίες, θέατρο και εκθέσεις στο Φρούριο Καζάρμα.",
    date_start: "2026-07-01",
    date_end: "2026-08-31",
    time_start: "20:00",
    location_name: "Kazarma Fortress, Sitia",
    region: "east",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=7",
    verified: true,
    source_url: null,
    latitude: 35.2065,
    longitude: 26.1015,
  },
  {
    title_en: "Ierapetra Summer Cultural Events",
    title_el: "Πολιτιστικές Εκδηλώσεις Ιεράπετρας",
    title_fr: "Ierapetra Summer Cultural Events",
    title_de: "Ierapetra Summer Cultural Events",
    description_en:
      "The southernmost city in Europe hosts concerts, folk dance performances, and cultural exhibitions throughout summer at the Kales Venetian fortress and waterfront.",
    description_fr:
      "The southernmost city in Europe hosts concerts, folk dance performances, and cultural exhibitions throughout summer.",
    description_de:
      "The southernmost city in Europe hosts concerts, folk dance performances, and cultural exhibitions throughout summer.",
    description_el:
      "Η νοτιότερη πόλη της Ευρώπης φιλοξενεί συναυλίες, χορευτικές παραστάσεις και εκθέσεις κατά τη διάρκεια του καλοκαιριού.",
    date_start: "2026-07-01",
    date_end: "2026-08-31",
    time_start: "20:30",
    location_name: "Kales Fortress, Ierapetra",
    region: "east",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=7",
    verified: true,
    source_url: null,
    latitude: 35.0103,
    longitude: 25.7408,
  },

  // ── FOOD & WINE ───────────────────────────────────────────────────────────
  {
    title_en: "Cretan Diet Festival",
    title_el: "Φεστιβάλ Κρητικής Διατροφής",
    title_fr: "Cretan Diet Festival",
    title_de: "Cretan Diet Festival",
    description_en:
      "A festival dedicated to the UNESCO-recognised Mediterranean diet of Crete, held in Rethymno each autumn. Local producers, chefs, and nutritionists showcase traditional products: olive oil, herbs, honey, wine, cheeses, and raki.",
    description_fr:
      "A festival dedicated to the UNESCO-recognised Mediterranean diet of Crete, held in Rethymno each autumn. Local producers showcase traditional products: olive oil, herbs, honey, wine, cheeses, and raki.",
    description_de:
      "A festival dedicated to the UNESCO-recognised Mediterranean diet of Crete, held in Rethymno each autumn. Local producers showcase traditional products: olive oil, herbs, honey, wine, cheeses, and raki.",
    description_el:
      "Φεστιβάλ αφιερωμένο στην κρητική διατροφή, με τοπικούς παραγωγούς, σεφ και γαστρονομικές εκδηλώσεις στο Ρέθυμνο.",
    date_start: "2026-10-09",
    date_end: "2026-10-11",
    time_start: "10:00",
    location_name: "Old Town, Rethymno",
    region: "west",
    category: "food",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=10",
    verified: true,
    source_url: null,
    latitude: 35.3713,
    longitude: 24.4731,
  },
  {
    title_en: "Sitia Wine Festival (Sultana Festival)",
    title_el: "Φεστιβάλ Σουλτανίνας Σητείας",
    title_fr: "Sitia Wine Festival (Sultana Festival)",
    title_de: "Sitia Wine Festival (Sultana Festival)",
    description_en:
      "Sitia, famous for its Muscat of Sitia PDO wines and sultana raisins, hosts this annual harvest festival in late August with wine and raisin tastings, traditional music, and dance.",
    description_fr:
      "Sitia hosts this annual harvest festival in late August with wine and raisin tastings, traditional music, and dance.",
    description_de:
      "Sitia hosts this annual harvest festival in late August with wine and raisin tastings, traditional music, and dance.",
    description_el:
      "Η Σητεία, φημισμένη για τα κρασιά ΠΟΠ Μοσχάτο Σητείας, φιλοξενεί ετήσιο φεστιβάλ τρύγου με γευστικές δοκιμές και χορό.",
    date_start: "2026-08-22",
    date_end: "2026-08-23",
    time_start: "19:00",
    location_name: "Sitia Town, Lasithi",
    region: "east",
    category: "food",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8",
    verified: true,
    source_url: null,
    latitude: 35.2065,
    longitude: 26.1015,
  },
  {
    title_en: "Anogia Tsikoudia Festival",
    title_el: "Γιορτή Τσικουδιάς Ανωγείων",
    title_fr: "Anogia Tsikoudia Festival",
    title_de: "Anogia Tsikoudia Festival",
    description_en:
      "Anogia, the mountain stronghold famous for its warrior spirit and music, celebrates the distillation of tsikoudia (Cretan grappa) each autumn with communal distillery events, traditional food, and live lyra music.",
    description_fr:
      "Anogia celebrates the distillation of tsikoudia (Cretan grappa) each autumn with communal distillery events, traditional food, and live lyra music.",
    description_de:
      "Anogia celebrates the distillation of tsikoudia (Cretan grappa) each autumn with communal distillery events, traditional food, and live lyra music.",
    description_el:
      "Τα Ανώγεια γιορτάζουν την απόσταξη τσικουδιάς κάθε φθινόπωρο με παραδοσιακό φαγητό και ζωντανή κρητική μουσική.",
    date_start: "2026-11-07",
    date_end: "2026-11-08",
    time_start: "11:00",
    location_name: "Anogia, Rethymno",
    region: "central",
    category: "food",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=11",
    verified: true,
    source_url: null,
    latitude: 35.2913,
    longitude: 24.8785,
  },
  {
    title_en: "Olive Harvest Festival, Kolymvari",
    title_el: "Γιορτή Ελιάς Κολυμπαρίου",
    title_fr: "Olive Harvest Festival, Kolymvari",
    title_de: "Olive Harvest Festival, Kolymvari",
    description_en:
      "Kolymvari in western Crete, heart of the Kolymvari PDO olive oil region, celebrates the olive harvest each November with tastings, pressing demonstrations, and traditional Cretan hospitality.",
    description_fr:
      "Kolymvari celebrates the olive harvest each November with tastings, pressing demonstrations, and traditional Cretan hospitality.",
    description_de:
      "Kolymvari celebrates the olive harvest each November with tastings, pressing demonstrations, and traditional Cretan hospitality.",
    description_el:
      "Το Κολυμπάρι γιορτάζει τη συγκομιδή της ελιάς κάθε Νοέμβριο με γευστικές δοκιμές ελαιόλαδου και παραδοσιακές εκδηλώσεις.",
    date_start: "2026-11-14",
    date_end: "2026-11-15",
    time_start: "10:00",
    location_name: "Kolymvari, Chania",
    region: "west",
    category: "food",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=11",
    verified: true,
    source_url: null,
    latitude: 35.5337,
    longitude: 23.7032,
  },
  {
    title_en: "Cretan Honey Festival",
    title_el: "Γιορτή Κρητικού Μελιού",
    title_fr: "Cretan Honey Festival",
    title_de: "Cretan Honey Festival",
    description_en:
      "Celebrating Crete's exceptional thyme honey, one of the finest in the world, this festival features honey tastings, beekeeper demonstrations, and local artisan products. Usually held in Viannos or the Psiloritis foothills.",
    description_fr:
      "Celebrating Crete's exceptional thyme honey, this festival features honey tastings, beekeeper demonstrations, and local artisan products.",
    description_de:
      "Celebrating Crete's exceptional thyme honey, this festival features honey tastings, beekeeper demonstrations, and local artisan products.",
    description_el:
      "Γιορτή αφιερωμένη στο θυμαρίσιο μέλι Κρήτης, με γευστικές δοκιμές, επιδείξεις μελισσοκόμων και τοπικά προϊόντα.",
    date_start: "2026-08-29",
    date_end: "2026-08-30",
    time_start: "10:00",
    location_name: "Viannos, Heraklion",
    region: "central",
    category: "food",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8",
    verified: true,
    source_url: null,
    latitude: 35.0341,
    longitude: 25.4051,
  },

  // ── PANIGÝRIA (village saint day festivals) ───────────────────────────────
  {
    title_en: "Panigyri of Agios Nikolaos – Agios Nikolaos City",
    title_el: "Πανηγύρι Αγίου Νικολάου",
    title_fr: "Panigyri of Agios Nikolaos – Agios Nikolaos City",
    title_de: "Panigyri of Agios Nikolaos – Agios Nikolaos City",
    description_en:
      "The town of Agios Nikolaos celebrates its patron saint on 6 December with religious services, music, and festivities around Lake Voulismeni and the harbour.",
    description_fr:
      "The town of Agios Nikolaos celebrates its patron saint on 6 December with religious services, music, and festivities.",
    description_de:
      "The town of Agios Nikolaos celebrates its patron saint on 6 December with religious services, music, and festivities.",
    description_el:
      "Ο Άγιος Νικόλαος γιορτάζει τον πολιούχο του στις 6 Δεκεμβρίου με λειτουργία και πανηγύρι στη λίμνη Βουλισμένη.",
    date_start: "2026-12-06",
    date_end: "2026-12-06",
    time_start: "10:00",
    location_name: "Agios Nikolaos, Lasithi",
    region: "east",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=6",
    verified: true,
    source_url: null,
    latitude: 35.1897,
    longitude: 25.7163,
  },
  {
    title_en: "Panigyri of Prophet Elijah (Profitis Ilias)",
    title_el: "Πανηγύρι Προφήτη Ηλία",
    title_fr: "Panigyri of Prophet Elijah (Profitis Ilias)",
    title_de: "Panigyri of Prophet Elijah (Profitis Ilias)",
    description_en:
      "Celebrated on 20 July on hilltop chapels across Crete. The pilgrimage to the Profitis Ilias chapel on Mount Psiloritis (highest peak in Crete, 2456 m) is the most impressive, attracting thousands.",
    description_fr:
      "Celebrated on 20 July on hilltop chapels across Crete. The pilgrimage to the Profitis Ilias chapel on Mount Psiloritis is the most impressive.",
    description_de:
      "Celebrated on 20 July on hilltop chapels across Crete. The pilgrimage to the Profitis Ilias chapel on Mount Psiloritis is the most impressive.",
    description_el:
      "Γιορτάζεται στις 20 Ιουλίου σε εκκλησάκια κορυφών σε ολόκληρη την Κρήτη. Η προσκύνηση στον Προφήτη Ηλία του Ψηλορείτη είναι η πιο εντυπωσιακή.",
    date_start: "2026-07-20",
    date_end: "2026-07-20",
    time_start: "06:00",
    location_name: "Mount Psiloritis, Rethymno",
    region: "central",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=7;BYMONTHDAY=20",
    verified: true,
    source_url: null,
    latitude: 35.2191,
    longitude: 24.7483,
  },
  {
    title_en: "Panigyri of Agia Triada Monastery",
    title_el: "Πανηγύρι Μονής Αγίας Τριάδας Τζαγκαρόλων",
    title_fr: "Panigyri of Agia Triada Monastery",
    title_de: "Panigyri of Agia Triada Monastery",
    description_en:
      "The 17th-century Venetian-era Agia Triada monastery on the Akrotiri peninsula celebrates Trinity Sunday, drawing pilgrims for the liturgy and afterwards a traditional gathering on the monastery grounds.",
    description_fr:
      "The 17th-century Agia Triada monastery on the Akrotiri peninsula celebrates Trinity Sunday with pilgrims and a traditional gathering.",
    description_de:
      "The 17th-century Agia Triada monastery on the Akrotiri peninsula celebrates Trinity Sunday with pilgrims and a traditional gathering.",
    description_el:
      "Η Μονή Αγίας Τριάδας στο Ακρωτήρι γιορτάζει κάθε Κυριακή της Πεντηκοστής.",
    date_start: "2026-06-07",
    date_end: "2026-06-07",
    time_start: "09:00",
    location_name: "Agia Triada Monastery, Akrotiri, Chania",
    region: "west",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY",
    verified: true,
    source_url: null,
    latitude: 35.5565,
    longitude: 24.0778,
  },
  {
    title_en: "Panigyri of Toplou Monastery",
    title_el: "Πανηγύρι Μονής Τοπλού",
    title_fr: "Panigyri of Toplou Monastery",
    title_de: "Panigyri of Toplou Monastery",
    description_en:
      "Toplou Monastery, one of the most important monasteries in Crete (near Sitia), celebrates its feast day on 26 June. The monastery is also known for its organic olive oil and wine production.",
    description_fr:
      "Toplou Monastery, one of the most important monasteries in Crete, celebrates its feast day on 26 June.",
    description_de:
      "Toplou Monastery, one of the most important monasteries in Crete, celebrates its feast day on 26 June.",
    description_el:
      "Η Μονή Τοπλού, από τις σημαντικότερες της Κρήτης, γιορτάζει στις 26 Ιουνίου.",
    date_start: "2026-06-26",
    date_end: "2026-06-26",
    time_start: "09:00",
    location_name: "Toplou Monastery, Sitia",
    region: "east",
    category: "religious",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=26",
    verified: true,
    source_url: null,
    latitude: 35.2494,
    longitude: 26.2086,
  },

  // ── SPORTS ────────────────────────────────────────────────────────────────
  {
    title_en: "Heraklion International Road Race",
    title_el: "Διεθνής Αγώνας Δρόμου Ηρακλείου",
    title_fr: "Heraklion International Road Race",
    title_de: "Heraklion International Road Race",
    description_en:
      "An international road running event starting and finishing in central Heraklion, with distances ranging from 5 km to half-marathon. Typically held in May.",
    description_fr:
      "An international road running event in central Heraklion, with distances from 5 km to half-marathon. Typically held in May.",
    description_de:
      "An international road running event in central Heraklion, with distances from 5 km to half-marathon. Typically held in May.",
    description_el:
      "Διεθνής αγώνας δρόμου στο κέντρο του Ηρακλείου, με αποστάσεις 5 χλμ έως ημιμαραθώνιο.",
    date_start: "2026-05-10",
    date_end: "2026-05-10",
    time_start: "08:00",
    location_name: "Heraklion City Centre",
    region: "central",
    category: "sport",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=5",
    verified: true,
    source_url: null,
    latitude: 35.3401,
    longitude: 25.1341,
  },
  {
    title_en: "Crete Marathon (Rethymno Run)",
    title_el: "Μαραθώνιος Κρήτης – Ρέθυμνο",
    title_fr: "Crete Marathon (Rethymno Run)",
    title_de: "Crete Marathon (Rethymno Run)",
    description_en:
      "Rethymno hosts a coastal marathon and fun run along the beautiful northern coast, with the Venetian lighthouse as backdrop. Usually held in October.",
    description_fr:
      "Rethymno hosts a coastal marathon and fun run along the beautiful northern coast. Usually held in October.",
    description_de:
      "Rethymno hosts a coastal marathon and fun run along the beautiful northern coast. Usually held in October.",
    description_el:
      "Ο μαραθώνιος του Ρεθύμνου κατά μήκος της βόρειας παράκτιας οδού, με φόντο τον βενετικό φάρο.",
    date_start: "2026-10-18",
    date_end: "2026-10-18",
    time_start: "08:00",
    location_name: "Rethymno Seafront",
    region: "west",
    category: "sport",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=10",
    verified: true,
    source_url: null,
    latitude: 35.3713,
    longitude: 24.4731,
  },
  {
    title_en: "Gorge of Samaria Running Race",
    title_el: "Αγώνας Δρόμου Φαραγγιού Σαμαριάς",
    title_fr: "Gorge of Samaria Running Race",
    title_de: "Gorge of Samaria Running Race",
    description_en:
      "A trail running race through the spectacular Samaria Gorge (longest gorge in Europe, 16 km), descending from the Omalos plateau to Agia Roumeli. Held in early May when the gorge opens.",
    description_fr:
      "A trail running race through the spectacular Samaria Gorge (longest gorge in Europe), descending from the Omalos plateau to Agia Roumeli.",
    description_de:
      "A trail running race through the spectacular Samaria Gorge (longest gorge in Europe), descending from the Omalos plateau to Agia Roumeli.",
    description_el:
      "Αγώνας trail running μέσα από το εντυπωσιακό Φαράγγι της Σαμαριάς (το μακρύτερο στην Ευρώπη).",
    date_start: "2026-05-03",
    date_end: "2026-05-03",
    time_start: "07:00",
    location_name: "Samaria Gorge, Chania",
    region: "west",
    category: "sport",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=5",
    verified: true,
    source_url: null,
    latitude: 35.2955,
    longitude: 23.9696,
  },

  // ── MARKETS ───────────────────────────────────────────────────────────────
  {
    title_en: "Heraklion Saturday Market (Laiki Agora)",
    title_el: "Λαϊκή Αγορά Ηρακλείου – Σάββατο",
    title_fr: "Heraklion Saturday Market (Laiki Agora)",
    title_de: "Heraklion Saturday Market (Laiki Agora)",
    description_en:
      "Heraklion's main weekly open-air market on Saturdays, held along Odos 62 Martyron. Fresh produce, cheeses, olives, herbs, spices, and local products from Cretan producers.",
    description_fr:
      "Heraklion's main weekly open-air market on Saturdays. Fresh produce, cheeses, olives, herbs, and local products from Cretan producers.",
    description_de:
      "Heraklion's main weekly open-air market on Saturdays. Fresh produce, cheeses, olives, herbs, and local products from Cretan producers.",
    description_el:
      "Η κεντρική εβδομαδιαία λαϊκή αγορά του Ηρακλείου κάθε Σάββατο στην οδό 62 Μαρτύρων.",
    date_start: "2026-01-03",
    date_end: null,
    time_start: "07:00",
    location_name: "Odos 62 Martyron, Heraklion",
    region: "central",
    category: "market",
    is_recurring: true,
    rrule: "FREQ=WEEKLY;BYDAY=SA",
    verified: true,
    source_url: null,
    latitude: 35.3298,
    longitude: 25.1157,
  },
  {
    title_en: "Chania Old Town Market (Covered Market)",
    title_el: "Δημοτική Αγορά Χανίων",
    title_fr: "Chania Old Town Market (Covered Market)",
    title_de: "Chania Old Town Market (Covered Market)",
    description_en:
      "The landmark covered market of Chania, built in 1913 in a cross-shaped Venetian-Byzantine style, operates daily (closed Sundays). One of the best places to buy Cretan products: honey, thyme, olive oil, herbs, and leather goods.",
    description_fr:
      "The landmark covered market of Chania, built in 1913, operates daily (closed Sundays). One of the best places to buy Cretan products.",
    description_de:
      "The landmark covered market of Chania, built in 1913, operates daily (closed Sundays). One of the best places to buy Cretan products.",
    description_el:
      "Η ιστορική Δημοτική Αγορά Χανίων, χτισμένη το 1913, λειτουργεί καθημερινά (εκτός Κυριακής).",
    date_start: "2026-01-05",
    date_end: null,
    time_start: "08:00",
    location_name: "Chania Covered Market, Chania",
    region: "west",
    category: "market",
    is_recurring: true,
    rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA",
    verified: true,
    source_url: null,
    latitude: 35.5142,
    longitude: 24.0177,
  },
  {
    title_en: "Rethymno Thursday Market",
    title_el: "Λαϊκή Αγορά Ρεθύμνου – Πέμπτη",
    title_fr: "Rethymno Thursday Market",
    title_de: "Rethymno Thursday Market",
    description_en:
      "Rethymno's weekly farmers market every Thursday morning near the municipal park. Fresh vegetables, fruit, olives, local dairy products, and household goods.",
    description_fr:
      "Rethymno's weekly farmers market every Thursday morning. Fresh vegetables, fruit, olives, local dairy products, and household goods.",
    description_de:
      "Rethymno's weekly farmers market every Thursday morning. Fresh vegetables, fruit, olives, local dairy products, and household goods.",
    description_el:
      "Η εβδομαδιαία λαϊκή αγορά του Ρεθύμνου κάθε Πέμπτη πρωί.",
    date_start: "2026-01-08",
    date_end: null,
    time_start: "07:30",
    location_name: "Rethymno Municipal Park Area",
    region: "west",
    category: "market",
    is_recurring: true,
    rrule: "FREQ=WEEKLY;BYDAY=TH",
    verified: true,
    source_url: null,
    latitude: 35.3713,
    longitude: 24.4731,
  },
  {
    title_en: "Agios Nikolaos Wednesday Market",
    title_el: "Λαϊκή Αγορά Αγίου Νικολάου – Τετάρτη",
    title_fr: "Agios Nikolaos Wednesday Market",
    title_de: "Agios Nikolaos Wednesday Market",
    description_en:
      "Agios Nikolaos holds its weekly open-air market every Wednesday morning. Local Lasithi produce: olive oil, herbs, citrus, fresh cheeses, and traditional crafts.",
    description_fr:
      "Agios Nikolaos holds its weekly open-air market every Wednesday morning. Local Lasithi produce: olive oil, herbs, citrus, fresh cheeses, and traditional crafts.",
    description_de:
      "Agios Nikolaos holds its weekly open-air market every Wednesday morning. Local Lasithi produce: olive oil, herbs, citrus, fresh cheeses, and traditional crafts.",
    description_el:
      "Η εβδομαδιαία λαϊκή αγορά του Αγίου Νικολάου κάθε Τετάρτη.",
    date_start: "2026-01-07",
    date_end: null,
    time_start: "07:00",
    location_name: "Agios Nikolaos, Lasithi",
    region: "east",
    category: "market",
    is_recurring: true,
    rrule: "FREQ=WEEKLY;BYDAY=WE",
    verified: true,
    source_url: null,
    latitude: 35.1897,
    longitude: 25.7163,
  },
  {
    title_en: "Sitia Saturday Farmers Market",
    title_el: "Λαϊκή Αγορά Σητείας – Σάββατο",
    title_fr: "Sitia Saturday Farmers Market",
    title_de: "Sitia Saturday Farmers Market",
    description_en:
      "Sitia's weekly Saturday market where local producers from across the Lasithi plateau and eastern Crete sell fresh produce, olive oil, sultana raisins, and local cheeses.",
    description_fr:
      "Sitia's weekly Saturday market where local producers sell fresh produce, olive oil, sultana raisins, and local cheeses.",
    description_de:
      "Sitia's weekly Saturday market where local producers sell fresh produce, olive oil, sultana raisins, and local cheeses.",
    description_el:
      "Η εβδομαδιαία λαϊκή αγορά της Σητείας κάθε Σάββατο, με τοπικούς παραγωγούς από το Λασίθι.",
    date_start: "2026-01-03",
    date_end: null,
    time_start: "07:30",
    location_name: "Sitia Town, Lasithi",
    region: "east",
    category: "market",
    is_recurring: true,
    rrule: "FREQ=WEEKLY;BYDAY=SA",
    verified: true,
    source_url: null,
    latitude: 35.2065,
    longitude: 26.1015,
  },

  // ── ADDITIONAL CULTURAL / HERITAGE ────────────────────────────────────────
  {
    title_en: "Nikos Kazantzakis International Meeting",
    title_el: "Διεθνής Συνάντηση Νίκου Καζαντζάκη",
    title_fr: "Nikos Kazantzakis International Meeting",
    title_de: "Nikos Kazantzakis International Meeting",
    description_en:
      "An international literary and cultural event held in Heraklion celebrating Cretan author Nikos Kazantzakis (Zorba the Greek, The Last Temptation of Christ), with talks, readings, and performances.",
    description_fr:
      "An international literary and cultural event in Heraklion celebrating Cretan author Nikos Kazantzakis, with talks, readings, and performances.",
    description_de:
      "An international literary and cultural event in Heraklion celebrating Cretan author Nikos Kazantzakis, with talks, readings, and performances.",
    description_el:
      "Διεθνής λογοτεχνική και πολιτιστική εκδήλωση στο Ηράκλειο αφιερωμένη στον Νίκο Καζαντζάκη.",
    date_start: "2026-10-26",
    date_end: "2026-10-28",
    time_start: "18:00",
    location_name: "Heraklion, Kazantzakis Museum",
    region: "central",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=10",
    verified: true,
    source_url: null,
    latitude: 35.3401,
    longitude: 25.1341,
  },
  {
    title_en: "Lychnostatis Open Air Museum Annual Festival",
    title_el: "Φεστιβάλ Λυχνοστάτη Ανοιχτού Μουσείου",
    title_fr: "Lychnostatis Open Air Museum Annual Festival",
    title_de: "Lychnostatis Open Air Museum Annual Festival",
    description_en:
      "The Lychnostatis Open Air Museum of Cretan culture near Hersonissos hosts an annual summer festival with traditional music, dance, craft demonstrations, and Cretan gastronomy.",
    description_fr:
      "The Lychnostatis Open Air Museum near Hersonissos hosts an annual summer festival with traditional music, dance, craft demonstrations, and Cretan gastronomy.",
    description_de:
      "The Lychnostatis Open Air Museum near Hersonissos hosts an annual summer festival with traditional music, dance, craft demonstrations, and Cretan gastronomy.",
    description_el:
      "Το Υπαίθριο Μουσείο Λυχνοστάτης στο Χερσόνησο φιλοξενεί ετήσιο φεστιβάλ με παραδοσιακή μουσική και Κρητική γαστρονομία.",
    date_start: "2026-07-25",
    date_end: "2026-07-26",
    time_start: "19:00",
    location_name: "Lychnostatis Museum, Hersonissos",
    region: "central",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=7",
    verified: true,
    source_url: "https://www.lychnostatis.gr",
    latitude: 35.2969,
    longitude: 25.4072,
  },
  {
    title_en: "Zakros Minoan Festival",
    title_el: "Φεστιβάλ Μινωικής Ζάκρου",
    title_fr: "Zakros Minoan Festival",
    title_de: "Zakros Minoan Festival",
    description_en:
      "Kato Zakros, site of a Minoan palace on the far eastern tip of Crete, celebrates its unique archaeological heritage with a summer cultural festival featuring Minoan re-enactments, traditional music, and guided excavation tours.",
    description_fr:
      "Kato Zakros, site of a Minoan palace, celebrates its heritage with a summer cultural festival featuring Minoan re-enactments and traditional music.",
    description_de:
      "Kato Zakros, site of a Minoan palace, celebrates its heritage with a summer cultural festival featuring Minoan re-enactments and traditional music.",
    description_el:
      "Ο Κάτω Ζάκρος, τόπος Μινωικού ανακτόρου, γιορτάζει την αρχαιολογική κληρονομιά με καλοκαιρινό πολιτιστικό φεστιβάλ.",
    date_start: "2026-08-08",
    date_end: "2026-08-09",
    time_start: "19:00",
    location_name: "Kato Zakros, Sitia",
    region: "east",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8",
    verified: true,
    source_url: null,
    latitude: 35.0986,
    longitude: 26.2653,
  },
  {
    title_en: "Chania International Film Festival",
    title_el: "Διεθνές Φεστιβάλ Κινηματογράφου Χανίων",
    title_fr: "Chania International Film Festival",
    title_de: "Chania International Film Festival",
    description_en:
      "An international film festival held in Chania's historic venues each autumn, screening European and Mediterranean productions with a focus on Greek and Balkan cinema.",
    description_fr:
      "An international film festival held in Chania's historic venues each autumn, screening European and Mediterranean productions.",
    description_de:
      "An international film festival held in Chania's historic venues each autumn, screening European and Mediterranean productions.",
    description_el:
      "Διεθνές φεστιβάλ κινηματογράφου στα ιστορικά χώρους των Χανίων, με ευρωπαϊκές και μεσογειακές παραγωγές.",
    date_start: "2026-10-01",
    date_end: "2026-10-07",
    time_start: "20:00",
    location_name: "Chania Old Town",
    region: "west",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=10",
    verified: true,
    source_url: null,
    latitude: 35.5142,
    longitude: 24.0177,
  },
  {
    title_en: "Spinalonga Festival",
    title_el: "Φεστιβάλ Σπιναλόγκας",
    title_fr: "Spinalonga Festival",
    title_de: "Spinalonga Festival",
    description_en:
      "A unique open-air cultural festival held on and around the historic Spinalonga island (former Venetian fortress and last active leper colony in Europe), with theatrical performances and music accessible by boat.",
    description_fr:
      "A unique open-air cultural festival held on the historic Spinalonga island, with theatrical performances and music accessible by boat.",
    description_de:
      "A unique open-air cultural festival held on the historic Spinalonga island, with theatrical performances and music accessible by boat.",
    description_el:
      "Μοναδικό υπαίθριο πολιτιστικό φεστιβάλ στη νησίδα Σπιναλόγκα, με θεατρικές παραστάσεις και μουσική.",
    date_start: "2026-08-14",
    date_end: "2026-08-16",
    time_start: "20:30",
    location_name: "Spinalonga Island, Elounda, Lasithi",
    region: "east",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8",
    verified: true,
    source_url: null,
    latitude: 35.2966,
    longitude: 25.7290,
  },
  {
    title_en: "Anogia Lyra Festival",
    title_el: "Φεστιβάλ Λύρας Ανωγείων",
    title_fr: "Anogia Lyra Festival",
    title_de: "Anogia Lyra Festival",
    description_en:
      "Anogia, birthplace of Nikos Xylouris and Vasilis Skoulas, hosts this festival dedicated to the Cretan lyra, the island's emblematic instrument. Masters and young players from across Crete perform in the village square.",
    description_fr:
      "Anogia, birthplace of Nikos Xylouris, hosts this festival dedicated to the Cretan lyra with masters and young players performing in the village square.",
    description_de:
      "Anogia, birthplace of Nikos Xylouris, hosts this festival dedicated to the Cretan lyra with masters and young players performing in the village square.",
    description_el:
      "Τα Ανώγεια, γενέτειρα του Νίκου Ξυλούρη, φιλοξενούν φεστιβάλ αφιερωμένο στην κρητική λύρα.",
    date_start: "2026-07-18",
    date_end: "2026-07-19",
    time_start: "21:00",
    location_name: "Anogia Village Square, Rethymno",
    region: "central",
    category: "music",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=7",
    verified: true,
    source_url: null,
    latitude: 35.2913,
    longitude: 24.8785,
  },
  {
    title_en: "Sfakia Freedom Festival",
    title_el: "Γιορτή Ελευθερίας Σφακίων",
    title_fr: "Sfakia Freedom Festival",
    title_de: "Sfakia Freedom Festival",
    description_en:
      "Hora Sfakion commemorates Cretan resistance and independence with traditional music, dance, and historical re-enactments celebrating the fierce mountain communities of Sfakia region.",
    description_fr:
      "Hora Sfakion commemorates Cretan resistance with traditional music, dance, and historical re-enactments celebrating the mountain communities of Sfakia.",
    description_de:
      "Hora Sfakion commemorates Cretan resistance with traditional music, dance, and historical re-enactments celebrating the mountain communities of Sfakia.",
    description_el:
      "Η Χώρα Σφακίων τιμά την κρητική αντίσταση με παραδοσιακή μουσική, χορό και ιστορικές αναπαραστάσεις.",
    date_start: "2026-05-24",
    date_end: "2026-05-25",
    time_start: "20:00",
    location_name: "Hora Sfakion, Chania",
    region: "west",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=5",
    verified: true,
    source_url: null,
    latitude: 35.1991,
    longitude: 24.1394,
  },
  {
    title_en: "Battle of Crete Commemoration",
    title_el: "Επέτειος Μάχης της Κρήτης",
    title_fr: "Battle of Crete Commemoration",
    title_de: "Battle of Crete Commemoration",
    description_en:
      "Annual commemoration of the Battle of Crete (20 May 1941), one of the most heroic episodes of WWII. Ceremonies in Chania with military parades, wreath-laying at the Allied War Cemetery in Souda, and cultural events.",
    description_fr:
      "Annual commemoration of the Battle of Crete (20 May 1941). Ceremonies in Chania with military parades and wreath-laying at the Allied War Cemetery in Souda.",
    description_de:
      "Annual commemoration of the Battle of Crete (20 May 1941). Ceremonies in Chania with military parades and wreath-laying at the Allied War Cemetery in Souda.",
    description_el:
      "Ετήσια επέτειος της Μάχης της Κρήτης (20 Μαΐου 1941) με τελετές στα Χανιά και επίσκεψη στο Συμμαχικό Νεκροταφείο Σούδας.",
    date_start: "2026-05-20",
    date_end: "2026-05-20",
    time_start: "10:00",
    location_name: "Chania & Souda Allied War Cemetery",
    region: "west",
    category: "cultural",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=20",
    verified: true,
    source_url: null,
    latitude: 35.5142,
    longitude: 24.0177,
  },
  {
    title_en: "Elounda International Jazz & Blues Festival",
    title_el: "Φεστιβάλ Jazz & Blues Ελούντας",
    title_fr: "Elounda International Jazz & Blues Festival",
    title_de: "Elounda International Jazz & Blues Festival",
    description_en:
      "An international jazz and blues festival held on the scenic waterfront of Elounda, with Greek and European artists performing against the backdrop of the Mirabello Gulf and Spinalonga island.",
    description_fr:
      "An international jazz and blues festival on the scenic waterfront of Elounda, with Greek and European artists performing.",
    description_de:
      "An international jazz and blues festival on the scenic waterfront of Elounda, with Greek and European artists performing.",
    description_el:
      "Διεθνές φεστιβάλ Jazz & Blues στην παραλία της Ελούντας, με Έλληνες και Ευρωπαίους καλλιτέχνες.",
    date_start: "2026-09-05",
    date_end: "2026-09-06",
    time_start: "20:00",
    location_name: "Elounda Waterfront, Lasithi",
    region: "east",
    category: "music",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=9",
    verified: true,
    source_url: null,
    latitude: 35.2636,
    longitude: 25.7248,
  },
  {
    title_en: "Chestnut Festival of Elos",
    title_el: "Γιορτή Κάστανου Έλους",
    title_fr: "Chestnut Festival of Elos",
    title_de: "Chestnut Festival of Elos",
    description_en:
      "The village of Elos in western Crete (Kissamos) is famous for its chestnut forest. Each October, the chestnut harvest festival draws visitors with roasted chestnuts, local food, traditional dances, and music.",
    description_fr:
      "The village of Elos in western Crete is famous for its chestnut forest. Each October, the harvest festival draws visitors with roasted chestnuts, local food, and traditional dances.",
    description_de:
      "The village of Elos in western Crete is famous for its chestnut forest. Each October, the harvest festival draws visitors with roasted chestnuts, local food, and traditional dances.",
    description_el:
      "Το Έλος Κισσάμου γιορτάζει τη συγκομιδή κάστανου κάθε Οκτώβριο με ψητά κάστανα, τοπικό φαγητό και παραδοσιακούς χορούς.",
    date_start: "2026-10-11",
    date_end: "2026-10-11",
    time_start: "11:00",
    location_name: "Elos Village, Kissamos, Chania",
    region: "west",
    category: "food",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=10",
    verified: true,
    source_url: null,
    latitude: 35.4476,
    longitude: 23.6524,
  },
  {
    title_en: "Ierapetra Cucumber Festival",
    title_el: "Γιορτή Αγγουριού Ιεράπετρας",
    title_fr: "Ierapetra Cucumber Festival",
    title_de: "Ierapetra Cucumber Festival",
    description_en:
      "Ierapetra, the greenhouse vegetable capital of Crete, celebrates the first cucumber harvest of the season each spring with a quirky local festival, fresh produce market, and community gathering.",
    description_fr:
      "Ierapetra celebrates the first cucumber harvest each spring with a local festival, fresh produce market, and community gathering.",
    description_de:
      "Ierapetra celebrates the first cucumber harvest each spring with a local festival, fresh produce market, and community gathering.",
    description_el:
      "Η Ιεράπετρα, πρωτεύουσα των θερμοκηπιακών λαχανικών, γιορτάζει την πρώτη συγκομιδή αγγουριού κάθε άνοιξη.",
    date_start: "2026-04-18",
    date_end: "2026-04-19",
    time_start: "10:00",
    location_name: "Ierapetra Town Centre",
    region: "east",
    category: "food",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=4",
    verified: true,
    source_url: null,
    latitude: 35.0103,
    longitude: 25.7408,
  },
  {
    title_en: "Georgioupoli Lakeside Fair",
    title_el: "Πανηγύρι Γεωργιούπολης",
    title_fr: "Georgioupoli Lakeside Fair",
    title_de: "Georgioupoli Lakeside Fair",
    description_en:
      "The charming village of Georgioupoli by the mouth of the Almyros river and Lake Kournas hosts a traditional summer fair with local artisans, food stalls, live Cretan music and dance.",
    description_fr:
      "Georgioupoli hosts a traditional summer fair with local artisans, food stalls, and live Cretan music and dance.",
    description_de:
      "Georgioupoli hosts a traditional summer fair with local artisans, food stalls, and live Cretan music and dance.",
    description_el:
      "Η Γεωργιούπολη φιλοξενεί παραδοσιακό καλοκαιρινό πανηγύρι με τοπικούς τεχνίτες, φαγητό και κρητική μουσική.",
    date_start: "2026-08-01",
    date_end: "2026-08-02",
    time_start: "19:00",
    location_name: "Georgioupoli Village, Chania",
    region: "west",
    category: "festival",
    is_recurring: true,
    rrule: "FREQ=YEARLY;BYMONTH=8",
    verified: true,
    source_url: null,
    latitude: 35.3626,
    longitude: 24.2616,
  },
];

// ---------------------------------------------------------------------------
// INSERT
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nSeeding ${events.length} events into Supabase...\n`);

  // Add slugs from title_en
  const rows = events.map((e) => ({
    ...e,
    slug: slugify(e.title_en),
  }));

  const batchSize = 20;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("events").upsert(batch, { onConflict: "slug" });
    if (error) {
      console.error(`  Batch ${Math.floor(i / batchSize) + 1} ERROR:`, error.message);
      errors += batch.length;
    } else {
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: inserted/updated ${batch.length} records`);
      inserted += batch.length;
    }
  }

  console.log(`\nDone. ${inserted} inserted/updated, ${errors} errors.`);

  // Verify
  const { data, error: vErr } = await supabase
    .from("events")
    .select("slug, title_en, date_start, category, region")
    .order("date_start", { ascending: true });

  if (vErr) {
    console.error("Verification query failed:", vErr.message);
    return;
  }

  console.log(`\nVerification — total events in table: ${data.length}`);
  console.log("\nSample (first 10):");
  data.slice(0, 10).forEach((e) => {
    console.log(`  [${e.date_start}] [${e.category.padEnd(9)}] [${(e.region || "n/a").padEnd(7)}] ${e.title_en}`);
  });

  // Count by category
  const cats = {};
  data.forEach((e) => { cats[e.category] = (cats[e.category] || 0) + 1; });
  console.log("\nBy category:");
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    console.log(`  ${c.padEnd(12)}: ${n}`);
  });
}

main().catch(console.error);
