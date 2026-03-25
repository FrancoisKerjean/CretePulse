/**
 * Expanded Crete Villages Seed Script
 * Target: 150+ villages total (28 existing + 125+ new)
 * Deduplication by slug - safe to run multiple times
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envVars[m[1]] = m[2].trim();
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 125+ new villages for Crete covering all 4 regional units:
 * - Chania (west)
 * - Rethymno (central-west)
 * - Heraklion (central-east)
 * - Lasithi (east)
 *
 * Fields: name_en, name_el, name_fr, latitude, longitude,
 *         region (east/central/west), period (venetian/ottoman/minoan/modern/ancient),
 *         population, altitude_m, description_en, description_fr, municipality
 */
const NEW_VILLAGES = [
  // ============================================================
  // CHANIA REGIONAL UNIT (west)
  // ============================================================
  {
    name_en: "Kissamos",
    name_el: "Κίσσαμος",
    name_fr: "Kissamos",
    lat: 35.4933, lng: 23.6595,
    region: "west", period: "ancient",
    population: 3500, altitude_m: 5,
    municipality: "Kissamos",
    description_en: "Ancient harbor town on the northwestern tip of Crete, once an independent city-state in antiquity. Today a laid-back port town with a small archaeological museum and access to Balos lagoon.",
    description_fr: "Ville portuaire antique a la pointe nord-ouest de la Crete, ancienne cite independante. Aujourd'hui une ville portuaire tranquille avec un petit musee archeologique et un acces au lagon de Balos."
  },
  {
    name_en: "Paleochora",
    name_el: "Παλαιόχωρα",
    name_fr: "Paleochora",
    lat: 35.2306, lng: 23.6822,
    region: "west", period: "venetian",
    population: 2100, altitude_m: 5,
    municipality: "Kantanos-Selino",
    description_en: "Laid-back town on the southwestern coast with a Venetian castle ruin on the headland. Popular with backpackers for its twin beaches of sand and pebble either side of the peninsula.",
    description_fr: "Ville detendue sur la cote sud-ouest avec des ruines d'un chateau venitien sur le promontoire. Populaire aupres des routards pour ses plages jumelles de sable et de galets de chaque cote de la peninsule."
  },
  {
    name_en: "Vamos",
    name_el: "Βάμος",
    name_fr: "Vamos",
    lat: 35.4128, lng: 24.1992,
    region: "west", period: "ottoman",
    population: 850, altitude_m: 200,
    municipality: "Apokoronas",
    description_en: "Beautifully restored stone village in the Apokoronas hills, known for its eco-tourism and traditional architecture. One of Crete's best-preserved Ottoman-era villages turned artisan community.",
    description_fr: "Village en pierre magnifiquement restaure dans les collines d'Apokoronas, reconnu pour son ecotourisme et son architecture traditionnelle. L'un des villages ottomans les mieux preserves de Crete, reconverti en communaute artisanale."
  },
  {
    name_en: "Georgioupolis",
    name_el: "Γεωργιούπολη",
    name_fr: "Georgioupolis",
    lat: 35.3619, lng: 24.2614,
    region: "west", period: "modern",
    population: 1200, altitude_m: 3,
    municipality: "Georgioupolis",
    description_en: "Charming resort village where the Almyros river meets the sea, shaded by century-old eucalyptus trees. The long sandy beach and relaxed atmosphere make it a favorite for families.",
    description_fr: "Charmant village de villegiature ou la riviere Almyros rejoint la mer, ombragee par des eucalyptus centenaires. La longue plage de sable et l'atmosphere detendue en font un favori des familles."
  },
  {
    name_en: "Kolimbari",
    name_el: "Κολυμβάρι",
    name_fr: "Kolimbari",
    lat: 35.5389, lng: 23.7798,
    region: "west", period: "venetian",
    population: 700, altitude_m: 10,
    municipality: "Platanias",
    description_en: "Quiet fishing village at the base of the Rodopou peninsula, home to the important Gonia Monastery founded in 1662. The village sits between olive groves and a calm blue bay.",
    description_fr: "Paisible village de pecheurs a la base de la peninsule de Rodopou, abritant l'important monastere de Gonia fonde en 1662. Le village est entoure d'oliviers et d'une baie calme et bleue."
  },
  {
    name_en: "Hora Sfakion",
    name_el: "Χώρα Σφακίων",
    name_fr: "Hora Sfakion",
    lat: 35.2013, lng: 24.1361,
    region: "west", period: "ottoman",
    population: 350, altitude_m: 5,
    municipality: "Sfakia",
    description_en: "Remote south-coast village accessible mainly by boat or mountain road, gateway to the Sfakia region of fierce independence. The Sfakians are legendary for their resistance to Venetian, Ottoman and German occupiers.",
    description_fr: "Village isole de la cote sud accessible principalement par bateau ou route de montagne, porte d'entree de la region de Sfakia, legendaire pour sa resistance. Les Sfakiotes sont connus pour leur opposition aux occupants venitiens, ottomans et allemands."
  },
  {
    name_en: "Frangokastello",
    name_el: "Φραγκοκάστελλο",
    name_fr: "Frangokastello",
    lat: 35.1816, lng: 24.2315,
    region: "west", period: "venetian",
    population: 80, altitude_m: 5,
    municipality: "Sfakia",
    description_en: "Tiny village dominated by a magnificent Venetian fortress built in 1371, standing intact on the shore facing the Libyan Sea. The ghost phenomenon 'Drosoulites' is said to appear near the castle each May.",
    description_fr: "Petit village domine par une magnifique forteresse venitienne construite en 1371, intacte sur le rivage face a la mer Libyenne. Le phenomene fantomatique des 'Drosoulites' serait visible pres du chateau chaque mois de mai."
  },
  {
    name_en: "Anopolis",
    name_el: "Ανώπολη",
    name_fr: "Anopolis",
    lat: 35.2361, lng: 24.1044,
    region: "west", period: "ottoman",
    population: 120, altitude_m: 600,
    municipality: "Sfakia",
    description_en: "Remote mountain village above Hora Sfakion, birthplace of the legendary Cretan rebel Daskalogiannis who led the first organized uprising against Ottoman rule in 1770.",
    description_fr: "Village de montagne isole au-dessus de Hora Sfakion, lieu de naissance du legendaire rebelle cretois Daskalogiannis, qui mena le premier soulevement organise contre la domination ottomane en 1770."
  },
  {
    name_en: "Imbros",
    name_el: "Ίμπρος",
    name_fr: "Imbros",
    lat: 35.2667, lng: 24.1167,
    region: "west", period: "ottoman",
    population: 150, altitude_m: 680,
    municipality: "Sfakia",
    description_en: "Mountain village at the head of the spectacular Imbros Gorge, the second most popular gorge hike in Crete. Traditional stone houses and panoramic views of the White Mountains.",
    description_fr: "Village de montagne a l'entree du spectaculaire Gorge d'Imbros, la deuxieme randonnee de gorge la plus populaire de Crete. Maisons en pierre traditionnelles et vues panoramiques sur les Montagnes Blanches."
  },
  {
    name_en: "Agia Roumeli",
    name_el: "Αγία Ρουμέλη",
    name_fr: "Agia Roumeli",
    lat: 35.2186, lng: 23.9714,
    region: "west", period: "modern",
    population: 90, altitude_m: 5,
    municipality: "Sfakia",
    description_en: "Tiny village at the southern end of the Samaria Gorge, accessible only by ferry or on foot through the gorge. A welcome stop for hikers emerging after the 16km walk.",
    description_fr: "Petit village a l'extremite sud des Gorges de Samaria, accessible uniquement par ferry ou a pied a travers les gorges. Etape appreciee pour les randonneurs sortant apres 16km de marche."
  },
  {
    name_en: "Loutro",
    name_el: "Λουτρό",
    name_fr: "Loutro",
    lat: 35.2069, lng: 24.0783,
    region: "west", period: "ancient",
    population: 60, altitude_m: 5,
    municipality: "Sfakia",
    description_en: "Car-free village accessible only by ferry or on foot, built in a perfect natural harbor. One of the most tranquil spots in Crete, with crystal-clear turquoise water and traditional whitewashed houses.",
    description_fr: "Village sans voitures accessible uniquement par ferry ou a pied, construit dans un port naturel parfait. L'un des endroits les plus tranquilles de Crete, avec une eau turquoise cristalline et des maisons blanchies a la chaux."
  },
  {
    name_en: "Sfakia",
    name_el: "Σφακιά",
    name_fr: "Sfakia",
    lat: 35.2501, lng: 24.1167,
    region: "west", period: "ottoman",
    population: 300, altitude_m: 15,
    municipality: "Sfakia",
    description_en: "The capital of the Sfakia region, a land of legendary resistance and wild mountain terrain. The proud Sfakians maintained virtual autonomy through the Ottoman occupation thanks to their remote, rugged homeland.",
    description_fr: "La capitale de la region de Sfakia, terre de resistance legendaire et de terrain montagneux sauvage. Les fiers Sfakiotes ont maintenu une autonomie virtuelle durant l'occupation ottomane grace a leur patrie isolee et escarpee."
  },
  {
    name_en: "Alikambos",
    name_el: "Αλίκαμπος",
    name_fr: "Alikambos",
    lat: 35.3817, lng: 24.1384,
    region: "west", period: "venetian",
    population: 350, altitude_m: 250,
    municipality: "Apokoronas",
    description_en: "Traditional village in the Apokoronas region known for its Byzantine church of Panagia with well-preserved 14th-century frescoes. Set amid olive groves with views over the Souda Bay.",
    description_fr: "Village traditionnel de la region d'Apokoronas connu pour son eglise byzantine de Panagia avec des fresques du 14e siecle bien preservees. Entoure d'oliviers avec vue sur la baie de Souda."
  },
  {
    name_en: "Gavalochori",
    name_el: "Γαβαλοχώρι",
    name_fr: "Gavalochori",
    lat: 35.4022, lng: 24.1721,
    region: "west", period: "venetian",
    population: 430, altitude_m: 180,
    municipality: "Apokoronas",
    description_en: "Well-preserved medieval village in Apokoronas with a folklore museum housed in a Venetian-era mansion. Known for its traditional silk weaving and lace-making traditions.",
    description_fr: "Village medieval bien conserve d'Apokoronas avec un musee du folklore dans un manoir venitien. Connu pour ses traditions de tissage de soie et de dentelle."
  },
  {
    name_en: "Drapanos",
    name_el: "Δράπανος",
    name_fr: "Drapanos",
    lat: 35.4278, lng: 24.2319,
    region: "west", period: "venetian",
    population: 280, altitude_m: 150,
    municipality: "Apokoronas",
    description_en: "Quiet hilltop village in Apokoronas with sweeping views over the Souda Bay and the White Mountains. Traditional stone houses, a central plateia and excellent local olive oil.",
    description_fr: "Paisible village perche sur une colline en Apokoronas avec des vues degagees sur la baie de Souda et les Montagnes Blanches. Maisons en pierre traditionnelles, une plateia centrale et une excellente huile d'olive locale."
  },
  {
    name_en: "Kefalas",
    name_el: "Κεφαλάς",
    name_fr: "Kefalas",
    lat: 35.3828, lng: 24.2011,
    region: "west", period: "venetian",
    population: 320, altitude_m: 300,
    municipality: "Apokoronas",
    description_en: "Hilltop village in Apokoronas with a charming square and panoramic views. Popular with expats who have restored traditional stone houses, preserving the authentic Cretan atmosphere.",
    description_fr: "Village perche sur une colline en Apokoronas avec une charmante place et des vues panoramiques. Populaire aupres des expatries qui ont restaure des maisons en pierre traditionnelles, preservant l'atmosphere cretoise authentique."
  },
  {
    name_en: "Asi Gonia",
    name_el: "Ασή Γωνιά",
    name_fr: "Asi Gonia",
    lat: 35.3167, lng: 24.2833,
    region: "west", period: "ottoman",
    population: 400, altitude_m: 480,
    municipality: "Apokoronas",
    description_en: "Remote mountain village above the Apokoronas valley, known for its resistance during World War II. The village church contains significant Byzantine frescoes and the area is rich in olive and carob trees.",
    description_fr: "Village de montagne isole au-dessus de la vallee d'Apokoronas, connu pour sa resistance durant la Seconde Guerre Mondiale. L'eglise du village contient d'importantes fresques byzantines et la region est riche en oliviers et caroubiers."
  },
  {
    name_en: "Vrysses",
    name_el: "Βρύσσες",
    name_fr: "Vrysses",
    lat: 35.3714, lng: 24.2137,
    region: "west", period: "modern",
    population: 600, altitude_m: 180,
    municipality: "Apokoronas",
    description_en: "Lively village at the junction of roads to Sfakia and the south coast, famous for its yogurt and honey served in the roadside tavernas. The plane trees and river make it a popular lunch stop.",
    description_fr: "Village anime au carrefour des routes vers Sfakia et la cote sud, celebre pour son yaourt et son miel servis dans les tavernes en bord de route. Les platanes et la riviere en font un arret dejeuner populaire."
  },
  {
    name_en: "Elos",
    name_el: "Έλος",
    name_fr: "Elos",
    lat: 35.3611, lng: 23.7222,
    region: "west", period: "venetian",
    population: 230, altitude_m: 400,
    municipality: "Kissamos",
    description_en: "Traditional mountain village in the chestnut forest of western Crete, known for its annual chestnut festival in October. Stone houses and a church surrounded by magnificent chestnut trees over 300 years old.",
    description_fr: "Village de montagne traditionnel dans la foret de chataigniers de l'ouest de la Crete, connu pour son festival annuel de chataignes en octobre. Maisons en pierre et eglise entourees de magnifiques chataigniers de plus de 300 ans."
  },
  {
    name_en: "Topolia",
    name_el: "Τοπόλια",
    name_fr: "Topolia",
    lat: 35.3611, lng: 23.7389,
    region: "west", period: "venetian",
    population: 180, altitude_m: 460,
    municipality: "Kissamos",
    description_en: "Small village at the entrance to Topolia Gorge, one of the smaller but most beautiful gorges in western Crete. The gorge walls reach 300 meters and the path passes a cave chapel.",
    description_fr: "Petit village a l'entree des Gorges de Topolia, l'une des gorges les plus petites mais aussi les plus belles de l'ouest de la Crete. Les parois des gorges atteignent 300 metres et le chemin passe par une chapelle dans une grotte."
  },
  {
    name_en: "Voukolies",
    name_el: "Βουκολιές",
    name_fr: "Voukolies",
    lat: 35.4156, lng: 23.8642,
    region: "west", period: "modern",
    population: 1800, altitude_m: 90,
    municipality: "Platanias",
    description_en: "Large agricultural village in western Crete, center of an important olive oil producing area. The Saturday market is one of the liveliest in the Chania prefecture.",
    description_fr: "Grand village agricole de l'ouest de la Crete, centre d'une importante zone de production d'huile d'olive. Le marche du samedi est l'un des plus animes de la prefecture de La Canee."
  },
  {
    name_en: "Maleme",
    name_el: "Μάλεμε",
    name_fr: "Maleme",
    lat: 35.5217, lng: 23.8203,
    region: "west", period: "modern",
    population: 600, altitude_m: 10,
    municipality: "Platanias",
    description_en: "Coastal village west of Chania, historically significant as the site of the Battle of Crete in May 1941 where German paratroopers captured the airfield. A German war cemetery is located nearby.",
    description_fr: "Village cotier a l'ouest de La Canee, historiquement significatif comme site de la Bataille de Crete en mai 1941 ou les parachutistes allemands ont capture l'aeroport. Un cimetiere de guerre allemand est situe a proximite."
  },
  {
    name_en: "Tavronitis",
    name_el: "Ταυρωνίτης",
    name_fr: "Tavronitis",
    lat: 35.5143, lng: 23.8392,
    region: "west", period: "modern",
    population: 800, altitude_m: 8,
    municipality: "Platanias",
    description_en: "Riverside village at the mouth of the Tavronitis river on the north coast. A working agricultural and fishing community, less touristic than neighboring coastal villages.",
    description_fr: "Village au bord de la riviere Tavronitis sur la cote nord. Communaute agricole et de peche authentique, moins touristique que les villages cotiers voisins."
  },
  {
    name_en: "Kandanos",
    name_el: "Κάνδανος",
    name_fr: "Kandanos",
    lat: 35.2917, lng: 23.7417,
    region: "west", period: "venetian",
    population: 500, altitude_m: 460,
    municipality: "Kantanos-Selino",
    description_en: "Capital of Kantanos-Selino municipality, rebuilt after the Nazis destroyed it entirely in June 1941 in reprisal for guerrilla resistance. A sign at the village entrance commemorates the destruction.",
    description_fr: "Capitale de la municipalite de Kantanos-Selino, reconstruite apres sa destruction totale par les nazis en juin 1941 en represailles a la resistance de guerrilla. Un panneau a l'entree du village commemore cette destruction."
  },
  {
    name_en: "Spilia",
    name_el: "Σπηλιά",
    name_fr: "Spilia",
    lat: 35.2444, lng: 23.8667,
    region: "west", period: "venetian",
    population: 280, altitude_m: 380,
    municipality: "Kantanos-Selino",
    description_en: "Remote traditional village in the Selino region of southwestern Crete, surrounded by ancient olive trees and with views toward the Libyan Sea. Completely off the tourist trail.",
    description_fr: "Village traditionnel isole de la region de Selino dans le sud-ouest de la Crete, entoure d'oliviers anciens avec vue sur la mer Libyenne. Totalement hors des sentiers touristiques."
  },
  {
    name_en: "Agia Triada (Chania)",
    name_el: "Αγία Τριάδα",
    name_fr: "Agia Triada (Chanie)",
    lat: 35.5367, lng: 23.9083,
    region: "west", period: "venetian",
    population: 150, altitude_m: 40,
    municipality: "Platanias",
    description_en: "Small village near the Agia Triada monastery, one of Crete's most important Venetian-era monasteries founded in the early 17th century. The monks produce excellent organic olive oil.",
    description_fr: "Petit village pres du monastere d'Agia Triada, l'un des monasteres venitiens les plus importants de Crete fonde au debut du 17e siecle. Les moines produisent une excellente huile d'olive biologique."
  },
  {
    name_en: "Theriso",
    name_el: "Θέρισο",
    name_fr: "Theriso",
    lat: 35.4536, lng: 24.0731,
    region: "west", period: "ottoman",
    population: 170, altitude_m: 580,
    municipality: "Chania",
    description_en: "Historic mountain village south of Chania through a dramatic gorge, birthplace of Eleftherios Venizelos's 1905 revolutionary assembly that demanded union with Greece. A monument marks this pivotal event.",
    description_fr: "Village de montagne historique au sud de La Canee a travers une gorge spectaculaire, berceau de l'assemblee revolutionnaire de 1905 d'Eleftherios Venizelos qui reclamait l'union avec la Grece. Un monument marque cet evenement fondateur."
  },

  // ============================================================
  // RETHYMNO REGIONAL UNIT (central)
  // ============================================================
  {
    name_en: "Plakias",
    name_el: "Πλακιάς",
    name_fr: "Plakias",
    lat: 35.1915, lng: 24.3955,
    region: "central", period: "modern",
    population: 200, altitude_m: 5,
    municipality: "Agios Vasileios",
    description_en: "Laid-back south coast village with a long sandy beach backed by mountains and deep gorges. A favorite with hikers exploring the Kotsifou and Kourtaliotiko gorges nearby.",
    description_fr: "Village tranquille de la cote sud avec une longue plage de sable encadree par des montagnes et des gorges profondes. Favori des randonneurs explorant les gorges de Kotsifou et Kourtaliotiko."
  },
  {
    name_en: "Agia Galini",
    name_el: "Αγία Γαλήνη",
    name_fr: "Agia Galini",
    lat: 35.0971, lng: 24.6885,
    region: "central", period: "modern",
    population: 800, altitude_m: 5,
    municipality: "Agios Vasileios",
    description_en: "Picturesque fishing village tumbling down a hillside to a small harbor on the south coast. Once a quiet fishing village, now a popular resort famous for its fresh fish tavernas.",
    description_fr: "Pittoresque village de pecheurs degringolant d'une colline vers un petit port sur la cote sud. Autrefois paisible village de pecheurs, aujourd'hui station balneaire populaire reconnue pour ses tavernes de poissons frais."
  },
  {
    name_en: "Spili",
    name_el: "Σπήλι",
    name_fr: "Spili",
    lat: 35.2167, lng: 24.5333,
    region: "central", period: "venetian",
    population: 720, altitude_m: 400,
    municipality: "Agios Vasileios",
    description_en: "Mountain village famous for its iconic Venetian fountain with 25 lion heads spouting fresh spring water. A cool and green oasis in the Rethymno hinterland, surrounded by plane trees and lush vegetation.",
    description_fr: "Village de montagne celebre pour son iconique fontaine venitienne aux 25 tetes de lion qui jaillissent de l'eau de source fraiche. Une oasis fraiche et verdoyante dans l'arriere-pays de Rethymnon, entouree de platanes et d'une vegetation luxuriante."
  },
  {
    name_en: "Margarites",
    name_el: "Μαργαρίτες",
    name_fr: "Margarites",
    lat: 35.3333, lng: 24.6333,
    region: "central", period: "venetian",
    population: 600, altitude_m: 320,
    municipality: "Rethymno",
    description_en: "Traditional pottery village in the Rethymno hills, inhabited since Minoan times. Dozens of pottery workshops line the stone streets where artisans continue millennia-old ceramic traditions.",
    description_fr: "Village de poterie traditionnel dans les collines de Rethymnon, habite depuis l'epoque minoenne. Des dizaines d'ateliers de poterie jalonnent les rues en pierre ou les artisans perpetuent des traditions ceramiques millenaires."
  },
  {
    name_en: "Melidoni",
    name_el: "Μελιδόνι",
    name_fr: "Melidoni",
    lat: 35.3167, lng: 24.6667,
    region: "central", period: "ancient",
    population: 380, altitude_m: 280,
    municipality: "Rethymno",
    description_en: "Village near the famous Melidoni Cave, a sacred site since antiquity dedicated to Talos the bronze giant of Greek mythology. In 1824 during the Ottoman period, hundreds of Cretans were massacred here by Turkish troops.",
    description_fr: "Village pres de la celebre Grotte de Melidoni, site sacre depuis l'Antiquite dedie a Talos, le geant de bronze de la mythologie grecque. En 1824 lors de la periode ottomane, des centaines de Cretois y furent massacres par les troupes turques."
  },
  {
    name_en: "Anogia",
    name_el: "Ανώγεια",
    name_fr: "Anogia",
    lat: 35.2667, lng: 24.8667,
    region: "central", period: "ottoman",
    population: 2200, altitude_m: 740,
    municipality: "Malevizi",
    description_en: "Proud mountain village on the slopes of Mount Ida (Psiloritis), renowned for its fierce resistance during WWII. Burned to the ground by Nazi forces in 1944, rebuilt by its defiant inhabitants who maintain strong musical and weaving traditions.",
    description_fr: "Fier village de montagne sur les pentes du Mont Ida (Psiloritis), renomme pour sa farouche resistance pendant la Seconde Guerre Mondiale. Brule par les forces nazies en 1944, reconstruit par ses habitants indomptables qui maintiennent de fortes traditions musicales et de tissage."
  },
  {
    name_en: "Eleftherna",
    name_el: "Ελεύθερνα",
    name_fr: "Eleftherna",
    lat: 35.3239, lng: 24.7297,
    region: "central", period: "ancient",
    population: 450, altitude_m: 380,
    municipality: "Rethymno",
    description_en: "Village near the ancient city of Eleftherna, one of Crete's most important archaeological sites with excavations revealing findings from the 9th century BC. A new museum opened in 2016 to house the remarkable discoveries.",
    description_fr: "Village pres de l'ancienne cite d'Eleftherna, l'un des sites archeologiques les plus importants de Crete avec des fouilles revelant des decouvertes du 9e siecle avant J.-C. Un nouveau musee a ouvert en 2016 pour abriter les remarquables decouvertes."
  },
  {
    name_en: "Axos",
    name_el: "Αξός",
    name_fr: "Axos",
    lat: 35.3056, lng: 24.7806,
    region: "central", period: "ancient",
    population: 290, altitude_m: 520,
    municipality: "Rethymno",
    description_en: "Small village on the north slopes of Mount Ida with ancient roots. The surrounding area contains remains of the ancient city of Axos, active from Minoan through Roman times.",
    description_fr: "Petit village sur les pentes nord du Mont Ida aux racines antiques. Les environs contiennent des vestiges de l'ancienne cite d'Axos, active de l'epoque minoenne jusqu'a la periode romaine."
  },
  {
    name_en: "Perama",
    name_el: "Πέραμα",
    name_fr: "Perama",
    lat: 35.3500, lng: 24.7167,
    region: "central", period: "modern",
    population: 1600, altitude_m: 240,
    municipality: "Rethymno",
    description_en: "Market town in central Rethymno, near the famous Melidoni Cave. A practical agricultural center serving the surrounding villages with a weekly market.",
    description_fr: "Ville de marche dans le centre de Rethymnon, pres de la celebre Grotte de Melidoni. Centre agricole pratique desservant les villages environnants avec un marche hebdomadaire."
  },
  {
    name_en: "Mourne",
    name_el: "Μουρνέ",
    name_fr: "Mourne",
    lat: 35.3444, lng: 24.5722,
    region: "central", period: "venetian",
    population: 350, altitude_m: 310,
    municipality: "Agios Vasileios",
    description_en: "Tranquil traditional village in the hills south of Rethymno, set among old olive groves with views toward the Libyan Sea. Largely unspoiled by tourism with authentic Cretan character.",
    description_fr: "Village traditionnel tranquille dans les collines au sud de Rethymnon, entoure de vieilles oliveraies avec vue sur la mer Libyenne. Tres peu touche par le tourisme avec un caractere cretois authentique."
  },
  {
    name_en: "Chromonastiri",
    name_el: "Χρωμοναστήρι",
    name_fr: "Chromonastiri",
    lat: 35.3336, lng: 24.5528,
    region: "central", period: "venetian",
    population: 420, altitude_m: 280,
    municipality: "Rethymno",
    description_en: "Traditional village near Rethymno known for its well-preserved Venetian-era architecture and a historic monastery. The surrounding landscape of olive groves and vineyards is typical of the Rethymno uplands.",
    description_fr: "Village traditionnel pres de Rethymnon connu pour son architecture bien preservee de l'epoque venitienne et un monastere historique. Le paysage environnant d'oliveraies et de vignobles est typique des hauteurs de Rethymnon."
  },
  {
    name_en: "Adele",
    name_el: "Αδελέ",
    name_fr: "Adele",
    lat: 35.3658, lng: 24.5503,
    region: "central", period: "modern",
    population: 750, altitude_m: 110,
    municipality: "Rethymno",
    description_en: "Village just east of Rethymno city, part of the rapidly developing coastal strip. Home to a notable Venetian manor and surrounded by productive citrus groves.",
    description_fr: "Village juste a l'est de la ville de Rethymnon, faisant partie de la bande cotiere en rapide developpement. Abrite un notable manoir venitien et entoure de vergers d'agrumes productifs."
  },
  {
    name_en: "Armeni",
    name_el: "Αρμένι",
    name_fr: "Armeni",
    lat: 35.2972, lng: 24.5139,
    region: "central", period: "ancient",
    population: 560, altitude_m: 290,
    municipality: "Agios Vasileios",
    description_en: "Village near one of Crete's most important Late Minoan cemeteries, with over 200 rock-cut chamber tombs dating to 1350-1200 BC. The site gives a remarkable insight into late Bronze Age Cretan burial customs.",
    description_fr: "Village pres de l'un des plus importants cimetieres minoens tardifs de Crete, avec plus de 200 tombes creusees dans la roche datant de 1350-1200 avant J.-C. Le site offre un apercu remarquable des coutumes funeraires cretoises de la fin de l'Age de Bronze."
  },

  // ============================================================
  // HERAKLION REGIONAL UNIT (central)
  // ============================================================
  {
    name_en: "Fodele",
    name_el: "Φόδελε",
    name_fr: "Fodele",
    lat: 35.3583, lng: 24.9489,
    region: "central", period: "venetian",
    population: 500, altitude_m: 80,
    municipality: "Malevizi",
    description_en: "Lush citrus valley village claimed as the birthplace of El Greco (Domenikos Theotokopoulos), born around 1541. A reconstructed Byzantine house museum commemorates the great painter, surrounded by orange groves.",
    description_fr: "Village dans une vallee d'agrumes luxuriante revendique comme lieu de naissance du Greco (Domenikos Theotokopoulos), ne vers 1541. Un musee de maison byzantine reconstruit commemore le grand peintre, entoure de vergers d'orangers."
  },
  {
    name_en: "Zaros",
    name_el: "Ζαρός",
    name_fr: "Zaros",
    lat: 35.1298, lng: 24.9046,
    region: "central", period: "venetian",
    population: 2300, altitude_m: 340,
    municipality: "Minoa Pediadas",
    description_en: "Famous spring-water village at the foot of Mount Ida, supplying mineral water to most of Crete. Starting point for hikes through the Rouvas Gorge into the Psiloritis massif, with excellent local trout restaurants.",
    description_fr: "Celebre village d'eau de source au pied du Mont Ida, fournissant de l'eau minerale a la plupart de la Crete. Point de depart pour les randonnees a travers les Gorges de Rouvas dans le massif du Psiloritis, avec d'excellents restaurants de truites locales."
  },
  {
    name_en: "Gortyna",
    name_el: "Γόρτυνα",
    name_fr: "Gortyne",
    lat: 35.0639, lng: 24.9453,
    region: "central", period: "ancient",
    population: 280, altitude_m: 40,
    municipality: "Phaistos",
    description_en: "Village near the ancient capital of Roman Crete, one of the most important archaeological sites on the island. The site includes the famous Law Code of Gortyn (450 BC), the earliest law code in the Greek world.",
    description_fr: "Village pres de l'ancienne capitale de la Crete romaine, l'un des sites archeologiques les plus importants de l'ile. Le site inclut le celebre Code des Lois de Gortyne (450 av. J.-C.), le plus ancien code de loi du monde grec."
  },
  {
    name_en: "Phaistos",
    name_el: "Φαιστός",
    name_fr: "Phaistos",
    lat: 35.0539, lng: 24.8133,
    region: "central", period: "minoan",
    population: 180, altitude_m: 100,
    municipality: "Phaistos",
    description_en: "Village near the second most important Minoan palace in Crete after Knossos, with breathtaking views over the Messara plain. The Phaistos Disc, discovered here in 1908, remains one of archaeology's greatest unsolved mysteries.",
    description_fr: "Village pres du deuxieme palais minoen le plus important de Crete apres Knossos, avec des vues epoustouflantes sur la plaine de la Messara. Le Disque de Phaistos, decouvert ici en 1908, reste l'une des plus grandes enigmes non resolues de l'archeologie."
  },
  {
    name_en: "Agia Triada (Heraklion)",
    name_el: "Αγία Τριάδα",
    name_fr: "Agia Triada (Heraklion)",
    lat: 35.0614, lng: 24.8031,
    region: "central", period: "minoan",
    population: 120, altitude_m: 80,
    municipality: "Phaistos",
    description_en: "Village near the Minoan royal villa site of Agia Triada, dating to around 1600 BC. The site yielded some of the finest Minoan art including the Harvester Vase and Boxer Rhyton, now in the Heraklion Museum.",
    description_fr: "Village pres du site de la villa royale minoenne d'Agia Triada, datant d'environ 1600 avant J.-C. Le site a livre certains des plus beaux exemples de l'art minoen dont le Vase du Moissonneur et le Rhyton du Boxeur, maintenant au Musee d'Heraklion."
  },
  {
    name_en: "Mires",
    name_el: "Μοίρες",
    name_fr: "Mires",
    lat: 34.9994, lng: 24.8783,
    region: "central", period: "modern",
    population: 5800, altitude_m: 50,
    municipality: "Phaistos",
    description_en: "The main market town of the Messara plain, the largest fertile plain in Crete. A busy agricultural center with a lively Wednesday market serving the farming communities of central-southern Crete.",
    description_fr: "La principale ville de marche de la plaine de la Messara, la plus grande plaine fertile de Crete. Centre agricole anime avec un marche du mercredi animant les communautes agricoles du centre-sud de la Crete."
  },
  {
    name_en: "Tympaki",
    name_el: "Τυμπάκι",
    name_fr: "Tympaki",
    lat: 35.0,  lng: 24.7667,
    region: "central", period: "modern",
    population: 4200, altitude_m: 15,
    municipality: "Phaistos",
    description_en: "Agricultural town in the western Messara plain, center of Crete's greenhouse vegetable industry. The surrounding area produces tomatoes, cucumbers and peppers exported throughout Europe.",
    description_fr: "Ville agricole dans la plaine de la Messara occidentale, centre de l'industrie des legumes sous serre de Crete. La region environnante produit des tomates, concombres et poivrons exportes dans toute l'Europe."
  },
  {
    name_en: "Pompia",
    name_el: "Πομπιά",
    name_fr: "Pompia",
    lat: 35.0447, lng: 24.9744,
    region: "central", period: "venetian",
    population: 1100, altitude_m: 130,
    municipality: "Phaistos",
    description_en: "Traditional agricultural village in central Crete near an important Minoan site. The area is known for its olive oil production and the village has maintained its authentic character despite proximity to tourist sites.",
    description_fr: "Village agricole traditionnel du centre de la Crete pres d'un important site minoen. La region est connue pour sa production d'huile d'olive et le village a conserve son caractere authentique malgre la proximite des sites touristiques."
  },
  {
    name_en: "Venerato",
    name_el: "Βενεράτο",
    name_fr: "Venerato",
    lat: 35.2361, lng: 25.0694,
    region: "central", period: "venetian",
    population: 900, altitude_m: 220,
    municipality: "Heraklion",
    description_en: "Village in the hills south of Heraklion near the Paliani Monastery, one of the oldest Byzantine monasteries in Crete. The monastery is famous for a sacred myrtle tree believed to perform miracles.",
    description_fr: "Village dans les collines au sud d'Heraklion pres du Monastere de Paliani, l'un des plus anciens monasteres byzantins de Crete. Le monastere est celebre pour un myrte sacre auquel on attribue des miracles."
  },
  {
    name_en: "Thrapsano",
    name_el: "Θραψανό",
    name_fr: "Thrapsano",
    lat: 35.1667, lng: 25.2833,
    region: "central", period: "venetian",
    population: 1400, altitude_m: 380,
    municipality: "Minoa Pediadas",
    description_en: "Traditional pottery village in the Pediada region, known since antiquity for its terracotta pithoi (large storage jars). The village potters still produce traditional Cretan ceramics using techniques passed down for generations.",
    description_fr: "Village de poterie traditionnel dans la region de Pediada, connu depuis l'Antiquite pour ses pithoi en terre cuite (grandes jarres de stockage). Les potiers du village produisent encore des ceramiques cretoises traditionnelles en utilisant des techniques transmises de generation en generation."
  },
  {
    name_en: "Kasteli (Pediada)",
    name_el: "Καστέλι Πεδιάδος",
    name_fr: "Kasteli (Pediada)",
    lat: 35.2000, lng: 25.3333,
    region: "central", period: "venetian",
    population: 2800, altitude_m: 340,
    municipality: "Minoa Pediadas",
    description_en: "The main town of the Pediada region, a fertile plateau east of Heraklion. Center of agricultural production for the area with a traditional market and well-preserved older neighborhoods.",
    description_fr: "La principale ville de la region de Pediada, un plateau fertile a l'est d'Heraklion. Centre de production agricole pour la region avec un marche traditionnel et des quartiers anciens bien preserves."
  },
  {
    name_en: "Arkalochori",
    name_el: "Αρκαλοχώρι",
    name_fr: "Arkalochori",
    lat: 35.1397, lng: 25.2694,
    region: "central", period: "minoan",
    population: 3800, altitude_m: 310,
    municipality: "Minoa Pediadas",
    description_en: "Town in central Crete known for the remarkable Arkalochori Cave, where a hoard of Minoan double axes and other bronze age votive offerings were discovered. The 2021 earthquake caused significant damage to the town.",
    description_fr: "Ville du centre de la Crete connue pour la remarquable Grotte d'Arkalochori, ou un tresor de doubles haches minoennes et d'autres offrandes votives de l'age de bronze ont ete decouverts. Le seisme de 2021 a cause des dommages importants a la ville."
  },
  {
    name_en: "Ano Viannos",
    name_el: "Άνω Βιάννος",
    name_fr: "Ano Viannos",
    lat: 35.0541, lng: 25.4097,
    region: "central", period: "venetian",
    population: 850, altitude_m: 520,
    municipality: "Viannos",
    description_en: "Mountain village overlooking the south coast, center of the Viannos region that saw one of the worst Nazi massacres in Crete in September 1943. The village has a Byzantine church with important frescoes.",
    description_fr: "Village de montagne surplombant la cote sud, centre de la region de Viannos qui fut le theatre de l'un des pires massacres nazis en Crete en septembre 1943. Le village possede une eglise byzantine avec d'importantes fresques."
  },
  {
    name_en: "Episkopi (Heraklion)",
    name_el: "Επισκοπή",
    name_fr: "Episkopi (Heraklion)",
    lat: 35.1917, lng: 25.0694,
    region: "central", period: "venetian",
    population: 1200, altitude_m: 180,
    municipality: "Heraklion",
    description_en: "Village south of Heraklion with an important Byzantine church, the 11th-century church of Agios Ioannis Theologos. A traditional wine-producing area with several wineries open to visitors.",
    description_fr: "Village au sud d'Heraklion avec une importante eglise byzantine, l'eglise du 11e siecle d'Agios Ioannis Theologos. Zone de production viticole traditionnelle avec plusieurs domaines viticoles ouverts aux visiteurs."
  },
  {
    name_en: "Acharavi",
    name_el: "Αχαράβη",
    name_fr: "Acharavi",
    lat: 35.2139, lng: 24.9528,
    region: "central", period: "venetian",
    population: 420, altitude_m: 320,
    municipality: "Malevizi",
    description_en: "Small village in the mountains south of Heraklion, typical of the traditional agricultural communities of inland Crete. Stone houses, olive groves and a simple taverna maintain the authentic character.",
    description_fr: "Petit village dans les montagnes au sud d'Heraklion, typique des communautes agricoles traditionnelles de la Crete interieure. Maisons en pierre, oliveraies et une simple taverne maintiennent le caractere authentique."
  },
  {
    name_en: "Peza",
    name_el: "Πέζα",
    name_fr: "Peza",
    lat: 35.2117, lng: 25.2333,
    region: "central", period: "venetian",
    population: 1600, altitude_m: 420,
    municipality: "Arhanes-Asterousia",
    description_en: "Wine village in the Pediada hills, center of the Peza wine appellation producing some of Crete's best red wines from Kotsifali and Mandilari grapes. Several notable wineries offer tours and tastings.",
    description_fr: "Village viticole dans les collines de Pediada, centre de l'appellation de vin de Peza produisant certains des meilleurs vins rouges de Crete a partir de raisins Kotsifali et Mandilari. Plusieurs domaines notables proposent des visites et des degustations."
  },
  {
    name_en: "Houdetsi",
    name_el: "Χουδέτσι",
    name_fr: "Houdetsi",
    lat: 35.2,   lng: 25.25,
    region: "central", period: "venetian",
    population: 550, altitude_m: 380,
    municipality: "Arhanes-Asterousia",
    description_en: "Traditional village in the wine-producing Pediada area, home to an excellent Music Workshop and Museum of Traditional Musical Instruments of the World founded by musician Ross Daly.",
    description_fr: "Village traditionnel dans la zone viticole de Pediada, abritant un excellent Atelier de Musique et Musee des Instruments de Musique Traditionnels du Monde fonde par le musicien Ross Daly."
  },
  {
    name_en: "Vathypetro",
    name_el: "Βαθύπετρο",
    name_fr: "Vathypetro",
    lat: 35.2386, lng: 25.3244,
    region: "central", period: "minoan",
    population: 180, altitude_m: 260,
    municipality: "Arhanes-Asterousia",
    description_en: "Village near a remarkable Minoan country house (1600 BC) with the oldest known wine press in the world still in situ. The rural Minoan estate at Vathypetro shows the sophisticated agricultural practices of Bronze Age Crete.",
    description_fr: "Village pres d'une remarquable maison de campagne minoenne (1600 av. J.-C.) avec le plus ancien pressoir a vin connu du monde encore in situ. Le domaine rural minoen de Vathypetro montre les pratiques agricoles sophistiquees de la Crete de l'Age de Bronze."
  },
  {
    name_en: "Agia Varvara",
    name_el: "Αγία Βαρβάρα",
    name_fr: "Agia Varvara",
    lat: 35.1361, lng: 24.9906,
    region: "central", period: "venetian",
    population: 1800, altitude_m: 530,
    municipality: "Phaistos",
    description_en: "Mountain village at the geographical center of Crete, sitting at the pass between the northern and southern slopes of the island. The navel-stone (omphalos) marks the exact center point of Crete.",
    description_fr: "Village de montagne au centre geographique de la Crete, situe au col entre les pentes nord et sud de l'ile. La pierre ombilicale (omphalos) marque le point central exact de la Crete."
  },
  {
    name_en: "Rodia",
    name_el: "Ρόδια",
    name_fr: "Rodia",
    lat: 35.3889, lng: 24.9167,
    region: "central", period: "venetian",
    population: 580, altitude_m: 190,
    municipality: "Malevizi",
    description_en: "Village in the olive-rich Malevizi region west of Heraklion, known for high-quality olive oil production. The area has been continuously inhabited since Minoan times.",
    description_fr: "Village dans la region riche en oliviers de Malevizi a l'ouest d'Heraklion, connu pour la production d'huile d'olive de haute qualite. La region est habitee en continu depuis l'epoque minoenne."
  },
  {
    name_en: "Tylissos",
    name_el: "Τύλισσος",
    name_fr: "Tylissos",
    lat: 35.2972, lng: 24.9583,
    region: "central", period: "minoan",
    population: 1700, altitude_m: 340,
    municipality: "Malevizi",
    description_en: "Village near three important Minoan villas from around 1500 BC, one of the few sites where Minoan houses still stand to a significant height. The site shows the wealth and sophistication of Minoan provincial life.",
    description_fr: "Village pres de trois importantes villas minoennes datant d'environ 1500 avant J.-C., l'un des rares sites ou les maisons minoennes restent encore a une hauteur significative. Le site montre la richesse et la sophistication de la vie provinciale minoenne."
  },
  {
    name_en: "Avdou",
    name_el: "Αυδού",
    name_fr: "Avdou",
    lat: 35.2472, lng: 25.1917,
    region: "central", period: "venetian",
    population: 950, altitude_m: 420,
    municipality: "Chersonissos",
    description_en: "Well-preserved traditional village in the mountains above Chersonissos, a peaceful escape from the coastal tourist strip. Authentic stone houses, Byzantine churches with frescoes, and excellent local food.",
    description_fr: "Village traditionnel bien preserve dans les montagnes au-dessus de Hersonissos, une evasion paisible de la bande touristique cotiere. Maisons en pierre authentiques, eglises byzantines avec fresques et excellente cuisine locale."
  },
  {
    name_en: "Krasi",
    name_el: "Κρασί",
    name_fr: "Krasi",
    lat: 35.2389, lng: 25.2083,
    region: "central", period: "venetian",
    population: 320, altitude_m: 460,
    municipality: "Chersonissos",
    description_en: "Mountain village famous for a magnificent plane tree over 2,000 years old with a circumference of 23 meters, one of the oldest in Crete. A natural spring and several kafenia sit in its shade.",
    description_fr: "Village de montagne celebre pour un magnifique platane de plus de 2000 ans avec une circonference de 23 metres, l'un des plus anciens de Crete. Une source naturelle et plusieurs kafenia se trouvent a l'ombre."
  },
  {
    name_en: "Mochos",
    name_el: "Μοχός",
    name_fr: "Mochos",
    lat: 35.2486, lng: 25.2694,
    region: "central", period: "venetian",
    population: 1100, altitude_m: 500,
    municipality: "Chersonissos",
    description_en: "Traditional hilltop village with panoramic views from the mountains to the sea, maintaining a quiet village life despite its proximity to the resort coast. Good local wine and authentic tavernas.",
    description_fr: "Village traditionnel sur une colline avec des vues panoramiques des montagnes jusqu'a la mer, maintenant une vie de village tranquille malgre sa proximite de la cote de villegiature. Bon vin local et tavernes authentiques."
  },
  {
    name_en: "Gonies",
    name_el: "Γωνιές",
    name_fr: "Gonies",
    lat: 35.2917, lng: 25.0806,
    region: "central", period: "venetian",
    population: 380, altitude_m: 450,
    municipality: "Malevizi",
    description_en: "Quiet mountain village on the route from Heraklion to Anogia, set among olive and carob trees with views toward the Psiloritis massif. Traditional stone architecture and a Byzantine church.",
    description_fr: "Paisible village de montagne sur la route d'Heraklion a Anogia, entoure d'oliviers et de caroubiers avec vue sur le massif du Psiloritis. Architecture en pierre traditionnelle et eglise byzantine."
  },

  // ============================================================
  // LASITHI REGIONAL UNIT (east)
  // ============================================================
  {
    name_en: "Voila",
    name_el: "Βοΐλα",
    name_fr: "Voila",
    lat: 35.1267, lng: 26.1033,
    region: "east", period: "ottoman",
    population: 0, altitude_m: 340,
    municipality: "Siteia",
    description_en: "Abandoned Ottoman village in eastern Crete, one of the most evocative ghost villages on the island. The stone ruins of mosques, houses and a hamam stand intact among prickly pears, abandoned since the population exchange of 1923.",
    description_fr: "Village ottoman abandonne dans l'est de la Crete, l'un des villages fantomes les plus evocateurs de l'ile. Les ruines en pierre de mosquees, maisons et d'un hamam restent intactes parmi les figues de Barbarie, abandonnes depuis l'echange de populations de 1923."
  },
  {
    name_en: "Toplou",
    name_el: "Τοπλού",
    name_fr: "Toplou",
    lat: 35.2667, lng: 26.2,
    region: "east", period: "venetian",
    population: 20, altitude_m: 180,
    municipality: "Siteia",
    description_en: "Remote monastery and tiny hamlet in the far east of Crete, near Vai beach. The 14th-century Toplou Monastery is one of the most important on the island, its monks producing excellent wine and olive oil.",
    description_fr: "Monastere isole et petit hameau a l'extreme est de la Crete, pres de la plage de Vai. Le Monastere de Toplou du 14e siecle est l'un des plus importants de l'ile, ses moines produisant un excellent vin et de l'huile d'olive."
  },
  {
    name_en: "Palekastro",
    name_el: "Παλαίκαστρο",
    name_fr: "Palekastro",
    lat: 35.2028, lng: 26.2569,
    region: "east", period: "minoan",
    population: 1200, altitude_m: 30,
    municipality: "Siteia",
    description_en: "Village near one of the largest Minoan towns yet excavated, covering over 50,000 square meters. The Kouros of Palekastro, a stunning ivory and gold Minoan statuette, was discovered here.",
    description_fr: "Village pres de l'une des plus grandes villes minoennes fouillees a ce jour, couvrant plus de 50 000 metres carres. Le Kouros de Palekastro, une stupefiante statuette minoenne en ivoire et en or, a ete decouvert ici."
  },
  {
    name_en: "Vai",
    name_el: "Βαΐ",
    name_fr: "Vai",
    lat: 35.2583, lng: 26.2767,
    region: "east", period: "ancient",
    population: 30, altitude_m: 5,
    municipality: "Siteia",
    description_en: "Tiny settlement next to Europe's largest natural palm forest, covering 5,000 square meters of beach with the endemic Cretan date palm (Phoenix theophrasti). The beach is one of the most photographed in all of Greece.",
    description_fr: "Minuscule etablissement a cote de la plus grande foret de palmiers naturelle d'Europe, couvrant 5 000 metres carres de plage avec le palmier-dattier cretois endemique (Phoenix theophrasti). La plage est l'une des plus photographiees de toute la Grece."
  },
  {
    name_en: "Ziros",
    name_el: "Ζίρος",
    name_fr: "Ziros",
    lat: 35.0833, lng: 26.1167,
    region: "east", period: "venetian",
    population: 750, altitude_m: 480,
    municipality: "Siteia",
    description_en: "Traditional upland village in the Siteia highlands, surrounded by ancient olive groves and carob trees. A quiet agricultural community maintaining authentic Cretan traditions, off the main tourist routes.",
    description_fr: "Village traditionnel des hautes terres de Siteia, entoure d'oliveraies et de caroubiers anciens. Communaute agricole tranquille maintenant les traditions cretoises authentiques, hors des circuits touristiques principaux."
  },
  {
    name_en: "Etia",
    name_el: "Ετιά",
    name_fr: "Etia",
    lat: 35.0944, lng: 26.0889,
    region: "east", period: "venetian",
    population: 60, altitude_m: 420,
    municipality: "Siteia",
    description_en: "Remote semi-abandoned village in the Siteia hills, notable for a remarkable multi-storey Venetian manor house dating from the 15th century that stands in partial ruin. One of the finest Venetian aristocratic residences remaining in Crete.",
    description_fr: "Village semi-abandonne isole dans les collines de Siteia, remarquable pour un magnifique manoir venitien a plusieurs etages datant du 15e siecle qui se dresse en ruine partielle. L'une des plus belles residences aristocratiques venitiennes restantes en Crete."
  },
  {
    name_en: "Handras",
    name_el: "Χάνδρας",
    name_fr: "Handras",
    lat: 35.0833, lng: 26.1333,
    region: "east", period: "venetian",
    population: 290, altitude_m: 520,
    municipality: "Siteia",
    description_en: "High plateau village in the Siteia highlands, one of the most traditional communities in eastern Crete. The surrounding karst landscape and extensive olive groves give the area a timeless character.",
    description_fr: "Village sur le plateau des hautes terres de Siteia, l'une des communautes les plus traditionnelles de l'est de la Crete. Le paysage karstique environnant et les vastes oliveraies conferent a la region un caractere intemporel."
  },
  {
    name_en: "Lithines",
    name_el: "Λιθίνες",
    name_fr: "Lithines",
    lat: 35.0667, lng: 26.0,
    region: "east", period: "venetian",
    population: 480, altitude_m: 360,
    municipality: "Siteia",
    description_en: "Traditional village on the southern plateau of Siteia, overlooking the Libyan Sea. Known for producing excellent Siteia olive oil from ancient gnarled olive trees, some over 1000 years old.",
    description_fr: "Village traditionnel sur le plateau sud de Siteia, avec vue sur la mer Libyenne. Connu pour la production de l'excellente huile d'olive de Siteia a partir de vieux oliviers noueux, dont certains ont plus de 1000 ans."
  },
  {
    name_en: "Handakos",
    name_el: "Χάνδακας",
    name_fr: "Handakos",
    lat: 35.1167, lng: 26.05,
    region: "east", period: "venetian",
    population: 120, altitude_m: 400,
    municipality: "Siteia",
    description_en: "Small traditional village in the Siteia regional unit with panoramic views and well-preserved stone architecture. One of many quiet communities maintaining traditional Cretan agricultural life.",
    description_fr: "Petit village traditionnel de l'unite regionale de Siteia avec des vues panoramiques et une architecture en pierre bien preservee. L'une des nombreuses communautes tranquilles maintenant la vie agricole cretoise traditionnelle."
  },
  {
    name_en: "Piskokefalo",
    name_el: "Πισκοκέφαλο",
    name_fr: "Piskokefalo",
    lat: 35.1833, lng: 26.0833,
    region: "east", period: "minoan",
    population: 650, altitude_m: 200,
    municipality: "Siteia",
    description_en: "Village near a Minoan peak sanctuary and ancient settlement, in the hills above Siteia. The surrounding area has yielded Minoan findings that demonstrate dense habitation in eastern Crete during the Bronze Age.",
    description_fr: "Village pres d'un sanctuaire minoen de sommet et d'un etablissement ancien, dans les collines au-dessus de Siteia. La region environnante a livre des decouvertes minoennes qui temoignent d'une dense habitation dans l'est de la Crete pendant l'Age de Bronze."
  },
  {
    name_en: "Lastros",
    name_el: "Λάστρος",
    name_fr: "Lastros",
    lat: 35.1556, lng: 26.0444,
    region: "east", period: "venetian",
    population: 380, altitude_m: 340,
    municipality: "Siteia",
    description_en: "Traditional village in the hills above Siteia with views to the sea, surrounded by terraced olive groves. A quiet community with a strong sense of local identity and traditional architecture.",
    description_fr: "Village traditionnel dans les collines au-dessus de Siteia avec vue sur la mer, entoure d'oliveraies en terrasses. Une communaute tranquille avec un fort sens de l'identite locale et une architecture traditionnelle."
  },
  {
    name_en: "Exo Mouliana",
    name_el: "Έξω Μουλιανά",
    name_fr: "Exo Mouliana",
    lat: 35.1556, lng: 25.9833,
    region: "east", period: "venetian",
    population: 280, altitude_m: 380,
    municipality: "Siteia",
    description_en: "Village in the Siteia wine-producing area, part of a cluster of Mouliana villages known for quality red wine. The Thrapsathiri grape variety is particular to this area.",
    description_fr: "Village dans la zone viticole de Siteia, faisant partie d'un groupe de villages de Mouliana connus pour leur vin rouge de qualite. Le cepage Thrapsathiri est particulier a cette region."
  },
  {
    name_en: "Mesa Mouliana",
    name_el: "Μέσα Μουλιανά",
    name_fr: "Mesa Mouliana",
    lat: 35.1611, lng: 25.9944,
    region: "east", period: "venetian",
    population: 220, altitude_m: 400,
    municipality: "Siteia",
    description_en: "Inner village of the Mouliana cluster in the Siteia highlands, known for wine production from indigenous grape varieties. Stone houses and a traditional kafenion characterize this authentic settlement.",
    description_fr: "Village interieur du groupe de Mouliana dans les hautes terres de Siteia, connu pour la production viticole a partir de cepages indigenes. Des maisons en pierre et un kafenion traditionnel caracterisent cet etablissement authentique."
  },
  {
    name_en: "Psari Forada",
    name_el: "Ψαρί Φοράδα",
    name_fr: "Psari Forada",
    lat: 35.15, lng: 26.0,
    region: "east", period: "venetian",
    population: 120, altitude_m: 450,
    municipality: "Siteia",
    description_en: "Tiny traditional village in the Siteia hills, representative of the many small communities scattered across the eastern Cretan plateau. Surrounded by ancient olive trees and with views toward the coast.",
    description_fr: "Minuscule village traditionnel dans les collines de Siteia, representatif des nombreuses petites communautes dispersees sur le plateau de l'est de la Crete. Entoure d'oliviers anciens et avec des vues vers la cote."
  },
  {
    name_en: "Zakros",
    name_el: "Ζάκρος",
    name_fr: "Zakros",
    lat: 35.1014, lng: 26.2278,
    region: "east", period: "minoan",
    population: 350, altitude_m: 220,
    municipality: "Siteia",
    description_en: "Village above the spectacular Zakros Gorge (Valley of the Dead), with the Minoan palace below at Kato Zakros. The gorge walk passes ancient Minoan burial caves embedded in the cliff walls.",
    description_fr: "Village au-dessus de la spectaculaire Gorge de Zakros (Vallee des Morts), avec le palais minoen en contrebas a Kato Zakros. La promenade dans les gorges passe pres d'anciennes grottes funeraires minoennes encastrees dans les parois rocheuses."
  },
  {
    name_en: "Agia Fotia",
    name_el: "Αγία Φωτιά",
    name_fr: "Agia Fotia",
    lat: 35.0694, lng: 25.9639,
    region: "east", period: "minoan",
    population: 240, altitude_m: 30,
    municipality: "Siteia",
    description_en: "Coastal village near a major Minoan cemetery site with over 250 graves. Today a quiet settlement with a small beach, part of the developing tourism corridor between Ierapetra and Siteia.",
    description_fr: "Village cotier pres d'un important site de cimetiere minoen avec plus de 250 tombes. Aujourd'hui un etablissement tranquille avec une petite plage, faisant partie du corridor touristique en developpement entre Ierapetra et Siteia."
  },
  {
    name_en: "Ferma",
    name_el: "Φέρμα",
    name_fr: "Ferma",
    lat: 34.8833, lng: 25.7833,
    region: "east", period: "modern",
    population: 180, altitude_m: 10,
    municipality: "Ierapetra",
    description_en: "Small coastal village east of Ierapetra on the south coast, known for its quiet pebbly beach and proximity to protected natural areas. Traditional fishing and farming community.",
    description_fr: "Petit village cotier a l'est d'Ierapetra sur la cote sud, connu pour sa plage de galets tranquille et sa proximite des zones naturelles protegees. Communaute traditionnelle de peche et d'agriculture."
  },
  {
    name_en: "Kavousi",
    name_el: "Καβούσι",
    name_fr: "Kavousi",
    lat: 35.1208, lng: 25.8639,
    region: "east", period: "minoan",
    population: 580, altitude_m: 200,
    municipality: "Ierapetra",
    description_en: "Village above the Gulf of Mirabello with two important Minoan-period sites on the surrounding hills. Archaeological excavations have revealed an early Iron Age settlement showing continuity from the Minoan period.",
    description_fr: "Village au-dessus du Golfe de Mirabello avec deux importants sites de la periode minoenne sur les collines environnantes. Les fouilles archeologiques ont revele un etablissement du debut de l'Age du Fer montrant une continuite depuis la periode minoenne."
  },
  {
    name_en: "Tholos",
    name_el: "Θόλος",
    name_fr: "Tholos",
    lat: 35.0667, lng: 25.8,
    region: "east", period: "modern",
    population: 160, altitude_m: 15,
    municipality: "Ierapetra",
    description_en: "Quiet coastal village between Ierapetra and Agios Nikolaos, with a small beach and agricultural hinterland. Part of the south coast's emerging accommodation corridor for visitors seeking peaceful alternatives.",
    description_fr: "Paisible village cotier entre Ierapetra et Agios Nikolaos, avec une petite plage et un arriere-pays agricole. Fait partie du corridor d'hebergement emergent de la cote sud pour les visiteurs recherchant des alternatives paisibles."
  },
  {
    name_en: "Anatoli",
    name_el: "Ανατολή",
    name_fr: "Anatoli",
    lat: 35.0167, lng: 25.75,
    region: "east", period: "venetian",
    population: 380, altitude_m: 300,
    municipality: "Ierapetra",
    description_en: "Traditional village south of the Dikti mountains, overlooking the south coast. The fertile valley below produces vegetables and the village has maintained its authentic character away from tourist development.",
    description_fr: "Village traditionnel au sud des montagnes Dikti, surplombant la cote sud. La vallee fertile en contrebas produit des legumes et le village a conserve son caractere authentique a l'ecart du developpement touristique."
  },
  {
    name_en: "Males",
    name_el: "Μαλές",
    name_fr: "Males",
    lat: 35.0, lng: 25.6833,
    region: "east", period: "venetian",
    population: 320, altitude_m: 480,
    municipality: "Ierapetra",
    description_en: "Mountain village above the south coast with panoramic views, known for its traditional architecture and the monastic complex of Koudoumas nearby. A starting point for walks in the Asterousia mountains.",
    description_fr: "Village de montagne au-dessus de la cote sud avec des vues panoramiques, connu pour son architecture traditionnelle et le complexe monastique de Koudoumas a proximite. Point de depart pour des randonnees dans les montagnes d'Asterousia."
  },
  {
    name_en: "Kalo Chorio (Lasithi)",
    name_el: "Καλό Χωριό",
    name_fr: "Kalo Chorio (Lasithi)",
    lat: 35.0833, lng: 25.7167,
    region: "east", period: "venetian",
    population: 650, altitude_m: 180,
    municipality: "Ierapetra",
    description_en: "Village between Agios Nikolaos and Ierapetra on the south coast corridor, surrounded by greenhouses and olive groves. A typical working agricultural community of eastern Crete.",
    description_fr: "Village entre Agios Nikolaos et Ierapetra sur le corridor de la cote sud, entoure de serres et d'oliveraies. Communaute agricole de travail typique de l'est de la Crete."
  },
  {
    name_en: "Pahia Ammos",
    name_el: "Παχιά Άμμος",
    name_fr: "Pahia Ammos",
    lat: 35.0986, lng: 25.7333,
    region: "east", period: "modern",
    population: 480, altitude_m: 5,
    municipality: "Ierapetra",
    description_en: "Small resort village at the narrowest point of Crete, where only 12km separate the north and south coasts. A modest beach and several tavernas cater to passing travelers on the Agios Nikolaos-Ierapetra route.",
    description_fr: "Petit village de villegiature au point le plus etroit de la Crete, ou seulement 12km separent les cotes nord et sud. Une plage modeste et plusieurs tavernes accueillent les voyageurs de passage sur la route Agios Nikolaos-Ierapetra."
  },
  {
    name_en: "Istron",
    name_el: "Ίστρον",
    name_fr: "Istron",
    lat: 35.1389, lng: 25.7417,
    region: "east", period: "modern",
    population: 300, altitude_m: 10,
    municipality: "Agios Nikolaos",
    description_en: "Small coastal village east of Agios Nikolaos with a beautiful bay and beach. A growing tourist resort area taking advantage of the stunning natural setting on the Gulf of Mirabello.",
    description_fr: "Petit village cotier a l'est d'Agios Nikolaos avec une belle baie et une plage. Zone de villegiature en croissance tirant parti du cadre naturel epoustouflant sur le Golfe de Mirabello."
  },
  {
    name_en: "Plaka (Lasithi)",
    name_el: "Πλάκα",
    name_fr: "Plaka (Lasithi)",
    lat: 35.2222, lng: 25.6944,
    region: "east", period: "ottoman",
    population: 280, altitude_m: 20,
    municipality: "Agios Nikolaos",
    description_en: "Charming lakeside village opposite Spinalonga island, with fishing boats and waterfront tavernas. The view of the fortress island from Plaka's waterfront is one of the most romantic in Crete.",
    description_fr: "Charmant village lacustre en face de l'ile de Spinalonga, avec des bateaux de peche et des tavernes en bord de mer. La vue sur l'ile forteresse depuis le front de mer de Plaka est l'une des plus romantiques de Crete."
  },
  {
    name_en: "Spinalonga",
    name_el: "Σπιναλόγκα",
    name_fr: "Spinalonga",
    lat: 35.2611, lng: 25.7353,
    region: "east", period: "venetian",
    population: 0, altitude_m: 30,
    municipality: "Agios Nikolaos",
    description_en: "Former leper colony island in the Gulf of Elounda, one of the last active leper colonies in Europe (closed 1957). The spectacular Venetian fortress was never captured by the Ottomans, holding out until 1715.",
    description_fr: "Ancienne ile colonie de lepreux dans le Golfe d'Elounda, l'une des dernieres colonies de lepreux actives en Europe (fermee en 1957). La spectaculaire forteresse venitienne ne fut jamais capturee par les Ottomans, resistant jusqu'en 1715."
  },
  {
    name_en: "Bali",
    name_el: "Μπαλί",
    name_fr: "Bali",
    lat: 35.4164, lng: 24.7869,
    region: "central", period: "modern",
    population: 450, altitude_m: 5,
    municipality: "Rethymno",
    description_en: "Scenic resort village on the north coast between Rethymno and Heraklion, built around three sheltered coves. Originally a quiet fishing village, now popular for its clear turquoise water and snorkeling.",
    description_fr: "Pittoresque village de villegiature sur la cote nord entre Rethymnon et Heraklion, construit autour de trois anses abritees. Autrefois paisible village de pecheurs, maintenant populaire pour son eau turquoise claire et le snorkeling."
  },
  {
    name_en: "Panormos",
    name_el: "Πάνορμος",
    name_fr: "Panormos",
    lat: 35.4092, lng: 24.6869,
    region: "central", period: "ancient",
    population: 600, altitude_m: 5,
    municipality: "Rethymno",
    description_en: "Former Minoan and Byzantine settlement on the north coast with a protected harbor. A laid-back fishing village and small resort with a sandy beach and Venetian-era ruins.",
    description_fr: "Ancien etablissement minoen et byzantin sur la cote nord avec un port protege. Paisible village de pecheurs et petite station balneaire avec une plage de sable et des ruines de l'epoque venitienne."
  },
  {
    name_en: "Sissi",
    name_el: "Σίσι",
    name_fr: "Sissi",
    lat: 35.3083, lng: 25.4864,
    region: "central", period: "modern",
    population: 700, altitude_m: 5,
    municipality: "Chersonissos",
    description_en: "Small resort village on the north-central coast between Malia and Agios Nikolaos, built around a picturesque harbor and lagoon. Growing in popularity for its calm turquoise water and family-friendly atmosphere.",
    description_fr: "Petit village de villegiature sur la cote centro-nord entre Malia et Agios Nikolaos, construit autour d'un port et d'un lagon pittoresques. Gagnant en popularite pour son eau turquoise calme et son atmosphere familiale."
  },
  {
    name_en: "Malia",
    name_el: "Μάλια",
    name_fr: "Malia",
    lat: 35.2969, lng: 25.4633,
    region: "central", period: "minoan",
    population: 3500, altitude_m: 10,
    municipality: "Chersonissos",
    description_en: "Coastal town famous for two things: the important Minoan palace site 3km to the east, and its reputation as one of the liveliest nightlife resorts in Crete. The ancient palace complex dates to 1900 BC.",
    description_fr: "Ville cotiere celebre pour deux choses : le site important du palais minoen a 3km a l'est, et sa reputation comme l'une des stations balneaires a la vie nocturne la plus animee de Crete. Le complexe du palais antique date de 1900 avant J.-C."
  },
  {
    name_en: "Chersonissos",
    name_el: "Χερσόνησος",
    name_fr: "Chersonissos",
    lat: 35.3072, lng: 25.3717,
    region: "central", period: "ancient",
    population: 4200, altitude_m: 5,
    municipality: "Chersonissos",
    description_en: "Major resort town on the north-central coast, one of the most visited tourist destinations in Crete. An important port in ancient and Minoan times, today known for its long beach, water parks and nightlife.",
    description_fr: "Grande ville de villegiature sur la cote centro-nord, l'une des destinations touristiques les plus visitees de Crete. Important port dans les temps anciens et minoens, aujourd'hui connue pour sa longue plage, ses parcs aquatiques et sa vie nocturne."
  },
  {
    name_en: "Stalida",
    name_el: "Σταλίδα",
    name_fr: "Stalida",
    lat: 35.3, lng: 25.4,
    region: "central", period: "modern",
    population: 900, altitude_m: 5,
    municipality: "Chersonissos",
    description_en: "Resort village between Chersonissos and Malia on the north coast, offering a slightly quieter alternative to its neighbors. Long sandy beach with a mix of family hotels and tavernas.",
    description_fr: "Village de villegiature entre Hersonissos et Malia sur la cote nord, offrant une alternative un peu plus calme a ses voisins. Longue plage de sable avec un melange d'hotels familiaux et de tavernes."
  },
  {
    name_en: "Neapoli",
    name_el: "Νεάπολη",
    name_fr: "Neapoli",
    lat: 35.2569, lng: 25.6062,
    region: "east", period: "modern",
    population: 3200, altitude_m: 350,
    municipality: "Agios Nikolaos",
    description_en: "Main inland town of the Mirabello region, birthplace of Pope Alexander V (Petros Philargos) elected in 1409. A pleasant market town with Venetian heritage and a central square lined with mulberry trees.",
    description_fr: "Principale ville interieure de la region de Mirabello, lieu de naissance du Pape Alexandre V (Petros Philargos) elu en 1409. Agreable ville de marche avec un heritage venitien et une place centrale bordee de muriers."
  },
  {
    name_en: "Vrouchas",
    name_el: "Βρουχάς",
    name_fr: "Vrouchas",
    lat: 35.2208, lng: 25.6556,
    region: "east", period: "venetian",
    population: 180, altitude_m: 360,
    municipality: "Agios Nikolaos",
    description_en: "Traditional hilltop village above the Gulf of Mirabello, offering panoramic views over Agios Nikolaos and Spinalonga. A quiet refuge from the tourist coast with genuine Cretan character.",
    description_fr: "Village traditionnel perche sur une colline au-dessus du Golfe de Mirabello, offrant des vues panoramiques sur Agios Nikolaos et Spinalonga. Refuge paisible de la cote touristique avec un veritable caractere cretois."
  },
  {
    name_en: "Kroustas",
    name_el: "Κρούστας",
    name_fr: "Kroustas",
    lat: 35.1639, lng: 25.6833,
    region: "east", period: "venetian",
    population: 420, altitude_m: 580,
    municipality: "Agios Nikolaos",
    description_en: "Mountain village high above the Gulf of Mirabello with exceptional panoramic views stretching from Agios Nikolaos to Spinalonga. Traditional stone houses and an active agricultural community.",
    description_fr: "Village de montagne en hauteur au-dessus du Golfe de Mirabello avec des vues panoramiques exceptionnelles s'etendant d'Agios Nikolaos jusqu'a Spinalonga. Maisons en pierre traditionnelles et communaute agricole active."
  },
  {
    name_en: "Prina",
    name_el: "Πρίνα",
    name_fr: "Prina",
    lat: 35.1167, lng: 25.6556,
    region: "east", period: "venetian",
    population: 360, altitude_m: 450,
    municipality: "Agios Nikolaos",
    description_en: "Traditional inland village between Agios Nikolaos and Ierapetra, surrounded by olive groves and carob trees. The village produces high-quality Cretan olive oil from ancient groves.",
    description_fr: "Village interieur traditionnel entre Agios Nikolaos et Ierapetra, entoure d'oliveraies et de caroubiers. Le village produit une huile d'olive cretoise de haute qualite a partir d'oliveraies anciennes."
  },
  {
    name_en: "Lasithi Plateau villages",
    name_el: "Οροπέδιο Λασιθίου",
    name_fr: "Villages du Plateau de Lasithi",
    lat: 35.1833, lng: 25.4667,
    region: "east", period: "venetian",
    population: 1500, altitude_m: 830,
    municipality: "Oropedio Lasithiou",
    description_en: "The Lasithi Plateau at 830 meters altitude is an ancient agricultural plain in the Dikti mountains, once famous for thousands of white-sailed windmills. Today a cluster of traditional villages farm the fertile enclosed plain.",
    description_fr: "Le Plateau de Lasithi a 830 metres d'altitude est une plaine agricole ancienne dans les montagnes Dikti, autrefois celebre pour ses milliers de moulins a voile blanche. Aujourd'hui un groupe de villages traditionnels cultivent la fertile plaine encaissee."
  },
  {
    name_en: "Tzermiado",
    name_el: "Τζερμιάδο",
    name_fr: "Tzermiado",
    lat: 35.2056, lng: 25.4583,
    region: "east", period: "venetian",
    population: 1100, altitude_m: 840,
    municipality: "Oropedio Lasithiou",
    description_en: "Largest village on the Lasithi Plateau, the administrative center of the plateau communities. Near the Trapeza Cave with Neolithic and Minoan period occupation, one of the earliest inhabited sites in Crete.",
    description_fr: "Plus grand village du Plateau de Lasithi, centre administratif des communautes du plateau. Pres de la Grotte de Trapeza avec une occupation de l'epoque neolithique et minoenne, l'un des premiers sites habites de Crete."
  },
  {
    name_en: "Agios Georgios (Lasithi)",
    name_el: "Άγιος Γεώργιος",
    name_fr: "Agios Georgios (Lasithi)",
    lat: 35.1944, lng: 25.4639,
    region: "east", period: "venetian",
    population: 420, altitude_m: 830,
    municipality: "Oropedio Lasithiou",
    description_en: "Traditional village on the Lasithi Plateau with a small folklore museum. The surrounding landscape of apple orchards and vegetable fields, enclosed by the Dikti mountains, is unique in Crete.",
    description_fr: "Village traditionnel sur le Plateau de Lasithi avec un petit musee du folklore. Le paysage environnant de vergers de pommes et de champs de legumes, entoure par les montagnes Dikti, est unique en Crete."
  },
  {
    name_en: "Psychro",
    name_el: "Ψυχρό",
    name_fr: "Psychro",
    lat: 35.2083, lng: 25.4444,
    region: "east", period: "minoan",
    population: 180, altitude_m: 870,
    municipality: "Oropedio Lasithiou",
    description_en: "Village below the Diktaean Cave, where Zeus was said to have been born in Greek mythology. The cave, at 1025m altitude, contains stalactites and stalagmites and was a major Minoan cult site.",
    description_fr: "Village sous la Grotte de Dikti, ou Zeus serait ne selon la mythologie grecque. La grotte, a 1025 metres d'altitude, contient des stalagmites et stalactites et etait un important site de culte minoen."
  },
  {
    name_en: "Gonias (Lasithi)",
    name_el: "Γωνιές Λασιθίου",
    name_fr: "Gonias (Lasithi)",
    lat: 35.1889, lng: 25.4556,
    region: "east", period: "venetian",
    population: 220, altitude_m: 825,
    municipality: "Oropedio Lasithiou",
    description_en: "Small village on the Lasithi Plateau, part of the agricultural plateau communities surrounded by the dramatic peaks of the Dikti range. Apple cultivation is the main agricultural activity.",
    description_fr: "Petit village sur le Plateau de Lasithi, faisant partie des communautes agricoles du plateau entourees par les pics dramatiques de la chaine de Dikti. La culture de la pomme est l'activite agricole principale."
  },
  {
    name_en: "Milatos",
    name_el: "Μίλατος",
    name_fr: "Milatos",
    lat: 35.3083, lng: 25.5656,
    region: "east", period: "ancient",
    population: 350, altitude_m: 15,
    municipality: "Agios Nikolaos",
    description_en: "Coastal village in eastern Crete near the Milatos Cave, where 3,600 Cretans sought refuge during the Ottoman siege of 1823 and were massacred. The cave is now a memorial site and place of pilgrimage.",
    description_fr: "Village cotier dans l'est de la Crete pres de la Grotte de Milatos, ou 3 600 Cretois chercherent refuge durant le siege ottoman de 1823 et furent massacres. La grotte est maintenant un site memorial et lieu de pelerinage."
  },
  {
    name_en: "Sisarcha",
    name_el: "Σίσαρχα",
    name_fr: "Sisarcha",
    lat: 35.2833, lng: 25.5667,
    region: "east", period: "venetian",
    population: 160, altitude_m: 380,
    municipality: "Agios Nikolaos",
    description_en: "Small mountain village in the hills north of Agios Nikolaos, with traditional stone architecture and views over the Gulf of Mirabello. A quiet community maintaining Cretan agricultural traditions.",
    description_fr: "Petit village de montagne dans les collines au nord d'Agios Nikolaos, avec une architecture en pierre traditionnelle et des vues sur le Golfe de Mirabello. Communaute tranquille maintenant les traditions agricoles cretoises."
  },
  {
    name_en: "Makrys Toichos",
    name_el: "Μακρύς Τοίχος",
    name_fr: "Makrys Toichos",
    lat: 35.1167, lng: 25.9167,
    region: "east", period: "venetian",
    population: 280, altitude_m: 180,
    municipality: "Ierapetra",
    description_en: "Traditional village in the hills between the south coast and the Siteia highlands. Part of the network of agricultural communities that have worked the Cretan landscape for millennia.",
    description_fr: "Village traditionnel dans les collines entre la cote sud et les hautes terres de Siteia. Fait partie du reseau de communautes agricoles qui cultivent le paysage cretois depuis des millenaires."
  },
  {
    name_en: "Arvi",
    name_el: "Αρβή",
    name_fr: "Arvi",
    lat: 34.9933, lng: 25.4167,
    region: "central", period: "modern",
    population: 320, altitude_m: 5,
    municipality: "Viannos",
    description_en: "Isolated south coast village accessible via a narrow mountain road, known for its exotic microclimate created by hot springs. Banana plantations grow here thanks to the unusually warm conditions.",
    description_fr: "Village isole de la cote sud accessible via une etroite route de montagne, connu pour son microclimat exotique cree par des sources chaudes. Des plantations de bananes poussent ici grace aux conditions inhabituellement chaudes."
  },
  {
    name_en: "Keratokambos",
    name_el: "Κερατόκαμπος",
    name_fr: "Keratokambos",
    lat: 34.9833, lng: 25.4833,
    region: "central", period: "modern",
    population: 180, altitude_m: 5,
    municipality: "Viannos",
    description_en: "Remote south coast village reached through the dramatic Cha Gorge, with a long pebble beach and crystal-clear water. Very few visitors make it here, making it a true off-the-beaten-track destination.",
    description_fr: "Village isole de la cote sud atteint a travers la dramatique Gorge de Cha, avec une longue plage de galets et une eau cristalline. Tres peu de visiteurs se rendent ici, en faisant une veritable destination hors des sentiers battus."
  },
  {
    name_en: "Tertsa",
    name_el: "Τέρτσα",
    name_fr: "Tertsa",
    lat: 34.9833, lng: 25.55,
    region: "central", period: "modern",
    population: 140, altitude_m: 10,
    municipality: "Viannos",
    description_en: "Tiny isolated south coast village with a peaceful beach, reachable by dirt road from the Messara plain. One of the most secluded settlements on Crete's south coast.",
    description_fr: "Minuscule village isole de la cote sud avec une plage paisible, accessible par chemin de terre depuis la plaine de la Messara. L'un des etablissements les plus isoles de la cote sud de la Crete."
  },
  {
    name_en: "Tsoutsouros",
    name_el: "Τσούτσουρος",
    name_fr: "Tsoutsouros",
    lat: 34.9989, lng: 25.2861,
    region: "central", period: "ancient",
    population: 210, altitude_m: 5,
    municipality: "Heraklion",
    description_en: "Isolated south coast resort village with a long sandy beach, accessible via mountain roads from Heraklion. The ancient harbor of Inatos was located here, an important Minoan and Greco-Roman port.",
    description_fr: "Village de villegiature isole de la cote sud avec une longue plage de sable, accessible via des routes de montagne depuis Heraklion. L'ancien port d'Inatos etait situe ici, un important port minoen et greco-romain."
  },
  {
    name_en: "Lentas",
    name_el: "Λένδας",
    name_fr: "Lentas",
    lat: 34.9281, lng: 24.9072,
    region: "central", period: "ancient",
    population: 80, altitude_m: 5,
    municipality: "Phaistos",
    description_en: "Remote south coast village at the site of ancient Lebena, an important healing sanctuary dedicated to Asclepius in antiquity. Today a tiny bohemian community with an isolated beach popular with free campers.",
    description_fr: "Village isole de la cote sud sur le site de l'antique Lebena, un important sanctuaire de guerison dedie a Asclepios dans l'Antiquite. Aujourd'hui une minuscule communaute boheme avec une plage isolee populaire aupres des campeurs libres."
  },
  {
    name_en: "Kamilari",
    name_el: "Καμιλάρι",
    name_fr: "Kamilari",
    lat: 35.0361, lng: 24.7889,
    region: "central", period: "minoan",
    population: 380, altitude_m: 90,
    municipality: "Phaistos",
    description_en: "Traditional village in the western Messara plain near a large Minoan tholos tomb of the Old Palace period. The village maintains traditional agriculture with olive and grape cultivation.",
    description_fr: "Village traditionnel dans la plaine de la Messara occidentale pres d'une grande tombe a tholos minoenne de la periode des Anciens Palais. Le village maintient une agriculture traditionnelle avec la culture de l'olive et de la vigne."
  },
  {
    name_en: "Sivas",
    name_el: "Σίβας",
    name_fr: "Sivas",
    lat: 34.9722, lng: 24.7833,
    region: "central", period: "venetian",
    population: 260, altitude_m: 20,
    municipality: "Phaistos",
    description_en: "Small south coast village between Agia Galini and Matala, with a quiet beach and modest tavernas. A tranquil alternative to the more developed tourist resorts nearby.",
    description_fr: "Petit village de la cote sud entre Agia Galini et Matala, avec une plage tranquille et de modestes tavernes. Une alternative tranquille aux stations touristiques plus developpees a proximite."
  },
  {
    name_en: "Kokkinos Pyrgos",
    name_el: "Κόκκινος Πύργος",
    name_fr: "Kokkinos Pyrgos",
    lat: 35.0167, lng: 24.7167,
    region: "central", period: "modern",
    population: 450, altitude_m: 5,
    municipality: "Phaistos",
    description_en: "Small south coast village with a fishing harbor and beach, named for a red-painted Venetian tower. A local fishing and agricultural community serving the western Messara hinterland.",
    description_fr: "Petit village de la cote sud avec un port de peche et une plage, nomme d'apres une tour venitienne peinte en rouge. Communaute locale de peche et d'agriculture desservant l'arriere-pays de la Messara occidentale."
  },
  {
    name_en: "Lendas",
    name_el: "Λένδας",
    name_fr: "Lendas",
    lat: 34.9333, lng: 24.9,
    region: "central", period: "ancient",
    population: 100, altitude_m: 10,
    municipality: "Phaistos",
    description_en: "Remote south coast village at the site of the ancient healing sanctuary of Lebena. The rugged Lion's Head promontory and isolated sandy beaches attract those seeking seclusion on the south coast.",
    description_fr: "Village isole de la cote sud sur le site de l'antique sanctuaire de guerison de Lebena. Le promontoire escarpee de la Tete de Lion et les plages de sable isolees attirent ceux qui recherchent la solitude sur la cote sud."
  },

  // Additional historically important and well-known villages
  {
    name_en: "Agia Pelagia (Agios Nikolaos)",
    name_el: "Αγία Πελαγία",
    name_fr: "Agia Pelagia (Agios Nikolaos)",
    lat: 35.2028, lng: 25.7167,
    region: "east", period: "modern",
    population: 380, altitude_m: 5,
    municipality: "Agios Nikolaos",
    description_en: "Small coastal village on the Gulf of Mirabello north of Agios Nikolaos, with a sheltered bay and beach. A quiet alternative to the busier resorts, popular for diving in the clear waters.",
    description_fr: "Petit village cotier sur le Golfe de Mirabello au nord d'Agios Nikolaos, avec une baie et une plage abritees. Alternative calme aux stations plus animees, populaire pour la plongee dans les eaux claires."
  },
  {
    name_en: "Mirambello",
    name_el: "Μεραμπέλλο",
    name_fr: "Mirambello",
    lat: 35.2167, lng: 25.7333,
    region: "east", period: "venetian",
    population: 200, altitude_m: 60,
    municipality: "Agios Nikolaos",
    description_en: "Traditional village above the Gulf of Mirabello, giving its name to the entire bay. The Venetian name 'beautiful view' perfectly describes the panoramas from this hilltop settlement.",
    description_fr: "Village traditionnel au-dessus du Golfe de Mirabello, donnant son nom a toute la baie. Le nom venitien 'belle vue' decrit parfaitement les panoramas de cet etablissement perche sur une colline."
  },
  {
    name_en: "Agios Konstantinos",
    name_el: "Άγιος Κωνσταντίνος",
    name_fr: "Agios Konstantinos",
    lat: 35.3,   lng: 25.5167,
    region: "central", period: "venetian",
    population: 480, altitude_m: 180,
    municipality: "Chersonissos",
    description_en: "Traditional inland village above the north coast tourist strip, preserving authentic Cretan character away from the coastal development. Stone houses, olive groves and views toward the sea.",
    description_fr: "Village interieur traditionnel au-dessus de la bande touristique de la cote nord, preservant le caractere cretois authentique loin du developpement cotier. Maisons en pierre, oliveraies et vues vers la mer."
  },
  {
    name_en: "Skalani",
    name_el: "Σκαλάνι",
    name_fr: "Skalani",
    lat: 35.2681, lng: 25.2306,
    region: "central", period: "venetian",
    population: 1200, altitude_m: 160,
    municipality: "Heraklion",
    description_en: "Village in the wine-growing region south of Heraklion, surrounded by vineyards producing Vidiano and Kotsifali grapes. Several wineries have established operations here in recent years.",
    description_fr: "Village dans la region viticole au sud d'Heraklion, entoure de vignobles produisant les cepages Vidiano et Kotsifali. Plusieurs domaines viticoles se sont installes ici ces dernieres annees."
  },
  {
    name_en: "Prines",
    name_el: "Πρίνες",
    name_fr: "Prines",
    lat: 35.3139, lng: 24.6139,
    region: "central", period: "venetian",
    population: 680, altitude_m: 350,
    municipality: "Rethymno",
    description_en: "Village in the hills above Rethymno with panoramic views over the city and the sea. Traditional stone architecture and olive groves, a quiet contrast to the busy tourist city below.",
    description_fr: "Village dans les collines au-dessus de Rethymnon avec des vues panoramiques sur la ville et la mer. Architecture en pierre traditionnelle et oliveraies, contraste paisible avec la ville touristique animee en contrebas."
  },
  {
    name_en: "Viranepiskopi",
    name_el: "Βιράνεπισκοπή",
    name_fr: "Viranepiskopi",
    lat: 35.3333, lng: 24.5167,
    region: "central", period: "byzantine",
    population: 240, altitude_m: 260,
    municipality: "Agios Vasileios",
    description_en: "Small village whose name translates as 'ruined bishopric' referring to the important Byzantine Episcopal seat that once stood here. Remains of the ancient cathedral and Byzantine architecture are still visible.",
    description_fr: "Petit village dont le nom se traduit par 'eveche en ruines' en reference a l'important siege episcopal byzantin qui s'y trouvait autrefois. Des vestiges de l'ancienne cathedrale et de l'architecture byzantine sont encore visibles."
  },
  {
    name_en: "Akoumia",
    name_el: "Ακούμια",
    name_fr: "Akoumia",
    lat: 35.2139, lng: 24.6583,
    region: "central", period: "venetian",
    population: 380, altitude_m: 380,
    municipality: "Agios Vasileios",
    description_en: "Traditional mountain village above Plakias on the south coast route, with views over the surrounding olive groves and the distant sea. A typical Cretan village maintaining traditional architecture and agricultural life.",
    description_fr: "Village de montagne traditionnel au-dessus de Plakias sur la route de la cote sud, avec des vues sur les oliveraies environnantes et la mer distante. Village cretois typique maintenant l'architecture traditionnelle et la vie agricole."
  },
  {
    name_en: "Sellia",
    name_el: "Σέλλια",
    name_fr: "Sellia",
    lat: 35.2028, lng: 24.3683,
    region: "central", period: "venetian",
    population: 130, altitude_m: 290,
    municipality: "Agios Vasileios",
    description_en: "Perfectly preserved Venetian hilltop village above Plakias with stone-paved alleys and a spectacular eagle's-eye view over the Plakias bay and surrounding mountains. One of the most photogenic villages in Crete.",
    description_fr: "Village venitien perche sur une colline parfaitement preserve au-dessus de Plakias avec des ruelles pavees en pierre et une vue spectaculaire a vol d'oiseau sur la baie de Plakias et les montagnes environnantes. L'un des villages les plus photographiques de Crete."
  },
  {
    name_en: "Mirthios",
    name_el: "Μύρθιος",
    name_fr: "Mirthios",
    lat: 35.1917, lng: 24.3667,
    region: "central", period: "venetian",
    population: 150, altitude_m: 260,
    municipality: "Agios Vasileios",
    description_en: "Charming village above Plakias bay with excellent tavernas and stunning sunset views over the Libyan Sea. Popular with hikers and those seeking a quiet hillside base for exploring the south coast.",
    description_fr: "Charmant village au-dessus de la baie de Plakias avec d'excellentes tavernes et des vues spectaculaires sur le coucher de soleil au-dessus de la mer Libyenne. Populaire aupres des randonneurs et de ceux qui recherchent une base tranquille sur la colline pour explorer la cote sud."
  },
  {
    name_en: "Damnoni",
    name_el: "Δαμνόνι",
    name_fr: "Damnoni",
    lat: 35.1833, lng: 24.3833,
    region: "central", period: "modern",
    population: 50, altitude_m: 5,
    municipality: "Agios Vasileios",
    description_en: "Tiny coastal hamlet with three beautiful coves just east of Plakias, one of the most scenic spots on the south coast. A small taverna and a few rooms maintain this as a low-key retreat.",
    description_fr: "Minuscule hameau cotier avec trois belles anses juste a l'est de Plakias, l'un des plus beaux endroits de la cote sud. Une petite taverne et quelques chambres maintiennent cet endroit comme une retraite discrete."
  },
  {
    name_en: "Mixorrouma",
    name_el: "Μυξόρρουμα",
    name_fr: "Mixorrouma",
    lat: 35.0667, lng: 24.2917,
    region: "west", period: "venetian",
    population: 180, altitude_m: 350,
    municipality: "Sfakia",
    description_en: "Remote village in the Sfakia mountains accessible by a winding mountain road. Maintaining the proud, independent character typical of Sfakian communities, with traditional stone architecture.",
    description_fr: "Village isole dans les montagnes de Sfakia accessible par une route de montagne sinueuse. Maintenant le caractere fier et independant typique des communautes sfakiotes, avec une architecture en pierre traditionnelle."
  },
  {
    name_en: "Rodakino",
    name_el: "Ροδάκινο",
    name_fr: "Rodakino",
    lat: 35.1583, lng: 24.2917,
    region: "west", period: "venetian",
    population: 300, altitude_m: 80,
    municipality: "Agios Vasileios",
    description_en: "Remote south coast village known for its two excellent beaches flanking a rocky headland. A very quiet and authentic Cretan community well off the standard tourist itineraries.",
    description_fr: "Village isole de la cote sud connu pour ses deux excellentes plages flanquant un promontoire rocheux. Communaute cretoise tres tranquille et authentique bien hors des itineraires touristiques habituels."
  },
  {
    name_en: "Kato Saktouria",
    name_el: "Κάτω Σακτούρια",
    name_fr: "Kato Saktouria",
    lat: 35.1722, lng: 24.3278,
    region: "west", period: "venetian",
    population: 120, altitude_m: 50,
    municipality: "Agios Vasileios",
    description_en: "Tiny south coast village between Plakias and Frangokastello with a small beach and quiet atmosphere. Traditional fishing community largely unchanged by modern development.",
    description_fr: "Minuscule village de la cote sud entre Plakias et Frangokastello avec une petite plage et une atmosphere tranquille. Communaute de peche traditionnelle largement inchangee par le developpement moderne."
  },
  {
    name_en: "Agios Pavlos",
    name_el: "Άγιος Παύλος",
    name_fr: "Agios Pavlos",
    lat: 35.1056, lng: 24.5944,
    region: "central", period: "ancient",
    population: 40, altitude_m: 5,
    municipality: "Agios Vasileios",
    description_en: "Tiny settlement on the south coast with a sandy beach and chapel, named after St. Paul who was said to have sheltered here during a storm. A pilgrimage site and quiet retreat.",
    description_fr: "Minuscule etablissement sur la cote sud avec une plage de sable et une chapelle, nomme d'apres Saint Paul qui s'y serait abrite pendant une tempete. Site de pelerinage et retraite paisible."
  },
  {
    name_en: "Triopetra",
    name_el: "Τριόπετρα",
    name_fr: "Triopetra",
    lat: 35.1028, lng: 24.6361,
    region: "central", period: "modern",
    population: 30, altitude_m: 5,
    municipality: "Agios Vasileios",
    description_en: "Tiny isolated beach settlement named for three large sea rocks ('three rocks'), with one of the most pristine and wild beaches on the south coast. A favorite among those seeking complete seclusion.",
    description_fr: "Minuscule etablissement de plage isole nomme d'apres trois grandes roches marines ('trois rochers'), avec l'une des plages les plus sauvages et immaculees de la cote sud. Favori de ceux recherchant une complete solitude."
  },
];

