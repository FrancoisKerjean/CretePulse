"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
  { code: "el", label: "EL" },
  { code: "it", label: "IT" },
  { code: "nl", label: "NL" },
  { code: "pl", label: "PL" },
];

const NAV_LINKS = [
  { href: "/weather", label: { en: "Weather", fr: "Météo", de: "Wetter", el: "Καιρός", it: "Meteo", nl: "Weer", pl: "Pogoda" } },
  { href: "/beaches", label: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες", it: "Spiagge", nl: "Stranden", pl: "Plaże" } },
  { href: "/villages", label: { en: "Villages", fr: "Villages", de: "Dörfer", el: "Χωριά", it: "Villaggi", nl: "Dorpen", pl: "Wioski" } },
  { href: "/events", label: { en: "Events", fr: "Événements", de: "Events", el: "Εκδηλώσεις", it: "Eventi", nl: "Evenementen", pl: "Wydarzenia" } },
  { href: "/food", label: { en: "Food", fr: "Restaurants", de: "Essen", el: "Φαγητό", it: "Ristoranti", nl: "Eten", pl: "Restauracje" } },
  { href: "/hikes", label: { en: "Hikes", fr: "Randos", de: "Wandern", el: "Πεζοπορία", it: "Escursioni", nl: "Wandelen", pl: "Szlaki" } },
  { href: "/news", label: { en: "News", fr: "Actus", de: "Nachrichten", el: "Νέα", it: "Notizie", nl: "Nieuws", pl: "Wiadomości" } },
  { href: "/articles", label: { en: "Guides", fr: "Guides", de: "Guides", el: "Οδηγοί", it: "Guide", nl: "Gidsen", pl: "Przewodniki" } },
];

export function Header() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`sticky top-0 z-50 bg-surface/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-[0_2px_20px_rgba(27,73,101,0.10)]" : "border-b border-border"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-extrabold tracking-tight text-aegean group-hover:text-aegean-light transition-colors">
            CRETE
          </span>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terra opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-terra" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-terra group-hover:text-terra-light transition-colors">
            DIRECT
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-text-muted">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-aegean transition-colors relative pb-0.5 ${
                pathname?.startsWith(link.href)
                  ? "text-aegean after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-terra after:rounded-full"
                  : ""
              }`}
            >
              {link.label[locale as keyof typeof link.label] || link.label.en}
            </Link>
          ))}
        </div>

        {/* Right: locale switcher + mobile hamburger */}
        <div className="flex items-center gap-2">
          {/* Locale switcher - compact on mobile */}
          <div className="hidden sm:flex items-center gap-1 text-xs font-semibold">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => router.replace(pathname, { locale: l.code })}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  locale === l.code
                    ? "bg-aegean text-white shadow-sm"
                    : "text-text-muted hover:bg-stone-warm hover:text-text"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-text-muted hover:text-aegean transition-colors"
            aria-label="Menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface/98 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  pathname?.startsWith(link.href)
                    ? "bg-aegean/8 text-aegean"
                    : "text-text-muted hover:bg-stone hover:text-text"
                }`}
              >
                {link.label[locale as keyof typeof link.label] || link.label.en}
              </Link>
            ))}

            {/* Mobile locale switcher */}
            <div className="flex items-center gap-1.5 pt-3 mt-2 border-t border-border">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => router.replace(pathname, { locale: l.code })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
                    locale === l.code
                      ? "bg-aegean text-white shadow-sm"
                      : "text-text-muted bg-stone hover:bg-stone-warm"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
