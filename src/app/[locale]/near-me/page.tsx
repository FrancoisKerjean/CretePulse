// /near-me : hub géolocalisé "Autour de moi". Le serveur précharge
// cb_places / food / swim-today / bus et sérialise un payload minimal ;
// la géolocalisation et le tri par distance vivent dans l'île client
// (NearMeClient), la position ne quitte jamais le navigateur.
// Spec : docs/superpowers/specs/2026-06-12-near-me-design.md
import { Suspense } from "react";
import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { buildAlternates } from "@/lib/seo";
import { getAllCbPlaces } from "@/lib/cb-places";
import { getAllFoodPlaces } from "@/lib/food";
import { buildSwimToday } from "@/lib/swim-today";
import { loadLiveNetwork, type LiveNetwork } from "@/lib/bus-live";
import { buildStopGraph, type StopGraph } from "@/lib/stop-departures";
import { getLocalizedField, type Locale } from "@/lib/types";
import { nearMePageSchema } from "@/lib/schema";
import { JsonLd } from "@/components/JsonLd";
import {
  NearMeClient,
  type NearFood,
  type NearPlace,
  type NearSwim,
} from "@/components/near-me/NearMeClient";

// Aligné swim-today : la météo se rafraîchit toutes les 30 min.
export const revalidate = 1800;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";

const pickUiLoc = (l: string): Locale =>
  (["en", "fr", "de", "el"] as const).includes(l as Locale) ? (l as Locale) : "en";

const META: Record<string, { title: string; desc: string }> = {
  en: {
    title: "Near me in Crete — beaches, food, sights & buses around you",
    desc: "See what's around you right now in Crete: the calmest beach today, nearby tavernas, sights worth the detour and your next bus. Your location never leaves your browser.",
  },
  fr: {
    title: "Autour de moi en Crète — plages, restaurants, sites et bus à proximité",
    desc: "Voyez ce qui vous entoure en ce moment en Crète : la plage la plus calme aujourd'hui, les tavernes proches, les sites qui valent le détour et votre prochain bus. Votre position ne quitte jamais votre navigateur.",
  },
  de: {
    title: "In meiner Nähe auf Kreta — Strände, Essen, Sehenswürdigkeiten & Busse",
    desc: "Sehen Sie, was gerade um Sie herum auf Kreta ist: der ruhigste Strand heute, Tavernen in der Nähe, lohnende Sehenswürdigkeiten und Ihr nächster Bus. Ihr Standort verlässt nie Ihren Browser.",
  },
  el: {
    title: "Κοντά μου στην Κρήτη — παραλίες, φαγητό, αξιοθέατα & λεωφορεία γύρω σας",
    desc: "Δείτε τι υπάρχει γύρω σας αυτή τη στιγμή στην Κρήτη: η πιο ήρεμη παραλία σήμερα, κοντινές ταβέρνες, αξιοθέατα που αξίζουν και το επόμενο λεωφορείο σας. Η τοποθεσία σας δεν φεύγει ποτέ από το πρόγραμμα περιήγησής σας.",
  },
};

