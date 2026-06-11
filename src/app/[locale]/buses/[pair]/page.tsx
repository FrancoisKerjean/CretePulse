import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Info, ExternalLink } from "lucide-react";
import { CiBus } from "@/components/icons";
import { buildAlternates } from "@/lib/seo";
import { getBusRoutes, getBusDestinations, latestScrapedAt } from "@/lib/buses";
import type { BusRoute } from "@/lib/buses";
import { eligiblePairs, pairRoutes, onwardPlaces, pairSlug, slugifyPlace } from "@/lib/bus-pairs";
import { TaxiCompare } from "@/components/TaxiCompare";
import { NextDeparture } from "@/components/NextDeparture";
import { TimeChips } from "@/components/TimeChips";
import { taxiFareRange } from "@/lib/taxi-fare";
import partnersData from "@/data/taxi-partners.json";
import type { Locale } from "@/lib/types";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://crete.direct";
const SUPPORTED: Locale[] = ["en", "fr", "de", "el"];

function pickUiLoc(l: string): Locale {
  return (SUPPORTED as string[]).includes(l) ? (l as Locale) : "en";
}

const T = {
  title: {
    en: (a: string, b: string) => `Bus ${a} ↔ ${b}: Timetable & Prices`,
    fr: (a: string, b: string) => `Bus ${a} ↔ ${b} : horaires & prix`,
    de: (a: string, b: string) => `Bus ${a} ↔ ${b}: Fahrplan & Preise`,
    el: (a: string, b: string) => `Λεωφορείο ${a} ↔ ${b}: Δρομολόγια & Τιμές`,
  },
  metaDesc: {
    en: (a: string, b: string) => `KTEL bus between ${a} and ${b}: departure times by day, ticket prices and journey duration, updated from the operators.`,
    fr: (a: string, b: string) => `Bus KTEL entre ${a} et ${b} : horaires de départ par jour, prix du billet et durée du trajet, mis à jour depuis les opérateurs.`,
    de: (a: string, b: string) => `KTEL-Bus zwischen ${a} und ${b}: Abfahrtszeiten nach Tag, Ticketpreise und Fahrtdauer, aktualisiert von den Betreibern.`,
    el: (a: string, b: string) => `Λεωφορείο ΚΤΕΛ ${a} – ${b}: ώρες αναχώρησης ανά ημέρα, τιμές εισιτηρίων και διάρκεια, ενημερωμένα από τους φορείς.`,
  },
  updatedOn: { en: "Updated on", fr: "Mis à jour le", de: "Aktualisiert am", el: "Ενημερώθηκε στις" },
  price: { en: "Price", fr: "Prix", de: "Preis", el: "Τιμή" },
  duration: { en: "Duration", fr: "Durée", de: "Dauer", el: "Διάρκεια" },
  frequency: { en: "Frequency", fr: "Fréquence", de: "Häufigkeit", el: "Συχνότητα" },
  indicative: { en: "indicative", fr: "indicatif", de: "Richtwert", el: "ενδεικτική" },
  atTicketOffice: {
    en: "fare at the ticket office", fr: "tarif au guichet",
    de: "Fahrpreis am Schalter", el: "εισιτήριο στο εκδοτήριο",
  },
  planCta: {
    en: "Plan this journey with dates", fr: "Préparer ce trajet avec une date",
    de: "Diese Fahrt mit Datum planen", el: "Σχεδιάστε τη διαδρομή με ημερομηνία",
  },
  onward: {
    en: "Direct buses onward from", fr: "Bus directs depuis",
    de: "Direkte Busse weiter ab", el: "Απευθείας λεωφορεία από",
  },
  allBuses: { en: "All bus routes", fr: "Toutes les lignes de bus", de: "Alle Buslinien", el: "Όλες οι γραμμές" },
  compare: {
    en: "Compare bus, car & taxi", fr: "Comparer bus, voiture, taxi",
    de: "Bus, Auto & Taxi vergleichen", el: "Σύγκριση λεωφορείου, αυτοκινήτου, ταξί",
  },
  whatToDo: { en: "What to do in", fr: "Que faire à", de: "Aktivitäten in", el: "Τι να κάνετε στο" },
  whereToStay: { en: "Where to stay", fr: "Où dormir", de: "Unterkünfte", el: "Πού να μείνετε" },
  noTimetable: {
    en: "Departure times not published yet · check the operator site.",
    fr: "Horaires non encore publiés · voir le site de l'opérateur.",
    de: "Abfahrtszeiten noch nicht veröffentlicht · Betreiberseite prüfen.",
    el: "Δεν έχουν δημοσιευτεί ώρες · δείτε τον φορέα.",
  },
  officialSchedule: { en: "Official schedule", fr: "Horaires officiels", de: "Offizieller Fahrplan", el: "Επίσημο πρόγραμμα" },
  disclaimer: {
    en: "Times follow the operators' seasonal timetables and may change. Always confirm on the official KTEL sites before travelling. Prices marked “indicative” are estimated from distance.",
    fr: "Les horaires suivent les calendriers saisonniers des opérateurs et peuvent changer. Vérifiez toujours sur les sites officiels KTEL avant de partir. Les prix « indicatifs » sont estimés à partir de la distance.",
    de: "Die Zeiten folgen den saisonalen Fahrplänen der Betreiber und können sich ändern. Immer auf den offiziellen KTEL-Seiten bestätigen. Mit „Richtwert“ markierte Preise sind aus der Entfernung geschätzt.",
    el: "Οι ώρες ακολουθούν τα εποχικά δρομολόγια των φορέων και μπορεί να αλλάξουν. Επιβεβαιώνετε πάντα στις επίσημες σελίδες ΚΤΕΛ. Οι «ενδεικτικές» τιμές εκτιμώνται από την απόσταση.",
  },
  faqPrice: {
    en: (a: string, b: string, p: string) => [`How much is the bus from ${a} to ${b}?`, `A one-way KTEL ticket from ${a} to ${b} costs ${p}.`],
    fr: (a: string, b: string, p: string) => [`Combien coûte le bus de ${a} à ${b} ?`, `Un billet KTEL aller simple de ${a} à ${b} coûte ${p}.`],
    de: (a: string, b: string, p: string) => [`Was kostet der Bus von ${a} nach ${b}?`, `Ein einfaches KTEL-Ticket von ${a} nach ${b} kostet ${p}.`],
    el: (a: string, b: string, p: string) => [`Πόσο κοστίζει το λεωφορείο από ${a} προς ${b};`, `Το απλό εισιτήριο ΚΤΕΛ από ${a} προς ${b} κοστίζει ${p}.`],
  },
  faqDuration: {
    en: (a: string, b: string, d: string) => [`How long is the bus ride from ${a} to ${b}?`, `The KTEL bus from ${a} to ${b} takes about ${d}.`],
    fr: (a: string, b: string, d: string) => [`Combien de temps dure le trajet en bus de ${a} à ${b} ?`, `Le bus KTEL de ${a} à ${b} met environ ${d}.`],
    de: (a: string, b: string, d: string) => [`Wie lange dauert die Busfahrt von ${a} nach ${b}?`, `Der KTEL-Bus von ${a} nach ${b} braucht etwa ${d}.`],
    el: (a: string, b: string, d: string) => [`Πόση ώρα είναι η διαδρομή από ${a} προς ${b};`, `Το ΚΤΕΛ από ${a} προς ${b} κάνει περίπου ${d}.`],
  },
  faqFirstLast: {
    en: (a: string, b: string, f: string, l: string) => [`What time is the first and last bus from ${a} to ${b}?`, `The first bus leaves ${a} at ${f} and the last at ${l} (varies by day of week and season).`],
    fr: (a: string, b: string, f: string, l: string) => [`À quelle heure partent le premier et le dernier bus de ${a} à ${b} ?`, `Le premier bus part de ${a} à ${f} et le dernier à ${l} (selon le jour de la semaine et la saison).`],
    de: (a: string, b: string, f: string, l: string) => [`Wann fährt der erste und letzte Bus von ${a} nach ${b}?`, `Der erste Bus fährt um ${f} ab ${a}, der letzte um ${l} (je nach Wochentag und Saison).`],
    el: (a: string, b: string, f: string, l: string) => [`Τι ώρα είναι το πρώτο και το τελευταίο λεωφορείο από ${a} προς ${b};`, `Το πρώτο φεύγει στις ${f} και το τελευταίο στις ${l} (ανάλογα με την ημέρα και την εποχή).`],
  },
  faqTaxi: {
    en: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `How much is a taxi from ${a} to ${b}?`,
      `A taxi from ${a} to ${b} costs around ${lo}–${hi} € at the official meter rate${bus ? `; the KTEL bus costs ${bus}` : ""}. Agree the fare before departure.`,
    ],
    fr: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `Combien coûte un taxi de ${a} à ${b} ?`,
      `Un taxi de ${a} à ${b} coûte environ ${lo}–${hi} € au compteur officiel${bus ? ` ; le bus KTEL coûte ${bus}` : ""}. Convenez du prix avant le départ.`,
    ],
    de: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `Was kostet ein Taxi von ${a} nach ${b}?`,
      `Ein Taxi von ${a} nach ${b} kostet etwa ${lo}–${hi} € zum offiziellen Taxameter-Tarif${bus ? `; der KTEL-Bus kostet ${bus}` : ""}. Preis vor Abfahrt vereinbaren.`,
    ],
    el: (a: string, b: string, lo: number, hi: number, bus: string | null) => [
      `Πόσο κοστίζει το ταξί από ${a} προς ${b};`,
      `Το ταξί από ${a} προς ${b} κοστίζει περίπου ${lo}–${hi} € με το επίσημο ταξίμετρο${bus ? `· το ΚΤΕΛ κοστίζει ${bus}` : ""}. Συμφωνήστε την τιμή πριν την αναχώρηση.`,
    ],
  },
} as const;

