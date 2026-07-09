"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { CitybusData } from "@/lib/citybus/types";
import {
  createCitybusEngine,
  type CitybusLeg, type CitybusPlace, type CitybusDoorPlan,
} from "@/lib/citybus/engine";

type Dict = {
  title: string; tagline: string; faresApply: string; freqVary: string; linesWord: string;
  linesTitle: string; linesIntro: string;
  planTitle: string; fromQ: string; toQ: string; swap: string; placeholder: string; myPosition: string;
  direct: string; transfer: string; changeAt: string;
  walkTo: string; toDest: string; doorTotal: string; walkDirect: string; fastest: string; otherOption: string;
  tooFar: string; noRoute: string; viewLive: string; estNote: string;
  min: string; stopsN: (n: number) => string;
};

// {city} est remplacé par data.info.city au rendu.
const T: Record<string, Dict> = {
  en: {
    title: "{city} City Bus", tagline: "Plan a trip on {city}'s urban bus network (Astiko KTEL).",
    faresApply: "Tickets apply", freqVary: "Frequencies vary by line", linesWord: "lines",
    linesTitle: "Bus lines", linesIntro: "The urban network serves the city and suburbs.",
    planTitle: "Plan your trip", fromQ: "From (address or place)", toQ: "To", swap: "Swap",
    placeholder: "Hotel, port, street…", myPosition: "My location",
    direct: "Direct", transfer: "1 change", changeAt: "Change at",
    walkTo: "Walk", toDest: "your destination", doorTotal: "door to door", walkDirect: "Walk all the way",
    fastest: "fastest", otherOption: "Other option",
    tooFar: "The nearest stop is a bit far, walking may be simpler.",
    noRoute: "No simple bus route found between these points. Try nearby stops or the live map.",
    viewLive: "See buses on the live map", estNote: "Times are estimated from the route length. Check the operator for exact schedules.",
    min: "min", stopsN: (n) => `${n} stop${n > 1 ? "s" : ""}`,
  },
  fr: {
    title: "Bus urbain de {city}", tagline: "Calculez un trajet sur le réseau de bus urbain de {city} (Astiko KTEL).",
    faresApply: "Billet payant", freqVary: "Fréquences variables selon la ligne", linesWord: "lignes",
    linesTitle: "Lignes de bus", linesIntro: "Le réseau urbain dessert la ville et sa périphérie.",
    planTitle: "Calculez votre trajet", fromQ: "Départ (adresse ou lieu)", toQ: "Arrivée", swap: "Inverser",
    placeholder: "Hôtel, port, rue…", myPosition: "Ma position",
    direct: "Direct", transfer: "1 correspondance", changeAt: "Correspondance à",
    walkTo: "Marchez", toDest: "votre destination", doorTotal: "porte à porte", walkDirect: "Tout à pied",
    fastest: "le plus rapide", otherOption: "Autre option",
    tooFar: "L'arrêt le plus proche est à l'écart, la marche est peut-être plus simple.",
    noRoute: "Aucun trajet en bus simple trouvé entre ces points. Essayez des arrêts proches ou la carte en direct.",
    viewLive: "Voir les bus sur la carte en direct", estNote: "Temps estimés d'après la longueur du trajet. Vérifiez les horaires exacts auprès de l'opérateur.",
    min: "min", stopsN: (n) => `${n} arrêt${n > 1 ? "s" : ""}`,
  },
  de: {
    title: "Stadtbus {city}", tagline: "Planen Sie eine Fahrt im Stadtbusnetz von {city} (Astiko KTEL).",
    faresApply: "Ticketpflichtig", freqVary: "Taktzeiten je nach Linie unterschiedlich", linesWord: "Linien",
    linesTitle: "Buslinien", linesIntro: "Das Stadtnetz bedient die Stadt und die Vororte.",
    planTitle: "Route planen", fromQ: "Von (Adresse oder Ort)", toQ: "Nach", swap: "Tauschen",
    placeholder: "Hotel, Hafen, Straße…", myPosition: "Mein Standort",
    direct: "Direkt", transfer: "1 Umstieg", changeAt: "Umsteigen an",
    walkTo: "Zu Fuß", toDest: "zum Ziel", doorTotal: "Tür zu Tür", walkDirect: "Komplett zu Fuß",
    fastest: "am schnellsten", otherOption: "Andere Option",
    tooFar: "Die nächste Haltestelle ist etwas weit, zu Fuß ist evtl. einfacher.",
    noRoute: "Keine einfache Busverbindung gefunden. Versuchen Sie nahe Haltestellen oder die Live-Karte.",
    viewLive: "Busse auf der Live-Karte ansehen", estNote: "Zeiten anhand der Streckenlänge geschätzt. Genaue Fahrpläne beim Betreiber prüfen.",
    min: "Min.", stopsN: (n) => `${n} Halt${n > 1 ? "e" : ""}`,
  },
  el: {
    title: "Αστικό λεωφορείο {city}", tagline: "Σχεδιάστε διαδρομή στο αστικό δίκτυο λεωφορείων {city} (Αστικό ΚΤΕΛ).",
    faresApply: "Απαιτείται εισιτήριο", freqVary: "Οι συχνότητες διαφέρουν ανά γραμμή", linesWord: "γραμμές",
    linesTitle: "Γραμμές λεωφορείων", linesIntro: "Το αστικό δίκτυο εξυπηρετεί την πόλη και τα προάστια.",
    planTitle: "Σχεδιάστε τη διαδρομή σας", fromQ: "Από (διεύθυνση ή σημείο)", toQ: "Προς", swap: "Αντιστροφή",
    placeholder: "Ξενοδοχείο, λιμάνι, οδός…", myPosition: "Η θέση μου",
    direct: "Απευθείας", transfer: "1 μετεπιβίβαση", changeAt: "Αλλαγή στη",
    walkTo: "Περπατήστε", toDest: "τον προορισμό σας", doorTotal: "από πόρτα σε πόρτα", walkDirect: "Με τα πόδια",
    fastest: "πιο γρήγορο", otherOption: "Άλλη επιλογή",
    tooFar: "Η πλησιέστερη στάση είναι λίγο μακριά, ίσως είναι πιο απλό με τα πόδια.",
    noRoute: "Δεν βρέθηκε απλή διαδρομή λεωφορείου. Δοκιμάστε κοντινές στάσεις ή τον ζωντανό χάρτη.",
    viewLive: "Δείτε τα λεωφορεία στον ζωντανό χάρτη", estNote: "Οι χρόνοι εκτιμώνται από το μήκος της διαδρομής. Ελέγξτε τα ακριβή δρομολόγια στον φορέα.",
    min: "λεπτά", stopsN: (n) => `${n} ${n > 1 ? "στάσεις" : "στάση"}`,
  },
};

