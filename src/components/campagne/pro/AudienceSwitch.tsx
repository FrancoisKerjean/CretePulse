import Link from "next/link";
import { audienceLabels, type ProAudience } from "@/lib/campagne-pro";

const ROUTE: Record<ProAudience, string> = {
  visiteur: "/projet",
  institutions: "/projet/institutions",
  entreprises: "/projet/entreprises",
};
const ORDER: ProAudience[] = ["visiteur", "institutions", "entreprises"];

export default function AudienceSwitch({ locale, active }: { locale: string; active: ProAudience }) {
  const labels = audienceLabels(locale);
  return (
    <nav className="flex justify-center gap-2 px-4 pt-4 pb-1" aria-label="public">
      {ORDER.map((a) => {
        const on = a === active;
        return (
          <Link
            key={a}
            href={`/${locale}${ROUTE[a]}`}
            aria-current={on ? "page" : undefined}
            className={`font-[family-name:var(--font-heading)] text-[13.5px] font-bold rounded-full border-[3px] border-[var(--color-text)] px-[18px] py-2 shadow-[0_4px_0_var(--color-text)] ${
              on ? "bg-lagoon text-white" : "bg-white text-[var(--color-text)]"
            }`}
          >
            {labels[a]}
          </Link>
        );
      })}
    </nav>
  );
}