interface Params { locale: string; pair: string }

export async function generateStaticParams(): Promise<Params[]> {
  // 4 locales completes x paires ; les 18 autres locales du site en ISR
  // on-demand (fallback EN), pattern airbnb/[neighbourhood].
  const routes = await getBusRoutes();
  const pairs = eligiblePairs(routes);
  const out: Params[] = [];
  for (const locale of SUPPORTED) for (const p of pairs) out.push({ locale, pair: p.slug });
  return out;
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const routes = await getBusRoutes();
  const pr = pairRoutes(routes, pair);
  if (!pr) return {};
  const ui = pickUiLoc(locale);
  const title = `${T.title[ui](pr.pair.placeA, pr.pair.placeB)} | Crete Direct`;
  const description = T.metaDesc[ui](pr.pair.placeA, pr.pair.placeB);
  const url = `${BASE_URL}/${locale}/buses/${pair}`;
  return {
    title, description,
    alternates: buildAlternates(locale, `/buses/${pair}`),
    openGraph: { title, description, url, type: "website" },
  };
}

// Comparatif getting-around quand il existe (slugs en dur, mirror de la page).
const GETTING_AROUND = new Set([
  "heraklion-to-chania", "heraklion-to-rethymno",
  "heraklion-to-agios-nikolaos", "heraklion-to-sitia",
]);

