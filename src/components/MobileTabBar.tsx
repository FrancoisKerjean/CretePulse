// src/components/MobileTabBar.tsx : navigation basse mobile des surfaces outils (lot 2).
// Visible uniquement < md et sur les pages outils du compagnon (carte, bus,
// plages, devis voiture). Écran 1 des mockups app compagnon validés 10/07.
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

const TOOL_PAGES = /\/(buses|explore|live|beaches|car-rental)(\/|$)/;

const TABS = [
  { key: "map", href: "/explore", icon: "🗺️", match: /\/(explore|live)(\/|$)/ },
  { key: "buses", href: "/buses", icon: "🚌", match: /\/buses(\/|$)/ },
  { key: "beaches", href: "/beaches", icon: "🏖️", match: /\/beaches(\/|$)/ },
  { key: "quote", href: "/car-rental", icon: "🚗", match: /\/car-rental(\/|$)/ },
] as const;

export function MobileTabBar() {
  const t = useTranslations("tabBar");
  const locale = useLocale();
  const pathname = usePathname() ?? "";
  if (!TOOL_PAGES.test(pathname)) return null;
  return (
    <>
      {/* Spacer dans le flux (monté après le Footer) : le bas de page reste
          atteignable derrière la barre fixe. */}
      <div className="h-14 md:hidden" aria-hidden />
      <nav
      aria-label="quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t-2 border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match.test(pathname);
        return (
          <Link
            key={tab.key}
            href={`/${locale}${tab.href}`}
            onClick={() => window.plausible?.("tab_bar_click", { props: { tab: tab.key } })}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 font-heading text-[10.5px] font-bold no-underline ${
              active ? "text-lagoon-deep" : "text-text-muted"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {tab.icon}
            </span>
            {t(tab.key)}
          </Link>
        );
      })}
      </nav>
    </>
  );
}
