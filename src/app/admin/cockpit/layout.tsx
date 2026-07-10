import type { ReactNode } from "react";
import type { Metadata } from "next";
// DA Windows 98 volontairement isolée : pas de globals.css (Tailwind/Kalimera),
// polices système (Tahoma/MS Sans Serif), tout le style vit dans cockpit.css.
import "./cockpit.css";

export const metadata: Metadata = {
  title: "COCKPIT.EXE",
  robots: { index: false, follow: false },
};

export default function CockpitLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
