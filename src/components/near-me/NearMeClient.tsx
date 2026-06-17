"use client";

// Île client de /near-me : géolocalisation 100 % navigateur (la position ne
// quitte jamais l'appareil), tri par distance via nearestBy, 6 sections.
// Spec : docs/superpowers/specs/2026-06-12-near-me-design.md
import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { isOnCrete, nearestBy } from "@/lib/geo";
import { allPickups } from "@/lib/car-partners";
import { SLUG_COORDS } from "@/lib/taxi-fare";
import { stopDepartures, type StopGraph, type StopDeparture } from "@/lib/stop-departures";
import { athensNow } from "@/lib/athens-time";
import { CarPromo } from "@/components/car-rental/CarPromo";
import { useGeoPosition } from "@/components/geo/useGeoPosition";
import { PlacePicker } from "@/components/geo/PlacePicker";
import { CardThumb } from "@/components/CardThumb";
import { CiBus, CiCompass, CiFood, CiMark, CiSun, CiWave } from "@/components/icons";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string> }) => void;
  }
}

// ---- Types sérialisés par page.tsx (payload minimal) ----------------------

export interface NearPlace {
  slug: string;
  name: string;
  place_type: string;
  lat: number;
  lon: number;
  rating: number | null;
  photo: string | null;
}

export interface NearFood {
  slug: string;
  name: string;
  type: string;
  cuisine: string | null;
  price_range: string | null;
  lat: number;
  lon: number;
  image: string | null;
}

export interface NearSwimBeach {
  slug: string;
  name: string;
  lat: number;
  lon: number;
  imageUrl: string | null;
  score: number;
  rating: "calm" | "fair" | "exposed";
  windCardinal: string;
  windSpeed: number;
}

export interface NearStation {
  name: string;
  lat: number;
  lon: number;
  temp: number;
  windSpeed: number;
  seaTemp: number | null;
  waveHeight: number | null;
}

export interface NearSwim {
  scored: NearSwimBeach[];
  cities: NearStation[];
}

// ---- i18n inline 4 langues, fallback EN (pattern JourneyPlanner) ----------

type Strings = {
  locate: string;
  trust: string;
  orPick: string;
  pickLabel: string;
  locating: string;
  denied: string;
  unavailable: string;
  notInCrete: string;
  aroundYou: string;
  changePlace: string;
  useMyLocation: string;
  beachOfDay: string;
  beachGuide: string;
  beachesNear: string;
  eatDrink: string;
  sights: string;
  busStop: string;
  allSchedules: string;
  weatherNear: string;
  wind: string;
  sea: string;
  waves: string;
  openExplore: string;
  toward: string;
  estimatedNote: string;
  counterFare: string;
  tomorrow: string;
  otherStops: string;
  rating: Record<"calm" | "fair" | "exposed", string>;
  foodType: Record<string, string>;
};