const FALLBACK_HEX = "#0B5E78";
const fill = (s: string, city: string) => s.replace(/\{city\}/g, city);

function LinePill({ hex, code, label }: { hex: string; code: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: hex }}>
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" /> {code}
      {label && <span className="opacity-80 font-medium">{label}</span>}
    </span>
  );
}

function LegRow({ leg, t }: { leg: CitybusLeg; t: Dict }) {
  const hex = leg.hex ?? FALLBACK_HEX;
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 h-8 w-1.5 rounded-full" style={{ background: hex }} />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <LinePill hex={hex} code={leg.lineCode} label={leg.lineName} />
          <span className="text-xs text-text-muted">{leg.minutes} {t.min} · {t.stopsN(leg.stops)}</span>
        </div>
        <p className="mt-1 text-sm text-text">
          <span className="font-semibold">{leg.fromName}</span>
          <span className="mx-1.5 text-text-muted" aria-hidden>&rarr;</span>
          <span className="font-semibold">{leg.toName}</span>
        </p>
      </div>
    </div>
  );
}

function WalkRow({ min, to, t }: { min: number; to: string; t: Dict }) {
  return (
    <div className="flex items-center gap-3 text-sm text-text-muted">
      <span className="flex h-8 w-1.5 items-center justify-center" aria-hidden>🚶</span>
      <span>{t.walkTo} <span className="font-data font-semibold text-text tabular-nums">{min} {t.min}</span> → {to}</span>
    </div>
  );
}

