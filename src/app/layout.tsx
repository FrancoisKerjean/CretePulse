import type { ReactNode } from "react";
import { Geist, Baloo_2, Comfortaa } from "next/font/google";

// DA Kalimera : Geist = corps de texte ; Baloo 2 = titres + UI forte + donnees (font-data) ;
// Comfortaa = fallback grec/cyrillique (Baloo 2 ne couvre que latin/latin-ext).
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const baloo = Baloo_2({
  subsets: ["latin", "latin-ext"],
  variable: "--font-baloo",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

// Grec seulement, sans préchargement : ses sous-ensembles latin et cyrillique étaient
// préchargés sur chaque page (3 fichiers sur les 6 polices de l'accueil) alors que Baloo 2
// couvre le latin et que les locales cyrilliques ne sont plus routées depuis le 20/09/2026.
// La police se télécharge d'elle-même quand un glyphe grec s'affiche (unicode-range).
export const comfortaa = Comfortaa({
  subsets: ["greek"],
  preload: false,
  variable: "--font-comfortaa",
  weight: ["400", "600", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