const T: Record<string, Strings> = {
  en: {
    locate: "Show what's around me",
    trust: "Your location never leaves your browser. Nothing is sent to any server.",
    orPick: "or pick a place",
    pickLabel: "Pick a place",
    locating: "Locating…",
    denied: "Location request was declined. Pick a place instead:",
    unavailable: "Location is not available on this device. Pick a place instead:",
    notInCrete: "You're not in Crete yet. Pick where you'll be staying:",
    aroundYou: "Around you",
    changePlace: "Change place",
    useMyLocation: "Use my location",
    beachOfDay: "Your beach for today",
    beachGuide: "Beach guide",
    beachesNear: "Beaches near you",
    eatDrink: "Eat & drink nearby",
    sights: "Worth the detour",
    busStop: "Your bus stop",
    allSchedules: "All schedules from here",
    weatherNear: "Weather near you",
    wind: "Wind",
    sea: "Sea",
    waves: "Waves",
    openExplore: "Open the interactive map",
    toward: "toward",
    estimatedNote: "Estimated from the timetable — no GPS.",
    counterFare: "at the counter",
    tomorrow: "tomorrow",
    otherStops: "Other stops nearby",
    rating: { calm: "calm", fair: "fair", exposed: "exposed" },
    foodType: { restaurant: "Restaurant", taverna: "Taverna", cafe: "Café", bar: "Bar", bakery: "Bakery", other: "Food" },
  },
  fr: {
    locate: "Voir ce qu'il y a autour de moi",
    trust: "Votre position ne quitte jamais votre navigateur. Rien n'est envoyé à aucun serveur.",
    orPick: "ou choisissez un lieu",
    pickLabel: "Choisir un lieu",
    locating: "Localisation…",
    denied: "Localisation refusée. Choisissez plutôt un lieu :",
    unavailable: "Localisation indisponible sur cet appareil. Choisissez plutôt un lieu :",
    notInCrete: "Vous n'êtes pas encore en Crète. Choisissez où vous séjournerez :",
    aroundYou: "Autour de vous",
    changePlace: "Changer de lieu",
    useMyLocation: "Utiliser ma position",
    beachOfDay: "Votre plage du jour",
    beachGuide: "Guide de la plage",
    beachesNear: "Plages proches de vous",
    eatDrink: "Manger et boire à proximité",
    sights: "Ça vaut le détour",
    busStop: "Votre arrêt de bus",
    allSchedules: "Tous les horaires d'ici",
    weatherNear: "Météo près de vous",
    wind: "Vent",
    sea: "Mer",
    waves: "Houle",
    openExplore: "Ouvrir la carte interactive",
    toward: "vers",
    estimatedNote: "Estimé d'après l'horaire — pas de GPS.",
    counterFare: "au guichet",
    tomorrow: "demain",
    otherStops: "Autres arrêts à proximité",
    rating: { calm: "calme", fair: "correct", exposed: "exposée" },
    foodType: { restaurant: "Restaurant", taverna: "Taverne", cafe: "Café", bar: "Bar", bakery: "Boulangerie", other: "Restauration" },
  },
  de: {
    locate: "Zeigen, was um mich herum ist",
    trust: "Ihr Standort verlässt nie Ihren Browser. Es wird nichts an einen Server gesendet.",
    orPick: "oder einen Ort wählen",
    pickLabel: "Ort wählen",
    locating: "Standort wird ermittelt…",
    denied: "Standortfreigabe abgelehnt. Wählen Sie stattdessen einen Ort:",
    unavailable: "Standort auf diesem Gerät nicht verfügbar. Wählen Sie einen Ort:",
    notInCrete: "Noch nicht auf Kreta? Wählen Sie, wo Sie wohnen werden:",
    aroundYou: "Um Sie herum",
    changePlace: "Ort wechseln",
    useMyLocation: "Meinen Standort verwenden",
    beachOfDay: "Ihr Strand für heute",
    beachGuide: "Strandguide",
    beachesNear: "Strände in Ihrer Nähe",
    eatDrink: "Essen & Trinken in der Nähe",
    sights: "Einen Abstecher wert",
    busStop: "Ihre Bushaltestelle",
    allSchedules: "Alle Fahrpläne ab hier",
    weatherNear: "Wetter in Ihrer Nähe",
    wind: "Wind",
    sea: "Meer",
    waves: "Wellen",
    openExplore: "Interaktive Karte öffnen",
    toward: "nach",
    estimatedNote: "Geschätzt nach Fahrplan — kein GPS.",
    counterFare: "am Schalter",
    tomorrow: "morgen",
    otherStops: "Weitere Haltestellen in der Nähe",
    rating: { calm: "ruhig", fair: "machbar", exposed: "exponiert" },
    foodType: { restaurant: "Restaurant", taverna: "Taverne", cafe: "Café", bar: "Bar", bakery: "Bäckerei", other: "Gastronomie" },
  },
  el: {
    locate: "Δείξε τι υπάρχει γύρω μου",
    trust: "Η τοποθεσία σας δεν φεύγει ποτέ από το πρόγραμμα περιήγησης. Τίποτα δεν αποστέλλεται σε διακομιστή.",
    orPick: "ή επιλέξτε ένα μέρος",
    pickLabel: "Επιλογή τοποθεσίας",
    locating: "Εντοπισμός…",
    denied: "Ο εντοπισμός απορρίφθηκε. Επιλέξτε ένα μέρος:",
    unavailable: "Ο εντοπισμός δεν είναι διαθέσιμος σε αυτήν τη συσκευή. Επιλέξτε ένα μέρος:",
    notInCrete: "Δεν είστε ακόμα στην Κρήτη; Επιλέξτε πού θα μείνετε:",
    aroundYou: "Γύρω σας",
    changePlace: "Αλλαγή τοποθεσίας",
    useMyLocation: "Χρήση της θέσης μου",
    beachOfDay: "Η παραλία σας για σήμερα",
    beachGuide: "Οδηγός παραλίας",
    beachesNear: "Παραλίες κοντά σας",
    eatDrink: "Φαγητό & ποτό κοντά",
    sights: "Αξίζουν την παράκαμψη",
    busStop: "Η στάση λεωφορείου σας",
    allSchedules: "Όλα τα δρομολόγια από εδώ",
    weatherNear: "Καιρός κοντά σας",
    wind: "Άνεμος",
    sea: "Θάλασσα",
    waves: "Κύμα",
    openExplore: "Άνοιγμα του διαδραστικού χάρτη",
    toward: "προς",
    estimatedNote: "Εκτίμηση βάσει δρομολογίου — χωρίς GPS.",
    counterFare: "στο ταμείο",
    tomorrow: "αύριο",
    otherStops: "Άλλες κοντινές στάσεις",
    rating: { calm: "ήρεμη", fair: "βατή", exposed: "εκτεθειμένη" },
    foodType: { restaurant: "Εστιατόριο", taverna: "Ταβέρνα", cafe: "Καφέ", bar: "Μπαρ", bakery: "Φούρνος", other: "Φαγητό" },
  },
};

