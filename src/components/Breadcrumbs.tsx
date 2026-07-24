import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbSchema = {
  itemListElement?: Array<{ name?: string; item?: string }>;
};

/**
 * Visible breadcrumb trail rendered from the SAME breadcrumbSchema object already
 * built on the page, so the visual trail and the JSON-LD stay in sync. The last item
 * is the current (non-linked) page. `item` URLs are absolute (https://crete.direct/...).
 */
export default function Breadcrumbs({ schema }: { schema: BreadcrumbSchema | Record<string, unknown> }) {
  const list = ((schema as BreadcrumbSchema).itemListElement || [])
    .map((el) => ({ name: el.name || "", url: el.item || "" }))
    .filter((x) => x.name && x.url);
  if (list.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
        {list.map((item, i) => {
          const isLast = i === list.length - 1;
          return (
            <li key={item.url} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-text-light shrink-0" />}
              {isLast ? (
                <span className="text-text font-medium line-clamp-1" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={item.url} className="hover:text-sea transition-colors line-clamp-1">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
