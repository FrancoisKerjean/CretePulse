"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { athensNow } from "@/lib/athens-time";
import { AGNIK_LINES } from "@/data/agnik-bus";
import {
  searchStops, planDoorToDoor, nextDepartures, isServiceRunning,
  type UrbanLeg, type UrbanPlace, type DoorPlan,
} from "@/lib/urban-journey";

type Dict = {
  title: string; tagline: string; free: string; every: string; span: string;
  linesTitle: string; stopsWord: string; loop: string;
  planTitle: string; fromQ: string; toQ: string; swap: string; placeholder: string; myPosition: string;
  direct: string; transfer: string; changeAt: string; nextBuses: string;
  walkTo: string; toDest: string; doorTotal: string; walkDirect: string; fastest: string; otherOption: string;
  tooFar: string; serviceOver: string; viewLive: string; freeNote: string;
  min: string; stopsN: (n: number) => string;
};

const COLOR_NAME: Record<string, Record<"yellow" | "red" | "green", string>> = {
  en: { yellow: "Yellow", red: "Red", green: "Green" },
  fr: { yellow: "Jaune", red: "Rouge", green: "Verte" },
  de: { yellow: "Gelb", red: "Rot", green: "Grün" },
  el: { yellow: "Κίτρινη", red: "Κόκκινη", green: "Πράσινη" },
};

const T: Record<string, Dict> = {
  en: {
    title: "Agios Nikolaos City Bus", tagline: "Free town buses around Agios Nikolaos.",
    free: "Free", every: "Every 30 min", span: "7am – 10pm, every day",
    linesTitle: "The 3 lines", stopsWord: "stops", loop: "loop",
    planTitle: "Plan your trip", fromQ: "From (address or place)", toQ: "To", swap: "Swap",
    placeholder: "Hotel, beach, street…", myPosition: "My location",
    direct: "Direct", transfer: "1 change", changeAt: "Change at", nextBuses: "Next buses",
    walkTo: "Walk", toDest: "your destination", doorTotal: "door to door", walkDirect: "Walk all the way",
    fastest: "fastest", otherOption: "Other option",
    tooFar: "The nearest stop is a bit far, walking may be simpler.",
    serviceOver: "Service has ended for today, resumes at 7am.",
    viewLive: "See buses on the live map", freeNote: "All rides are free. Times are estimated.",
    min: "min", stopsN: (n) => `${n} stop${n > 1 ? "s" : ""}`,
  },
  fr: {
    title: "Bus urbain d'Agios Nikolaos", tagline: "Les bus de ville gratuits d'Agios Nikolaos.",
    free: "Gratuit", every: "Toutes les 30 min", span: "7h à 22h, tous les jours",
    linesTitle: "Les 3 lignes", stopsWord: "arrêts", loop: "boucle",
    planTitle: "Calculez votre trajet", fromQ: "Départ (adresse ou lieu)", toQ: "Arrivée", swap: "Inverser",
    placeholder: "Hôtel, plage, rue…", myPosition: "Ma position",
    direct: "Direct", transfer: "1 correspondance", changeAt: "Correspondance à", nextBuses: "Prochains bus",
    walkTo: "Marchez", toDest: "votre destination", doorTotal: "porte à porte", walkDirect: "Tout à pied",
    fastest: "le plus rapide", otherOption: "Autre option",
    tooFar: "L'arrêt le plus proche est à l'écart, la marche est peut-être plus simple.",
    serviceOver: "Service terminé pour aujourd'hui, reprise à 7h.",
    viewLive: "Voir les bus sur la carte en direct", freeNote: "Tous les trajets sont gratuits. Temps estimés.",
    min: "min", stopsN: (n) => `${n} arrêt${n > 1 ? "s" : ""}`,
  },
  de: {
    title: "Stadtbus Agios Nikolaos", tagline: "Kostenlose Stadtbusse rund um Agios Nikolaos.",
    free: "Kostenlos", every: "Alle 30 Min.", span: "7 bis 22 Uhr, täglich",
    linesTitle: "Die 3 Linien", stopsWord: "Haltestellen", loop: "Rundkurs",
    planTitle: "Route planen", fromQ: "Von (Adresse oder Ort)", toQ: "Nach", swap: "Tauschen",
    placeholder: "Hotel, Strand, Straße…", myPosition: "Mein Standort",
    direct: "Direkt", transfer: "1 Umstieg", changeAt: "Umsteigen an", nextBuses: "Nächste Busse",
    walkTo: "Zu Fuß", toDest: "zum Ziel", doorTotal: "Tür zu Tür", walkDirect: "Komplett zu Fuß",
    fastest: "am schnellsten", otherOption: "Andere Option",
    tooFar: "Die nächste Haltestelle ist etwas weit, zu Fuß ist evtl. einfacher.",
    serviceOver: "Der Betrieb ist für heute beendet, Wiederbeginn um 7 Uhr.",
    viewLive: "Busse auf der Live-Karte ansehen", freeNote: "Alle Fahrten sind kostenlos. Zeiten geschätzt.",
    min: "Min.", stopsN: (n) => `${n} Halt${n > 1 ? "e" : ""}`,
  },
  el: {
    title: "Αστικό λεωφορείο Αγίου Νικολάου", tagline: "Δωρεάν αστικά λεωφορεία στον Άγιο Νικόλαο.",
    free: "Δωρεάν", every: "Κάθε 30 λεπτά", span: "7π.μ. έως 10μ.μ., καθημερινά",
    linesTitle: "Οι 3 γραμμές", stopsWord: "στάσεις", loop: "κυκλική",
    planTitle: "Σχεδιάστε τη διαδρομή σας", fromQ: "Από (διεύθυνση ή σημείο)", toQ: "Προς", swap: "Αντιστροφή",
    placeholder: "Ξενοδοχείο, παραλία, οδός…", myPosition: "Η θέση μου",
    direct: "Απευθείας", transfer: "1 μετεπιβίβαση", changeAt: "Αλλαγή στη", nextBuses: "Επόμενα λεωφορεία",
    walkTo: "Περπατήστε", toDest: "τον προορισμό σας", doorTotal: "από πόρτα σε πόρτα", walkDirect: "Με τα πόδια",
    fastest: "πιο γρήγορο", otherOption: "Άλλη επιλογή",
    tooFar: "Η πλησιέστερη στάση είναι λίγο μακριά, ίσως είναι πιο απλό με τα πόδια.",
    serviceOver: "Τα δρομολόγια ολοκληρώθηκαν για σήμερα, επιστροφή στις 7π.μ.",
    viewLive: "Δείτε τα λεωφορεία στον ζωντανό χάρτη", freeNote: "Όλες οι διαδρομές είναι δωρεάν. Χρόνοι εκτιμώμενοι.",
    min: "λεπτά", stopsN: (n) => `${n} ${n > 1 ? "στάσεις" : "στάση"}`,
  },
};

