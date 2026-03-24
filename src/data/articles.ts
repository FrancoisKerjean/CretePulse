export interface Article {
  slug: string;
  publishedAt: string;
  category: string;
  readTime: number;
  image: string;
  title_en: string;
  title_fr: string;
  title_de: string;
  title_el: string;
  content_en: string;
  content_fr: string;
  content_de: string;
  content_el: string;
}

export const articles: Article[] = [
  {
    slug: "hidden-beaches-eastern-crete",
    publishedAt: "2026-03-24",
    category: "beaches",
    readTime: 7,
    image: "https://images.unsplash.com/photo-1602088113235-229c19758e9f?w=1200&q=80",
    title_en: "10 Hidden Beaches in Eastern Crete You Won't Find on TripAdvisor",
    title_fr: "10 plages cachées de la Crète orientale introuvables sur TripAdvisor",
    title_de: "10 versteckte Strände in Ostkretas, die man nicht auf TripAdvisor findet",
    title_el: "10 κρυφές παραλίες στην ανατολική Κρήτη που δεν θα βρείτε στο TripAdvisor",
    content_en: `
<p>Eastern Crete gets a fraction of the tourist traffic of the west. That's a good thing. The coastline between Ierapetra and Sitia hides some of the island's best beaches, with zero infrastructure and nobody selling inflatable flamingos.</p>

<p>These are real places with GPS coordinates. Go in May or September for smaller crowds.</p>

<h2>1. Agios Nikolaos Beach (Goudouras area)</h2>
<p>Not the town. A small cove 4 km east of Goudouras village (35.0012°N, 26.0834°E). Park on the dirt track and walk 10 minutes down. Pebble and coarse sand, crystal water, zero facilities. Bring water.</p>

<h2>2. Kalo Nero</h2>
<p>Between Makrigialos and Analipsi, 35°01'N 25°59'E. A 300-metre stretch of golden sand with a small seasonal taverna (open June-September, check locally). Shallow entry, good for families.</p>

<h2>3. Kouremenos</h2>
<p>Near Palekastro (35.2056°N, 26.2589°E). The windsurfing beach that most visitors skip because they're heading to Vai. Strong meltemi winds in summer make it terrible for swimming but excellent for watching kitesurfers. September is calm.</p>

<h2>4. Perivolakia</h2>
<p>At the end of a gorge trail, 10 km southeast of Zakros (35.0611°N, 26.2419°E). No road access. You walk 2 hours through the gorge or hire a boat from Kato Zakros. One of the most isolated beaches on the island.</p>

<h2>5. Xerokambos</h2>
<p>A cluster of small beaches near the village of the same name (35.0328°N, 26.2072°E). Multiple coves, mostly empty outside August. One small taverna. Road is paved but narrow.</p>

<h2>6. Agia Fotia (near Sitia)</h2>
<p>7 km west of Sitia (35.1689°N, 26.0601°E). Local beach, concrete pier, small cantina in summer. Calm water, pebble mix. Gets morning shade from the hills.</p>

<h2>7. Tholos</h2>
<p>Between Ierapetra and Myrtos (35.0144°N, 25.6178°E). Pebbly, sheltered from north winds, very calm water. No services. The village above has two tavernas.</p>

<h2>8. Chrysi Island (South of Ierapetra)</h2>
<p>Uninhabited island 12 km off Ierapetra. Boats depart Ierapetra port (about 15 EUR return, May-October). Cedar forest, multiple beaches, no fresh water. Day trip only. Do not try to camp overnight, it is protected.</p>

<h2>9. Mirsini</h2>
<p>North coast near Neapoli (35.3094°N, 25.6044°E). Small, uncrowded, good snorkeling over rock. 15 minutes from the E75 national road.</p>

<h2>10. Makrigialos West Cove</h2>
<p>The main beach at Makrigialos is known. Walk 10 minutes west along the coast path to find a smaller, rockier cove (35.0389°N, 25.9858°E) that empties out after noon. Clear shallow water, good for snorkeling.</p>

<h2>What to bring</h2>
<ul>
  <li>Water: most of these beaches have no facilities</li>
  <li>Snorkeling gear: eastern Crete has better visibility than the west</li>
  <li>Cash: small tavernas rarely take cards</li>
  <li>Download offline maps (Maps.me or Google offline) before leaving the main road</li>
</ul>

<p>The eastern coast is best accessed with your own car. Public buses reach Ierapetra, Sitia, and Palekastro but not the small coves.</p>

<p>Want real-time sea conditions before you drive out? <a href="/en/beaches">Check today's beach conditions on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>La Crète orientale reçoit bien moins de touristes que l'ouest. C'est une bonne chose. Le littoral entre Iérapetra et Sitia cache certaines des meilleures plages de l'île, sans infrastructure et sans vendeurs de matelas gonflables.</p>

<p>Ce sont des lieux réels avec des coordonnées GPS. Partez en mai ou septembre pour éviter la foule.</p>

<h2>1. Plage d'Agios Nikolaos (zone de Goudouras)</h2>
<p>Pas la ville. Une petite crique 4 km à l'est du village de Goudouras (35.0012°N, 26.0834°E). Garez-vous sur la piste en terre et marchez 10 minutes. Galets et sable grossier, eau cristalline, aucune infrastructure. Apportez de l'eau.</p>

<h2>2. Kalo Nero</h2>
<p>Entre Makrigialos et Analipsi (35°01'N 25°59'E). 300 mètres de sable doré avec une petite taverne saisonnière (ouverte juin-septembre, vérifiez sur place). Entrée peu profonde, idéale pour les familles.</p>

<h2>3. Kouremenos</h2>
<p>Près de Palekastro (35.2056°N, 26.2589°E). La plage de windsurf que la plupart des visiteurs ignorent en se dirigeant vers Vaï. Fort vent meltemi en été : mauvais pour la baignade, excellent pour regarder les kitesurfeurs. Septembre est calme.</p>

<h2>4. Périvolakia</h2>
<p>Au bout d'un sentier dans les gorges, 10 km au sud-est de Zakros (35.0611°N, 26.2419°E). Pas d'accès routier. Marchez 2 heures dans les gorges ou louez un bateau depuis Kato Zakros. L'une des plages les plus isolées de l'île.</p>

<h2>5. Xerokambos</h2>
<p>Plusieurs petites criques près du village éponyme (35.0328°N, 26.2072°E). Souvent vides hors août. Une petite taverne. La route est goudronnée mais étroite.</p>

<h2>6. Agia Fotia (près de Sitia)</h2>
<p>7 km à l'ouest de Sitia (35.1689°N, 26.0601°E). Plage locale, petite jetée, buvette en été. Eau calme, mix galets. À l'ombre le matin.</p>

<h2>7. Tholos</h2>
<p>Entre Iérapetra et Myrtos (35.0144°N, 25.6178°E). Galets, protégé du vent du nord, eau très calme. Aucun service. Le village en hauteur a deux tavernes.</p>

<h2>Ce qu'il faut apporter</h2>
<ul>
  <li>De l'eau : la plupart de ces plages n'ont aucune infrastructure</li>
  <li>Masque et tuba : la Crète orientale offre une meilleure visibilité que l'ouest</li>
  <li>Cash : les petites tavernes acceptent rarement les cartes</li>
  <li>Cartes hors ligne téléchargées avant de quitter la route principale</li>
</ul>

<p>Envie de vérifier les conditions de mer avant de partir ? <a href="/fr/beaches">Consultez les conditions des plages en direct sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "samaria-gorge-hiking-guide-2026",
    publishedAt: "2026-03-24",
    category: "hikes",
    readTime: 8,
    image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200&q=80",
    title_en: "Samaria Gorge: Complete Hiking Guide 2026",
    title_fr: "Gorges de Samaria : guide complet randonnée 2026",
    title_de: "Samaria-Schlucht: Vollständiger Wanderführer 2026",
    title_el: "Φαράγγι Σαμαριάς: Πλήρης οδηγός πεζοπορίας 2026",
    content_en: `
<p>Samaria Gorge is 16 km long, takes 4-7 hours to walk, and is open roughly May to October. It is one of Europe's longest gorges and draws around 1 million hikers per year. Here is everything you need to know before going.</p>

<h2>The basics</h2>
<ul>
  <li>Start: Xyloskalo (1,230 m altitude), reached by bus from Chania or Rethymno</li>
  <li>End: Agia Roumeli village on the south coast</li>
  <li>Distance: 16 km one way</li>
  <li>Elevation drop: about 1,200 m</li>
  <li>Duration: 4-7 hours depending on fitness and crowds</li>
  <li>Entry fee: 5 EUR (2025 rate, check locally for 2026)</li>
  <li>Season: typically 1 May to 31 October, weather permitting</li>
</ul>

<h2>Getting there and back</h2>
<p>It is a one-way hike. You cannot return the way you came (park regulations). The logistics:</p>
<ul>
  <li>Bus from Chania (Platia 1866 bus station) to Xyloskalo: departs 6:15, 7:30, 8:30 am. Journey 1h15. About 7 EUR.</li>
  <li>From Agia Roumeli: take the ferry to Hora Sfakion (30 min, about 12 EUR) or Paleochora, then bus back to Chania.</li>
  <li>Total round trip from Chania including hike: budget a full day, 12-14 hours door to door.</li>
  <li>Organised tours from Chania include transport both ways, typically 25-40 EUR.</li>
</ul>

<h2>What to bring</h2>
<ul>
  <li>2+ litres of water minimum. Springs along the route but some dry up in late summer.</li>
  <li>Trail shoes or sturdy sandals. The path is rocky. Flip flops are refused entry.</li>
  <li>Sun protection: the gorge is shaded but the exit section is exposed</li>
  <li>Snacks: no food available inside the gorge. Tavernas at Agia Roumeli after.</li>
  <li>Small backpack only. Leave heavy luggage at your accommodation.</li>
</ul>

<h2>The route</h2>
<p>The first 3 km descend steeply via wooden steps. Pace yourself. The middle section follows the riverbed, which requires hopping stones when water is flowing. The famous Iron Gates (Sideroportes) at km 12 are only 3.5 m wide. The last 2 km to Agia Roumeli are flat and exposed.</p>

<h2>Crowds</h2>
<p>July and August are brutal. 4,000-5,000 hikers per day. Start at 6:15 am if you go in peak season. May, June, and September are far more pleasant. The gorge is at its most dramatic in May when the river still flows.</p>

<h2>Closures</h2>
<p>The gorge closes during and after heavy rain due to flash flood risk. Check conditions at <strong>samaria.gr</strong> or call the forest service (2821067179) the day before. Closures happen unpredictably, even in peak season.</p>

<h2>The Cretan wild goat</h2>
<p>The kri-kri (Cretan ibex) lives in the gorge. You might spot one on the rocky slopes, especially early morning. Do not feed them.</p>

<p>Looking for other hikes in Crete? <a href="/en/hikes">Browse all trails on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>Les gorges de Samaria font 16 km de long, demandent 4 à 7 heures de marche et sont ouvertes de mai à octobre environ. C'est l'une des gorges les plus longues d'Europe, avec près d'un million de randonneurs par an. Voici tout ce qu'il faut savoir avant de partir.</p>

<h2>Les essentiels</h2>
<ul>
  <li>Départ : Xyloskalo (1 230 m d'altitude), accessible en bus depuis La Canée ou Rethymnon</li>
  <li>Arrivée : village d'Agia Roumeli sur la côte sud</li>
  <li>Distance : 16 km en sens unique</li>
  <li>Dénivelé : environ 1 200 m de descente</li>
  <li>Durée : 4 à 7 heures selon la forme et l'affluence</li>
  <li>Entrée : 5 EUR (tarif 2025, vérifiez pour 2026)</li>
  <li>Saison : environ du 1er mai au 31 octobre</li>
</ul>

<h2>Accès et retour</h2>
<p>C'est une randonnée en sens unique. Il est interdit de revenir par le même chemin (règlement du parc). La logistique :</p>
<ul>
  <li>Bus depuis La Canée (gare routière Platia 1866) à Xyloskalo : départs à 6h15, 7h30, 8h30. Trajet 1h15. Environ 7 EUR.</li>
  <li>Depuis Agia Roumeli : ferry vers Hora Sfakion (30 min, environ 12 EUR) ou Paleochora, puis bus vers La Canée.</li>
  <li>Durée totale depuis La Canée : comptez une journée complète, 12 à 14 heures aller-retour.</li>
</ul>

<h2>Ce qu'il faut emporter</h2>
<ul>
  <li>Au minimum 2 litres d'eau. Des sources jalonnent le parcours, mais certaines se tarissent fin été.</li>
  <li>Chaussures de trail ou sandales solides. Le sentier est rocheux. Les tongs sont refusées à l'entrée.</li>
  <li>Protection solaire : les 2 derniers kilomètres sont exposés</li>
  <li>En-cas : aucune nourriture disponible dans les gorges. Tavernes à Agia Roumeli à l'arrivée.</li>
</ul>

<h2>Fermetures</h2>
<p>Les gorges ferment pendant et après de fortes pluies (risque de crues soudaines). Vérifiez les conditions sur <strong>samaria.gr</strong> ou appelez le service forestier (2821067179) la veille. Les fermetures sont imprévisibles, même en haute saison.</p>

<p>D'autres randonnées en Crète ? <a href="/fr/hikes">Consultez tous les sentiers sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "best-time-to-visit-crete",
    publishedAt: "2026-03-24",
    category: "travel",
    readTime: 6,
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80",
    title_en: "Best Time to Visit Crete: Month by Month Weather Guide",
    title_fr: "Meilleure période pour visiter la Crète : guide météo mois par mois",
    title_de: "Beste Reisezeit für Kreta: Monatlicher Wetterführer",
    title_el: "Καλύτερη εποχή για επίσκεψη στην Κρήτη: Μηνιαίος οδηγός καιρού",
    content_en: `
<p>Crete has 300+ days of sunshine per year. That does not mean every month is equal. Here is a month-by-month breakdown based on actual weather patterns, not marketing copy.</p>

<h2>January - February</h2>
<p>Coldest months. Coastal temperatures 12-15°C. Mountains see snow (White Mountains above 1,500 m are frequently snow-covered). Rain is possible. Most tourist infrastructure is closed. Prices are lowest of the year. If you want hiking without crowds and do not need to swim, this works.</p>

<h2>March</h2>
<p>Still unpredictable. Some warm days (18-20°C) mixed with rain. Wildflowers start. Good for driving the island and visiting archaeological sites without queues. Some beaches reopen their cantinas.</p>

<h2>April</h2>
<p>Spring peak. Average 20-22°C. Orange blossom, wildflowers everywhere. Hiking season opens. Sea still cool (17-18°C) but swimmable for the determined. Easter usually falls in April for Orthodox calendar -- villages hold large celebrations, some roads close for processions.</p>

<h2>May</h2>
<p>Arguably the best month. 24-26°C. Sea warming up (19-20°C). Samaria Gorge opens. Crowds starting but not yet overwhelming. Everything is green and blooming. Hotels book fast for weekends.</p>

<h2>June</h2>
<p>25-28°C. Sea at 22-23°C. Crowds building. Still manageable outside Elafonisi and Balos. Long daylight hours. Meltemi winds begin on the north coast -- can cause choppy seas and uncomfortable beach days.</p>

<h2>July - August</h2>
<p>Peak summer. 30-35°C inland, 27-29°C coastal. Sea 25-26°C. Crowds are at maximum: Elafonisi sees 3,000+ visitors per day. Meltemi winds blow consistently 5-6 Beaufort on the north coast. Popular sites have 1-2 hour queues. Book accommodation 3+ months ahead. Expensive.</p>

<h2>September</h2>
<p>Best month for a balance of everything. 26-28°C. Sea still warm (24-25°C). Crowds drop sharply after the first week. Prices fall 20-30% from peak. Samaria still open. This is the local favourite for holiday.</p>

<h2>October</h2>
<p>First rains possible from mid-month. 22-24°C. Sea 22-23°C. Still very swimmable. Archaeological sites are quieter. Some beach tavernas close by end of month. Good value.</p>

<h2>November - December</h2>
<p>Rainy season begins. 15-18°C. Olive harvest in progress (late October through December) -- interesting to witness in the villages. Most tourist businesses closed. Heraklion and Chania remain active year-round with their own life.</p>

<h2>Summary table</h2>
<ul>
  <li>Avoid crowds, cold is fine: January-February</li>
  <li>Hiking and culture: March-April</li>
  <li>Best all-round: May, September</li>
  <li>Full beach summer: June-August (book early)</li>
  <li>Quiet and warm: October</li>
</ul>

<p>Check today's actual weather across Crete: <a href="/en/weather">Live weather conditions on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>La Crète compte plus de 300 jours de soleil par an. Cela ne signifie pas que tous les mois se valent. Voici un bilan mois par mois basé sur les vrais schémas météo.</p>

<h2>Janvier - Février</h2>
<p>Mois les plus froids. Températures côtières de 12 à 15°C. Les montagnes reçoivent de la neige (les Montagnes Blanches au-dessus de 1 500 m). La pluie est possible. La plupart des infrastructures touristiques sont fermées. Les prix sont les plus bas de l'année.</p>

<h2>Mars - Avril</h2>
<p>Mars reste imprévisible. Avril est magnifique : 20-22°C, fleurs sauvages, sites archéologiques sans files d'attente. Pâques orthodoxe tombe souvent en avril -- célébrations importantes dans les villages.</p>

<h2>Mai</h2>
<p>Probablement le meilleur mois. 24-26°C. Mer qui se réchauffe (19-20°C). Ouverture des gorges de Samaria. Foules en hausse mais encore gérables. Tout est vert et fleuri.</p>

<h2>Juin</h2>
<p>25-28°C. Mer à 22-23°C. Les vents meltemi commencent sur la côte nord. Affluence croissante mais encore raisonnable en dehors des spots ultra-connus.</p>

<h2>Juillet - Août</h2>
<p>Haute saison. 30-35°C à l'intérieur. Mer à 25-26°C. Élafonissi reçoit 3 000+ visiteurs par jour. Cher, bondé, mais la mer est parfaite. Réservez 3 mois à l'avance.</p>

<h2>Septembre</h2>
<p>Le meilleur mois pour l'équilibre. 26-28°C. Mer toujours chaude (24-25°C). La foule chute nettement après la première semaine. Les prix baissent de 20-30%.</p>

<h2>Octobre</h2>
<p>Premières pluies possibles mi-mois. 22-24°C. Mer encore très agréable. Bon rapport qualité-prix. La récolte des olives est en cours dans les villages.</p>

<p>Consultez la météo en direct : <a href="/fr/weather">Conditions météo live sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "kastelli-airport-2028-crete-tourism",
    publishedAt: "2026-03-24",
    category: "news",
    readTime: 5,
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1200&q=80",
    title_en: "Kastelli Airport 2028: What It Means for Crete Tourism",
    title_fr: "Aéroport de Kastelli 2028 : ce que cela change pour le tourisme en Crète",
    title_de: "Flughafen Kastelli 2028: Was bedeutet das für den Kreta-Tourismus?",
    title_el: "Αεροδρόμιο Καστελλίου 2028: Τι σημαίνει για τον τουρισμό της Κρήτης",
    content_en: `
<p>Crete's new international airport at Kastelli, 25 km southeast of Heraklion, is scheduled to open in 2028. It is one of the largest infrastructure projects in Greece since the Athens Olympic preparations. Here is what is confirmed, what is projected, and what it likely means for travellers.</p>

<h2>What is being built</h2>
<p>The Kastelli International Airport (officially: New Heraklion International Airport) will replace the existing Heraklion Nikos Kazantzakis Airport, which is hemmed in by the city and cannot expand. The new site covers 3,200 hectares. Planned capacity: 18 million passengers per year at full build-out.</p>

<p>For comparison, current Heraklion airport handles about 9-10 million passengers per year and operates well above its designed capacity during peak season.</p>

<h2>Current status (as of early 2026)</h2>
<ul>
  <li>Construction is underway. Site clearance and foundation work visible from the Heraklion-Ierapetra highway.</li>
  <li>Contractor: GMR Airports consortium (Indian infrastructure group, same operator as Delhi International Airport).</li>
  <li>Target opening: 2028. This is the official date but Greek infrastructure projects frequently run late. Verify closer to the date.</li>
  <li>Old Heraklion airport: planned to close and be redeveloped as a coastal park/resort once Kastelli opens.</li>
</ul>

<h2>What it means for travellers</h2>
<p><strong>More direct flights.</strong> The current Heraklion airport cannot accommodate some large wide-body aircraft. A new facility with modern runways changes the route economics for airlines.</p>

<p><strong>Eastern Crete becomes more accessible.</strong> Kastelli is physically closer to the east of the island than Heraklion is. Drive times to Agios Nikolaos and Ierapetra will shorten by 15-20 minutes compared to flying into current Heraklion.</p>

<p><strong>Year-round connectivity.</strong> The new airport is designed for year-round operations, not just summer charters.</p>

<p><strong>Price impact.</strong> More seat capacity generally puts downward pressure on flight prices to Crete. How much depends on which airlines take routes.</p>

<h2>What it means for property and tourism businesses</h2>
<p>Eastern Crete is the logical growth area. The coast between Agios Nikolaos and Sitia is currently underdeveloped relative to the west. The BOAK highway (east-west motorway), partially open, connects to the new airport corridor. Property buyers and tourism operators are already pricing in this shift.</p>

<h2>What to watch</h2>
<p>The 2028 date is a target, not a guarantee. Check Greek infrastructure news sources closer to the date. If you are planning travel around the airport opening, keep flexibility in your bookings.</p>

<p>Stay updated on Crete news: <a href="/en/news">Latest from Crete Pulse</a>.</p>
`,
    content_fr: `
<p>Le nouvel aéroport international de Kastelli, à 25 km au sud-est d'Héraklion, est prévu pour 2028. C'est l'un des plus grands projets d'infrastructure en Grèce depuis les Jeux Olympiques d'Athènes. Voici ce qui est confirmé et ce que cela implique pour les voyageurs.</p>

<h2>Ce qui se construit</h2>
<p>L'aéroport international de Kastelli remplacera l'actuel aéroport Nikos Kazantzakis d'Héraklion, enclavé dans la ville et sans possibilité d'expansion. Le nouveau site couvre 3 200 hectares. Capacité prévue : 18 millions de passagers par an à pleine exploitation.</p>

<h2>État actuel (début 2026)</h2>
<ul>
  <li>Construction en cours. Les travaux de fondation sont visibles depuis l'axe Héraklion-Iérapetra.</li>
  <li>Opérateur : consortium GMR Airports (même groupe que l'aéroport international de Delhi).</li>
  <li>Ouverture cible : 2028. Date officielle, mais les projets grecs prennent souvent du retard. À vérifier en temps réel.</li>
  <li>L'ancien aéroport d'Héraklion sera transformé en parc côtier/complexe touristique.</li>
</ul>

<h2>Ce que cela change pour les voyageurs</h2>
<p>La Crète orientale devient plus accessible. Kastelli est physiquement plus proche de l'est de l'île. Les temps de trajet vers Agios Nikolaos et Iérapetra raccourciront de 15 à 20 minutes. Plus de vols directs attendus, et une connectivité toute l'année (pas seulement en charters d'été).</p>

<h2>À surveiller</h2>
<p>La date de 2028 est une cible, pas une garantie. Consultez les sources d'information grecques à l'approche de l'ouverture.</p>

<p>Suivez l'actualité crétoise : <a href="/fr/news">Dernières nouvelles sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "crete-road-trip-7-day-heraklion-to-sitia",
    publishedAt: "2026-03-24",
    category: "travel",
    readTime: 9,
    image: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=1200&q=80",
    title_en: "Crete Road Trip: 7-Day Itinerary from Heraklion to Sitia",
    title_fr: "Road trip en Crète : itinéraire 7 jours d'Héraklion à Sitia",
    title_de: "Kreta Roadtrip: 7-Tage-Reiseroute von Heraklion nach Sitia",
    title_el: "Road Trip στην Κρήτη: 7ήμερο δρομολόγιο από Ηράκλειο έως Σητεία",
    content_en: `
<p>Heraklion to Sitia is roughly 170 km by the coast road. With a week and a car, you can do it properly. This itinerary covers the highlights of central and eastern Crete without rushing.</p>

<p>Car rental: book in advance for summer. Expect 35-60 EUR/day for a small car. All major companies at Heraklion airport. An SUV or 4x4 is useful if you plan to reach remote beaches.</p>

<h2>Day 1: Heraklion</h2>
<p>Start in the capital. Must-see: the Archaeological Museum of Heraklion (best Minoan collection in the world, budget 2-3 hours). Walk the Venetian harbour wall. Eat lunch in the market street (Odos 1866). Drive to Knossos in the afternoon (4 km from centre) -- get there after 3pm to avoid the tour groups. Sleep Heraklion or Archanes (18 km south, quieter).</p>

<h2>Day 2: Lasithi Plateau and Agios Nikolaos</h2>
<p>Drive up to the Lasithi Plateau (altitude 840 m, 60 km from Heraklion). A flat agricultural plateau surrounded by mountains. Visit the Dikteon Cave (birthplace of Zeus in mythology, 8 km from the plateau center). Lunch in Tzermiado village. Descend via the spectacular road through Neapoli to Agios Nikolaos. Evening: walk the harbour, dinner at the lake.</p>

<h2>Day 3: Agios Nikolaos to Elounda and Spinalonga</h2>
<p>Elounda is 11 km north. Take the boat to Spinalonga Island (last active leper colony in Europe, closed 1957). Boats from Elounda pier, roughly every 30 min in season, about 15 EUR return. The island fortifications are Venetian; the colony history is well documented on site. Afternoon: swim at Voulisma Beach (4 km south of Elounda).</p>

<h2>Day 4: Ierapetra and south coast</h2>
<p>Drive south over the island (44 km, about 50 minutes). Ierapetra is Crete's southernmost town, Europe's southernmost city. Lunch: the seafront has solid fish tavernas. Afternoon: take the boat to Chrysi Island (uninhabited, cedar forest, turquoise water). Boats depart from Ierapetra port, roughly 8am-1pm depending on demand, 15 EUR return. Back for sunset. Sleep Ierapetra.</p>

<h2>Day 5: Makrigialos and east coast beaches</h2>
<p>Drive east along the coast road. Stop at Makrigialos (35 km, good beach, tavernas). Continue to Xerokambos (20 km further, remote coves). Detour inland to Ziros village for lunch (mountain food, no tourists). Return to coast, sleep Makrigialos or Palekastro.</p>

<h2>Day 6: Zakros and the Far East</h2>
<p>Kato Zakros (20 km south of Palekastro): Minoan palace ruins right on the beach. One of four palatial sites in Crete. The gorge trail behind the village is worth 2-3 hours if you have energy. Vai Palm Beach (15 km north): Europe's largest natural palm forest on a beach. Gets crowded by 10am; go early or late.</p>

<h2>Day 7: Sitia</h2>
<p>Sitia is 24 km west of Palekastro. Smaller and less touristy than Agios Nikolaos. Venetian fortress, archaeological museum, good fish market. The surrounding region produces some of Crete's best olive oil and Muscat wine (Sitia PDO). Drive the wine road east of town for tastings at local cooperatives.</p>

<h2>Practical notes</h2>
<ul>
  <li>Best season: May-June or September-October for this itinerary</li>
  <li>Petrol stations: scarce in the far east. Fill up in Sitia or Ierapetra before heading remote.</li>
  <li>The coastal road between Ierapetra and Makrigialos is narrow and winding. Not difficult but requires care after dark.</li>
  <li>Average daily budget (car + fuel + food + accommodation): 80-130 EUR/person for 2 people sharing</li>
</ul>

<p>Check beach and weather conditions for your driving days: <a href="/en/weather">Live conditions on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>D'Héraklion à Sitia, c'est environ 170 km par la route côtière. Avec une semaine et une voiture, vous pouvez le faire correctement. Cet itinéraire couvre les points forts de la Crète centrale et orientale sans précipitation.</p>

<h2>Jour 1 : Héraklion</h2>
<p>Commencez dans la capitale. Incontournables : le Musée Archéologique d'Héraklion (meilleure collection minoenne au monde, comptez 2-3 heures), la muraille du port vénitien, le marché de l'Odos 1866. Knossos en fin d'après-midi (4 km du centre) -- arrivez après 15h pour éviter les groupes.</p>

<h2>Jour 2 : Plateau du Lassithi et Agios Nikolaos</h2>
<p>Route vers le plateau du Lassithi (840 m d'altitude, 60 km d'Héraklion). Visitez la grotte dictéenne, déjeunez à Tzermiado, descendez vers Agios Nikolaos via Néapolis.</p>

<h2>Jour 3 : Élounda et Spinalonga</h2>
<p>Élounda est à 11 km au nord. Bateau pour l'île de Spinalonga (dernier lazaret actif d'Europe, fermé en 1957). Bateaux depuis le quai d'Élounda, environ 15 EUR aller-retour. Après-midi : plage de Voulisma.</p>

<h2>Jour 4 : Iérapetra et côte sud</h2>
<p>Traversez l'île vers le sud (44 km, 50 minutes). Iérapetra, ville la plus méridionale d'Europe. Bateau vers l'île de Chrysi (non habitée, forêt de cèdres, eau turquoise). Départs depuis le port, environ 15 EUR.</p>

<h2>Jour 5 : Makrigialos et les criques de l'est</h2>
<p>Route vers l'est : Makrigialos (bonne plage), Xerokambos (criques isolées), détour vers le village de montagne de Ziros pour déjeuner.</p>

<h2>Jour 6 : Zakros et l'extrême est</h2>
<p>Kato Zakros : ruines du palais minoen sur la plage. Vaï : la plus grande forêt naturelle de palmiers d'Europe, sur une plage. Arrivez tôt.</p>

<h2>Jour 7 : Sitia</h2>
<p>Ville moins touristique qu'Agios Nikolaos, forteresse vénitienne, bon marché au poisson, huile d'olive et vin muscat locaux réputés.</p>

<p>Consultez les conditions météo pour vos trajets : <a href="/fr/weather">Conditions live sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "greek-food-crete-dishes-to-try",
    publishedAt: "2026-03-24",
    category: "food",
    readTime: 6,
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80",
    title_en: "Greek Food in Crete: 15 Dishes You Must Try",
    title_fr: "Cuisine grecque en Crète : 15 plats à ne pas manquer",
    title_de: "Griechisches Essen auf Kreta: 15 Gerichte, die Sie probieren müssen",
    title_el: "Ελληνική κουζίνα στην Κρήτη: 15 πιάτα που πρέπει να δοκιμάσετε",
    content_en: `
<p>Cretan food is not the same as generic "Greek food". The island has its own culinary tradition, shaped by Minoan, Venetian, and Ottoman influences. A few things to know upfront: portions are large, olive oil is used generously, and the best tavernas are rarely on the main tourist strip.</p>

<h2>Cretan-specific dishes</h2>

<h2>1. Dakos</h2>
<p>Barley rusk (paximadi) soaked in water, topped with crushed tomatoes, feta or mizithra cheese, olive oil, and oregano. Simple, everywhere, never gets old. Order it as a starter in any taverna.</p>

<h2>2. Apaki</h2>
<p>Smoked pork marinated in vinegar and herbs. Specific to Crete. Served cold as mezze or hot as a main with eggs. Buy it vacuum-packed to take home.</p>

<h2>3. Staka</h2>
<p>Rendered sheep's butter cream, very rich, typically served with eggs or as a dip. Found mainly in mountain villages and traditional tavernas, not tourist restaurants.</p>

<h2>4. Mizithra</h2>
<p>Fresh Cretan whey cheese. Mild, slightly grainy, used in dakos, pastries, and eaten on its own with honey. Different from the aged version (anthotyros).</p>

<h2>5. Boureki</h2>
<p>Zucchini and potato pie layered with mizithra and mint. A Chania specialty. Best from bakeries in the old town, not restaurants.</p>

<h2>6. Gamopilafo</h2>
<p>Wedding rice: arborio-style rice cooked in lamb or goat broth with staka. Only made for celebrations in some areas, but you can find it year-round in Rethymno-area tavernas.</p>

<h2>Standard Greek dishes done well in Crete</h2>

<h2>7. Grilled octopus</h2>
<p>Drying on the line outside tavernas is the sign you are in the right place. Order it with lemon and olive oil, not sauce.</p>

<h2>8. Lamb chops (paidakia)</h2>
<p>Cretan lamb is mountain-raised and leaner than what you get elsewhere. Best in April-May (post-Easter) when spring lambs are in season.</p>

<h2>9. Horta</h2>
<p>Boiled wild greens with lemon and olive oil. Dozens of varieties, changes by season. A side dish everywhere, free in traditional places.</p>

<h2>10. Saganaki</h2>
<p>Fried cheese (graviera in Crete, not feta). Graviera is the local hard cheese, mild and slightly sweet. Much better than the tourist version with flaming brandy.</p>

<h2>11. Kalitsounia</h2>
<p>Small pastry pockets filled with mizithra and herbs, or sweetened with honey. Both savoury and sweet versions exist. Good from bakeries for breakfast.</p>

<h2>12. Snails (chochlioi)</h2>
<p>Cretan specialty. Cooked with rosemary and vinegar (boubouristi method) or in sauce. Not everywhere, but ask. Some tavernas in the interior serve them fried in olive oil.</p>

<h2>13. Fresh grilled fish</h2>
<p>Order by weight from the ice display. Common options: tsipoura (sea bream), lavraki (sea bass), barbounia (red mullet). Check the price per kilo before ordering -- it varies widely.</p>

<h2>14. Honey</h2>
<p>Cretan thyme honey is internationally recognised. Buy from roadside producers. Darker colour usually means stronger flavour.</p>

<h2>15. Raki (tsikoudia)</h2>
<p>Clear spirit distilled from grape marc. Served free at the end of meals in traditional tavernas. High alcohol content (38-45%). Sip it, do not shoot it.</p>

<h2>Where to eat well</h2>
<p>Look for places where the menu is handwritten on a chalkboard, where the owner works the floor, and where Greek is spoken at most tables. Avoid laminated 20-page menus with photos of every dish. The tourist strip in every resort exists because it is convenient, not because it is good.</p>

<p>Find food places near you: <a href="/en/food">Tavernas and restaurants on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>La cuisine crétoise n'est pas la même chose que la "cuisine grecque" générique. L'île a sa propre tradition culinaire, façonnée par les influences minoennes, vénitiennes et ottomanes. À savoir : les portions sont généreuses, l'huile d'olive omniprésente, et les meilleures tavernes sont rarement sur la rue piétonne touristique.</p>

<h2>Spécialités crétoises</h2>

<h2>1. Dakos</h2>
<p>Biscotte d'orge (paximadi) trempée, garnie de tomates écrasées, fromage mizithra ou feta, huile d'olive et origan. Simple, universel, jamais lassant.</p>

<h2>2. Apaki</h2>
<p>Porc fumé mariné au vinaigre et aux herbes. Spécifique à la Crète. Servi froid en mezze ou chaud avec des oeufs. À ramener sous vide.</p>

<h2>3. Mizithra</h2>
<p>Fromage crétois frais au petit-lait. Doux, légèrement granuleux, utilisé dans le dakos, les pâtisseries, ou nature avec du miel.</p>

<h2>4. Boureki</h2>
<p>Tourte aux courgettes et pommes de terre avec mizithra et menthe. Spécialité de La Canée. À acheter en boulangerie dans la vieille ville.</p>

<h2>5. Poulpe grillé</h2>
<p>Signe que vous êtes au bon endroit : il sèche sur un fil devant la taverne. Citron et huile d'olive, sans sauce.</p>

<h2>6. Côtelettes d'agneau (paidakia)</h2>
<p>L'agneau crétois est élevé en montagne et plus maigre qu'ailleurs. Meilleur en avril-mai après Pâques.</p>

<h2>7. Kalitsounia</h2>
<p>Petits chaussons fourrés à la mizithra et aux herbes, ou sucrés au miel. En boulangerie pour le petit-déjeuner.</p>

<h2>8. Escargots (chochlioi)</h2>
<p>Spécialité crétoise. Cuits au romarin et au vinaigre (méthode boubouristi) ou en sauce. Demandez dans les tavernes de l'intérieur.</p>

<h2>9. Miel de thym</h2>
<p>Le miel de thym crétois est reconnu internationalement. Achetez-le directement aux producteurs au bord des routes.</p>

<h2>10. Raki (tsikoudia)</h2>
<p>Eau-de-vie distillée de marc de raisin. Offert en fin de repas dans les tavernes traditionnelles. 38-45% d'alcool. À siroter.</p>

<p>Trouvez les bonnes adresses : <a href="/fr/food">Tavernes et restaurants sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "living-in-crete-expat-pros-cons",
    publishedAt: "2026-03-24",
    category: "expat",
    readTime: 8,
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80",
    title_en: "Living in Crete as an Expat: Honest Pros and Cons",
    title_fr: "Vivre en Crète en tant qu'expatrié : avantages et inconvénients honnêtes",
    title_de: "Als Expat auf Kreta leben: Ehrliche Vor- und Nachteile",
    title_el: "Ζωή στην Κρήτη ως εκπατρισμένος: Τίμια πλεονεκτήματα και μειονεκτήματα",
    content_en: `
<p>Crete attracts expats from Northern Europe, the UK, Germany, France, and increasingly from North America. The island has real advantages but also real friction. Here is what people consistently report after 1+ years of living here.</p>

<h2>The actual pros</h2>

<h2>Cost of living</h2>
<p>Lower than most of Western Europe. A couple can live comfortably on 1,500-2,000 EUR/month if renting (not owning). Groceries from local markets are cheap. Eating out at local tavernas is cheap (12-18 EUR for a full meal with wine). Utilities are moderate. Healthcare costs depend on whether you are in the public or private system.</p>

<p>Property is affordable relative to comparable Mediterranean locations. Eastern Crete especially so -- a renovated village house within 5 km of the coast can be found for 80,000-150,000 EUR (check locally, prices move).</p>

<h2>Climate</h2>
<p>One of the best in Europe. Long, hot summers. Mild winters (coastal areas rarely below 10°C). Rain concentrated in November-February. Over 300 days of sunshine. This is a legitimate quality-of-life advantage, not just marketing.</p>

<h2>Food</h2>
<p>Fresh, local, excellent. Olive oil, fish, vegetables, dairy. If you cook at home, your diet will improve. Farmers markets in most towns. Growing your own is feasible even with a small plot.</p>

<h2>Pace of life</h2>
<p>Slower. Less commuting. More outdoor time. Many expats report significant reductions in stress levels within the first year. This is real but also requires adaptation if you are coming from a high-pace professional environment.</p>

<h2>Community</h2>
<p>Established expat communities in Chania, Agios Nikolaos, Elounda, and smaller pockets in the east. Facebook groups, organised social events. Cretan villages are generally welcoming to foreigners who make an effort to learn some Greek.</p>

<h2>The actual cons</h2>

<h2>Bureaucracy</h2>
<p>Greek bureaucracy is notorious and the reputation is earned. Registering as a resident, getting a tax number (AFM), opening a bank account, dealing with utilities -- all of these processes involve more steps, more in-person visits, and more patience than equivalent processes in Northern Europe. Hiring a local accountant (logistis) from day one is strongly advised.</p>

<h2>Language</h2>
<p>Greek is not easy. English is widely spoken in tourist areas but less so in government offices, hospitals, and rural villages. If you live outside the main tourist zones, Greek is necessary. Expect 2+ years before you are genuinely functional.</p>

<h2>Healthcare</h2>
<p>Public healthcare is accessible but under-resourced. Long wait times. Private clinics exist in all major towns and are reasonable (a GP visit is 40-60 EUR). For serious conditions, Heraklion University Hospital is the main reference but capacity is strained. Some expats maintain private health insurance. Dental care is good value.</p>

<h2>Seasonal isolation</h2>
<p>If you live in a tourist-dependent village, October to April can feel isolated. Restaurants close, services reduce, the foreign community shrinks. Some people find this peaceful; others find it claustrophobic. Worth testing with a long-term rental before buying.</p>

<h2>Internet and connectivity</h2>
<p>Variable. Heraklion and Chania have good fibre coverage. Rural areas can be 4G-only with patchy coverage. If you work remotely and need reliable connectivity, check the specific address before committing.</p>

<h2>EU citizen vs non-EU</h2>
<p>EU citizens have right of residence and can register at the local municipality (KEP). Non-EU citizens face more complex residency processes. Greece has a Golden Visa programme (property investment minimum, thresholds vary by region) but this is a legal matter -- get professional advice.</p>

<h2>Is it worth it?</h2>
<p>For people who want climate, outdoor lifestyle, lower cost, and genuine Mediterranean culture: yes, with realistic expectations. For people who need urban amenities, top-tier healthcare, or fast-paced professional environments: the friction is real. The most common mistake is moving based on a holiday experience. Test with 3-6 months of renting first.</p>

<p>Explore where to live: <a href="/en/villages">Villages across Crete on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>La Crète attire des expatriés d'Europe du Nord, du Royaume-Uni, d'Allemagne, de France et de plus en plus d'Amérique du Nord. L'île présente de vrais avantages mais aussi de vraies contraintes. Voici ce que les gens rapportent après 1+ an de vie ici.</p>

<h2>Les vrais avantages</h2>

<h2>Coût de la vie</h2>
<p>Inférieur à la plupart de l'Europe occidentale. Un couple peut vivre confortablement avec 1 500 à 2 000 EUR/mois en location. Courses au marché local pas chères. Repas dans une taverne locale : 12-18 EUR avec du vin.</p>

<h2>Climat</h2>
<p>L'un des meilleurs d'Europe. Étés longs et chauds. Hivers doux sur la côte (rarement en dessous de 10°C). Pluies concentrées de novembre à février. Plus de 300 jours de soleil par an.</p>

<h2>Alimentation</h2>
<p>Fraîche, locale, excellente. Huile d'olive, poisson, légumes, produits laitiers. Si vous cuisinez chez vous, votre alimentation s'améliorera.</p>

<h2>Les vrais inconvénients</h2>

<h2>Bureaucratie</h2>
<p>La bureaucratie grecque mérite sa réputation. S'enregistrer comme résident, obtenir un numéro fiscal (AFM), ouvrir un compte bancaire -- tout demande plus d'étapes et de patience. Faire appel à un comptable local (logistis) dès le départ est fortement recommandé.</p>

<h2>Langue</h2>
<p>Le grec n'est pas facile. L'anglais est parlé dans les zones touristiques, mais pas dans les administrations ni les villages ruraux. Comptez 2 ans minimum avant d'être vraiment fonctionnel.</p>

<h2>Santé</h2>
<p>Système public accessible mais sous-doté. Longs délais d'attente. Cliniques privées dans toutes les grandes villes : consultation chez un généraliste, 40-60 EUR. Les soins dentaires sont abordables.</p>

<h2>Isolement saisonnier</h2>
<p>Dans un village touristique, d'octobre à avril, la vie peut sembler isolée. Restaurants fermés, services réduits. À tester avec une location longue durée avant d'acheter.</p>

<p>Explorez où vivre : <a href="/fr/villages">Villages de Crète sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "elafonisi-vs-balos-which-beach",
    publishedAt: "2026-03-24",
    category: "beaches",
    readTime: 5,
    image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?w=1200&q=80",
    title_en: "Elafonisi vs Balos: Which Beach is Better?",
    title_fr: "Élafonissi vs Balos : quelle plage choisir ?",
    title_de: "Elafonisi vs. Balos: Welcher Strand ist besser?",
    title_el: "Ελαφονήσι vs Μπάλος: Ποια παραλία είναι καλύτερη;",
    content_en: `
<p>Both beaches are on the Chania peninsula in western Crete. Both are frequently cited as among the best in Europe. Both get extremely crowded in July and August. The comparison matters because they are 70 km apart and most people only have time for one.</p>

<h2>Elafonisi</h2>
<p><strong>Location:</strong> Southwest tip of Crete (35.2667°N, 23.5356°E), 75 km from Chania.<br>
<strong>Access:</strong> Paved road all the way. Car park (5 EUR in peak season). Buses from Chania in summer (check schedule locally).<br>
<strong>What it is:</strong> A pink-tinged sandy lagoon where a small island is accessible by wading through knee-deep water. The pink colour comes from crushed shells mixed with the sand.<br>
<strong>Water depth:</strong> Very shallow. The lagoon is 0.5-1.5 m deep for 200+ metres. Excellent for children and non-swimmers.<br>
<strong>Facilities:</strong> Multiple canteens, sunbeds, showers, toilets. Very developed by Cretan standards.<br>
<strong>Crowds:</strong> 3,000-5,000 visitors per day in August. The car park fills by 9am. Get there before 8:30am or after 5pm.<br>
<strong>Snorkeling:</strong> Limited. The lagoon is beautiful but shallow and sandy -- not much to see underwater.</p>

<h2>Balos</h2>
<p><strong>Location:</strong> Northwest tip of Crete (35.6003°N, 23.5661°E), 57 km from Chania.<br>
<strong>Access:</strong> Option 1: 9 km rough dirt track (4x4 recommended, standard cars manage slowly). Option 2: ferry from Kissamos port (about 26 EUR return, roughly 1.5 hours each way).<br>
<strong>What it is:</strong> A lagoon between two headlands, with a sandbar and shallow turquoise water. Views of the islets of Imeri Gramvousa (with a Venetian fortress).<br>
<strong>Water depth:</strong> Shallow lagoon section, deeper on the seaward side.<br>
<strong>Facilities:</strong> One canteen (limited). No sunbeds on the main beach. Toilets near the car park.<br>
<strong>Crowds:</strong> Also heavy in July-August but the walk from the car park (20 minutes, steep, no shade) filters out some visitors. Ferry passengers arrive in a group twice a day, creating temporary peaks.<br>
<strong>Snorkeling:</strong> Better than Elafonisi on the rocky sides of the lagoon.</p>

<h2>Head-to-head</h2>
<ul>
  <li><strong>With young children:</strong> Elafonisi. Shallow water, easy access, facilities.</li>
  <li><strong>For photos and scenery:</strong> Balos is marginally more dramatic from above (the walk down offers better views).</li>
  <li><strong>For a quieter experience:</strong> Neither in peak season. Both require early arrival. Balos has a slight edge because the walk deters some visitors.</li>
  <li><strong>If you hate driving:</strong> Balos ferry is a good option. Elafonisi bus works in summer.</li>
  <li><strong>Water quality:</strong> Both are exceptional. Both are EU Blue Flag certified most years.</li>
  <li><strong>Value for money:</strong> Elafonisi is free to enter. Balos dirt road costs nothing; the ferry is 26 EUR.</li>
</ul>

<h2>The honest answer</h2>
<p>Both are genuinely beautiful. Neither is overrated if you manage the crowds. If you can only do one and you have young children, go to Elafonisi. If you are fit and want a slightly wilder experience, do Balos by the dirt road at 7am before anyone else arrives.</p>

<p>Check today's conditions at both beaches: <a href="/en/beaches">Live beach conditions on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>Les deux plages se trouvent sur la péninsule de La Canée, à l'ouest de la Crète. Les deux sont régulièrement citées parmi les meilleures d'Europe. Les deux sont extrêmement bondées en juillet-août. La comparaison est utile car elles sont à 70 km l'une de l'autre.</p>

<h2>Élafonissi</h2>
<p><strong>Accès :</strong> Route goudronnée. Parking (5 EUR en haute saison). Bus depuis La Canée en été.<br>
<strong>Ce que c'est :</strong> Un lagon de sable rosé où une petite île est accessible en traversant une eau à genoux. La teinte rose vient des coquillages broyés mélangés au sable.<br>
<strong>Profondeur :</strong> Très peu profond (0,5-1,5 m sur 200+ mètres). Excellent pour les enfants.<br>
<strong>Infrastructures :</strong> Très développées : buvettes, parasols, douches, toilettes.<br>
<strong>Foule :</strong> 3 000 à 5 000 visiteurs par jour en août. Le parking est plein avant 9h.</p>

<h2>Balos</h2>
<p><strong>Accès :</strong> Option 1 : 9 km de piste (4x4 recommandé). Option 2 : ferry depuis Kissamos (environ 26 EUR aller-retour, 1h30 chaque trajet).<br>
<strong>Ce que c'est :</strong> Un lagon entre deux caps, avec vue sur les îlots de Gramvousa (forteresse vénitienne).<br>
<strong>Infrastructures :</strong> Une buvette, pas de parasols sur la plage principale, toilettes près du parking.<br>
<strong>La marche :</strong> 20 minutes depuis le parking, raide, sans ombre -- filtre une partie des visiteurs.</p>

<h2>Verdict</h2>
<ul>
  <li><strong>Avec de jeunes enfants :</strong> Élafonissi. Eau peu profonde, accès facile.</li>
  <li><strong>Pour les photos :</strong> Balos est légèrement plus spectaculaire vu d'en haut.</li>
  <li><strong>Pour plus de calme :</strong> Balos, de justesse, grâce à la marche qui filtre les visiteurs.</li>
  <li><strong>Qualité de l'eau :</strong> Exceptionnelle dans les deux cas.</li>
</ul>

<p>Vérifiez les conditions des plages : <a href="/fr/beaches">Conditions live sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "what-to-do-in-crete-when-it-rains",
    publishedAt: "2026-03-24",
    category: "travel",
    readTime: 5,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",
    title_en: "What to Do in Crete When It Rains",
    title_fr: "Que faire en Crète quand il pleut ?",
    title_de: "Was tun auf Kreta bei Regen?",
    title_el: "Τι να κάνετε στην Κρήτη όταν βρέχει",
    content_en: `
<p>It does rain in Crete. Most often November through March, but brief summer storms happen too. A rainy day does not have to mean a wasted day. Here is what actually works.</p>

<h2>Archaeological museums</h2>
<p><strong>Heraklion Archaeological Museum</strong>: The most important Minoan collection in the world. Frescoes from Knossos, the Phaistos Disc, the bull-leaping fresco. Budget 2-3 hours. Admission about 15 EUR (check locally). Open year-round, closed Mondays in low season.</p>

<p><strong>Chania Archaeological Museum</strong> (in a converted Venetian church, the Agios Fragkiskos): Smaller but excellent, Roman and Byzantine finds. About 4 EUR admission.</p>

<p><strong>Sitia Archaeological Museum</strong>: Minoan finds from the far east of the island, less visited, genuinely interesting. Free entry some Sundays.</p>

<h2>Minoan palaces (partial cover)</h2>
<p>Knossos is largely unroofed but the main palace areas are substantial ruins -- a rainy day actually reduces crowds significantly. Bring a waterproof jacket. Same logic applies to Phaistos (90 km from Heraklion, on a hilltop with views toward the Libyan Sea).</p>

<h2>Byzantine churches</h2>
<p>The Lasithi Plateau and the Amari Valley are dotted with small Byzantine chapels, many 13th-14th century, with well-preserved frescoes. Some are locked; ask at the local kafeneion for the key-holder. This is worth doing in any weather.</p>

<h2>Old towns</h2>
<p><strong>Chania old town</strong>: The Venetian harbour, covered market hall (Agora), leather goods street, and multiple small museums (Maritime Museum, Cretan House Folklore Museum). A full day itinerary just from the old town.</p>

<p><strong>Rethymno old town</strong>: Venetian Fortezza (partially covered), old town lanes, local shops. Good kafeneion culture.</p>

<h2>Cretan cuisine activities</h2>
<p>Several operators offer cooking classes year-round: olive oil tasting, traditional bread baking, Cretan cheese making. Prices vary (30-80 EUR per person). Search locally -- most are informal and not heavily marketed online.</p>

<h2>Wineries</h2>
<p>Crete has an underrated wine scene. Lyrarakis Winery (Alagni, 20 km from Heraklion), Douloufakis Winery (Dafnes), and Minos Palace Winery offer tastings. Most require an appointment in low season. The local Vidiano and Kotsifali grapes are worth knowing.</p>

<h2>Olive oil mills</h2>
<p>October through January is olive harvest and pressing season. Many mills welcome visitors informally. Ask your accommodation to point you to a local mill -- this is one of the more authentic agricultural experiences available.</p>

<h2>Caves</h2>
<p>Crete has hundreds of caves. Three are accessible as tourist sites:</p>
<ul>
  <li><strong>Dikteon Cave</strong> (Lasithi Plateau): mythological birthplace of Zeus, well lit, 250 steps down and back</li>
  <li><strong>Sfendoni Cave</strong> (Zoniana village, Rethymno): stalactites and stalagmites, guided tours</li>
  <li><strong>Melidoni Cave</strong> (Rethymno): historical significance (massacre site during Ottoman period), memorial chapel inside</li>
</ul>

<h2>Practical note</h2>
<p>Rain in Crete often comes in fronts of 1-2 days, not weeks. Check the 3-day forecast and plan accordingly. Summer storms typically clear within hours.</p>

<p>Live weather: <a href="/en/weather">Crete Pulse weather for all regions</a>.</p>
`,
    content_fr: `
<p>Il pleut en Crète. Surtout de novembre à mars, mais des orages estivaux rapides arrivent aussi. Un jour de pluie ne doit pas être une journée perdue.</p>

<h2>Musées archéologiques</h2>
<p><strong>Musée archéologique d'Héraklion :</strong> La plus importante collection minoenne au monde. Fresques de Knossos, le Disque de Phaistos. Comptez 2-3 heures. Environ 15 EUR. Fermé le lundi en basse saison.</p>

<p><strong>Musée archéologique de La Canée :</strong> Dans une église vénitienne reconvertie. Petit mais excellent, 4 EUR environ.</p>

<h2>Palais minoens</h2>
<p>Knossos est largement à ciel ouvert mais un jour de pluie réduit considérablement les foules. Emportez un imperméable. Même logique pour Phaistos (90 km d'Héraklion).</p>

<h2>Vieilles villes</h2>
<p><strong>La Canée :</strong> Port vénitien, halle couverte (Agora), rue du cuir, Musée Maritime. Une journée complète dans la seule vieille ville.</p>
<p><strong>Rethymnon :</strong> Fortezza vénitienne, ruelles de la vieille ville, bonne culture des kafeneions.</p>

<h2>Caves</h2>
<ul>
  <li><strong>Grotte dictéenne</strong> (Plateau du Lassithi) : lieu de naissance mythologique de Zeus, 250 marches</li>
  <li><strong>Grotte de Sfendoni</strong> (village de Zoniana) : stalactites et stalagmites, visites guidées</li>
  <li><strong>Grotte de Mélidoni</strong> (Rethymnon) : chapelle commémorative à l'intérieur</li>
</ul>

<h2>Domaines viticoles</h2>
<p>La Crète a une scène viticole sous-estimée. Lyrarakis (Alagni), Douloufakis (Dafnes). La plupart demandent un rendez-vous en basse saison. Les cépages locaux Vidiano et Kotsifali méritent d'être découverts.</p>

<p>Météo en direct : <a href="/fr/weather">Crete Pulse météo toutes régions</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
  {
    slug: "crete-with-kids-family-beaches-activities",
    publishedAt: "2026-03-24",
    category: "family",
    readTime: 6,
    image: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=1200&q=80",
    title_en: "Crete with Kids: Family-Friendly Beaches and Activities",
    title_fr: "La Crète avec des enfants : plages et activités en famille",
    title_de: "Kreta mit Kindern: Familienfreundliche Strände und Aktivitäten",
    title_el: "Κρήτη με παιδιά: Οικογενειακές παραλίες και δραστηριότητες",
    content_en: `
<p>Crete works well for families. The sea is warm, the food is good for picky eaters, and the island is large enough to keep different ages interested. Here is what actually works for families with children.</p>

<h2>Best beaches for kids</h2>

<h2>Elafonisi (west Crete)</h2>
<p>The shallow lagoon (knee to waist depth over a large area) makes it one of the safest beaches in Greece for young children. The pink sand is novel. The only downside is crowds in July-August. Arrive before 9am.</p>

<h2>Almyrida (Chania)</h2>
<p>A village beach 24 km east of Chania (35.4169°N, 24.2303°E). Sheltered bay, shallow sandy entry, tavernas right on the beach. Calm water even when other beaches are choppy. Family-friendly village atmosphere.</p>

<h2>Georgioupolis (Rethymno)</h2>
<p>Long sandy beach at the mouth of the Almyros River. A freshwater river runs alongside the beach -- children can alternate between river and sea. Organized facilities, calm water in the bay.</p>

<h2>Plaka Beach (Agios Nikolaos area)</h2>
<p>Village beach in the bay, facing Spinalonga Island. Shallow, calm, sandy. The village has traditional accommodation and tavernas. One of the best family bases in eastern Crete.</p>

<h2>Makrigialos (east Crete)</h2>
<p>Sandy beach with very gradual depth increase. Sheltered from north winds. Several family-friendly tavernas. Good base for exploring the far east of the island.</p>

<h2>Activities beyond the beach</h2>

<h2>Knossos</h2>
<p>The Minoan palace works for children who are interested in ruins. The labyrinth mythology (Minotaur, Theseus) is well-known enough to give narrative context. Audio guide available. The site is large but not exhausting. Combine with the Heraklion museum the day before or after.</p>

<h2>Aquariums and water parks</h2>
<p><strong>Cretaquarium</strong> (Gournes, 15 km east of Heraklion): One of the best in the Mediterranean. All Mediterranean species, large tanks, well presented. About 13 EUR adults, 7 EUR children. Budget 2 hours.</p>
<p><strong>Watercity Waterpark</strong> (near Heraklion): Large water park, suitable for ages 4+. Full day activity. Check opening dates -- usually May to October.</p>

<h2>Donkey trekking</h2>
<p>Several operators in the mountain villages offer 1-2 hour donkey treks through the hills. Informal, cheap (check locally), children love them. Ask at village kafeneions in the Lasithi area or Amari Valley.</p>

<h2>Boat trips</h2>
<p>Glass-bottom boats operate from Agios Nikolaos, Elounda, Malia, and Chania harbour. 1-2 hour trips, 10-15 EUR per person. Not the most rigorous wildlife watching, but children enjoy them.</p>

<h2>Chrysi Island day trip</h2>
<p>The uninhabited island 12 km south of Ierapetra has calm, shallow water and a cedar forest. Day trip by ferry from Ierapetra (about 15 EUR return, 45 minutes). No shade on the beach itself, bring sun protection.</p>

<h2>Practical notes for families</h2>
<ul>
  <li>July-August: extremely hot midday (35°C+). Schedule beach time before 11am and after 5pm. The 11am-5pm slot is for shaded activities or a long lunch.</li>
  <li>High chairs and children's menus: available in tourist-area restaurants but not always in traditional tavernas. Greek tavernas are generally very accommodating of children.</li>
  <li>Car seats: bring your own or book specifically with a rental company. Availability is not guaranteed.</li>
  <li>Pushchairs: old town cobblestones in Chania and Rethymno are difficult. A baby carrier is useful.</li>
  <li>Pharmacies: in every town. Doctors and clinics in all major centres. Heraklion has a children's hospital.</li>
</ul>

<p>Find family-friendly beaches near your location: <a href="/en/beaches">All beaches on Crete Pulse</a>.</p>
`,
    content_fr: `
<p>La Crète fonctionne bien pour les familles. La mer est chaude, la nourriture convient aux petits mangeurs sélectifs, et l'île est assez grande pour intéresser tous les âges.</p>

<h2>Meilleures plages pour les enfants</h2>

<h2>Élafonissi (ouest de la Crète)</h2>
<p>Le lagon peu profond (genou à taille sur une grande surface) en fait l'une des plages les plus sûres de Grèce pour les jeunes enfants. Le sable rose est insolite. Arrivez avant 9h pour éviter la foule en juillet-août.</p>

<h2>Almyrida (La Canée)</h2>
<p>Plage de village à 24 km à l'est de La Canée. Baie abritée, entrée sablonneuse peu profonde, tavernes sur la plage. Eau calme même quand d'autres plages sont agitées.</p>

<h2>Georgioupolis (Rethymnon)</h2>
<p>Longue plage de sable à l'embouchure de la rivière Almyros. Une rivière d'eau douce longe la plage -- les enfants alternent entre rivière et mer. Eau calme dans la baie.</p>

<h2>Makrigialos (est de la Crète)</h2>
<p>Plage de sable avec une profondeur très progressive. Abritée des vents du nord. Plusieurs tavernes familiales. Bonne base pour explorer l'est de l'île.</p>

<h2>Activités au-delà de la plage</h2>

<h2>Knossos</h2>
<p>Le palais minoen fonctionne bien avec les enfants qui connaissent le mythe du Minotaure. Audioguide disponible. Combinez avec le musée d'Héraklion la veille ou le lendemain.</p>

<h2>Cretaquarium</h2>
<p>À Gournes, 15 km à l'est d'Héraklion. L'un des meilleurs de Méditerranée. Toutes les espèces méditerranéennes, grands bassins. Environ 13 EUR adultes, 7 EUR enfants. Comptez 2 heures.</p>

<h2>Excursion à l'île de Chrysi</h2>
<p>Île inhabité à 12 km au sud d'Iérapetra. Eau calme et peu profonde, forêt de cèdres. Ferry depuis le port d'Iérapetra, environ 15 EUR aller-retour. Apportez protection solaire (peu d'ombre sur la plage).</p>

<h2>Notes pratiques</h2>
<ul>
  <li>Juillet-août : chaleur extrême à midi (35°C+). Plage avant 11h et après 17h.</li>
  <li>Sièges auto : apportez le vôtre ou réservez explicitement avec le loueur.</li>
  <li>Poussettes : les pavés des vieilles villes de La Canée et Rethymnon sont difficiles. Un porte-bébé est utile.</li>
  <li>Pharmacies : dans chaque ville. Médecins et cliniques dans tous les grands centres.</li>
</ul>

<p>Trouvez les plages familiales près de chez vous : <a href="/fr/beaches">Toutes les plages sur Crete Pulse</a>.</p>
`,
    content_de: "",
    content_el: "",
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getArticlesByCategory(category: string): Article[] {
  return articles.filter((a) => a.category === category);
}

export function getLocalizedArticleTitle(article: Article, locale: string): string {
  const key = `title_${locale}` as keyof Article;
  return (article[key] as string) || article.title_en;
}

export function getLocalizedArticleContent(article: Article, locale: string): string {
  const key = `content_${locale}` as keyof Article;
  return (article[key] as string) || article.content_en;
}
