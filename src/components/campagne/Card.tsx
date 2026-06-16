import type { KickerVariant } from "@/lib/campagne";

// Convertit les balises <hl>...</hl> de la copie en <span class="cmp-hl"> (surbrillance
// snug definie dans globals.css). <br> est conserve. Aucune autre balise n'est injectee.
function renderCopy(html: string): string {
  return html.replace(/<hl>/g, '<span class="cmp-hl">').replace(/<\/hl>/g, "</span>");
}

const KICKER_BG: Record<KickerVariant, string> = {
  terra: "bg-terra text-white",
  go: "bg-sun text-[var(--color-text)]",
  calm: "bg-[var(--color-ok)] text-white",
};

export default function Card({
  kicker,
  kickerVariant = "terra",
  tag,
  title,
  sub,
  size = "default",
  reduce = false,
}: {
  kicker?: string;
  kickerVariant?: KickerVariant;
  tag?: string;
  title?: string;
  sub?: string;
  size?: "default" | "wide" | "hero";
  reduce?: boolean;
}) {
  const titleSize =
    size === "hero"
      ? "text-[clamp(34px,6vw,54px)]"
      : size === "wide"
        ? "text-[clamp(30px,4.6vw,46px)]"
        : "text-[clamp(26px,4vw,34px)]";

  return (
    <div
      className={`relative w-full rounded-[26px] border-4 border-[var(--color-text)] bg-[#FFF6E2] px-[clamp(20px,4vw,32px)] py-[clamp(22px,4vw,30px)] shadow-[0_12px_0_rgba(11,57,84,.16)] ${
        size === "default" ? "max-w-[480px]" : "max-w-[600px]"
      }`}
    >
      {tag && (
        <span
          aria-hidden
          className={`absolute -top-[18px] right-6 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[var(--color-text)] bg-sun text-[24px] shadow-[0_4px_0_var(--color-text)] ${
            reduce ? "" : "cmp-floaty"
          }`}
        >
          {tag}
        </span>
      )}
      {kicker && (
        <span
          className={`mb-[13px] inline-block rounded-full border-[2.5px] border-[var(--color-text)] px-[14px] py-[5px] text-[13px] font-extrabold uppercase tracking-[2px] ${KICKER_BG[kickerVariant]}`}
        >
          {kicker}
        </span>
      )}
      {title && (
        <h2
          className={`font-[family-name:var(--font-heading)] font-extrabold leading-[1.28] text-[var(--color-text)] ${titleSize}`}
          dangerouslySetInnerHTML={{ __html: renderCopy(title) }}
        />
      )}
      {sub && (
        <p
          className="mt-[13px] text-[clamp(16px,2.6vw,20px)] font-semibold leading-[1.4] text-[var(--color-text)] opacity-[.92]"
          dangerouslySetInnerHTML={{ __html: renderCopy(sub) }}
        />
      )}
    </div>
  );
}
