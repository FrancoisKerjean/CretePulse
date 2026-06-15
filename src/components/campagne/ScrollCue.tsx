"use client";
export default function ScrollCue({ reduce }: { reduce: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 right-0 top-[78vh] z-[5] flex flex-col items-center text-[var(--color-text)]"
    >
      <span className="text-sm font-bold opacity-70">↓</span>
      <span className={`text-2xl ${reduce ? "" : "animate-bounce"}`}>⌄</span>
    </div>
  );
}
