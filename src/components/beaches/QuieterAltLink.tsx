"use client";
// Lien d'alternative plage instrumenté : clic = event Plausible
// quieter_beach_click (preuve redistribution des flux).
// Spec : docs/superpowers/specs/2026-07-11-flux-impact-instrumentation-design.md
import Link from "next/link";
import type { ReactNode } from "react";

export function QuieterAltLink({
  href, from, to, band, className, children,
}: {
  href: string; from: string; to: string; band: string; className?: string; children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        (window as unknown as {
          plausible?: (e: string, o?: { props?: Record<string, string> }) => void;
        }).plausible?.("quieter_beach_click", { props: { from, to, band } });
      }}
    >
      {children}
    </Link>
  );
}
