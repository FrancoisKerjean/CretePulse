// BusInCreteBox - bloc de liens internes vers les pages-trajet prioritaires,
// inséré sur les pages NEWS (les plus crawlées du site). Levier crawl-budget :
// fait découvrir/crawler les ~12 trajets à fort signal depuis des pages que
// Google visite souvent, pour les sortir du « Discovered - not indexed ».
// Server component : fetch bus_routes + priorityPairs (purs).

import { Bus } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { priorityPairs, type SeoRoute } from "@/lib/bus-seo";

type Loc = "en" | "fr" | "de" | "el";

const L: Record<Loc, { heading: string; connector: string }> = {
  en: { heading: "Getting around Crete by bus", connector: "to" },
  fr: { heading: "Se déplacer en Crète en bus", connector: "à" },
  de: { heading: "Mit dem Bus durch Kreta", connector: "nach" },
  el: { heading: "Μετακινήσεις στην Κρήτη με λεωφορείο", connector: "προς" },
};

function pickLoc(locale: string): Loc {
  return (["en", "fr", "de", "el"] as const).includes(locale as Loc)
    ? (locale as Loc)
    : "en";
}

/** Affiche les liens-trajet prioritaires. `locale` = locale serveur. */
export async function BusInCreteBox({ locale }: { locale: string }) {
  const loc = pickLoc(locale);
  const t = L[loc];

  const { data } = await supabase
    .from("bus_routes")
    .select("from_place,to_place,departures");
  const pairs = priorityPairs((data ?? []) as SeoRoute[]).slice(0, 12);
  if (pairs.length === 0) return null;

  return (
    <section
      aria-labelledby="bus-in-crete-heading"
      className="mt-10 mb-8 p-6 rounded-2xl border border-aegean/15 bg-aegean/5"
    >
      <div className="flex items-center gap-3 mb-4">
        <Bus className="w-5 h-5 text-aegean" aria-hidden="true" />
        <h2 id="bus-in-crete-heading" className="text-xl font-bold text-aegean m-0">
          {t.heading}
        </h2>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 list-none p-0 m-0 text-sm">
        {pairs.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/${loc}/buses/${p.slug}`}
              className="text-aegean hover:underline"
            >
              Bus {p.placeA} {t.connector} {p.placeB}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
