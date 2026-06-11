"use client";

// Sélecteur de lieu manuel : fallback de useGeoPosition (géoloc refusée,
// indisponible, ou utilisateur pas encore en Crète). Liste SLUG_COORDS.
// Spec : docs/superpowers/specs/2026-06-12-near-me-design.md
import { SLUG_COORDS } from "@/lib/taxi-fare";

const SLUGS = Object.keys(SLUG_COORDS).sort();

const labelOf = (slug: string) =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function PlacePicker({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (slug: string) => void;
  label: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => e.target.value && onChange(e.target.value)}
      aria-label={label}
      className="flex-1 border border-border rounded-full px-4 py-2.5 text-sm text-text bg-white focus:outline-none focus:ring-2 focus:ring-lagoon/40"
    >
      <option value="">{label}</option>
      {SLUGS.map((slug) => (
        <option key={slug} value={slug}>{labelOf(slug)}</option>
      ))}
    </select>
  );
}
