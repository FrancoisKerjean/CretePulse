"use client";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { athensNow } from "@/lib/athens-time";
import { AGNIK_LINES, AGNIK_SERVICE } from "@/data/agnik-bus";
import {
  findUrbanTrips, urbanStopOptions, nextDepartures, isServiceRunning,
  type UrbanTrip, type UrbanLeg,
} from "@/lib/urban-journey";

type Dict = {
  title: string; tagline: string; free: string; every: string; span: string;
  linesTitle: string; stopsWord: string; loop: string;
  planTitle: string; from: string; to: string; swap: string; pick: string;
  direct: string; transfer: string; totalMin: string; board: string; ride: string;
  changeAt: string; nextBuses: string; serviceOver: string; noTrip: string; noTripHint: string;
  viewLive: string; freeNote: string; min: string; stopsN: (n: number) => string;
};

const COLOR_NAME: Record<string, Record<"yellow" | "red" | "green", string>> = {
  en: { yellow: "Yellow", red: "Red", green: "Green" },
  fr: { yellow: "Jaune", red: "Rouge", green: "Verte" },
  de: { yellow: "Gelb", red: "Rot", green: "Grün" },
  el: { yellow: "Κίτρινη", red: "Κόκκινη", green: "Πράσινη" },
};

const T: Record<string, Dict> = {
  en: {
    title: "Agios Nikolaos City Bus",
    tagline: "Free town buses around Agios Nikolaos.",
    free: "Free", every: "Every 30 min", span: "7am – 10pm, every day",
    linesTitle: "The 3 lines", stopsWord: "stops", loop: "loop",
    planTitle: "Plan your trip", from: "From", to: "To", swap: "Swap", pick: "Pick a stop",
    direct: "Direct", transfer: "1 change", totalMin: "total",
    board: "Board", ride: "ride", changeAt: "Change at", nextBuses: "Next buses from here",
    serviceOver: "Service has ended for today, resumes at 7am.",
    noTrip: "No simple bus trip between these two stops.",
    noTripHint: "They may sit on opposite branches near the terminal, walking is often quicker.",
    viewLive: "See buses on the live map", freeNote: "All rides are free. Times are estimated from the route.",
    min: "min", stopsN: (n) => `${n} stop${n > 1 ? "s" : ""}`,
  },
  fr: {
    title: "Bus urbain d'Agios Nikolaos",
    tagline: "Les bus de ville gratuits d'Agios Nikolaos.",
    free: "Gratuit", every: "Toutes les 30 min", span: "7h à 22h, tous les jours",
    linesTitle: "Les 3 lignes", stopsWord: "arrêts", loop: "boucle",
    planTitle: "Calculez votre trajet", from: "Départ", to: "Arrivée", swap: "Inverser", pick: "Choisir un arrêt",
    direct: "Direct", transfer: "1 correspondance", totalMin: "au total",
    board: "Montez", ride: "trajet", changeAt: "Correspondance à", nextBuses: "Prochains bus d'ici",
    serviceOver: "Service terminé pour aujourd'hui, reprise à 7h.",
    noTrip: "Aucun trajet en bus simple entre ces deux arrêts.",
    noTripHint: "Ils sont peut-être sur des branches opposées près du terminal, la marche est souvent plus rapide.",
    viewLive: "Voir les bus sur la carte en direct", freeNote: "Tous les trajets sont gratuits. Les temps sont estimés d'après le tracé.",
    min: "min", stopsN: (n) => `${n} arrêt${n > 1 ? "s" : ""}`,
  },
  de: {
    title: "Stadtbus Agios Nikolaos",
    tagline: "Kostenlose Stadtbusse rund um Agios Nikolaos.",
    free: "Kostenlos", every: "Alle 30 Min.", span: "7 bis 22 Uhr, täglich",
    linesTitle: "Die 3 Linien", stopsWord: "Haltestellen", loop: "Rundkurs",
    planTitle: "Route planen", from: "Von", to: "Nach", swap: "Tauschen", pick: "Haltestelle wählen",
    direct: "Direkt", transfer: "1 Umstieg", totalMin: "gesamt",
    board: "Einsteigen", ride: "Fahrt", changeAt: "Umsteigen an", nextBuses: "Nächste Busse ab hier",
    serviceOver: "Der Betrieb ist für heute beendet, Wiederbeginn um 7 Uhr.",
    noTrip: "Keine einfache Busverbindung zwischen diesen Haltestellen.",
    noTripHint: "Sie liegen evtl. auf gegenüberliegenden Ästen nahe dem Terminal, zu Fuß ist oft schneller.",
    viewLive: "Busse auf der Live-Karte ansehen", freeNote: "Alle Fahrten sind kostenlos. Zeiten sind anhand der Strecke geschätzt.",
    min: "Min.", stopsN: (n) => `${n} Halt${n > 1 ? "e" : ""}`,
  },
  el: {
    title: "Αστικό λεωφορείο Αγίου Νικολάου",
    tagline: "Δωρεάν αστικά λεωφορεία στον Άγιο Νικόλαο.",
    free: "Δωρεάν", every: "Κάθε 30 λεπτά", span: "7π.μ. έως 10μ.μ., καθημερινά",
    linesTitle: "Οι 3 γραμμές", stopsWord: "στάσεις", loop: "κυκλική",
    planTitle: "Σχεδιάστε τη διαδρομή σας", from: "Από", to: "Προς", swap: "Αντιστροφή", pick: "Επιλέξτε στάση",
    direct: "Απευθείας", transfer: "1 μετεπιβίβαση", totalMin: "σύνολο",
    board: "Επιβίβαση", ride: "διαδρομή", changeAt: "Αλλαγή στη", nextBuses: "Επόμενα λεωφορεία από εδώ",
    serviceOver: "Τα δρομολόγια ολοκληρώθηκαν για σήμερα, επιστροφή στις 7π.μ.",
    noTrip: "Δεν υπάρχει απλή διαδρομή λεωφορείου μεταξύ αυτών των στάσεων.",
    noTripHint: "Ίσως βρίσκονται σε αντίθετους κλάδους κοντά στο τέρμα, το περπάτημα είναι συχνά πιο γρήγορο.",
    viewLive: "Δείτε τα λεωφορεία στον ζωντανό χάρτη", freeNote: "Όλες οι διαδρομές είναι δωρεάν. Οι χρόνοι είναι εκτιμώμενοι βάσει της διαδρομής.",
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

export function AgnikPlannerClient({ locale }: { locale: string }) {
  const t = T[locale] ?? T.en;
  const colorName = COLOR_NAME[locale] ?? COLOR_NAME.en;
  const options = useMemo(() => urbanStopOptions(), []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const trips = useMemo<UrbanTrip[]>(() => (from && to ? findUrbanTrips(from, to) : []), [from, to]);
  const nowMin = athensNow().minutes;
  const running = isServiceRunning(nowMin);

  const swap = () => { setFrom(to); setTo(from); };

  return (
    <main className="min-h-screen bg-surface">
      {/* Hero */}
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
        {/* Les 3 lignes */}
        <h2 className="mb-3 font-heading text-lg font-bold text-text">{t.linesTitle}</h2>
        <div className="mb-8 grid gap-2 sm:grid-cols-3">
          {AGNIK_LINES.map((l) => (
            <div key={l.code} className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
              <LinePill hex={l.hex} code={l.code} label={colorName[l.color]} />
              <p className="mt-2 text-xs text-text-muted">
                {l.stops.length} {t.stopsWord} · {l.totalMinutes} {t.min} {t.loop}
              </p>
            </div>
          ))}
        </div>

        {/* Calculateur */}
        <div className="rounded-[24px] bg-white p-5 shadow-[0_12px_32px_rgba(11,94,120,.10)]">
          <h2 className="mb-4 font-heading text-lg font-bold text-text">{t.planTitle}</h2>
          <div className="flex flex-col gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-semibold text-text-muted">{t.from}</span>
              <select value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-surface px-3 py-2.5 text-text">
                <option value="">{t.pick}</option>
                {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
              </select>
            </label>

            <div className="flex justify-center">
              <button onClick={swap} aria-label={t.swap}
                className="rounded-full border border-black/10 bg-surface px-3 py-1 text-xs font-semibold text-text-muted transition hover:bg-black/5">
                ↑↓ {t.swap}
              </button>
            </div>

            <label className="text-sm">
              <span className="mb-1 block font-semibold text-text-muted">{t.to}</span>
              <select value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-surface px-3 py-2.5 text-text">
                <option value="">{t.pick}</option>
                {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
              </select>
            </label>
          </div>

          {/* Résultats */}
          {from && to && (
            <div className="mt-5 border-t border-black/5 pt-5">
              {!running && <p className="mb-3 rounded-lg bg-sun/15 px-3 py-2 text-xs text-night">{t.serviceOver}</p>}
              {trips.length === 0 ? (
                <div className="text-sm">
                  <p className="font-semibold text-text">{t.noTrip}</p>
                  <p className="mt-1 text-text-muted">{t.noTripHint}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {trips.map((trip, ti) => {
                    const next = nextDepartures(trip.legs[0], nowMin, 3);
                    return (
                      <div key={ti} className="rounded-2xl border border-black/5 bg-surface p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="rounded-full bg-lagoon-deep/10 px-2.5 py-1 text-xs font-bold text-lagoon-deep">
                            {trip.transfers === 0 ? t.direct : t.transfer}
                          </span>
                          <span className="font-data text-sm font-bold text-text tabular-nums">
                            ~{trip.totalMinutes} {t.min} <span className="font-normal text-text-muted">{t.totalMin}</span>
                          </span>
                        </div>
                        <div className="flex flex-col gap-3">
                          {trip.legs.map((leg, li) => (
                            <div key={li}>
                              {li > 0 && (
                                <p className="mb-2 pl-4 text-xs font-medium text-terra">
                                  ↳ {t.changeAt} {leg.fromName}
                                </p>
                              )}
                              <LegRow leg={leg} t={t} locale={locale} />
                            </div>
                          ))}
                        </div>
                        {running && next.length > 0 && (
                          <div className="mt-3 border-t border-black/5 pt-3">
                            <span className="text-xs text-text-muted">{t.nextBuses}: </span>
                            {next.map((h) => (
                              <span key={h} className="ml-1 inline-block rounded bg-white px-1.5 py-0.5 font-data text-xs font-semibold text-text tabular-nums">{h}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-center text-xs text-text-muted">{t.freeNote}</p>
        </div>

        {/* Lien carte live */}
        <div className="mt-6 text-center">
          <Link href="/live" className="inline-flex items-center gap-2 rounded-full bg-aegean px-5 py-2.5 text-sm font-heading font-semibold text-white shadow transition hover:bg-aegean/90">
            {t.viewLive}
          </Link>
        </div>
      </div>
    </main>
  );
}