function LinePill({ hex, code, label }: { hex: string; code: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: hex }}>
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" /> {label}
      <span className="opacity-70 font-medium">{code}</span>
    </span>
  );
}

function LegRow({ leg, t, locale }: { leg: UrbanLeg; t: Dict; locale: string }) {
  const colorName = (COLOR_NAME[locale] ?? COLOR_NAME.en)[leg.color];
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 h-8 w-1.5 rounded-full" style={{ background: leg.hex }} />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <LinePill hex={leg.hex} code={leg.lineCode} label={colorName} />
          <span className="text-xs text-text-muted">{leg.minutes} {t.min} · {t.stopsN(leg.stops)}</span>
        </div>
        <p className="mt-1 text-sm text-text">
          <span className="font-semibold">{leg.fromName}</span>
          <span className="mx-1.5 text-text-muted">→</span>
          <span className="font-semibold">{leg.toName}</span>
        </p>
      </div>
    </div>
  );
}

/** Ligne "marche" d'un itinéraire porte-à-porte. */
function WalkRow({ min, to, t }: { min: number; to: string; t: Dict }) {
  return (
    <div className="flex items-center gap-3 text-sm text-text-muted">
      <span className="flex h-8 w-1.5 items-center justify-center" aria-hidden>🚶</span>
      <span>{t.walkTo} <span className="font-data font-semibold text-text tabular-nums">{min} {t.min}</span> → {to}</span>
    </div>
  );
}