const L: Record<Locale, {
  h1: string;
  intro: string;
  linkSwim: string;
  linkBuses: string;
  linkExplore: string;
  breadcrumbHome: string;
  breadcrumbNearMe: string;
  faq: Array<{ q: string; a: string }>;
}> = {
  en: {
    h1: "What's around me in Crete",
    intro:
      "Turn on location and this page sorts the whole island by distance to you: the calmest beach right now from live wind data, tavernas and restaurants nearby, sights worth the detour, your nearest KTEL bus stop with today's departures and the closest weather station. Everything is computed in your browser — your position is never sent to any server. Not in Crete yet? Pick a town and explore from there.",
    linkSwim: "Where to swim today",
    linkBuses: "Bus timetables",
    linkExplore: "Interactive map",
    breadcrumbHome: "Home",
    breadcrumbNearMe: "Near me",
    faq: [
      {
        q: "How do I find the nearest beach in Crete?",
        a: "Tap “Show what's around me” on this page: your browser shares your position locally and we sort more than 180 beaches by distance, weighted by today's live wind, so you get the calmest water close to you.",
      },
      {
        q: "How does the location feature work?",
        a: "Geolocation runs entirely in your browser. Your position is never sent to our servers: the page loads the list of places once and the distance sorting happens on your device. You can also pick a town manually instead.",
      },
      {
        q: "Does this page work without an internet connection?",
        a: "You need a connection to load the page. Once loaded, the distance sorting works on your device; beach conditions and bus departures refresh every 30 minutes while you are online.",
      },
    ],
  },
  fr: {
    h1: "Autour de moi en Crète",
    intro:
      "Activez la localisation et cette page trie toute l'île par distance autour de vous : la plage la plus calme en ce moment d'après le vent en direct, les tavernes et restaurants proches, les sites qui valent le détour, votre arrêt de bus KTEL le plus proche avec les départs du jour et la station météo la plus proche. Tout est calculé dans votre navigateur : votre position n'est jamais envoyée à un serveur. Pas encore en Crète ? Choisissez une ville et explorez depuis là.",
    linkSwim: "Où se baigner aujourd'hui",
    linkBuses: "Horaires de bus",
    linkExplore: "Carte interactive",
    breadcrumbHome: "Accueil",
    breadcrumbNearMe: "Autour de moi",
    faq: [
      {
        q: "Comment trouver la plage la plus proche en Crète ?",
        a: "Touchez « Voir ce qu'il y a autour de moi » sur cette page : votre navigateur partage votre position localement et nous trions plus de 180 plages par distance, pondérée par le vent du jour, pour vous proposer l'eau la plus calme près de vous.",
      },
      {
        q: "Comment fonctionne la localisation ?",
        a: "La géolocalisation s'exécute entièrement dans votre navigateur. Votre position n'est jamais envoyée à nos serveurs : la page charge la liste des lieux une fois et le tri par distance se fait sur votre appareil. Vous pouvez aussi choisir une ville manuellement.",
      },
      {
        q: "Cette page fonctionne-t-elle sans connexion internet ?",
        a: "Une connexion est nécessaire pour charger la page. Une fois chargée, le tri par distance fonctionne sur votre appareil ; les conditions des plages et les départs de bus se rafraîchissent toutes les 30 minutes tant que vous êtes en ligne.",
      },
    ],
  },
  de: {
    h1: "Was ist in meiner Nähe auf Kreta",
    intro:
      "Aktivieren Sie den Standort und diese Seite sortiert die ganze Insel nach Entfernung zu Ihnen: der ruhigste Strand gerade jetzt anhand von Live-Winddaten, Tavernen und Restaurants in der Nähe, lohnende Sehenswürdigkeiten, Ihre nächste KTEL-Bushaltestelle mit den heutigen Abfahrten und die nächste Wetterstation. Alles wird in Ihrem Browser berechnet — Ihr Standort wird nie an einen Server gesendet. Noch nicht auf Kreta? Wählen Sie eine Stadt und erkunden Sie von dort aus.",
    linkSwim: "Wo heute baden",
    linkBuses: "Busfahrpläne",
    linkExplore: "Interaktive Karte",
    breadcrumbHome: "Startseite",
    breadcrumbNearMe: "In meiner Nähe",
    faq: [
      {
        q: "Wie finde ich den nächstgelegenen Strand auf Kreta?",
        a: "Tippen Sie auf dieser Seite auf „Zeigen, was um mich herum ist“: Ihr Browser teilt Ihre Position lokal und wir sortieren über 180 Strände nach Entfernung, gewichtet mit dem heutigen Live-Wind, damit Sie das ruhigste Wasser in Ihrer Nähe finden.",
      },
      {
        q: "Wie funktioniert die Standortfunktion?",
        a: "Die Geolokalisierung läuft vollständig in Ihrem Browser. Ihre Position wird nie an unsere Server gesendet: Die Seite lädt die Ortsliste einmal und die Sortierung nach Entfernung erfolgt auf Ihrem Gerät. Sie können stattdessen auch manuell eine Stadt wählen.",
      },
      {
        q: "Funktioniert diese Seite ohne Internetverbindung?",
        a: "Zum Laden der Seite ist eine Verbindung nötig. Danach funktioniert die Sortierung nach Entfernung auf Ihrem Gerät; Strandbedingungen und Busabfahrten aktualisieren sich alle 30 Minuten, solange Sie online sind.",
      },
    ],
  },
  el: {
    h1: "Τι υπάρχει κοντά μου στην Κρήτη",
    intro:
      "Ενεργοποιήστε την τοποθεσία και αυτή η σελίδα ταξινομεί όλο το νησί κατά απόσταση από εσάς: η πιο ήρεμη παραλία αυτή τη στιγμή με βάση τον άνεμο σε πραγματικό χρόνο, ταβέρνες και εστιατόρια κοντά, αξιοθέατα που αξίζουν, η πλησιέστερη στάση ΚΤΕΛ με τις σημερινές αναχωρήσεις και ο κοντινότερος μετεωρολογικός σταθμός. Όλα υπολογίζονται στο πρόγραμμα περιήγησής σας — η θέση σας δεν αποστέλλεται ποτέ σε διακομιστή. Δεν είστε ακόμα στην Κρήτη; Επιλέξτε μια πόλη και εξερευνήστε από εκεί.",
    linkSwim: "Πού για μπάνιο σήμερα",
    linkBuses: "Δρομολόγια λεωφορείων",
    linkExplore: "Διαδραστικός χάρτης",
    breadcrumbHome: "Αρχική",
    breadcrumbNearMe: "Κοντά μου",
    faq: [
      {
        q: "Πώς βρίσκω την πλησιέστερη παραλία στην Κρήτη;",
        a: "Πατήστε «Δείξε τι υπάρχει γύρω μου» σε αυτήν τη σελίδα: το πρόγραμμα περιήγησης μοιράζεται τη θέση σας τοπικά και ταξινομούμε πάνω από 180 παραλίες κατά απόσταση, σταθμισμένη με τον σημερινό άνεμο, ώστε να βρείτε τα πιο ήρεμα νερά κοντά σας.",
      },
      {
        q: "Πώς λειτουργεί ο εντοπισμός τοποθεσίας;",
        a: "Ο εντοπισμός εκτελείται εξ ολοκλήρου στο πρόγραμμα περιήγησής σας. Η θέση σας δεν αποστέλλεται ποτέ στους διακομιστές μας: η σελίδα φορτώνει τη λίστα των τοποθεσιών μία φορά και η ταξινόμηση κατά απόσταση γίνεται στη συσκευή σας. Μπορείτε επίσης να επιλέξετε μια πόλη χειροκίνητα.",
      },
      {
        q: "Λειτουργεί αυτή η σελίδα χωρίς σύνδεση στο διαδίκτυο;",
        a: "Χρειάζεστε σύνδεση για να φορτώσει η σελίδα. Μετά τη φόρτωση, η ταξινόμηση κατά απόσταση λειτουργεί στη συσκευή σας· οι συνθήκες των παραλιών και οι αναχωρήσεις λεωφορείων ανανεώνονται κάθε 30 λεπτά όσο είστε συνδεδεμένοι.",
      },
    ],
  },
};

