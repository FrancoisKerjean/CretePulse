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

export const comfortaa = Comfortaa({
  subsets: ["latin", "cyrillic", "greek"],
  variable: "--font-comfortaa",
  weight: ["400", "600", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
