import Link from "next/link";
import type { ProCopy } from "@/lib/campagne-pro";

export default function SponsorDoors({ locale, doors }: { locale: string; doors: NonNullable<ProCopy["doors"]> }) {
  return (
    <div className="grid w-full max-w-[820px] grid-cols-1 gap-[18px] md:grid-cols-2">
      {doors.map((d) => {
        // href interne "/partners" -> prefixe locale ; ancre "#..." inchangee.
        const href = d.href.startsWith("#") ? d.href : `/${locale}${d.href}`;
        const bg = d.id === "sponsor" ? "bg-[#FFF3D6]" : "bg-[#DFF7FA]";
        const ctaBg = d.id === "sponsor" ? "bg-terracotta text-white" : "bg-white text-[var(--color-text)]";
        return (
          <div key={d.id} className={`rounded-[22px] border-[3px] border-[var(--color-text)] p-[22px] shadow-[0_6px_0_var(--color-text)] ${bg}`}>
            <h3 className="mb-2 font-[family-name:var(--font-heading)] text-[19px] font-extrabold text-[var(--color-text)]">{d.emoji} {d.title}</h3>
            <p className="mb-3 text-[14px] font-semibold leading-snug text-[var(--color-text)]">{d.body}</p>
            <Link href={href} className={`inline-flex items-center gap-2 rounded-full border-[3px] border-[var(--color-text)] px-5 py-[11px] font-[family-name:var(--font-heading)] text-[14.5px] font-extrabold shadow-[0_4px_0_var(--color-text)] ${ctaBg}`}>
              {d.cta}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