// Types de lieux (sites hors plages) les plus fréquents, 4 langues.
const SIGHT_LABELS: Record<string, Record<string, string>> = {
  gorge: { en: "Gorge", fr: "Gorge", de: "Schlucht", el: "Φαράγγι" },
  cave: { en: "Cave", fr: "Grotte", de: "Höhle", el: "Σπήλαιο" },
  monastery: { en: "Monastery", fr: "Monastère", de: "Kloster", el: "Μοναστήρι" },
  museum: { en: "Museum", fr: "Musée", de: "Museum", el: "Μουσείο" },
  "archaeological-site": { en: "Archaeology", fr: "Archéologie", de: "Archäologie", el: "Αρχαιολογία" },
  "historical-site": { en: "History", fr: "Histoire", de: "Geschichte", el: "Ιστορία" },
  town: { en: "Town", fr: "Ville", de: "Stadt", el: "Πόλη" },
  island: { en: "Island", fr: "Île", de: "Insel", el: "Νησί" },
  lake: { en: "Lake", fr: "Lac", de: "See", el: "Λίμνη" },
  waterfall: { en: "Waterfall", fr: "Cascade", de: "Wasserfall", el: "Καταρράκτης" },
  fort: { en: "Fort", fr: "Fort", de: "Festung", el: "Φρούριο" },
  church: { en: "Church", fr: "Église", de: "Kirche", el: "Εκκλησία" },
  plateau: { en: "Plateau", fr: "Plateau", de: "Hochebene", el: "Οροπέδιο" },
  lighthouse: { en: "Lighthouse", fr: "Phare", de: "Leuchtturm", el: "Φάρος" },
  mountain: { en: "Mountain", fr: "Montagne", de: "Berg", el: "Βουνό" },
};

function sightLabel(type: string, locale: string): string {
  const hit = SIGHT_LABELS[type]?.[locale] ?? SIGHT_LABELS[type]?.en;
  if (hit) return hit;
  const pretty = type.replace(/-/g, " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

const PRICE_SYMBOL: Record<string, string> = { budget: "€", mid: "€€", upscale: "€€€" };

const RATING_CLASS: Record<"calm" | "fair" | "exposed", string> = {
  calm: "bg-[rgba(20,184,107,.13)] text-[#0B8A52]",
  fair: "bg-sun/20 text-[#8A6A14]",
  exposed: "bg-terra/15 text-[#B84B30]",
};

/** "X.X" sous 10 km, entier au-delà. */
function fmtKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-heading font-extrabold text-[22px] text-text mb-4">
      {icon}
      {children}
    </h2>
  );
}

