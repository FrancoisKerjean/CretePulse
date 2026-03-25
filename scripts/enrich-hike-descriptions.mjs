/**
 * enrich-hike-descriptions.mjs
 * Fetches all hikes from Supabase and enriches description_en/fr/de/el
 * where missing. Run with:
 *   node --env-file=.env.local scripts/enrich-hike-descriptions.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars. Use --env-file=.env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Hardcoded rich descriptions for famous hikes
// Keys must match the name_en stored in Supabase (case-sensitive)
// ---------------------------------------------------------------------------
const FAMOUS_HIKES = {
  "Samaria Gorge": {
    en: "Europe's longest gorge at 16km, running from the Omalos Plateau at 1,250m down to Agia Roumeli on the south coast. The trail takes 5-7 hours through dramatic narrow passages where the walls rise 300m on each side. The famous Iron Gates section narrows to just 3 meters wide. Open May to October. Bring at least 2 liters of water. Return to Chania by ferry from Agia Roumeli to Sougia or Hora Sfakion, then bus.",
    fr: "Les gorges les plus longues d'Europe (16 km), du plateau d'Omalos à 1 250 m jusqu'à Agia Roumeli sur la côte sud. Le sentier prend 5 à 7 heures à travers des passages étroits où les parois s'élèvent à 300 m de chaque côté. Le célèbre passage des Portes de Fer se réduit à 3 mètres de large. Ouvert de mai à octobre. Prévoir au moins 2 litres d'eau. Retour vers La Canée en ferry depuis Agia Roumeli vers Sougia ou Chora Sfakion, puis en bus.",
    de: "Europas längste Schlucht mit 16 km Länge, vom Omalos-Plateau auf 1.250 m bis nach Agia Roumeli an der Südküste. Der Weg dauert 5–7 Stunden durch dramatisch enge Passagen, wo die Wände beidseitig 300 m aufragen. Das berühmte Eiserne-Tor-Stück ist nur 3 Meter breit. Geöffnet Mai bis Oktober. Mindestens 2 Liter Wasser mitbringen. Rückfahrt nach Chania per Fähre von Agia Roumeli nach Sougia oder Hora Sfakion, dann Bus.",
    el: "Το μεγαλύτερο φαράγγι της Ευρώπης, 16 χλμ, από το οροπέδιο Ομαλού στα 1.250 μ. έως την Αγία Ρουμέλη στη νότια ακτή. Η διαδρομή διαρκεί 5–7 ώρες μέσα από δραματικά στενά περάσματα όπου τα τοιχώματα υψώνονται 300 μ. εκατέρωθεν. Τα περίφημα Σιδερόπορτα στενεύουν μόλις 3 μέτρα. Ανοιχτό Μάιο–Οκτώβριο. Φέρτε τουλάχιστον 2 λίτρα νερό. Επιστροφή στα Χανιά με φέρι από Αγία Ρουμέλη προς Σούγια ή Χώρα Σφακίων, στη συνέχεια με λεωφορείο.",
  },
  "Imbros Gorge": {
    en: "A shorter, easier alternative to Samaria at 8km. Starts from Imbros village (780m) and descends to Komitades. Takes 2-3 hours. Less crowded than Samaria but equally scenic. Good option for families and moderate hikers. Open year-round.",
    fr: "Une alternative plus courte et plus facile à Samaria, 8 km. Départ du village d'Imbros (780 m) et descente vers Komitades. Durée 2–3 heures. Moins fréquenté que Samaria mais tout aussi pittoresque. Idéal pour les familles et les randonneurs modérés. Ouvert toute l'année.",
    de: "Eine kürzere, einfachere Alternative zu Samaria mit 8 km. Start im Dorf Imbros (780 m), Abstieg nach Komitades. Dauer 2–3 Stunden. Weniger überlaufen als Samaria, aber gleich malerisch. Gut geeignet für Familien und mittelmäßige Wanderer. Ganzjährig geöffnet.",
    el: "Μια κοντύτερη και πιο εύκολη εναλλακτική στη Σαμαριά, 8 χλμ. Ξεκινά από το χωριό Ίμπρος (780 μ.) και κατεβαίνει στα Κομητάδες. Διάρκεια 2–3 ώρες. Λιγότερο πολυσύχναστο από τη Σαμαριά αλλά εξίσου γραφικό. Καλή επιλογή για οικογένειες και μέτριους πεζοπόρους. Ανοιχτό όλο το χρόνο.",
  },
  "Ha Gorge": {
    en: "A hidden gem near Ierapetra, 1.5km long. One of the narrowest gorges in Crete with walls just 1.5m apart in places. Easy to moderate difficulty, about 1 hour. The gorge opens onto a secluded beach.",
    fr: "Un joyau caché près d'Ierapetra, 1,5 km de long. L'un des gorges les plus étroites de Crète avec des parois séparées de seulement 1,5 m par endroits. Difficulté facile à modérée, environ 1 heure. Le gorge débouche sur une plage isolée.",
    de: "Ein verborgenes Juwel nahe Ierapetra, 1,5 km lang. Eine der engsten Schluchten Kretas – stellenweise nur 1,5 m breite Wände. Leichte bis mittlere Schwierigkeit, etwa 1 Stunde. Die Schlucht mündet auf einen abgeschiedenen Strand.",
    el: "Ένα κρυμμένο διαμάντι κοντά στην Ιεράπετρα, 1,5 χλμ μήκος. Ένα από τα πιο στενά φαράγγια της Κρήτης με τοιχώματα μόλις 1,5 μ. απόσταση σε ορισμένα σημεία. Εύκολη έως μέτρια δυσκολία, περίπου 1 ώρα. Το φαράγγι καταλήγει σε απομονωμένη παραλία.",
  },
};

// ---------------------------------------------------------------------------
// Determine region label from coordinates
// ---------------------------------------------------------------------------
function regionFromCoords(lat, lng) {
  if (lng < 24.2) return "western";
  if (lng < 25.2) return "central";
  if (lng < 26.0) return "eastern";
  return "far eastern";
}

// ---------------------------------------------------------------------------
// Difficulty label for templates
// ---------------------------------------------------------------------------
function difficultyLabel(difficulty, lang) {
  const map = {
    easy:     { en: "easy",   fr: "facile",    de: "leicht",      el: "εύκολη" },
    moderate: { en: "moderate", fr: "modérée", de: "mittel",      el: "μέτρια" },
    hard:     { en: "hard",   fr: "difficile", de: "schwierig",   el: "δύσκολη" },
    expert:   { en: "expert", fr: "experte",   de: "Experte",     el: "για ειδικούς" },
  };
  return (map[difficulty] || map.moderate)[lang];
}

// ---------------------------------------------------------------------------
// Type label for templates
// ---------------------------------------------------------------------------
function typeLabel(type, lang) {
  const map = {
    gorge:    { en: "Gorge",   fr: "Gorges",   de: "Schlucht",    el: "Φαράγγι" },
    coastal:  { en: "Coastal", fr: "Côtier",   de: "Küsten",      el: "Παραλιακό" },
    mountain: { en: "Mountain",fr: "Montagne", de: "Berg",        el: "Ορεινό" },
    cultural: { en: "Cultural",fr: "Culturel", de: "Kulturell",   el: "Πολιτιστικό" },
  };
  return (map[type] || map.mountain)[lang];
}

// ---------------------------------------------------------------------------
// Estimate duration from distance_km and elevation_gain_m
// Naismith rule: 5km/h + 1h per 600m ascent
// ---------------------------------------------------------------------------
function estimateDuration(distanceKm, elevationM) {
  const dist = distanceKm || (elevationM ? (elevationM / 1000) * 3 : 5);
  const elev = elevationM || 0;
  const hours = dist / 5 + elev / 600;
  return Math.round(hours * 10) / 10; // one decimal
}

// ---------------------------------------------------------------------------
// Generate template descriptions for non-famous hikes
// ---------------------------------------------------------------------------
function generateDescriptions(hike) {
  const region = regionFromCoords(hike.start_lat, hike.start_lng);
  const dist = hike.distance_km
    ? hike.distance_km.toFixed(1)
    : hike.elevation_gain_m
    ? ((hike.elevation_gain_m / 1000) * 3).toFixed(1)
    : "~5";
  const elev = hike.elevation_gain_m || 0;
  const hours = estimateDuration(hike.distance_km, hike.elevation_gain_m);
  const water = hike.water_available ? true : false;

  const en = `${typeLabel(hike.type, "en")} trail in ${region} Crete. ${dist}km, ${elev}m elevation gain, ${difficultyLabel(hike.difficulty, "en")} difficulty. Estimated duration: ${hours} hours. ${water ? "Water available on route." : "Bring your own water."}`;

  const fr = `Sentier de type ${typeLabel(hike.type, "fr").toLowerCase()} dans la Crète ${region === "western" ? "occidentale" : region === "central" ? "centrale" : region === "eastern" ? "orientale" : "extrême-orientale"}. ${dist} km, ${elev} m de dénivelé positif, difficulté ${difficultyLabel(hike.difficulty, "fr")}. Durée estimée : ${hours} heures. ${water ? "Eau disponible sur le parcours." : "Prévoir sa propre eau."}`;

  const de = `${typeLabel(hike.type, "de")}wanderung im ${region === "western" ? "westlichen" : region === "central" ? "zentralen" : region === "eastern" ? "östlichen" : "fernöstlichen"} Kreta. ${dist} km, ${elev} m Höhengewinn, ${difficultyLabel(hike.difficulty, "de")}e Schwierigkeit. Geschätzte Dauer: ${hours} Stunden. ${water ? "Wasser auf der Strecke verfügbar." : "Eigenes Wasser mitbringen."}`;

  const el = `Μονοπάτι τύπου ${typeLabel(hike.type, "el").toLowerCase()} στην ${region === "western" ? "δυτική" : region === "central" ? "κεντρική" : region === "eastern" ? "ανατολική" : "ακραία ανατολική"} Κρήτη. ${dist} χλμ, ${elev} μ. υψομετρική διαφορά, δυσκολία ${difficultyLabel(hike.difficulty, "el")}. Εκτιμώμενη διάρκεια: ${hours} ώρες. ${water ? "Υπάρχει νερό στη διαδρομή." : "Φέρτε δικό σας νερό."}`;

  return { en, fr, de, el };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("Fetching all hikes from Supabase...");

  const { data: hikes, error } = await supabase
    .from("hikes")
    .select("id, slug, name_en, type, difficulty, distance_km, elevation_gain_m, start_lat, start_lng, water_available, description_en, description_fr, description_de, description_el")
    .order("id");

  if (error) {
    console.error("Failed to fetch hikes:", error);
    process.exit(1);
  }

  console.log(`Fetched ${hikes.length} hikes total.`);

  const toUpdate = hikes.filter(
    (h) => !h.description_en || h.description_en.trim() === ""
  );

  console.log(`${toUpdate.length} hikes need descriptions.`);

  if (toUpdate.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const hike of toUpdate) {
    let descs;

    const famous = FAMOUS_HIKES[hike.name_en];
    if (famous) {
      descs = { en: famous.en, fr: famous.fr, de: famous.de, el: famous.el };
      console.log(`  [FAMOUS] ${hike.name_en}`);
    } else {
      descs = generateDescriptions(hike);
      console.log(`  [TEMPLATE] ${hike.name_en}`);
    }

    const { error: updateError } = await supabase
      .from("hikes")
      .update({
        description_en: descs.en,
        description_fr: descs.fr,
        description_de: descs.de,
        description_el: descs.el,
      })
      .eq("id", hike.id);

    if (updateError) {
      console.error(`  ERROR updating ${hike.name_en}:`, updateError.message);
      failed++;
    } else {
      updated++;
    }
  }

  console.log("\n--- DONE ---");
  console.log(`Total hikes in DB : ${hikes.length}`);
  console.log(`Already had desc  : ${hikes.length - toUpdate.length}`);
  console.log(`Updated           : ${updated}`);
  console.log(`Failed            : ${failed}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
