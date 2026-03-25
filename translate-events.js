const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  "https://fzofxinjsuexjoxlwrhg.supabase.co",
  "sb_publishable_9KIRJh01jgKZ4X5XCpik-w_jWT9BmAX"
);

// Hardcoded translations for all 42 events (id -> {fr, de, el})
const translations = {
  3: {
    fr: "Fête de l'Assomption de la Vierge Marie",
    de: "Fest der Himmelfahrt der Jungfrau Maria",
    el: "Κοίμηση της Θεοτόκου",
  },
  4: {
    fr: "Pâques orthodoxe en Crète",
    de: "Orthodoxes Ostern auf Kreta",
    el: "Ορθόδοξο Πάσχα στην Κρήτη",
  },
  5: {
    fr: "Lundi Pur (Kathara Deftera)",
    de: "Reiner Montag (Kathara Deftera)",
    el: "Καθαρά Δευτέρα",
  },
  6: {
    fr: "Fête de Saint Tite (patron d'Héraklion)",
    de: "Fest des Heiligen Titus (Schutzpatron von Heraklion)",
    el: "Γιορτή Αγίου Τίτου (προστάτη του Ηρακλείου)",
  },
  7: {
    fr: "Fête de la Transfiguration (Métamorphose)",
    de: "Fest der Verklärung (Metamorfosi)",
    el: "Μεταμόρφωση του Σωτήρος",
  },
  8: {
    fr: "Fête de Saint Georges (Agios Georgios)",
    de: "Fest des Heiligen Georg (Agios Georgios)",
    el: "Γιορτή Αγίου Γεωργίου",
  },
  9: {
    fr: "Carnaval de Réthymnon",
    de: "Karneval von Rethymno",
    el: "Καρναβάλι Ρεθύμνου",
  },
  10: {
    fr: "Carnaval d'Héraklion",
    de: "Karneval von Heraklion",
    el: "Καρναβάλι Ηρακλείου",
  },
  11: {
    fr: "Festival de la Plage de Matala",
    de: "Matala Beach Festival",
    el: "Φεστιβάλ Παραλίας Ματάλων",
  },
  12: {
    fr: "Festival des Arts d'Été d'Héraklion",
    de: "Heraklion Sommer Kunstfestival",
    el: "Καλοκαιρινό Φεστιβάλ Τεχνών Ηρακλείου",
  },
  13: {
    fr: "Festival Renaissance de Réthymnon",
    de: "Renaissance Festival Rethymno",
    el: "Φεστιβάλ Αναγέννησης Ρεθύμνου",
  },
  14: {
    fr: "Été Culturel de Sitia",
    de: "Kultureller Sommer Sitia",
    el: "Πολιτιστικό Καλοκαίρι Σητείας",
  },
  15: {
    fr: "Événements Culturels d'Été d'Ierapetra",
    de: "Kulturelle Sommerveranstaltungen Ierapetra",
    el: "Καλοκαιρινές Πολιτιστικές Εκδηλώσεις Ιεράπετρας",
  },
  16: {
    fr: "Festival du Régime Crétois",
    de: "Festival der Kretischen Ernährung",
    el: "Φεστιβάλ Κρητικής Διατροφής",
  },
  17: {
    fr: "Festival du Vin de Sitia (Festival du Sultana)",
    de: "Wein Festival Sitia (Sultaninen Festival)",
    el: "Φεστιβάλ Κρασιού Σητείας (Φεστιβάλ Σουλτανίνας)",
  },
  18: {
    fr: "Festival du Tsikoudia d'Anogia",
    de: "Anogia Tsikoudia Festival",
    el: "Φεστιβάλ Τσικουδιάς Ανωγείων",
  },
  19: {
    fr: "Festival de la Récolte d'Olives, Kolymvari",
    de: "Olivenernte Festival, Kolymvari",
    el: "Φεστιβάλ Ελαιοσυλλογής, Κολυμβάρι",
  },
  20: {
    fr: "Festival du Miel Crétois",
    de: "Kretisches Honig Festival",
    el: "Φεστιβάλ Κρητικού Μελιού",
  },
  21: {
    fr: "Panigyri d'Agios Nikolaos – Ville d'Agios Nikolaos",
    de: "Panigyri des Agios Nikolaos – Stadt Agios Nikolaos",
    el: "Πανηγύρι Αγίου Νικολάου – Άγιος Νικόλαος",
  },
  22: {
    fr: "Panigyri du Prophète Élie (Profitis Ilias)",
    de: "Panigyri des Propheten Elias (Profitis Ilias)",
    el: "Πανηγύρι Προφήτη Ηλία",
  },
  23: {
    fr: "Panigyri du Monastère d'Agia Triada",
    de: "Panigyri des Agia Triada Klosters",
    el: "Πανηγύρι Μονής Αγίας Τριάδας",
  },
  24: {
    fr: "Panigyri du Monastère de Toplou",
    de: "Panigyri des Toplou Klosters",
    el: "Πανηγύρι Μονής Τοπλού",
  },
  25: {
    fr: "Course Internationale sur Route d'Héraklion",
    de: "Heraklion Internationales Straßenrennen",
    el: "Διεθνής Αγώνας Δρόμου Ηρακλείου",
  },
  26: {
    fr: "Marathon de Crète (Course de Réthymnon)",
    de: "Kreta Marathon (Rethymno Lauf)",
    el: "Μαραθώνιος Κρήτης (Ρεθύμνο Run)",
  },
  27: {
    fr: "Course à pied dans les Gorges de Samaria",
    de: "Laufrennen durch die Samaria-Schlucht",
    el: "Αγώνας Δρόμου Φαραγγιού Σαμαριάς",
  },
  28: {
    fr: "Marché du Samedi d'Héraklion (Laïki Agora)",
    de: "Heraklion Samstagmarkt (Laiki Agora)",
    el: "Λαϊκή Αγορά Ηρακλείου (Σάββατο)",
  },
  29: {
    fr: "Marché de la Vieille Ville de La Canée (Marché Couvert)",
    de: "Chania Altstadtmarkt (Überdachter Markt)",
    el: "Αγορά Παλιάς Πόλης Χανίων (Δημοτική Αγορά)",
  },
  30: {
    fr: "Marché du Jeudi de Réthymnon",
    de: "Rethymno Donnerstagmarkt",
    el: "Λαϊκή Αγορά Ρεθύμνου (Πέμπτη)",
  },
  31: {
    fr: "Marché du Mercredi d'Agios Nikolaos",
    de: "Agios Nikolaos Mittwochmarkt",
    el: "Λαϊκή Αγορά Αγίου Νικολάου (Τετάρτη)",
  },
  32: {
    fr: "Marché Agricole du Samedi de Sitia",
    de: "Sitia Samstag Bauernmarkt",
    el: "Λαϊκή Αγορά Σητείας (Σάββατο)",
  },
  33: {
    fr: "Rencontre Internationale Nikos Kazantzakis",
    de: "Nikos Kazantzakis Internationales Treffen",
    el: "Διεθνής Συνάντηση Νίκου Καζαντζάκη",
  },
  34: {
    fr: "Festival Annuel du Musée en Plein Air Lychnostatis",
    de: "Jährliches Festival des Freilichtmuseums Lychnostatis",
    el: "Ετήσιο Φεστιβάλ Υπαίθριου Μουσείου Λυχνοστάτη",
  },
  35: {
    fr: "Festival Minoen de Zakros",
    de: "Zakros Minoisches Festival",
    el: "Μινωικό Φεστιβάλ Ζάκρου",
  },
  36: {
    fr: "Festival International du Film de La Canée",
    de: "Internationales Filmfestival Chania",
    el: "Διεθνές Φεστιβάλ Κινηματογράφου Χανίων",
  },
  37: {
    fr: "Festival de Spinalonga",
    de: "Spinalonga Festival",
    el: "Φεστιβάλ Σπιναλόγκας",
  },
  38: {
    fr: "Festival de la Lyra d'Anogia",
    de: "Anogia Lyra Festival",
    el: "Φεστιβάλ Λύρας Ανωγείων",
  },
  39: {
    fr: "Festival de la Liberté de Sfakia",
    de: "Sfakia Freiheitsfestival",
    el: "Φεστιβάλ Ελευθερίας Σφακίων",
  },
  40: {
    fr: "Commémoration de la Bataille de Crète",
    de: "Gedenkfeier zur Schlacht um Kreta",
    el: "Εορτασμός Μάχης της Κρήτης",
  },
  41: {
    fr: "Festival International de Jazz & Blues d'Elounda",
    de: "Elounda Internationales Jazz & Blues Festival",
    el: "Διεθνές Φεστιβάλ Jazz & Blues Ελούντας",
  },
  42: {
    fr: "Festival des Châtaignes d'Elos",
    de: "Kastanienfest von Elos",
    el: "Φεστιβάλ Κάστανου Έλους",
  },
  43: {
    fr: "Festival du Concombre d'Ierapetra",
    de: "Gurkenfestival Ierapetra",
    el: "Φεστιβάλ Αγγουριού Ιεράπετρας",
  },
  44: {
    fr: "Foire au Bord du Lac de Georgioupoli",
    de: "Georgioupoli Seeufer Messe",
    el: "Πανηγύρι Λίμνης Γεωργιούπολης",
  },
};

async function run() {
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title_en, title_fr, title_de, title_el");

  if (error) {
    console.error("Fetch error:", error);
    process.exit(1);
  }

  console.log(`Fetched ${events.length} events`);
  let updated = 0;
  let skipped = 0;

  for (const event of events) {
    const t = translations[event.id];
    if (!t) {
      console.log(`  SKIP id=${event.id} (no translation entry): ${event.title_en}`);
      skipped++;
      continue;
    }

    // Only update if title_fr still equals title_en (not yet translated)
    if (event.title_fr === event.title_en) {
      const { error: updateError } = await supabase
        .from("events")
        .update({
          title_fr: t.fr,
          title_de: t.de,
          title_el: t.el,
        })
        .eq("id", event.id);

      if (updateError) {
        console.error(`  ERROR updating id=${event.id}:`, updateError.message);
      } else {
        console.log(`  UPDATED id=${event.id}: ${event.title_en} -> FR: ${t.fr}`);
        updated++;
      }
    } else {
      console.log(`  ALREADY TRANSLATED id=${event.id}: ${event.title_fr}`);
      skipped++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

run();
