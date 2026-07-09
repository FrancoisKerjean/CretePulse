// Section « Exemples d'activités » des pages /activities (spec 2026-07-09).
// Server component : reçoit des items DÉJÀ localisés (localizeItem côté page).
// Chaque carte est un lien vers la page combo + ancre #wizard : le catalogue
// nourrit le wizard (conversion), il ne crée aucune sortie externe.
// Aucun nom de prestataire ni lien source ici (anonymisation, commission 15%).
import Link from "next/link";
import type { CatalogItem } from "@/lib/activity-catalog";
import { cityLabel } from "@/lib/activity-taxonomy";

export type ActivityCatalogSectionProps = {
  locale: string;
  items: CatalogItem[];
  title: string;
  note: string;
  fromTpl: string;        // « from ~{price}€ / person »
  cta: string;
  showCity?: boolean;     // pages mère + catégorie : afficher la ville sur la carte
  /** Combo de la page courante : ses items pointent sur #wizard (même page). */
  currentCombo?: { category: string; city: string };
};

export function ActivityCatalogSection({
  locale, items, title, note, fromTpl, cta, showCity, currentCombo,
}: ActivityCatalogSectionProps) {
  if (items.length === 0) return null;

  const hrefFor = (it: CatalogItem) =>
    currentCombo && it.category === currentCombo.category && it.city === currentCombo.city
      ? "#wizard"
      : `/${locale}/activities/${it.category}/${it.city}#wizard`;

  return (
    <section className="mt-12">
      <h2 className="font-heading font-extrabold text-[26px] text-text mb-5">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.id}
            href={hrefFor(it)}
            className="card-base flex flex-col gap-2 p-5 no-underline transition-transform hover:-translate-y-0.5"
          >
            <span className="font-heading text-[16px] font-bold text-text leading-snug">
              {it.title}
            </span>
            <span className="text-[13.5px] text-text-muted leading-relaxed">
              {it.summary}
            </span>
            <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[12.5px] font-semibold text-text-muted">
              {showCity && <span>{cityLabel(it.city, locale)}</span>}
              {it.duration_label && <span>{it.duration_label}</span>}
              {it.price_from_eur != null && (
                <span className="text-text">
                  {fromTpl.replace("{price}", String(it.price_from_eur))}
                </span>
              )}
              <span className="ml-auto shrink-0 rounded-full bg-sun px-3 py-1 text-[12px] font-bold text-text">
                {cta}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-text-muted leading-relaxed">{note}</p>
    </section>
  );
}
