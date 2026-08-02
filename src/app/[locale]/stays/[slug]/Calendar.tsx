"use client";
// Calendrier de disponibilite, deux mois. Remplace les deux input type=date natifs.
// Toute la decision vit dans lib/stays/calendar-rules, testee : ce composant ne fait
// que rendre et appeler. Rappel de la regle qui compte, convention [) :
// une nuit prise interdit l ARRIVEE ce jour la, jamais le DEPART. Griser le jour de
// depart rendrait invendable tout trou adjacent a une reservation.
import { useState } from "react";
import { canCheckIn, canCheckOut, maxCheckOut } from "@/lib/stays/calendar-rules";

const iso = (d: Date): string => d.toISOString().slice(0, 10);

/** Grille d un mois, alignee sur lundi, avec les cases vides du debut. */
function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7; // dimanche = 0 en JS, on veut lundi en tete
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(iso(new Date(Date.UTC(year, month, d))));
  return cells;
}

const MONTHS: Record<string, string[]> = {
  fr: ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "Marz", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  el: ["Ιανουαριος", "Φεβρουαριος", "Μαρτιος", "Απριλιος", "Μαιος", "Ιουνιος", "Ιουλιος", "Αυγουστος", "Σεπτεμβριος", "Οκτωβριος", "Νοεμβριος", "Δεκεμβριος"],
};
const WEEK: Record<string, string[]> = {
  fr: ["l", "m", "m", "j", "v", "s", "d"],
  en: ["m", "t", "w", "t", "f", "s", "s"],
  de: ["m", "d", "m", "d", "f", "s", "s"],
  el: ["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"],
};

export default function Calendar({
  taken,
  from,
  to,
  onPick,
  locale,
  labels,
}: {
  taken: string[];
  from: string;
  to: string;
  onPick: (from: string, to: string) => void;
  locale: string;
  labels: { checkIn: string; checkOut: string };
}) {
  const [offset, setOffset] = useState(0);
  const today = iso(new Date());
  const base = new Date();
  const months = [0, 1].map((i) => {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset + i, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  const ceiling = from && !to ? maxCheckOut(taken, from) : null;

  function state(day: string): "past" | "taken" | "sel" | "in" | "free" | "off" {
    if (day < today) return "past";
    if (from && to && day > from && day < to) return "in";
    if (day === from || day === to) return "sel";
    if (from && !to) {
      // Phase 2 : on choisit le depart. Un jour est proposable s il est apres
      // l arrivee et si aucune nuit prise ne se glisse entre les deux.
      if (day <= from) return taken.includes(day) ? "taken" : "off";
      if (ceiling && day > ceiling) return "off";
      return canCheckOut(taken, from, day) ? "free" : "off";
    }
    return taken.includes(day) ? "taken" : "free";
  }

  function click(day: string) {
    if (day < today) return;
    if (!from || (from && to)) {
      if (!canCheckIn(taken, day)) return;
      onPick(day, "");
      return;
    }
    if (day <= from) {
      if (canCheckIn(taken, day)) onPick(day, "");
      return;
    }
    if (canCheckOut(taken, from, day)) onPick(from, day);
  }

  const cls: Record<string, string> = {
    past: "text-text-light opacity-30 cursor-default",
    off: "text-text-light opacity-40 cursor-not-allowed",
    taken: "text-text-light line-through bg-[#F1F5F7] cursor-not-allowed",
    free: "text-text hover:bg-sea-faint cursor-pointer",
    sel: "bg-sea text-white font-bold cursor-pointer",
    in: "bg-sea-faint text-text cursor-pointer",
  };

  const names = MONTHS[locale] ?? MONTHS.en;
  const week = WEEK[locale] ?? WEEK.en;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="rounded-full border border-border px-3 py-1 text-[13px] disabled:opacity-30"
          aria-label="Mois precedent"
        >
          {"<"}
        </button>
        <p className="m-0 text-[12.5px] text-text-muted">
          {from && !to ? labels.checkOut : labels.checkIn}
        </p>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(11, o + 1))}
          className="rounded-full border border-border px-3 py-1 text-[13px]"
          aria-label="Mois suivant"
        >
          {">"}
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {months.map(({ year, month }, mi) => (
          <div key={`${year}-${month}`} className={mi === 1 ? "hidden sm:block" : ""}>
            <p className="m-0 mb-2 text-center font-heading text-[14px] font-bold">
              {names[month]} {year}
            </p>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[12.5px]">
              {week.map((w, i) => (
                <span key={`${w}${i}`} className="pb-1 text-[10.5px] uppercase text-text-light">
                  {w}
                </span>
              ))}
              {monthGrid(year, month).map((day, i) =>
                day === null ? (
                  <span key={`e${i}`} />
                ) : (
                  <button
                    key={day}
                    type="button"
                    onClick={() => click(day)}
                    className={`rounded-lg py-1.5 transition-colors ${cls[state(day)]}`}
                  >
                    {Number(day.slice(8))}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
