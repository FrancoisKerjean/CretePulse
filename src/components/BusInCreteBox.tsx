// BusInCreteBox - bloc de liens internes vers les pages-trajet prioritaires,
// inséré sur les pages NEWS (les plus crawlées du site). Levier crawl-budget :
// fait découvrir/crawler les ~12 trajets à fort signal depuis des pages que
// Google visite souvent, pour les sortir du « Discovered - not indexed ».
// Server component : fetch bus_routes + priorityPairs (purs).

import { Bus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { supabase } from "@/lib/supabase";
import { priorityPairs, type SeoRoute } from "@/lib/bus-seo";

/** Affiche les liens-trajet prioritaires. `locale` = locale serveur. */
export async function BusInCreteBox({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "busInCreteBox" });

  const { data } = await supabase
    .from("bus_routes")
    .select("from_place,to_place,departures");
  const pairs = priorityPairs((data ?? []) as SeoRoute[]).slice(0, 12);
  if (pairs.length === 0) return null;

  return (
    <section
      aria-labelledby="bus-in-crete-heading"
      className="mt-10 mb-8 p-6 rounded-2xl border border-sea/15 bg-sea/5"
    >
      <div className="flex items-center gap-3 mb-4">
        <Bus className="w-5 h-5 text-sea" aria-hidden="true" />
        <h2 id="bus-in-crete-heading" className="text-xl font-bold text-sea m-0">
          {t("heading")}
        </h2>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 list-none p-0 m-0 text-sm">
        {pairs.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/${locale}/buses/${p.slug}`}
              className="text-sea hover:underline"
            >
              Bus {p.placeA} {t("connector")} {p.placeB}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
