import type { ReactNode } from "react";

export type TileVariant = "sand" | "terracotta" | "sun" | "lagoon" | "sea" | "community";

const VARIANT: Record<TileVariant, string> = {
  sand: "bg-sand text-sea border-sand-warm",
  terracotta: "bg-terracotta text-white border-terracotta",
  sun: "bg-sun text-night border-sun",
  lagoon: "bg-lagoon text-white border-lagoon",
  sea: "bg-sea text-white border-sea",
  community: "bg-lagoon-deep text-white border-lagoon-deep",
};

export function Tile({
  icon, big, label, variant = "sand", className = "",
}: {
  icon?: ReactNode;
  big: ReactNode;
  label: string;
  variant?: TileVariant;
  className?: string;
}) {
  return (
    <dl
      className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center ${VARIANT[variant]} ${className}`}
    >
      {icon != null && (
        <span aria-hidden className="order-1 mb-1 text-lg leading-none">{icon}</span>
      )}
      <dt className="order-3 mt-1 text-[9px] uppercase tracking-wide opacity-80">{label}</dt>
      <dd className="order-2 m-0 font-heading text-xl font-bold leading-none">{big}</dd>
    </dl>
  );
}
