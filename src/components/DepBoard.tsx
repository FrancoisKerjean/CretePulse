"use client";
// Board nuit des prochains departs : signature "donnees live" (style Flighty).
// Calcule les N prochains departs toutes lignes confondues via timesForDate.
// Chaque rangee est un lien vers la page de ligne /buses/[pair].
// Reference visuelle : docs/design/kalimera/home-v8.html bloc .dep-card
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { timesForDate } from "@/lib/bus-journey";
import { pairSlug } from "@/lib/bus-pairs";
import type { BusRoute } from "@/lib/buses";
import { CiBus } from "@/components/icons";

const T = {
  title: { en: "Next buses", fr: "Prochains bus", de: "Nächste Busse", el: "Επόμενα λεωφορεία" },
  plan: { en: "Plan a journey", fr: "Planifier un trajet", de: "Fahrt planen", el: "Σχεδιασμός" },
  inMin: { en: (m: number) => `in ${m} min`, fr: (m: number) => `dans ${m} min`, de: (m: number) => `in ${m} Min`, el: (m: number) => `σε ${m}’` },
  last: { en: "last today", fr: "dernier du jour", de: "letzter heute", el: "τελευταίο" },
  tomorrow: { en: "tomorrow", fr: "demain", de: "morgen", el: "αύριο" },
  routeAria: {
    en: (a: string, b: string) => `Timetable ${a} – ${b}`,
    fr: (a: string, b: string) => `Horaires ${a} – ${b}`,
    de: (a: string, b: string) => `Fahrplan ${a} – ${b}`,
    el: (a: string, b: string) => `Δρομολόγια ${a} – ${b}`,
  },
};

interface NextDep { from: string; to: string; time: string; inMin: number; isLast: boolean; isTomorrow: boolean; price: number | null; pair: string | null }

function athens(): { iso: string; minutes: number } {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { iso: `${g("year")}-${g("month")}-${g("day")}`, minutes: (parseInt(g("hour")) % 24) * 60 + parseInt(g("minute")) };
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return (h || 0) * 60 + (m || 0); };

// Event Plausible "board_route_click" : mesure si la cliquabilite du board
// genere des sessions bus (meme pattern que bus_search / ticket_intent).
function trackRouteClick(pair: string) {
  const plausible = (window as unknown as {
    plausible?: (e: string, o?: { props?: Record<string, string | number> }) => void;
  }).plausible;
  plausible?.("board_route_click", { props: { pair } });
}

export function DepBoard({ routes, locale, count = 3 }: { routes: BusRoute[]; locale: string; count?: number }) {
  const ui = (["en", "fr", "de", "el"].includes(locale) ? locale : "en") as keyof typeof T.title;
  const [deps, setDeps] = useState<NextDep[]>([]);

  useEffect(() => {
    const { iso, minutes } = athens();
    const tomorrowIso = new Date(new Date(`${iso}T12:00:00`).getTime() + 86400000).toISOString().slice(0, 10);
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const out: NextDep[] = [];
    for (const r of routes) {
      const times = timesForDate(r, iso).map(toMin).sort((a, b) => a - b);
      const idx = times.findIndex((m) => m >= minutes);
      if (idx === -1) {
        // plus rien aujourd'hui : le board vit quand meme, premier bus demain
        const first = timesForDate(r, tomorrowIso).map(toMin).sort((a, b) => a - b)[0];
        if (first === undefined) continue;
        out.push({
          from: r.from_place, to: r.to_place, time: fmt(first),
          inMin: 1440 - minutes + first, isLast: false, isTomorrow: true,
          price: r.price_eur ?? null,
          pair: pairSlug(r.from_place, r.to_place),
        });
        continue;
      }
      const m = times[idx];
      out.push({
        from: r.from_place, to: r.to_place,
        time: fmt(m),
        inMin: m - minutes, isLast: idx === times.length - 1, isTomorrow: false,
        price: r.price_eur ?? null,
        pair: pairSlug(r.from_place, r.to_place),
      });
    }
    out.sort((a, b) => a.inMin - b.inMin);
    // dedup par paire from->to (garder le plus proche)
    const seen = new Set<string>();
    setDeps(out.filter((d) => { const k = `${d.from}>${d.to}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, count));
  }, [routes, count]);

  if (deps.length === 0) return null;
  return (
    <div className="bg-night text-[#EAF7FA] rounded-[30px] px-7 py-6 pb-4 shadow-[0_24px_60px_rgba(7,55,74,.4)]">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-heading font-bold text-lg inline-flex items-center gap-2.5">
          <span className="bg-lagoon text-night rounded-xl p-2 inline-flex"><CiBus className="w-[19px] h-[19px]" /></span>
          {T.title[ui]}
        </span>
        <Link href="/buses" className="bg-lagoon text-night rounded-full px-4 py-2 text-[13.5px] font-heading font-bold">
          {T.plan[ui]}
        </Link>
      </div>
      <div className="font-data">
        {deps.map((d) => {
          const rowClass = "grid grid-cols-[1fr_auto_auto_auto_auto] gap-5 items-center py-3 border-t border-[#EAF7FA]/12";
          const inner = (
            <>
              <span className="font-semibold">{d.from} <span className="text-lagoon mx-1">·</span> {d.to}</span>
              <span className="text-[25px] font-bold">{d.time}</span>
              <span className={`text-[13px] font-bold rounded-full px-3 py-1.5 ${d.isLast || d.isTomorrow ? "bg-sun/16 text-sun" : "bg-ok/18 text-[#43E89D]"}`}>
                {d.isTomorrow ? T.tomorrow[ui] : d.isLast ? T.last[ui] : T.inMin[ui](d.inMin)}
              </span>
              <span className="text-right text-[#EAF7FA]/55 text-sm w-16">{d.price != null ? `${d.price.toFixed(2)} €` : ""}</span>
              <ChevronRight className="w-4 h-4 text-[#EAF7FA]/40" aria-hidden />
            </>
          );
          return d.pair ? (
            <Link
              key={`${d.from}-${d.to}`}
              href={`/buses/${d.pair}`}
              aria-label={T.routeAria[ui](d.from, d.to)}
              onClick={() => trackRouteClick(d.pair!)}
              className={`${rowClass} -mx-2 px-2 rounded-lg transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon/60`}
            >
              {inner}
            </Link>
          ) : (
            <div key={`${d.from}-${d.to}`} className={rowClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
