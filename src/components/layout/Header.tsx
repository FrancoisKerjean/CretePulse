"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "de", label: "DE" },
  { code: "el", label: "EL" },
];

const NAV_LINKS = [
  { href: "/weather", label: { en: "Weather", fr: "Météo", de: "Wetter", el: "Καιρός" } },
  { href: "/beaches", label: { en: "Beaches", fr: "Plages", de: "Strände", el: "Παραλίες" } },
  { href: "/events", label: { en: "Events", fr: "Événements", de: "Events", el: "Εκδηλώσεις" } },
  { href: "/food", label: { en: "Food", fr: "Restaurants", de: "Essen", el: "Φαγητό" } },
  { href: "/news", label: { en: "News", fr: "Actus", de: "Nachrichten", el: "Νέα" } },
];

export function Header() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-lg font-bold tracking-tight text-aegean">CRETE</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-terra opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-terra" />
          </span>
          <span className="text-lg font-bold tracking-tight text-terra">PULSE</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-text-muted">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-aegean transition-colors ${
                pathname?.startsWith(link.href) ? "text-aegean" : ""
              }`}
            >
              {link.label[locale as keyof typeof link.label] || link.label.en}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1 text-xs font-medium">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => router.replace(pathname, { locale: l.code })}
              className={`px-2 py-1 rounded-md transition-colors ${
                locale === l.code
                  ? "bg-aegean text-white"
                  : "text-text-muted hover:bg-stone-warm"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
