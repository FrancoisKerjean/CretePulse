"use client";

// Baromètre de l'île : panneau du hero. Trois lignes de FAITS observés.
// La mer arrive en props (déjà rendue côté serveur, ISR 2 h) ; croisière et bus
// viennent de /api/island-now (cache CDN 10 min). Une source absente = ligne
// absente, jamais de zéro affiché, jamais d'estimation.
// Spec : docs/superpowers/specs/2026-07-28-home-service-rail-design.md
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CiBus, CiWave } from "@/components/icons";
import { Ship } from "lucide-react";

interface IslandNow {
  cruise: { port: string; paxCapacity: number; ships: { name: string; eta: string | null; etd: string | null }[] } | null;
  buses: { tracked: number; asOf: string } | null;
  stock: null;
}

const PORT_LABEL: Record<string, string> = {
  heraklion: "Heraklion",
  souda: "Souda",
  chania: "Chania",
  sitia: "Sitia",
  agios_nikolaos: "Agios Nikolaos",
};

export function IslandBarometer({
  seaTemp,
  windSpeed,
  airTemp,
}: {
  seaTemp: number | null;
  windSpeed: number | null;
  airTemp: number | null;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [data, setData] = useState<IslandNow | null>(null);

  // Le décalage visuel à l'arrivée des lignes croisière/bus est accepté : réserver
  // une hauteur fixe laisserait un trou visible les jours où une seule source
  // répond. La ligne mer, elle, est déjà rendue côté serveur : le panneau n'apparaît
  // donc jamais de rien.
  useEffect(() => {
    let alive = true;
    fetch("/api/island-now")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setData(j); })
      .catch(() => { /* une source muette n'affiche rien, elle ne casse rien */ });
    return () => { alive = false; };
  }, []);

  const showSea = seaTemp != null && windSpeed != null && airTemp != null;
  const cruise = data?.cruise ?? null;
  const buses = data?.buses ?? null;
  if (!showSea && !cruise && !buses) return null;

  return (
    <div className="bg-white/86 rounded-[22px] px-4 py-0.5 mb-4 max-w-[470px] shadow-[0_12px_30px_rgba(11,94,120,.14)]">
      {showSea && (
        <div className="flex items-center gap-3 py-3">
          <CiWave className="w-[18px] h-[18px] text-sea shrink-0" aria-hidden />
          <p className="flex-1 text-[13.5px] leading-snug text-text m-0">
            {t("barometer.sea", { temp: seaTemp, wind: windSpeed, air: airTemp })}
          </p>
          <span className="text-[10px] text-text-muted text-right max-w-[96px] leading-tight sr-only sm:not-sr-only sm:block">
            {t("barometer.src.weather")}
          </span>
        </div>
      )}

      {cruise && (
        <div className="flex items-center gap-3 py-3 border-t border-text/8 first:border-t-0">
          <Ship className="w-[18px] h-[18px] text-sea shrink-0" aria-hidden />
          <p className="flex-1 text-[13.5px] leading-snug text-text m-0">
            {t("barometer.cruise", {
              pax: cruise.paxCapacity.toLocaleString(locale).replace(/\u202f|\u00a0/g, " "),
              port: PORT_LABEL[cruise.port] ?? cruise.port,
            })}
            <br />
            <span className="text-[11.5px] text-text-muted">
              {cruise.ships.map((s) => `${s.name}${s.eta && s.etd ? ` ${s.eta}-${s.etd}` : ""}`).join(" · ")}
            </span>
          </p>
          <span className="text-[10px] text-text-muted text-right max-w-[96px] leading-tight sr-only sm:not-sr-only sm:block">
            {t("barometer.src.port")}
          </span>
        </div>
      )}

      {buses && (
        <div className="flex items-center gap-3 py-3 border-t border-text/8 first:border-t-0">
          <CiBus className="w-[18px] h-[18px] text-sea shrink-0" aria-hidden />
          <p className="flex-1 text-[13.5px] leading-snug text-text m-0">
            {t("barometer.buses", { count: buses.tracked })}
          </p>
          <span className="text-[10px] text-text-muted text-right max-w-[96px] leading-tight sr-only sm:not-sr-only sm:block">
            {t("barometer.src.gps")}
          </span>
        </div>
      )}
    </div>
  );
}
