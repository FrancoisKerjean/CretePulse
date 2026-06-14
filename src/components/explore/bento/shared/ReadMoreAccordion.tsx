import { ChevronDown } from "lucide-react";
import { readMoreLabel } from "@/lib/bento-labels";

export function ReadMoreAccordion({
  paragraphs, locale,
}: {
  paragraphs: string[];
  locale: string;
}) {
  if (paragraphs.length === 0) return null;
  return (
    <details className="group mt-4 rounded-2xl border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-heading text-sm font-bold text-aegean">
        {readMoreLabel(locale)}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4 text-[15px] leading-7 text-text">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </details>
  );
}
