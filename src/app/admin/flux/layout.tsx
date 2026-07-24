import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../../globals.css";
import { geist, baloo, comfortaa } from "../../layout";

export const metadata: Metadata = {
  title: "Flux Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${baloo.variable} ${comfortaa.variable}`}>
      <body className="min-h-screen bg-surface font-sans text-text antialiased">{children}</body>
    </html>
  );
}
