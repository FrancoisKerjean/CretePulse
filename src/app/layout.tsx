import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { Baloo_2 } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