export function NearMeClient({
  locale,
  places,
  food,
  swim,
  stopGraph,
}: {
  locale: string;
  places: NearPlace[];
  food: NearFood[];
  swim: NearSwim | null;
  stopGraph: StopGraph;
}) {
  const t = T[locale] || T.en;
  const sp = useSearchParams();
  const fromSlug = sp.get("from");
  const isQr = sp.get("utm_source") === "qr";

  const { status, pos, requestGeo, setManual } = useGeoPosition(fromSlug);
  const source = isQr ? "qr" : status === "granted" ? "geo" : "manual";

  const track = useCallback(
    (section: string) => {
      window.plausible?.("Near Me", { props: { source, section } });
    },
    [source],
  );

  // Event d'activation : une seule fois, quand la position arrive.
  const activated = useRef(false);
  useEffect(() => {
    if (pos && !activated.current) {
      activated.current = true;
      track("activate");
    }
  }, [pos, track]);

  const onCrete = pos ? isOnCrete(pos) : false;

  const sections = useMemo(() => {
    if (!pos || !isOnCrete(pos)) return null;
    const beaches = nearestBy(
      places.filter((p) => p.place_type === "beach"),
      (p) => [p.lat, p.lon], pos, 6,
    );
    const eat = nearestBy(food, (f) => [f.lat, f.lon], pos, 6);
    const sights = nearestBy(
      places.filter((p) => p.place_type !== "beach" && (p.rating ?? 0) >= 4),
      (p) => [p.lat, p.lon], pos, 6,
    );
    const now = athensNow();
    const tomorrowIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" })
      .format(new Date(Date.now() + 86_400_000));
    const ranked = nearestBy(stopGraph.stops, (s) => [s.lat, s.lng], pos, 12);
    const served = ranked
      .map((s) => ({ stop: s, deps: stopDepartures(stopGraph, s.slug, now, tomorrowIso) }))
      .filter((x) => x.deps.length > 0);
    const busStop = served[0] ?? null;
    const busAlts = served.slice(1, 3);

    let best: (NearSwimBeach & { km: number }) | null = null;
    let station: (NearStation & { km: number }) | null = null;
    if (swim) {
      // Plage du jour pondérée distance : score - min(40, km * 0.8), max.
      const scoredKm = nearestBy(swim.scored, (s) => [s.lat, s.lon], pos, swim.scored.length);
      let bestW = -Infinity;
      for (const s of scoredKm) {
        const w = s.score - Math.min(40, s.km * 0.8);
        if (w > bestW) { bestW = w; best = s; }
      }
      station = nearestBy(swim.cities, (c) => [c.lat, c.lon], pos, 1)[0] ?? null;
    }
    return { beaches, eat, sights, busStop, busAlts, best, station };
  }, [pos, places, food, swim, stopGraph]);

  // Encart partenaire location : pickup servi le plus proche si géolocalisé
  // sur l'île, sinon sans pickup (le wizard ouvre à l'étape 1).
  const carPickup = pos && onCrete
    ? nearestBy(
        allPickups().filter((p) => p.served),
        (p) => SLUG_COORDS[p.slug] ?? null,
        pos,
        1,
      )[0]?.slug
    : undefined;
  const carPromo = <CarPromo locale={locale} pickup={carPickup} source="near-me" />;

  // ---- Avant position : activation / fallback ------------------------------

  if (!pos) {
    return (
      <div className="card-base p-7 sm:p-10 text-center">
        <CiCompass className="w-12 h-12 text-aegean mx-auto" />
        {status === "prompting" ? (
          <p className="mt-5 inline-flex items-center gap-2.5 text-text font-heading font-bold">
            <span className="w-5 h-5 rounded-full border-2 border-aegean border-t-transparent animate-spin" aria-hidden />
            {t.locating}
          </p>
        ) : (
          <>
            <button
              onClick={requestGeo}
              className="mt-5 inline-flex items-center gap-2 bg-sun text-text rounded-full px-6 py-3 text-[15px] font-heading font-bold hover:brightness-105 transition-all"
            >
              <CiCompass className="w-5 h-5" /> {t.locate}
            </button>
            {(status === "denied" || status === "unavailable") && (
              <p className="mt-4 text-sm text-[#B84B30]">
                {status === "denied" ? t.denied : t.unavailable}
              </p>
            )}
          </>
        )}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <CiMark className="w-4 h-4 text-lagoon shrink-0" /> {t.trust}
        </p>
        <div className="mt-6 flex items-center gap-3 max-w-sm mx-auto">
          <span className="text-sm text-text-muted whitespace-nowrap">{t.orPick}</span>
          <PlacePicker value={null} onChange={setManual} label={t.pickLabel} />
        </div>
        {carPromo}
      </div>
    );
  }

  // ---- Position hors Crète : sélecteur manuel -------------------------------

  if (!onCrete) {
    return (
      <div className="card-base p-7 sm:p-10 text-center">
        <CiCompass className="w-12 h-12 text-aegean mx-auto" />
        <p className="mt-4 text-text font-heading font-bold">{t.notInCrete}</p>
        <div className="mt-5 max-w-sm mx-auto">
          <PlacePicker value={null} onChange={setManual} label={t.pickLabel} />
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-text-muted">
          <CiMark className="w-4 h-4 text-lagoon shrink-0" /> {t.trust}
        </p>
        {carPromo}
      </div>
    );
  }

  // ---- Sur l'île : 6 sections ----------------------------------------------

  return (
    <div className="space-y-10">
      {/* Barre d'état : source de la position + changement */}
      <div className="card-base px-5 py-3.5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 font-heading font-bold text-sm text-text">
          <CiCompass className="w-4.5 h-4.5 text-aegean" /> {t.aroundYou}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {status !== "granted" && (
            <button
              onClick={requestGeo}
              className="text-xs font-semibold text-aegean hover:underline whitespace-nowrap"
            >
              {t.useMyLocation}
            </button>
          )}
          <PlacePicker value={null} onChange={setManual} label={t.changePlace} />
        </div>
      </div>

      {/* 1. Ta plage du jour */}
      {sections?.best && (
        <section>
          <SectionTitle icon={<CiWave className="w-6 h-6 text-aegean" />}>{t.beachOfDay}</SectionTitle>
          <Link
            href={`/${locale}/beaches/${sections.best.slug}`}
            onClick={() => track("beach-of-day")}
            className="card-base overflow-hidden block no-underline sm:grid sm:grid-cols-2"
          >
            <CardThumb src={sections.best.imageUrl} alt={sections.best.name} />
            <div className="p-5 sm:p-6 flex flex-col justify-center gap-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="font-heading font-bold text-[21px] text-text m-0">{sections.best.name}</p>
                <span className={`rounded-full px-3 py-1 text-[11.5px] font-extrabold font-data ${RATING_CLASS[sections.best.rating]}`}>
                  ≈ {t.rating[sections.best.rating]}
                </span>
              </div>
              <p className="text-sm text-text-muted m-0 font-data">
                {t.wind} {sections.best.windCardinal} <b className="text-text">{sections.best.windSpeed} km/h</b>
                {" · "}
                <b className="text-text">{fmtKm(sections.best.km)} km</b>
              </p>
              <span className="text-sm font-bold text-lagoon-deep">{t.beachGuide}</span>
            </div>
          </Link>
        </section>
      )}

      {/* 2. Plages proches */}
      {sections && sections.beaches.length > 0 && (
        <section>
          <SectionTitle icon={<CiWave className="w-6 h-6 text-aegean" />}>{t.beachesNear}</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sections.beaches.map((p) => (
              <Link
                key={p.slug}
                href={`/${locale}/explore`}
                onClick={() => track("beaches")}
                className="card-base overflow-hidden block no-underline"
              >
                <CardThumb src={p.photo} alt={p.name} />
                <div className="p-3.5">
                  <p className="font-heading font-bold text-[15px] text-text truncate m-0">{p.name}</p>
                  <p className="text-xs text-text-muted m-0 mt-0.5 font-data">
                    {p.rating != null && p.rating > 0 ? `★ ${p.rating.toFixed(1)} · ` : ""}
                    {fmtKm(p.km)} km
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Manger et boire */}
      {sections && sections.eat.length > 0 && (
        <section>
          <SectionTitle icon={<CiFood className="w-6 h-6 text-aegean" />}>{t.eatDrink}</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sections.eat.map((f) => (
              <Link
                key={f.slug}
                href={`/${locale}/food/${f.slug}`}
                onClick={() => track("food")}
                className="card-base overflow-hidden block no-underline"
              >
                <CardThumb src={f.image} alt={f.name} category="guide" />
                <div className="p-3.5">
                  <p className="font-heading font-bold text-[15px] text-text truncate m-0">{f.name}</p>
                  <p className="text-xs text-text-muted m-0 mt-0.5 truncate">
                    {t.foodType[f.type] ?? t.foodType.other}
                    {f.cuisine ? ` · ${f.cuisine}` : ""}
                    {f.price_range && PRICE_SYMBOL[f.price_range] ? ` · ${PRICE_SYMBOL[f.price_range]}` : ""}
                  </p>
                  <p className="text-xs text-text-muted m-0 mt-0.5 font-data">{fmtKm(f.km)} km</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Ça vaut le détour */}
      {sections && sections.sights.length > 0 && (
        <section>
          <SectionTitle icon={<CiMark className="w-6 h-6 text-aegean" />}>{t.sights}</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sections.sights.map((p) => (
              <Link
                key={p.slug}
                href={`/${locale}/explore`}
                onClick={() => track("sights")}
                className="card-base overflow-hidden block no-underline"
              >
                <CardThumb src={p.photo} alt={p.name} category="guide" />
                <div className="p-3.5">
                  <p className="font-heading font-bold text-[15px] text-text truncate m-0">{p.name}</p>
                  <p className="text-xs text-text-muted m-0 mt-0.5">{sightLabel(p.place_type, locale)}</p>
                  <p className="text-xs text-text-muted m-0 mt-0.5 font-data">
                    {p.rating != null && p.rating > 0 ? `★ ${p.rating.toFixed(1)} · ` : ""}
                    {fmtKm(p.km)} km
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <Link
            href={`/${locale}/explore`}
            onClick={() => track("explore")}
            className="inline-block mt-4 text-sm font-bold text-lagoon-deep hover:underline"
          >
            {t.openExplore}
          </Link>
        </section>
      )}

      {/* 5. Ton arrêt de bus (arrêt-centré) */}
      {sections?.busStop && (
        <section>
          <SectionTitle icon={<CiBus className="w-6 h-6 text-aegean" />}>{t.busStop}</SectionTitle>
          <div className="card-base p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-heading font-bold text-lg text-text m-0">{sections.busStop.stop.name}</p>
              <span className="text-sm text-text-muted font-data">{fmtKm(sections.busStop.stop.km)} km</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 list-none p-0 m-0">
              {sections.busStop.deps.map((d: StopDeparture) => (
                <li key={`${d.destination}-${d.lineCode}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-text-muted">{t.toward}</span>
                  <span className="font-heading font-bold text-text">{d.destination}</span>
                  {d.durationKnown && d.nextTimes.length > 0 ? (
                    <span className="font-data text-text">
                      {d.isTomorrow ? `${t.tomorrow} ` : ""}~{d.nextTimes.join(" · ~")}
                    </span>
                  ) : (
                    <span className="text-text-muted italic">{t.counterFare}</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-text-muted">{t.estimatedNote}</p>
            <Link
              href={`/${locale}/buses?from=${encodeURIComponent(sections.busStop.stop.name)}`}
              onClick={() => track("bus")}
              className="inline-flex mt-4 bg-sun text-text rounded-full px-4 py-2 text-[13px] font-heading font-bold no-underline hover:brightness-105 transition-all"
            >
              {t.allSchedules}
            </Link>
            {sections.busAlts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[11px] uppercase tracking-wide text-text-muted mb-1.5">{t.otherStops}</p>
                <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0 font-data">
                  {sections.busAlts.map((alt) => (
                    <li key={alt.stop.slug}>
                      <Link
                        href={`/${locale}/buses?from=${encodeURIComponent(alt.stop.name)}`}
                        onClick={() => track("bus")}
                        className="px-2.5 py-1 rounded-[10px] bg-surface border-[1.5px] border-lagoon/35 text-xs font-semibold text-text no-underline"
                      >
                        {alt.stop.name} · {fmtKm(alt.stop.km)} km
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. Météo locale */}
      {sections?.station && (
        <section>
          <SectionTitle icon={<CiSun className="w-6 h-6 text-aegean" />}>{t.weatherNear}</SectionTitle>
          <div className="bg-night rounded-[32px] text-[#EAF7FA] px-7 py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-lagoon m-0">
                {sections.station.name}
              </p>
              <span className="text-xs text-[#EAF7FA]/50 font-data">{fmtKm(sections.station.km)} km</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 font-data">
              <span className="text-[34px] font-bold leading-none">{Math.round(sections.station.temp)}°</span>
              <span className="text-sm text-[#EAF7FA]/75">
                {t.wind} <b className="text-[#EAF7FA]">{sections.station.windSpeed} km/h</b>
              </span>
              {sections.station.waveHeight != null && (
                <span className="text-sm text-[#EAF7FA]/75">
                  {t.waves} <b className="text-[#EAF7FA]">{sections.station.waveHeight.toFixed(1)} m</b>
                </span>
              )}
              {sections.station.seaTemp != null && (
                <span className="text-sm text-[#EAF7FA]/75">
                  {t.sea} <b className="text-[#EAF7FA]">{Math.round(sections.station.seaTemp)}°C</b>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Encart partenaire location de voiture (pickup le plus proche servi) */}
      {carPromo}
    </div>
  );
}