/** Champ de recherche : arrêts locaux + géocodage OSM + "Ma position". */
function PlaceInput({
  locale, t, label, value, onChange, allowGeo,
}: {
  locale: string; t: Dict; label: string;
  value: UrbanPlace | null; onChange: (p: UrbanPlace | null) => void; allowGeo?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sugg, setSugg] = useState<UrbanPlace[]>([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.length < 2) { setSugg([]); return; }
    const local = searchStops(q, 4);
    setSugg(local);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}&lang=${locale}`);
        const data = (await res.json()) as { results?: { label: string; lat: number; lng: number }[] };
        const merged: UrbanPlace[] = [...local];
        for (const r of data.results ?? []) {
          if (!merged.some((m) => m.label.toLowerCase() === r.label.toLowerCase())) {
            merged.push({ label: r.label, lat: r.lat, lng: r.lng, kind: "place" });
          }
        }
        setSugg(merged.slice(0, 7));
      } catch { /* garde les arrêts locaux */ }
    }, 350);
    return () => clearTimeout(id);
  }, [q, locale]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (p: UrbanPlace) => { onChange(p); setQ(p.label); setSugg([]); setOpen(false); };
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

/** Une carte "option d'itinéraire" (marche directe ou porte-à-porte en bus). */
function OptionCard({
  plan, kind, badge, t, locale, nowMin, running,
}: {
  plan: DoorPlan; kind: "walk" | "bus"; badge: string | null;
  t: Dict; locale: string; nowMin: number; running: boolean;
}) {
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
              {li > 0 && <p className="mb-2 pl-4 text-xs font-medium text-terra">↳ {t.changeAt} {leg.fromName}</p>}
              <LegRow leg={leg} t={t} locale={locale} />
            </div>
          ))}
          {plan.walkToMin > 0 && <WalkRow min={plan.walkToMin} to={t.toDest} t={t} />}
          {running && (() => {
            const next = nextDepartures(plan.bus.legs[0], nowMin, 3);
            return next.length ? (
              <div className="mt-1 border-t border-black/5 pt-3">
                <span className="text-xs text-text-muted">{t.nextBuses}: </span>
                {next.map((h) => <span key={h} className="ml-1 inline-block rounded bg-surface px-1.5 py-0.5 font-data text-xs font-semibold text-text tabular-nums">{h}</span>)}
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

export function AgnikPlannerClient({ locale }: { locale: string }) {
  const t = T[locale] ?? T.en;
  const colorName = COLOR_NAME[locale] ?? COLOR_NAME.en;
  const [from, setFrom] = useState<UrbanPlace | null>(null);
  const [to, setTo] = useState<UrbanPlace | null>(null);

  const plan = useMemo<DoorPlan | null>(() => (from && to ? planDoorToDoor(from, to) : null), [from, to]);
  const nowMin = athensNow().minutes;
  const running = isServiceRunning(nowMin);
  const swap = () => { setFrom(to); setTo(from); };

  // ordre des options : la plus rapide d'abord
  const hasBus = !!plan?.bus;
  const walkFirst = !!plan && (plan.recommendWalk || !hasBus);

  return (
    <main className="min-h-screen bg-surface">
      <section className="bg-night px-4 py-10 text-center text-white">
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">{t.title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sand/90">{t.tagline}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          <span className="rounded-full bg-sun px-3 py-1 font-bold text-night">{t.free}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{t.every}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{t.span}</span>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-3 font-heading text-lg font-bold text-text">{t.linesTitle}</h2>
        <div className="mb-8 grid gap-2 sm:grid-cols-3">
          {AGNIK_LINES.map((l) => (
            <div key={l.code} className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
              <LinePill hex={l.hex} code={l.code} label={colorName[l.color]} />
              <p className="mt-2 text-xs text-text-muted">{l.stops.length} {t.stopsWord} · {l.totalMinutes} {t.min} {t.loop}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
          <h2 className="mb-4 font-heading text-lg font-bold text-text">{t.planTitle}</h2>
          <div className="flex flex-col gap-3">
            <PlaceInput locale={locale} t={t} label={t.fromQ} value={from} onChange={setFrom} allowGeo />
            <div className="flex justify-center">
              <button onClick={swap} aria-label={t.swap}
                className="rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-semibold text-text-muted transition hover:bg-black/5">
                ↑↓ {t.swap}
              </button>
            </div>
            <PlaceInput locale={locale} t={t} label={t.toQ} value={to} onChange={setTo} />
          </div>

          {plan && (
            <div className="mt-5 border-t border-black/5 pt-5">
              {!running && <p className="mb-3 rounded-lg bg-sun/15 px-3 py-2 text-xs text-night">{t.serviceOver}</p>}
              {plan.tooFar && <p className="mb-3 rounded-lg bg-sun/15 px-3 py-2 text-xs text-night">{t.tooFar}</p>}
              <div className="flex flex-col gap-4">
                {walkFirst ? (
                  <>
                    <OptionCard plan={plan} kind="walk" badge={t.fastest} t={t} locale={locale} nowMin={nowMin} running={running} />
                    {hasBus && (
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t.otherOption}</p>
                        <OptionCard plan={plan} kind="bus" badge={null} t={t} locale={locale} nowMin={nowMin} running={running} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <OptionCard plan={plan} kind="bus" badge={t.fastest} t={t} locale={locale} nowMin={nowMin} running={running} />
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{t.otherOption}</p>
                      <OptionCard plan={plan} kind="walk" badge={null} t={t} locale={locale} nowMin={nowMin} running={running} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-text-muted">{t.freeNote}</p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/live" className="inline-flex items-center gap-2 rounded-full bg-aegean px-5 py-2.5 text-sm font-heading font-semibold text-white shadow transition hover:bg-aegean/90">
            {t.viewLive}
          </Link>
        </div>
      </div>
    </main>
  );
}
