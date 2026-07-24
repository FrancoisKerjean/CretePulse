import type { ProCopy } from "@/lib/campagne-pro";

export default function DataToVision({ frise }: { frise: ProCopy["frise"] }) {
  return (
    <div className="grid w-full max-w-[760px] grid-cols-1 gap-[14px] md:grid-cols-3">
      {frise.steps.map((s) => (
        <div key={s.year} className="rounded-[18px] border-[3px] border-[var(--color-text)] bg-white p-[16px] shadow-[0_6px_0_var(--color-text)]">
          <span className={`mb-[9px] inline-block rounded-full border-2 border-[var(--color-text)] px-[11px] py-[3px] text-[12.5px] font-extrabold text-white ${s.future ? "bg-terracotta" : "bg-sea"}`}>
            {s.year}
          </span>
          <h3 className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-[var(--color-text)]">{s.title}</h3>
          <p className="mt-[5px] text-[13px] font-semibold leading-snug text-[var(--color-text)]">{s.text}</p>
        </div>
      ))}
    </div>
  );
}