async function main() {
  // 1. Fetch existing slugs to avoid duplicates
  console.log("Fetching existing villages...");
  const { data: existing, error: fetchErr } = await supabase
    .from("villages")
    .select("slug");

  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
    process.exit(1);
  }

  const existingSlugs = new Set(existing.map((v) => v.slug));
  console.log(`Existing villages: ${existingSlugs.size}`);

  // 2. Prepare new records
  const toInsert = [];
  const skipped = [];

  for (const v of NEW_VILLAGES) {
    const slug = slugify(v.name_en);
    if (existingSlugs.has(slug)) {
      skipped.push(v.name_en);
      continue;
    }
    toInsert.push({
      name_en: v.name_en,
      name_el: v.name_el || null,
      name_fr: v.name_fr || null,
      name_de: null,
      slug,
      region: v.region,
      period: v.period || "modern",
      population: v.population || null,
      altitude_m: v.altitude_m || null,
      latitude: v.lat,
      longitude: v.lng,
      municipality: v.municipality || null,
      description_en: v.description_en || null,
      description_fr: v.description_fr || null,
    });
  }

  console.log(`\nTo insert: ${toInsert.length} villages`);
  console.log(`Skipped (already exist): ${skipped.length} (${skipped.join(", ")})`);

  if (toInsert.length === 0) {
    console.log("Nothing to insert. Done.");
    return;
  }

  // 3. Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase.from("villages").insert(batch);
    if (error) {
      console.error(`Batch ${Math.floor(i/batchSize)+1} error:`, error.message);
      console.error("Detail:", error.details);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${toInsert.length}...`);
  }

  // 4. Verify final count
  const { data: final, error: finalErr } = await supabase
    .from("villages")
    .select("slug, region", { count: "exact" });

  if (!finalErr) {
    const stats = { west: 0, central: 0, east: 0 };
    final.forEach(v => { if (stats[v.region] !== undefined) stats[v.region]++; });
    console.log(`\n=== DONE ===`);
    console.log(`Total villages in DB: ${final.length}`);
    console.log(`  West (Chania/Rethymno):    ${stats.west}`);
    console.log(`  Central (Heraklion):       ${stats.central}`);
    console.log(`  East (Lasithi):            ${stats.east}`);
    console.log(`\nTarget was 150+: ${final.length >= 150 ? "ACHIEVED" : "NOT YET"}`);
  }
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