function PlaceInput({
  locale, t, label, value, onChange, allowGeo, search,
}: {
  locale: string; t: Dict; label: string;
  value: CitybusPlace | null; onChange: (p: CitybusPlace | null) => void; allowGeo?: boolean;
  search: (q: string, limit?: number) => CitybusPlace[];
}) {
  const [q, setQ] = useState("");
  const [sugg, setSugg] = useState<CitybusPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.length < 2) { setSugg([]); return; }
    const local = search(q, 5);
    setSugg(local);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&lang=${locale}`);
        const data = (await res.json()) as { results?: { label: string; lat: number; lng: number }[] };
        const merged: CitybusPlace[] = [...local];
        for (const r of data.results ?? []) {
          if (!merged.some((m) => m.label.toLowerCase() === r.label.toLowerCase())) {
            merged.push({ label: r.label, lat: r.lat, lng: r.lng, kind: "place" });
          }
        }
        setSugg(merged.slice(0, 8));
      } catch { /* garde les arrêts locaux */ }
    }, 350);
    return () => clearTimeout(id);
  }, [q, locale, search]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (p: CitybusPlace) => { onChange(p); setQ(p.label); setSugg([]); setOpen(false); };
  const geo = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); pick({ label: t.myPosition, lat: pos.coords.latitude, lng: pos.coords.longitude, kind: "place" }); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div ref={boxRef} className="relative">
      <span className="mb-1 block text-sm font-semibold text-text-muted">{label}</span>
      <div className="flex gap-2">
        <input
          value={q}
          placeholder={t.placeholder}
          onChange={(e) => { setQ(e.target.value); setOpen(true); if (value) onChange(null); }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-xl border border-black/10 bg-surface px-3 py-2.5 text-text outline-none focus:border-sea"
        />
        {allowGeo && (
          <button type="button" onClick={geo} aria-label={t.myPosition} title={t.myPosition}
            className="shrink-0 rounded-xl border border-black/10 bg-surface px-3 text-lg transition hover:bg-black/5">
            {locating ? "…" : "📍"}
          </button>
        )}
      </div>
      {open && sugg.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-black/10 bg-white shadow-lg">
          {sugg.map((p, i) => (
            <li key={`${p.kind}-${i}`}>
              <button type="button" onClick={() => pick(p)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-black/5">
                <span aria-hidden>{p.kind === "stop" ? "🚏" : "📍"}</span>
                <span>{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OptionCard({ plan, kind, badge, t }: { plan: CitybusDoorPlan; kind: "walk" | "bus"; badge: string | null; t: Dict }) {
  const total = kind === "walk" ? plan.directWalkMin : plan.busTotalMin;
  const isFastest = badge != null;
  const border = isFastest ? "#A7E3C0" : "rgba(0,0,0,.06)";
  const bg = isFastest ? "#EAF9F0" : "#fff";
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: border, background: bg }}>
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: isFastest ? "#0A6B3B" : undefined }}>
          {kind === "walk" ? <><span aria-hidden>🚶</span> {t.walkDirect}</> : <span className="rounded-full bg-lagoon-deep/10 px-2.5 py-1 text-xs font-bold text-lagoon-deep">{plan.bus!.transfers === 0 ? t.direct : t.transfer}</span>}
          {badge && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: "#12B76A" }}>{badge}</span>}
        </span>
        <span className="font-data text-sm font-bold tabular-nums" style={{ color: isFastest ? "#0A6B3B" : undefined }}>
          ~{total} {t.min} {kind === "bus" && <span className="font-normal text-text-muted">{t.doorTotal}</span>}
        </span>
      </div>
      {kind === "bus" && plan.bus && (
        <div className="flex flex-col gap-3">
          {plan.walkFromMin > 0 && <WalkRow min={plan.walkFromMin} to={plan.fromStop!.name} t={t} />}
          {plan.bus.legs.map((leg, li) => (
            <div key={li}>
              {li > 0 && <p className="mb-2 pl-4 text-xs font-medium text-terracotta">↳ {t.changeAt} {leg.fromName}</p>}
              <LegRow leg={leg} t={t} />
            </div>
          ))}
          {plan.walkToMin > 0 && <WalkRow min={plan.walkToMin} to={t.toDest} t={t} />}
        </div>
      )}
    </div>
  );
}

export function CitybusPlanner({ locale, data }: { locale: string; data: CitybusData }) {
  const base = T[locale] ?? T.en;
  const city = data.info.city;
  const t: Dict = { ...base, title: fill(base.title, city), tagline: fill(base.tagline, city) };
  const engine = useMemo(() => createCitybusEngine(data), [data]);
  const [from, setFrom] = useState<CitybusPlace | null>(null);
  const [to, setTo] = useState<CitybusPlace | null>(null);

  const plan = useMemo<CitybusDoorPlan | null>(() => (from && to ? engine.planDoorToDoor(from, to) : null), [from, to, engine]);
  const swap = () => { setFrom(to); setTo(from); };
  const hasBus = !!plan?.bus;
  const walkFirst = !!plan && (plan.recommendWalk || !hasBus);

  return (
    <main className="min-h-screen bg-surface">
      <section className="bg-night px-4 py-10 text-center text-white">
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">{t.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sand/90">{t.tagline}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1">{data.lines.length} {t.linesWord}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{t.faresApply}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{t.freqVary}</span>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
          <h2 className="mb-4 font-heading text-lg font-bold text-text">{t.planTitle}</h2>
          <div className="flex flex-col gap-3">
            <PlaceInput locale={locale} t={t} label={t.fromQ} value={from} onChange={setFrom} allowGeo search={engine.searchStops} />
            <div className="flex justify-center">
              <button onClick={swap} aria-label={t.swap}
                className="rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-semibold text-text-muted transition hover:bg-black/5">
                ↑↓ {t.swap}
              </button>
            </div>
            <PlaceInput locale={locale} t={t} label={t.toQ} value={to} onChange={setTo} search={engine.searchStops} />
          </div>

          {plan && (
            <div className="mt-5 border-t border-black/5 pt-5">
              {plan.tooFar && <p className="mb-3 rounded-lg bg-sun/15 px-3 py-2 text-xs text-night">{t.tooFar}</p>}
              {!hasBus && !plan.recommendWalk && <p className="mb-3 rounded-lg bg-sun/15 px-3 py-2 text-xs text-night">{t.noRoute}</p>}
              <div className="flex flex-col gap-4">
                {walkFirst ? (
                  <>
                    <OptionCard plan={plan} kind="walk" badge={t.fastest} t={t} />
                    {hasBus && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t.otherOption}</p>
                        <OptionCard plan={plan} kind="bus" badge={null} t={t} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <OptionCard plan={plan} kind="bus" badge={t.fastest} t={t} />
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t.otherOption}</p>
                      <OptionCard plan={plan} kind="walk" badge={null} t={t} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-text-muted">{t.estNote}</p>
        </div>

        <div className="mt-8">
          <h2 className="mb-1 font-heading text-lg font-bold text-text">{t.linesTitle}</h2>
          <p className="mb-3 text-xs text-text-muted">{t.linesIntro}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {data.lines.map((l) => (
              <div key={l.code} className="flex items-center gap-2 rounded-xl border border-black/5 bg-white p-2.5 shadow-sm">
                <LinePill hex={l.hex ?? FALLBACK_HEX} code={l.apiCode} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{l.name}</span>
                <span className="shrink-0 text-xs text-text-muted">~{l.totalMinutes} {t.min}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/live" className="inline-flex items-center gap-2 rounded-full bg-sea px-5 py-2.5 text-sm font-heading font-semibold text-white shadow transition hover:bg-sea/90">
            {t.viewLive}
          </Link>
        </div>
      </div>
    </main>
  );
}
