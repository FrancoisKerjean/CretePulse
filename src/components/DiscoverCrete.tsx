import Link from "next/link";
import { getRelatedEntities, getSectionHeader, getTypeBadge } from "@/lib/related-entities";

export default async function DiscoverCrete({
  category,
  locale,
}: {
  category: string | null;
  locale: string;
}) {
  const entities = await getRelatedEntities(category, locale);
  if (entities.length === 0) return null;

  const heading = getSectionHeader(locale);

  return (
    <section className="mt-14 pt-10 border-t border-border">
      <h2
        className="text-2xl font-bold text-text mb-6"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {heading}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {entities.map((e, i) => (
          <Link
            key={`${e.type}-${e.href}-${i}`}
            href={e.href}
            className="group rounded-xl overflow-hidden bg-stone-warm/50 hover:bg-stone-warm transition-colors"
          >
            {e.imageUrl ? (
              <div className="aspect-[4/3] w-full overflow-hidden bg-stone">
                <img
                  src={e.imageUrl}
                  alt={e.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="aspect-[4/3] w-full bg-gradient-to-br from-sea-faint to-terracotta-faint flex items-center justify-center">
                <span className="text-4xl opacity-40">
                  {e.type === "beach" ? "⛱" : e.type === "village" ? "⌂" : e.type === "food" ? "✦" : "↑"}
                </span>
              </div>
            )}
            <div className="p-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                {getTypeBadge(e.type, locale)}
              </span>
              <h3 className="text-sm font-semibold text-text leading-tight mt-1 group-hover:text-sea transition-colors line-clamp-2">
                {e.title}
              </h3>
              {(e.subtitle || e.region) && (
                <p className="text-xs text-text-light mt-1">
                  {e.subtitle || e.region}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
