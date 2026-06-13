"use client";

// Ligne compacte d'annuaire : remplace les grosses RouteCard. Horaires rendus
// dans le DOM (replies par defaut), donc indexables. Tap sur le titre = page
// paire si digne. Le but : ~383 routes en ~15 ecrans au lieu de 120.
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { BusRoute } from "@/lib/buses";
import { pairSlug } from "@/lib/bus-pairs";

export function RouteLine({ route, locale }: { route: BusRoute; locale: string }) {
  const [open, setOpen] = useState(false);
  const fr = locale === "fr";
  const deps = route.departures ?? [];
  const slug = pairSlug(route.from_place, route.to_place);
  const count = fr ? `${deps.length} départs` : `${deps.length} departures`;
  const priceLabel =
    route.price_eur != null
      ? `${route.price_estimated ? "≈ " : ""}${route.price_eur.toFixed(2)} €`
      : null;

  const title = (
    <span className="font-semibold text-[13px] text-text">
      {route.from_place} <span className="text-lagoon mx-0.5">·</span> {route.to_place}
    </span>
  );

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 py-2.5">
        {slug ? (
          <Link href={`/buses/${slug}`} className="flex-1 min-w-0 hover:underline">{title}</Link>
        ) : (
          <span className="flex-1 min-w-0">{title}</span>
        )}
        <span className="text-[11px] text-text-muted shrink-0 text-right">
          {deps.length > 0 ? count : (fr ? "horaires au guichet" : "times at the counter")}
          {priceLabel ? ` · ${priceLabel}` : ""}
        </span>
        {deps.length > 0 && (
          <button type="button" onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-[11px] text-aegean font-semibold shrink-0">
            {open ? (fr ? "Réduire" : "Hide") : (fr ? "Horaires" : "Times")}
          </button>
        )}
      </div>
      {/* Horaires toujours dans le DOM (SEO), masques visuellement si !open */}
      {deps.length > 0 && (
        <ul className={`flex flex-wrap gap-1.5 list-none p-0 m-0 ${open ? "pb-3" : "hidden"}`}>
          {deps.map((t, i) => (
            <li key={`${t}-${i}`}
              className="px-2 py-1 rounded-[10px] bg-surface border-[1.5px] border-lagoon/30 text-[11px] font-semibold font-data text-text">
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
