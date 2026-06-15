export function DetailCell({
  eyebrow, text, className = "",
}: {
  eyebrow: string;
  text: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col justify-center rounded-2xl bg-night p-4 text-white ${className}`}>
      <span className="mb-1.5 text-[9px] uppercase tracking-widest text-terra-light">{eyebrow}</span>
      <p className="font-heading text-sm font-bold leading-snug">{text}</p>
    </div>
  );
}