export const dynamicParams = true;

export function generateStaticParams(): Array<{ locale: string }> {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const m = META[locale] || META.en;
  return {
    title: m.title,
    description: m.desc,
    alternates: buildAlternates(locale, "/near-me"),
    openGraph: {
      title: m.title,
      description: m.desc,
      url: `${BASE_URL}/${locale}/near-me`,
      type: "website",
    },
  };
}

export default async function NearMePage(
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  setRequestLocale(locale);
  const uiLoc = pickUiLoc(locale);
  const t = L[uiLoc];
  const m = META[locale] || META.en;

  const [placesRaw, foodRaw, swimRaw] = await Promise.all([
    getAllCbPlaces().catch(() => []),
    getAllFoodPlaces().catch(() => []),
    buildSwimToday().catch(() => null),
  ]);
  // ---- Sérialisation : payload minimal vers l'île client -------------------

  const places: NearPlace[] = placesRaw
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      place_type: p.place_type,
      lat: p.latitude!,
      lon: p.longitude!,
      rating: p.rating,
      photo: p.photos?.[0] ?? null,
    }));

  const food: NearFood[] = foodRaw
    .filter((f) => f.latitude != null && f.longitude != null)
    .map((f) => ({
      slug: f.slug,
      name: f.name,
      type: f.type,
      cuisine: f.cuisine,
      price_range: f.price_range,
      lat: f.latitude!,
      lon: f.longitude!,
      image: f.image_url,
    }));

  // scored est déjà trié par score décroissant : top 30.
  const swim: NearSwim | null = swimRaw
    ? {
        scored: swimRaw.scored.slice(0, 30).map((s) => ({
          slug: s.beach.slug,
          name: getLocalizedField(s.beach, "name", uiLoc),
          lat: s.beach.latitude,
          lon: s.beach.longitude,
          imageUrl: s.imageUrl,
          score: s.score,
          rating: s.rating,
          windCardinal: s.windCardinal,
          windSpeed: s.windSpeed,
        })),
        cities: swimRaw.cities.map((c) => ({
          name: c.name,
          lat: c.lat,
          lon: c.lng,
          temp: c.temp,
          windSpeed: c.windSpeed,
          seaTemp: c.seaTemp,
          waveHeight: c.waveHeight,
        })),
      }
    : null;

  // Réseau arrêt-centré (loadLiveNetwork = lignes + arrêts + routes à horaire).
  const emptyNetwork: LiveNetwork = { lines: new Map(), routes: [] };
  const network = await loadLiveNetwork().catch(() => emptyNetwork);
  const stopGraph: StopGraph = buildStopGraph(network);

  const schema = nearMePageSchema({
    locale,
    pageTitle: m.title,
    description: m.desc,
    faqItems: t.faq,
    breadcrumbLabels: { home: t.breadcrumbHome, nearMe: t.breadcrumbNearMe },
  });

  return (
    <main className="min-h-screen bg-surface">
      <JsonLd data={schema} />

      <div className="mx-auto max-w-5xl px-4 pt-10 pb-14">
        {/* Contenu statique SSR : la page n'est jamais vide pour Google */}
        <header className="mb-8">
          <h1 className="font-heading font-extrabold text-4xl md:text-[44px] leading-[1.08] tracking-tight text-text mb-3">
            {t.h1}
          </h1>
          <p className="text-[15.5px] text-text-muted leading-relaxed max-w-3xl m-0">
            {t.intro}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href={`/${locale}/beaches/today`}
              className="bg-white border border-border rounded-full px-4 py-2 text-[13px] font-heading font-bold text-sea no-underline hover:bg-stone transition-colors"
            >
              {t.linkSwim}
            </Link>
            <Link
              href={`/${locale}/buses`}
              className="bg-white border border-border rounded-full px-4 py-2 text-[13px] font-heading font-bold text-sea no-underline hover:bg-stone transition-colors"
            >
              {t.linkBuses}
            </Link>
            <Link
              href={`/${locale}/explore`}
              className="bg-white border border-border rounded-full px-4 py-2 text-[13px] font-heading font-bold text-sea no-underline hover:bg-stone transition-colors"
            >
              {t.linkExplore}
            </Link>
          </div>
        </header>

        {/* Île client : useSearchParams() exige un boundary Suspense (Next 16) */}
        <Suspense fallback={null}>
          <NearMeClient
            locale={locale}
            places={places}
            food={food}
            swim={swim}
            stopGraph={stopGraph}
          />
        </Suspense>

        {/* FAQ visible, miroir du JSON-LD FAQPage */}
        <section className="mt-12 space-y-3">
          {t.faq.map((f) => (
            <details key={f.q} className="card-base p-5">
              <summary className="font-heading font-bold text-text cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-text-muted">{f.a}</p>
            </details>
          ))}
        </section>
      </div>
    </main>
  );
}