// Mirror des generateStaticParams things-to-do / where-to-stay (cf BusesClient) :
// on ne rend un lien QUE si la cible existe -> jamais de 404.
const THINGS_TO_DO_SLUGS = new Set([
  "heraklion", "chania", "rethymno", "agios-nikolaos", "sitia",
  "ierapetra", "malia", "hersonissos", "elounda", "makrigialos",
]);
const WHERE_TO_STAY_SLUGS = new Set([
  "chania", "heraklion", "rethymno", "agios-nikolaos",
  "elounda", "plakias", "paleochora", "matala",
]);

function fmtPrice(r: BusRoute, ui: Locale): string | null {
  if (r.price_eur == null) return null;
  return `${r.price_eur.toFixed(2)} €${r.price_estimated ? ` (${T.indicative[ui]})` : ""}`;
}

function DirectionSection({ from, to, routes, ui }: {
  from: string; to: string; routes: BusRoute[]; ui: Locale;
}) {
  return (
    <section className="mb-6">
      {routes.length === 0 ? (
        <div className="bg-white rounded-[28px] px-7 py-6 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
          <h2 className="font-heading font-bold text-[21px] text-text m-0 mb-2 flex items-center gap-2.5 flex-wrap">
            <span className="bg-sky rounded-xl p-1.5 inline-flex text-aegean"><CiBus className="w-[18px] h-[18px]" /></span>
            {from} <span className="text-lagoon">·</span> {to}
          </h2>
          <p className="text-sm text-text-muted m-0">{T.noTimetable[ui]}</p>
        </div>
      ) : routes.map((r) => (
        <div key={r.id} className="bg-white rounded-[28px] px-7 py-6 shadow-[0_12px_32px_rgba(11,94,120,.10)] mb-5">
          <h2 className="font-heading font-bold text-[21px] text-text m-0 mb-3 flex items-center gap-2.5 flex-wrap">
            <span className="bg-sky rounded-xl p-1.5 inline-flex text-aegean"><CiBus className="w-[18px] h-[18px]" /></span>
            {from} <span className="text-lagoon">·</span> {to}
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm mb-2 font-data">
            {fmtPrice(r, ui) ? (
              <span className="font-semibold text-text">{fmtPrice(r, ui)} <span className="font-normal text-text-muted">{T.price[ui].toLowerCase()}</span></span>
            ) : (
              <span className="text-text-muted">{T.atTicketOffice[ui]}</span>
            )}
            {r.duration && (
              <span className="text-text">{r.duration} <span className="text-text-muted">{T.duration[ui].toLowerCase()}</span></span>
            )}
            {r.frequency && (
              <span className="text-text-muted">{r.frequency}</span>
            )}
          </div>
          <TimeChips route={r} locale={ui} />
          <a href={r.source_url} rel="nofollow noopener" target="_blank"
             className="inline-flex items-center gap-1 text-xs text-lagoon-deep font-bold hover:underline mt-3">
            {T.officialSchedule[ui]} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ))}
    </section>
  );
}

