// src/components/nudge/ActivityNudge.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import {
  DELAY_MS,
  SCROLL_THRESHOLD,
  isEligibleRoute,
  isSuppressed,
  suppressConverted,
  suppressLater,
} from "@/lib/activity-nudge";

export function ActivityNudge() {
  const pathname = usePathname();
  const t = useTranslations("activityNudge");
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Armement des déclencheurs (20 s OU scroll > 60 %), selon route + persistance.
  useEffect(() => {
    if (!isEligibleRoute(pathname)) return;
    if (isSuppressed(Date.now())) return;

    let fired = false;
    const timer = window.setTimeout(fire, DELAY_MS);
    window.addEventListener("scroll", onScroll, { passive: true });

    function fire() {
      if (fired) return;
      fired = true;
      cleanup();
      setOpen(true);
    }
    function onScroll() {
      const el = document.documentElement;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable <= 0) return;
      if (el.scrollTop / scrollable >= SCROLL_THRESHOLD) fire();
    }
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, [pathname]);

  const handleLater = useCallback(() => {
    suppressLater(Date.now());
    setOpen(false);
  }, []);

  const handleConvert = useCallback(() => {
    suppressConverted(Date.now());
    // la navigation est gérée par <Link href="/match">
  }, []);

  // Verrou de scroll, focus initial, fermeture par Échap, restitution du focus.
  useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleLater();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      prevActive?.focus?.();
    };
  }, [open, handleLater]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-nudge-title"
    >
      {/* Overlay : clic = fermeture douce */}
      <button
        type="button"
        aria-label={t("close")}
        onClick={handleLater}
        className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-sm rounded-3xl bg-surface p-6 text-center shadow-float">
        <button
          type="button"
          onClick={handleLater}
          aria-label={t("close")}
          className="absolute right-3 top-3 rounded-full p-1.5 text-foreground/40 transition hover:bg-black/5 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2
          id="activity-nudge-title"
          className="font-heading text-2xl font-bold text-sea"
        >
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-foreground/70">{t("subtitle")}</p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/match"
            onClick={handleConvert}
            className="rounded-full bg-terracotta px-5 py-3 font-heading font-bold text-white shadow-soft transition hover:bg-terracotta-light"
          >
            {t("cta")}
          </Link>
          <button
            type="button"
            onClick={handleLater}
            className="rounded-full px-5 py-2 text-sm font-medium text-foreground/60 transition hover:text-foreground"
          >
            {t("dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
