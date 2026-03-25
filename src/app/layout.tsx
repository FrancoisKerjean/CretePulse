import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