export default async function BusPairPage({ params }: { params: Promise<Params> }) {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const ui = pickUiLoc(locale);
  const [routes, destinations] = await Promise.all([getBusRoutes(), getBusDestinations()]);
  const pr = pairRoutes(routes, pair);
  if (!pr) notFound();
  const { placeA, placeB } = pr.pair;
  const updatedAt = latestScrapedAt([...pr.outbound, ...pr.inbound]);

  // FAQ data-driven : uniquement les questions dont on a la donnee.
  const ref = pr.outbound[0] ?? pr.inbound[0];
  const faq: Array<[string, string]> = [];
  if (ref?.price_eur != null) {
    const p = `${ref.price_eur.toFixed(2)} €${ref.price_estimated ? ` (${T.indicative[ui]})` : ""}`;
    faq.push(T.faqPrice[ui](placeA, placeB, p) as [string, string]);
  }
  if (ref?.duration) faq.push(T.faqDuration[ui](placeA, placeB, ref.duration) as [string, string]);
  const deps = pr.outbound[0]?.departures ?? [];
  if (deps.length > 1) {
    faq.push(T.faqFirstLast[ui](placeA, placeB, deps[0], deps[deps.length - 1]) as [string, string]);
  }
  const sa = slugifyPlace(placeA)!;
  const sb = slugifyPlace(placeB)!;
  const taxiFare = taxiFareRange(sa, sb);
  if (taxiFare) {
    const busP = ref?.price_eur != null ? `${ref.price_eur.toFixed(2)} €` : null;
    faq.push(T.faqTaxi[ui](placeA, placeB, taxiFare.low, taxiFare.high, busP) as [string, string]);
  }

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/${locale}` },
          { "@type": "ListItem", position: 2, name: "Buses", item: `${BASE_URL}/${locale}/buses` },
          { "@type": "ListItem", position: 3, name: `${placeA} ↔ ${placeB}`, item: `${BASE_URL}/${locale}/buses/${pair}` },
        ],
      },
      ...(faq.length > 0 ? [{
        "@type": "FAQPage",
        mainEntity: faq.map(([q, a]) => ({
          "@type": "Question", name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }] : []),
    ],
  };

  const onwardB = onwardPlaces(routes, placeB, placeA).slice(0, 8);
  const destB = destinations[slugifyPlace(placeB) ?? ""];
  const ttd = destB?.things_to_do_slug && THINGS_TO_DO_SLUGS.has(destB.things_to_do_slug)
    ? destB.things_to_do_slug : null;
  const wts = destB?.where_to_stay_slug && WHERE_TO_STAY_SLUGS.has(destB.where_to_stay_slug)
    ? destB.where_to_stay_slug : null;

  return (
    <main className="min-h-screen bg-surface">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* En-tete trajet : gradient doux (docs/design/kalimera/bus.html .route-hero) */}
      <header className="-mt-[74px] pt-28 pb-7 bg-gradient-to-b from-sky via-[#D8F4F9] to-surface">
        <div className="max-w-3xl mx-auto px-4">
          <Link href={`/${locale}/buses`}
                className="inline-flex items-center text-[12.5px] text-lagoon-deep font-bold bg-white/70 rounded-full px-3.5 py-1.5 no-underline mb-4 hover:bg-white transition-colors">
            {T.allBuses[ui]}
          </Link>
          <h1 className="flex items-center gap-4 flex-wrap font-heading font-extrabold text-3xl md:text-[42px] tracking-tight text-text m-0">
            <span>{placeA}</span>
            <span className="bg-white rounded-full w-11 h-11 flex items-center justify-center text-lagoon-deep text-[19px] shadow-[0_8px_22px_rgba(11,94,120,.16)]" aria-hidden>⇄</span>
            <span>{placeB}</span>
          </h1>
          {ref && (
            <div className="mt-4">
              <NextDeparture route={ref} locale={ui} />
            </div>
          )}
          <div className="flex flex-wrap gap-2.5 mt-4 font-data">
            {ref?.price_eur != null && (
              <span className="bg-white rounded-2xl px-4 py-2 text-[13px] font-bold shadow-[0_8px_22px_rgba(11,94,120,.10)]">
                {ref.price_eur.toFixed(2)} € <span className="text-text-muted font-medium">{ref.price_estimated ? T.indicative[ui] : T.price[ui].toLowerCase()}</span>
              </span>
            )}
            {ref?.duration && (
              <span className="bg-white rounded-2xl px-4 py-2 text-[13px] font-bold shadow-[0_8px_22px_rgba(11,94,120,.10)]">
                {ref.duration} <span className="text-text-muted font-medium">{T.duration[ui].toLowerCase()}</span>
              </span>
            )}
            {ref?.frequency && (
              <span className="bg-white rounded-2xl px-4 py-2 text-[13px] font-bold shadow-[0_8px_22px_rgba(11,94,120,.10)]">
                {ref.frequency}
              </span>
            )}
            <Link
              href={`/${locale}/buses?from=${encodeURIComponent(placeA)}&to=${encodeURIComponent(placeB)}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-sun text-text text-[13px] font-heading font-bold px-4 py-2 shadow-[0_8px_22px_rgba(11,94,120,.10)] no-underline hover:brightness-105 transition-all"
            >
              <CiBus className="w-4 h-4" /> {T.planCta[ui]}
            </Link>
          </div>
          {updatedAt && (
            <p className="text-xs text-text-muted mt-3 mb-0">
              {T.updatedOn[ui]} {new Date(updatedAt).toLocaleDateString(locale)}
            </p>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-6 pb-12">
        <DirectionSection from={placeA} to={placeB} routes={pr.outbound} ui={ui} />
        <DirectionSection from={placeB} to={placeA} routes={pr.inbound} ui={ui} />

        {taxiFare && (
          <TaxiCompare
            locale={ui}
            slugA={sa}
            slugB={sb}
            pairSlug={pair}
            busPriceEur={ref?.price_eur ?? null}
            partnersData={partnersData}
            compact={false}
          />
        )}

        {onwardB.length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading font-extrabold text-2xl text-text mb-3.5">{T.onward[ui]} {placeB}</h2>
            <div className="flex flex-wrap gap-2.5">
              {onwardB.map((p) => {
                const s = pairSlug(placeB, p);
                return s ? (
                  <Link key={p} href={`/${locale}/buses/${s}`}
                        className="px-4.5 py-2.5 rounded-full bg-white text-[13.5px] font-semibold text-aegean shadow-[0_8px_20px_rgba(11,94,120,.10)] no-underline hover:shadow-[0_10px_26px_rgba(11,94,120,.16)] transition-shadow">
                    {placeB} <span className="text-lagoon font-extrabold">·</span> {p}
                  </Link>
                ) : null;
              })}
            </div>
          </section>
        )}

        {(GETTING_AROUND.has(pair) || ttd || wts) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-8">
            {GETTING_AROUND.has(pair) && (
              <Link href={`/${locale}/getting-around/${pair}`} className="text-aegean hover:underline">
                {T.compare[ui]}
              </Link>
            )}
            {ttd && (
              <Link href={`/${locale}/things-to-do/${ttd}`} className="text-aegean hover:underline">
                {T.whatToDo[ui]} {destB!.name}
              </Link>
            )}
            {wts && (
              <Link href={`/${locale}/where-to-stay/${wts}`} className="text-aegean hover:underline">
                {T.whereToStay[ui]}
              </Link>
            )}
          </div>
        )}

        <div className="rounded-[20px] bg-sun/16 px-5.5 py-4 flex gap-3">
          <Info className="w-5 h-5 text-[#8A6A14] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#8A6A14] m-0">{T.disclaimer[ui]}</p>
        </div>
      </div>
    </main>
  );
}
